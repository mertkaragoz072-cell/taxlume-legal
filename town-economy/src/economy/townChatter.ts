import type { EconomyState } from "./types";

/** Random ambient flavor-text for the Town screen's chatter ticker — picks
 * an i18n key path under "townChatter.*" weighted toward whatever
 * conditions currently apply to the town (happiness, inflation, taxes,
 * caravans on the road, an open loan, prestige history, hired workers),
 * always mixed with a pool of generic filler lines. */

const VARIANT_COUNTS: Record<string, number> = {
  "happiness.revolt": 2,
  "happiness.unrest": 2,
  "happiness.coping": 2,
  "happiness.content": 2,
  "happiness.veryContent": 2,
  "mood.crisis": 2,
  "mood.heating": 2,
  "mood.calm": 2,
  "mood.cooling": 2,
  highTax: 2,
  noTax: 1,
  caravanActive: 2,
  loanActive: 2,
  prestige: 2,
  workers: 1,
  general: 3,
};

function happinessTier(happiness: number): string {
  if (happiness < 20) return "revolt";
  if (happiness < 45) return "unrest";
  if (happiness < 70) return "coping";
  if (happiness < 90) return "content";
  return "veryContent";
}

function moodTier(inflationRate: number): string {
  if (inflationRate > 0.01) return "crisis";
  if (inflationRate > 0.005) return "heating";
  if (inflationRate > -0.001) return "calm";
  return "cooling";
}

function poolKeys(base: string): string[] {
  const count = VARIANT_COUNTS[base] ?? 1;
  return Array.from({ length: count }, (_, i) => `townChatter.${base}.v${i}`);
}

export function pickTownChatterKey(state: EconomyState, rng: () => number = Math.random): string {
  const pool: string[] = [];
  pool.push(...poolKeys(`happiness.${happinessTier(state.happiness)}`));
  pool.push(...poolKeys(`mood.${moodTier(state.inflationRate)}`));
  if (state.taxRate >= 0.3) pool.push(...poolKeys("highTax"));
  else if (state.taxRate === 0) pool.push(...poolKeys("noTax"));
  if (state.caravans.length > 0) pool.push(...poolKeys("caravanActive"));
  if (state.loan) pool.push(...poolKeys("loanActive"));
  if (state.prestigeLevel > 0) pool.push(...poolKeys("prestige"));
  if (Object.values(state.workers).some((count: number) => count > 0)) pool.push(...poolKeys("workers"));
  pool.push(...poolKeys("general"));
  return pool[Math.floor(rng() * pool.length)];
}
