import { AssetId } from "./assets";
import { DifficultyId } from "./difficulty";
import { Language } from "../i18n/t";
import { TownId } from "./towns";

export type GoodId =
  | "bread"
  | "milk"
  | "wood"
  | "iron"
  | "cloth"
  | "fish"
  | "wine"
  | "leather"
  | "spice"
  | "silk"
  | "jewelry";

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

/** a speculative asset (gold, oil, stocks) — price is a random walk, independent of supply/demand */
export interface AssetState {
  price: number;
  history: number[];
  holding: number;
  /** cost-basis average price of current holdings; resets to 0 once holding hits 0 */
  avgCost: number;
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
  /** times a loan (see Loan above) has been paid down to zero */
  loansRepaid: number;
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

/** an outstanding town loan — interest compounds every tick until repaid;
 * see TAKE_LOAN/REPAY_LOAN in useEconomy.ts */
export interface Loan {
  principal: number;
  remainingBalance: number;
  /** locked in when the loan is taken (depends on the bank upgrade level,
   * inflation at signing time, and the chosen term — see loanInterestRatePerTick) */
  interestRatePerTick: number;
  /** the installment term chosen at signing (see LOAN_TERM_MONTHS_STEPS); a
   * longer term locks in a higher rate, mirroring real fixed-term lending */
  termMonths: number;
  takenAtTick: number;
}

/** a temporary town-wide "occasion" (see seasonalEvents.ts) that boosts one
 * or more goods' home-market price for a stretch of ticks, then ends on its own */
export interface SeasonalEventInstance {
  id: number;
  templateId: string;
  triggeredAtTick: number;
  expiresAtTick: number;
}

/** a short-lived side objective (see miniQuests.ts) that pops up mid-play,
 * runs passively alongside whatever the player is doing, and pays out
 * automatically if hit before expiresAtTick */
export interface MiniQuestInstance {
  id: number;
  templateId: string;
  target: number;
  reward: number;
  triggeredAtTick: number;
  expiresAtTick: number;
  /** the template's DailyProgress metric value at spawn time, so progress
   * is measured "since this quest appeared" rather than since the day began */
  baseline: number;
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
  /** set once the town's net worth first crosses TRADE_UNLOCK_NET_WORTH; sticky, never re-locks */
  tradeUnlocked: boolean;
  /** set once the town's net worth first crosses METROPOL_UNLOCK_NET_WORTH; sticky, never re-locks */
  metropolUnlocked: boolean;
  /** ids of purchased research.ts nodes — each permanently boosts one good's production and/or value */
  researched: string[];
  /** speculative assets (gold, oil, stocks) — separate random-walk market, see assets.ts */
  assets: Record<AssetId, AssetState>;
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
  /** a short-lived side objective running in the background; doesn't freeze the tick loop */
  activeMiniQuest: MiniQuestInstance | null;
  /** times the player has cashed in a run for a permanent bonus (see PRESTIGE
   * in useEconomy.ts) — survives every reset, including a plain difficulty restart */
  prestigeLevel: number;
  /** a temporary town-wide price event; see seasonalEvents.ts */
  activeSeasonalEvent: SeasonalEventInstance | null;
  /** at most one outstanding town loan at a time */
  loan: Loan | null;
  /** hired staff per good (0-WORKER_MAX_PER_GOOD); each costs a per-tick wage
   * and permanently boosts that good's production while employed */
  workers: Record<GoodId, number>;
  /** ids of purchased properties.ts entries — each is a one-time buy that
   * grants a permanent passive bonus (production, income, loan rate, etc.) */
  ownedProperties: string[];
}
