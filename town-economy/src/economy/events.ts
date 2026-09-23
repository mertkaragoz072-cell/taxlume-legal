import { GoodId } from "./types";

export interface EventTemplate {
  messageKey: string;
  tone: "good" | "bad" | "neutral";
  inflationDelta: number; // one-off nudge to the town-wide inflation rate
  good?: GoodId; // optional: also shocks one good's local supply
  /** fractional change applied to that good's supply, e.g. -0.3 = a 30% shortage */
  supplyShockPct?: number;
}

// inflationDelta values are deliberately small and roughly balanced
// (the list sums to ~0) — they're meant to read as one-off news that
// nudges the rate and fades via reversion, not as a structural bias
// that would drag a long, passive session toward hyperinflation on its
// own. "Merkez hazine para bastı" is intentionally the single largest
// shock (money-printing is the canonical worst case), everything else
// is modest by comparison.
export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    messageKey: "event.taxHike",
    tone: "bad",
    inflationDelta: 0.003,
  },
  {
    messageKey: "event.drought",
    tone: "bad",
    inflationDelta: 0.0005,
    good: "bread",
    supplyShockPct: -0.32,
  },
  {
    messageKey: "event.goodHarvest",
    tone: "good",
    inflationDelta: -0.0005,
    good: "milk",
    supplyShockPct: 0.3,
  },
  {
    messageKey: "event.forestFire",
    tone: "bad",
    inflationDelta: 0,
    good: "wood",
    supplyShockPct: -0.3,
  },
  {
    messageKey: "event.newOreVein",
    tone: "good",
    inflationDelta: 0,
    good: "iron",
    supplyShockPct: 0.32,
  },
  {
    messageKey: "event.tradeDeal",
    tone: "good",
    inflationDelta: -0.0025,
  },
  {
    messageKey: "event.festival",
    tone: "bad",
    inflationDelta: 0.002,
  },
  {
    messageKey: "event.moneyPrinting",
    tone: "bad",
    inflationDelta: 0.004,
  },
  {
    messageKey: "event.austerity",
    tone: "good",
    inflationDelta: -0.0035,
  },
  {
    messageKey: "event.weaversStrike",
    tone: "bad",
    inflationDelta: 0,
    good: "cloth",
    supplyShockPct: -0.28,
  },
];
