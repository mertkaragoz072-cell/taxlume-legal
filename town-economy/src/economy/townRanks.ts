export interface TownRankTier {
  /** i18n key resolved via t() — never render directly */
  nameKey: string;
  icon: string;
  /** net worth required to reach this tier */
  threshold: number;
}

// A long, named ladder of net-worth milestones — well past anything the
// rest of the game gates on (the richest achievement, net_20000, is only
// tier 2 here) — plus a permanent, endless tail beyond the last named tier
// so there is always a next rank to chase no matter how long a run goes.
// Reaching a new tier is sticky (see townRankIndex in types.ts): net worth
// can fall back afterwards without losing the rank already earned.
export const TOWN_RANK_TIERS: TownRankTier[] = [
  { nameKey: "townRank.village.name", icon: "🏘️", threshold: 0 },
  { nameKey: "townRank.town.name", icon: "🏡", threshold: 1_000 },
  { nameKey: "townRank.city.name", icon: "🏙️", threshold: 5_000 },
  { nameKey: "townRank.metropolis.name", icon: "🌆", threshold: 15_000 },
  { nameKey: "townRank.tradeHub.name", icon: "🏛️", threshold: 40_000 },
  { nameKey: "townRank.capital.name", icon: "👑", threshold: 100_000 },
  { nameKey: "townRank.kingdom.name", icon: "🏰", threshold: 300_000 },
  { nameKey: "townRank.empire.name", icon: "⚜️", threshold: 1_000_000 },
  { nameKey: "townRank.goldenAge.name", icon: "✨", threshold: 3_000_000 },
  { nameKey: "townRank.legendaryMarket.name", icon: "🌟", threshold: 10_000_000 },
  { nameKey: "townRank.worldPower.name", icon: "🌍", threshold: 30_000_000 },
  { nameKey: "townRank.tradeDynasty.name", icon: "💎", threshold: 100_000_000 },
  { nameKey: "townRank.immortalLegend.name", icon: "🔱", threshold: 300_000_000 },
];

// Beyond the last named tier, thresholds keep multiplying forever so the
// ladder never actually ends — the ratio matches the ~3x steps already
// used between the tiers above.
const BEYOND_GROWTH_FACTOR = 3;

/** Net worth required to reach a given rank index (0-based); defined for every index, forever. */
export function townRankThreshold(index: number): number {
  const lastIndex = TOWN_RANK_TIERS.length - 1;
  if (index <= lastIndex) return TOWN_RANK_TIERS[Math.max(0, index)].threshold;
  return TOWN_RANK_TIERS[lastIndex].threshold * Math.pow(BEYOND_GROWTH_FACTOR, index - lastIndex);
}

/** Icon for a given rank index — the last named tier's icon repeats for every tier beyond it. */
export function townRankIcon(index: number): string {
  const lastIndex = TOWN_RANK_TIERS.length - 1;
  return TOWN_RANK_TIERS[Math.max(0, Math.min(index, lastIndex))].icon;
}

/** i18n key for a rank's base name — the last named tier's for every tier beyond it too (see townRankBeyondCount). */
export function townRankNameKey(index: number): string {
  const lastIndex = TOWN_RANK_TIERS.length - 1;
  return TOWN_RANK_TIERS[Math.max(0, Math.min(index, lastIndex))].nameKey;
}

/** How many steps past the last named tier this index is (0 = still a named tier, 1 = first "II", ...). */
export function townRankBeyondCount(index: number): number {
  return Math.max(0, index - (TOWN_RANK_TIERS.length - 1));
}

/** Highest rank index a given net worth qualifies for (never negative — tier 0 costs nothing). */
export function townRankIndexForNetWorth(netWorth: number): number {
  let index = 0;
  while (netWorth >= townRankThreshold(index + 1)) index++;
  return index;
}

/** One-time cash reward for newly reaching a rank — a cut of the threshold it took to get there. */
export function townRankReward(index: number): number {
  return townRankThreshold(index) * 0.05;
}

/** Full display title for a rank — the named tier as-is, or "{base} {n}" once past the named list. */
export function townRankTitle(
  index: number,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const beyond = townRankBeyondCount(index);
  return beyond > 0
    ? t("townRank.beyondTitle", { base: t(townRankNameKey(index)), n: beyond + 1 })
    : t(townRankNameKey(index));
}
