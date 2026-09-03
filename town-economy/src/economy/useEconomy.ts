import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ACHIEVEMENTS } from "./achievements";
import { DIFFICULTIES, DifficultyId } from "./difficulty";
import { GOODS, GOODS_BY_ID } from "./goods";
import { EVENT_TEMPLATES } from "./events";
import { loadEconomyState, saveEconomyState } from "./persist";
import { TOWNS, TOWNS_BY_ID, TownId } from "./towns";
import { UPGRADES, UPGRADES_BY_ID, upgradeCost } from "./upgrades";
import {
  Caravan,
  CaravanDirection,
  EconomyEvent,
  EconomyState,
  ForeignTownState,
  GoodId,
  GoodState,
  UpgradeId,
} from "./types";

const HISTORY_LEN = 40;
export const TICK_MS = 1500;
const BUY_IMPACT = 0.006;
const EVENT_LOG_CAP = 8;
const FOREIGN_VOLATILITY_FACTOR = 0.6;
const FOREIGN_INFLATION_FACTOR = 0.5;
const DEFAULT_DIFFICULTY: DifficultyId = "normal";

type Action =
  | { type: "TICK" }
  | { type: "SELECT_GOOD"; goodId: GoodId }
  | { type: "TRADE"; goodId: GoodId; side: "buy" | "sell"; qty: number }
  | { type: "SEND_CARAVAN"; townId: TownId; goodId: GoodId; direction: CaravanDirection; qty: number }
  | { type: "TOGGLE_PAUSE" }
  | { type: "RESET"; difficulty: DifficultyId }
  | { type: "HYDRATE"; state: EconomyState }
  | { type: "DAILY_CHECKIN"; today: string }
  | { type: "UPGRADE"; upgradeId: UpgradeId };

function makeInitialGoodState(basePrice: number): GoodState {
  return {
    price: basePrice,
    history: [basePrice],
    momentum: 0,
    holding: 0,
  };
}

function makeInitialForeignTownState(townId: TownId): ForeignTownState {
  const town = TOWNS_BY_ID[townId];
  const prices = {} as Record<GoodId, number>;
  const momentum = {} as Record<GoodId, number>;
  for (const g of GOODS) {
    prices[g.id] = g.basePrice * town.multipliers[g.id];
    momentum[g.id] = 0;
  }
  return { prices, momentum };
}

function initialState(difficulty: DifficultyId = DEFAULT_DIFFICULTY): EconomyState {
  const config = DIFFICULTIES[difficulty];
  const goods = {} as EconomyState["goods"];
  for (const g of GOODS) {
    goods[g.id] = makeInitialGoodState(g.basePrice);
  }
  const foreignTowns = {} as EconomyState["foreignTowns"];
  for (const t of TOWNS) {
    foreignTowns[t.id] = makeInitialForeignTownState(t.id);
  }
  return {
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
    upgrades: { market: 0, caravanserai: 0, townhall: 0, bank: 0 },
  };
}

export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pushCapped(arr: number[], value: number, cap: number): number[] {
  const next = [...arr, value];
  if (next.length > cap) next.shift();
  return next;
}

function tick(state: EconomyState): EconomyState {
  if (state.paused || state.gameOver) return state;
  const config = DIFFICULTIES[state.difficulty];

  let inflationRate = clamp(
    state.inflationRate + (Math.random() - 0.5) * 0.0012,
    config.inflationMin,
    config.inflationMax
  );

  let nextId = state.nextId;
  const newEvents: EconomyEvent[] = [];
  const goodMomentumBoost: Partial<Record<GoodId, number>> = {};

  const eventSeverity =
    config.eventSeverity * (1 - state.upgrades.townhall * UPGRADES_BY_ID.townhall.effectPerLevel);

  if (Math.random() < config.eventChance) {
    const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
    inflationRate = clamp(
      inflationRate + template.inflationDelta * eventSeverity,
      config.inflationMin,
      config.inflationMax
    );
    if (template.good && template.goodMomentum) {
      goodMomentumBoost[template.good] = template.goodMomentum;
    }
    newEvents.push({ id: nextId++, message: template.message, tone: template.tone });
  }

  const inflationIndex = state.inflationIndex * (1 + inflationRate);
  const inflationHistory = pushCapped(state.inflationHistory, inflationIndex, HISTORY_LEN);

  const goods = { ...state.goods };
  for (const good of GOODS) {
    const gs = goods[good.id];
    let momentum = gs.momentum * 0.85 + (Math.random() - 0.5) * good.volatility;
    momentum += goodMomentumBoost[good.id] ?? 0;
    momentum = clamp(momentum, -0.25, 0.25);

    const pctChange = inflationRate * good.inflationSensitivity + momentum;
    const price = Math.max(0.2, gs.price * (1 + pctChange));

    goods[good.id] = {
      ...gs,
      price,
      momentum,
      history: pushCapped(gs.history, price, HISTORY_LEN),
    };
  }

  const foreignTowns = { ...state.foreignTowns };
  for (const town of TOWNS) {
    const ts = foreignTowns[town.id];
    const prices = { ...ts.prices };
    const momentum = { ...ts.momentum };
    for (const good of GOODS) {
      let m = momentum[good.id] * 0.85 + (Math.random() - 0.5) * good.volatility * FOREIGN_VOLATILITY_FACTOR;
      m = clamp(m, -0.2, 0.2);
      const pct = inflationRate * FOREIGN_INFLATION_FACTOR * good.inflationSensitivity + m;
      prices[good.id] = Math.max(0.15, prices[good.id] * (1 + pct));
      momentum[good.id] = m;
    }
    foreignTowns[town.id] = { prices, momentum };
  }

  const nextTick = state.tick + 1;
  const stillTraveling: Caravan[] = [];
  let cash = state.cash;
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
      newEvents.push({
        id: nextId++,
        message: `🚚 Kervan ${town.name}'dan döndü: +${caravan.amount.toFixed(1)} 🪙 (${caravan.qty} ${good.name})`,
        tone: "good",
      });
    } else {
      const gs = goods[caravan.goodId];
      goods[caravan.goodId] = { ...gs, holding: gs.holding + caravan.amount };
      newEvents.push({
        id: nextId++,
        message: `🚚 Kervan ${town.name}'dan döndü: ${caravan.amount} ${good.name} teslim edildi`,
        tone: "good",
      });
    }
  }

  const gameOver = inflationIndex >= config.hyperinflationIndex;
  if (gameOver && !state.gameOver) {
    newEvents.push({
      id: nextId++,
      message: "Hiperenflasyon! Kasaba ekonomisi çöktü. Yeniden başlat.",
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
    caravans: stillTraveling,
    cash,
    nextId,
    lastEvent,
    eventLog,
    gameOver,
    paused: gameOver ? true : state.paused,
    stats: { ...state.stats, totalCaravansCompleted },
  };
}

function trade(state: EconomyState, goodId: GoodId, side: "buy" | "sell", qty: number): EconomyState {
  if (state.gameOver) return state;
  const gs = state.goods[goodId];
  const price = gs.price;
  const impact =
    BUY_IMPACT * (1 - state.upgrades.market * UPGRADES_BY_ID.market.effectPerLevel);

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
          momentum: clamp(gs.momentum + amount * impact, -0.25, 0.25),
        },
      },
      stats: { ...state.stats, totalTrades: state.stats.totalTrades + 1 },
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
        momentum: clamp(gs.momentum - amount * impact, -0.25, 0.25),
      },
    },
    stats: { ...state.stats, totalTrades: state.stats.totalTrades + 1 },
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
  const townState = state.foreignTowns[townId];
  const price = townState.prices[goodId];
  const gs = state.goods[goodId];
  const townsTradedWith = state.stats.townsTradedWith.includes(townId)
    ? state.stats.townsTradedWith
    : [...state.stats.townsTradedWith, townId];
  const tariffRate = Math.max(
    0,
    town.tariffRate - state.upgrades.caravanserai * UPGRADES_BY_ID.caravanserai.effectPerLevel
  );

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
      caravans: [...state.caravans, caravan],
      stats: {
        ...state.stats,
        totalCaravansSent: state.stats.totalCaravansSent + 1,
        townsTradedWith,
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
    caravans: [...state.caravans, caravan],
    stats: {
      ...state.stats,
      totalCaravansSent: state.stats.totalCaravansSent + 1,
      townsTradedWith,
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
    ? `🌅 Hoş geldin! ${count}. gün üst üste giriş serisi. +${bonus} 🪙 günlük bonus.`
    : `🌅 Kasabana hoş geldin! Günlük giriş serin başladı. +${bonus} 🪙 bonus.`;
  const event: EconomyEvent = { id: state.nextId, message, tone: "good" };

  return {
    ...state,
    cash: state.cash + bonus,
    nextId: state.nextId + 1,
    streak: { count, lastOpenedDate: today },
    lastEvent: event,
    eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
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
  };
}

function computeNetWorth(state: EconomyState): number {
  return (
    state.cash +
    GOODS.reduce((sum, g) => sum + state.goods[g.id].holding * state.goods[g.id].price, 0)
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
      message: `🏆 Başarım kazanıldı: ${a.icon} ${a.title} (+${a.reward} 🪙)`,
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

function baseReducer(state: EconomyState, action: Action): EconomyState {
  switch (action.type) {
    case "TICK":
      return tick(state);
    case "SELECT_GOOD":
      return { ...state, selectedGood: action.goodId };
    case "TRADE":
      return trade(state, action.goodId, action.side, action.qty);
    case "SEND_CARAVAN":
      return sendCaravan(state, action.townId, action.goodId, action.direction, action.qty);
    case "TOGGLE_PAUSE":
      return state.gameOver ? state : { ...state, paused: !state.paused };
    case "RESET":
      return initialState(action.difficulty);
    case "HYDRATE":
      return action.state;
    case "DAILY_CHECKIN":
      return dailyCheckIn(state, action.today);
    case "UPGRADE":
      return upgrade(state, action.upgradeId);
    default:
      return state;
  }
}

function reducer(state: EconomyState, action: Action): EconomyState {
  const next = baseReducer(state, action);
  if (next === state || action.type === "RESET") return next;
  return applyAchievements(next);
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

  // Load any previous save once on mount, then start persisting future changes.
  useEffect(() => {
    let cancelled = false;
    loadEconomyState().then((saved) => {
      if (cancelled) return;
      if (saved) dispatch({ type: "HYDRATE", state: saved });
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

  const portfolioValue = GOODS.reduce(
    (sum, g) => sum + state.goods[g.id].holding * state.goods[g.id].price,
    0
  );
  const netWorth = state.cash + portfolioValue;

  return {
    state,
    selectGood,
    trade: trade_,
    sendCaravan: sendCaravan_,
    togglePause,
    reset,
    upgrade: upgrade_,
    portfolioValue,
    netWorth,
    hydrated,
  };
}

export { GOODS, GOODS_BY_ID };
