import { DailyProgress } from "./types";

export interface QuestTemplate {
  id: string;
  icon: string;
  titleKey: string;
  descriptionKey: string;
  target: number;
  reward: number;
  progress: (daily: DailyProgress) => number;
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    id: "daily_trade_small",
    icon: "🛒",
    titleKey: "quest.daily_trade_small.title",
    descriptionKey: "quest.daily_trade_small.description",
    target: 3,
    reward: 20,
    progress: (d) => d.trades,
  },
  {
    id: "daily_trade_big",
    icon: "📊",
    titleKey: "quest.daily_trade_big.title",
    descriptionKey: "quest.daily_trade_big.description",
    target: 8,
    reward: 45,
    progress: (d) => d.trades,
  },
  {
    id: "daily_caravan",
    icon: "🚚",
    titleKey: "quest.daily_caravan.title",
    descriptionKey: "quest.daily_caravan.description",
    target: 1,
    reward: 25,
    progress: (d) => d.caravansSent,
  },
  {
    id: "daily_two_towns",
    icon: "🗺️",
    titleKey: "quest.daily_two_towns.title",
    descriptionKey: "quest.daily_two_towns.description",
    target: 2,
    reward: 35,
    progress: (d) => d.townsTraded.length,
  },
  {
    id: "daily_earnings",
    icon: "💰",
    titleKey: "quest.daily_earnings.title",
    descriptionKey: "quest.daily_earnings.description",
    target: 100,
    reward: 30,
    progress: (d) => d.cashEarned,
  },
  {
    id: "daily_upgrade",
    icon: "🏗️",
    titleKey: "quest.daily_upgrade.title",
    descriptionKey: "quest.daily_upgrade.description",
    target: 1,
    reward: 30,
    progress: (d) => d.upgradesBought,
  },
];

export const QUEST_TEMPLATES_BY_ID = Object.fromEntries(
  QUEST_TEMPLATES.map((q) => [q.id, q])
) as Record<string, QuestTemplate>;

export function makeInitialDailyProgress(): DailyProgress {
  return { trades: 0, caravansSent: 0, townsTraded: [], cashEarned: 0, upgradesBought: 0 };
}

/** Deterministically picks `count` distinct templates for a given date, so
 * reloading the same day always shows the same quests. */
export function pickDailyQuestTemplates(dateSeed: string, count: number): QuestTemplate[] {
  let seed = 0;
  for (let i = 0; i < dateSeed.length; i++) {
    seed = (seed * 31 + dateSeed.charCodeAt(i)) >>> 0;
  }
  const rand = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return seed / 0xffffffff;
  };

  const pool = [...QUEST_TEMPLATES];
  const picked: QuestTemplate[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const index = Math.floor(rand() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}
