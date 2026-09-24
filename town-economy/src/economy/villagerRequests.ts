import { GOODS } from "./goods";
import { isGoodUnlocked } from "./formulas";
import { EconomyState, GoodId } from "./types";

/** how much happiness giving the good away is worth vs. refusing it */
export const VILLAGER_REQUEST_GIVE_HAPPINESS = 12;
export const VILLAGER_REQUEST_REFUSE_HAPPINESS = 8;

/** Picks a random good and a quantity sized to feel askable, not trivial or
 * ruinous — roughly a tenth of that good's equilibrium stock.
 *
 * Only from goods the town has actually unlocked. A villager asking for
 * Glassware on day two, when the glassworks does not open until day ten,
 * is a request nobody could fill however well the town is doing. */
export function rollVillagerRequest(state: EconomyState): { goodId: GoodId; qty: number } {
  const available = GOODS.filter((g) => isGoodUnlocked(g, state));
  const pool = available.length > 0 ? available : GOODS;
  const good = pool[Math.floor(Math.random() * pool.length)];
  const qty = Math.max(3, Math.round((good.baseSupply * (0.06 + Math.random() * 0.06)) / 5) * 5);
  return { goodId: good.id, qty };
}
