import { GoodId } from "./types";

/** A known trader NPC who appears in the market, remembers past trades,
 * and builds a relationship with the player. Traders have a favorite good
 * they prefer to buy, and offer modest price adjustments based on reputation. */
export interface Trader {
  id: string;
  /** i18n key for the trader's name */
  nameKey: string;
  icon: string;
  /** goods this trader loves to buy; they offer a premium if you sell these */
  buyPreferences: GoodId[];
  /** goods this trader loves to sell; they offer a discount if you buy these */
  sellPreferences: GoodId[];
}

/** Relationship state with one trader. Reputation ranges from -100 (hated)
 * to +100 (beloved), starting at 0 (neutral). Price modifiers scale with it. */
export interface TraderReputation {
  traderId: string;
  reputation: number; // -100 to 100
  /** total number of trades completed with this trader; affects unlock status */
  tradeCount: number;
  /** game tick when they were first met; determines familiarity visual state */
  metAtTick: number;
}

/** Known traders in the game. Each remembers their favorite goods and
 * offers modest price incentives for trading what they love. */
export const TRADERS: Trader[] = [
  {
    id: "miriam",
    nameKey: "trader.miriam.name",
    icon: "👩‍🌾",
    buyPreferences: ["grain", "wool", "cheese"],
    sellPreferences: ["bread", "cloth"],
  },
  {
    id: "hassan",
    nameKey: "trader.hassan.name",
    icon: "👨‍⚙️",
    buyPreferences: ["iron", "wood", "leather"],
    sellPreferences: ["glass", "paper"],
  },
  {
    id: "elena",
    nameKey: "trader.elena.name",
    icon: "👩‍🎨",
    buyPreferences: ["silk", "spice", "honey"],
    sellPreferences: ["jewelry", "wine"],
  },
  {
    id: "raj",
    nameKey: "trader.raj.name",
    icon: "👨‍💼",
    buyPreferences: ["milk", "fish"],
    sellPreferences: ["sand", "honey"],
  },
];

export const TRADERS_BY_ID: Record<string, Trader> = Object.fromEntries(
  TRADERS.map((t) => [t.id, t])
);

const TRADER_IDS: ReadonlySet<string> = new Set(TRADERS.map((t) => t.id));

/** How much reputation a trader gains or loses per unit traded.
 * Buying what they love: +1 per unit. Selling to them: +2 per unit (they need it more).
 * Doing the opposite: -0.5 per unit. Default neutral trades: no change. */
export const REPUTATION_PER_UNIT = {
  buyingTheyLove: 1,
  sellingTheyLove: 2,
  buyingTheyHate: -0.5,
  neutral: 0,
};

/** At 50+ reputation, traders offer a 3% discount/premium. At 100, it's 6%.
 * Below -50, a 3% penalty. At -100, a 6% penalty. Linear interpolation. */
export const REPUTATION_TO_PRICE_MODIFIER = (reputation: number): number => {
  if (reputation >= 50) return (reputation / 100) * 0.06;
  if (reputation > 0) return 0;
  if (reputation <= -50) return -((Math.abs(reputation) / 100) * 0.06);
  return 0;
};

/** Reputation needed to unlock trader as a "known" acquaintance; below this they are strangers */
export const TRADER_KNOWN_THRESHOLD = 10;

export function isKnownTrader(reputation: number): boolean {
  return reputation >= TRADER_KNOWN_THRESHOLD;
}

export function isTraderIdValid(value: string): boolean {
  return TRADER_IDS.has(value);
}

export function getTraderReputation(
  reputation: number,
  good: GoodId,
  trader: Trader
): "buysIt" | "sellsIt" | "neutral" {
  if (trader.buyPreferences.includes(good)) return "buysIt";
  if (trader.sellPreferences.includes(good)) return "sellsIt";
  return "neutral";
}

/** Calculate reputation change for a trade with a trader.
 * - Selling what they want to buy: +2 per unit (great for them)
 * - Buying what they want to sell: +1 per unit (good for them)
 * - Other direction: -0.5 per unit (bad for them)
 * - Neutral good: 0 change (no opinion) */
export function reputationDelta(
  good: GoodId,
  side: "buy" | "sell",
  qty: number,
  trader: Trader
): number {
  if (trader.buyPreferences.includes(good)) {
    return side === "sell" ? REPUTATION_PER_UNIT.sellingTheyLove * qty : REPUTATION_PER_UNIT.buyingTheyHate * qty;
  }
  if (trader.sellPreferences.includes(good)) {
    return side === "buy" ? REPUTATION_PER_UNIT.buyingTheyLove * qty : REPUTATION_PER_UNIT.buyingTheyHate * qty;
  }
  return REPUTATION_PER_UNIT.neutral * qty;
}
