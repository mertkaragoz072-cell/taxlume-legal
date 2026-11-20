import { townRankThreshold } from "../economy/townRanks";
import { streakMultiplier } from "./types";

/** The weekly chest a member takes when the guild reaches its goal: a base
 * purse plus a slice of what their own rank asks for, so it stays worth
 * claiming at every stage of the game. A guild on a weekly streak earns more. */
export function guildRewardFor(rankIndex: number, streak = 0): number {
  return Math.round((100 + townRankThreshold(rankIndex) * 0.03) * streakMultiplier(streak));
}
