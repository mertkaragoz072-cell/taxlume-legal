/** Pure functions over economy state: pricing maths, derived totals and the
 * rates the UI quotes.
 *
 * Nothing in here produces a new EconomyState — these only read one and return
 * a number or a boolean, so both the reducer and the screens can call them and
 * never disagree about a figure. */

import { ASSETS } from "./assets";
import { GOODS } from "./goods";
import { propertyCaravanTariffDiscount, propertyLoanRateDiscountPerDay } from "./properties";
import {
  perkCaravanTariffDiscount,
  perkLoanRateDiscountPerDay,
  perkUnlockThresholdMult,
} from "./prestigePerks";
import { ForeignTown } from "./towns";
import { doctrineModifiers } from "./doctrines";
import { UPGRADES_BY_ID } from "./upgrades";
import { EconomyState, Good, GoodId } from "./types";
import {
  HOT_STREAK_BONUS_PER_TRADE,
  HOT_STREAK_MAX_BONUS,
  LOAN_BANK_DISCOUNT_PER_LEVEL_PER_DAY,
  LOAN_BASE_INTEREST_RATE_PER_DAY,
  LOAN_INFLATION_SENSITIVITY,
  LOAN_MAX_INFLATION_DAY_CONTRIB,
  LOAN_MAX_INTEREST_RATE_PER_DAY,
  LOAN_MAX_NET_WORTH_PCT,
  LOAN_MIN_CAP,
  LOAN_MIN_INTEREST_RATE_PER_DAY,
  LOAN_TERM_RATE_PER_MONTH_PER_DAY,
  MARKET_SPREAD,
  METROPOL_UNLOCK_NET_WORTH,
  SCARCITY_MAX,
  SCARCITY_MIN,
  STORAGE_BASE_CAPACITY,
  SUPPLY_MAX_FACTOR,
  SUPPLY_MIN_FACTOR,
  TAX_OUTPUT_FACTOR,
  TICKS_PER_GAME_DAY,
  TRADE_UNLOCK_NET_WORTH,
} from "./constants";

export function gameDayFromTick(tick: number): number {
  return Math.floor(tick / TICKS_PER_GAME_DAY) + 1;
}
/** A good with no unlockDay is available from the start; one with an
 * unlockDay only becomes tradeable once the town has been running that
 * many in-game days — it still simulates quietly in the background before
 * that, so it isn't starting from scratch once revealed. */
export function isGoodUnlocked(good: Good, state: EconomyState): boolean {
  return !good.unlockDay || gameDayFromTick(state.tick) >= good.unlockDay;
}
/** Given a just-realized pnl, returns the next streak count and the bonus
 * cash (on top of pnl) that streak earns — shared by trade() and
 * tradeAsset() so goods and assets build one unified trading streak. */
export function nextTradeStreak(currentStreak: number, pnl: number): { streak: number; bonus: number } {
  if (pnl < 0) return { streak: 0, bonus: 0 };
  const streak = currentStreak + 1;
  const bonusPct = clamp((streak - 1) * HOT_STREAK_BONUS_PER_TRADE, 0, HOT_STREAK_MAX_BONUS);
  return { streak, bonus: pnl * bonusPct };
}
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
export function scarcityFactor(supply: number, baseSupply: number, elasticity: number): number {
  const ratio = baseSupply / Math.max(supply, 1);
  return clamp(Math.pow(ratio, elasticity), SCARCITY_MIN, SCARCITY_MAX);
}
export function priceFromSupply(
  localBasePrice: number,
  baseSupply: number,
  elasticity: number,
  supply: number,
  inflationIndex: number
): number {
  return localBasePrice * (inflationIndex / 100) * scarcityFactor(supply, baseSupply, elasticity);
}
// A deeper Pazar Yeri means the same order moves the market (and pays the
// spread) proportionally less — real market depth, not an arbitrary damper.
export function marketDepthFactor(state: EconomyState): number {
  return 1 + state.upgrades.market * UPGRADES_BY_ID.market.effectPerLevel;
}
export function marketSpread(state: EconomyState): number {
  return MARKET_SPREAD / marketDepthFactor(state);
}
export function supplyBounds(good: Good): { min: number; max: number } {
  return { min: good.baseSupply * SUPPLY_MIN_FACTOR, max: good.baseSupply * SUPPLY_MAX_FACTOR };
}
export function estimateTaxIncomePerTick(state: EconomyState): number {
  const taxableOutput = GOODS.reduce((sum, g) => sum + g.baseProduction * state.goods[g.id].price, 0);
  return state.taxRate * taxableOutput * TAX_OUTPUT_FACTOR * (state.happiness / 100);
}
export function pushCapped(arr: number[], value: number, cap: number): number[] {
  const next = [...arr, value];
  if (next.length > cap) next.shift();
  return next;
}
/** the real tariff a caravan pays right now: the town's base rate, cut by
 * the Kervansaray upgrade, any owned property, and any prestige perk —
 * shared by the reducer and the trade screen's previews so they never drift. */
export function effectiveTariffRate(state: EconomyState, town: ForeignTown): number {
  const base = Math.max(
    0,
    town.tariffRate -
      state.upgrades.caravanserai * UPGRADES_BY_ID.caravanserai.effectPerLevel -
      propertyCaravanTariffDiscount(state.ownedProperties) -
      perkCaravanTariffDiscount(state.prestigePerks)
  );
  // The doctrine scales whatever the discounts left, so a merchant town's
  // advantage compounds with its upgrades instead of replacing them.
  return base * doctrineModifiers(state.doctrine).tariffMult;
}
export function computeNetWorth(state: EconomyState): number {
  return (
    state.cash +
    GOODS.reduce((sum, g) => sum + state.goods[g.id].holding * state.goods[g.id].price, 0) +
    ASSETS.reduce((sum, a) => sum + state.assets[a.id].holding * state.assets[a.id].price, 0) -
    (state.loan ? state.loan.remainingBalance : 0)
  );
}
export function totalGoodsHolding(state: EconomyState): number {
  return GOODS.reduce((sum, g) => sum + state.goods[g.id].holding, 0);
}
export function storageCapacity(state: EconomyState): number {
  return STORAGE_BASE_CAPACITY + state.upgrades.storageYard * UPGRADES_BY_ID.storageYard.effectPerLevel;
}
export function loanCap(state: EconomyState): number {
  return Math.max(LOAN_MIN_CAP, Math.round(computeNetWorth(state) * LOAN_MAX_NET_WORTH_PCT));
}
/** The per-DAY rate a loan of the given term would carry if signed right
 * now: the base rate, discounted by the Banka upgrade level, plus a
 * premium for how hot inflation is currently running (compounded out to
 * what it implies over a full in-game day) and for how long the term
 * locks the bank in — mirrors how a real lender prices both inflation and
 * duration risk. This is the number worth showing the player. */
export function loanInterestRatePerDay(state: EconomyState, termMonths: number): number {
  const dailyInflation = clamp(Math.pow(1 + state.inflationRate, TICKS_PER_GAME_DAY) - 1, -0.5, 0.5);
  const inflationContribution = clamp(
    dailyInflation * LOAN_INFLATION_SENSITIVITY,
    -LOAN_MAX_INFLATION_DAY_CONTRIB,
    LOAN_MAX_INFLATION_DAY_CONTRIB
  );
  const termContribution = termMonths * LOAN_TERM_RATE_PER_MONTH_PER_DAY;
  const doctrineRate = doctrineModifiers(state.doctrine).loanRateMult;
  return (
    doctrineRate *
    clamp(
      LOAN_BASE_INTEREST_RATE_PER_DAY +
        inflationContribution +
        termContribution -
        state.upgrades.bank * LOAN_BANK_DISCOUNT_PER_LEVEL_PER_DAY -
        propertyLoanRateDiscountPerDay(state.ownedProperties) -
        perkLoanRateDiscountPerDay(state.prestigePerks),
      LOAN_MIN_INTEREST_RATE_PER_DAY,
      LOAN_MAX_INTEREST_RATE_PER_DAY
    )
  );
}
/** loanInterestRatePerDay converted to the equivalent per-tick rate — this
 * is what's actually locked onto the Loan and compounded every tick, so
 * the balance still drifts up smoothly instead of jumping once a day. */
export function loanInterestRatePerTick(state: EconomyState, termMonths: number): number {
  return loanDayRateToTickRate(loanInterestRatePerDay(state, termMonths));
}
export function loanDayRateToTickRate(dayRate: number): number {
  return Math.pow(1 + dayRate, 1 / TICKS_PER_GAME_DAY) - 1;
}
/** Inverse of loanDayRateToTickRate — recovers the "%/day" figure worth
 * displaying for a loan's already-locked-in per-tick rate. */
export function loanTickRateToDayRate(tickRate: number): number {
  return Math.pow(1 + tickRate, TICKS_PER_GAME_DAY) - 1;
}
/** TRADE_UNLOCK_NET_WORTH discounted by the earlyExplorer prestige perk. */
export function effectiveTradeUnlockNetWorth(state: EconomyState): number {
  return TRADE_UNLOCK_NET_WORTH * perkUnlockThresholdMult(state.prestigePerks);
}
/** METROPOL_UNLOCK_NET_WORTH discounted by the earlyExplorer prestige perk. */
export function effectiveMetropolUnlockNetWorth(state: EconomyState): number {
  return METROPOL_UNLOCK_NET_WORTH * perkUnlockThresholdMult(state.prestigePerks);
}

/** What a research node costs this town right now — the node's list price
 * scaled by the doctrine. Shared by the research action and the screen that
 * quotes the price, so the two can never disagree. */
export function researchCost(state: EconomyState, node: { cost: number }): number {
  return Math.round(node.cost * doctrineModifiers(state.doctrine).researchCostMult);
}

/** How much of its normal output a good can manage, given what it is made
 * from.
 *
 * Six goods are now downstream of another: bread of grain, cloth of wool,
 * cheese of milk, paper and glass of wood, jewellery of iron. When an input
 * runs short its output follows, which is the whole point — a drought hits
 * grain on the day, and bread two days later, and a player who saw the
 * first coming can be holding bread before the second arrives. Fifteen
 * independent random walks become a market with a shape to read.
 *
 * It throttles rather than consumes. Consumption is the more realistic
 * model and also the one that can run away: a chain that eats its input
 * faster than the input is produced collapses permanently and the good
 * never comes back, which is a bug report, not a mechanic. Scarcity slows
 * the workshop; it does not close it — hence the floor. The ceiling is
 * small on purpose, so a glut of wool is a modest tailwind for cloth and
 * not a way to print it.
 */
export const INPUT_FACTOR_MIN = 0.3;
export const INPUT_FACTOR_MAX = 1.1;

export function productionInputFactor(
  good: Good,
  supplyOf: (id: GoodId) => number,
  baseSupplyOf: (id: GoodId) => number
): number {
  if (!good.inputs || good.inputs.length === 0) return 1;
  let factor = INPUT_FACTOR_MAX;
  for (const input of good.inputs) {
    const base = baseSupplyOf(input);
    const ratio = base > 0 ? supplyOf(input) / base : 1;
    factor = Math.min(factor, clamp(ratio, INPUT_FACTOR_MIN, INPUT_FACTOR_MAX));
  }
  return factor;
}
