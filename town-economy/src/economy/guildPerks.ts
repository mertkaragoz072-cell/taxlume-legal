/** What belonging to a leveled guild gives a town: a little more output per
 * guild level above the first, up to a ceiling. Leaving the guild gives it up. */
export const GUILD_BONUS_PER_LEVEL = 0.005;
export const GUILD_BONUS_MAX = 0.05;

export function guildProductionBonus(level: number | undefined): number {
  if (!level || level < 2) return 0;
  return Math.min(GUILD_BONUS_MAX, GUILD_BONUS_PER_LEVEL * (level - 1));
}

// Hall projects the guild has built (see HALL_PROJECTS in guild/types.ts, which
// mirrors these numbers): extra warehouse room and extra output for every
// member's town. The save only stores how many are built.
const HALL_STORAGE = [80, 0, 160, 0, 240, 0];
const HALL_OUTPUT = [0, 0.005, 0, 0.005, 0.01, 0.015];

function sumBuilt(table: number[], built: number | undefined): number {
  if (!built || built < 1) return 0;
  return table.slice(0, Math.min(built, table.length)).reduce((a, b) => a + b, 0);
}

export function hallStorageBonus(built: number | undefined): number {
  return sumBuilt(HALL_STORAGE, built);
}

export function hallOutputBonus(built: number | undefined): number {
  return sumBuilt(HALL_OUTPUT, built);
}
