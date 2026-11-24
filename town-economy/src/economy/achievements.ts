import { PROPERTIES } from "./properties";
import { RESEARCH_NODES } from "./research";
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
  | "investor"
  | "landlord"
  | "real_estate_mogul"
  | "skilled_ruler"
  | "speculator"
  | "hot_hand"
  | "rank_capital"
  | "rank_kingdom"
  | "rank_empire"
  | "rank_goldenAge"
  | "rank_legendaryMarket"
  | "rank_worldPower"
  | "rank_tradeDynasty"
  | "rank_immortalLegend"
  | "trader_200"
  | "trader_1000"
  | "caravan_master_50"
  | "streak_100"
  | "survive_1000"
  | "prestige_5"
  | "researcher_all"
  | "speculator_10";

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
    // 3 in-game days (TICKS_PER_GAME_DAY=40 in useEconomy.ts) — hardcoded
    // rather than imported to avoid a circular import with useEconomy.ts.
    target: 120,
    progress: (s) => s.tick,
  },
  {
    id: "survive_300",
    titleKey: "achievement.survive_300.title",
    descriptionKey: "achievement.survive_300.description",
    icon: "🏛️",
    reward: 100,
    // 8 in-game days — see survive_100 above.
    target: 320,
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
  {
    id: "landlord",
    titleKey: "achievement.landlord.title",
    descriptionKey: "achievement.landlord.description",
    icon: "🏘️",
    reward: 50,
    target: 1,
    progress: (s) => s.ownedProperties.length,
  },
  {
    id: "real_estate_mogul",
    titleKey: "achievement.real_estate_mogul.title",
    descriptionKey: "achievement.real_estate_mogul.description",
    icon: "🏰",
    reward: 250,
    target: PROPERTIES.length,
    progress: (s) => s.ownedProperties.length,
  },
  {
    id: "skilled_ruler",
    titleKey: "achievement.skilled_ruler.title",
    descriptionKey: "achievement.skilled_ruler.description",
    icon: "🎖️",
    reward: 150,
    target: 3,
    progress: (s) => s.prestigePerks.length,
  },
  {
    id: "speculator",
    titleKey: "achievement.speculator.title",
    descriptionKey: "achievement.speculator.description",
    icon: "📑",
    reward: 60,
    target: 1,
    progress: (s) => s.stats.contractsWon,
  },
  {
    id: "hot_hand",
    titleKey: "achievement.hot_hand.title",
    descriptionKey: "achievement.hot_hand.description",
    icon: "🔥",
    reward: 40,
    target: 5,
    progress: (s) => s.stats.bestTradeStreak,
  },
  // --- Rank ladder ---------------------------------------------------------
  // The rest of the list tops out at net_20000 — tier 2 on the town rank
  // ladder (see TOWN_RANK_TIERS in townRanks.ts) — so a run that outgrows
  // that in its first few days has nothing left to chase here. These pick
  // up right where net_20000 leaves off, one per named rank, all the way
  // to the top of the list.
  {
    id: "rank_capital",
    titleKey: "achievement.rank_capital.title",
    descriptionKey: "achievement.rank_capital.description",
    icon: "👑",
    reward: 300,
    target: 5,
    progress: (s) => s.townRankIndex,
  },
  {
    id: "rank_kingdom",
    titleKey: "achievement.rank_kingdom.title",
    descriptionKey: "achievement.rank_kingdom.description",
    icon: "🏰",
    reward: 500,
    target: 6,
    progress: (s) => s.townRankIndex,
  },
  {
    id: "rank_empire",
    titleKey: "achievement.rank_empire.title",
    descriptionKey: "achievement.rank_empire.description",
    icon: "⚜️",
    reward: 800,
    target: 7,
    progress: (s) => s.townRankIndex,
  },
  {
    id: "rank_goldenAge",
    titleKey: "achievement.rank_goldenAge.title",
    descriptionKey: "achievement.rank_goldenAge.description",
    icon: "✨",
    reward: 1300,
    target: 8,
    progress: (s) => s.townRankIndex,
  },
  {
    id: "rank_legendaryMarket",
    titleKey: "achievement.rank_legendaryMarket.title",
    descriptionKey: "achievement.rank_legendaryMarket.description",
    icon: "🌟",
    reward: 2200,
    target: 9,
    progress: (s) => s.townRankIndex,
  },
  {
    id: "rank_worldPower",
    titleKey: "achievement.rank_worldPower.title",
    descriptionKey: "achievement.rank_worldPower.description",
    icon: "🌍",
    reward: 3800,
    target: 10,
    progress: (s) => s.townRankIndex,
  },
  {
    id: "rank_tradeDynasty",
    titleKey: "achievement.rank_tradeDynasty.title",
    descriptionKey: "achievement.rank_tradeDynasty.description",
    icon: "💎",
    reward: 6500,
    target: 11,
    progress: (s) => s.townRankIndex,
  },
  {
    id: "rank_immortalLegend",
    titleKey: "achievement.rank_immortalLegend.title",
    descriptionKey: "achievement.rank_immortalLegend.description",
    icon: "🔱",
    reward: 11000,
    target: 12,
    progress: (s) => s.townRankIndex,
  },
  // --- Extended grind ladder -------------------------------------------------
  // Same idea for the non-rank achievements: trader_50, caravan_master_10,
  // streak_30, survive_300, researcher and speculator all cap at targets a
  // long-running town clears early. These extend each of those ladders
  // further for a run that's still going.
  {
    id: "trader_200",
    titleKey: "achievement.trader_200.title",
    descriptionKey: "achievement.trader_200.description",
    icon: "🎯",
    reward: 150,
    target: 200,
    progress: (s) => s.stats.totalTrades,
  },
  {
    id: "trader_1000",
    titleKey: "achievement.trader_1000.title",
    descriptionKey: "achievement.trader_1000.description",
    icon: "🏅",
    reward: 500,
    target: 1000,
    progress: (s) => s.stats.totalTrades,
  },
  {
    id: "caravan_master_50",
    titleKey: "achievement.caravan_master_50.title",
    descriptionKey: "achievement.caravan_master_50.description",
    icon: "🚛",
    reward: 300,
    target: 50,
    progress: (s) => s.stats.totalCaravansCompleted,
  },
  {
    id: "streak_100",
    titleKey: "achievement.streak_100.title",
    descriptionKey: "achievement.streak_100.description",
    icon: "🌙",
    reward: 800,
    target: 100,
    progress: (s) => s.streak.count,
  },
  {
    id: "survive_1000",
    titleKey: "achievement.survive_1000.title",
    descriptionKey: "achievement.survive_1000.description",
    icon: "⏳",
    reward: 400,
    // 25 in-game days — see survive_100's comment above for why this is
    // hardcoded rather than imported.
    target: 1000,
    progress: (s) => s.tick,
  },
  {
    id: "prestige_5",
    titleKey: "achievement.prestige_5.title",
    descriptionKey: "achievement.prestige_5.description",
    icon: "🔁",
    reward: 600,
    target: 5,
    progress: (s) => s.prestigeLevel,
  },
  {
    id: "researcher_all",
    titleKey: "achievement.researcher_all.title",
    descriptionKey: "achievement.researcher_all.description",
    icon: "🧪",
    reward: 350,
    target: RESEARCH_NODES.length,
    progress: (s) => s.researched.length,
  },
  {
    id: "speculator_10",
    titleKey: "achievement.speculator_10.title",
    descriptionKey: "achievement.speculator_10.description",
    icon: "📜",
    reward: 250,
    target: 10,
    progress: (s) => s.stats.contractsWon,
  },
];

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<
  AchievementId,
  AchievementDef
>;
