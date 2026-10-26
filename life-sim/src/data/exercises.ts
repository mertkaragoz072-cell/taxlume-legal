import type { ExerciseId } from '../core/types';

/**
 * Data-driven exercise definition. Everything the workout system and the
 * animation layer need is configured here, so adding an exercise is a data
 * change plus (for new motions) an animation module.
 */
export interface ExerciseDef {
  id: ExerciseId;
  name: string;
  /** Which animation module plays this exercise. */
  animation: 'bench';
  /** One-rep max (kg) = baseOneRM + strength * perStrength at full performance. */
  baseOneRM: number;
  perStrength: number;
  /** Selectable load range in kg and increment (barbell + plates). */
  minWeight: number;
  maxWeight: number;
  step: number;
  /** Game-seconds one rep takes. */
  repSeconds: number;
  /** Base energy per rep at 100% intensity. */
  energyPerRep: number;
  /** Base XP per rep at 100% intensity. */
  xpPerRep: number;
  /** Strength gain (stat points) for a full target-rep set at ~75% intensity. */
  strengthGainPerSet: number;
  enduranceGainPerSet: number;
  /** Recovery debt added per full set at 100% intensity. */
  fatiguePerSet: number;
  /** Default seconds of rest between sets. */
  restSeconds: number;
}

export const EXERCISES: Partial<Record<ExerciseId, ExerciseDef>> = {
  bench: {
    id: 'bench',
    name: 'Bench Press',
    animation: 'bench',
    baseOneRM: 30,
    perStrength: 1.5,
    minWeight: 20,
    maxWeight: 200,
    step: 2.5,
    repSeconds: 5,
    energyPerRep: 1.6,
    xpPerRep: 1.2,
    strengthGainPerSet: 0.35,
    enduranceGainPerSet: 0.08,
    fatiguePerSet: 5,
    restSeconds: 90,
  },
};

export const IMPLEMENTED_EXERCISES: ExerciseDef[] = Object.values(EXERCISES).filter((e): e is ExerciseDef => !!e);

export const GYM_PRICES = {
  dayPass: 8,
  monthly: 45,
} as const;
