/** What belonging to a leveled guild gives a town: a little more output per
 * guild level above the first, up to a ceiling. Leaving the guild gives it up. */
export const GUILD_BONUS_PER_LEVEL = 0.005;
export const GUILD_BONUS_MAX = 0.05;

export function guildProductionBonus(level: number | undefined): number {
  if (!level || level < 2) return 0;
  return Math.min(GUILD_BONUS_MAX, GUILD_BONUS_PER_LEVEL * (level - 1));
}
