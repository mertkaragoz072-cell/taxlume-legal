import { GOODS } from "./goods";
import { GoodId } from "./types";

/** how much happiness giving the good away is worth vs. refusing it */
export const VILLAGER_REQUEST_GIVE_HAPPINESS = 12;
export const VILLAGER_REQUEST_REFUSE_HAPPINESS = 8;

/** picks a random good and a quantity sized to feel askable, not trivial or
 * ruinous — roughly a tenth of that good's equilibrium stock. */
export function rollVillagerRequest(): { goodId: GoodId; qty: number } {
  const good = GOODS[Math.floor(Math.random() * GOODS.length)];
  const qty = Math.max(3, Math.round((good.baseSupply * (0.06 + Math.random() * 0.06)) / 5) * 5);
  return { goodId: good.id, qty };
}
