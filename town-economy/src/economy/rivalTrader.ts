import { GOODS } from "./goods";
import { EconomyState, GoodId } from "./types";

/** how far above the current market price the rival's offer pays per unit —
 * the whole appeal of accepting is a guaranteed price above what the open
 * market would give you for the same bulk sale */
const RIVAL_OFFER_PREMIUM_MIN = 0.15;
const RIVAL_OFFER_PREMIUM_MAX = 0.35;

/** picks a random good, a bulk quantity sized like a real wholesale order,
 * and a per-unit price at a premium over that good's current market price. */
export function rollRivalTraderOffer(state: EconomyState): {
  goodId: GoodId;
  qty: number;
  pricePerUnit: number;
} {
  const good = GOODS[Math.floor(Math.random() * GOODS.length)];
  const qty = Math.max(5, Math.round((good.baseSupply * (0.08 + Math.random() * 0.08)) / 5) * 5);
  const premium =
    RIVAL_OFFER_PREMIUM_MIN + Math.random() * (RIVAL_OFFER_PREMIUM_MAX - RIVAL_OFFER_PREMIUM_MIN);
  const pricePerUnit = state.goods[good.id].price * (1 + premium);
  return { goodId: good.id, qty, pricePerUnit };
}
