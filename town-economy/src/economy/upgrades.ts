import { UpgradeId } from "./types";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  icon: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
  /** meaning depends on the upgrade — see effectLabel */
  effectPerLevel: number;
  effectLabel: (level: number) => string;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: "market",
    name: "Pazar Yeri",
    icon: "🏪",
    description: "Alım satımların fiyatlar üzerindeki ani etkisini yumuşatır.",
    maxLevel: 5,
    baseCost: 80,
    costGrowth: 1.6,
    effectPerLevel: 0.15,
    effectLabel: (level) => `Piyasa etkisi -%${Math.round(level * 15)}`,
  },
  {
    id: "caravanserai",
    name: "Kervansaray",
    icon: "🏕️",
    description: "Komşu kasabalarla ticarette gümrük vergisini düşürür.",
    maxLevel: 5,
    baseCost: 100,
    costGrowth: 1.6,
    effectPerLevel: 0.01,
    effectLabel: (level) => `Gümrük vergisi -%${level}`,
  },
  {
    id: "townhall",
    name: "Belediye Binası",
    icon: "🏛️",
    description: "İyi yönetim, ekonomik krizlerin şiddetini azaltır.",
    maxLevel: 5,
    baseCost: 120,
    costGrowth: 1.7,
    effectPerLevel: 0.1,
    effectLabel: (level) => `Kriz şiddeti -%${Math.round(level * 10)}`,
  },
  {
    id: "bank",
    name: "Banka",
    icon: "🏦",
    description: "Günlük giriş bonusunu artırır.",
    maxLevel: 5,
    baseCost: 90,
    costGrowth: 1.6,
    effectPerLevel: 6,
    effectLabel: (level) => `Günlük bonus +${level * 6} 🪙`,
  },
];

export const UPGRADES_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u])) as Record<
  UpgradeId,
  UpgradeDef
>;

export function upgradeCost(def: UpgradeDef, currentLevel: number): number {
  return Math.round(def.baseCost * Math.pow(def.costGrowth, currentLevel));
}
