import { KeyValueStore } from "../mockApi";
import { createSupabaseGuildApi } from "../supabaseApi";

function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return {
    getItem: async (k) => m.get(k) ?? null,
    setItem: async (k, v) => void m.set(k, v),
    removeItem: async (k) => void m.delete(k),
  };
}

type Call = { url: string; body: unknown; auth?: string };

function fakeServer(
  handlers: Record<string, (body: Record<string, unknown>) => { status?: number; json?: unknown }>
) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    const headers = init.headers as Record<string, string>;
    calls.push({ url, body, auth: headers.Authorization });
    const key = Object.keys(handlers).find((k) => url.includes(k));
    if (!key) return new Response("nope", { status: 404 });
    const out = handlers[key](body);
    const status = out.status ?? 200;
    return new Response(out.json === undefined || status === 204 ? null : JSON.stringify(out.json), {
      status,
    });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

const SESSION = { access_token: "tok1", refresh_token: "ref1", expires_in: 3600 };
const GUILD = {
  id: "g1",
  name: "Dostlar",
  code: "ABC123",
  memberCount: 1,
  members: [],
  weekStart: 0,
  goalTarget: 120,
  goalProgress: 0,
  rewardClaimed: false,
  totalContribution: 0,
  cheers: [],
};

describe("supabase guild adapter", () => {
  it("signs in anonymously once, then reuses the session", async () => {
    const srv = fakeServer({
      "/auth/v1/signup": () => ({ json: SESSION }),
      "rpc/get_my_guild": () => ({ json: null }),
    });
    const api = createSupabaseGuildApi({
      url: "https://x.supabase.co/",
      anonKey: "k",
      fetchImpl: srv.fetchImpl,
      store: memoryStore(),
    });
    expect(await api.getMyGuild()).toBeNull();
    await api.getMyGuild();
    expect(srv.calls.filter((c) => c.url.includes("/auth/v1/signup"))).toHaveLength(1);
    expect(srv.calls[1].auth).toBe("Bearer tok1");
  });

  it("creates a guild via the function and returns the fresh view", async () => {
    const srv = fakeServer({
      "/auth/v1/signup": () => ({ json: SESSION }),
      "rpc/create_guild": (b) => (b.p_name === "Dostlar" ? { status: 204 } : { status: 400 }),
      "rpc/get_my_guild": () => ({ json: GUILD }),
    });
    const api = createSupabaseGuildApi({
      url: "https://x.supabase.co",
      anonKey: "k",
      fetchImpl: srv.fetchImpl,
      store: memoryStore(),
    });
    expect((await api.createGuild("Dostlar")).code).toBe("ABC123");
  });

  it("maps server errors to guild error codes", async () => {
    const srv = fakeServer({
      "/auth/v1/signup": () => ({ json: SESSION }),
      "rpc/join_guild": () => ({ status: 400, json: { message: "not_found" } }),
      "rpc/create_guild": () => ({ status: 400, json: { message: "name_taken" } }),
      "rpc/leave_guild": () => ({ status: 500, json: { message: "boom" } }),
    });
    const api = createSupabaseGuildApi({
      url: "https://x.supabase.co",
      anonKey: "k",
      fetchImpl: srv.fetchImpl,
      store: memoryStore(),
    });
    await expect(api.joinGuild("ZZZZZZ")).rejects.toMatchObject({ code: "not_found" });
    await expect(api.createGuild("Dostlar")).rejects.toMatchObject({ code: "name_taken" });
    await expect(api.leaveGuild()).rejects.toMatchObject({ code: "network" });
  });

  it("reports a dead connection as a network error", async () => {
    const api = createSupabaseGuildApi({
      url: "https://x.supabase.co",
      anonKey: "k",
      fetchImpl: (async () => {
        throw new Error("offline");
      }) as unknown as typeof fetch,
      store: memoryStore(),
    });
    await expect(api.getMyGuild()).rejects.toMatchObject({ code: "network" });
  });

  it("refreshes an expiring session instead of making a new account", async () => {
    let t = 1_000_000_000_000;
    const store = memoryStore();
    const srv = fakeServer({
      "/auth/v1/signup": () => ({ json: SESSION }),
      "grant_type=refresh_token": () => ({
        json: { access_token: "tok2", refresh_token: "ref2", expires_in: 3600 },
      }),
      "rpc/get_my_guild": () => ({ json: null }),
    });
    const api = createSupabaseGuildApi({
      url: "https://x.supabase.co",
      anonKey: "k",
      fetchImpl: srv.fetchImpl,
      store,
      now: () => t,
    });
    await api.getMyGuild();
    t += 2 * 3600 * 1000; // two hours later the token has expired
    await api.getMyGuild();
    expect(srv.calls.filter((c) => c.url.includes("/auth/v1/signup"))).toHaveLength(1);
    expect(srv.calls[srv.calls.length - 1].auth).toBe("Bearer tok2");
  });

  it("starts a new anonymous account when the refresh token is refused", async () => {
    let t = 1_000_000_000_000;
    let signups = 0;
    const srv = fakeServer({
      "/auth/v1/signup": () => {
        signups++;
        return { json: { access_token: `tok${signups}`, refresh_token: "r", expires_in: 3600 } };
      },
      "grant_type=refresh_token": () => ({ status: 400, json: { error: "invalid" } }),
      "rpc/get_my_guild": () => ({ json: null }),
    });
    const api = createSupabaseGuildApi({
      url: "https://x.supabase.co",
      anonKey: "k",
      fetchImpl: srv.fetchImpl,
      store: memoryStore(),
      now: () => t,
    });
    await api.getMyGuild();
    t += 2 * 3600 * 1000;
    await api.getMyGuild();
    expect(signups).toBe(2);
  });

  it("drops its session after leaving, because the server deletes the account", async () => {
    let signups = 0;
    const srv = fakeServer({
      "/auth/v1/signup": () => {
        signups++;
        return { json: { access_token: `tok${signups}`, refresh_token: "r", expires_in: 3600 } };
      },
      "rpc/leave_guild": () => ({ status: 204 }),
      "rpc/get_my_guild": () => ({ json: null }),
    });
    const api = createSupabaseGuildApi({
      url: "https://x.supabase.co",
      anonKey: "k",
      fetchImpl: srv.fetchImpl,
      store: memoryStore(),
    });
    await api.leaveGuild();
    await api.getMyGuild();
    expect(signups).toBe(2);
    expect(srv.calls[srv.calls.length - 1].auth).toBe("Bearer tok2");
  });

  it("reports a guild with one of the fixed reasons", async () => {
    const srv = fakeServer({
      "/auth/v1/signup": () => ({ json: SESSION }),
      "rpc/report_guild": () => ({ status: 204 }),
    });
    const api = createSupabaseGuildApi({
      url: "https://x.supabase.co",
      anonKey: "k",
      fetchImpl: srv.fetchImpl,
      store: memoryStore(),
    });
    await api.reportGuild("guild_name");
    expect(srv.calls[srv.calls.length - 1].body).toEqual({ p_reason: "guild_name" });
  });

  it("maps the trade functions to their server calls", async () => {
    const srv = fakeServer({
      "/auth/v1/signup": () => ({ json: SESSION }),
      "rpc/donate_to_order": () => ({ json: 7 }),
      "rpc/claim_order_reward": () => ({ json: true }),
      "rpc/create_request": () => ({ status: 204 }),
      "rpc/cancel_request": () => ({ status: 204 }),
      "rpc/fulfill_request": () => ({ json: 3 }),
      "rpc/claim_deliveries": () => ({ json: [{ goodId: "wool", qty: 4, fromName: "Ayse" }] }),
    });
    const api = createSupabaseGuildApi({
      url: "https://x.supabase.co",
      anonKey: "k",
      fetchImpl: srv.fetchImpl,
      store: memoryStore(),
    });
    expect(await api.donateToOrder(10)).toBe(7);
    expect(await api.claimOrderReward()).toBe(true);
    await api.createRequest("grain", 12);
    await api.cancelRequest();
    expect(await api.fulfillRequest("42", 5)).toBe(3);
    expect(await api.claimDeliveries(30)).toEqual([{ goodId: "wool", qty: 4, fromName: "Ayse" }]);
    const bodies = srv.calls.filter((c) => c.url.includes("/rpc/")).map((c) => c.body);
    expect(bodies).toContainEqual({ p_good: "grain", p_qty: 12 });
    expect(bodies).toContainEqual({ p_request: 42, p_qty: 5 });
    expect(bodies).toContainEqual({ p_room: 30 });
  });

  it("maps trade errors", async () => {
    const srv = fakeServer({
      "/auth/v1/signup": () => ({ json: SESSION }),
      "rpc/create_request": () => ({ status: 400, json: { message: "request_open" } }),
      "rpc/fulfill_request": () => ({ status: 400, json: { message: "request_gone" } }),
    });
    const api = createSupabaseGuildApi({
      url: "https://x.supabase.co",
      anonKey: "k",
      fetchImpl: srv.fetchImpl,
      store: memoryStore(),
    });
    await expect(api.createRequest("grain", 5)).rejects.toMatchObject({ code: "request_open" });
    await expect(api.fulfillRequest("1", 5)).rejects.toMatchObject({ code: "request_gone" });
  });

  it("maps the fun functions to their server calls", async () => {
    const srv = fakeServer({
      "/auth/v1/signup": () => ({ json: SESSION }),
      "rpc/challenge_duel": () => ({ status: 204 }),
      "rpc/respond_duel": () => ({ status: 204 }),
      "rpc/claim_duel_reward": () => ({ json: true }),
      "rpc/daily_draw": () => ({ json: 3 }),
      "rpc/donate_cash": () => ({ json: 4000 }),
      "rpc/top_guilds": () => ({
        json: [{ id: "g", name: "N", totalContribution: 1, members: 2, score: 9, isMine: true }],
      }),
      "rpc/report_guild_id": () => ({ status: 204 }),
    });
    const api = createSupabaseGuildApi({
      url: "https://x.supabase.co",
      anonKey: "k",
      fetchImpl: srv.fetchImpl,
      store: memoryStore(),
    });
    await api.challengeDuel("uuid-1");
    await api.respondDuel("7", true);
    expect(await api.claimDuelReward("7")).toBe(true);
    expect(await api.dailyDraw()).toBe(3);
    expect(await api.donateCash(5000.9)).toBe(4000);
    expect((await api.topGuilds())[0]).toMatchObject({ name: "N", isMine: true });
    await api.reportGuildById("g", "guild_name");
    const bodies = srv.calls.filter((c) => c.url.includes("/rpc/")).map((c) => c.body);
    expect(bodies).toContainEqual({ p_opponent: "uuid-1" });
    expect(bodies).toContainEqual({ p_id: 7, p_accept: true });
    expect(bodies).toContainEqual({ p_amount: 5000 });
    expect(bodies).toContainEqual({ p_guild: "g", p_reason: "guild_name" });
  });

  it("maps the caravan functions", async () => {
    const srv = fakeServer({
      "/auth/v1/signup": () => ({ json: SESSION }),
      "rpc/start_caravan": () => ({ status: 204 }),
      "rpc/load_caravan": () => ({ json: 12 }),
      "rpc/send_caravan": () => ({ status: 204 }),
      "rpc/claim_caravan": (b) =>
        b.p_id === 5
          ? { json: { dest: "portcity", tier: 2, loads: [{ goodId: "iron", qty: 4 }] } }
          : { json: null },
    });
    const api = createSupabaseGuildApi({
      url: "https://x.supabase.co",
      anonKey: "k",
      fetchImpl: srv.fetchImpl,
      store: memoryStore(),
    });
    await api.startCaravan("portcity");
    expect(await api.loadCaravan("iron", 20.7)).toBe(12);
    await api.sendCaravan();
    expect(await api.claimCaravan("5")).toEqual({
      id: "5",
      dest: "portcity",
      tier: 2,
      loads: [{ goodId: "iron", qty: 4 }],
    });
    expect(await api.claimCaravan("6")).toBeNull();
    const bodies = srv.calls.filter((c) => c.url.includes("/rpc/")).map((c) => c.body);
    expect(bodies).toContainEqual({ p_dest: "portcity" });
    expect(bodies).toContainEqual({ p_good: "iron", p_qty: 20 });
  });

  it("maps the caravan errors", async () => {
    const srv = fakeServer({
      "/auth/v1/signup": () => ({ json: SESSION }),
      "rpc/start_caravan": () => ({ status: 400, json: { message: "caravan_busy" } }),
      "rpc/send_caravan": () => ({ status: 400, json: { message: "caravan_empty" } }),
    });
    const api = createSupabaseGuildApi({
      url: "https://x.supabase.co",
      anonKey: "k",
      fetchImpl: srv.fetchImpl,
      store: memoryStore(),
    });
    await expect(api.startCaravan("windyhill")).rejects.toMatchObject({ code: "caravan_busy" });
    await expect(api.sendCaravan()).rejects.toMatchObject({ code: "caravan_empty" });
  });

  it("maps the fun errors", async () => {
    const srv = fakeServer({
      "/auth/v1/signup": () => ({ json: SESSION }),
      "rpc/challenge_duel": () => ({ status: 400, json: { message: "duel_busy" } }),
      "rpc/daily_draw": () => ({ status: 400, json: { message: "already_drawn" } }),
    });
    const api = createSupabaseGuildApi({
      url: "https://x.supabase.co",
      anonKey: "k",
      fetchImpl: srv.fetchImpl,
      store: memoryStore(),
    });
    await expect(api.challengeDuel("x")).rejects.toMatchObject({ code: "duel_busy" });
    await expect(api.dailyDraw()).rejects.toMatchObject({ code: "already_drawn" });
  });

  it("claims the weekly chest as a plain boolean", async () => {
    const srv = fakeServer({
      "/auth/v1/signup": () => ({ json: SESSION }),
      "rpc/claim_weekly_reward": () => ({ json: true }),
    });
    const api = createSupabaseGuildApi({
      url: "https://x.supabase.co",
      anonKey: "k",
      fetchImpl: srv.fetchImpl,
      store: memoryStore(),
    });
    expect(await api.claimWeeklyReward()).toBe(true);
  });
});
