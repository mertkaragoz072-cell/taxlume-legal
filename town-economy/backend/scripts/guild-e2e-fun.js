// Second end-to-end run for the guild server: feed, duels, daily draw, hall
// projects, ranking and reports, plus "leaving deletes everything".
//   EXPO_PUBLIC_SUPABASE_URL=... EXPO_PUBLIC_SUPABASE_ANON_KEY=... [SUPABASE_ACCESS_TOKEN=...] node backend/scripts/guild-e2e-fun.js
// Needs SQL access (access token or a Claude-environment `api.supabase.com`
// secret) to move time forward and to look inside the tables.
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
const noLimit = (gid) => sql(`update guild_members set last_report_at = null where guild_id = '${gid}'`);

(async () => {
  const fns = sql(
    "select proname from pg_proc where pronamespace='public'::regnamespace and proname in ('challenge_duel','respond_duel','claim_duel_reward','daily_draw','donate_cash','top_guilds','report_guild_id','guild_log','settle_duels')"
  ).map((r) => r.proname);
  ok("all fun functions exist (" + fns.length + "/9)", fns.length === 9, fns.join(","));
  const A = await signup(),
    B = await signup(),
    C = await signup();
  await rpc(A, "sync_profile", { p_name: "Alice F", p_rank: 3, p_net_worth: 100 });
  await rpc(B, "sync_profile", { p_name: "Bob F", p_rank: 1, p_net_worth: 100 });
  await rpc(C, "sync_profile", { p_name: "Cem F", p_rank: 0, p_net_worth: 100 });
  await rpc(A, "create_guild", { p_name: "E2E Fun " + Math.floor(Math.random() * 900 + 100) });
  let g = await view(A);
  const code = g.code,
    gid = g.id;
  await rpc(B, "join_guild", { p_code: code });

  // ---- feed
  g = await view(A);
  ok(
    "feed shows who joined",
    g.feed.some((f) => f.kind === "joined" && f.actorName === "Bob F"),
    JSON.stringify(g.feed)
  );

  // ---- duels
  let r = await rpc(A, "challenge_duel", { p_opponent: A.id });
  ok("cannot duel yourself", err(r) === "duel_invalid", JSON.stringify(r.body));
  r = await rpc(A, "challenge_duel", { p_opponent: C.id });
  ok("cannot duel someone outside the guild", err(r) === "duel_invalid");
  r = await rpc(A, "challenge_duel", { p_opponent: B.id });
  ok("A challenges B", r.status < 300, JSON.stringify(r.body));
  r = await rpc(A, "challenge_duel", { p_opponent: B.id });
  ok("a second open challenge -> duel_busy", err(r) === "duel_busy");
  let gb = await view(B);
  let duel = gb.duels[0];
  ok(
    "B sees the pending challenge with names",
    duel && duel.status === "pending" && duel.challengerName === "Alice F" && duel.opponentName === "Bob F",
    JSON.stringify(gb.duels)
  );
  r = await rpc(A, "respond_duel", { p_id: Number(duel.id), p_accept: true });
  ok("you cannot accept your own challenge", err(r) === "duel_invalid", JSON.stringify(r.body));
  r = await rpc(B, "respond_duel", { p_id: Number(duel.id), p_accept: true });
  ok("B accepts: the duel is on", r.status < 300);
  gb = await view(B);
  duel = gb.duels[0];
  const left = duel.endsAt - Date.now();
  ok(
    "it lasts about 24 hours",
    duel.status === "active" && left > 23.5 * 3600e3 && left < 24.5 * 3600e3,
    String(left)
  );
  noLimit(gid);
  await rpc(A, "report_contribution", { p_trades: 30 });
  await rpc(B, "report_contribution", { p_trades: 50 });
  duel = (await view(A)).duels[0];
  ok(
    "trades count for both sides (30 vs 50)",
    duel.cTrades === 30 && duel.oTrades === 50,
    JSON.stringify(duel)
  );
  sql(`update guild_duels set ends_at = now() - interval '1 second' where id = ${duel.id}`);
  g = await view(A);
  duel = g.duels[0];
  ok(
    "when time is up the duel settles with Bob as the winner",
    duel.status === "done" && duel.winnerId === B.id,
    JSON.stringify(duel)
  );
  ok(
    "the guild hears about the win",
    g.feed.some((f) => f.kind === "duel_won" && f.actorName === "Bob F")
  );
  ok("only the winner can claim", duel.canClaim === false && (await view(B)).duels[0].canClaim === true);
  r = await rpc(A, "claim_duel_reward", { p_id: Number(duel.id) });
  ok("the loser cannot claim", r.body === false);
  r = await rpc(B, "claim_duel_reward", { p_id: Number(duel.id) });
  ok("the winner claims once", r.body === true);
  r = await rpc(B, "claim_duel_reward", { p_id: Number(duel.id) });
  ok("... and not twice", r.body === false);
  await rpc(A, "challenge_duel", { p_opponent: B.id });
  duel = (await view(B)).duels.find((d) => d.status === "pending");
  await rpc(B, "respond_duel", { p_id: Number(duel.id), p_accept: false });
  ok(
    "B declines",
    (await view(A)).duels.every((d) => d.status !== "pending")
  );
  await rpc(A, "challenge_duel", { p_opponent: B.id });
  duel = (await view(A)).duels.find((d) => d.status === "pending");
  await rpc(A, "respond_duel", { p_id: Number(duel.id), p_accept: false });
  ok(
    "A can withdraw an unanswered challenge",
    (await view(A)).duels.every((d) => d.status !== "pending")
  );
  await rpc(A, "challenge_duel", { p_opponent: B.id });
  sql(
    `update guild_duels set created_at = now() - interval '25 hours' where guild_id = '${gid}' and status = 'pending'`
  );
  g = await view(A);
  ok(
    "a challenge nobody answers lapses after a day",
    g.duels.every((d) => d.status !== "pending")
  );

  // ---- daily draw
  r = await rpc(A, "daily_draw");
  ok("daily draw gives a tier 1-3", [1, 2, 3].includes(r.body), JSON.stringify(r.body));
  r = await rpc(A, "daily_draw");
  ok("a second draw the same day -> already_drawn", err(r) === "already_drawn");
  ok(
    "the view knows you drew today",
    (await view(A)).drawnToday === true && (await view(B)).drawnToday === false
  );
  r = await rpc(C, "daily_draw");
  ok("a non-member cannot draw", err(r) === "not_in_guild");
  sql(`update guild_draws set day = day - 1 where user_id = '${A.id}'`);
  r = await rpc(A, "daily_draw");
  ok("tomorrow there is a new draw", [1, 2, 3].includes(r.body), JSON.stringify(r.body));
  const tiers = [];
  for (let i = 0; i < 40; i++) {
    sql(`delete from guild_draws where user_id = '${B.id}'`);
    tiers.push((await rpc(B, "daily_draw")).body);
  }
  ok(
    "40 draws: every tier shows up, small ones most",
    [1, 2, 3].every((t) => tiers.includes(t)) &&
      tiers.filter((t) => t === 1).length > tiers.filter((t) => t === 3).length,
    JSON.stringify(tiers)
  );
  ok(
    "big prizes are announced to the guild",
    (await view(A)).feed.some((f) => f.kind === "big_draw")
  );

  // ---- hall
  r = await rpc(A, "donate_cash", { p_amount: 1000 });
  ok("donate 1000 coins", r.body === 1000, JSON.stringify(r.body));
  g = await view(A);
  ok(
    "progress 1000 of the first project",
    g.projects.built === 0 && g.projects.progress === 1000,
    JSON.stringify(g.projects)
  );
  r = await rpc(B, "donate_cash", { p_amount: 999999 });
  ok("project 1 needs 5000: only the remaining 4000 is accepted", r.body === 4000, JSON.stringify(r.body));
  g = await view(A);
  ok(
    "project 1 is built and the next one starts empty",
    g.projects.built === 1 && g.projects.progress === 0,
    JSON.stringify(g.projects)
  );
  ok(
    "the guild hears about the new building",
    g.feed.some((f) => f.kind === "project_done" && f.detail === "1" && f.actorName === "Bob F")
  );
  ok(
    "donations are counted per member",
    g.members.find((m) => m.isYou).cashGiven === 1000 && g.members.find((m) => !m.isYou).cashGiven === 4000,
    JSON.stringify(g.members.map((m) => m.cashGiven))
  );
  r = await rpc(A, "donate_cash", { p_amount: -50 });
  ok("a negative gift is nothing", r.body === 0);
  r = await rpc(A, "donate_cash", { p_amount: 30000 });
  ok("project 2 costs 25000", r.body === 25000, JSON.stringify(r.body));
  sql(
    `insert into guild_projects(guild_id, idx) select '${gid}', i from generate_series(3, 6) i on conflict do nothing`
  );
  r = await rpc(A, "donate_cash", { p_amount: 1000 });
  ok("with all six built there is nothing left to fund", r.body === 0);
  r = await rpc(C, "donate_cash", { p_amount: 10 });
  ok("a non-member cannot donate", err(r) === "not_in_guild");

  // ---- order / goal announcements
  r = await rpc(A, "donate_to_order", { p_qty: 80 });
  g = await view(A);
  ok(
    "completing the order is announced once",
    r.body === 80 && g.feed.filter((f) => f.kind === "order_done").length === 1,
    JSON.stringify(g.feed.map((f) => f.kind))
  );
  sql(
    `insert into guild_week_contrib(guild_id, user_id, week_start, trades) values ('${gid}', '${A.id}', guild_week_start(), 150) on conflict (guild_id, user_id, week_start) do update set trades = 150`
  );
  noLimit(gid);
  await rpc(B, "report_contribution", { p_trades: 60 });
  g = await view(A);
  ok(
    "reaching the weekly goal is announced once",
    g.feed.filter((f) => f.kind === "goal_done").length === 1,
    JSON.stringify(g.feed.map((f) => f.kind))
  );
  noLimit(gid);
  await rpc(B, "report_contribution", { p_trades: 20 });
  ok(
    "... not again on the next report",
    (await view(A)).feed.filter((f) => f.kind === "goal_done").length === 1
  );

  // ---- ranking and reports
  r = await rpc(C, "top_guilds");
  const mine = Array.isArray(r.body) && r.body.find((x) => x.id === gid);
  ok(
    "the ranking lists this week's active guilds with scores",
    mine && mine.members === 2 && mine.score >= 250 && r.body.length <= 10,
    JSON.stringify(r.body && r.body.slice(0, 2))
  );
  r = await rpc(B, "top_guilds");
  ok("... and marks your own", r.body.find((x) => x.id === gid).isMine === true);
  ok(
    "sorted by score",
    r.body.every((x, i, a) => i === 0 || a[i - 1].score >= x.score)
  );
  r = await rpc(C, "report_guild_id", { p_guild: gid, p_reason: "guild_name" });
  ok("any player can report a listed guild", r.status < 300, JSON.stringify(r.body));
  await rpc(C, "report_guild_id", { p_guild: gid, p_reason: "guild_name" });
  ok(
    "a repeat within the hour is not stored twice",
    Number(
      sql(`select count(*) c from guild_reports where guild_id = '${gid}' and reporter = '${C.id}'`)[0].c
    ) === 1
  );
  r = await rpc(C, "report_guild_id", { p_guild: "00000000-0000-0000-0000-000000000000", p_reason: "x" });
  ok("reporting a guild that does not exist -> not_found", err(r) === "not_found");

  // ---- leaving deletes everything about the player
  await rpc(A, "leave_guild");
  const gone = sql(
    `select (select count(*) from guild_feed where actor_id = '${A.id}') f, (select count(*) from guild_duels where challenger = '${A.id}' or opponent = '${A.id}') d, (select count(*) from guild_draws where user_id = '${A.id}') w, (select count(*) from guild_members where user_id = '${A.id}') m, (select count(*) from auth.users where id = '${A.id}') u`
  )[0];
  ok(
    "leaving removes feed lines, duels, draws, membership and the account",
    Object.values(gone).every((n) => Number(n) === 0),
    JSON.stringify(gone)
  );

  // ---- clean up
  await rpc(B, "leave_guild");
  await rpc(C, "leave_guild"); // C never joined: harmless
  sql(`delete from auth.users where id = '${C.id}'`);
  const rest = sql(
    `select (select count(*) from guilds where code = '${code}') g, (select count(*) from guild_reports where guild_id = '${gid}') r, (select count(*) from auth.users where id in ('${B.id}', '${C.id}')) u`
  )[0];
  ok(
    "cleanup: guild, reports and accounts removed",
    Number(rest.g) === 0 && Number(rest.r) === 0 && Number(rest.u) === 0,
    JSON.stringify(rest)
  );
  const failed = results.filter((x) => !x).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.log("ERROR", e.message);
  process.exit(1);
});
