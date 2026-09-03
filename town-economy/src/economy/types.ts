import { TownId } from "./towns";

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

export interface ForeignTownState {
  prices: Record<GoodId, number>;
  momentum: Record<GoodId, number>;
}

export type CaravanDirection = "export" | "import";

export interface Caravan {
  id: number;
  townId: TownId;
  goodId: GoodId;
  direction: CaravanDirection;
  qty: number;
  /** export: cash to deposit on arrival. import: goods qty to deliver on arrival. */
  amount: number;
  departedTick: number;
  arrivesAtTick: number;
}

export interface EconomyStats {
  totalTrades: number;
  totalCaravansSent: number;
  totalCaravansCompleted: number;
  townsTradedWith: TownId[];
}

export interface StreakState {
  count: number;
  lastOpenedDate: string | null;
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
  foreignTowns: Record<TownId, ForeignTownState>;
  caravans: Caravan[];
  /** monotonically increasing id source shared by events and caravans */
  nextId: number;
  lastEvent: EconomyEvent | null;
  eventLog: EconomyEvent[];
  gameOver: boolean;
  stats: EconomyStats;
  streak: StreakState;
  unlockedAchievements: string[];
}
