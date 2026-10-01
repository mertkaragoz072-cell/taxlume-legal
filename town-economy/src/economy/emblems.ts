import { EconomyState } from "./types";

export interface TownEmblemDef {
  id: string;
  icon: string;
  /** i18n key for the short unlock-condition hint shown while locked */
  hintKey: string;
  /** purely cosmetic — never touches production, price, or cash */
  unlockedBy: (state: EconomyState) => boolean;
}

// A little collectible flourish alongside every other system already in the
// game — no mechanical effect at all, just a badge next to the town's name
// that shows off what you've actually done. Deliberately reuses milestones
// the game already tracks (prestige, achievements, rank, streaks) rather
// than adding a whole new unlock system just for cosmetics.
export const TOWN_EMBLEMS: TownEmblemDef[] = [
  { id: "village", icon: "🏘️", hintKey: "emblem.village.hint", unlockedBy: () => true },
  { id: "castle", icon: "🏰", hintKey: "emblem.castle.hint", unlockedBy: () => true },
  { id: "anchor", icon: "⚓", hintKey: "emblem.anchor.hint", unlockedBy: () => true },
  { id: "wheat", icon: "🌾", hintKey: "emblem.wheat.hint", unlockedBy: () => true },
  { id: "crown", icon: "👑", hintKey: "emblem.crown.hint", unlockedBy: (s) => s.prestigeLevel >= 1 },
  {
    id: "trophy",
    icon: "🏆",
    hintKey: "emblem.trophy.hint",
    unlockedBy: (s) => s.unlockedAchievements.length >= 10,
  },
  { id: "dragon", icon: "🐉", hintKey: "emblem.dragon.hint", unlockedBy: (s) => s.legendaryUnlocked },
  { id: "trident", icon: "🔱", hintKey: "emblem.trident.hint", unlockedBy: (s) => s.townRankIndex >= 12 },
  { id: "flame", icon: "🔥", hintKey: "emblem.flame.hint", unlockedBy: (s) => s.stats.bestTradeStreak >= 10 },
  { id: "star", icon: "⭐", hintKey: "emblem.star.hint", unlockedBy: (s) => s.streak.count >= 30 },
  { id: "anvil", icon: "⚒️", hintKey: "emblem.anvil.hint", unlockedBy: (s) => s.researched.length >= 15 },
  {
    id: "caravan",
    icon: "🐪",
    hintKey: "emblem.caravan.hint",
    unlockedBy: (s) => s.stats.totalCaravansCompleted >= 25,
  },
  {
    id: "compass",
    icon: "🧭",
    hintKey: "emblem.compass.hint",
    unlockedBy: (s) => s.metropolUnlocked && s.stats.townsTradedWith.length >= 3,
  },
  {
    id: "shield",
    icon: "🛡️",
    hintKey: "emblem.shield.hint",
    unlockedBy: (s) => s.unlockedAchievements.length >= 25,
  },
  // 1000 ticks is 25 in-game days (TICKS_PER_GAME_DAY=40 in useEconomy.ts) —
  // hardcoded rather than imported, same reasoning as achievements.ts'
  // survive_100/survive_1000 (avoids a circular import with useEconomy.ts).
  { id: "owl", icon: "🦉", hintKey: "emblem.owl.hint", unlockedBy: (s) => s.tick >= 1000 },
  { id: "moneybag", icon: "💰", hintKey: "emblem.moneybag.hint", unlockedBy: (s) => s.townRankIndex >= 6 },
  {
    id: "key",
    icon: "🔑",
    hintKey: "emblem.key.hint",
    unlockedBy: (s) => s.workersUnlocked && Object.values(s.workers).reduce((sum, n) => sum + n, 0) >= 10,
  },
  { id: "hourglass", icon: "⏳", hintKey: "emblem.hourglass.hint", unlockedBy: (s) => s.prestigeLevel >= 3 },
];

export const TOWN_EMBLEMS_BY_ID: Record<string, TownEmblemDef> = Object.fromEntries(
  TOWN_EMBLEMS.map((e) => [e.id, e])
);

export function isEmblemUnlocked(id: string, state: EconomyState): boolean {
  const def = TOWN_EMBLEMS_BY_ID[id];
  return def ? def.unlockedBy(state) : false;
}

// A small accent-color palette for the emblem badge — always available (no
// unlock gate), purely a personalization touch on top of the emblem itself.
export const EMBLEM_COLORS: string[] = [
  "#e8c777", // gold (default, matches the app's accent)
  "#c94b4b", // red
  "#3fae5c", // green
  "#3a7ecc", // blue
  "#c58ee0", // purple
  "#e0a13f", // amber
  "#f0776a", // coral
  "#6fb8f2", // sky
];
