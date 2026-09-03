export type GoodId = "bread" | "milk" | "wood" | "iron" | "cloth";

export interface Good {
  id: GoodId;
  name: string;
  producer: string;
  icon: string;
  color: string;
  basePrice: number;
  volatility: number; // how jumpy the good's own price is
  inflationSensitivity: number; // how strongly town inflation drags this price up
}

export interface GoodState {
  price: number;
  history: number[];
  momentum: number; // short-term drift from buy/sell pressure, decays over time
  holding: number;
}

export interface EconomyEvent {
  id: number;
  message: string;
  tone: "good" | "bad" | "neutral";
}

export interface EconomyState {
  cash: number;
  tick: number;
  paused: boolean;
  inflationIndex: number; // town price index, starts at 100
  inflationHistory: number[];
  inflationRate: number; // per-tick drift, changes slowly over time
  selectedGood: GoodId;
  goods: Record<GoodId, GoodState>;
  lastEvent: EconomyEvent | null;
  eventLog: EconomyEvent[];
  gameOver: boolean;
}
