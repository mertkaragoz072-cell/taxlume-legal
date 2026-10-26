/**
 * Every tunable number of the life simulation lives here so rules are
 * configurable and tests can override them. See GAME_DESIGN.md §Simulation.
 */
export interface SimConfig {
  /** Per awake game-hour changes. */
  hungerPerHour: number;
  hydrationLossPerHour: number;
  sleepinessPerHour: number;
  energyDrainPerHour: number;
  /** Energy regained per hour while resting between sets (standing/sitting). */
  restEnergyPerHour: number;
  /** Recovery debt ("fatigue") burned per hour; faster when well fed. */
  fatigueRecoveryPerHour: number;
  /** Thresholds below/above which needs begin to hurt. */
  hungerWarn: number;
  hungerCritical: number;
  hydrationWarn: number;
  hydrationCritical: number;
  sleepinessWarn: number;
  energyWarn: number;
  /** Health lost per hour while a need is critical. */
  healthLossPerHourCritical: number;
  /** Happiness lost per hour per unmet need. */
  moodLossPerHourPerNeed: number;
}

export const DEFAULT_CONFIG: SimConfig = {
  hungerPerHour: 4,
  hydrationLossPerHour: 5,
  sleepinessPerHour: 4,
  energyDrainPerHour: 1.5,
  restEnergyPerHour: 12,
  fatigueRecoveryPerHour: 3,
  hungerWarn: 65,
  hungerCritical: 90,
  hydrationWarn: 35,
  hydrationCritical: 10,
  sleepinessWarn: 70,
  energyWarn: 25,
  healthLossPerHourCritical: 2,
  moodLossPerHourPerNeed: 1.5,
};
