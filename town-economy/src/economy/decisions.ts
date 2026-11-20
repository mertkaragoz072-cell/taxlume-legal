import { eventFields, Params } from "../i18n/t";
import { DecreeEffect, ERAS } from "./eras";
import { GOODS } from "./goods";
import { townRankReward } from "./townRanks";
import { UPGRADES_BY_ID } from "./upgrades";
import { RESEARCH_NODES } from "./research";
import { EconomyEvent, EconomyState } from "./types";

const EVENT_LOG_CAP = 30;
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
  params: Params | undefined,
  tone: "good" | "bad" | "neutral",
  patch: Partial<EconomyState>
): EconomyState {
  const event: EconomyEvent = { id: state.nextId, ...eventFields(state.language, messageKey, params), tone };
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

// A flat stake, like every other decision's costs — deliberately not scaled
// to net worth so a fixed number can appear right in the option label.
const GAMBLE_WAGER = 60;

// What the stranger charges for an instant, randomly-picked research
// unlock — often a steal against that node's real cost, which is the
// point (a lucky find), but never free.
const MYSTERY_STRANGER_COST = 70;

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
      {
        id: "bagisla",
        labelKey: "decision.famine_relief.options.bagisla.label",
        hintKey: "decision.famine_relief.options.bagisla.hint",
      },
      {
        id: "reddet",
        labelKey: "decision.famine_relief.options.reddet.label",
        hintKey: "decision.famine_relief.options.reddet.hint",
      },
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
      {
        id: "kabul",
        labelKey: "decision.tax_amnesty.options.kabul.label",
        hintKey: "decision.tax_amnesty.options.kabul.hint",
      },
      {
        id: "reddet",
        labelKey: "decision.tax_amnesty.options.reddet.label",
        hintKey: "decision.tax_amnesty.options.reddet.hint",
      },
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
      {
        id: "riskal",
        labelKey: "decision.traveling_merchant.options.riskal.label",
        hintKey: "decision.traveling_merchant.options.riskal.hint",
      },
      {
        id: "reddet",
        labelKey: "decision.traveling_merchant.options.reddet.label",
        hintKey: "decision.traveling_merchant.options.reddet.hint",
      },
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
          return outcome(state, "msg.merchantHonest", { good: { key: good.nameKey }, amount }, "good", {
            cash: afterCash,
            goods: { ...state.goods, [good.id]: { ...gs, holding: gs.holding + amount } },
          });
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
      {
        id: "onlem",
        labelKey: "decision.drought_warning.options.onlem.label",
        hintKey: "decision.drought_warning.options.onlem.hint",
      },
      {
        id: "yoksay",
        labelKey: "decision.drought_warning.options.yoksay.label",
        hintKey: "decision.drought_warning.options.yoksay.hint",
      },
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
      {
        id: "zam",
        labelKey: "decision.worker_demand.options.zam.label",
        hintKey: "decision.worker_demand.options.zam.hint",
      },
      {
        id: "reddet",
        labelKey: "decision.worker_demand.options.reddet.label",
        hintKey: "decision.worker_demand.options.reddet.hint",
      },
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
        return outcome(state, "msg.workerStrike", { good: { key: good.nameKey } }, "bad", {
          goods: { ...state.goods, [good.id]: { ...gs, supply: Math.max(1, gs.supply * 0.8) } },
        });
      }
      return outcome(state, "msg.workerNoStrike", undefined, "neutral", {});
    },
  },
  {
    id: "black_market_gamble",
    icon: "🎲",
    titleKey: "decision.black_market_gamble.title",
    descriptionKey: "decision.black_market_gamble.description",
    options: [
      {
        id: "bahis",
        labelKey: "decision.black_market_gamble.options.bahis.label",
        hintKey: "decision.black_market_gamble.options.bahis.hint",
      },
      {
        id: "vazgec",
        labelKey: "decision.black_market_gamble.options.vazgec.label",
        hintKey: "decision.black_market_gamble.options.vazgec.hint",
      },
    ],
    resolve: (state, optionId) => {
      if (optionId === "bahis") {
        if (state.cash < GAMBLE_WAGER) {
          return outcome(state, "msg.gambleNoCash", undefined, "neutral", {});
        }
        if (Math.random() < 0.5) {
          return outcome(state, "msg.gambleWin", { amount: GAMBLE_WAGER }, "good", {
            cash: state.cash + GAMBLE_WAGER,
          });
        }
        return outcome(state, "msg.gambleLose", { amount: GAMBLE_WAGER }, "bad", {
          cash: state.cash - GAMBLE_WAGER,
        });
      }
      return outcome(state, "msg.gambleDecline", undefined, "neutral", {});
    },
  },
  {
    id: "mystery_stranger",
    icon: "🕵️",
    titleKey: "decision.mystery_stranger.title",
    descriptionKey: "decision.mystery_stranger.description",
    options: [
      {
        id: "kabul",
        labelKey: "decision.mystery_stranger.options.kabul.label",
        hintKey: "decision.mystery_stranger.options.kabul.hint",
      },
      {
        id: "reddet",
        labelKey: "decision.mystery_stranger.options.reddet.label",
        hintKey: "decision.mystery_stranger.options.reddet.hint",
      },
    ],
    resolve: (state, optionId) => {
      if (optionId === "kabul") {
        if (state.cash < MYSTERY_STRANGER_COST) {
          return outcome(state, "msg.mysteryStrangerNoCash", undefined, "neutral", {});
        }
        const afterCash = state.cash - MYSTERY_STRANGER_COST;
        // Only nodes that would normally be eligible to research right now
        // (tier-1, or tier-2 whose prerequisite is already done) — the
        // stranger sells you a shortcut, not a rule-breaking skip-ahead.
        const eligible = RESEARCH_NODES.filter(
          (n) => !state.researched.includes(n.id) && (!n.requires || state.researched.includes(n.requires))
        );
        if (eligible.length === 0) {
          return outcome(state, "msg.mysteryStrangerNothingLeft", undefined, "neutral", {});
        }
        const node = eligible[Math.floor(Math.random() * eligible.length)];
        return outcome(state, "msg.mysteryStrangerSuccess", { research: { key: node.nameKey } }, "good", {
          cash: afterCash,
          researched: [...state.researched, node.id],
        });
      }
      return outcome(state, "msg.mysteryStrangerRefuse", undefined, "neutral", {});
    },
  },
];

// --- Era charters -----------------------------------------------------------
// Entering a new era hands the player one two-sided decree to sign (see
// eras.ts). They are real DecisionTemplates so the existing modal and save
// format carry them, but they are NOT in DECISION_TEMPLATES: that array is
// the random-event pool, and a charter must only ever appear on promotion.

const FESTIVAL_HAPPINESS = 25;
const FESTIVAL_CASH_SHARE = 0.5;

function applyDecree(state: EconomyState, effect: DecreeEffect): EconomyState {
  // Scales with the rank the town holds when the charter is signed.
  const reward = townRankReward(state.townRankIndex);
  if (effect.kind === "upgrade") {
    const def = UPGRADES_BY_ID[effect.id];
    const level = state.upgrades[effect.id];
    if (level >= def.maxLevel) {
      return outcome(
        state,
        "msg.eraDecreeUpgradeMaxed",
        { icon: def.icon, upgrade: { key: def.nameKey }, amount: Math.round(reward) },
        "good",
        { cash: state.cash + reward }
      );
    }
    return outcome(state, "msg.eraDecreeUpgrade", { icon: def.icon, upgrade: { key: def.nameKey } }, "good", {
      upgrades: { ...state.upgrades, [effect.id]: level + 1 },
    });
  }
  if (effect.kind === "research") {
    const eligible = RESEARCH_NODES.filter(
      (n) =>
        !state.researched.includes(n.id) &&
        (!n.requires || state.researched.includes(n.requires)) &&
        (n.requiresRank === undefined || state.townRankIndex >= n.requiresRank)
    );
    if (eligible.length === 0) {
      return outcome(state, "msg.eraDecreeResearchNone", { amount: Math.round(reward) }, "good", {
        cash: state.cash + reward,
      });
    }
    const node = eligible[Math.floor(Math.random() * eligible.length)];
    return outcome(state, "msg.eraDecreeResearch", { research: { key: node.nameKey } }, "good", {
      researched: [...state.researched, node.id],
    });
  }
  if (effect.kind === "festival") {
    const cash = Math.round(reward * FESTIVAL_CASH_SHARE);
    return outcome(state, "msg.eraDecreeFestival", { happy: FESTIVAL_HAPPINESS, amount: cash }, "good", {
      cash: state.cash + cash,
      happiness: clamp(state.happiness + FESTIVAL_HAPPINESS, 0, 100),
    });
  }
  const amount = Math.round(reward * effect.mult);
  return outcome(state, "msg.eraDecreeCash", { amount }, "good", { cash: state.cash + amount });
}

function decreeHintKey(effect: DecreeEffect): string {
  return effect.kind === "upgrade" ? `eraDecree.hint.${effect.id}` : `eraDecree.hint.${effect.kind}`;
}

export const ERA_DECISION_TEMPLATES: DecisionTemplate[] = ERAS.flatMap((era) => {
  const decree = era.decree;
  if (!decree) return [];
  const base = `era.${era.key}.decree`;
  return [
    {
      id: `era_${era.key}`,
      icon: "📜",
      titleKey: `${base}.title`,
      descriptionKey: `${base}.description`,
      options: [
        { id: "a", labelKey: `${base}.a`, hintKey: decreeHintKey(decree.a) },
        { id: "b", labelKey: `${base}.b`, hintKey: decreeHintKey(decree.b) },
      ],
      resolve: (state: EconomyState, optionId: string) =>
        applyDecree(state, optionId === "a" ? decree.a : decree.b),
    },
  ];
});

export const DECISION_TEMPLATES_BY_ID = Object.fromEntries(
  [...DECISION_TEMPLATES, ...ERA_DECISION_TEMPLATES].map((d) => [d.id, d])
) as Record<string, DecisionTemplate>;
