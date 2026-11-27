import { PROPERTIES } from "./properties";
import { EconomyState } from "./types";
import { UPGRADES } from "./upgrades";

/** The town plan: a grid of plots on which the player places what the town has
 * built. Placing is the player's own arrangement; every placed building also adds a
 * little beauty (happiness), so a planned town is worth a bit more than a heap. */
export const PLOT_BASE = 6;
export const PLOT_MAX = 12;
/** happiness points each placed building adds, and the most the plan can add */
export const PLACED_HAPPINESS = 0.5;
export const PLACED_HAPPINESS_MAX = 4;

/** How many plots the town has: six to begin with, one more for every rank. */
export function plotCount(townRankIndex: number): number {
  return Math.min(PLOT_MAX, PLOT_BASE + Math.max(0, townRankIndex));
}

export type Layout = (string | null)[];

export function layoutOf(state: EconomyState): Layout {
  const out: Layout = Array.from({ length: PLOT_MAX }, () => null);
  (state.townLayout ?? []).forEach((id, i) => {
    if (i < PLOT_MAX) out[i] = id ?? null;
  });
  return out;
}

/** Ids of everything the town has built: each upgrade bought at least once, each
 * property owned. */
export function builtBuildings(state: EconomyState): string[] {
  const ids: string[] = [];
  for (const u of UPGRADES) if ((state.upgrades[u.id] ?? 0) > 0) ids.push(u.id);
  for (const p of PROPERTIES) if (state.ownedProperties.includes(p.id)) ids.push(p.id);
  return ids;
}

/** Built but not on the plan. */
export function unplacedBuildings(state: EconomyState): string[] {
  const placed = new Set(layoutOf(state));
  return builtBuildings(state).filter((id) => !placed.has(id));
}

/** Put `id` on `plot` (moving it if it stands elsewhere), or empty the plot when
 * `id` is null. Whatever stood on the plot goes back to the unplaced list. Plots the
 * town does not have yet, and buildings it has not built, are refused. */
export function placeBuilding(state: EconomyState, plot: number, id: string | null): EconomyState {
  if (plot < 0 || plot >= plotCount(state.townRankIndex)) return state;
  if (id !== null && !builtBuildings(state).includes(id)) return state;
  const layout = layoutOf(state);
  if (id !== null) {
    const from = layout.indexOf(id);
    if (from >= 0) layout[from] = null;
  }
  layout[plot] = id;
  return { ...state, townLayout: layout };
}

/** Fills the empty plots with the unplaced buildings, in order. */
export function autoLayout(state: EconomyState): EconomyState {
  const layout = layoutOf(state);
  const open = plotCount(state.townRankIndex);
  const waiting = unplacedBuildings(state);
  for (let i = 0; i < open && waiting.length > 0; i++) {
    if (layout[i] === null) layout[i] = waiting.shift() as string;
  }
  return { ...state, townLayout: layout };
}

/** Beauty from the plan: counts only what is still built and on an open plot. */
export function layoutHappinessBonus(state: EconomyState): number {
  const open = plotCount(state.townRankIndex);
  const built = new Set(builtBuildings(state));
  const placed = layoutOf(state).filter((id, i) => id !== null && i < open && built.has(id)).length;
  return Math.min(PLACED_HAPPINESS_MAX, placed * PLACED_HAPPINESS);
}
