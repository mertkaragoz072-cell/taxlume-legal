import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ACHIEVEMENTS } from "./achievements";
import { ASSETS, ASSETS_BY_ID, AssetId } from "./assets";
import { DECISION_TEMPLATES, DECISION_TEMPLATES_BY_ID } from "./decisions";
import { DIFFICULTIES, DifficultyId } from "./difficulty";
import { GOODS, GOODS_BY_ID } from "./goods";
import { EVENT_TEMPLATES } from "./events";
import { loadEconomyState, saveEconomyState } from "./persist";
import { makeInitialDailyProgress, pickDailyQuestTemplates, QUEST_TEMPLATES_BY_ID } from "./quests";
import { RESEARCH_NODES_BY_ID, researchMultiplier } from "./research";
import { TOWNS, TOWNS_BY_ID, TownId } from "./towns";
import { UPGRADES_BY_ID, upgradeCost } from "./upgrades";
import {
  rollVillagerRequest,
  VILLAGER_REQUEST_GIVE_HAPPINESS,
  VILLAGER_REQUEST_REFUSE_HAPPINESS,
} from "./villagerRequests";
import { DEFAULT_LANGUAGE, Language, t } from "../i18n/t";
import {
  Caravan,
  CaravanDirection,
  EconomyEvent,
  EconomyState,
  ForeignTownState,
  Good,
  GoodId,
  GoodState,
  UpgradeId,
} from "./types";

const HISTORY_LEN = 40;
export const TICK_MS = 1500;
const EVENT_LOG_CAP = 8;
const DEFAULT_DIFFICULTY: DifficultyId = "normal";
export const TOWN_NAME_MAX_LENGTH = 24;
// A new town starts local-market-only; once its net worth proves the
// player can run an economy, inter-city trade (and the caravan/foreign-
// town system) opens up. Sticky once crossed — see applyTradeUnlock.
export const TRADE_UNLOCK_NET_WORTH = 500;
const DAILY_QUEST_COUNT = 3;

// --- Supply & demand pricing -------------------------------------------
// price = basePrice * (townPriceIndex / 100) * scarcity(supply)
// scarcity = clamp((baseSupply / supply) ^ elasticity, SCARCITY_MIN, SCARCITY_MAX)
// Buying/selling and production/consumption all move `supply`, not price
// directly — price is always a pure function of supply + the town price
// index, so every good's price stays proportional to its base price and
// to the same macro inflation everything else feels.
const SCARCITY_MIN = 0.5;
const SCARCITY_MAX = 2.2;
const SUPPLY_MIN_FACTOR = 0.15;
const SUPPLY_MAX_FACTOR = 3;
const PRODUCTION_NOISE = 0.2; // ± fraction of baseProduction, random per tick
const PRODUCTION_PENALTY_FACTOR = 0.7; // unhappy villagers produce down to 30% of normal
const PRODUCTION_BONUS_FACTOR = 0.15; // content villagers produce up to 15% more
const EFFICIENCY_MIN = 0.3;
const EFFICIENCY_MAX = 1.15;
const FOREIGN_SUPPLY_REVERSION = 0.06; // foreign markets restock toward equilibrium each tick
const FOREIGN_NOISE = 0.15;

// --- Investable assets (gold, oil, stocks) -----------------------------
// A pure random walk (drift + noise, occasionally a fatter-tailed spike)
// bounded so a bad run can't send a price to zero or off to infinity.
const ASSET_MIN_FACTOR = 0.2;
const ASSET_MAX_FACTOR = 6;
const ASSET_SPIKE_CHANCE = 0.03;
const ASSET_SPIKE_MULT = 5;

export const TAX_RATE_MAX = 0.5;
export const TAX_RATE_STEPS = [0, 0.1, 0.2, 0.3, 0.4, 0.5];
// Tax is levied on the town's real output (production × current price, a
// GDP-style base) rather than a flat number, so revenue naturally scales
// with both prices and how much villagers are actually producing.
export const TAX_OUTPUT_FACTOR = 0.008;
const INFLATION_REVERSION_RATE = 0.035; // pull toward the difficulty's baseline drift, per tick
const HAPPINESS_TARGET_SLOPE = 220;
const HAPPINESS_EASE = 0.04;
const PRODUCTION_INFLATION_FACTOR = 0.003;
const CONTENT_BONUS_FACTOR = 0.001;
const ANGRY_THRESHOLD = 20;
const ANGRY_EVENT_CHANCE = 0.1;
const ANGRY_CASH_PENALTY = 25;
const CONTENT_THRESHOLD = 85;
const CONTENT_EVENT_CHANCE = 0.06;
const CONTENT_CASH_BONUS = 15;

// --- Offline progress ----------------------------------------------------
// How long the app was closed is capped so a multi-day absence doesn't
// either freeze the UI simulating tens of thousands of ticks or hand out
// unbounded free progress; a modest, always-fast catch-up is the goal.
export const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000; // 8 hours
// Kept deliberately modest: baseInflationDrift compounds every tick, so
// thousands of simulated ticks would compound even the mild live-session
// drift into hyperinflation almost every time — turning "welcome back"
// into "sorry, it's all gone" regardless of policy. This cap keeps the
// catch-up meaningful (tax income, a caravan or two, a little price
// drift) without exposing an absence to a crash a live player wouldn't
// have hit in the same stretch either.
export const MAX_OFFLINE_TICKS = 240;
export const MIN_OFFLINE_MS_TO_SHOW = 60 * 1000; // don't pop up for a quick app switch

// Rarer than passive news (EVENT_TEMPLATES) so each one feels like a
// distinct moment; freezes the tick loop until answered (see the guard
// at the top of tick()).
const DECISION_EVENT_CHANCE = 0.02;
// A separate, simpler kind of interruption from decisions: a villager just
// wants some of one good, not a policy choice with varied outcomes.
const VILLAGER_REQUEST_CHANCE = 0.018;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scarcityFactor(supply: number, baseSupply: number, elasticity: number): number {
  const ratio = baseSupply / Math.max(supply, 1);
  return clamp(Math.pow(ratio, elasticity), SCARCITY_MIN, SCARCITY_MAX);
}

function priceFromSupply(
  localBasePrice: number,
  baseSupply: number,
  elasticity: number,
  supply: number,
  inflationIndex: number
): number {
  return localBasePrice * (inflationIndex / 100) * scarcityFactor(supply, baseSupply, elasticity);
}

function supplyBounds(good: Good): { min: number; max: number } {
  return { min: good.baseSupply * SUPPLY_MIN_FACTOR, max: good.baseSupply * SUPPLY_MAX_FACTOR };
}

export function estimateTaxIncomePerTick(state: EconomyState): number {
  const taxableOutput = GOODS.reduce(
    (sum, g) => sum + g.baseProduction * state.goods[g.id].price,
    0
  );
  return state.taxRate * taxableOutput * TAX_OUTPUT_FACTOR * (state.happiness / 100);
}

type Action =
  | { type: "TICK" }
  | { type: "SELECT_GOOD"; goodId: GoodId }
  | { type: "TRADE"; goodId: GoodId; side: "buy" | "sell"; qty: number }
  | { type: "TRADE_ASSET"; assetId: AssetId; side: "buy" | "sell"; qty: number }
  | { type: "SEND_CARAVAN"; townId: TownId; goodId: GoodId; direction: CaravanDirection; qty: number }
  | { type: "TOGGLE_PAUSE" }
  | { type: "RESET"; difficulty: DifficultyId }
  | { type: "HYDRATE"; state: EconomyState }
  | { type: "DAILY_CHECKIN"; today: string }
  | { type: "UPGRADE"; upgradeId: UpgradeId }
  | { type: "RESEARCH"; nodeId: string }
  | { type: "SET_TAX_RATE"; rate: number }
  | { type: "OFFLINE_ADVANCE"; ticks: number; elapsedMs: number }
  | { type: "DISMISS_OFFLINE_SUMMARY" }
  | { type: "RESOLVE_DECISION"; optionId: string }
  | { type: "RESOLVE_REQUEST"; give: boolean }
  | { type: "SET_TOWN_NAME"; name: string }
  | { type: "SET_LANGUAGE"; language: Language };

function makeInitialGoodState(good: Good): GoodState {
  return {
    price: good.basePrice,
    history: [good.basePrice],
    supply: good.baseSupply,
    holding: 0,
  };
}

function makeInitialAssetState(asset: (typeof ASSETS)[number]): EconomyState["assets"][AssetId] {
  return { price: asset.basePrice, history: [asset.basePrice], holding: 0, avgCost: 0 };
}

function makeInitialForeignTownState(townId: TownId): ForeignTownState {
  const town = TOWNS_BY_ID[townId];
  const prices = {} as Record<GoodId, number>;
  const supply = {} as Record<GoodId, number>;
  for (const g of GOODS) {
    supply[g.id] = g.baseSupply;
    prices[g.id] = g.basePrice * town.specialty[g.id];
  }
  return { prices, supply };
}

function makeDailyQuests(dateSeed: string): EconomyState["dailyQuests"] {
  return pickDailyQuestTemplates(dateSeed, DAILY_QUEST_COUNT).map((template) => ({
    id: `${dateSeed}-${template.id}`,
    templateId: template.id,
    target: template.target,
    reward: template.reward,
    completed: false,
  }));
}

function initialState(
  difficulty: DifficultyId = DEFAULT_DIFFICULTY,
  language: Language = DEFAULT_LANGUAGE
): EconomyState {
  const config = DIFFICULTIES[difficulty];
  const goods = {} as EconomyState["goods"];
  for (const g of GOODS) {
    goods[g.id] = makeInitialGoodState(g);
  }
  const foreignTowns = {} as EconomyState["foreignTowns"];
  for (const town of TOWNS) {
    foreignTowns[town.id] = makeInitialForeignTownState(town.id);
  }
  const assets = {} as EconomyState["assets"];
  for (const a of ASSETS) {
    assets[a.id] = makeInitialAssetState(a);
  }
  return {
    townName: t(language, "app.defaultTownName"),
    language,
    difficulty,
    cash: config.startingCash,
    tick: 0,
    paused: false,
    inflationIndex: 100,
    inflationHistory: [100],
    inflationRate: config.baseInflationDrift,
    selectedGood: GOODS[0].id,
    goods,
    foreignTowns,
    caravans: [],
    nextId: 1,
    lastEvent: null,
    eventLog: [],
    gameOver: false,
    stats: {
      totalTrades: 0,
      totalCaravansSent: 0,
      totalCaravansCompleted: 0,
      townsTradedWith: [],
    },
    streak: { count: 0, lastOpenedDate: null },
    unlockedAchievements: [],
    tradeUnlocked: false,
    researched: [],
    assets,
    upgrades: { market: 0, caravanserai: 0, townhall: 0, bank: 0 },
    taxRate: 0,
    happiness: 100,
    lastSavedAt: Date.now(),
    offlineSummary: null,
    pendingDecision: null,
    pendingRequest: null,
    dailyProgress: makeInitialDailyProgress(),
    dailyQuests: makeDailyQuests("init"),
  };
}

export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function pushCapped(arr: number[], value: number, cap: number): number[] {
  const next = [...arr, value];
  if (next.length > cap) next.shift();
  return next;
}

function tick(state: EconomyState): EconomyState {
  if (state.paused || state.gameOver || state.pendingDecision || state.pendingRequest) return state;
  const config = DIFFICULTIES[state.difficulty];

  // Villager tax & happiness: happiness drifts toward a level set by the
  // current tax rate; unhappy villagers produce less (a real, lingering
  // supply shortage that pushes prices up through scarcity, plus a small
  // monetary-inflation drag) while happy ones produce a bit more and ease
  // inflation slightly. Computed before inflation so both structural
  // pressures below fold into one target.
  const targetHappiness = clamp(100 - state.taxRate * HAPPINESS_TARGET_SLOPE, 0, 100);
  const happiness = clamp(
    state.happiness + (targetHappiness - state.happiness) * HAPPINESS_EASE,
    0,
    100
  );
  const productionPenalty = clamp((50 - happiness) / 50, 0, 1);
  const contentBonus = clamp((happiness - 70) / 30, 0, 1);
  const productionEfficiency = clamp(
    1 - productionPenalty * PRODUCTION_PENALTY_FACTOR + contentBonus * PRODUCTION_BONUS_FACTOR,
    EFFICIENCY_MIN,
    EFFICIENCY_MAX
  );

  // A pure random walk has no reason to stay near any particular level —
  // over enough ticks (a long session, or an offline catch-up) it drifts
  // to an extreme and, because inflationIndex compounds every tick, that
  // runs away into either a price collapse or a hyperinflation that
  // wasn't earned by anything the player did. Instead inflationRate
  // reverts toward a single target — the difficulty's baseline plus
  // whatever the tax/happiness situation is structurally doing to it
  // right now — so it wanders realistically around wherever policy has
  // it pointed, like a central bank target, rather than off a cliff.
  const inflationTarget = clamp(
    config.baseInflationDrift +
      productionPenalty * PRODUCTION_INFLATION_FACTOR -
      contentBonus * CONTENT_BONUS_FACTOR,
    config.inflationMin,
    config.inflationMax
  );
  let inflationRate = clamp(
    state.inflationRate +
      (inflationTarget - state.inflationRate) * INFLATION_REVERSION_RATE +
      (Math.random() - 0.5) * 0.0012,
    config.inflationMin,
    config.inflationMax
  );

  let nextId = state.nextId;
  const newEvents: EconomyEvent[] = [];
  const supplyShocks: Partial<Record<GoodId, number>> = {};

  const eventSeverity =
    config.eventSeverity * (1 - state.upgrades.townhall * UPGRADES_BY_ID.townhall.effectPerLevel);

  if (Math.random() < config.eventChance) {
    const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
    inflationRate = clamp(
      inflationRate + template.inflationDelta * eventSeverity,
      config.inflationMin,
      config.inflationMax
    );
    if (template.good && template.supplyShockPct) {
      supplyShocks[template.good] = template.supplyShockPct * eventSeverity;
    }
    newEvents.push({
      id: nextId++,
      message: t(state.language, template.messageKey),
      tone: template.tone,
    });
  }

  let pendingDecision: EconomyState["pendingDecision"] = state.pendingDecision;
  if (!pendingDecision && Math.random() < DECISION_EVENT_CHANCE) {
    const template = DECISION_TEMPLATES[Math.floor(Math.random() * DECISION_TEMPLATES.length)];
    pendingDecision = { id: nextId, templateId: template.id, triggeredAtTick: state.tick + 1 };
    newEvents.push({
      id: nextId++,
      message: t(state.language, "msg.decisionPending", { title: t(state.language, template.titleKey) }),
      tone: "neutral",
    });
  }

  let pendingRequest: EconomyState["pendingRequest"] = state.pendingRequest;
  if (!pendingDecision && !pendingRequest && Math.random() < VILLAGER_REQUEST_CHANCE) {
    const { goodId, qty } = rollVillagerRequest();
    pendingRequest = { id: nextId, goodId, qty, triggeredAtTick: state.tick + 1 };
    const good = GOODS_BY_ID[goodId];
    newEvents.push({
      id: nextId++,
      message: t(state.language, "msg.villagerRequestPending", {
        qty,
        good: t(state.language, good.nameKey),
      }),
      tone: "neutral",
    });
  }

  let taxCashDelta = estimateTaxIncomePerTick({ ...state, happiness });
  if (happiness <= ANGRY_THRESHOLD && Math.random() < ANGRY_EVENT_CHANCE) {
    const penalty = Math.min(state.cash + taxCashDelta, ANGRY_CASH_PENALTY);
    taxCashDelta -= penalty;
    newEvents.push({
      id: nextId++,
      message: t(state.language, "msg.angryUprising", { amount: penalty.toFixed(1) }),
      tone: "bad",
    });
  } else if (happiness >= CONTENT_THRESHOLD && Math.random() < CONTENT_EVENT_CHANCE) {
    taxCashDelta += CONTENT_CASH_BONUS;
    newEvents.push({
      id: nextId++,
      message: t(state.language, "msg.contentDonation", { amount: CONTENT_CASH_BONUS }),
      tone: "good",
    });
  }

  const inflationIndex = state.inflationIndex * (1 + inflationRate);
  const inflationHistory = pushCapped(state.inflationHistory, inflationIndex, HISTORY_LEN);

  const goods = { ...state.goods };
  for (const good of GOODS) {
    const gs = goods[good.id];
    const { min: minSupply, max: maxSupply } = supplyBounds(good);
    const noise = 1 + (Math.random() - 0.5) * PRODUCTION_NOISE;
    const researchedProductionMult = researchMultiplier(state.researched, good.id, "production");
    const researchedValueMult = researchMultiplier(state.researched, good.id, "value");
    const production = good.baseProduction * productionEfficiency * noise * researchedProductionMult;
    let supply = gs.supply + (production - good.baseProduction);
    const shockPct = supplyShocks[good.id];
    if (shockPct) supply *= 1 + shockPct;
    supply = clamp(supply, minSupply, maxSupply);
    const price = priceFromSupply(
      good.basePrice * researchedValueMult,
      good.baseSupply,
      good.elasticity,
      supply,
      inflationIndex
    );

    goods[good.id] = {
      ...gs,
      price,
      supply,
      history: pushCapped(gs.history, price, HISTORY_LEN),
    };
  }

  const foreignTowns = { ...state.foreignTowns };
  for (const town of TOWNS) {
    const ts = foreignTowns[town.id];
    const prices = { ...ts.prices };
    const supply = { ...ts.supply };
    for (const good of GOODS) {
      const { min: minSupply, max: maxSupply } = supplyBounds(good);
      const s = supply[good.id];
      const reverted =
        s +
        (good.baseSupply - s) * FOREIGN_SUPPLY_REVERSION +
        (Math.random() - 0.5) * good.baseProduction * FOREIGN_NOISE;
      const clamped = clamp(reverted, minSupply, maxSupply);
      supply[good.id] = clamped;
      const researchedValueMult = researchMultiplier(state.researched, good.id, "value");
      prices[good.id] = priceFromSupply(
        good.basePrice * town.specialty[good.id] * researchedValueMult,
        good.baseSupply,
        good.elasticity,
        clamped,
        inflationIndex
      );
    }
    foreignTowns[town.id] = { prices, supply };
  }

  const assets = { ...state.assets };
  for (const asset of ASSETS) {
    const as = assets[asset.id];
    let noise = (Math.random() - 0.5) * 2 * asset.volatility;
    if (Math.random() < ASSET_SPIKE_CHANCE) {
      noise += (Math.random() - 0.5) * 2 * asset.volatility * ASSET_SPIKE_MULT;
    }
    const price = clamp(
      as.price * (1 + asset.drift + noise),
      asset.basePrice * ASSET_MIN_FACTOR,
      asset.basePrice * ASSET_MAX_FACTOR
    );
    assets[asset.id] = { ...as, price, history: pushCapped(as.history, price, HISTORY_LEN) };
  }

  const nextTick = state.tick + 1;
  const stillTraveling: Caravan[] = [];
  let cash = state.cash + taxCashDelta;
  let dailyCashEarned = state.dailyProgress.cashEarned + Math.max(0, taxCashDelta);
  let totalCaravansCompleted = state.stats.totalCaravansCompleted;
  for (const caravan of state.caravans) {
    if (caravan.arrivesAtTick > nextTick) {
      stillTraveling.push(caravan);
      continue;
    }
    const town = TOWNS_BY_ID[caravan.townId];
    const good = GOODS_BY_ID[caravan.goodId];
    totalCaravansCompleted += 1;
    if (caravan.direction === "export") {
      cash += caravan.amount;
      dailyCashEarned += caravan.amount;
      newEvents.push({
        id: nextId++,
        message: t(state.language, "msg.caravanReturnedExport", {
          town: t(state.language, town.nameKey),
          amount: caravan.amount.toFixed(1),
          qty: caravan.qty,
          good: t(state.language, good.nameKey),
        }),
        tone: "good",
      });
    } else {
      const gs = goods[caravan.goodId];
      goods[caravan.goodId] = { ...gs, holding: gs.holding + caravan.amount };
      newEvents.push({
        id: nextId++,
        message: t(state.language, "msg.caravanReturnedImport", {
          town: t(state.language, town.nameKey),
          qty: caravan.amount,
          good: t(state.language, good.nameKey),
        }),
        tone: "good",
      });
    }
  }

  const gameOver = inflationIndex >= config.hyperinflationIndex;
  if (gameOver && !state.gameOver) {
    newEvents.push({
      id: nextId++,
      message: t(state.language, "msg.hyperinflationGameOver"),
      tone: "bad",
    });
  }

  const lastEvent = newEvents.length > 0 ? newEvents[newEvents.length - 1] : state.lastEvent;
  const eventLog =
    newEvents.length > 0
      ? [...newEvents].reverse().concat(state.eventLog).slice(0, EVENT_LOG_CAP)
      : state.eventLog;

  return {
    ...state,
    tick: nextTick,
    inflationRate,
    inflationIndex,
    inflationHistory,
    goods,
    foreignTowns,
    assets,
    caravans: stillTraveling,
    cash,
    happiness,
    nextId,
    lastEvent,
    eventLog,
    gameOver,
    paused: gameOver ? true : state.paused,
    stats: { ...state.stats, totalCaravansCompleted },
    lastSavedAt: Date.now(),
    pendingDecision,
    pendingRequest,
    dailyProgress: { ...state.dailyProgress, cashEarned: dailyCashEarned },
  };
}

function trade(state: EconomyState, goodId: GoodId, side: "buy" | "sell", qty: number): EconomyState {
  if (state.gameOver) return state;
  const good = GOODS_BY_ID[goodId];
  const gs = state.goods[goodId];
  const price = gs.price;
  // A deeper Pazar Yeri means the same order moves supply (and so price)
  // proportionally less — real market depth, not an arbitrary damper.
  const marketDepth = 1 + state.upgrades.market * UPGRADES_BY_ID.market.effectPerLevel;
  const { min: minSupply, max: maxSupply } = supplyBounds(good);

  if (side === "buy") {
    const affordable = Math.floor(state.cash / price);
    const amount = Math.min(qty, affordable);
    if (amount <= 0) return state;
    const cost = amount * price;
    return {
      ...state,
      cash: state.cash - cost,
      goods: {
        ...state.goods,
        [goodId]: {
          ...gs,
          holding: gs.holding + amount,
          supply: clamp(gs.supply - amount / marketDepth, minSupply, maxSupply),
        },
      },
      stats: { ...state.stats, totalTrades: state.stats.totalTrades + 1 },
      dailyProgress: { ...state.dailyProgress, trades: state.dailyProgress.trades + 1 },
    };
  }

  const amount = Math.min(qty, gs.holding);
  if (amount <= 0) return state;
  const proceeds = amount * price;
  return {
    ...state,
    cash: state.cash + proceeds,
    goods: {
      ...state.goods,
      [goodId]: {
        ...gs,
        holding: gs.holding - amount,
        supply: clamp(gs.supply + amount / marketDepth, minSupply, maxSupply),
      },
    },
    stats: { ...state.stats, totalTrades: state.stats.totalTrades + 1 },
    dailyProgress: {
      ...state.dailyProgress,
      trades: state.dailyProgress.trades + 1,
      cashEarned: state.dailyProgress.cashEarned + proceeds,
    },
  };
}

function tradeAsset(
  state: EconomyState,
  assetId: AssetId,
  side: "buy" | "sell",
  qty: number
): EconomyState {
  if (state.gameOver) return state;
  const as = state.assets[assetId];
  const price = as.price;

  if (side === "buy") {
    const affordable = Math.floor(state.cash / price);
    const amount = Math.min(qty, affordable);
    if (amount <= 0) return state;
    const cost = amount * price;
    const holding = as.holding + amount;
    const avgCost = (as.avgCost * as.holding + cost) / holding;
    return {
      ...state,
      cash: state.cash - cost,
      assets: { ...state.assets, [assetId]: { ...as, holding, avgCost } },
    };
  }

  const amount = Math.min(qty, as.holding);
  if (amount <= 0) return state;
  const proceeds = amount * price;
  const holding = as.holding - amount;
  // Realized profit/loss vs. the cost basis, surfaced right in the event
  // feed — the whole point of a speculative market is seeing whether a
  // sale landed above or below what was paid for it.
  const pnl = (price - as.avgCost) * amount;
  const asset = ASSETS_BY_ID[assetId];
  const message = t(state.language, pnl >= 0 ? "msg.investSoldProfit" : "msg.investSoldLoss", {
    asset: t(state.language, asset.nameKey),
    qty: amount,
    amount: Math.abs(pnl).toFixed(1),
  });
  const event: EconomyEvent = { id: state.nextId, message, tone: pnl >= 0 ? "good" : "bad" };
  return {
    ...state,
    cash: state.cash + proceeds,
    assets: {
      ...state.assets,
      [assetId]: { ...as, holding, avgCost: holding > 0 ? as.avgCost : 0 },
    },
    nextId: state.nextId + 1,
    lastEvent: event,
    eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
  };
}

function sendCaravan(
  state: EconomyState,
  townId: TownId,
  goodId: GoodId,
  direction: CaravanDirection,
  qty: number
): EconomyState {
  if (state.gameOver || qty <= 0) return state;
  const town = TOWNS_BY_ID[townId];
  const good = GOODS_BY_ID[goodId];
  const townState = state.foreignTowns[townId];
  const price = townState.prices[goodId];
  const gs = state.goods[goodId];
  const townsTradedWith = state.stats.townsTradedWith.includes(townId)
    ? state.stats.townsTradedWith
    : [...state.stats.townsTradedWith, townId];
  const townsTradedToday = state.dailyProgress.townsTraded.includes(townId)
    ? state.dailyProgress.townsTraded
    : [...state.dailyProgress.townsTraded, townId];
  const tariffRate = Math.max(
    0,
    town.tariffRate - state.upgrades.caravanserai * UPGRADES_BY_ID.caravanserai.effectPerLevel
  );
  const { min: minSupply, max: maxSupply } = supplyBounds(good);

  if (direction === "export") {
    const amount = Math.min(qty, gs.holding);
    if (amount <= 0) return state;
    const gross = amount * price;
    const net = gross * (1 - tariffRate);
    const caravan: Caravan = {
      id: state.nextId,
      townId,
      goodId,
      direction,
      qty: amount,
      amount: net,
      departedTick: state.tick,
      arrivesAtTick: state.tick + town.distanceTicks,
    };
    return {
      ...state,
      nextId: state.nextId + 1,
      goods: { ...state.goods, [goodId]: { ...gs, holding: gs.holding - amount } },
      // Dumping goods into their market floods it — their supply rises
      // and that good gets cheaper there for the next trader.
      foreignTowns: {
        ...state.foreignTowns,
        [townId]: {
          ...townState,
          supply: {
            ...townState.supply,
            [goodId]: clamp(townState.supply[goodId] + amount, minSupply, maxSupply),
          },
        },
      },
      caravans: [...state.caravans, caravan],
      stats: {
        ...state.stats,
        totalCaravansSent: state.stats.totalCaravansSent + 1,
        townsTradedWith,
      },
      dailyProgress: {
        ...state.dailyProgress,
        caravansSent: state.dailyProgress.caravansSent + 1,
        townsTraded: townsTradedToday,
      },
    };
  }

  const affordable = Math.floor(state.cash / (price * (1 + tariffRate)));
  const amount = Math.min(qty, affordable);
  if (amount <= 0) return state;
  const cost = amount * price * (1 + tariffRate);
  const caravan: Caravan = {
    id: state.nextId,
    townId,
    goodId,
    direction,
    qty: amount,
    amount,
    departedTick: state.tick,
    arrivesAtTick: state.tick + town.distanceTicks,
  };
  return {
    ...state,
    nextId: state.nextId + 1,
    cash: state.cash - cost,
    // Buying out their stock drains their supply — the same good gets
    // pricier there, so repeatedly importing the same thing gets worse.
    foreignTowns: {
      ...state.foreignTowns,
      [townId]: {
        ...townState,
        supply: {
          ...townState.supply,
          [goodId]: clamp(townState.supply[goodId] - amount, minSupply, maxSupply),
        },
      },
    },
    caravans: [...state.caravans, caravan],
    stats: {
      ...state.stats,
      totalCaravansSent: state.stats.totalCaravansSent + 1,
      townsTradedWith,
    },
    dailyProgress: {
      ...state.dailyProgress,
      caravansSent: state.dailyProgress.caravansSent + 1,
      townsTraded: townsTradedToday,
    },
  };
}

const DAILY_BONUS_BASE = 20;
const DAILY_BONUS_PER_STREAK_DAY = 8;
const DAILY_BONUS_CAP = 90;
const MS_PER_DAY = 86400000;

function dailyCheckIn(state: EconomyState, today: string): EconomyState {
  const prevDate = state.streak.lastOpenedDate;
  if (prevDate === today) return state;

  let count: number;
  if (prevDate) {
    const diffDays = Math.round(
      (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${prevDate}T00:00:00Z`)) / MS_PER_DAY
    );
    count = diffDays === 1 ? state.streak.count + 1 : 1;
  } else {
    count = 1;
  }

  const bankBonus = state.upgrades.bank * UPGRADES_BY_ID.bank.effectPerLevel;
  const bonus =
    Math.min(DAILY_BONUS_BASE + (count - 1) * DAILY_BONUS_PER_STREAK_DAY, DAILY_BONUS_CAP) +
    bankBonus;
  const message = prevDate
    ? t(state.language, "msg.dailyCheckInReturning", { count, bonus })
    : t(state.language, "msg.dailyCheckInFirst", { bonus });
  const event: EconomyEvent = { id: state.nextId, message, tone: "good" };

  return {
    ...state,
    cash: state.cash + bonus,
    nextId: state.nextId + 1,
    streak: { count, lastOpenedDate: today },
    lastEvent: event,
    eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
    // A genuinely new day (this function only reaches here when one
    // started) resets the daily quest board and its progress counters.
    dailyProgress: makeInitialDailyProgress(),
    dailyQuests: makeDailyQuests(today),
  };
}

function upgrade(state: EconomyState, upgradeId: UpgradeId): EconomyState {
  if (state.gameOver) return state;
  const def = UPGRADES_BY_ID[upgradeId];
  const level = state.upgrades[upgradeId];
  if (level >= def.maxLevel) return state;
  const cost = upgradeCost(def, level);
  if (state.cash < cost) return state;
  return {
    ...state,
    cash: state.cash - cost,
    upgrades: { ...state.upgrades, [upgradeId]: level + 1 },
    dailyProgress: {
      ...state.dailyProgress,
      upgradesBought: state.dailyProgress.upgradesBought + 1,
    },
  };
}

function research(state: EconomyState, nodeId: string): EconomyState {
  if (state.gameOver) return state;
  if (state.researched.includes(nodeId)) return state;
  const node = RESEARCH_NODES_BY_ID[nodeId];
  if (!node) return state;
  if (node.requires && !state.researched.includes(node.requires)) return state;
  if (state.cash < node.cost) return state;
  return {
    ...state,
    cash: state.cash - node.cost,
    researched: [...state.researched, nodeId],
  };
}

function setTaxRate(state: EconomyState, rate: number): EconomyState {
  if (state.gameOver) return state;
  return { ...state, taxRate: clamp(rate, 0, TAX_RATE_MAX) };
}

function setTownName(state: EconomyState, name: string): EconomyState {
  const trimmed = name.trim().slice(0, TOWN_NAME_MAX_LENGTH);
  if (!trimmed) return state;
  return { ...state, townName: trimmed };
}

function setLanguage(state: EconomyState, language: Language): EconomyState {
  return { ...state, language };
}

function computeNetWorth(state: EconomyState): number {
  return (
    state.cash +
    GOODS.reduce((sum, g) => sum + state.goods[g.id].holding * state.goods[g.id].price, 0) +
    ASSETS.reduce((sum, a) => sum + state.assets[a.id].holding * state.assets[a.id].price, 0)
  );
}

function applyAchievements(state: EconomyState): EconomyState {
  const netWorth = computeNetWorth(state);
  const newlyUnlocked = ACHIEVEMENTS.filter(
    (a) => !state.unlockedAchievements.includes(a.id) && a.progress(state, netWorth) >= a.target
  );
  if (newlyUnlocked.length === 0) return state;

  let nextId = state.nextId;
  let cash = state.cash;
  const newEvents: EconomyEvent[] = [];
  for (const a of newlyUnlocked) {
    cash += a.reward;
    newEvents.push({
      id: nextId++,
      message: t(state.language, "msg.achievementUnlocked", {
        icon: a.icon,
        title: t(state.language, a.titleKey),
        reward: a.reward,
      }),
      tone: "good",
    });
  }

  return {
    ...state,
    cash,
    nextId,
    unlockedAchievements: [...state.unlockedAchievements, ...newlyUnlocked.map((a) => a.id)],
    lastEvent: newEvents[newEvents.length - 1],
    eventLog: [...newEvents].reverse().concat(state.eventLog).slice(0, EVENT_LOG_CAP),
  };
}

function applyTradeUnlock(state: EconomyState): EconomyState {
  if (state.tradeUnlocked) return state;
  if (computeNetWorth(state) < TRADE_UNLOCK_NET_WORTH) return state;

  const event: EconomyEvent = {
    id: state.nextId,
    message: t(state.language, "msg.tradeUnlocked"),
    tone: "good",
  };
  return {
    ...state,
    tradeUnlocked: true,
    nextId: state.nextId + 1,
    lastEvent: event,
    eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
  };
}

function applyDailyQuests(state: EconomyState): EconomyState {
  const newlyCompleted = state.dailyQuests.filter((q) => {
    if (q.completed) return false;
    const template = QUEST_TEMPLATES_BY_ID[q.templateId];
    return !!template && template.progress(state.dailyProgress) >= q.target;
  });
  if (newlyCompleted.length === 0) return state;

  let nextId = state.nextId;
  let cash = state.cash;
  const newEvents: EconomyEvent[] = [];
  const completedIds = new Set(newlyCompleted.map((q) => q.id));
  for (const q of newlyCompleted) {
    const template = QUEST_TEMPLATES_BY_ID[q.templateId];
    cash += q.reward;
    newEvents.push({
      id: nextId++,
      message: t(state.language, "msg.questCompleted", {
        icon: template.icon,
        title: t(state.language, template.titleKey),
        reward: q.reward,
      }),
      tone: "good",
    });
  }

  return {
    ...state,
    cash,
    nextId,
    dailyQuests: state.dailyQuests.map((q) =>
      completedIds.has(q.id) ? { ...q, completed: true } : q
    ),
    lastEvent: newEvents[newEvents.length - 1],
    eventLog: [...newEvents].reverse().concat(state.eventLog).slice(0, EVENT_LOG_CAP),
  };
}

function offlineAdvance(state: EconomyState, ticks: number, elapsedMs: number): EconomyState {
  if (ticks <= 0) return state;
  const beforeCash = state.cash;
  const beforeNetWorth = computeNetWorth(state);
  const beforeAchievements = state.unlockedAchievements;
  const beforeCompletedQuests = state.dailyQuests.filter((q) => q.completed).map((q) => q.id);
  const beforeCaravansCompleted = state.stats.totalCaravansCompleted;
  const wasGameOver = state.gameOver;

  let s = state;
  for (let i = 0; i < ticks; i++) {
    s = tick(s);
  }
  s = applyTradeUnlock(applyDailyQuests(applyAchievements(s)));

  const newAchievements = s.unlockedAchievements
    .filter((id) => !beforeAchievements.includes(id))
    .map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.titleKey)
    .filter((titleKey): titleKey is string => !!titleKey)
    .map((titleKey) => t(s.language, titleKey));

  const newQuests = s.dailyQuests
    .filter((q) => q.completed && !beforeCompletedQuests.includes(q.id))
    .map((q) => QUEST_TEMPLATES_BY_ID[q.templateId]?.titleKey)
    .filter((titleKey): titleKey is string => !!titleKey)
    .map((titleKey) => t(s.language, titleKey));

  const summary = {
    elapsedMs,
    ticksSimulated: ticks,
    cashDelta: s.cash - beforeCash,
    netWorthDelta: computeNetWorth(s) - beforeNetWorth,
    caravansCompleted: s.stats.totalCaravansCompleted - beforeCaravansCompleted,
    newAchievements,
    newQuests,
    hyperinflationHappened: !wasGameOver && s.gameOver,
    recentEvents: s.eventLog.slice(0, 5),
  };

  return { ...s, offlineSummary: summary };
}

function dismissOfflineSummary(state: EconomyState): EconomyState {
  return { ...state, offlineSummary: null };
}

function resolveDecision(state: EconomyState, optionId: string): EconomyState {
  if (!state.pendingDecision) return state;
  const template = DECISION_TEMPLATES_BY_ID[state.pendingDecision.templateId];
  if (!template) return { ...state, pendingDecision: null };
  return template.resolve(state, optionId);
}

function resolveVillagerRequest(state: EconomyState, give: boolean): EconomyState {
  const request = state.pendingRequest;
  if (!request) return state;
  const good = GOODS_BY_ID[request.goodId];
  const gs = state.goods[request.goodId];

  function outcome(
    messageKey: string,
    params: Record<string, string | number> | undefined,
    tone: EconomyEvent["tone"],
    patch: Partial<EconomyState>
  ) {
    const event: EconomyEvent = { id: state.nextId, message: t(state.language, messageKey, params), tone };
    return {
      ...state,
      ...patch,
      pendingRequest: null,
      nextId: state.nextId + 1,
      lastEvent: event,
      eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
    };
  }

  const goodName = t(state.language, good.nameKey);

  if (give) {
    if (gs.holding < request.qty) {
      return outcome("msg.villagerGiveInsufficient", { good: goodName }, "neutral", {});
    }
    return outcome(
      "msg.villagerGiveSuccess",
      { qty: request.qty, good: goodName, amount: VILLAGER_REQUEST_GIVE_HAPPINESS },
      "good",
      {
        goods: { ...state.goods, [request.goodId]: { ...gs, holding: gs.holding - request.qty } },
        happiness: clamp(state.happiness + VILLAGER_REQUEST_GIVE_HAPPINESS, 0, 100),
      }
    );
  }

  return outcome(
    "msg.villagerRefuse",
    { amount: VILLAGER_REQUEST_REFUSE_HAPPINESS },
    "bad",
    { happiness: clamp(state.happiness - VILLAGER_REQUEST_REFUSE_HAPPINESS, 0, 100) }
  );
}

function baseReducer(state: EconomyState, action: Action): EconomyState {
  switch (action.type) {
    case "TICK":
      return tick(state);
    case "SELECT_GOOD":
      return { ...state, selectedGood: action.goodId };
    case "TRADE":
      return trade(state, action.goodId, action.side, action.qty);
    case "TRADE_ASSET":
      return tradeAsset(state, action.assetId, action.side, action.qty);
    case "SEND_CARAVAN":
      return sendCaravan(state, action.townId, action.goodId, action.direction, action.qty);
    case "TOGGLE_PAUSE":
      return state.gameOver ? state : { ...state, paused: !state.paused };
    case "RESET":
      // A new difficulty starts the economy over, but the player's
      // chosen town name and language are identity, not run state — keep them.
      return {
        ...initialState(action.difficulty, state.language),
        townName: state.townName,
      };
    case "HYDRATE":
      return action.state;
    case "DAILY_CHECKIN":
      return dailyCheckIn(state, action.today);
    case "UPGRADE":
      return upgrade(state, action.upgradeId);
    case "RESEARCH":
      return research(state, action.nodeId);
    case "SET_TAX_RATE":
      return setTaxRate(state, action.rate);
    case "OFFLINE_ADVANCE":
      return offlineAdvance(state, action.ticks, action.elapsedMs);
    case "DISMISS_OFFLINE_SUMMARY":
      return dismissOfflineSummary(state);
    case "RESOLVE_DECISION":
      return resolveDecision(state, action.optionId);
    case "RESOLVE_REQUEST":
      return resolveVillagerRequest(state, action.give);
    case "SET_TOWN_NAME":
      return setTownName(state, action.name);
    case "SET_LANGUAGE":
      return setLanguage(state, action.language);
    default:
      return state;
  }
}

function reducer(state: EconomyState, action: Action): EconomyState {
  const next = baseReducer(state, action);
  if (next === state || action.type === "RESET") return next;
  return applyTradeUnlock(applyDailyQuests(applyAchievements(next)));
}

export function useEconomy() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    intervalRef.current = setInterval(() => dispatch({ type: "TICK" }), TICK_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Load any previous save once on mount, fast-forward the town through
  // however long the app was closed, then start persisting future changes.
  useEffect(() => {
    let cancelled = false;
    loadEconomyState().then((saved) => {
      if (cancelled) return;
      if (saved) {
        dispatch({ type: "HYDRATE", state: saved });
        const lastSavedAt = saved.lastSavedAt ?? Date.now();
        const elapsedMs = clamp(Date.now() - lastSavedAt, 0, MAX_OFFLINE_MS);
        const ticks = Math.min(Math.floor(elapsedMs / TICK_MS), MAX_OFFLINE_TICKS);
        if (ticks > 0 && elapsedMs >= MIN_OFFLINE_MS_TO_SHOW) {
          dispatch({ type: "OFFLINE_ADVANCE", ticks, elapsedMs });
        }
      }
      dispatch({ type: "DAILY_CHECKIN", today: todayString() });
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveEconomyState(state);
  }, [state, hydrated]);

  const selectGood = useCallback((goodId: GoodId) => dispatch({ type: "SELECT_GOOD", goodId }), []);
  const trade_ = useCallback(
    (goodId: GoodId, side: "buy" | "sell", qty: number) => dispatch({ type: "TRADE", goodId, side, qty }),
    []
  );
  const sendCaravan_ = useCallback(
    (townId: TownId, goodId: GoodId, direction: CaravanDirection, qty: number) =>
      dispatch({ type: "SEND_CARAVAN", townId, goodId, direction, qty }),
    []
  );
  const togglePause = useCallback(() => dispatch({ type: "TOGGLE_PAUSE" }), []);
  const reset = useCallback(
    (difficulty: DifficultyId) => dispatch({ type: "RESET", difficulty }),
    []
  );
  const upgrade_ = useCallback(
    (upgradeId: UpgradeId) => dispatch({ type: "UPGRADE", upgradeId }),
    []
  );
  const research_ = useCallback((nodeId: string) => dispatch({ type: "RESEARCH", nodeId }), []);
  const tradeAsset_ = useCallback(
    (assetId: AssetId, side: "buy" | "sell", qty: number) =>
      dispatch({ type: "TRADE_ASSET", assetId, side, qty }),
    []
  );
  const setTaxRate_ = useCallback((rate: number) => dispatch({ type: "SET_TAX_RATE", rate }), []);
  const dismissOfflineSummary = useCallback(() => dispatch({ type: "DISMISS_OFFLINE_SUMMARY" }), []);
  const resolveDecision_ = useCallback(
    (optionId: string) => dispatch({ type: "RESOLVE_DECISION", optionId }),
    []
  );
  const resolveRequest = useCallback(
    (give: boolean) => dispatch({ type: "RESOLVE_REQUEST", give }),
    []
  );
  const setTownName = useCallback((name: string) => dispatch({ type: "SET_TOWN_NAME", name }), []);
  const setLanguage_ = useCallback(
    (language: Language) => dispatch({ type: "SET_LANGUAGE", language }),
    []
  );
  const translate = useCallback(
    (key: string, params?: Record<string, string | number>) => t(state.language, key, params),
    [state.language]
  );

  const portfolioValue = GOODS.reduce(
    (sum, g) => sum + state.goods[g.id].holding * state.goods[g.id].price,
    0
  );
  const assetsValue = ASSETS.reduce(
    (sum, a) => sum + state.assets[a.id].holding * state.assets[a.id].price,
    0
  );
  const netWorth = state.cash + portfolioValue + assetsValue;

  return {
    state,
    selectGood,
    trade: trade_,
    sendCaravan: sendCaravan_,
    togglePause,
    reset,
    upgrade: upgrade_,
    research: research_,
    tradeAsset: tradeAsset_,
    setTaxRate: setTaxRate_,
    dismissOfflineSummary,
    resolveDecision: resolveDecision_,
    resolveRequest,
    setTownName,
    setLanguage: setLanguage_,
    t: translate,
    portfolioValue,
    assetsValue,
    netWorth,
    hydrated,
  };
}

export { GOODS, GOODS_BY_ID };
