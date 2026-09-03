import { GOODS } from "./goods";
import { EconomyEvent, EconomyState } from "./types";

const EVENT_LOG_CAP = 8;
// Mirrors useEconomy's supply bounds (baseSupply × 0.15 / 3) — kept as a
// local constant instead of importing from useEconomy.ts to avoid a
// circular import (useEconomy.ts pulls DECISION_TEMPLATES from here).
const SUPPLY_MIN_FACTOR = 0.15;
const SUPPLY_MAX_FACTOR = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampSupply(supply: number, baseSupply: number): number {
  return clamp(supply, baseSupply * SUPPLY_MIN_FACTOR, baseSupply * SUPPLY_MAX_FACTOR);
}

function outcome(
  state: EconomyState,
  message: string,
  tone: "good" | "bad" | "neutral",
  patch: Partial<EconomyState>
): EconomyState {
  const event: EconomyEvent = { id: state.nextId, message, tone };
  return {
    ...state,
    ...patch,
    pendingDecision: null,
    nextId: state.nextId + 1,
    lastEvent: event,
    eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
  };
}

function randomGood() {
  return GOODS[Math.floor(Math.random() * GOODS.length)];
}

export interface DecisionOption {
  id: string;
  label: string;
  hint: string;
}

export interface DecisionTemplate {
  id: string;
  icon: string;
  title: string;
  description: string;
  options: [DecisionOption, DecisionOption];
  resolve: (state: EconomyState, optionId: string) => EconomyState;
}

export const DECISION_TEMPLATES: DecisionTemplate[] = [
  {
    id: "famine_relief",
    icon: "🌾",
    title: "Kıtlık Yardımı",
    description: "Komşu bir kasaba kıtlık yaşıyor ve senden ekmek yardımı istiyorlar. Ne yaparsın?",
    options: [
      { id: "bagisla", label: "Ekmek Bağışla", hint: "🍞 -10, 😊 mutluluk artar" },
      { id: "reddet", label: "Reddet", hint: "😐 küçük mutluluk kaybı" },
    ],
    resolve: (state, optionId) => {
      if (optionId === "bagisla") {
        const amount = Math.min(10, state.goods.bread.holding);
        if (amount <= 0) {
          return outcome(state, "🌾 Bağışlamak istedin ama elinde hiç ekmek yoktu.", "neutral", {});
        }
        return outcome(state, `🌾 Ekmeğini bağışladın, halkın gurur duydu! (+10 mutluluk)`, "good", {
          goods: {
            ...state.goods,
            bread: { ...state.goods.bread, holding: state.goods.bread.holding - amount },
          },
          happiness: clamp(state.happiness + 10, 0, 100),
        });
      }
      return outcome(state, "🌾 Yardımı reddettin, halk hayal kırıklığına uğradı.", "bad", {
        happiness: clamp(state.happiness - 5, 0, 100),
      });
    },
  },
  {
    id: "tax_amnesty",
    icon: "📜",
    title: "Vergi Affı Talebi",
    description: "Köylüler geçici bir vergi indirimi istiyor. Talebi kabul eder misin?",
    options: [
      { id: "kabul", label: "Kabul Et (-40 🪙)", hint: "🪙 -40, 😊 +15" },
      { id: "reddet", label: "Reddet", hint: "😠 -10 mutluluk" },
    ],
    resolve: (state, optionId) => {
      if (optionId === "kabul") {
        if (state.cash < 40) {
          return outcome(state, "📜 Kabul etmek istedin ama hazine yetersizdi.", "neutral", {});
        }
        return outcome(state, "📜 Talebi kabul ettin, halk rahatladı! (+15 mutluluk)", "good", {
          cash: state.cash - 40,
          happiness: clamp(state.happiness + 15, 0, 100),
        });
      }
      return outcome(state, "📜 Talebi reddettin, köylüler öfkelendi.", "bad", {
        happiness: clamp(state.happiness - 10, 0, 100),
      });
    },
  },
  {
    id: "traveling_merchant",
    icon: "🎒",
    title: "Gezgin Tüccar",
    description: "Gizemli bir tüccar sana ucuza mal teklif ediyor... ama güvenilir mi bilinmiyor.",
    options: [
      { id: "riskal", label: "Teklifi Al (-50 🪙)", hint: "🎲 şansına bağlı" },
      { id: "reddet", label: "Reddet", hint: "güvenli, hiçbir şey olmaz" },
    ],
    resolve: (state, optionId) => {
      if (optionId === "riskal") {
        if (state.cash < 50) {
          return outcome(state, "🎒 Teklifi almak istedin ama paran yetmedi.", "neutral", {});
        }
        const afterCash = state.cash - 50;
        if (Math.random() < 0.6) {
          const good = randomGood();
          const gs = state.goods[good.id];
          const amount = Math.max(1, Math.round(80 / gs.price));
          return outcome(
            state,
            `🎒 Tüccar dürüstmüş! Bolca ${good.name} kazandın. (+${amount} ${good.name})`,
            "good",
            {
              cash: afterCash,
              goods: { ...state.goods, [good.id]: { ...gs, holding: gs.holding + amount } },
            }
          );
        }
        return outcome(state, "🎒 Tüccar seni kandırdı, parandan oldun!", "bad", { cash: afterCash });
      }
      return outcome(state, "🎒 Teklifi reddettin, tedbirli davrandın.", "neutral", {});
    },
  },
  {
    id: "drought_warning",
    icon: "🌵",
    title: "Kuraklık Uyarısı",
    description: "Bilginler yakında bir kuraklık öngörüyor. Önlem alınsın mı?",
    options: [
      { id: "onlem", label: "Sulama Yatırımı (-35 🪙)", hint: "🪙 -35, hasar önlenir" },
      { id: "yoksay", label: "Görmezden Gel", hint: "bedava ama riskli" },
    ],
    resolve: (state, optionId) => {
      const bread = state.goods.bread;
      if (optionId === "onlem") {
        if (state.cash < 35) {
          return outcome(state, "🌵 Yatırım yapmak istedin ama paran yetmedi.", "neutral", {});
        }
        return outcome(state, "🌵 Sulama sistemine yatırım yaptın, tahıl arzın güvende.", "good", {
          cash: state.cash - 35,
          goods: {
            ...state.goods,
            bread: { ...bread, supply: clampSupply(bread.supply * 1.2, bread.supply) },
          },
        });
      }
      return outcome(state, "🌵 Kuraklık vurdu! Ekmek arzı azaldı.", "bad", {
        goods: {
          ...state.goods,
          bread: { ...bread, supply: Math.max(1, bread.supply * 0.75) },
        },
      });
    },
  },
  {
    id: "worker_demand",
    icon: "⚒️",
    title: "İşçi Talebi",
    description: "Fabrika işçileri zam istiyor, aksi halde grev tehdidi var.",
    options: [
      { id: "zam", label: "Zam Ver (-30 🪙)", hint: "🪙 -30, 😊 +8" },
      { id: "reddet", label: "Reddet", hint: "grev riski var" },
    ],
    resolve: (state, optionId) => {
      if (optionId === "zam") {
        if (state.cash < 30) {
          return outcome(state, "⚒️ Zam vermek istedin ama paran yetmedi.", "neutral", {});
        }
        return outcome(state, "⚒️ Zam verdin, işçiler memnun.", "good", {
          cash: state.cash - 30,
          happiness: clamp(state.happiness + 8, 0, 100),
        });
      }
      if (Math.random() < 0.5) {
        const good = randomGood();
        const gs = state.goods[good.id];
        return outcome(state, `⚒️ Grev başladı! ${good.name} üretimi durdu.`, "bad", {
          goods: { ...state.goods, [good.id]: { ...gs, supply: Math.max(1, gs.supply * 0.8) } },
        });
      }
      return outcome(state, "⚒️ İşçiler bu sefer sabretti, grev çıkmadı.", "neutral", {});
    },
  },
];

export const DECISION_TEMPLATES_BY_ID = Object.fromEntries(
  DECISION_TEMPLATES.map((d) => [d.id, d])
) as Record<string, DecisionTemplate>;
