import { ITEMS } from '../data/items';
import type { GameState } from '../simulation/state';

export const countOf = (state: GameState, id: string): number => state.inventory[id] ?? 0;

export function hasItems(state: GameState, need: Record<string, number>): boolean {
  return Object.entries(need).every(([id, n]) => countOf(state, id) >= n);
}

/** Add items (whole positive counts of known items only). */
export function addItem(state: GameState, id: string, n = 1): boolean {
  if (!(id in ITEMS) || !Number.isInteger(n) || n <= 0) return false;
  state.inventory[id] = countOf(state, id) + n;
  return true;
}

/** Remove items atomically: either every requested item is removed or nothing changes. */
export function removeItems(state: GameState, need: Record<string, number>): boolean {
  if (!hasItems(state, need)) return false;
  for (const [id, n] of Object.entries(need)) {
    const left = countOf(state, id) - n;
    if (left > 0) state.inventory[id] = left;
    else delete state.inventory[id];
  }
  return true;
}
