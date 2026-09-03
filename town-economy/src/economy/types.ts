import { DifficultyId } from "./difficulty";
import { Language } from "../i18n/t";
import { TownId } from "./towns";

export type GoodId = "bread" | "milk" | "wood" | "iron" | "cloth";

export type UpgradeId = "market" | "caravanserai" | "townhall" | "bank";

export interface Good {
  id: GoodId;
  /** i18n key resolved via t() — never render directly */
  nameKey: string;
  producerKey: string;
  icon: string;
  color: string;
  /** price when supply sits exactly at baseSupply and the town price index is 100 */
  basePrice: number;
  /** reference stock level supply drifts back toward at equilibrium */
  baseSupply: number;
  /** units villagers produce (and, at equilibrium, also consume) per tick */
  baseProduction: number;
  /** how strongly a supply shortfall/surplus moves price: price ∝ (baseSupply/supply)^elasticity */
  elasticity: number;
}

export interface GoodState {
  price: number;
  history: number[];
  /** current stock in the home market; buying drains it, production/selling replenish it */
  supply: number;
  holding: number;
}

export interface EconomyEvent {
  id: number;
  message: string;
  tone: "good" | "bad" | "neutral";
}

export interface ForeignTownState {
  prices: Record<GoodId, number>;
  supply: Record<GoodId, number>;
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

export interface OfflineSummary {
  elapsedMs: number;
  ticksSimulated: number;
  cashDelta: number;
  netWorthDelta: number;
  caravansCompleted: number;
  newAchievements: string[];
  newQuests: string[];
  hyperinflationHappened: boolean;
  recentEvents: EconomyEvent[];
}

export interface PendingDecision {
  id: number;
  templateId: string;
  triggeredAtTick: number;
}

/** a villager asks for a specific amount of a good; give it away or refuse */
export interface VillagerRequest {
  id: number;
  goodId: GoodId;
  qty: number;
  triggeredAtTick: number;
}

/** counters that reset each day and back the daily quests' progress */
export interface DailyProgress {
  trades: number;
  caravansSent: number;
  townsTraded: TownId[];
  cashEarned: number;
  upgradesBought: number;
}

export interface DailyQuest {
  id: string;
  templateId: string;
  target: number;
  reward: number;
  completed: boolean;
}

export interface EconomyState {
  townName: string;
  language: Language;
  difficulty: DifficultyId;
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
  upgrades: Record<UpgradeId, number>;
  /** villager tax rate, 0 to TAX_RATE_MAX */
  taxRate: number;
  /** villager contentment, 0 (revolt) to 100 (very content) */
  happiness: number;
  /** epoch ms of the last time tick() actually ran (i.e. the app was live) */
  lastSavedAt: number;
  /** set once after simulating time passed while the app was closed; null once dismissed */
  offlineSummary: OfflineSummary | null;
  /** a decision event waiting on the player's choice; freezes the tick loop until resolved */
  pendingDecision: PendingDecision | null;
  /** a villager asking for goods; freezes the tick loop until given or refused */
  pendingRequest: VillagerRequest | null;
  dailyProgress: DailyProgress;
  dailyQuests: DailyQuest[];
}
