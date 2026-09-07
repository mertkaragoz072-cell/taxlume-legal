import { DifficultyConfig } from "./difficulty";

export interface NgPlusModifierDef {
  id: string;
  icon: string;
  labelKey: string;
  descriptionKey: string;
  /** flat bonus skill points paid out at the next prestige — prestige points
   * are a scarce, whole-number resource (PRESTIGE_POINTS_PER_PRESTIGE = 1),
   * so a flat add reads as a real reward where a percentage would round away */
  bonusPrestigePoints: number;
  apply: (config: DifficultyConfig) => DifficultyConfig;
}

export const NG_PLUS_MODIFIERS: NgPlusModifierDef[] = [
  {
    id: "harsherInflation",
    icon: "📈",
    labelKey: "ngPlus.harsherInflation.label",
    descriptionKey: "ngPlus.harsherInflation.description",
    bonusPrestigePoints: 1,
    apply: (c) => ({ ...c, baseInflationDrift: c.baseInflationDrift * 1.5, inflationMax: c.inflationMax * 1.2 }),
  },
  {
    id: "frequentEvents",
    icon: "🌪️",
    labelKey: "ngPlus.frequentEvents.label",
    descriptionKey: "ngPlus.frequentEvents.description",
    bonusPrestigePoints: 1,
    apply: (c) => ({ ...c, eventChance: c.eventChance * 1.5, eventSeverity: c.eventSeverity * 1.2 }),
  },
  {
    id: "leanStart",
    icon: "💸",
    labelKey: "ngPlus.leanStart.label",
    descriptionKey: "ngPlus.leanStart.description",
    bonusPrestigePoints: 1,
    apply: (c) => ({ ...c, startingCash: Math.round(c.startingCash * 0.5) }),
  },
  {
    id: "tightMargin",
    icon: "⚠️",
    labelKey: "ngPlus.tightMargin.label",
    descriptionKey: "ngPlus.tightMargin.description",
    // The most punishing modifier — it shrinks the hyperinflation buffer
    // outright rather than just tuning odds/severity — so it pays double.
    bonusPrestigePoints: 2,
    apply: (c) => ({ ...c, hyperinflationIndex: Math.round(c.hyperinflationIndex * 0.8) }),
  },
];

export const NG_PLUS_MODIFIERS_BY_ID = Object.fromEntries(
  NG_PLUS_MODIFIERS.map((m) => [m.id, m])
) as Record<string, NgPlusModifierDef>;

/** Folds every active modifier's apply() onto the base difficulty config —
 * order doesn't matter today since no two modifiers touch the same field. */
export function effectiveDifficultyConfig(base: DifficultyConfig, activeModifierIds: string[]): DifficultyConfig {
  return activeModifierIds.reduce((cfg, id) => {
    const mod = NG_PLUS_MODIFIERS_BY_ID[id];
    return mod ? mod.apply(cfg) : cfg;
  }, base);
}

export function ngPlusBonusPrestigePoints(activeModifierIds: string[]): number {
  return activeModifierIds.reduce((sum, id) => sum + (NG_PLUS_MODIFIERS_BY_ID[id]?.bonusPrestigePoints ?? 0), 0);
}
