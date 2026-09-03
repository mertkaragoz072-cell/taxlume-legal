import { DailyProgress } from "./types";

export interface QuestTemplate {
  id: string;
  icon: string;
  title: string;
  description: string;
  target: number;
  reward: number;
  progress: (daily: DailyProgress) => number;
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    id: "daily_trade_small",
    icon: "🛒",
    title: "Küçük Tüccar",
    description: "Bugün 3 alım-satım işlemi yap.",
    target: 3,
    reward: 20,
    progress: (d) => d.trades,
  },
  {
    id: "daily_trade_big",
    icon: "📊",
    title: "Aktif Piyasa",
    description: "Bugün 8 alım-satım işlemi yap.",
    target: 8,
    reward: 45,
    progress: (d) => d.trades,
  },
  {
    id: "daily_caravan",
    icon: "🚚",
    title: "Kervan Yolu",
    description: "Bugün bir kervan yola çıkar.",
    target: 1,
    reward: 25,
    progress: (d) => d.caravansSent,
  },
  {
    id: "daily_two_towns",
    icon: "🗺️",
    title: "Ticaret Ağı",
    description: "Bugün 2 farklı kasabayla ticaret yap.",
    target: 2,
    reward: 35,
    progress: (d) => d.townsTraded.length,
  },
  {
    id: "daily_earnings",
    icon: "💰",
    title: "Kazanç Günü",
    description: "Bugün 100 🪙 kazan.",
    target: 100,
    reward: 30,
    progress: (d) => d.cashEarned,
  },
  {
    id: "daily_upgrade",
    icon: "🏗️",
    title: "Yatırımcı",
    description: "Bugün bir kasaba geliştirmesi satın al.",
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
