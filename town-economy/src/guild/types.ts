/** What the guild feature needs from a backend. The game talks only to this
 * interface, so the mock (dev / tests) and the real server are swappable. */

export const GUILD_MAX_MEMBERS = 20;
export const GUILD_NAME_MIN = 3;
export const GUILD_NAME_MAX = 20;
export const GUILD_CODE_LENGTH = 6;
/** A guild's weekly goal: this many trades per member (see goalTargetFor). */
export const GOAL_TRADES_PER_MEMBER = 120;

/** The only things a player can send each other: no free text, so there is
 * nothing to moderate. */
export const CHEER_EMOTES = ["👏", "🎉", "💪", "🔥", "❤️"] as const;
export type CheerEmote = (typeof CHEER_EMOTES)[number];

export interface GuildMember {
  id: string;
  name: string;
  rankIndex: number;
  netWorth: number;
  /** trades this member added to the weekly goal */
  weekContribution: number;
  isOwner: boolean;
  isYou: boolean;
}

export interface GuildCheer {
  id: string;
  fromName: string;
  emote: CheerEmote;
  at: number;
  toYou: boolean;
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
  cheers: GuildCheer[];
}

export type GuildErrorCode =
  "name_invalid" | "name_taken" | "not_found" | "full" | "already_in_guild" | "not_in_guild" | "network";

export class GuildError extends Error {
  constructor(public code: GuildErrorCode) {
    super(code);
    this.name = "GuildError";
  }
}

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
  sendCheer(toUserId: string, emote: CheerEmote): Promise<void>;
  /** marks the week's chest as taken; true if this call is the one that took it */
  claimWeeklyReward(): Promise<boolean>;
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
