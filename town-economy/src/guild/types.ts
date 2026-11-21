/** What the guild feature needs from a backend. The game talks only to this
 * interface, so the mock (dev / tests) and the real server are swappable. */

export const GUILD_MAX_MEMBERS = 20;
export const GUILD_NAME_MIN = 3;
export const GUILD_NAME_MAX = 20;
export const GUILD_CODE_LENGTH = 6;
/** A guild's weekly goal: this many trades per member (see goalTargetFor). */
export const GOAL_TRADES_PER_MEMBER = 120;
/** The weekly guild order asks this many units of one good per member. */
export const ORDER_UNITS_PER_MEMBER = 40;
export const REQUEST_MAX_QTY = 50;
/** The everyday goods the server picks each week's order from: cheap and
 * available to every town from the first day (no luxuries). */
export const GUILD_ORDER_GOODS = [
  "grain",
  "wool",
  "sand",
  "bread",
  "milk",
  "wood",
  "iron",
  "cloth",
  "fish",
] as const;
/** Every good a member may ask friends for. */
export const GUILD_REQUEST_GOODS = [
  ...GUILD_ORDER_GOODS,
  "wine",
  "leather",
  "spice",
  "silk",
  "jewelry",
  "honey",
  "cheese",
  "paper",
  "glass",
] as const;

/** The only things a player can send each other: no free text, so there is
 * nothing to moderate. */
export const CHEER_EMOTES = ["👏", "🎉", "💪", "🔥", "❤️"] as const;
export type CheerEmote = (typeof CHEER_EMOTES)[number];
/** Ready-made phrases, shown in each player's own language. */
export const GUILD_PHRASES = ["hi", "thanks", "help", "gg", "wait"] as const;
export type GuildPhrase = (typeof GUILD_PHRASES)[number];
/** Everything one player can send another: an emoji or a fixed phrase. */
export type CheerCode = CheerEmote | GuildPhrase;
export const CHEER_CODES: readonly CheerCode[] = [...CHEER_EMOTES, ...GUILD_PHRASES];

/** What can show up in the guild's activity feed. */
export type GuildFeedKind = "joined" | "goal_done" | "order_done" | "duel_won" | "project_done" | "big_draw";

export interface GuildFeedItem {
  id: string;
  kind: GuildFeedKind;
  /** the member it is about; empty for guild-wide news (goal reached, order complete) */
  actorName: string;
  /** which hall project, for project_done */
  detail: string | null;
  at: number;
}

export type DuelStatus = "pending" | "active" | "done" | "declined";

/** A friendly 24-hour trading duel between two members. */
export interface GuildDuel {
  id: string;
  status: DuelStatus;
  challengerId: string;
  challengerName: string;
  opponentId: string;
  opponentName: string;
  /** when an active duel ends, ms */
  endsAt: number | null;
  cTrades: number;
  oTrades: number;
  winnerId: string | null;
  /** this player won and has not taken the prize yet */
  canClaim: boolean;
}

/** Hall projects the guild has built, and the coins towards the next one. */
export interface GuildProjects {
  built: number;
  progress: number;
}

/** One line of the weekly ranking of guilds. */
export interface RankedGuild {
  id: string;
  name: string;
  totalContribution: number;
  members: number;
  score: number;
  isMine: boolean;
}

export interface GuildMember {
  id: string;
  name: string;
  rankIndex: number;
  netWorth: number;
  /** trades this member added to the weekly goal */
  weekContribution: number;
  /** units this member gave to the weekly order, and sent to friends' requests */
  donated: number;
  gifted: number;
  /** coins this member gave to the guild hall */
  cashGiven: number;
  isOwner: boolean;
  isYou: boolean;
}

export interface GuildCheer {
  id: string;
  fromName: string;
  emote: CheerCode;
  at: number;
  toYou: boolean;
}

/** The good the whole guild is asked for this week. */
export interface GuildOrder {
  goodId: string;
  target: number;
  progress: number;
  /** what this player gave to it */
  myDonated: number;
  rewardClaimed: boolean;
}

/** A member asking friends for a good. */
export interface GuildRequest {
  id: string;
  fromId: string;
  fromName: string;
  goodId: string;
  qty: number;
  filled: number;
  isMine: boolean;
}

/** Goods a friend sent, waiting to be collected. */
export interface GuildDelivery {
  goodId: string;
  qty: number;
  fromName: string;
}

export interface GuildInfo {
  id: string;
  name: string;
  code: string;
  memberCount: number;
  members: GuildMember[];
  /** Monday 00:00 UTC of the running week, ms */
  weekStart: number;
  goalTarget: number;
  goalProgress: number;
  /** this player already took this week's chest */
  rewardClaimed: boolean;
  /** all-time trades the guild has made together; drives its level */
  totalContribution: number;
  /** weeks in a row (before this one) the guild reached its trade goal */
  streak: number;
  /** everything this player has ever contributed to this guild */
  myTotals: { trades: number; donated: number; gifted: number };
  order: GuildOrder;
  requests: GuildRequest[];
  feed: GuildFeedItem[];
  duels: GuildDuel[];
  /** this player already took today's draw */
  drawnToday: boolean;
  projects: GuildProjects;
  cheers: GuildCheer[];
}

export type GuildErrorCode =
  | "name_invalid"
  | "name_taken"
  | "not_found"
  | "full"
  | "already_in_guild"
  | "not_in_guild"
  | "request_open"
  | "request_invalid"
  | "request_gone"
  | "own_request"
  | "duel_invalid"
  | "duel_busy"
  | "duel_gone"
  | "already_drawn"
  | "network";

export class GuildError extends Error {
  constructor(public code: GuildErrorCode) {
    super(code);
    this.name = "GuildError";
  }
}

/** Why a player reports a guild; fixed choices, so a report is never free text. */
export const REPORT_REASONS = ["guild_name", "member_name", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface SyncProfile {
  displayName: string;
  rankIndex: number;
  netWorth: number;
}

export interface GuildApi {
  getMyGuild(): Promise<GuildInfo | null>;
  createGuild(name: string): Promise<GuildInfo>;
  joinGuild(code: string): Promise<GuildInfo>;
  leaveGuild(): Promise<void>;
  /** keeps the player's name / rank / net worth current for the member list */
  syncProfile(profile: SyncProfile): Promise<void>;
  /** adds finished trades to this week's goal */
  reportContribution(trades: number): Promise<void>;
  sendCheer(toUserId: string, emote: CheerCode): Promise<void>;
  /** marks the week's chest as taken; true if this call is the one that took it */
  claimWeeklyReward(): Promise<boolean>;
  /** gives goods to the weekly order; returns how many were accepted (remove exactly that many) */
  donateToOrder(qty: number): Promise<number>;
  claimOrderReward(): Promise<boolean>;
  createRequest(goodId: string, qty: number): Promise<void>;
  cancelRequest(): Promise<void>;
  /** sends goods to a friend's request; returns how many were accepted (remove exactly that many) */
  fulfillRequest(requestId: string, qty: number): Promise<number>;
  /** collects goods friends sent, as many as fit in `room` units of storage */
  claimDeliveries(room: number): Promise<GuildDelivery[]>;
  /** dares a guild friend to a 24-hour trading duel */
  challengeDuel(opponentId: string): Promise<void>;
  /** the challenged player accepts or declines; the challenger can withdraw (accept = false) */
  respondDuel(duelId: string, accept: boolean): Promise<void>;
  claimDuelReward(duelId: string): Promise<boolean>;
  /** today's free draw: the prize tier, 1 (small) to 3 (big) */
  dailyDraw(): Promise<1 | 2 | 3>;
  /** gives coins to the guild hall; returns how many were accepted (remove exactly that many) */
  donateCash(amount: number): Promise<number>;
  /** this week's most active guilds */
  topGuilds(): Promise<RankedGuild[]>;
  /** flags a guild from the ranking */
  reportGuildById(guildId: string, reason: ReportReason): Promise<void>;
  /** flags the player's guild (its name or a member's name) for review */
  reportGuild(reason: ReportReason): Promise<void>;
}

/** Chest bonus for a guild on a streak: +10% per week in a row, up to +50%. */
export function streakMultiplier(streak: number): number {
  return 1 + 0.1 * Math.max(0, Math.min(5, Math.floor(streak)));
}

/** The hall projects a guild builds in order with its members' coins. */
export interface HallProject {
  id: string;
  icon: string;
  /** coins to build it (mirrors guild_project_cost in the server schema) */
  cost: number;
  /** extra warehouse room for every member's town */
  storage: number;
  /** extra output for every member's town (a fraction: 0.005 = +0.5%) */
  output: number;
}

export const HALL_PROJECTS: HallProject[] = [
  { id: "market", icon: "🏪", cost: 5_000, storage: 80, output: 0 },
  { id: "workshop", icon: "⚒️", cost: 25_000, storage: 0, output: 0.005 },
  { id: "granary", icon: "🌾", cost: 100_000, storage: 160, output: 0 },
  { id: "library", icon: "📚", cost: 400_000, storage: 0, output: 0.005 },
  { id: "monument", icon: "🗿", cost: 1_500_000, storage: 240, output: 0.01 },
  { id: "palace", icon: "🏰", cost: 6_000_000, storage: 0, output: 0.015 },
];

export const DUEL_HOURS = 24;

export function orderTargetFor(memberCount: number): number {
  return ORDER_UNITS_PER_MEMBER * Math.max(1, memberCount);
}

export function goalTargetFor(memberCount: number): number {
  return GOAL_TRADES_PER_MEMBER * Math.max(1, memberCount);
}

/** Guild level from everything it has traded together: 1, 2, 3 ... */
export function guildLevel(totalContribution: number): number {
  return 1 + Math.floor(Math.sqrt(Math.max(0, totalContribution) / 60));
}

/** Monday 00:00 UTC of the week containing `now`. */
export function weekStartOf(now: number): number {
  const d = new Date(now);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
}
