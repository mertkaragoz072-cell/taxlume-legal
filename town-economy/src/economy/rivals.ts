import { GoodId } from "./types";

/** A rival trader who competes for goods on your home market.
 * Unlike trading houses (which work foreign markets), rivals buy and sell
 * on your own market, creating competition and price volatility. */
export interface RivalTrader {
  id: string;
  /** i18n key for the rival's name */
  nameKey: string;
  icon: string;
  /** how hard this rival leans on your market each tick, as a fraction of the
   * good's own baseProduction — so a strong rival moves a slow market further */
  pressure: number;
}

/** What one rival is doing on your home market right now. */
export interface RivalTraderActivity {
  rivalId: string;
  goodId: GoodId;
  /** buying drains your stock and lifts your price; selling does the reverse */
  side: "buying" | "selling";
  /** tick at which the rival moves on to a different good */
  untilTick: number;
}

/** Long enough that a rival's move affects prices for a day or two — the
 * window for the player to react and exploit the spike or flood. */
export const RIVAL_SPELL_DAYS = 1.5;

export function rollRivalActivity(
  rivalId: string,
  startTick: number,
  ticksPerDay: number,
  goodIds: GoodId[]
): RivalTraderActivity {
  return {
    rivalId,
    goodId: goodIds[Math.floor(Math.random() * goodIds.length)],
    side: Math.random() < 0.5 ? "buying" : "selling",
    untilTick: startTick + RIVAL_SPELL_DAYS * ticksPerDay,
  };
}

export function rivalSupplyDelta(
  activities: RivalTraderActivity[],
  goodId: GoodId,
  baseProduction: number,
  rivalPressure: Record<string, RivalTrader>
): number {
  let delta = 0;
  for (const a of activities) {
    if (a.goodId !== goodId) continue;
    const rival = rivalPressure[a.rivalId];
    if (!rival) continue;
    delta += (a.side === "buying" ? -1 : 1) * baseProduction * rival.pressure;
  }
  return delta;
}

/** Rival traders who compete on your home market. Each has a pressure strength
 * that determines how much they move your prices. Weaker rivals might have
 * high pressure (aggressive small players), while strong established ones
 * might have lower pressure (they don't need to push hard). */
export const RIVAL_TRADERS: RivalTrader[] = [
  { id: "eagleEye", nameKey: "rival.eagleEye.name", icon: "🦅", pressure: 0.45 },
  { id: "silverTongue", nameKey: "rival.silverTongue.name", icon: "🗣️", pressure: 0.6 },
  { id: "hardNose", nameKey: "rival.hardNose.name", icon: "👃", pressure: 0.35 },
];

export const RIVAL_TRADERS_BY_ID: Record<string, RivalTrader> = Object.fromEntries(
  RIVAL_TRADERS.map((r) => [r.id, r])
);

const RIVAL_IDS: ReadonlySet<string> = new Set(RIVAL_TRADERS.map((r) => r.id));

export function isRivalId(value: string): boolean {
  return RIVAL_IDS.has(value);
}
