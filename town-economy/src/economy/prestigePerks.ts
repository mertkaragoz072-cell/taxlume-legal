export interface PrestigePerkDef {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  /** unspent prestige points required to unlock */
  cost: number;
  /** another perk's id that must already be unlocked first */
  requires?: string;
  /** an i18n key + the number to interpolate into it — see t.ts */
  effectLabel: () => { key: string; params: Record<string, number> };
}

// A small permanent-progression tree spent with points earned from
// prestiging (see PRESTIGE_POINTS_PER_PRESTIGE in useEconomy.ts) — unlike
// prestigeLevel's automatic flat bonus, these are player-chosen and stick
// around across every future prestige and difficulty restart.
export const PRESTIGE_PERKS: PrestigePerkDef[] = [
  {
    id: "headStart",
    nameKey: "prestige.perk.headStart.name",
    descriptionKey: "prestige.perk.headStart.description",
    icon: "🌱",
    cost: 1,
    effectLabel: () => ({ key: "prestige.perk.headStart.effect", params: { amount: 150 } }),
  },
  {
    id: "efficiency",
    nameKey: "prestige.perk.efficiency.name",
    descriptionKey: "prestige.perk.efficiency.description",
    icon: "⚙️",
    cost: 2,
    requires: "headStart",
    effectLabel: () => ({ key: "prestige.perk.efficiency.effect", params: { pct: 6 } }),
  },
  {
    id: "taxRelief",
    nameKey: "prestige.perk.taxRelief.name",
    descriptionKey: "prestige.perk.taxRelief.description",
    icon: "🕊️",
    cost: 2,
    effectLabel: () => ({ key: "prestige.perk.taxRelief.effect", params: { pct: 15 } }),
  },
  {
    id: "bankersFriend",
    nameKey: "prestige.perk.bankersFriend.name",
    descriptionKey: "prestige.perk.bankersFriend.description",
    icon: "🏦",
    cost: 2,
    requires: "headStart",
    effectLabel: () => ({ key: "prestige.perk.bankersFriend.effect", params: { pct: 0.4 } }),
  },
  {
    id: "earlyExplorer",
    nameKey: "prestige.perk.earlyExplorer.name",
    descriptionKey: "prestige.perk.earlyExplorer.description",
    icon: "🧭",
    cost: 3,
    requires: "efficiency",
    effectLabel: () => ({ key: "prestige.perk.earlyExplorer.effect", params: { pct: 20 } }),
  },
  {
    id: "tariffMaster",
    nameKey: "prestige.perk.tariffMaster.name",
    descriptionKey: "prestige.perk.tariffMaster.description",
    icon: "🐪",
    cost: 3,
    requires: "bankersFriend",
    effectLabel: () => ({ key: "prestige.perk.tariffMaster.effect", params: { pct: 3 } }),
  },
];

export const PRESTIGE_PERKS_BY_ID = Object.fromEntries(PRESTIGE_PERKS.map((p) => [p.id, p])) as Record<
  string,
  PrestigePerkDef
>;

function has(perks: string[], id: string): boolean {
  return perks.includes(id);
}

export function perkHeadStartBonus(perks: string[]): number {
  return has(perks, "headStart") ? 150 : 0;
}

export function perkProductionBonus(perks: string[]): number {
  return has(perks, "efficiency") ? 0.06 : 0;
}

export function perkTaxHappinessRelief(perks: string[]): number {
  return has(perks, "taxRelief") ? 0.15 : 0;
}

export function perkLoanRateDiscountPerDay(perks: string[]): number {
  return has(perks, "bankersFriend") ? 0.004 : 0;
}

export function perkUnlockThresholdMult(perks: string[]): number {
  return has(perks, "earlyExplorer") ? 0.8 : 1;
}

export function perkCaravanTariffDiscount(perks: string[]): number {
  return has(perks, "tariffMaster") ? 0.03 : 0;
}
