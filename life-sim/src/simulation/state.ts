import type { ExerciseId, LocationId } from '../core/types';
import type { Transaction } from '../economy/economy';
import type { WorkoutSession } from '../fitness/workout';

export interface Character {
  name: string;
  level: number;
  xp: number;
  /** 0–100 */
  health: number;
  energy: number;
  /** 0 = full, 100 = starving */
  hunger: number;
  /** 100 = fully hydrated, 0 = dehydrated */
  hydration: number;
  /** 0 = rested, 100 = about to collapse */
  sleepiness: number;
  happiness: number;
  wellbeing: number;
  /** Long-term fitness stats, 0–100 (fractional). */
  strength: number;
  endurance: number;
  fitness: number;
}

export interface LiftRecord {
  bestWeight: number;
  lastWeight: number;
  totalReps: number;
  totalSets: number;
  /** Heaviest weight completed for >= 5 reps. */
  bestWorkingWeight: number;
}

export interface GymState {
  /** Game-seconds until which the membership is valid; 0 = none. */
  membershipUntil: number;
  /** Recovery debt 0–100. High values blunt training gains. */
  fatigue: number;
  lifts: Partial<Record<ExerciseId, LiftRecord>>;
  totalWorkoutSeconds: number;
  totalXpEarned: number;
}

export interface GameState {
  version: number;
  /** Explicit game clock: seconds since Day 1, 00:00. Only simulation calls advance it. */
  time: number;
  location: LocationId;
  character: Character;
  money: number;
  transactions: Transaction[];
  nextTransactionId: number;
  gym: GymState;
  /** The one authoritative active workout (null = not training). Persisted; never held anywhere else. */
  workout: WorkoutSession | null;
  unlockedLocations: LocationId[];
  /** Day counter (1-based) the player last got a bill/warning notice on. Reserved for Milestone 3. */
  flags: Record<string, boolean>;
}

export const SAVE_VERSION = 2;
export const START_MONEY = 500;
/** New games begin at 08:00 on Day 1. */
export const START_TIME = 8 * 3600;

export function createNewGame(): GameState {
  return {
    version: SAVE_VERSION,
    time: START_TIME,
    location: 'gym',
    character: {
      name: 'You',
      level: 1,
      xp: 0,
      health: 100,
      energy: 90,
      hunger: 25,
      hydration: 80,
      sleepiness: 15,
      happiness: 60,
      wellbeing: 60,
      strength: 5,
      endurance: 5,
      fitness: 5,
    },
    money: START_MONEY,
    transactions: [],
    nextTransactionId: 1,
    gym: { membershipUntil: 0, fatigue: 0, lifts: {}, totalWorkoutSeconds: 0, totalXpEarned: 0 },
    workout: null,
    unlockedLocations: ['gym'],
    flags: {},
  };
}
