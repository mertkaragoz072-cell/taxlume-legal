import { GoodGroup, goodGroup } from "./goods";
import { GoodId } from "./types";
import { TICKS_PER_GAME_DAY } from "./constants";

export type SeasonId = "spring" | "summer" | "autumn" | "winter";

export interface Season {
  id: SeasonId;
  icon: string;
  nameKey: string;
  /** what this season does to each group's production */
  production: Record<GoodGroup, number>;
}

/** Days in each season. Five puts a whole year inside twenty game days —
 * about forty minutes of play — so a single session sees the wheel turn
 * more than once rather than ending in the spring it started in. */
export const SEASON_DAYS = 5;

/** The year, and the one rhythm in the game a player can plan against.
 *
 * Everything else that moves the market is a roll: news, crises, demand
 * cycles, the foreign towns' own noise. A player can react to those but
 * never anticipate them, which caps how clever anyone can be — day forty
 * plays exactly like day four.
 *
 * Seasons are the opposite kind of pressure: fixed, visible, and known
 * days ahead. Autumn floods the market with food and winter starves it, so
 * "buy grain in autumn and hold it" is a plan a player can form on their
 * own, weeks before it pays. The numbers are deliberately lopsided toward
 * food, because food is what a medieval town's year actually turns on, and
 * because a swing you can see coming is only interesting if it is big.
 */
export const SEASONS: Season[] = [
  {
    id: "spring",
    icon: "🌱",
    nameKey: "season.spring",
    production: { food: 1.1, raw: 1.05, crafted: 1.0, luxury: 0.95 },
  },
  {
    id: "summer",
    icon: "☀️",
    nameKey: "season.summer",
    production: { food: 1.0, raw: 1.15, crafted: 1.1, luxury: 1.05 },
  },
  {
    id: "autumn",
    icon: "🍂",
    nameKey: "season.autumn",
    production: { food: 1.35, raw: 1.0, crafted: 1.0, luxury: 1.1 },
  },
  {
    id: "winter",
    icon: "❄️",
    nameKey: "season.winter",
    production: { food: 0.65, raw: 0.85, crafted: 0.95, luxury: 1.0 },
  },
];

/** Derived from the tick rather than stored.
 *
 * Nothing about a season needs remembering: it is a function of how long
 * the town has been running. Keeping it out of the save means the whole
 * feature costs no migration and cannot drift out of step with the clock.
 */
export function seasonFromTick(tick: number): Season {
  const day = Math.floor(tick / TICKS_PER_GAME_DAY);
  return SEASONS[Math.floor(day / SEASON_DAYS) % SEASONS.length];
}

export function nextSeasonFromTick(tick: number): Season {
  return SEASONS[(SEASONS.indexOf(seasonFromTick(tick)) + 1) % SEASONS.length];
}

/** Whole days left in the current season, so the forecast can say "winter
 * in 2 days" and a player can act on it. */
export function daysUntilNextSeason(tick: number): number {
  const day = Math.floor(tick / TICKS_PER_GAME_DAY);
  return SEASON_DAYS - (day % SEASON_DAYS);
}

export function seasonProductionMultiplier(season: Season, goodId: GoodId): number {
  return season.production[goodGroup(goodId)];
}
