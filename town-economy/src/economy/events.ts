import { GoodId } from "./types";

export interface EventTemplate {
  messageKey: string;
  tone: "good" | "bad" | "neutral";
  inflationDelta: number; // one-off nudge to the town-wide inflation rate
  good?: GoodId; // optional: also shocks one good's local supply
  /** fractional change applied to that good's supply, e.g. -0.3 = a 30% shortage */
  supplyShockPct?: number;
}

// inflationDelta values are one-off news that nudges the rate and fades via
// reversion, not a structural bias on their own — but the bad-tone entries
// were deliberately weighted up so the player has real inflation risk to
// watch for (see the TownScreen breakdown), not just cosmetic news. The list
// no longer sums to ~0 on purpose. "Merkez hazine para bastı" stays the
// single largest shock (money-printing is the canonical worst case).
export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    messageKey: "event.taxHike",
    tone: "bad",
    inflationDelta: 0.005,
  },
  {
    messageKey: "event.drought",
    tone: "bad",
    inflationDelta: 0.001,
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
    inflationDelta: 0.0035,
  },
  {
    messageKey: "event.moneyPrinting",
    tone: "bad",
    inflationDelta: 0.006,
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
