import { UpgradeId } from "./types";

export type UpgradeTier = 1 | 2 | 3;

// Commissioned art for the 7 purchasable upgrades (see upgrades.ts), one
// illustration per visual tier rather than per exact level — see
// upgradeTierForLevel below for the level→tier mapping. Filled in
// incrementally as art arrives; an upgrade/tier with no entry here falls
// back to its plain emoji (see UpgradeIcon), same pattern as GOOD_IMAGES
// in goodImages.ts for goods not yet illustrated.
export const UPGRADE_IMAGES: Partial<Record<UpgradeId, Partial<Record<UpgradeTier, number>>>> = {
  market: {
    1: require("../../assets/upgrades/market-1.png"),
    2: require("../../assets/upgrades/market-2.png"),
  },
};

/** Level 0 has no art (nothing built yet — the emoji fallback covers it).
 * Levels 1-2 are the small/basic structure, 3-4 the mid-size one, and 5
 * (every upgrade's maxLevel) the fully built-out one. */
export function upgradeTierForLevel(level: number): UpgradeTier {
  if (level >= 5) return 3;
  if (level >= 3) return 2;
  return 1;
}
