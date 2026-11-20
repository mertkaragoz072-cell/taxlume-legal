import { townRankThreshold } from "../economy/townRanks";

/** The weekly chest a member takes when the guild reaches its goal: a base
 * purse plus a slice of what their own rank asks for, so it stays worth
 * claiming at every stage of the game. */
export function guildRewardFor(rankIndex: number): number {
  return Math.round(100 + townRankThreshold(rankIndex) * 0.03);
}
