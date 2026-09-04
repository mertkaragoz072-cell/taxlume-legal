import { TOWNS_BY_ID } from "./towns";
import { EconomyState } from "./types";

export type AchievementId =
  | "first_trade"
  | "trader_10"
  | "trader_50"
  | "first_caravan"
  | "caravan_master_10"
  | "three_towns"
  | "diversify"
  | "net_1000"
  | "net_5000"
  | "net_20000"
  | "survive_100"
  | "survive_300"
  | "streak_3"
  | "streak_7"
  | "streak_30"
  | "prestige_1"
  | "workforce"
  | "debt_free"
  | "metropol_trader"
  | "researcher"
  | "investor";

export interface AchievementDef {
  id: AchievementId;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  reward: number;
  target: number;
  progress: (state: EconomyState, netWorth: number) => number;
}

function goodsOwnedCount(state: EconomyState): number {
  return Object.values(state.goods).filter((g) => g.holding > 0).length;
}

function totalWorkersEmployed(state: EconomyState): number {
  return Object.values(state.workers).reduce((sum, count) => sum + count, 0);
}

function metropolTownsTradedWith(state: EconomyState): number {
  return state.stats.townsTradedWith.filter((id) => TOWNS_BY_ID[id]?.tier === "metropol").length;
}

function assetsOwnedCount(state: EconomyState): number {
  return Object.values(state.assets).filter((a) => a.holding > 0).length;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_trade",
    titleKey: "achievement.first_trade.title",
    descriptionKey: "achievement.first_trade.description",
    icon: "🥉",
    reward: 10,
    target: 1,
    progress: (s) => s.stats.totalTrades,
  },
  {
    id: "trader_10",
    titleKey: "achievement.trader_10.title",
    descriptionKey: "achievement.trader_10.description",
    icon: "🥈",
    reward: 25,
    target: 10,
    progress: (s) => s.stats.totalTrades,
  },
  {
    id: "trader_50",
    titleKey: "achievement.trader_50.title",
    descriptionKey: "achievement.trader_50.description",
    icon: "🥇",
    reward: 75,
    target: 50,
    progress: (s) => s.stats.totalTrades,
  },
  {
    id: "first_caravan",
    titleKey: "achievement.first_caravan.title",
    descriptionKey: "achievement.first_caravan.description",
    icon: "🚚",
    reward: 15,
    target: 1,
    progress: (s) => s.stats.totalCaravansSent,
  },
  {
    id: "caravan_master_10",
    titleKey: "achievement.caravan_master_10.title",
    descriptionKey: "achievement.caravan_master_10.description",
    icon: "🐪",
    reward: 60,
    target: 10,
    progress: (s) => s.stats.totalCaravansCompleted,
  },
  {
    id: "three_towns",
    titleKey: "achievement.three_towns.title",
    descriptionKey: "achievement.three_towns.description",
    icon: "🗺️",
    reward: 50,
    target: 3,
    progress: (s) => s.stats.townsTradedWith.length,
  },
  {
    id: "diversify",
    titleKey: "achievement.diversify.title",
    descriptionKey: "achievement.diversify.description",
    icon: "🧺",
    reward: 40,
    target: 5,
    progress: (s) => goodsOwnedCount(s),
  },
  {
    id: "net_1000",
    titleKey: "achievement.net_1000.title",
    descriptionKey: "achievement.net_1000.description",
    icon: "💰",
    reward: 50,
    target: 1000,
    progress: (_s, netWorth) => netWorth,
  },
  {
    id: "net_5000",
    titleKey: "achievement.net_5000.title",
    descriptionKey: "achievement.net_5000.description",
    icon: "👑",
    reward: 150,
    target: 5000,
    progress: (_s, netWorth) => netWorth,
  },
  {
    id: "net_20000",
    titleKey: "achievement.net_20000.title",
    descriptionKey: "achievement.net_20000.description",
    icon: "🏆",
    reward: 400,
    target: 20000,
    progress: (_s, netWorth) => netWorth,
  },
  {
    id: "survive_100",
    titleKey: "achievement.survive_100.title",
    descriptionKey: "achievement.survive_100.description",
    icon: "🛡️",
    reward: 30,
    target: 100,
    progress: (s) => s.tick,
  },
  {
    id: "survive_300",
    titleKey: "achievement.survive_300.title",
    descriptionKey: "achievement.survive_300.description",
    icon: "🏛️",
    reward: 100,
    target: 300,
    progress: (s) => s.tick,
  },
  {
    id: "streak_3",
    titleKey: "achievement.streak_3.title",
    descriptionKey: "achievement.streak_3.description",
    icon: "🔥",
    reward: 40,
    target: 3,
    progress: (s) => s.streak.count,
  },
  {
    id: "streak_7",
    titleKey: "achievement.streak_7.title",
    descriptionKey: "achievement.streak_7.description",
    icon: "⭐",
    reward: 120,
    target: 7,
    progress: (s) => s.streak.count,
  },
  {
    id: "streak_30",
    titleKey: "achievement.streak_30.title",
    descriptionKey: "achievement.streak_30.description",
    icon: "💎",
    reward: 350,
    target: 30,
    progress: (s) => s.streak.count,
  },
  {
    id: "prestige_1",
    titleKey: "achievement.prestige_1.title",
    descriptionKey: "achievement.prestige_1.description",
    icon: "🌟",
    reward: 200,
    target: 1,
    progress: (s) => s.prestigeLevel,
  },
  {
    id: "workforce",
    titleKey: "achievement.workforce.title",
    descriptionKey: "achievement.workforce.description",
    icon: "👷",
    reward: 60,
    target: 3,
    progress: (s) => totalWorkersEmployed(s),
  },
  {
    id: "debt_free",
    titleKey: "achievement.debt_free.title",
    descriptionKey: "achievement.debt_free.description",
    icon: "🏦",
    reward: 80,
    target: 1,
    progress: (s) => s.stats.loansRepaid,
  },
  {
    id: "metropol_trader",
    titleKey: "achievement.metropol_trader.title",
    descriptionKey: "achievement.metropol_trader.description",
    icon: "🏙️",
    reward: 100,
    target: 1,
    progress: (s) => metropolTownsTradedWith(s),
  },
  {
    id: "researcher",
    titleKey: "achievement.researcher.title",
    descriptionKey: "achievement.researcher.description",
    icon: "🔬",
    reward: 90,
    target: 5,
    progress: (s) => s.researched.length,
  },
  {
    id: "investor",
    titleKey: "achievement.investor.title",
    descriptionKey: "achievement.investor.description",
    icon: "📈",
    reward: 70,
    target: 2,
    progress: (s) => assetsOwnedCount(s),
  },
];

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
) as Record<AchievementId, AchievementDef>;
