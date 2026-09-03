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
  | "streak_7";

export interface AchievementDef {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;
  reward: number;
  target: number;
  progress: (state: EconomyState, netWorth: number) => number;
}

function goodsOwnedCount(state: EconomyState): number {
  return Object.values(state.goods).filter((g) => g.holding > 0).length;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_trade",
    title: "İlk Adım",
    description: "Piyasada ilk alım ya da satımını yap.",
    icon: "🥉",
    reward: 10,
    target: 1,
    progress: (s) => s.stats.totalTrades,
  },
  {
    id: "trader_10",
    title: "Tüccar Ruhu",
    description: "10 alım-satım işlemi tamamla.",
    icon: "🥈",
    reward: 25,
    target: 10,
    progress: (s) => s.stats.totalTrades,
  },
  {
    id: "trader_50",
    title: "Deneyimli Tüccar",
    description: "50 alım-satım işlemi tamamla.",
    icon: "🥇",
    reward: 75,
    target: 50,
    progress: (s) => s.stats.totalTrades,
  },
  {
    id: "first_caravan",
    title: "İlk Kervan",
    description: "Komşu bir kasabaya ilk kervanını yolla.",
    icon: "🚚",
    reward: 15,
    target: 1,
    progress: (s) => s.stats.totalCaravansSent,
  },
  {
    id: "caravan_master_10",
    title: "Yol Ustası",
    description: "10 kervan seferini tamamla.",
    icon: "🐪",
    reward: 60,
    target: 10,
    progress: (s) => s.stats.totalCaravansCompleted,
  },
  {
    id: "three_towns",
    title: "Üç Kasabanın Dostu",
    description: "Komşu üç kasabanın hepsiyle ticaret yap.",
    icon: "🗺️",
    reward: 50,
    target: 3,
    progress: (s) => s.stats.townsTradedWith.length,
  },
  {
    id: "diversify",
    title: "Çeşitlendirici",
    description: "Aynı anda 5 farklı üründen sahip ol.",
    icon: "🧺",
    reward: 40,
    target: 5,
    progress: (s) => goodsOwnedCount(s),
  },
  {
    id: "net_1000",
    title: "İlk Bin",
    description: "Net servetini 1.000 🪙 üzerine çıkar.",
    icon: "💰",
    reward: 50,
    target: 1000,
    progress: (_s, netWorth) => netWorth,
  },
  {
    id: "net_5000",
    title: "Servet Kralı",
    description: "Net servetini 5.000 🪙 üzerine çıkar.",
    icon: "👑",
    reward: 150,
    target: 5000,
    progress: (_s, netWorth) => netWorth,
  },
  {
    id: "net_20000",
    title: "Ekonomi Efsanesi",
    description: "Net servetini 20.000 🪙 üzerine çıkar.",
    icon: "🏆",
    reward: 400,
    target: 20000,
    progress: (_s, netWorth) => netWorth,
  },
  {
    id: "survive_100",
    title: "Sağlam Temel",
    description: "Çökmeden 100 tur hayatta kal.",
    icon: "🛡️",
    reward: 30,
    target: 100,
    progress: (s) => s.tick,
  },
  {
    id: "survive_300",
    title: "Kriz Yönetimi",
    description: "Çökmeden 300 tur hayatta kal.",
    icon: "🏛️",
    reward: 100,
    target: 300,
    progress: (s) => s.tick,
  },
  {
    id: "streak_3",
    title: "Sadık Tüccar",
    description: "3 gün üst üste kasabana uğra.",
    icon: "🔥",
    reward: 40,
    target: 3,
    progress: (s) => s.streak.count,
  },
  {
    id: "streak_7",
    title: "Kasaba Efsanesi",
    description: "7 gün üst üste kasabana uğra.",
    icon: "⭐",
    reward: 120,
    target: 7,
    progress: (s) => s.streak.count,
  },
];

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
) as Record<AchievementId, AchievementDef>;
