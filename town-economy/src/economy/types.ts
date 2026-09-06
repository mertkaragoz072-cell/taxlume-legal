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
  | "jewelry"
  | "honey"
  | "cheese"
  | "paper"
  | "glass";

export type UpgradeId =
  | "market"
  | "caravanserai"
  | "townhall"
  | "bank"
  | "guardTower"
  | "earthquakeFund"
  | "storageYard";

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
  /** in-game day (see gameDayFromTick in useEconomy.ts) this good first
   * becomes tradeable; omitted/undefined means available from day 1 */
  unlockDay?: number;
}

export interface GoodState {
  price: number;
  history: number[];
  /** current stock in the home market; buying drains it, production/selling replenish it */
  supply: number;
  holding: number;
  /** cost-basis average price of current holdings; resets to 0 once holding hits 0 */
  avgCost: number;
  /** the player's own recent buying/selling pushing price above/below its supply-driven level; decays toward 0 each tick */
  demandPressure: number;
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
  /** paid an upfront premium to fully waive bandit-raid risk on arrival — see
   * CARAVAN_RAID_CHANCE/CARAVAN_INSURANCE_COST_PCT in useEconomy.ts */
  insured: boolean;
}

export interface EconomyStats {
  totalTrades: number;
  totalCaravansSent: number;
  totalCaravansCompleted: number;
  townsTradedWith: TownId[];
  /** times a loan (see Loan above) has been paid down to zero */
  loansRepaid: number;
  /** times a forward contract (see ForwardContract below) settled at a profit */
  contractsWon: number;
  /** lifetime realized profit/loss from selling goods on the home market, vs. their cost basis */
  totalRealizedProfit: number;
  /** longest-ever run of consecutive profitable sells (goods or assets) — see tradeStreak below */
  bestTradeStreak: number;
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

/** a rival trader offers to buy a bulk quantity of one good at a premium
 * over its current market price; accept to sell it to them for cash, or
 * decline — see rivalTrader.ts and resolveRivalOffer in useEconomy.ts */
export interface RivalTraderOffer {
  id: number;
  goodId: GoodId;
  qty: number;
  /** cash paid per unit if accepted — set above the market price at roll time */
  pricePerUnit: number;
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

export type ContractDirection = "long" | "short";

/** a cash-settled forward contract on a good's home price — bet that it
 * rises ("long") or falls ("short") by a chosen term, see openContract in
 * useEconomy.ts. Margin is collateral held until settlement; a loss can
 * never exceed it (no negative cash, no margin calls). */
export interface ForwardContract {
  id: number;
  goodId: GoodId;
  direction: ContractDirection;
  qty: number;
  /** the good's home price at signing — the settlement reference point */
  strikePrice: number;
  /** cash held as collateral, returned (adjusted by the payoff) at settlement */
  margin: number;
  signedAtTick: number;
  maturesAtTick: number;
}

/** a guaranteed physical delivery commitment — unlike ForwardContract (a
 * cash-settled price bet with no goods involved), this reserves goods you
 * already hold today and guarantees a locked-in price (today's price plus a
 * fixed bonus) at maturity, see openBulkContract in useEconomy.ts */
export interface BulkContract {
  id: number;
  goodId: GoodId;
  qty: number;
  /** cash paid per unit at maturity — the good's price at signing plus BULK_CONTRACT_BONUS_PCT */
  lockedPricePerUnit: number;
  signedAtTick: number;
  maturesAtTick: number;
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
  /** id of the emblem (see emblems.ts) shown next to the town name — purely cosmetic */
  selectedEmblem: string;
  /** accent color (see EMBLEM_COLORS in emblems.ts) behind the emblem badge — always available, purely cosmetic */
  selectedEmblemColor: string;
  language: Language;
  difficulty: DifficultyId;
  cash: number;
  tick: number;
  paused: boolean;
  inflationIndex: number; // town price index, starts at 100
  inflationHistory: number[];
  /** net worth sampled once per tick, capped at HISTORY_LEN — powers the
   * net-worth chart on the Achievements screen */
  netWorthHistory: number[];
  /** a simulated "ghost" rival town's net worth — grows on its own each
   * tick, purely for a light competitive comparison; resets with the run
   * (prestige/reset), unlike bestNetWorthEver */
  rivalNetWorth: number;
  /** whether the rival was ahead of the player as of the last tick — used
   * only to fire a "you overtook/were overtaken" event on a lead change,
   * not every tick */
  rivalCurrentlyAhead: boolean;
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
  /** consecutive profitable sells (goods or assets) in a row right now; any loss resets it to 0 */
  tradeStreak: number;
  streak: StreakState;
  unlockedAchievements: string[];
  /** set once the town's net worth first crosses TRADE_UNLOCK_NET_WORTH; sticky, never re-locks */
  tradeUnlocked: boolean;
  /** set once the town's net worth first crosses METROPOL_UNLOCK_NET_WORTH; sticky, never re-locks */
  metropolUnlocked: boolean;
  /** set once prestigeLevel first reaches LEGENDARY_UNLOCK_PRESTIGE_LEVEL; sticky, never re-locks */
  legendaryUnlocked: boolean;
  /** highest town-rank tier (see townRanks.ts) this town's net worth has ever reached; sticky, never re-locks */
  townRankIndex: number;
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
  /** a rival trader's bulk-buy offer; freezes the tick loop until accepted or declined */
  pendingRivalOffer: RivalTraderOffer | null;
  dailyProgress: DailyProgress;
  dailyQuests: DailyQuest[];
  /** a short-lived side objective running in the background; doesn't freeze the tick loop */
  activeMiniQuest: MiniQuestInstance | null;
  /** times the player has cashed in a run for a permanent bonus (see PRESTIGE
   * in useEconomy.ts) — survives every reset, including a plain difficulty restart */
  prestigeLevel: number;
  /** unspent points earned from prestiging, spent on prestigePerks.ts nodes —
   * survives every reset like prestigeLevel does */
  prestigePoints: number;
  /** ids of unlocked prestigePerks.ts nodes — permanent, survives every reset */
  prestigePerks: string[];
  /** highest net worth ever reached, across every prestige/reset — never
   * decreases, kept updated every tick in tick() */
  bestNetWorthEver: number;
  /** snapshot of bestNetWorthEver taken when this run started (prestige or a
   * plain reset) — the bar this run needs to clear for a "new record" beat;
   * 0 on a save that has never prestiged or reset, meaning there's nothing
   * to beat yet */
  priorBestNetWorth: number;
  /** true once this run's net worth has already crossed priorBestNetWorth —
   * suppresses repeat "new record" celebrations for the rest of the run */
  recordBrokenThisRun: boolean;
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
  /** open forward contracts, capped at CONTRACT_MAX_ACTIVE — see openContract in useEconomy.ts */
  contracts: ForwardContract[];
  /** open bulk delivery contracts, capped at BULK_CONTRACT_MAX_ACTIVE — see openBulkContract in useEconomy.ts */
  bulkContracts: BulkContract[];
  /** standing auto-trade orders, capped at AUTO_TRADE_MAX_RULES — see applyAutoTradeRules in useEconomy.ts */
  autoTradeRules: AutoTradeRule[];
  /** the calendar week's challenge, re-assigned deterministically whenever the
   * ISO week rolls over — see ensureWeeklyChallenge in useEconomy.ts */
  weeklyChallenge: WeeklyChallenge | null;
}

export interface WeeklyChallenge {
  weekKey: string;
  templateId: string;
  /** the template's EconomyStats metric read at assignment time — progress is
   * the current value of that same metric minus this baseline */
  startValue: number;
  claimed: boolean;
}

/** a standing order that re-fires trade() every tick its condition holds — see
 * applyAutoTradeRules in useEconomy.ts */
export interface AutoTradeRule {
  id: number;
  goodId: GoodId;
  side: "buy" | "sell";
  trigger: "priceBelow" | "priceAbove";
  /** absolute price captured relative to the good's price when the rule was created */
  triggerPrice: number;
  qty: number;
  enabled: boolean;
}
