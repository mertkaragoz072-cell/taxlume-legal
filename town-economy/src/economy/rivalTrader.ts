import { GOODS_BY_ID } from "./goods";
import { isGoodUnlocked } from "./formulas";
import { EconomyState, GoodId } from "./types";

/** how far above the current market price the rival's offer pays per unit —
 * the whole appeal of accepting is a guaranteed price above what the open
 * market would give you for the same bulk sale */
const RIVAL_OFFER_PREMIUM_MIN = 0.15;
const RIVAL_OFFER_PREMIUM_MAX = 0.35;

/** the smallest stock worth a wholesaler's trip */
const RIVAL_OFFER_MIN_QTY = 5;

/** Picks a good the player can actually deliver, a bulk quantity they
 * actually hold, and a per-unit price at a premium over market.
 *
 * It used to pick from every good in the game, including ones still locked.
 * A day-one town would be stopped by a trader wanting 25 Paper — a good
 * that does not unlock until day seven — and handed a modal whose accept
 * button was dead on arrival, reading "you don't have enough Paper". That
 * is not an offer, it's a dialog you have to dismiss, and two of those are
 * enough to make the game feel like it is wasting your time.
 *
 * Now the shortlist is goods that are unlocked *and* in the warehouse in
 * sellable quantity, and the quantity asked never exceeds the holding. So
 * every offer that reaches the player is one they can say yes to — the
 * choice is whether the premium is worth the stock, which is the decision
 * the feature was always meant to pose.
 *
 * Returns null when nothing qualifies, and the caller simply doesn't fire.
 * An empty warehouse means no trader calls, which is also why a brand-new
 * town is left alone until it has something to sell.
 */
export function rollRivalTraderOffer(state: EconomyState): {
  goodId: GoodId;
  qty: number;
  pricePerUnit: number;
} | null {
  const sellable = (Object.keys(state.goods) as GoodId[]).filter((id) => {
    const good = GOODS_BY_ID[id];
    return isGoodUnlocked(good, state) && state.goods[id].holding >= RIVAL_OFFER_MIN_QTY;
  });
  if (sellable.length === 0) return null;

  const goodId = sellable[Math.floor(Math.random() * sellable.length)];
  const good = GOODS_BY_ID[goodId];
  const holding = Math.floor(state.goods[goodId].holding);
  // The wholesale order a trader would want, capped at what is on the shelf.
  const wanted = Math.round((good.baseSupply * (0.08 + Math.random() * 0.08)) / 5) * 5;
  const qty = Math.max(RIVAL_OFFER_MIN_QTY, Math.min(holding, wanted));

  const premium =
    RIVAL_OFFER_PREMIUM_MIN + Math.random() * (RIVAL_OFFER_PREMIUM_MAX - RIVAL_OFFER_PREMIUM_MIN);
  return { goodId, qty, pricePerUnit: state.goods[goodId].price * (1 + premium) };
}
