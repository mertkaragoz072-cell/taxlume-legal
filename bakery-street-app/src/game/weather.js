// Weather of the day: decided only by the calendar date (device local), so it is the same all day and needs no saving.
// Rainy days make guests ask for hot drinks more and arrive a little less often (see CAFE.bonuses.weather).
import { dateKey } from './daily.js';

/** 0..1 pseudo-random number that depends only on the text (same date -> same number). */
function hash01(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13;
  return ((h >>> 0) % 10000) / 10000;
}

/** 'rain' or 'clear' for the day of `ms`. */
export const weatherOf = (ms, rainChance) => (hash01(`weather:${dateKey(ms)}`) < rainChance ? 'rain' : 'clear');
