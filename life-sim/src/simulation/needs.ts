import { EventBus } from '../core/events';
import { clamp100 } from '../core/math';
import type { SimConfig } from './config';
import { DEFAULT_CONFIG } from './config';
import type { GameState } from './state';
import { HOUR } from './time';

export type Activity = 'active' | 'resting';

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
): void {
  if (seconds <= 0) return;
  const c = state.character;
  const h = seconds / HOUR;
  const before = { ...c };

  c.hunger = clamp100(c.hunger + cfg.hungerPerHour * h);
  c.hydration = clamp100(c.hydration - cfg.hydrationLossPerHour * h);
  c.sleepiness = clamp100(c.sleepiness + cfg.sleepinessPerHour * h);

  const wellFed = c.hunger < cfg.hungerWarn && c.hydration > cfg.hydrationWarn;
  if (activity === 'resting') {
    // A hungry, thirsty or sleepy body recovers less.
    const quality = (wellFed ? 1 : 0.5) * (c.sleepiness > cfg.sleepinessWarn ? 0.7 : 1);
    c.energy = clamp100(c.energy + cfg.restEnergyPerHour * quality * h);
  } else {
    c.energy = clamp100(c.energy - cfg.energyDrainPerHour * h);
  }

  const recoveryRate = cfg.fatigueRecoveryPerHour * (wellFed ? 1 : 0.5);
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

  state.time += seconds;

  if (bus) {
    if (before.hunger < cfg.hungerWarn && c.hunger >= cfg.hungerWarn) bus.emit('warning', 'You are getting hungry.');
    if (before.hydration > cfg.hydrationWarn && c.hydration <= cfg.hydrationWarn) bus.emit('warning', 'You are thirsty.');
    if (before.sleepiness < cfg.sleepinessWarn && c.sleepiness >= cfg.sleepinessWarn) bus.emit('warning', 'You are getting sleepy.');
    if (before.energy > cfg.energyWarn && c.energy <= cfg.energyWarn) bus.emit('warning', 'Energy is low.');
  }
}
