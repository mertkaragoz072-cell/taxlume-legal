import { GoodId } from "./types";
import { TownId } from "./towns";

/** Rival trading houses working the same foreign markets you do.
 *
 * Before this the foreign towns were a vending machine: their prices drifted
 * back to equilibrium on their own schedule and nothing but the player ever
 * touched them, so a good route stayed good forever and the world outside the
 * town had no opinion about anything.
 *
 * A house corners a market for a couple of days at a time. While one is buying
 * up iron in Ironforge, iron there gets scarce and dear — which is exactly
 * when you want to be selling it to them, and exactly when you do not want to
 * be buying. Their moves are published (see the Trade screen), so this is
 * competition to read and exploit, not invisible dice. */
export interface TradingHouse {
  id: string;
  icon: string;
  nameKey: string;
  /** how hard this house leans on a market each tick, as a fraction of the
   * good's own baseProduction — so a big house moves a slow market further */
  pressure: number;
}

export const TRADING_HOUSES: TradingHouse[] = [
  { id: "goldenScales", icon: "⚖️", nameKey: "tradingHouse.goldenScales.name", pressure: 0.55 },
  { id: "saltRoad", icon: "🧂", nameKey: "tradingHouse.saltRoad.name", pressure: 0.4 },
  { id: "blackSail", icon: "⛵", nameKey: "tradingHouse.blackSail.name", pressure: 0.7 },
];

export const TRADING_HOUSES_BY_ID: Record<string, TradingHouse> = Object.fromEntries(
  TRADING_HOUSES.map((h) => [h.id, h])
);

const TRADING_HOUSE_IDS: ReadonlySet<string> = new Set(TRADING_HOUSES.map((h) => h.id));

/** What one house is doing right now. */
export interface TradingHouseActivity {
  houseId: string;
  townId: TownId;
  goodId: GoodId;
  /** buying drains that town's stock and lifts its price; selling does the
   * reverse. Named from the house's point of view, not the player's. */
  side: "buying" | "selling";
  /** tick at which the house moves on to a different market */
  untilTick: number;
}

/** Long enough that a house's move is worth planning a caravan around — a
 * caravan that arrives after they have moved on was a wasted trip. */
export const TRADING_HOUSE_SPELL_DAYS = 2;

export function rollActivity(
  houseId: string,
  startTick: number,
  ticksPerDay: number,
  townIds: TownId[],
  goodIds: GoodId[]
): TradingHouseActivity {
  return {
    houseId,
    townId: townIds[Math.floor(Math.random() * townIds.length)],
    goodId: goodIds[Math.floor(Math.random() * goodIds.length)],
    side: Math.random() < 0.5 ? "buying" : "selling",
    untilTick: startTick + TRADING_HOUSE_SPELL_DAYS * ticksPerDay,
  };
}

/** The supply a house adds to (or takes out of) one foreign market this tick.
 * Returns 0 for any market the houses are not working. */
export function houseSupplyDelta(
  activities: TradingHouseActivity[],
  townId: TownId,
  goodId: GoodId,
  baseProduction: number
): number {
  let delta = 0;
  for (const a of activities) {
    if (a.townId !== townId || a.goodId !== goodId) continue;
    const house = TRADING_HOUSES_BY_ID[a.houseId];
    if (!house) continue;
    delta += (a.side === "buying" ? -1 : 1) * baseProduction * house.pressure;
  }
  return delta;
}

export function isTradingHouseId(value: string): boolean {
  return TRADING_HOUSE_IDS.has(value);
}
