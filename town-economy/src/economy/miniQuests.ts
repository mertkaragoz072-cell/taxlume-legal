import { DailyProgress } from "./types";

export interface MiniQuestTemplate {
  id: string;
  icon: string;
  titleKey: string;
  descriptionKey: string;
  target: number;
  reward: number;
  /** ticks the player has to hit the target once this spawns — short and
   *  "instant", unlike a daily quest's whole-day window */
  durationTicks: number;
  /** same DailyProgress counters daily quests read; a mini quest just diffs
   *  against a baseline snapshot taken when it spawns (see useEconomy.ts) */
  metric: (daily: DailyProgress) => number;
  /** only offered once inter-city trade is unlocked */
  requiresTrade?: boolean;
}

export const MINI_QUEST_TEMPLATES: MiniQuestTemplate[] = [
  {
    id: "flash_trade",
    icon: "⚡",
    titleKey: "miniQuest.flash_trade.title",
    descriptionKey: "miniQuest.flash_trade.description",
    target: 1,
    reward: 15,
    durationTicks: 6,
    metric: (d) => d.trades,
  },
  {
    id: "flash_trade_3",
    icon: "🛍️",
    titleKey: "miniQuest.flash_trade_3.title",
    descriptionKey: "miniQuest.flash_trade_3.description",
    target: 3,
    reward: 25,
    durationTicks: 10,
    metric: (d) => d.trades,
  },
  {
    id: "flash_earnings",
    icon: "💵",
    titleKey: "miniQuest.flash_earnings.title",
    descriptionKey: "miniQuest.flash_earnings.description",
    target: 40,
    reward: 20,
    durationTicks: 8,
    metric: (d) => d.cashEarned,
  },
  {
    id: "flash_caravan",
    icon: "🐎",
    titleKey: "miniQuest.flash_caravan.title",
    descriptionKey: "miniQuest.flash_caravan.description",
    target: 1,
    reward: 30,
    durationTicks: 10,
    metric: (d) => d.caravansSent,
    requiresTrade: true,
  },
  {
    id: "flash_upgrade",
    icon: "🔨",
    titleKey: "miniQuest.flash_upgrade.title",
    descriptionKey: "miniQuest.flash_upgrade.description",
    target: 1,
    reward: 25,
    durationTicks: 12,
    metric: (d) => d.upgradesBought,
  },
];

export const MINI_QUEST_TEMPLATES_BY_ID = Object.fromEntries(
  MINI_QUEST_TEMPLATES.map((q) => [q.id, q])
) as Record<string, MiniQuestTemplate>;
