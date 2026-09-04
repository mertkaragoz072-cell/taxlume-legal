import { GoodId } from "./types";

export type PropertyEffectKind =
  | "productionAll"
  | "productionFood"
  | "passiveIncome"
  | "loanDiscount"
  | "caravanTariffDiscount"
  | "happiness";

/** which goods count as "food" for the farm's productionFood bonus */
export const PROPERTY_FOOD_GOODS: GoodId[] = ["bread", "milk", "wine", "fish"];

export interface PropertyDef {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  /** one-time cash cost — each property can only be bought once */
  cost: number;
  effectKind: PropertyEffectKind;
  effectValue: number;
  /** an i18n key + the number to interpolate into it — see t.ts */
  effectLabel: () => { key: string; params: Record<string, number> };
}

export const PROPERTIES: PropertyDef[] = [
  {
    id: "landPlot",
    nameKey: "property.landPlot.name",
    descriptionKey: "property.landPlot.description",
    icon: "🏞️",
    cost: 350,
    effectKind: "productionAll",
    effectValue: 0.03,
    effectLabel: () => ({ key: "property.landPlot.effect", params: { pct: 3 } }),
  },
  {
    id: "house",
    nameKey: "property.house.name",
    descriptionKey: "property.house.description",
    icon: "🏠",
    cost: 900,
    effectKind: "passiveIncome",
    effectValue: 0.5,
    effectLabel: () => ({ key: "property.house.effect", params: { amount: 0.5 } }),
  },
  {
    id: "warehouse",
    nameKey: "property.warehouse.name",
    descriptionKey: "property.warehouse.description",
    icon: "🏬",
    cost: 1800,
    effectKind: "loanDiscount",
    effectValue: 0.01,
    effectLabel: () => ({ key: "property.warehouse.effect", params: { pct: 1 } }),
  },
  {
    id: "farm",
    nameKey: "property.farm.name",
    descriptionKey: "property.farm.description",
    icon: "🚜",
    cost: 3200,
    effectKind: "productionFood",
    effectValue: 0.12,
    effectLabel: () => ({ key: "property.farm.effect", params: { pct: 12 } }),
  },
  {
    id: "inn",
    nameKey: "property.inn.name",
    descriptionKey: "property.inn.description",
    icon: "🏨",
    cost: 5000,
    effectKind: "caravanTariffDiscount",
    effectValue: 0.05,
    effectLabel: () => ({ key: "property.inn.effect", params: { pct: 5 } }),
  },
  {
    id: "mansion",
    nameKey: "property.mansion.name",
    descriptionKey: "property.mansion.description",
    icon: "🏰",
    cost: 9000,
    effectKind: "happiness",
    effectValue: 12,
    effectLabel: () => ({ key: "property.mansion.effect", params: { amount: 12 } }),
  },
];

export const PROPERTIES_BY_ID = Object.fromEntries(PROPERTIES.map((p) => [p.id, p])) as Record<
  string,
  PropertyDef
>;

function ownedEffectSum(owned: string[], kind: PropertyEffectKind): number {
  return PROPERTIES.filter((p) => p.effectKind === kind && owned.includes(p.id)).reduce(
    (sum, p) => sum + p.effectValue,
    0
  );
}

/** combined production multiplier from every owned property for one good —
 * 1 = no bonus yet, 1.15 = +15%, etc. Mirrors researchMultiplier's shape. */
export function propertyProductionMultiplier(owned: string[], goodId: GoodId): number {
  let mult = 1 + ownedEffectSum(owned, "productionAll");
  if (PROPERTY_FOOD_GOODS.includes(goodId)) mult += ownedEffectSum(owned, "productionFood");
  return mult;
}

export function propertyPassiveIncomePerTick(owned: string[]): number {
  return ownedEffectSum(owned, "passiveIncome");
}

export function propertyLoanRateDiscountPerDay(owned: string[]): number {
  return ownedEffectSum(owned, "loanDiscount");
}

export function propertyCaravanTariffDiscount(owned: string[]): number {
  return ownedEffectSum(owned, "caravanTariffDiscount");
}

export function propertyHappinessBonus(owned: string[]): number {
  return ownedEffectSum(owned, "happiness");
}
