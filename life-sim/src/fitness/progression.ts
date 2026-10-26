import { clamp } from '../core/math';
import type { Character } from '../simulation/state';

/** XP needed to advance from `level` to `level + 1`. */
export const xpForNextLevel = (level: number): number => Math.round(60 * Math.pow(level, 1.5));

export interface LevelUpResult {
  levelsGained: number;
}

/** Adds XP, applying any level-ups. Returns how many levels were gained. */
export function addXp(c: Character, amount: number): LevelUpResult {
  c.xp += amount;
  let gained = 0;
  while (c.xp >= xpForNextLevel(c.level)) {
    c.xp -= xpForNextLevel(c.level);
    c.level++;
    gained++;
  }
  return { levelsGained: gained };
}

export const PHYSIQUE_STAGES = [
  { name: 'Slim', minStrength: 0 },
  { name: 'Toned', minStrength: 15 },
  { name: 'Athletic', minStrength: 35 },
  { name: 'Muscular', minStrength: 60 },
  { name: 'Powerhouse', minStrength: 85 },
] as const;

export function physiqueStage(strength: number): number {
  let s = 0;
  PHYSIQUE_STAGES.forEach((p, i) => {
    if (strength >= p.minStrength) s = i;
  });
  return s;
}

/** Continuous 0–1 muscle amount the character rig uses to scale limb thickness. */
export const muscleAmount = (strength: number, endurance: number): number =>
  clamp((strength * 0.85 + endurance * 0.15) / 100, 0, 1);
