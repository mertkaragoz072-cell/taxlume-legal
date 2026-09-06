import { EconomyStats } from "./types";

export interface WeeklyChallengeTemplate {
  id: string;
  icon: string;
  titleKey: string;
  descriptionKey: string;
  target: number;
  reward: number;
  /** a lifetime EconomyStats counter, diffed against a baseline snapshot
   * taken when the challenge is assigned for the week — see
   * ensureWeeklyChallenge in useEconomy.ts */
  metric: (stats: EconomyStats) => number;
}

export const WEEKLY_CHALLENGE_TEMPLATES: WeeklyChallengeTemplate[] = [
  {
    id: "weekly_trader",
    icon: "📊",
    titleKey: "weeklyChallenge.weekly_trader.title",
    descriptionKey: "weeklyChallenge.weekly_trader.description",
    target: 40,
    reward: 300,
    metric: (s) => s.totalTrades,
  },
  {
    id: "weekly_logistics",
    icon: "🐫",
    titleKey: "weeklyChallenge.weekly_logistics.title",
    descriptionKey: "weeklyChallenge.weekly_logistics.description",
    target: 5,
    reward: 350,
    metric: (s) => s.totalCaravansCompleted,
  },
  {
    id: "weekly_profiteer",
    icon: "💰",
    titleKey: "weeklyChallenge.weekly_profiteer.title",
    descriptionKey: "weeklyChallenge.weekly_profiteer.description",
    target: 500,
    reward: 400,
    metric: (s) => s.totalRealizedProfit,
  },
];

export const WEEKLY_CHALLENGE_TEMPLATES_BY_ID = Object.fromEntries(
  WEEKLY_CHALLENGE_TEMPLATES.map((c) => [c.id, c])
) as Record<string, WeeklyChallengeTemplate>;

/** ISO 8601 week key ("2026-W36") for a "YYYY-MM-DD" date string — the same
 * week number for every player on the same calendar week, so no seeded RNG
 * or server sync is needed to keep everyone's challenge in step. */
export function isoWeekKey(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function weeklyChallengeTemplateForWeek(weekKey: string): WeeklyChallengeTemplate {
  let hash = 0;
  for (let i = 0; i < weekKey.length; i++) hash = (hash * 31 + weekKey.charCodeAt(i)) >>> 0;
  return WEEKLY_CHALLENGE_TEMPLATES[hash % WEEKLY_CHALLENGE_TEMPLATES.length];
}
