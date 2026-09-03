import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { GOODS, GOODS_BY_ID } from "./goods";
import { EVENT_TEMPLATES } from "./events";
import { loadEconomyState, saveEconomyState } from "./persist";
import { EconomyEvent, EconomyState, GoodId, GoodState } from "./types";

const HISTORY_LEN = 40;
export const TICK_MS = 1500;
const BASE_INFLATION_DRIFT = 0.0015;
const INFLATION_MIN = -0.004;
const INFLATION_MAX = 0.02;
const EVENT_CHANCE = 0.16;
const BUY_IMPACT = 0.006;
const STARTING_CASH = 250;
const HYPERINFLATION_INDEX = 320;

type Action =
  | { type: "TICK" }
  | { type: "SELECT_GOOD"; goodId: GoodId }
  | { type: "TRADE"; goodId: GoodId; side: "buy" | "sell"; qty: number }
  | { type: "TOGGLE_PAUSE" }
  | { type: "RESET" }
  | { type: "HYDRATE"; state: EconomyState };

function makeInitialGoodState(basePrice: number): GoodState {
  return {
    price: basePrice,
    history: [basePrice],
    momentum: 0,
    holding: 0,
  };
}

function initialState(): EconomyState {
  const goods = {} as EconomyState["goods"];
  for (const g of GOODS) {
    goods[g.id] = makeInitialGoodState(g.basePrice);
  }
  return {
    cash: STARTING_CASH,
    tick: 0,
    paused: false,
    inflationIndex: 100,
    inflationHistory: [100],
    inflationRate: BASE_INFLATION_DRIFT,
    selectedGood: GOODS[0].id,
    goods,
    lastEvent: null,
    eventLog: [],
    gameOver: false,
  };
}

const EVENT_LOG_CAP = 8;

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

  let inflationRate = clamp(
    state.inflationRate + (Math.random() - 0.5) * 0.0012,
    INFLATION_MIN,
    INFLATION_MAX
  );

  let lastEvent: EconomyEvent | null = state.lastEvent;
  const goodMomentumBoost: Partial<Record<GoodId, number>> = {};

  if (Math.random() < EVENT_CHANCE) {
    const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
    inflationRate = clamp(inflationRate + template.inflationDelta, INFLATION_MIN, INFLATION_MAX);
    if (template.good && template.goodMomentum) {
      goodMomentumBoost[template.good] = template.goodMomentum;
    }
    lastEvent = { id: state.tick + 1, message: template.message, tone: template.tone };
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

  const gameOver = inflationIndex >= HYPERINFLATION_INDEX;
  if (gameOver && !state.gameOver) {
    lastEvent = {
      id: state.tick + 1,
      message: "Hiperenflasyon! Kasaba ekonomisi çöktü. Yeniden başlat.",
      tone: "bad",
    };
  }

  const eventLog =
    lastEvent && lastEvent.id !== state.lastEvent?.id
      ? [lastEvent, ...state.eventLog].slice(0, EVENT_LOG_CAP)
      : state.eventLog;

  return {
    ...state,
    tick: state.tick + 1,
    inflationRate,
    inflationIndex,
    inflationHistory,
    goods,
    lastEvent,
    eventLog,
    gameOver,
    paused: gameOver ? true : state.paused,
  };
}

function trade(state: EconomyState, goodId: GoodId, side: "buy" | "sell", qty: number): EconomyState {
  if (state.gameOver) return state;
  const gs = state.goods[goodId];
  const price = gs.price;

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
          momentum: clamp(gs.momentum + amount * BUY_IMPACT, -0.25, 0.25),
        },
      },
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
        momentum: clamp(gs.momentum - amount * BUY_IMPACT, -0.25, 0.25),
      },
    },
  };
}

function reducer(state: EconomyState, action: Action): EconomyState {
  switch (action.type) {
    case "TICK":
      return tick(state);
    case "SELECT_GOOD":
      return { ...state, selectedGood: action.goodId };
    case "TRADE":
      return trade(state, action.goodId, action.side, action.qty);
    case "TOGGLE_PAUSE":
      return state.gameOver ? state : { ...state, paused: !state.paused };
    case "RESET":
      return initialState();
    case "HYDRATE":
      return action.state;
    default:
      return state;
  }
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
  const togglePause = useCallback(() => dispatch({ type: "TOGGLE_PAUSE" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const portfolioValue = GOODS.reduce(
    (sum, g) => sum + state.goods[g.id].holding * state.goods[g.id].price,
    0
  );
  const netWorth = state.cash + portfolioValue;

  return { state, selectGood, trade: trade_, togglePause, reset, portfolioValue, netWorth, hydrated };
}

export { GOODS, GOODS_BY_ID };
