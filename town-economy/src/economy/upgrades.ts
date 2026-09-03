import { UpgradeId } from "./types";

export interface UpgradeDef {
  id: UpgradeId;
  nameKey: string;
  icon: string;
  descriptionKey: string;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
  /** meaning depends on the upgrade — see effectLabel */
  effectPerLevel: number;
  /** an i18n key + the number to interpolate into it — see t.ts */
  effectLabel: (level: number) => { key: string; params: Record<string, number> };
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: "market",
    nameKey: "upgrade.market.name",
    icon: "🏪",
    descriptionKey: "upgrade.market.description",
    maxLevel: 5,
    baseCost: 80,
    costGrowth: 1.6,
    effectPerLevel: 0.15,
    effectLabel: (level) => ({ key: "upgrade.market.effect", params: { pct: Math.round(level * 15) } }),
  },
  {
    id: "caravanserai",
    nameKey: "upgrade.caravanserai.name",
    icon: "🏕️",
    descriptionKey: "upgrade.caravanserai.description",
    maxLevel: 5,
    baseCost: 100,
    costGrowth: 1.6,
    effectPerLevel: 0.01,
    effectLabel: (level) => ({ key: "upgrade.caravanserai.effect", params: { pct: level } }),
  },
  {
    id: "townhall",
    nameKey: "upgrade.townhall.name",
    icon: "🏛️",
    descriptionKey: "upgrade.townhall.description",
    maxLevel: 5,
    baseCost: 120,
    costGrowth: 1.7,
    effectPerLevel: 0.1,
    effectLabel: (level) => ({ key: "upgrade.townhall.effect", params: { pct: Math.round(level * 10) } }),
  },
  {
    id: "bank",
    nameKey: "upgrade.bank.name",
    icon: "🏦",
    descriptionKey: "upgrade.bank.description",
    maxLevel: 5,
    baseCost: 90,
    costGrowth: 1.6,
    effectPerLevel: 6,
    effectLabel: (level) => ({ key: "upgrade.bank.effect", params: { amount: level * 6 } }),
  },
];

export const UPGRADES_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u])) as Record<
  UpgradeId,
  UpgradeDef
>;

export function upgradeCost(def: UpgradeDef, currentLevel: number): number {
  return Math.round(def.baseCost * Math.pow(def.costGrowth, currentLevel));
}
