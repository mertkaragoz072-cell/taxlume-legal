import { GOODS_BY_ID } from "./goods";
import { Good, GoodId } from "./types";

/** A stretch of in-game days where the town's appetite is uneven: a couple of
 * goods are in demand and one is glutted.
 *
 * Before this, a good's price came from its own supply plus one global
 * inflation index, which reads as noise — there is no pattern to trade
 * against, so buying low is luck rather than a read. A cycle gives the market
 * a rhythm: demand is announced a cycle ahead (see EconomyState.nextDemandCycle),
 * so stockpiling ahead of a spike, or clearing stock before a glut, becomes a
 * plan the player can actually make. */
export interface DemandCycle {
  /** tick the cycle takes effect */
  startTick: number;
  /** tick it gives way to the forecast one */
  endTick: number;
  /** goods villagers want more of: dearer, and consumed faster */
  hotGoodIds: GoodId[];
  /** the good the town is swimming in: cheaper, and piling up */
  gluttedGoodId: GoodId;
}

/** Long enough that a cycle is worth planning around rather than reacting to,
 * short enough that a session usually spans more than one. */
export const DEMAND_CYCLE_DAYS = 3;
export const DEMAND_HOT_COUNT = 2;

/** Price multipliers are deliberately mild, because the supply pressure below
 * moves price a second time through the usual scarcity curve — the two
 * together are what make a spike worth trading, not either alone. */
export const DEMAND_HOT_PRICE_MULT = 1.22;
export const DEMAND_GLUT_PRICE_MULT = 0.84;

/** Per-tick supply pressure, as a fraction of the good's own baseProduction,
 * so a fast-moving good and a slow one drift at a comparable pace. */
export const DEMAND_HOT_DRAIN_FACTOR = 0.45;
export const DEMAND_GLUT_GAIN_FACTOR = 0.45;

function pickDistinct<T>(pool: T[], count: number): T[] {
  const rest = [...pool];
  const out: T[] = [];
  while (out.length < count && rest.length > 0) {
    out.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
  }
  return out;
}

/** Rolls the cycle that starts at `startTick`, choosing only from goods the
 * player can actually trade today — a forecast for a good that is still locked
 * would be noise rather than a plan. Falls back to a cycle with no glut when
 * there are barely any goods unlocked yet (the opening days). */
export function rollDemandCycle(
  startTick: number,
  ticksPerDay: number,
  eligibleGoodIds: GoodId[]
): DemandCycle {
  const picked = pickDistinct(eligibleGoodIds, DEMAND_HOT_COUNT + 1);
  const hotGoodIds = picked.slice(0, DEMAND_HOT_COUNT);
  const gluttedGoodId = picked[DEMAND_HOT_COUNT] ?? hotGoodIds[0];
  return {
    startTick,
    endTick: startTick + DEMAND_CYCLE_DAYS * ticksPerDay,
    hotGoodIds,
    gluttedGoodId,
  };
}

export function isHot(cycle: DemandCycle | null, goodId: GoodId): boolean {
  return !!cycle && cycle.hotGoodIds.includes(goodId);
}

export function isGlutted(cycle: DemandCycle | null, goodId: GoodId): boolean {
  return !!cycle && cycle.gluttedGoodId === goodId && !cycle.hotGoodIds.includes(goodId);
}

/** What the current cycle does to a good's base price before supply is priced in. */
export function demandPriceMultiplier(cycle: DemandCycle | null, goodId: GoodId): number {
  if (isHot(cycle, goodId)) return DEMAND_HOT_PRICE_MULT;
  if (isGlutted(cycle, goodId)) return DEMAND_GLUT_PRICE_MULT;
  return 1;
}

/** Supply the cycle removes (hot) or adds (glutted) this tick — the half of the
 * effect that makes a spike feel like scarcity rather than a relabelled price. */
export function demandSupplyDelta(cycle: DemandCycle | null, good: Good): number {
  if (isHot(cycle, good.id)) return -good.baseProduction * DEMAND_HOT_DRAIN_FACTOR;
  if (isGlutted(cycle, good.id)) return good.baseProduction * DEMAND_GLUT_GAIN_FACTOR;
  return 0;
}

/** The icons a cycle summary shows, in the order the UI lists them. */
export function cycleGoodIcons(cycle: DemandCycle): { hot: string[]; glut: string } {
  return {
    hot: cycle.hotGoodIds.map((id) => GOODS_BY_ID[id].icon),
    glut: GOODS_BY_ID[cycle.gluttedGoodId].icon,
  };
}

/** The opening pair of cycles, chosen rather than rolled.
 *
 * A first launch used to open on whatever the dice gave it, which most of
 * the time is nothing a new player can read: every good at its base price,
 * a random good in surplus, another random one wanted. Nothing on screen
 * says "do this".
 *
 * So the opening is set up instead. The cheapest starter good is in surplus
 * now and wanted in the very next cycle — and the market screen already
 * prints both halves of that, "in surplus" today and "next" beside it. The
 * first purchase a player makes is therefore the one the game is pointing
 * at, and it pays off within the cycle rather than depending on luck.
 *
 * Cheapest on purpose: with a starting purse, a cheap good buys a quantity
 * large enough that the profit reads as a result rather than a rounding
 * error.
 *
 * Everything after these two cycles is rolled as before — this shapes the
 * first few minutes, not the game.
 */
export function openingDemandCycles(
  ticksPerDay: number,
  eligibleGoodIds: GoodId[]
): { first: DemandCycle; next: DemandCycle } {
  const byPrice = [...eligibleGoodIds].sort((a, b) => GOODS_BY_ID[a].basePrice - GOODS_BY_ID[b].basePrice);
  const star = byPrice[0];
  const others = byPrice.slice(1);

  const cycleTicks = DEMAND_CYCLE_DAYS * ticksPerDay;
  return {
    first: {
      startTick: 0,
      endTick: cycleTicks,
      // Anything but the star, which has to be the cheap one today.
      hotGoodIds: others.slice(-DEMAND_HOT_COUNT),
      gluttedGoodId: star,
    },
    next: {
      startTick: cycleTicks,
      endTick: cycleTicks * 2,
      // The payoff the forecast promised.
      hotGoodIds: [star, ...others.slice(0, DEMAND_HOT_COUNT - 1)],
      gluttedGoodId: others[others.length - 1] ?? star,
    },
  };
}
