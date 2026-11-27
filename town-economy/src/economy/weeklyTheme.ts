import { isoWeekKey } from "./weeklyChallenges";
import { GoodId } from "./types";

/** A themed market week: every calendar week two goods are in fashion and sell for
 * more. It follows the ISO week of the device clock (like the weekly challenge), so
 * all players share the week without any server, and it gives each week a reason to
 * stock something particular. */
export interface WeeklyTheme {
  id: string;
  icon: string;
  titleKey: string;
  goods: GoodId[];
  /** price multiplier on those goods for the week */
  priceMultiplier: number;
}

export const WEEKLY_THEMES: WeeklyTheme[] = [
  {
    id: "harvest",
    icon: "🌾",
    titleKey: "weeklyTheme.harvest",
    goods: ["grain", "bread"],
    priceMultiplier: 1.15,
  },
  {
    id: "builders",
    icon: "🏗️",
    titleKey: "weeklyTheme.builders",
    goods: ["wood", "iron"],
    priceMultiplier: 1.15,
  },
  {
    id: "tailors",
    icon: "🧵",
    titleKey: "weeklyTheme.tailors",
    goods: ["wool", "cloth"],
    priceMultiplier: 1.15,
  },
  {
    id: "feast",
    icon: "🍷",
    titleKey: "weeklyTheme.feast",
    goods: ["wine", "cheese"],
    priceMultiplier: 1.15,
  },
  {
    id: "harbor",
    icon: "⚓",
    titleKey: "weeklyTheme.harbor",
    goods: ["fish", "sand"],
    priceMultiplier: 1.15,
  },
  {
    id: "market",
    icon: "💎",
    titleKey: "weeklyTheme.market",
    goods: ["jewelry", "silk"],
    priceMultiplier: 1.12,
  },
];

export function weeklyThemeForDate(dateStr: string): WeeklyTheme {
  const key = isoWeekKey(dateStr);
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return WEEKLY_THEMES[hash % WEEKLY_THEMES.length];
}

export function weeklyThemeMultiplier(theme: WeeklyTheme, goodId: GoodId): number {
  return theme.goods.includes(goodId) ? theme.priceMultiplier : 1;
}

/** "YYYY-MM-DD" of the device clock, in UTC like every other date the game keys on. */
export function todayKey(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}
