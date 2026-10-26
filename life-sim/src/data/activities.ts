import type { Effects, HomeRoom } from '../core/types';

export type ActivityId = 'drink_water' | 'shower' | 'watch_tv' | 'study';

export interface ActivityDef {
  id: ActivityId;
  name: string;
  icon: string;
  room: HomeRoom;
  /** Interactable object the action belongs to (see data/homeObjects.ts). */
  object: string;
  minutes: number;
  /** How the body behaves while doing it (energy regain vs drain). */
  mode: 'active' | 'resting';
  effects: Effects;
  /** Repeating within `windowHours` shrinks the mood/skill gains (never below `floor`). */
  diminishing?: { windowHours: number; floor: number };
  /** Minimum energy needed. */
  minEnergy?: number;
  blurb: string;
}

export const ACTIVITIES: Record<ActivityId, ActivityDef> = {
  drink_water: { id: 'drink_water', name: 'Drink water', icon: '💧', room: 'kitchen', object: 'sink', minutes: 2, mode: 'active', effects: { hydration: 25 }, blurb: 'Free tap water. Restores up to 25 hydration.' },
  shower: { id: 'shower', name: 'Take a shower', icon: '🚿', room: 'bathroom', object: 'shower', minutes: 12, mode: 'active', effects: { happiness: 3, wellbeing: 2, fatigue: -3, energy: 2 }, diminishing: { windowHours: 8, floor: 0.2 }, blurb: 'Refreshes you: mood, well-being and a little recovery.' },
  watch_tv: { id: 'watch_tv', name: 'Watch TV', icon: '📺', room: 'living', object: 'tv', minutes: 45, mode: 'resting', effects: { happiness: 5, wellbeing: 2, energy: 3 }, diminishing: { windowHours: 6, floor: 0.25 }, blurb: 'Relax on the sofa. Gains fade if you binge.' },
  study: { id: 'study', name: 'Study at the computer', icon: '💻', room: 'study', object: 'computer', minutes: 60, mode: 'active', effects: { energy: -7, happiness: -1, xp: 5, skillOffice: 3 }, diminishing: { windowHours: 10, floor: 0.3 }, minEnergy: 20, blurb: 'Builds office skills for better jobs. Costs energy.' },
};
