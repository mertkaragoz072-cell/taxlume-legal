import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizeGuildCode, normalizeGuildName, validateGuildName } from "./guildName";
import {
  CHEER_EMOTES,
  GUILD_ORDER_GOODS,
  GUILD_REQUEST_GOODS,
  GuildDelivery,
  GuildRequest,
  orderTargetFor,
  CheerEmote,
  GUILD_MAX_MEMBERS,
  GuildApi,
  GuildCheer,
  GuildError,
  GuildInfo,
  GuildMember,
  SyncProfile,
  goalTargetFor,
  weekStartOf,
} from "./types";

/** A stand-in server that lives on the device: for development, tests and
 * screenshots. The code DEMO42 joins a guild with a few computer-played
 * members who keep trading as real time passes. Nothing here is shared with
 * anyone, which is exactly why the shipped app never uses it. */

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const KEY = "guild.mock.v1";
const ME = "me";
export const MOCK_DEMO_CODE = "DEMO42";

/** Which good a week's order asks for, the same pick for everyone in the guild. */
function orderGoodFor(weekStart: number): string {
  return GUILD_ORDER_GOODS[Math.floor(weekStart / 604_800_000) % GUILD_ORDER_GOODS.length];
}

const BOTS: { id: string; name: string; rankIndex: number; netWorth: number; perHour: number }[] = [
  { id: "b1", name: "Ayşe", rankIndex: 4, netWorth: 52_000, perHour: 14 },
  { id: "b2", name: "Mehmet", rankIndex: 3, netWorth: 21_500, perHour: 9 },
  { id: "b3", name: "Elif", rankIndex: 5, netWorth: 130_000, perHour: 18 },
  { id: "b4", name: "Can", rankIndex: 2, netWorth: 7_800, perHour: 5 },
];

interface Stored {
  guild: {
    id: string;
    name: string;
    code: string;
    ownerId: string;
    createdAt: number;
    total: number;
    members: { id: string; name: string; rankIndex: number; netWorth: number; bot: boolean }[];
    weeks: Record<string, Record<string, number>>; // weekStart -> memberId -> trades
    claimed: Record<string, string[]>; // weekStart -> member ids
    cheers: { id: string; fromId: string; toId: string; emote: CheerEmote; at: number }[];
    donated: Record<string, Record<string, number>>; // weekStart -> memberId -> units given to the order
    gifted: Record<string, Record<string, number>>;
    orderClaimed: Record<string, string[]>;
    requests: {
      id: string;
      fromId: string;
      goodId: string;
      qty: number;
      filled: number;
      closed: boolean;
      at: number;
    }[];
    deliveries: {
      id: string;
      toId: string;
      fromName: string;
      goodId: string;
      qty: number;
      claimed: boolean;
    }[];
    lastBotTick: number;
    lastBotHelp: number;
  } | null;
}

export function createMockGuildApi(
  store: KeyValueStore = AsyncStorage,
  now: () => number = Date.now
): GuildApi {
  async function load(): Promise<Stored> {
    try {
      const raw = await store.getItem(KEY);
      return raw ? (JSON.parse(raw) as Stored) : { guild: null };
    } catch {
      return { guild: null };
    }
  }
  const save = (s: Stored) => store.setItem(KEY, JSON.stringify(s));

  /** lets the computer-played members trade for the time that has passed */
  function advanceBots(s: Stored) {
    const g = s.guild;
    if (!g) return;
    const t = now();
    const hours = Math.max(0, (t - g.lastBotTick) / 3_600_000);
    g.lastBotTick = t;
    const week = String(weekStartOf(t));
    g.weeks[week] ??= {};
    for (const m of g.members) {
      if (!m.bot) continue;
      const bot = BOTS.find((b) => b.id === m.id);
      if (!bot) continue;
      const add = Math.floor(hours * bot.perHour);
      g.weeks[week][m.id] = (g.weeks[week][m.id] ?? 0) + add;
      g.total += add;
      // they chip in to the weekly order too, never past what it needs
      g.donated[week] ??= {};
      const open = Math.max(
        0,
        orderTargetFor(g.members.length) - Object.values(g.donated[week]).reduce((a, b) => a + b, 0)
      );
      g.donated[week][m.id] =
        (g.donated[week][m.id] ?? 0) + Math.min(open, Math.floor(hours * (bot.perHour / 3)));
    }
    // a friend answers your open request, a few units every 20 seconds
    const mine = g.requests.find((r) => r.fromId === ME && !r.closed);
    if (mine && t - g.lastBotHelp >= 20_000) {
      const helper = g.members.find((m) => m.bot);
      const give = Math.min(5, mine.qty - mine.filled);
      if (helper && give > 0) {
        mine.filled += give;
        if (mine.filled >= mine.qty) mine.closed = true;
        g.deliveries.push({
          id: "d" + t,
          toId: ME,
          fromName: helper.name,
          goodId: mine.goodId,
          qty: give,
          claimed: false,
        });
        g.lastBotHelp = t;
      }
    }
  }

  function view(s: Stored): GuildInfo | null {
    const g = s.guild;
    if (!g) return null;
    const t = now();
    const week = String(weekStartOf(t));
    const contrib = g.weeks[week] ?? {};
    const members: GuildMember[] = g.members.map((m) => ({
      id: m.id,
      name: m.name,
      rankIndex: m.rankIndex,
      netWorth: m.netWorth,
      weekContribution: contrib[m.id] ?? 0,
      donated: g.donated[week]?.[m.id] ?? 0,
      gifted: g.gifted[week]?.[m.id] ?? 0,
      isOwner: m.id === g.ownerId,
      isYou: m.id === ME,
    }));
    members.sort((a, b) => b.weekContribution - a.weekContribution);
    const names = new Map(g.members.map((m) => [m.id, m.name]));
    const cheers: GuildCheer[] = g.cheers
      .slice(-8)
      .reverse()
      .map((c) => ({
        id: c.id,
        fromName: names.get(c.fromId) ?? "?",
        emote: c.emote,
        at: c.at,
        toYou: c.toId === ME,
      }));
    const donations = g.donated[week] ?? {};
    const requests: GuildRequest[] = g.requests
      .filter((r) => !r.closed)
      .map((r) => ({
        id: r.id,
        fromId: r.fromId,
        fromName: names.get(r.fromId) ?? "?",
        goodId: r.goodId,
        qty: r.qty,
        filled: r.filled,
        isMine: r.fromId === ME,
      }))
      .sort((a, b) => Number(b.isMine) - Number(a.isMine));
    return {
      id: g.id,
      name: g.name,
      code: g.code,
      memberCount: g.members.length,
      members,
      weekStart: Number(week),
      goalTarget: goalTargetFor(g.members.length),
      goalProgress: Object.values(contrib).reduce((a, b) => a + b, 0),
      rewardClaimed: (g.claimed[week] ?? []).includes(ME),
      totalContribution: g.total,
      order: {
        goodId: orderGoodFor(Number(week)),
        target: orderTargetFor(g.members.length),
        progress: Object.values(donations).reduce((a, b) => a + b, 0),
        myDonated: donations[ME] ?? 0,
        rewardClaimed: (g.orderClaimed[week] ?? []).includes(ME),
      },
      requests,
      cheers,
    };
  }

  const me = (profile?: SyncProfile) => ({
    id: ME,
    name: profile?.displayName ?? "Sen",
    rankIndex: profile?.rankIndex ?? 0,
    netWorth: profile?.netWorth ?? 0,
    bot: false,
  });

  return {
    async getMyGuild() {
      const s = await load();
      advanceBots(s);
      await save(s);
      return view(s);
    },
    async createGuild(rawName) {
      const s = await load();
      if (s.guild) throw new GuildError("already_in_guild");
      const name = normalizeGuildName(rawName);
      if (!validateGuildName(name)) throw new GuildError("name_invalid");
      if (name.toLocaleLowerCase("tr") === "taken") throw new GuildError("name_taken");
      s.guild = {
        id: "g-" + now(),
        name,
        code: "MK" + Math.floor(1000 + Math.random() * 9000),
        ownerId: ME,
        createdAt: now(),
        total: 0,
        members: [me()],
        weeks: {},
        claimed: {},
        cheers: [],
        donated: {},
        gifted: {},
        orderClaimed: {},
        requests: [],
        deliveries: [],
        lastBotTick: now(),
        lastBotHelp: 0,
      };
      await save(s);
      return view(s)!;
    },
    async joinGuild(rawCode) {
      const s = await load();
      if (s.guild) throw new GuildError("already_in_guild");
      if (normalizeGuildCode(rawCode) !== MOCK_DEMO_CODE) throw new GuildError("not_found");
      const t = now();
      const week = String(weekStartOf(t));
      s.guild = {
        id: "g-demo",
        name: "Altın Tüccarlar",
        code: MOCK_DEMO_CODE,
        ownerId: "b1",
        createdAt: t - 9 * 86_400_000,
        total: 640,
        members: [
          ...BOTS.map((b) => ({
            id: b.id,
            name: b.name,
            rankIndex: b.rankIndex,
            netWorth: b.netWorth,
            bot: true,
          })),
          me(),
        ],
        weeks: { [week]: { b1: 96, b2: 54, b3: 118, b4: 31 } },
        claimed: {},
        cheers: [{ id: "c0", fromId: "b3", toId: ME, emote: "👏", at: t - 3_600_000 }],
        donated: { [week]: { b1: 6, b2: 4, b3: 9, b4: 2 } },
        gifted: { [week]: { b3: 5 } },
        orderClaimed: {},
        requests: [
          { id: "r1", fromId: "b3", goodId: "wool", qty: 12, filled: 4, closed: false, at: t - 3_000_000 },
          { id: "r2", fromId: "b4", goodId: "sand", qty: 8, filled: 0, closed: false, at: t - 1_000_000 },
        ],
        deliveries: [],
        lastBotTick: t,
        lastBotHelp: t,
      };
      if (s.guild.members.length > GUILD_MAX_MEMBERS) throw new GuildError("full");
      await save(s);
      return view(s)!;
    },
    async leaveGuild() {
      const s = await load();
      if (!s.guild) throw new GuildError("not_in_guild");
      s.guild = null;
      await save(s);
    },
    async syncProfile(profile) {
      const s = await load();
      const m = s.guild?.members.find((x) => x.id === ME);
      if (!m) return;
      m.name = profile.displayName;
      m.rankIndex = profile.rankIndex;
      m.netWorth = profile.netWorth;
      await save(s);
    },
    async reportContribution(trades) {
      const s = await load();
      if (!s.guild || trades <= 0) return;
      const week = String(weekStartOf(now()));
      s.guild.weeks[week] ??= {};
      s.guild.weeks[week][ME] = (s.guild.weeks[week][ME] ?? 0) + Math.floor(trades);
      s.guild.total += Math.floor(trades);
      await save(s);
    },
    async sendCheer(toUserId, emote) {
      const s = await load();
      if (!s.guild) throw new GuildError("not_in_guild");
      if (!CHEER_EMOTES.includes(emote)) return;
      s.guild.cheers.push({ id: "c" + now(), fromId: ME, toId: toUserId, emote, at: now() });
      await save(s);
    },
    async donateToOrder(qty) {
      const s = await load();
      const g = s.guild;
      if (!g) throw new GuildError("not_in_guild");
      const week = String(weekStartOf(now()));
      g.donated[week] ??= {};
      const have = Object.values(g.donated[week]).reduce((a, b) => a + b, 0);
      const take = Math.max(0, Math.min(Math.floor(qty), 200, orderTargetFor(g.members.length) - have));
      if (take > 0) {
        g.donated[week][ME] = (g.donated[week][ME] ?? 0) + take;
        await save(s);
      }
      return take;
    },
    async claimOrderReward() {
      const s = await load();
      const g = s.guild;
      if (!g) throw new GuildError("not_in_guild");
      const week = String(weekStartOf(now()));
      const d = g.donated[week] ?? {};
      const done = Object.values(d).reduce((a, b) => a + b, 0) >= orderTargetFor(g.members.length);
      g.orderClaimed[week] ??= [];
      if (!done || (d[ME] ?? 0) < 1 || g.orderClaimed[week].includes(ME)) return false;
      g.orderClaimed[week].push(ME);
      await save(s);
      return true;
    },
    async createRequest(goodId, qty) {
      const s = await load();
      const g = s.guild;
      if (!g) throw new GuildError("not_in_guild");
      if (!(GUILD_REQUEST_GOODS as readonly string[]).includes(goodId) || qty < 1 || qty > 50) {
        throw new GuildError("request_invalid");
      }
      if (g.requests.some((r) => r.fromId === ME && !r.closed)) throw new GuildError("request_open");
      g.requests.push({
        id: "r" + now(),
        fromId: ME,
        goodId,
        qty: Math.floor(qty),
        filled: 0,
        closed: false,
        at: now(),
      });
      g.lastBotHelp = now();
      await save(s);
    },
    async cancelRequest() {
      const s = await load();
      s.guild?.requests.forEach((r) => {
        if (r.fromId === ME) r.closed = true;
      });
      await save(s);
    },
    async fulfillRequest(requestId, qty) {
      const s = await load();
      const g = s.guild;
      if (!g) throw new GuildError("not_in_guild");
      const r = g.requests.find((x) => x.id === requestId && !x.closed);
      if (!r) throw new GuildError("request_gone");
      if (r.fromId === ME) throw new GuildError("own_request");
      const take = Math.max(0, Math.min(Math.floor(qty), 50, r.qty - r.filled));
      if (take > 0) {
        r.filled += take;
        if (r.filled >= r.qty) r.closed = true;
        const week = String(weekStartOf(now()));
        g.gifted[week] ??= {};
        g.gifted[week][ME] = (g.gifted[week][ME] ?? 0) + take;
        await save(s);
      }
      return take;
    },
    async claimDeliveries(room) {
      const s = await load();
      const g = s.guild;
      if (!g) return [];
      advanceBots(s);
      let left = Math.max(0, Math.floor(room));
      const out: GuildDelivery[] = [];
      for (const d of g.deliveries) {
        if (d.claimed || d.toId !== ME) continue;
        if (d.qty > left) break;
        d.claimed = true;
        left -= d.qty;
        out.push({ goodId: d.goodId, qty: d.qty, fromName: d.fromName });
      }
      await save(s);
      return out;
    },
    async reportGuild() {
      const s = await load();
      if (!s.guild) throw new GuildError("not_in_guild");
      // nothing to send anywhere: the mock only checks that you are in a guild
    },
    async claimWeeklyReward() {
      const s = await load();
      const g = s.guild;
      if (!g) throw new GuildError("not_in_guild");
      const week = String(weekStartOf(now()));
      const progress = Object.values(g.weeks[week] ?? {}).reduce((a, b) => a + b, 0);
      if (progress < goalTargetFor(g.members.length)) return false;
      g.claimed[week] ??= [];
      if (g.claimed[week].includes(ME)) return false;
      g.claimed[week].push(ME);
      await save(s);
      return true;
    },
  };
}
