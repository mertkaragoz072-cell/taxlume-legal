import { EconomyStats } from "./types";

/** The town's monthly live event — the first FESTIVAL_WINDOW_DAYS days of
 * every real calendar month, purely derived from the device clock so every
 * player sees the same window with no server sync needed, the same
 * reasoning as isoWeekKey in weeklyChallenges.ts. Clearing the trade goal
 * before the window closes earns a permanent emblem (see "festival" in
 * emblems.ts) that cannot be obtained any other way. */
export const FESTIVAL_WINDOW_DAYS = 3;
export const FESTIVAL_GOAL_TRADES = 20;
export const FESTIVAL_REWARD_CASH = 600;

/** "2026-10" for a "YYYY-MM-DD" date string. */
export function festivalMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/** Whether today falls inside this month's festival window. */
export function isFestivalWindowOpen(dateStr: string): boolean {
  const day = Number(dateStr.slice(8, 10));
  return day >= 1 && day <= FESTIVAL_WINDOW_DAYS;
}

/** A lifetime EconomyStats counter, diffed against a baseline snapshot taken
 * when the festival window opens — see ensureFestivalProgress in useEconomy.ts. */
export function festivalMetric(stats: EconomyStats): number {
  return stats.totalTrades;
}
