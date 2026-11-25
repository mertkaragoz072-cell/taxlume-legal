import { TICKS_PER_GAME_DAY } from "./constants";
import { GOODS, GOODS_BY_ID } from "./goods";
import { EconomyState, GoodId } from "./types";
import { WORKER_WAGE_PER_TICK } from "./workers";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Rules that tie the town to how real economies behave: money that is created
 * pushes prices up, wages follow prices, heavy taxes shrink what can be taxed,
 * and food does not keep. Each one is small on its own and bounded, so none of
 * them can run away; together they make a hoard, a payroll or a tax rate cost
 * what it should. */

// ---------------------------------------------------------------- money supply

/** How many days of the town's output the treasury can hold before the extra
 * money starts chasing goods. Below it money is scarce and prices ease. */
export const MONEY_NEUTRAL_DAYS = 1.5;
/** Extra inflation (per tick) for every day of output held above neutral. */
export const MONEY_INFLATION_PER_DAY = 0.0004;
export const MONEY_PRESSURE_MIN = -0.0002;
export const MONEY_PRESSURE_MAX = 0.002;

/** The town's output at today's prices, per game day. */
export function outputValuePerDay(state: EconomyState): number {
  let perTick = 0;
  for (const g of GOODS) {
    if (g.unlockRank !== undefined && state.townRankIndex < g.unlockRank) continue;
    perTick += g.baseProduction * state.goods[g.id].price;
  }
  return Math.max(1, perTick * TICKS_PER_GAME_DAY);
}

/** Per-tick push on the inflation target from the amount of money in the
 * treasury, measured against what the town produces. A loan's proceeds count
 * too, since they are cash like any other. Spending the money (upgrades, wages,
 * goods) takes it out of the pressure again. */
export function moneySupplyPressure(state: EconomyState): number {
  const days = state.cash / outputValuePerDay(state);
  return clamp((days - MONEY_NEUTRAL_DAYS) * MONEY_INFLATION_PER_DAY, MONEY_PRESSURE_MIN, MONEY_PRESSURE_MAX);
}

// ----------------------------------------------------------------------- wages

/** A wage that was fixed in coins would shrink to nothing as prices rise; this
 * indexes it to the town price index (never below half, so a deflating town
 * does not get free labour). */
export function wageMultiplier(inflationIndex: number): number {
  return Math.max(0.5, inflationIndex / 100);
}
export function workerWagePerTick(inflationIndex: number): number {
  return WORKER_WAGE_PER_TICK * wageMultiplier(inflationIndex);
}

// ------------------------------------------------------------------------ tax

/** Above this rate people and businesses start to hide and cut back activity. */
export const TAX_COMFORT_RATE = 0.2;
export const TAX_AVOIDANCE_SLOPE = 1.5;
export const TAX_AVOIDANCE_MAX = 0.45;

/** The share of the taxable base that is still declared at this rate: all of it
 * up to 20%, then less and less (the top of the curve is the point of the
 * Laffer curve: past it a higher rate collects less). */
export function taxBaseFactor(rate: number): number {
  return 1 - clamp((rate - TAX_COMFORT_RATE) * TAX_AVOIDANCE_SLOPE, 0, TAX_AVOIDANCE_MAX);
}

// -------------------------------------------------------------------- spoilage

/** Food loses a little of its stock every tick (about 4% a game day). */
export const SPOILAGE_PER_TICK = 0.001;

export function isPerishable(id: GoodId): boolean {
  return GOODS_BY_ID[id].perishable === true;
}

/** The stock left after one tick of spoilage. Whole units only: the fractional
 * part of the loss is settled by a roll, so on average exactly the right
 * amount spoils even from small stocks. */
export function afterSpoilage(id: GoodId, holding: number, roll: number): number {
  if (!isPerishable(id) || holding <= 0) return holding;
  const loss = holding * SPOILAGE_PER_TICK;
  const whole = Math.floor(loss);
  const extra = roll < loss - whole ? 1 : 0;
  return Math.max(0, holding - whole - extra);
}
