import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizeGuildCode, normalizeGuildName, validateGuildName } from "./guildName";
import {
  CHEER_EMOTES,
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
    lastBotTick: number;
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
        lastBotTick: now(),
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
        lastBotTick: t,
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
