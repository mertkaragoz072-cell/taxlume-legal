import { t } from "../i18n/t";
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
  messageKey: string,
  params: Record<string, string | number> | undefined,
  tone: "good" | "bad" | "neutral",
  patch: Partial<EconomyState>
): EconomyState {
  const event: EconomyEvent = { id: state.nextId, message: t(state.language, messageKey, params), tone };
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
  labelKey: string;
  hintKey: string;
}

export interface DecisionTemplate {
  id: string;
  icon: string;
  titleKey: string;
  descriptionKey: string;
  options: [DecisionOption, DecisionOption];
  resolve: (state: EconomyState, optionId: string) => EconomyState;
}

export const DECISION_TEMPLATES: DecisionTemplate[] = [
  {
    id: "famine_relief",
    icon: "🌾",
    titleKey: "decision.famine_relief.title",
    descriptionKey: "decision.famine_relief.description",
    options: [
      { id: "bagisla", labelKey: "decision.famine_relief.options.bagisla.label", hintKey: "decision.famine_relief.options.bagisla.hint" },
      { id: "reddet", labelKey: "decision.famine_relief.options.reddet.label", hintKey: "decision.famine_relief.options.reddet.hint" },
    ],
    resolve: (state, optionId) => {
      if (optionId === "bagisla") {
        const amount = Math.min(10, state.goods.bread.holding);
        if (amount <= 0) {
          return outcome(state, "msg.famineReliefNoBread", undefined, "neutral", {});
        }
        return outcome(state, "msg.famineReliefSuccess", undefined, "good", {
          goods: {
            ...state.goods,
            bread: { ...state.goods.bread, holding: state.goods.bread.holding - amount },
          },
          happiness: clamp(state.happiness + 10, 0, 100),
        });
      }
      return outcome(state, "msg.famineReliefRefuse", undefined, "bad", {
        happiness: clamp(state.happiness - 5, 0, 100),
      });
    },
  },
  {
    id: "tax_amnesty",
    icon: "📜",
    titleKey: "decision.tax_amnesty.title",
    descriptionKey: "decision.tax_amnesty.description",
    options: [
      { id: "kabul", labelKey: "decision.tax_amnesty.options.kabul.label", hintKey: "decision.tax_amnesty.options.kabul.hint" },
      { id: "reddet", labelKey: "decision.tax_amnesty.options.reddet.label", hintKey: "decision.tax_amnesty.options.reddet.hint" },
    ],
    resolve: (state, optionId) => {
      if (optionId === "kabul") {
        if (state.cash < 40) {
          return outcome(state, "msg.taxAmnestyNoCash", undefined, "neutral", {});
        }
        return outcome(state, "msg.taxAmnestySuccess", undefined, "good", {
          cash: state.cash - 40,
          happiness: clamp(state.happiness + 15, 0, 100),
        });
      }
      return outcome(state, "msg.taxAmnestyRefuse", undefined, "bad", {
        happiness: clamp(state.happiness - 10, 0, 100),
      });
    },
  },
  {
    id: "traveling_merchant",
    icon: "🎒",
    titleKey: "decision.traveling_merchant.title",
    descriptionKey: "decision.traveling_merchant.description",
    options: [
      { id: "riskal", labelKey: "decision.traveling_merchant.options.riskal.label", hintKey: "decision.traveling_merchant.options.riskal.hint" },
      { id: "reddet", labelKey: "decision.traveling_merchant.options.reddet.label", hintKey: "decision.traveling_merchant.options.reddet.hint" },
    ],
    resolve: (state, optionId) => {
      if (optionId === "riskal") {
        if (state.cash < 50) {
          return outcome(state, "msg.merchantNoCash", undefined, "neutral", {});
        }
        const afterCash = state.cash - 50;
        if (Math.random() < 0.6) {
          const good = randomGood();
          const gs = state.goods[good.id];
          const amount = Math.max(1, Math.round(80 / gs.price));
          const goodName = t(state.language, good.nameKey);
          return outcome(
            state,
            "msg.merchantHonest",
            { good: goodName, amount },
            "good",
            {
              cash: afterCash,
              goods: { ...state.goods, [good.id]: { ...gs, holding: gs.holding + amount } },
            }
          );
        }
        return outcome(state, "msg.merchantScam", undefined, "bad", { cash: afterCash });
      }
      return outcome(state, "msg.merchantRefuse", undefined, "neutral", {});
    },
  },
  {
    id: "drought_warning",
    icon: "🌵",
    titleKey: "decision.drought_warning.title",
    descriptionKey: "decision.drought_warning.description",
    options: [
      { id: "onlem", labelKey: "decision.drought_warning.options.onlem.label", hintKey: "decision.drought_warning.options.onlem.hint" },
      { id: "yoksay", labelKey: "decision.drought_warning.options.yoksay.label", hintKey: "decision.drought_warning.options.yoksay.hint" },
    ],
    resolve: (state, optionId) => {
      const bread = state.goods.bread;
      if (optionId === "onlem") {
        if (state.cash < 35) {
          return outcome(state, "msg.droughtNoCash", undefined, "neutral", {});
        }
        return outcome(state, "msg.droughtInvestSuccess", undefined, "good", {
          cash: state.cash - 35,
          goods: {
            ...state.goods,
            bread: { ...bread, supply: clampSupply(bread.supply * 1.2, bread.supply) },
          },
        });
      }
      return outcome(state, "msg.droughtHit", undefined, "bad", {
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
    titleKey: "decision.worker_demand.title",
    descriptionKey: "decision.worker_demand.description",
    options: [
      { id: "zam", labelKey: "decision.worker_demand.options.zam.label", hintKey: "decision.worker_demand.options.zam.hint" },
      { id: "reddet", labelKey: "decision.worker_demand.options.reddet.label", hintKey: "decision.worker_demand.options.reddet.hint" },
    ],
    resolve: (state, optionId) => {
      if (optionId === "zam") {
        if (state.cash < 30) {
          return outcome(state, "msg.workerNoCash", undefined, "neutral", {});
        }
        return outcome(state, "msg.workerRaiseSuccess", undefined, "good", {
          cash: state.cash - 30,
          happiness: clamp(state.happiness + 8, 0, 100),
        });
      }
      if (Math.random() < 0.5) {
        const good = randomGood();
        const gs = state.goods[good.id];
        const goodName = t(state.language, good.nameKey);
        return outcome(state, "msg.workerStrike", { good: goodName }, "bad", {
          goods: { ...state.goods, [good.id]: { ...gs, supply: Math.max(1, gs.supply * 0.8) } },
        });
      }
      return outcome(state, "msg.workerNoStrike", undefined, "neutral", {});
    },
  },
];

export const DECISION_TEMPLATES_BY_ID = Object.fromEntries(
  DECISION_TEMPLATES.map((d) => [d.id, d])
) as Record<string, DecisionTemplate>;
