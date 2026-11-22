// End-to-end run for the guild caravan on the real server: start, load, send,
// travel time, arrival, claiming, and what happens when a player leaves.
//   EXPO_PUBLIC_SUPABASE_URL=... EXPO_PUBLIC_SUPABASE_ANON_KEY=... [SUPABASE_ACCESS_TOKEN=...] node backend/scripts/guild-e2e-caravan.js
const { execFileSync } = require("node:child_process");

const BASE = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
const REF = (BASE.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1];
if (!REF || !KEY) {
  console.error("Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(2);
}
const results = [];
const ok = (name, cond, extra = "") => {
  results.push(Boolean(cond));
  console.log(cond ? "PASS" : "FAIL", name, cond ? "" : extra);
};
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
const view = async (u) => (await rpc(u, "get_my_guild")).body;

(async () => {
  const fns = sql(
    "select proname from pg_proc where pronamespace='public'::regnamespace and proname in ('start_caravan','load_caravan','send_caravan','claim_caravan','settle_caravans','caravan_hours')"
  ).map((r) => r.proname);
  ok("all caravan functions exist (" + fns.length + "/6)", fns.length === 6, fns.join(","));
  const A = await signup(),
    B = await signup(),
    C = await signup();
  await rpc(A, "sync_profile", { p_name: "Alice K", p_rank: 3, p_net_worth: 100 });
  await rpc(B, "sync_profile", { p_name: "Bob K", p_rank: 1, p_net_worth: 100 });
  await rpc(C, "sync_profile", { p_name: "Cem K", p_rank: 0, p_net_worth: 100 });
  await rpc(A, "create_guild", { p_name: "E2E Kervan " + Math.floor(Math.random() * 900 + 100) });
  let g = await view(A);
  const code = g.code;
  await rpc(B, "join_guild", { p_code: code });

  ok("no caravan to start with", (await view(A)).caravan === null && (await view(A)).claimable.length === 0);
  let r = await rpc(A, "load_caravan", { p_good: "grain", p_qty: 5 });
  ok("loading with no caravan -> caravan_none", err(r) === "caravan_none", JSON.stringify(r.body));
  r = await rpc(A, "send_caravan");
  ok("sending with no caravan -> caravan_none", err(r) === "caravan_none");
  r = await rpc(A, "start_caravan", { p_dest: "moon" });
  ok("unknown destination -> caravan_invalid", err(r) === "caravan_invalid");
  r = await rpc(C, "start_caravan", { p_dest: "windyhill" });
  ok("a non-member cannot start one", err(r) === "not_in_guild");
  r = await rpc(A, "start_caravan", { p_dest: "windyhill" });
  ok("A starts a caravan to Windyhill", r.status < 300, JSON.stringify(r.body));
  r = await rpc(B, "start_caravan", { p_dest: "ironforge" });
  ok("only one caravan at a time -> caravan_busy", err(r) === "caravan_busy");
  g = await view(B);
  ok(
    "it is loading, with room for 30 per member (60)",
    g.caravan &&
      g.caravan.status === "loading" &&
      g.caravan.capacity === 60 &&
      g.caravan.loaded === 0 &&
      g.caravan.dest === "windyhill",
    JSON.stringify(g.caravan)
  );

  r = await rpc(A, "load_caravan", { p_good: "dragon", p_qty: 5 });
  ok("unknown good -> caravan_invalid", err(r) === "caravan_invalid");
  r = await rpc(A, "send_caravan");
  ok("an empty caravan cannot leave -> caravan_empty", err(r) === "caravan_empty");
  r = await rpc(A, "load_caravan", { p_good: "grain", p_qty: 40 });
  ok("A loads 40 grain", r.body === 40, JSON.stringify(r.body));
  r = await rpc(B, "load_caravan", { p_good: "wool", p_qty: 100 });
  ok("B offers 100 wool: only the remaining 20 fit", r.body === 20, JSON.stringify(r.body));
  r = await rpc(B, "load_caravan", { p_good: "wool", p_qty: 5 });
  ok("a full caravan takes nothing more", r.body === 0);
  r = await rpc(A, "load_caravan", { p_good: "grain", p_qty: -5 });
  ok("negative loads are nothing", r.body === 0);
  g = await view(A);
  ok(
    "loaded 60 in total, 40 of them mine, listed by good",
    g.caravan.loaded === 60 &&
      g.caravan.myLoaded === 40 &&
      g.caravan.byGood[0].goodId === "grain" &&
      g.caravan.byGood[0].qty === 40 &&
      g.caravan.byGood[1].qty === 20,
    JSON.stringify(g.caravan)
  );

  r = await rpc(C, "send_caravan");
  ok("a non-member cannot send it", err(r) === "not_in_guild");
  r = await rpc(B, "send_caravan");
  ok("B sends the caravan", r.status < 300, JSON.stringify(r.body));
  g = await view(A);
  const eta = g.caravan.arrivesAt - Date.now();
  ok(
    "it is on the road for about 2 hours",
    g.caravan.status === "travelling" && eta > 1.9 * 3600e3 && eta < 2.1 * 3600e3,
    JSON.stringify(g.caravan)
  );
  ok("the prize tier stays secret while it travels", !("tier" in g.caravan));
  ok(
    "the guild is told it left",
    g.feed.some((f) => f.kind === "caravan_sent" && f.actorName === "Bob K" && f.detail === "windyhill")
  );
  r = await rpc(A, "load_caravan", { p_good: "grain", p_qty: 1 });
  ok("no more loading once it left -> caravan_none", err(r) === "caravan_none");
  r = await rpc(A, "start_caravan", { p_dest: "portcity" });
  ok("a second caravan cannot start while one travels", err(r) === "caravan_busy");
  ok("nothing to claim yet", (await view(A)).claimable.length === 0);

  sql(
    `update guild_caravans set arrives_at = now() - interval '1 second' where guild_id = (select id from guilds where code = '${code}') and status = 'travelling'`
  );
  g = await view(A);
  ok("when the trip is over it lands and stops being live", g.caravan === null);
  ok(
    "the guild hears about the arrival",
    g.feed.some((f) => f.kind === "caravan_arrived" && f.detail === "windyhill")
  );
  ok(
    "A can claim 40 grain's share",
    g.claimable.length === 1 &&
      g.claimable[0].dest === "windyhill" &&
      [1, 2, 3].includes(g.claimable[0].tier) &&
      g.claimable[0].loads.length === 1 &&
      g.claimable[0].loads[0].goodId === "grain" &&
      g.claimable[0].loads[0].qty === 40,
    JSON.stringify(g.claimable)
  );
  const gb = await view(B);
  ok(
    "B can claim 20 wool's share",
    gb.claimable.length === 1 &&
      gb.claimable[0].loads[0].goodId === "wool" &&
      gb.claimable[0].loads[0].qty === 20,
    JSON.stringify(gb.claimable)
  );
  ok("C has nothing to claim", (await rpc(C, "get_my_guild")).body === null);
  const id = Number(g.claimable[0].id);
  r = await rpc(C, "claim_caravan", { p_id: id });
  ok("a non-member cannot claim", err(r) === "not_in_guild");
  r = await rpc(A, "claim_caravan", { p_id: id });
  ok(
    "A claims: destination, tier and exactly their own load",
    r.body &&
      r.body.dest === "windyhill" &&
      [1, 2, 3].includes(r.body.tier) &&
      r.body.loads.length === 1 &&
      r.body.loads[0].qty === 40,
    JSON.stringify(r.body)
  );
  r = await rpc(A, "claim_caravan", { p_id: id });
  ok("a share can only be claimed once", r.body === null);
  ok(
    "A's claimable list is empty now, B's is not",
    (await view(A)).claimable.length === 0 && (await view(B)).claimable.length === 1
  );
  r = await rpc(B, "claim_caravan", { p_id: id });
  ok(
    "B claims 20 wool",
    r.body && r.body.loads[0].goodId === "wool" && r.body.loads[0].qty === 20,
    JSON.stringify(r.body)
  );
  r = await rpc(A, "claim_caravan", { p_id: 999999999 });
  ok("a caravan that does not exist -> nothing", r.body === null);

  r = await rpc(A, "start_caravan", { p_dest: "ironforge" });
  ok("after arrival a new caravan can start", r.status < 300, JSON.stringify(r.body));
  await rpc(A, "load_caravan", { p_good: "iron", p_qty: 10 });
  await rpc(B, "send_caravan");
  g = await view(A);
  const eta2 = g.caravan.arrivesAt - Date.now();
  ok("Ironforge is 3 hours away", eta2 > 2.9 * 3600e3 && eta2 < 3.1 * 3600e3, String(eta2));
  const unclaimed = sql(`select count(*) c from guild_caravan_loads where user_id = '${A.id}'`)[0].c;
  ok("A has caravan loads on the server before leaving", Number(unclaimed) === 2, String(unclaimed));
  await rpc(A, "leave_guild");
  const gone = sql(
    `select (select count(*) from guild_caravan_loads where user_id = '${A.id}') l, (select count(*) from auth.users where id = '${A.id}') u`
  )[0];
  ok(
    "leaving deletes the player's caravan loads with the account",
    Number(gone.l) === 0 && Number(gone.u) === 0,
    JSON.stringify(gone)
  );
  g = await view(B);
  ok("the caravan keeps travelling without them", g.caravan && g.caravan.status === "travelling");

  await rpc(B, "leave_guild");
  sql(`delete from auth.users where id = '${C.id}'`);
  const rest = sql(
    `select (select count(*) from guilds where code = '${code}') g, (select count(*) from guild_caravans where guild_id not in (select id from guilds)) o, (select count(*) from auth.users where id in ('${B.id}', '${C.id}')) u`
  )[0];
  ok(
    "cleanup: guild, caravans and accounts removed",
    Number(rest.g) === 0 && Number(rest.o) === 0 && Number(rest.u) === 0,
    JSON.stringify(rest)
  );
  const failed = results.filter((x) => !x).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.log("ERROR", e.message);
  process.exit(1);
});
