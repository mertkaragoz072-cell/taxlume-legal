import AsyncStorage from "@react-native-async-storage/async-storage";
import { KeyValueStore } from "./mockApi";
import {
  CheerCode,
  GuildApi,
  GuildDelivery,
  GuildError,
  GuildErrorCode,
  GuildInfo,
  RankedGuild,
  SyncProfile,
} from "./types";

/** The real guild backend: a Supabase project running backend/supabase/schema.sql.
 * Talks to it with plain fetch (no SDK): GoTrue for the anonymous account the
 * player gets on first use, PostgREST for the guild functions. */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  fetchImpl?: typeof fetch;
  store?: KeyValueStore;
  now?: () => number;
}

interface Session {
  access_token: string;
  refresh_token: string;
  /** seconds since epoch */
  expires_at: number;
}

const SESSION_KEY = "guild.session.v1";
const KNOWN: GuildErrorCode[] = [
  "name_invalid",
  "name_taken",
  "not_found",
  "full",
  "already_in_guild",
  "not_in_guild",
  "request_open",
  "request_invalid",
  "request_gone",
  "own_request",
  "duel_invalid",
  "duel_busy",
  "duel_gone",
  "already_drawn",
];

function toCode(message: unknown): GuildErrorCode {
  const m = typeof message === "string" ? message : "";
  return KNOWN.find((c) => m.includes(c)) ?? "network";
}

export function createSupabaseGuildApi(cfg: SupabaseConfig): GuildApi {
  const base = cfg.url.replace(/\/+$/, "");
  const doFetch = cfg.fetchImpl ?? fetch;
  const store = cfg.store ?? AsyncStorage;
  const now = cfg.now ?? Date.now;
  let cached: Session | null = null;

  async function request(path: string, init: RequestInit): Promise<Response> {
    try {
      return await doFetch(`${base}${path}`, init);
    } catch {
      throw new GuildError("network");
    }
  }

  async function auth(path: string, body: object): Promise<Session> {
    const res = await request(path, {
      method: "POST",
      headers: { apikey: cfg.anonKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // a 4xx is the server refusing this token; anything else is a bad connection
    if (res.status >= 400 && res.status < 500) throw new Error("refused");
    if (!res.ok) throw new GuildError("network");
    const json = (await res.json()) as Partial<Session> & { expires_in?: number };
    if (!json.access_token || !json.refresh_token) throw new GuildError("network");
    return {
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_at: json.expires_at ?? Math.floor(now() / 1000) + (json.expires_in ?? 3600),
    };
  }

  async function save(s: Session | null) {
    cached = s;
    try {
      if (s) await store.setItem(SESSION_KEY, JSON.stringify(s));
      else await store.removeItem(SESSION_KEY);
    } catch {
      // the session still works for this run
    }
  }

  /** a valid access token: stored, refreshed, or from a brand-new anonymous account */
  async function token(): Promise<string> {
    if (!cached) {
      try {
        const raw = await store.getItem(SESSION_KEY);
        if (raw) cached = JSON.parse(raw) as Session;
      } catch {
        cached = null;
      }
    }
    if (cached && cached.expires_at - 60 > now() / 1000) return cached.access_token;
    if (cached) {
      try {
        const s = await auth("/auth/v1/token?grant_type=refresh_token", {
          refresh_token: cached.refresh_token,
        });
        await save(s);
        return s.access_token;
      } catch (e) {
        // A refused refresh token means this account is gone: start a new one.
        // A dead connection is not a reason to throw the account away.
        if (e instanceof GuildError) throw e;
      }
    }
    const s = await auth("/auth/v1/signup", {});
    await save(s);
    return s.access_token;
  }

  async function rpc<T>(fn: string, args: object = {}, retried = false): Promise<T> {
    const res = await request(`/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${await token()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
    if (res.status === 401 && !retried) {
      await save(null);
      return rpc<T>(fn, args, true);
    }
    if (!res.ok) {
      let message: unknown;
      try {
        message = ((await res.json()) as { message?: unknown }).message;
      } catch {
        message = undefined;
      }
      throw new GuildError(toCode(message));
    }
    if (res.status === 204) return null as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : null) as T;
  }

  const myGuild = () => rpc<GuildInfo | null>("get_my_guild");

  return {
    getMyGuild: myGuild,
    async createGuild(name) {
      await rpc("create_guild", { p_name: name });
      const g = await myGuild();
      if (!g) throw new GuildError("network");
      return g;
    },
    async joinGuild(code) {
      await rpc("join_guild", { p_code: code });
      const g = await myGuild();
      if (!g) throw new GuildError("network");
      return g;
    },
    async leaveGuild() {
      await rpc("leave_guild");
      // Leaving deletes the anonymous account on the server, so forget its session too.
      await save(null);
    },
    async syncProfile(p: SyncProfile) {
      await rpc("sync_profile", { p_name: p.displayName, p_rank: p.rankIndex, p_net_worth: p.netWorth });
    },
    async reportContribution(trades) {
      await rpc("report_contribution", { p_trades: Math.floor(trades) });
    },
    async sendCheer(toUserId: string, emote: CheerCode) {
      await rpc("send_cheer", { p_to: toUserId, p_emote: emote });
    },
    async donateToOrder(qty) {
      return Number(await rpc<number>("donate_to_order", { p_qty: Math.floor(qty) })) || 0;
    },
    async claimOrderReward() {
      return Boolean(await rpc<boolean>("claim_order_reward"));
    },
    async createRequest(goodId, qty) {
      await rpc("create_request", { p_good: goodId, p_qty: Math.floor(qty) });
    },
    async cancelRequest() {
      await rpc("cancel_request");
    },
    async fulfillRequest(requestId, qty) {
      return (
        Number(
          await rpc<number>("fulfill_request", { p_request: Number(requestId), p_qty: Math.floor(qty) })
        ) || 0
      );
    },
    async claimDeliveries(room) {
      return (
        (await rpc<GuildDelivery[] | null>("claim_deliveries", { p_room: Math.max(0, Math.floor(room)) })) ??
        []
      );
    },
    async challengeDuel(opponentId) {
      await rpc("challenge_duel", { p_opponent: opponentId });
    },
    async respondDuel(duelId, accept) {
      await rpc("respond_duel", { p_id: Number(duelId), p_accept: accept });
    },
    async claimDuelReward(duelId) {
      return Boolean(await rpc<boolean>("claim_duel_reward", { p_id: Number(duelId) }));
    },
    async dailyDraw() {
      const tier = Number(await rpc<number>("daily_draw"));
      return (tier === 3 ? 3 : tier === 2 ? 2 : 1) as 1 | 2 | 3;
    },
    async donateCash(amount) {
      return Number(await rpc<number>("donate_cash", { p_amount: Math.floor(amount) })) || 0;
    },
    async topGuilds() {
      return (await rpc<RankedGuild[] | null>("top_guilds")) ?? [];
    },
    async reportGuildById(guildId, reason) {
      await rpc("report_guild_id", { p_guild: guildId, p_reason: reason });
    },
    async reportGuild(reason) {
      await rpc("report_guild", { p_reason: reason });
    },
    async claimWeeklyReward() {
      return Boolean(await rpc<boolean>("claim_weekly_reward"));
    },
  };
}
