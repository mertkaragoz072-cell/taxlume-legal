import { EventBus } from '../core/events';
import { clamp, round1 } from '../core/math';
import type { ExerciseId } from '../core/types';
import { EXERCISES, type ExerciseDef } from '../data/exercises';
import type { SimConfig } from '../simulation/config';
import { DEFAULT_CONFIG } from '../simulation/config';
import { advanceTime } from '../simulation/needs';
import type { GameState, LiftRecord } from '../simulation/state';
import { trainBlockReason } from './access';
import { addXp } from './progression';

export type RepOutcome = 'success' | 'failed' | 'exhausted';

export interface WorkoutSession {
  exercise: ExerciseId;
  /** 'ready' before the first set, 'rest' between sets. (A set in progress is runtime-only.) */
  phase: 'ready' | 'rest';
  weight: number;
  targetReps: number;
  /** Reps completed in the set in progress. */
  setReps: number;
  setActive: boolean;
  completedSets: number;
  totalReps: number;
  xpEarned: number;
  energySpent: number;
  seconds: number;
  strengthBefore: number;
  enduranceBefore: number;
  levelBefore: number;
}

export type StartResult = { ok: true; session: WorkoutSession } | { ok: false; reason: string };

function def(id: ExerciseId): ExerciseDef {
  const d = EXERCISES[id];
  if (!d) throw new Error(`Exercise not implemented: ${id}`);
  return d;
}

/** Full-performance one-rep max (kg) from the character's strength alone. */
export const baseOneRM = (state: GameState, id: ExerciseId): number => {
  const d = def(id);
  return d.baseOneRM + state.character.strength * d.perStrength;
};

/**
 * Multiplier (≈0.5–1) on lifting capacity from current condition.
 * Energy, recovery debt, hunger, thirst and sleepiness all matter.
 */
export function performance(state: GameState, cfg: SimConfig = DEFAULT_CONFIG): number {
  const c = state.character;
  let p = (0.6 + 0.4 * (c.energy / 100)) * (1 - 0.3 * (state.gym.fatigue / 100));
  if (c.hunger >= cfg.hungerCritical) p *= 0.85;
  else if (c.hunger >= cfg.hungerWarn) p *= 0.94;
  if (c.hydration <= cfg.hydrationCritical) p *= 0.88;
  else if (c.hydration <= cfg.hydrationWarn) p *= 0.95;
  if (c.sleepiness >= cfg.sleepinessWarn) p *= 0.93;
  return p;
}

/** Current one-rep max (kg) including condition. */
export const currentOneRM = (state: GameState, id: ExerciseId): number => baseOneRM(state, id) * performance(state);

/** Epley-based rep capacity: how many reps are possible at `weight` (0 if too heavy). */
export function maxRepsAt(oneRM: number, weight: number): number {
  if (weight > oneRM) return 0;
  return Math.floor(30 * (oneRM / weight - 1)) + 1;
}

/** Fraction of full-performance 1RM the weight represents. */
export const intensityOf = (state: GameState, id: ExerciseId, weight: number): number => weight / baseOneRM(state, id);

export function energyPerRep(state: GameState, id: ExerciseId, weight: number): number {
  const i = clamp(intensityOf(state, id, weight), 0.2, 1.1);
  return def(id).energyPerRep * (0.6 + 0.8 * i);
}

export function startSession(state: GameState, id: ExerciseId, weight: number, targetReps: number): StartResult {
  const d = def(id);
  const blocked = trainBlockReason(state);
  if (blocked) return { ok: false, reason: blocked };
  if (state.character.health < 20) return { ok: false, reason: 'You are too unwell to train. Rest and eat first.' };
  if (state.character.energy < 8) return { ok: false, reason: 'You are too tired to train. Rest first.' };
  if (weight < d.minWeight || weight > d.maxWeight) return { ok: false, reason: 'Invalid weight.' };
  const c = state.character;
  return {
    ok: true,
    session: {
      exercise: id,
      phase: 'ready',
      weight,
      targetReps: clamp(Math.round(targetReps), 1, 30),
      setReps: 0,
      setActive: false,
      completedSets: 0,
      totalReps: 0,
      xpEarned: 0,
      energySpent: 0,
      seconds: 0,
      strengthBefore: c.strength,
      enduranceBefore: c.endurance,
      levelBefore: c.level,
    },
  };
}

/** Decide, without mutating anything, how the next rep will go. */
export function planRep(state: GameState, s: WorkoutSession): RepOutcome {
  const cost = energyPerRep(state, s.exercise, s.weight);
  if (state.character.energy < cost) return 'exhausted';
  const capacity = maxRepsAt(currentOneRM(state, s.exercise), s.weight);
  return s.setReps + 1 <= capacity ? 'success' : 'failed';
}

/** Apply a rep's costs and rewards. Call when the rep finishes (or fails). */
export function commitRep(state: GameState, s: WorkoutSession, outcome: RepOutcome, bus?: EventBus): void {
  const d = def(s.exercise);
  s.setActive = true;
  if (outcome === 'exhausted') {
    bus?.emit('warning', 'Out of energy — no more reps. Rest before training again.');
    return;
  }
  const cost = energyPerRep(state, s.exercise, s.weight);
  const i = clamp(intensityOf(state, s.exercise, s.weight), 0.2, 1.1);
  // A failed rep still costs time and half the effort, but earns nothing.
  const effort = outcome === 'success' ? 1 : 0.5;
  state.character.energy = Math.max(0, state.character.energy - cost * effort);
  s.energySpent += cost * effort;
  advanceTime(state, d.repSeconds, 'active', bus);
  state.gym.totalWorkoutSeconds += d.repSeconds;
  s.seconds += d.repSeconds;
  if (outcome === 'success') {
    s.setReps++;
    s.totalReps++;
    const xp = d.xpPerRep * (0.4 + i);
    s.xpEarned += xp;
    state.gym.totalXpEarned += xp;
    if (addXp(state.character, xp).levelsGained > 0) bus?.emit('levelUp', `Level up! You are now level ${state.character.level}.`);
  } else {
    bus?.emit('warning', 'Failed rep — the weight was too much right now.');
  }
}

function liftRecord(state: GameState, id: ExerciseId): LiftRecord {
  let r = state.gym.lifts[id];
  if (!r) {
    r = { bestWeight: 0, lastWeight: 0, totalReps: 0, totalSets: 0, bestWorkingWeight: 0 };
    state.gym.lifts[id] = r;
  }
  return r;
}

/**
 * Close the set in progress: apply strength/endurance gains scaled by the
 * fraction of the target completed, add recovery debt and update records.
 * Safe to call with zero reps (no effect) — so interrupting is always safe.
 */
export function endSet(state: GameState, s: WorkoutSession, bus?: EventBus): void {
  if (!s.setActive && s.setReps === 0) return;
  const reps = s.setReps;
  s.setActive = false;
  s.setReps = 0;
  if (reps === 0) return;

  const d = def(s.exercise);
  const c = state.character;
  const i = intensityOf(state, s.exercise, s.weight);
  const fraction = Math.min(1, reps / s.targetReps);

  // Light weights give nothing; ~75% of max is the sweet spot; heavier is a bit more.
  const stimulus = clamp((i - 0.3) / 0.45, 0, 1.3);
  const diminishing = Math.max(0.1, 1 - c.strength / 110);
  const fatigue = state.gym.fatigue;
  const recovery = fatigue > 70 ? 0.4 : fatigue > 40 ? 0.75 : 1;
  if (fatigue > 70) bus?.emit('warning', 'You are overtrained — gains are reduced. Rest and eat.');

  c.strength = Math.min(100, c.strength + d.strengthGainPerSet * stimulus * diminishing * recovery * fraction);
  c.endurance = Math.min(100, c.endurance + d.enduranceGainPerSet * (0.5 + stimulus) * recovery * fraction);
  c.fitness = Math.min(100, c.fitness + 0.1 * stimulus * recovery * fraction);
  state.gym.fatigue = Math.min(100, fatigue + d.fatiguePerSet * (0.5 + clamp(i, 0, 1.1)) * fraction);
  if (c.happiness < 85) c.happiness = Math.min(100, c.happiness + 0.6 * fraction);

  const rec = liftRecord(state, s.exercise);
  rec.totalReps += reps;
  rec.totalSets += 1;
  rec.lastWeight = s.weight;
  rec.bestWeight = Math.max(rec.bestWeight, s.weight);
  if (reps >= 5) rec.bestWorkingWeight = Math.max(rec.bestWorkingWeight, s.weight);
  s.completedSets++;
}

/** Rest between sets: game time passes with resting energy recovery. */
export function restBetweenSets(state: GameState, s: WorkoutSession, seconds: number, bus?: EventBus): void {
  endSet(state, s, bus);
  advanceTime(state, seconds, 'resting', bus);
  state.gym.totalWorkoutSeconds += seconds;
  s.seconds += seconds;
}

export interface WorkoutSummary {
  sets: number;
  reps: number;
  xp: number;
  energySpent: number;
  seconds: number;
  strengthGain: number;
  enduranceGain: number;
  levelsGained: number;
}

/** Finish the workout (also used for interruptions). Banks any partial set. */
export function endSession(state: GameState, s: WorkoutSession, bus?: EventBus): WorkoutSummary {
  endSet(state, s, bus);
  const c = state.character;
  return {
    sets: s.completedSets,
    reps: s.totalReps,
    xp: round1(s.xpEarned),
    energySpent: round1(s.energySpent),
    seconds: s.seconds,
    strengthGain: Math.round((c.strength - s.strengthBefore) * 100) / 100,
    enduranceGain: Math.round((c.endurance - s.enduranceBefore) * 100) / 100,
    levelsGained: c.level - s.levelBefore,
  };
}
