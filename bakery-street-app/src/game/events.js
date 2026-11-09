// Weekly feature: one product is "the star of the week" (Monday to Sunday, device local time). Guests order it more often and it pays a little extra.
// Nothing is stored: the product follows from the calendar week and the products the player has unlocked, so it can never be lost or doubled.
import { dateKey, dayNumber } from './daily.js';

/** Whole-week number of a timestamp (weeks start on Monday; 1970-01-01 was a Thursday, hence the +3). */
export const weekOf = (ms) => Math.floor((dayNumber(dateKey(ms)) + 3) / 7);

/** The star product of the week: rotates through the unlocked products, one per week; null when none is unlocked. */
export function weeklyProduct(game, ms = game.clock()) {
  const ids = Object.keys(game.productsDef).filter((id) => game.isUnlocked(id));
  return ids.length ? ids[((weekOf(ms) % ids.length) + ids.length) % ids.length] : null;
}
