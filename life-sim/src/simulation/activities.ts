import type { EventBus } from '../core/events';
import { clamp100 } from '../core/math';
import type { Effects, HomeRoom } from '../core/types';
import { ACTIVITIES, type ActivityDef, type ActivityId } from '../data/activities';
import { ITEMS } from '../data/items';
import { recipeById } from '../data/recipes';
import { addXp } from '../fitness/progression';
import { removeItems, countOf } from '../inventory/inventory';
import type { SimConfig } from './config';
import { DEFAULT_CONFIG } from './config';
import { advanceTime, type Activity } from './needs';
import type { GameState } from './state';
import { HOUR, readClock } from './time';

export type ActionResult = { ok: true; minutes: number; summary: string } | { ok: false; reason: string };

const fail = (reason: string): ActionResult => ({ ok: false, reason });

/** Returns a reason string if the character is not in the right place, else null. */
export function wrongPlace(state: GameState, room: HomeRoom): string | null {
  if (state.location !== 'home') return 'You need to be at home for that.';
  if (state.room !== room) return `You need to be in the ${room === 'living' ? 'living room' : room}.`;
  return null;
}

/** 1 for the first time; shrinks with each recent repeat inside the window; never below `floor`. */
export function repeatFactor(state: GameState, id: string, windowHours: number, floor: number): number {
  const since = state.time - windowHours * HOUR;
  const n = state.activityLog.filter((a) => a.id === id && a.time > since).length;
  return Math.max(floor, 1 / (1 + n * 0.6));
}

function logActivity(state: GameState, id: string): void {
  state.activityLog.push({ id, time: state.time });
  const cutoff = state.time - 48 * HOUR;
  state.activityLog = state.activityLog.filter((a) => a.time > cutoff).slice(-100);
}

/** Apply stat effects. `scale` shrinks only the "feel-good" gains (mood, well-being, skill, xp). */
export function applyEffects(state: GameState, fx: Effects, scale = 1, bus?: EventBus): void {
  const c = state.character;
  if (fx.hunger) c.hunger = clamp100(c.hunger + fx.hunger);
  if (fx.hydration) c.hydration = clamp100(c.hydration + fx.hydration);
  if (fx.energy) c.energy = clamp100(c.energy + fx.energy);
  if (fx.health) c.health = clamp100(c.health + fx.health);
  if (fx.sleepiness) c.sleepiness = clamp100(c.sleepiness + fx.sleepiness);
  if (fx.fatigue) state.gym.fatigue = clamp100(state.gym.fatigue + fx.fatigue);
  if (fx.happiness) c.happiness = clamp100(c.happiness + fx.happiness * (fx.happiness > 0 ? scale : 1));
  if (fx.wellbeing) c.wellbeing = clamp100(c.wellbeing + fx.wellbeing * (fx.wellbeing > 0 ? scale : 1));
  if (fx.skillOffice) state.skills.office = Math.min(100, state.skills.office + fx.skillOffice * scale);
  if (fx.xp && addXp(c, fx.xp * scale).levelsGained > 0) bus?.emit('levelUp', `Level up! You are now level ${c.level}.`);
}

const delta = (a: number, b: number): string => (Math.round(b - a) >= 0 ? `+${Math.round(b - a)}` : `${Math.round(b - a)}`);

/** Fixed home activities (shower, TV, study, drink water). */
export function performActivity(state: GameState, id: ActivityId, bus?: EventBus, cfg: SimConfig = DEFAULT_CONFIG): ActionResult {
  const def: ActivityDef = ACTIVITIES[id];
  const place = wrongPlace(state, def.room);
  if (place) return fail(place);
  const c = state.character;
  if (def.minEnergy && c.energy < def.minEnergy) return fail('You are too tired for that. Rest or sleep first.');
  if (id === 'drink_water' && c.hydration >= 95) return fail('You are not thirsty.');
  const factor = def.diminishing ? repeatFactor(state, id, def.diminishing.windowHours, def.diminishing.floor) : 1;
  const before = { ...c };
  advanceTime(state, def.minutes * 60, def.mode as Activity, bus, cfg);
  applyEffects(state, def.effects, factor, bus);
  logActivity(state, id);
  const parts = [`${def.name}: ${def.minutes} min`];
  if (def.effects.hydration) parts.push(`hydration ${delta(before.hydration, c.hydration)}`);
  if (def.effects.happiness) parts.push(`mood ${delta(before.happiness, c.happiness)}`);
  if (def.effects.energy) parts.push(`energy ${delta(before.energy, c.energy)}`);
  if (factor < 0.99) parts.push('(diminishing returns)');
  return { ok: true, minutes: def.minutes, summary: parts.join(' · ') };
}

// ---------------- Sleep ----------------

export type SleepPlace = 'bed' | 'sofa';

/** Quality multiplier 0–1.2. Night, a full stomach, water and a proper bed all help. */
export function sleepQuality(state: GameState, place: SleepPlace, cfg: SimConfig = DEFAULT_CONFIG): number {
  const c = state.character;
  const hour = readClock(state.time).hour;
  let q = place === 'bed' ? 1 : 0.6;
  if (hour >= 9 && hour < 19) q *= 0.8; // daytime sleep is lighter
  if (c.hunger >= cfg.hungerWarn) q *= 0.8;
  if (c.hydration <= cfg.hydrationWarn) q *= 0.85;
  return Math.round(q * 100) / 100;
}

export const MAX_SLEEP_HOURS = { bed: 12, sofa: 3 } as const;

export function sleep(state: GameState, hours: number, place: SleepPlace, bus?: EventBus, cfg: SimConfig = DEFAULT_CONFIG): ActionResult {
  const spot = place === 'bed' ? wrongPlace(state, 'bedroom') : wrongPlace(state, 'living');
  if (spot) return fail(spot);
  if (!Number.isFinite(hours) || hours < 1 || hours > MAX_SLEEP_HOURS[place]) return fail(`You can ${place === 'bed' ? 'sleep 1–12 hours in bed' : 'nap 1–3 hours on the sofa'}.`);
  const c = state.character;
  if (c.sleepiness < 10 && c.energy > 95) return fail('You are not tired enough to sleep.');
  const q = sleepQuality(state, place, cfg);
  const before = { ...c };
  advanceTime(state, hours * HOUR, 'sleeping', bus, cfg, q);
  // Waking up well rested lifts mood and well-being; poor sleep does the opposite.
  c.happiness = clamp100(c.happiness + (q >= 0.7 ? Math.min(8, 0.7 * hours * q) : -2));
  c.wellbeing = clamp100(c.wellbeing + (q >= 0.7 ? Math.min(10, 0.9 * hours * q) : -3));
  state.sleep = { lastQuality: q, lastWakeTime: state.time };
  logActivity(state, place === 'bed' ? 'sleep' : 'nap');
  if (c.hunger >= cfg.hungerWarn) bus?.emit('warning', 'You woke up hungry.');
  return { ok: true, minutes: hours * 60, summary: `Slept ${hours} h (quality ${Math.round(q * 100)}%) · energy ${delta(before.energy, c.energy)} · rested ${delta(100 - before.sleepiness, 100 - c.sleepiness)}` };
}

// ---------------- Food ----------------

/** Eat or drink an item from the pantry (at the dining table). */
export function eat(state: GameState, itemId: string, bus?: EventBus, cfg: SimConfig = DEFAULT_CONFIG): ActionResult {
  const place = wrongPlace(state, 'kitchen');
  if (place) return fail(place);
  const item = ITEMS[itemId];
  if (!item || !item.effects) return fail('That cannot be eaten as it is. Cook it.');
  if (countOf(state, itemId) < 1) return fail(`You have no ${item.name.toLowerCase()}.`);
  const c = state.character;
  if (item.kind !== 'drink' && item.effects.hunger && c.hunger < 8) return fail('You are not hungry.');
  if (item.kind === 'drink' && item.effects.hydration && c.hydration >= 95) return fail('You are not thirsty.');
  const before = { ...c };
  removeItems(state, { [itemId]: 1 }); // consume first: no food, no effect
  advanceTime(state, (item.minutes ?? 5) * 60, 'active', bus, cfg);
  applyEffects(state, item.effects, 1, bus);
  logActivity(state, `eat:${itemId}`);
  return { ok: true, minutes: item.minutes ?? 5, summary: `Ate ${item.name.toLowerCase()} · hunger ${delta(before.hunger, c.hunger)} · hydration ${delta(before.hydration, c.hydration)}` };
}

/** Cook a recipe from owned ingredients and eat it. */
export function cook(state: GameState, recipeId: string, bus?: EventBus, cfg: SimConfig = DEFAULT_CONFIG): ActionResult {
  const place = wrongPlace(state, 'kitchen');
  if (place) return fail(place);
  const r = recipeById(recipeId);
  if (!r) return fail('Unknown recipe.');
  const c = state.character;
  if (c.energy < 10) return fail('You are too tired to cook.');
  if (c.hunger < 10) return fail('You are not hungry enough for a meal.');
  if (!removeItems(state, r.ingredients)) {
    const missing = Object.entries(r.ingredients).filter(([id, n]) => countOf(state, id) < n).map(([id]) => ITEMS[id]?.name ?? id);
    return fail(`Missing ingredients: ${missing.join(', ')}.`);
  }
  const before = { ...c };
  advanceTime(state, r.minutes * 60, 'active', bus, cfg);
  applyEffects(state, r.effects, 1, bus);
  logActivity(state, `cook:${r.id}`);
  return { ok: true, minutes: r.minutes, summary: `Cooked ${r.name} (${r.quality}) · hunger ${delta(before.hunger, c.hunger)} · energy ${delta(before.energy, c.energy)}` };
}
