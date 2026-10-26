import type { EventBus } from '../core/events';
import type { HomeRoom } from '../core/types';
import { ACTIVITIES, type ActivityId } from '../data/activities';
import { ITEMS } from '../data/items';
import { RECIPES } from '../data/recipes';
import { countOf } from '../inventory/inventory';
import { cook, eat, MAX_SLEEP_HOURS, performActivity, sleep, sleepQuality, type ActionResult } from './activities';
import type { GameState } from './state';

/** Every home action goes through `executeAction`: one place to validate, commit and (for the UI) dry-run. */
export type ActionSpec =
  | { kind: 'sleep'; hours: number }
  | { kind: 'nap'; hours: number }
  | { kind: 'activity'; id: ActivityId }
  | { kind: 'eat'; item: string }
  | { kind: 'cook'; recipe: string };

export function executeAction(state: GameState, spec: ActionSpec, bus?: EventBus): ActionResult {
  switch (spec.kind) {
    case 'sleep':
      return sleep(state, spec.hours, 'bed', bus);
    case 'nap':
      return sleep(state, spec.hours, 'sofa', bus);
    case 'activity':
      return performActivity(state, spec.id, bus);
    case 'eat':
      return eat(state, spec.item, bus);
    case 'cook':
      return cook(state, spec.recipe, bus);
  }
}

/** Would this action succeed right now? Runs on a copy, so it never changes the real state. */
export function dryRun(state: GameState, spec: ActionSpec): ActionResult {
  return executeAction(structuredClone(state), spec);
}

export interface ActionOption {
  id: string;
  label: string;
  icon: string;
  detail: string;
  spec: ActionSpec;
  /** Minutes of game time the action takes (for display). */
  minutes: number;
  enabled: boolean;
  reason?: string;
}

const fx = (parts: Array<[string, number | undefined]>): string =>
  parts
    .filter(([, v]) => v)
    .map(([k, v]) => `${k} ${v! > 0 ? '+' : ''}${v}`)
    .join(' · ');

/** The actions offered by an interactable object, with live availability from the rules. */
export function optionsFor(state: GameState, room: HomeRoom, objectId: string): ActionOption[] {
  const out: Array<Omit<ActionOption, 'enabled' | 'reason'>> = [];
  const act = (id: ActivityId, detail?: string) => {
    const a = ACTIVITIES[id];
    out.push({ id, label: a.name, icon: a.icon, minutes: a.minutes, spec: { kind: 'activity', id }, detail: detail ?? `${a.minutes} min · ${fx([['hydration', a.effects.hydration], ['mood', a.effects.happiness], ['energy', a.effects.energy], ['skill', a.effects.skillOffice]])}` });
  };
  if (room === 'bedroom' && objectId === 'bed') {
    const q = Math.round(sleepQuality(state, 'bed') * 100);
    for (const h of [2, 6, 8, 10]) out.push({ id: `sleep${h}`, label: h <= 2 ? `Nap ${h} h` : `Sleep ${h} h`, icon: '🛏️', minutes: h * 60, spec: { kind: 'sleep', hours: h }, detail: `${h} h · quality ${q}%` });
  } else if (room === 'living' && objectId === 'tv') {
    act('watch_tv');
    const q = Math.round(sleepQuality(state, 'sofa') * 100);
    for (const h of [1, MAX_SLEEP_HOURS.sofa]) out.push({ id: `nap${h}`, label: `Nap on sofa ${h} h`, icon: '😴', minutes: h * 60, spec: { kind: 'nap', hours: h }, detail: `${h} h · quality ${q}%` });
  } else if (room === 'study' && objectId === 'computer') act('study');
  else if (room === 'bathroom' && objectId === 'shower') act('shower');
  else if (room === 'kitchen' && objectId === 'sink') act('drink_water');
  else if (room === 'kitchen' && objectId === 'stove') {
    for (const r of RECIPES) {
      const have = Object.entries(r.ingredients).map(([id, n]) => `${ITEMS[id]?.icon ?? ''}${countOf(state, id)}/${n}`).join(' ');
      out.push({ id: r.id, label: r.name, icon: r.icon, minutes: r.minutes, spec: { kind: 'cook', recipe: r.id }, detail: `${r.minutes} min · ${have} · ${r.quality}` });
    }
  } else if (room === 'kitchen' && objectId === 'table') {
    for (const item of Object.values(ITEMS)) {
      if (!item.effects || countOf(state, item.id) < 1) continue;
      out.push({ id: item.id, label: `${item.name} ×${countOf(state, item.id)}`, icon: item.icon, minutes: item.minutes ?? 5, spec: { kind: 'eat', item: item.id }, detail: `${item.minutes ?? 5} min · ${fx([['hunger', item.effects.hunger], ['hydration', item.effects.hydration], ['health', item.effects.health]])}` });
    }
  }
  return out.map((o) => {
    const r = dryRun(state, o.spec);
    return r.ok ? { ...o, enabled: true } : { ...o, enabled: false, reason: r.reason };
  });
}
