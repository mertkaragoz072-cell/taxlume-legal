import { EventBus } from '../core/events';
import { clamp100 } from '../core/math';
import type { SimConfig } from './config';
import { DEFAULT_CONFIG } from './config';
import type { GameState } from './state';
import { HOUR } from './time';

export type Activity = 'active' | 'resting' | 'sleeping';

/**
 * Advance the game clock and apply passive need changes. This is the ONLY
 * place the clock moves, which keeps the simulation deterministic: the same
 * state plus the same calls always give the same result.
 *
 * Rules (per game-hour, scaled by elapsed time):
 *  - hunger rises, hydration falls, sleepiness rises, energy slowly drains
 *  - while `resting`, energy is regained instead (unless starving/exhausted)
 *  - critical hunger/thirst drains health; every unmet need erodes happiness
 *  - workout fatigue ("recovery debt") burns off, faster when fed and hydrated
 */
export function advanceTime(
  state: GameState,
  seconds: number,
  activity: Activity = 'active',
  bus?: EventBus,
  cfg: SimConfig = DEFAULT_CONFIG,
  /** Sleep quality multiplier (only used when sleeping). */
  sleepQuality = 1,
): void {
  if (seconds <= 0) return;
  const c = state.character;
  const h = seconds / HOUR;
  const before = { ...c };

  const asleep = activity === 'sleeping';
  const slow = asleep ? cfg.sleepNeedsFactor : 1;
  c.hunger = clamp100(c.hunger + cfg.hungerPerHour * slow * h);
  c.hydration = clamp100(c.hydration - cfg.hydrationLossPerHour * slow * h);
  c.sleepiness = asleep ? clamp100(c.sleepiness - cfg.sleepSleepinessPerHour * sleepQuality * h) : clamp100(c.sleepiness + cfg.sleepinessPerHour * h);

  const wellFed = c.hunger < cfg.hungerWarn && c.hydration > cfg.hydrationWarn;
  if (asleep) {
    c.energy = clamp100(c.energy + cfg.sleepEnergyPerHour * sleepQuality * h);
    if (wellFed) c.health = clamp100(c.health + cfg.sleepHealthPerHour * sleepQuality * h);
  } else if (activity === 'resting') {
    // A hungry, thirsty or sleepy body recovers less.
    const quality = (wellFed ? 1 : 0.5) * (c.sleepiness > cfg.sleepinessWarn ? 0.7 : 1);
    c.energy = clamp100(c.energy + cfg.restEnergyPerHour * quality * h);
  } else {
    c.energy = clamp100(c.energy - cfg.energyDrainPerHour * h);
  }

  const recoveryRate = cfg.fatigueRecoveryPerHour * (wellFed ? 1 : 0.5) * (asleep ? cfg.sleepFatigueFactor : 1);
  state.gym.fatigue = Math.max(0, state.gym.fatigue - recoveryRate * h);

  let unmet = 0;
  if (c.hunger >= cfg.hungerCritical) {
    unmet++;
    c.health = clamp100(c.health - cfg.healthLossPerHourCritical * h);
  }
  if (c.hydration <= cfg.hydrationCritical) {
    unmet++;
    c.health = clamp100(c.health - cfg.healthLossPerHourCritical * h);
  }
  if (c.sleepiness >= 95) unmet++;
  if (c.energy <= cfg.energyWarn) unmet++;
  if (c.hunger >= cfg.hungerWarn) unmet++;
  c.happiness = clamp100(c.happiness - cfg.moodLossPerHourPerNeed * unmet * h);

  // Well-being drifts toward a target set by mood, energy and unmet needs (simplified game mechanic).
  const target = clamp100(50 + (c.happiness - 50) * 0.4 + (c.energy - 50) * 0.15 - unmet * 6);
  c.wellbeing = clamp100(c.wellbeing + (target - c.wellbeing) * Math.min(1, cfg.wellbeingDriftPerHour * h));

  state.time += seconds;

  if (bus) {
    if (before.hunger < cfg.hungerWarn && c.hunger >= cfg.hungerWarn) bus.emit('warning', 'You are getting hungry.');
    if (before.hydration > cfg.hydrationWarn && c.hydration <= cfg.hydrationWarn) bus.emit('warning', 'You are thirsty.');
    if (before.sleepiness < cfg.sleepinessWarn && c.sleepiness >= cfg.sleepinessWarn) bus.emit('warning', 'You are getting sleepy.');
    if (before.energy > cfg.energyWarn && c.energy <= cfg.energyWarn) bus.emit('warning', 'Energy is low.');
  }
}
