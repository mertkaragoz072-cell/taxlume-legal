const { execFileSync } = require("child_process");
// Runs the whole guild server through its public functions (as several anonymous
// players) and checks the rules, then deletes everything it created.
//   EXPO_PUBLIC_SUPABASE_URL=... EXPO_PUBLIC_SUPABASE_ANON_KEY=... [SUPABASE_ACCESS_TOKEN=...] node backend/scripts/guild-e2e.js
// The access token (or a Claude-environment `api.supabase.com` secret) is only
// used for a few direct SQL checks and for backdating weeks to test the streak.
const BASE = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, ""),
  KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
const REF = (BASE.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1];
if (!REF || !KEY) {
  console.error("Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(2);
}
const results = [];
const ok = (n, c, x = "") => {
  results.push(c);
  console.log(c ? "PASS" : "FAIL", n, c ? "" : x);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function sql(q) {
  const a = [
    "-sS",
    "-m",
    "60",
    "-X",
    "POST",
    `https://api.supabase.com/v1/projects/${REF}/database/query`,
    "-H",
    "Content-Type: application/json",
    "-d",
    JSON.stringify({ query: q }),
  ];
  if (process.env.SUPABASE_ACCESS_TOKEN)
    a.push("-H", "Authorization: Bearer " + process.env.SUPABASE_ACCESS_TOKEN);
  const out = execFileSync("curl", a).toString();
  try {
    return JSON.parse(out);
  } catch {
    return out;
  }
}
async function signup() {
  const r = await fetch(BASE + "/auth/v1/signup", {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: "{}",
  });
  const j = await r.json();
  return {
    tok: j.access_token,
    id: JSON.parse(Buffer.from(j.access_token.split(".")[1], "base64").toString()).sub,
  };
}
async function rpc(u, fn, args = {}) {
  const r = await fetch(`${BASE}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: "Bearer " + u.tok, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const t = await r.text();
  let j;
  try {
    j = t ? JSON.parse(t) : null;
  } catch {
    j = t;
  }
  return { status: r.status, body: j };
}
const err = (r) => r.body && r.body.message;
(async () => {
  const fns = sql(
    "select proname from pg_proc where pronamespace='public'::regnamespace and proname in ('donate_to_order','claim_order_reward','create_request','cancel_request','fulfill_request','claim_deliveries','ensure_week_order','leave_guild','get_my_guild') order by 1"
  ).map((r) => r.proname);
  ok("all trade functions exist (" + fns.length + "/9)", fns.length === 9, fns.join(","));
  const A = await signup(),
    B = await signup(),
    C = await signup();
  for (const [u, n, rk] of [
    [A, "Alice T", 3],
    [B, "Bob T", 1],
    [C, "Cem T", 0],
  ])
    await rpc(u, "sync_profile", { p_name: n, p_rank: rk, p_net_worth: 100 });
  await rpc(A, "create_guild", { p_name: "E2E Trade " + Math.floor(Math.random() * 900 + 100) });
  let g = (await rpc(A, "get_my_guild")).body;
  const code = g.code;
  await rpc(B, "join_guild", { p_code: code });
  g = (await rpc(A, "get_my_guild")).body;
  const base9 = ["grain", "wool", "sand", "bread", "milk", "wood", "iron", "cloth", "fish"];
  ok("order good is an everyday good", base9.includes(g.order.goodId), g.order.goodId);
  ok("order target 40 x 2 members", g.order.target === 80 && g.order.progress === 0, JSON.stringify(g.order));
  ok(
    "streak 0 and totals present",
    g.streak === 0 && g.myTotals && g.myTotals.donated === 0,
    JSON.stringify([g.streak, g.myTotals])
  );
  const lvl0 = Number(
    sql(`select total_contribution from guilds where code='${code}'`)[0].total_contribution
  );
  let r = await rpc(A, "donate_to_order", { p_qty: 50 });
  ok("donate 50 accepted", r.body === 50, JSON.stringify(r.body));
  r = await rpc(B, "donate_to_order", { p_qty: 100 });
  ok("B donates, only the remaining 30 accepted", r.body === 30, JSON.stringify(r.body));
  r = await rpc(B, "donate_to_order", { p_qty: 5 });
  ok("complete order accepts nothing more", r.body === 0, JSON.stringify(r.body));
  const lvl1 = Number(
    sql(`select total_contribution from guilds where code='${code}'`)[0].total_contribution
  );
  ok("order units count towards the guild total (+80)", lvl1 - lvl0 === 80, lvl0 + " -> " + lvl1);
  r = await rpc(A, "claim_order_reward");
  ok("A claims the order chest", r.body === true);
  r = await rpc(A, "claim_order_reward");
  ok("A cannot claim twice", r.body === false);
  r = await rpc(B, "claim_order_reward");
  ok("B (donated) claims too", r.body === true);
  r = await rpc(C, "claim_order_reward");
  ok("non-member -> not_in_guild", err(r) === "not_in_guild");
  await rpc(C, "join_guild", { p_code: code });
  r = await rpc(C, "claim_order_reward");
  g = (await rpc(A, "get_my_guild")).body;
  ok(
    "a third member makes the order incomplete again (target 120); C cannot claim without giving",
    r.body === false && g.order.target === 120,
    JSON.stringify([r.body, g.order])
  );
  // market
  r = await rpc(A, "create_request", { p_good: "wool", p_qty: 10 });
  ok("A asks for 10 wool", r.status < 300, JSON.stringify(r.body));
  r = await rpc(A, "create_request", { p_good: "sand", p_qty: 5 });
  ok("second open request -> request_open", err(r) === "request_open");
  r = await rpc(C, "create_request", { p_good: "diamond", p_qty: 5 });
  ok("unknown good -> request_invalid", err(r) === "request_invalid");
  r = await rpc(C, "create_request", { p_good: "sand", p_qty: 99 });
  ok("qty 99 -> request_invalid", err(r) === "request_invalid");
  g = (await rpc(B, "get_my_guild")).body;
  const req = g.requests.find((x) => !x.isMine);
  ok(
    "B sees A's request with A's name",
    req && req.fromName === "Alice T" && req.qty === 10 && req.filled === 0,
    JSON.stringify(g.requests)
  );
  r = await rpc(A, "fulfill_request", { p_request: Number(req.id), p_qty: 3 });
  ok("own request -> own_request", err(r) === "own_request");
  r = await rpc(B, "fulfill_request", { p_request: Number(req.id), p_qty: 4 });
  ok("B sends 4", r.body === 4, JSON.stringify(r.body));
  r = await rpc(C, "fulfill_request", { p_request: Number(req.id), p_qty: 100 });
  ok("C offers 100, only the remaining 6 accepted", r.body === 6, JSON.stringify(r.body));
  r = await rpc(B, "fulfill_request", { p_request: Number(req.id), p_qty: 1 });
  ok("filled request is gone", err(r) === "request_gone");
  g = (await rpc(A, "get_my_guild")).body;
  ok("A has no open request any more", !g.requests.some((x) => x.isMine));
  r = await rpc(A, "claim_deliveries", { p_room: 5 });
  ok(
    "room 5: only the first delivery (4) comes",
    Array.isArray(r.body) &&
      r.body.length === 1 &&
      r.body[0].qty === 4 &&
      r.body[0].goodId === "wool" &&
      r.body[0].fromName === "Bob T",
    JSON.stringify(r.body)
  );
  r = await rpc(A, "claim_deliveries", { p_room: 100 });
  ok(
    "then the 6 from Cem",
    r.body.length === 1 && r.body[0].qty === 6 && r.body[0].fromName === "Cem T",
    JSON.stringify(r.body)
  );
  r = await rpc(A, "claim_deliveries", { p_room: 100 });
  ok("nothing left to collect", Array.isArray(r.body) && r.body.length === 0);
  g = (await rpc(A, "get_my_guild")).body;
  const bob = g.members.find((m) => m.name === "Bob T");
  ok("gifted counts show on the member list", bob.gifted === 4 && bob.donated === 30, JSON.stringify(bob));
  r = await rpc(A, "create_request", { p_good: "sand", p_qty: 5 });
  ok("A can ask again after the first was filled", r.status < 300);
  await rpc(A, "cancel_request");
  g = (await rpc(A, "get_my_guild")).body;
  ok("cancel closes it", !g.requests.some((x) => x.isMine));
  // phrases
  const bid = g.members.find((m) => m.name === "Bob T").id;
  await sleep(5500);
  await rpc(A, "send_cheer", { p_to: bid, p_emote: "thanks" });
  const gb = (await rpc(B, "get_my_guild")).body;
  ok(
    'phrase "thanks" delivered',
    gb.cheers.some((c) => c.emote === "thanks" && c.toYou && c.fromName === "Alice T"),
    JSON.stringify(gb.cheers)
  );
  await sleep(5500);
  r = await rpc(A, "send_cheer", { p_to: bid, p_emote: "rm -rf" });
  ok("unknown phrase refused", r.status >= 400, "status " + r.status);
  // streak via SQL: two earlier weeks that reached the goal (120 x 3 members = 360)
  const gid = g.id;
  sql(
    `insert into guild_week_contrib(guild_id,user_id,week_start,trades) select '${gid}', user_id, guild_week_start()-7, 130 from guild_members where guild_id='${gid}' on conflict do nothing; insert into guild_week_contrib(guild_id,user_id,week_start,trades) select '${gid}', user_id, guild_week_start()-14, 130 from guild_members where guild_id='${gid}' on conflict do nothing;`
  );
  g = (await rpc(A, "get_my_guild")).body;
  ok("streak counts 2 finished weeks", g.streak === 2, "streak " + g.streak);
  sql(`delete from guild_week_contrib where guild_id='${gid}' and week_start=guild_week_start()-7`);
  g = (await rpc(A, "get_my_guild")).body;
  ok("a missed week resets the streak", g.streak === 0, "streak " + g.streak);
  // leaving deletes the player
  await rpc(A, "leave_guild"); // A is the owner
  const left = sql(
    `select (select count(*) from auth.users where id='${A.id}') u,(select count(*) from profiles where id='${A.id}') p,(select count(*) from guild_week_contrib where user_id='${A.id}') w,(select count(*) from guild_cheers where from_user='${A.id}' or to_user='${A.id}') c,(select count(*) from guild_requests where user_id='${A.id}') q,(select owner_id from guilds where code='${code}') owner`
  )[0];
  ok(
    "owner left: account, profile, contributions, cheers and requests are gone",
    +left.u === 0 && +left.p === 0 && +left.w === 0 && +left.c === 0 && +left.q === 0,
    JSON.stringify(left)
  );
  ok("ownership moved to the oldest remaining member (Bob)", left.owner === B.id, left.owner);
  r = await rpc(A, "sync_profile", { p_name: "ghost", p_rank: 0, p_net_worth: 0 });
  ok("the deleted account's old token can no longer write", r.status >= 400, "status " + r.status);
  // clean up everything this test made
  await rpc(B, "leave_guild");
  await rpc(C, "leave_guild");
  const rest = sql(
    `select (select count(*) from guilds where code='${code}') g,(select count(*) from auth.users where id in ('${B.id}','${C.id}')) u,(select count(*) from guild_deliveries where to_user in ('${A.id}','${B.id}','${C.id}')) d`
  )[0];
  ok(
    "cleanup: guild, accounts and deliveries removed",
    +rest.g === 0 && +rest.u === 0 && +rest.d === 0,
    JSON.stringify(rest)
  );
  const f = results.filter((x) => !x).length;
  console.log(`\n${results.length - f}/${results.length} passed`);
  process.exit(f ? 1 : 0);
})().catch((e) => console.log("ERROR", e.message));
