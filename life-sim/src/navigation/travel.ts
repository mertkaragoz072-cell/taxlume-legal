import type { EventBus } from '../core/events';
import type { HomeRoom, LocationId } from '../core/types';
import { locationById } from '../data/locations';
import { advanceTime } from '../simulation/needs';
import type { GameState } from '../simulation/state';
import { readClock } from '../simulation/time';

/** Walking minutes between directly connected places (symmetric). The city hub extends this graph later. */
const EDGES: Array<[LocationId, LocationId, number]> = [['home', 'gym', 12]];

export function travelMinutes(from: LocationId, to: LocationId): number | null {
  const e = EDGES.find(([a, b]) => (a === from && b === to) || (a === to && b === from));
  return e ? e[2] : null;
}

export function isOpen(id: LocationId, seconds: number): boolean {
  const h = locationById(id)?.hours;
  if (!h) return true;
  const hour = readClock(seconds).hour;
  return hour >= h[0] && hour < h[1];
}

export const openingText = (id: LocationId): string => {
  const h = locationById(id)?.hours;
  return h ? `${String(h[0]).padStart(2, '0')}:00–${String(h[1]).padStart(2, '0')}:00` : 'always open';
};

export type TravelResult = { ok: true; minutes: number } | { ok: false; reason: string };

/** Energy spent per minute of walking on top of the normal drain. */
export const WALK_ENERGY_PER_MIN = 0.1;

export function canTravel(state: GameState, to: LocationId): TravelResult {
  if (state.location === to) return { ok: false, reason: 'You are already there.' };
  if (!state.unlockedLocations.includes(to)) return { ok: false, reason: 'That place is not available yet.' };
  const minutes = travelMinutes(state.location, to);
  if (minutes === null) return { ok: false, reason: 'There is no route there yet.' };
  if (state.workout) return { ok: false, reason: 'Finish your workout first.' };
  if (!isOpen(to, state.time + minutes * 60)) return { ok: false, reason: `${locationById(to)?.name ?? 'It'} will be closed when you arrive (open ${openingText(to)}).` };
  if (state.character.energy < minutes * WALK_ENERGY_PER_MIN + 1) return { ok: false, reason: 'You are too tired to walk there.' };
  return { ok: true, minutes };
}

/** Travel consumes game time and a little energy; arrival time must be within opening hours. */
export function travel(state: GameState, to: LocationId, bus?: EventBus): TravelResult {
  const r = canTravel(state, to);
  if (!r.ok) return r;
  advanceTime(state, r.minutes * 60, 'active', bus);
  state.character.energy = Math.max(0, state.character.energy - r.minutes * WALK_ENERGY_PER_MIN);
  state.location = to;
  if (to === 'home') state.room = 'living';
  return r;
}

/** Walking from room to room inside the home takes a minute. */
export function goToRoom(state: GameState, room: HomeRoom, bus?: EventBus): { ok: true } | { ok: false; reason: string } {
  if (state.location !== 'home') return { ok: false, reason: 'You are not at home.' };
  if (state.room === room) return { ok: false, reason: 'You are already in that room.' };
  advanceTime(state, 60, 'active', bus);
  state.room = room;
  return { ok: true };
}
