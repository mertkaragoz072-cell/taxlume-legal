import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ACHIEVEMENTS } from "./achievements";
import { ASSETS, ASSETS_BY_ID, AssetId } from "./assets";
import { DECISION_TEMPLATES, DECISION_TEMPLATES_BY_ID } from "./decisions";
import { DIFFICULTIES, DifficultyId } from "./difficulty";
import { EMBLEM_COLORS, isEmblemUnlocked } from "./emblems";
import { GOODS, GOODS_BY_ID } from "./goods";
import { EVENT_TEMPLATES } from "./events";
import { MINI_QUEST_TEMPLATES, MINI_QUEST_TEMPLATES_BY_ID } from "./miniQuests";
import { loadEconomyState, saveEconomyState } from "./persist";
import {
  PROPERTIES_BY_ID,
  propertyCaravanTariffDiscount,
  propertyHappinessBonus,
  propertyLoanRateDiscountPerDay,
  propertyPassiveIncomePerTick,
  propertyProductionMultiplier,
} from "./properties";
import {
  perkCaravanTariffDiscount,
  perkHeadStartBonus,
  perkLoanRateDiscountPerDay,
  perkProductionBonus,
  perkTaxHappinessRelief,
  perkUnlockThresholdMult,
  PRESTIGE_PERKS_BY_ID,
} from "./prestigePerks";
import { makeInitialDailyProgress, pickDailyQuestTemplates, QUEST_TEMPLATES_BY_ID } from "./quests";
import { RESEARCH_NODES_BY_ID, researchMultiplier } from "./research";
import { rollRivalTraderOffer } from "./rivalTrader";
import { SEASONAL_EVENT_TEMPLATES, SEASONAL_EVENT_TEMPLATES_BY_ID } from "./seasonalEvents";
import { WORKER_MAX_PER_GOOD, WORKER_PRODUCTION_BONUS_PER_WORKER, WORKER_WAGE_PER_TICK } from "./workers";
import { ForeignTown, TOWNS, TOWNS_BY_ID, TownId } from "./towns";
import {
  townRankBeyondCount,
  townRankIcon,
  townRankIndexForNetWorth,
  townRankNameKey,
  townRankReward,
} from "./townRanks";
import { UPGRADES_BY_ID, upgradeCost } from "./upgrades";
import {
  rollVillagerRequest,
  VILLAGER_REQUEST_GIVE_HAPPINESS,
  VILLAGER_REQUEST_REFUSE_HAPPINESS,
} from "./villagerRequests";
import { DEFAULT_LANGUAGE, Language, t } from "../i18n/t";
import { formatCoins as formatCoinsUtil, formatCompactNumber as formatNumberUtil } from "../utils/formatNumber";
import {
  Caravan,
  CaravanDirection,
  ContractDirection,
  EconomyEvent,
  EconomyState,
  ForeignTownState,
  ForwardContract,
  Good,
  GoodId,
  GoodState,
  UpgradeId,
} from "./types";

const HISTORY_LEN = 40;
export const TICK_MS = 1500;
const EVENT_LOG_CAP = 30;
const DEFAULT_DIFFICULTY: DifficultyId = "normal";
export const TOWN_NAME_MAX_LENGTH = 24;
// A new town starts local-market-only; once its net worth proves the
// player can run an economy, inter-city trade (and the caravan/foreign-
// town system) opens up. Sticky once crossed — see applyTradeUnlock.
export const TRADE_UNLOCK_NET_WORTH = 500;
// A further milestone past ordinary inter-city trade: once the town has
// grown enough, the far-off metropolises (see towns.ts' "metropol" tier —
// pricier caravans, but far better payoff for the luxury goods) open up.
// Sticky once crossed — see applyMetropolUnlock.
export const METROPOL_UNLOCK_NET_WORTH = 3000;
// The one content gate tied to prestigeLevel rather than the current run's
// net worth — see towns.ts' "legendary" tier and applyLegendaryUnlock.
export const LEGENDARY_UNLOCK_PRESTIGE_LEVEL = 3;
const DAILY_QUEST_COUNT = 3;

// --- In-game day cycle -----------------------------------------------------
// A separate clock from the real-world calendar day used for daily
// check-ins/streaks/quests: this one is purely simulation time, ticking
// forward with play (and offline catch-up) rather than the wall clock, so
// systems like loan interest can be priced in a humane "per day" unit
// instead of the raw ~1.5s tick.
export const TICKS_PER_GAME_DAY = 40;

export function gameDayFromTick(tick: number): number {
  return Math.floor(tick / TICKS_PER_GAME_DAY) + 1;
}

/** A good with no unlockDay is available from the start; one with an
 * unlockDay only becomes tradeable once the town has been running that
 * many in-game days — it still simulates quietly in the background before
 * that, so it isn't starting from scratch once revealed. */
export function isGoodUnlocked(good: Good, state: EconomyState): boolean {
  return !good.unlockDay || gameDayFromTick(state.tick) >= good.unlockDay;
}

// --- Prestige ------------------------------------------------------------
// The "end of a run" milestone: cash in a well-grown town for a permanent,
// stacking bonus that survives every future reset (see PRESTIGE below and
// the RESET case, which both carry prestigeLevel forward).
export const PRESTIGE_UNLOCK_NET_WORTH = 10000;
export const PRESTIGE_PRODUCTION_BONUS_PER_LEVEL = 0.08;
export const PRESTIGE_CASH_BONUS_PER_LEVEL = 60;
// Points earned each prestige, spent on prestigePerks.ts — a player-chosen
// permanent tree layered on top of the automatic level bonus above.
export const PRESTIGE_POINTS_PER_PRESTIGE = 1;

// --- Town ranks ------------------------------------------------------------
// An endless, sticky title ladder driven by net worth alone (see
// townRanks.ts) — every tier ever reached stays reached even if net worth
// later falls, and each one adds a permanent sliver to production so there
// is always a next rank worth chasing within a single run, not just across
// resets like prestige.
export const TOWN_RANK_PRODUCTION_BONUS_PER_RANK = 0.004;

// --- Banking / loans -------------------------------------------------------
// A loan is cash now against interest that compounds every tick until
// repaid — real leverage, real risk. At most one outstanding at a time.
// Rates are priced per in-game DAY (see TICKS_PER_GAME_DAY above) — a much
// more legible unit than the raw tick — then converted to an equivalent
// per-tick rate so the balance still compounds smoothly every tick.
export const LOAN_MIN_CAP = 100;
export const LOAN_MAX_NET_WORTH_PCT = 0.6;
export const LOAN_BASE_INTEREST_RATE_PER_DAY = 0.05;
// A higher Banka upgrade level buys a cheaper loan, floored so it's never free.
export const LOAN_BANK_DISCOUNT_PER_LEVEL_PER_DAY = 0.006;
export const LOAN_MIN_INTEREST_RATE_PER_DAY = 0.015;
export const LOAN_MAX_INTEREST_RATE_PER_DAY = 0.35;
// The rate offered reflects how hot inflation is running right now, like a
// real central bank's policy rate — capped so a runaway inflation spiral
// can't make every loan instantly unpayable. inflationRate is a per-tick
// drift, so it's first compounded out to what it implies for a full
// in-game day before the sensitivity multiplier is applied.
export const LOAN_INFLATION_SENSITIVITY = 0.4;
export const LOAN_MAX_INFLATION_DAY_CONTRIB = 0.15;
// Term choice at signing: longer commitments carry more rate risk for the
// bank, so they lock in a higher (but fixed for the life of the loan) rate.
// LOAN_TERM_DAYS_PER_MONTH is purely a flavor conversion so a term reads as
// a real number of in-game days (no repayment schedule is enforced — the
// term only sets the rate offered, repayment stays free-form any time).
export const LOAN_TERM_MONTHS_STEPS = [3, 6, 12, 24];
export const LOAN_TERM_RATE_PER_MONTH_PER_DAY = 0.0015;
export const LOAN_TERM_DAYS_PER_MONTH = 20;
// How much an all-consuming debt (balance ≈ net worth) drags down the
// villagers' target happiness, on top of whatever the tax rate is already doing.
const DEBT_HAPPINESS_DRAG = 20;

// --- Forward contracts ---------------------------------------------------
// A cash-settled bet on a good's home price at signing vs. its price at
// maturity — "long" pays off if it rose, "short" if it fell. Margin is
// collateral pulled up front; a loss is capped at that margin (see
// settlement in tick()) so a bad bet can never push cash negative.
export const CONTRACT_MAX_ACTIVE = 3;
export const CONTRACT_MARGIN_PCT = 0.25;
export const CONTRACT_TERM_DAY_STEPS = [1, 3, 5, 10];

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

// --- Demand pressure ------------------------------------------------------
// Supply alone drifts back toward (and past) baseSupply within a tick or two
// once villagers are happy and producing above baseline — too fast for a
// player's own buy/sell to feel like it moved anything. demandPressure is a
// separate multiplier on top of the supply-driven price, nudged by every
// trade and decaying slowly on its own clock, so a big order visibly bends
// the price and that bend lingers for roughly a minute of real play before
// fading — long enough to feel like your trade mattered, short enough that
// the market always finds its own level again.
const DEMAND_PRESSURE_DECAY = 0.98; // per tick (TICK_MS=1500ms) => ~50-tick / 75s half-life
const DEMAND_PRESSURE_SENSITIVITY = 0.35; // price swing per "one baseSupply's worth" traded, before market depth
const DEMAND_PRESSURE_MAX = 0.4; // clamp so no single order can send price to an absurd multiple

// --- Bid/ask spread ---------------------------------------------------------
// Real markets charge a toll on every round trip — without one, buying and
// immediately selling back is free, so profit is pure luck rather than a
// real read on where the price is headed. Buying costs a bit above the
// quoted price, selling nets a bit below it; a deeper Pazar Yeri (the same
// upgrade that dampens price impact) narrows the spread too.
export const MARKET_SPREAD = 0.03; // total round-trip cost at market upgrade level 0

// --- Hot streak -------------------------------------------------------------
// A skill-expression layer on top of realized profit/loss: sell at a profit
// (goods or assets, same counter) and the streak grows, paying a bonus on
// top of that trade's own profit — sell at a loss and it's back to zero.
// No bonus on the first win of a streak; it only starts compounding once
// you've proven you can string wins together, so the tension is real
// ("do I cash out now or risk the streak on one more trade?").
export const HOT_STREAK_BONUS_PER_TRADE = 0.03; // +3% of that trade's profit per streak length past 1
export const HOT_STREAK_MAX_BONUS = 0.3; // capped at +30%

/** Given a just-realized pnl, returns the next streak count and the bonus
 * cash (on top of pnl) that streak earns — shared by trade() and
 * tradeAsset() so goods and assets build one unified trading streak. */
function nextTradeStreak(currentStreak: number, pnl: number): { streak: number; bonus: number } {
  if (pnl < 0) return { streak: 0, bonus: 0 };
  const streak = currentStreak + 1;
  const bonusPct = clamp((streak - 1) * HOT_STREAK_BONUS_PER_TRADE, 0, HOT_STREAK_MAX_BONUS);
  return { streak, bonus: pnl * bonusPct };
}

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
// Rarer still — a rival trader's bulk-buy offer pays a premium over market
// price, so it should feel like an occasional windfall, not a routine ask.
const RIVAL_OFFER_CHANCE = 0.014;
// Unlike a decision or villager request, a mini quest never freezes the
// tick loop — it just runs in the background against a short deadline
// (see miniQuests.ts) while the player keeps playing normally.
const MINI_QUEST_CHANCE = 0.02;
// Much rarer than a mini quest — a seasonal event runs far longer (tens of
// ticks) so overlapping spawns would just mean "always some price boost
// active," which defeats the "special occasion" feel (see seasonalEvents.ts).
const SEASONAL_EVENT_CHANCE = 0.006;

// A caravan out on the road risks a bandit raid on arrival unless the player
// paid to insure it — see sendCaravan and the caravan-completion loop in tick().
export const CARAVAN_RAID_CHANCE = 0.15;
export const CARAVAN_RAID_LOSS_MIN = 0.4;
export const CARAVAN_RAID_LOSS_MAX = 0.7;
// Upfront premium, as a fraction of the caravan's own value, that fully
// waives raid risk for that one caravan.
export const CARAVAN_INSURANCE_COST_PCT = 0.08;

// A rare, purely positive windfall — no choice or interruption, just a nice
// surprise. Sized off current cash (with a floor so it's never trivial
// early on) rather than a flat amount, so it stays a meaningful treat at
// every stage of a run instead of fading into irrelevance late-game.
const LOST_TREASURE_CHANCE = 0.008;
const LOST_TREASURE_PCT_OF_CASH = 0.05;
const LOST_TREASURE_MIN_AMOUNT = 20;

// A simulated "ghost" rival — grows steadily on its own (no strategy, just
// a rough backdrop pace) so the player has something to race against
// besides their own past runs. Purely a flavor comparison; nothing the
// player does affects it directly.
export const RIVAL_TOWN_GROWTH_RATE = 0.0015;
const RIVAL_TOWN_GROWTH_JITTER = 0.002;

// A rare, broad disaster hitting every good's home supply at once — see the
// earthquake roll in tick() and the Earthquake Fund upgrade that softens it.
export const EARTHQUAKE_CHANCE = 0.003;
export const EARTHQUAKE_LOSS_MIN = 0.1;
export const EARTHQUAKE_LOSS_MAX = 0.25;
export const EARTHQUAKE_LOSS_FLOOR = 0.02;

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

// A deeper Pazar Yeri means the same order moves the market (and pays the
// spread) proportionally less — real market depth, not an arbitrary damper.
export function marketDepthFactor(state: EconomyState): number {
  return 1 + state.upgrades.market * UPGRADES_BY_ID.market.effectPerLevel;
}

export function marketSpread(state: EconomyState): number {
  return MARKET_SPREAD / marketDepthFactor(state);
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
  | {
      type: "SEND_CARAVAN";
      townId: TownId;
      goodId: GoodId;
      direction: CaravanDirection;
      qty: number;
      insured: boolean;
    }
  | { type: "TOGGLE_PAUSE" }
  | { type: "RESET"; difficulty: DifficultyId }
  | { type: "PRESTIGE" }
  | { type: "UNLOCK_PRESTIGE_PERK"; perkId: string }
  | {
      type: "OPEN_CONTRACT";
      goodId: GoodId;
      direction: ContractDirection;
      qty: number;
      termDays: number;
    }
  | { type: "TAKE_LOAN"; amount: number; termMonths: number }
  | { type: "REPAY_LOAN"; amount: number }
  | { type: "HIRE_WORKER"; goodId: GoodId }
  | { type: "FIRE_WORKER"; goodId: GoodId }
  | { type: "HYDRATE"; state: EconomyState }
  | { type: "DAILY_CHECKIN"; today: string }
  | { type: "UPGRADE"; upgradeId: UpgradeId }
  | { type: "RESEARCH"; nodeId: string }
  | { type: "BUY_PROPERTY"; propertyId: string }
  | { type: "SET_TAX_RATE"; rate: number }
  | { type: "OFFLINE_ADVANCE"; ticks: number; elapsedMs: number }
  | { type: "DISMISS_OFFLINE_SUMMARY" }
  | { type: "RESOLVE_DECISION"; optionId: string }
  | { type: "RESOLVE_REQUEST"; give: boolean }
  | { type: "RESOLVE_RIVAL_OFFER"; accept: boolean }
  | { type: "SET_TOWN_NAME"; name: string }
  | { type: "SET_LANGUAGE"; language: Language }
  | { type: "SET_EMBLEM"; emblemId: string }
  | { type: "SET_EMBLEM_COLOR"; color: string };

function makeInitialGoodState(good: Good): GoodState {
  return {
    price: good.basePrice,
    history: [good.basePrice],
    supply: good.baseSupply,
    holding: 0,
    avgCost: 0,
    demandPressure: 0,
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

export function initialState(
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
    selectedEmblem: "village",
    selectedEmblemColor: EMBLEM_COLORS[0],
    language,
    difficulty,
    cash: config.startingCash,
    tick: 0,
    paused: false,
    inflationIndex: 100,
    inflationHistory: [100],
    netWorthHistory: [config.startingCash],
    rivalNetWorth: config.startingCash,
    rivalCurrentlyAhead: false,
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
      loansRepaid: 0,
      contractsWon: 0,
      totalRealizedProfit: 0,
      bestTradeStreak: 0,
    },
    tradeStreak: 0,
    streak: { count: 0, lastOpenedDate: null },
    unlockedAchievements: [],
    tradeUnlocked: false,
    metropolUnlocked: false,
    legendaryUnlocked: false,
    townRankIndex: 0,
    researched: [],
    assets,
    upgrades: { market: 0, caravanserai: 0, townhall: 0, bank: 0, guardTower: 0, earthquakeFund: 0 },
    taxRate: 0,
    happiness: 100,
    lastSavedAt: Date.now(),
    offlineSummary: null,
    pendingDecision: null,
    pendingRequest: null,
    pendingRivalOffer: null,
    dailyProgress: makeInitialDailyProgress(),
    dailyQuests: makeDailyQuests("init"),
    activeMiniQuest: null,
    prestigeLevel: 0,
    prestigePoints: 0,
    prestigePerks: [],
    bestNetWorthEver: 0,
    priorBestNetWorth: 0,
    recordBrokenThisRun: false,
    activeSeasonalEvent: null,
    loan: null,
    workers: Object.fromEntries(GOODS.map((g) => [g.id, 0])) as Record<GoodId, number>,
    ownedProperties: [],
    contracts: [],
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

export function tick(state: EconomyState): EconomyState {
  if (state.paused || state.gameOver || state.pendingDecision || state.pendingRequest || state.pendingRivalOffer)
    return state;
  const config = DIFFICULTIES[state.difficulty];

  // Villager tax & happiness: happiness drifts toward a level set by the
  // current tax rate; unhappy villagers produce less (a real, lingering
  // supply shortage that pushes prices up through scarcity, plus a small
  // monetary-inflation drag) while happy ones produce a bit more and ease
  // inflation slightly. Computed before inflation so both structural
  // pressures below fold into one target.
  // An outstanding loan the size of the whole town's net worth weighs on
  // the villagers too, on top of whatever the tax rate is doing.
  const debtBurden = state.loan
    ? clamp(state.loan.remainingBalance / Math.max(computeNetWorth(state), 1), 0, 1)
    : 0;
  const taxHappinessDrag =
    state.taxRate * HAPPINESS_TARGET_SLOPE * (1 - perkTaxHappinessRelief(state.prestigePerks));
  const targetHappiness = clamp(
    100 - taxHappinessDrag - debtBurden * DEBT_HAPPINESS_DRAG + propertyHappinessBonus(state.ownedProperties),
    0,
    100
  );
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

  // A rare, broad disaster — unlike the passive news above (which shocks at
  // most one good), this hits every good's home supply at once. The
  // Earthquake Fund upgrade softens the severity (never fully to zero) but
  // never touches the chance, so it stays a genuine "when," not "if."
  if (Math.random() < EARTHQUAKE_CHANCE) {
    const rawLossPct = EARTHQUAKE_LOSS_MIN + Math.random() * (EARTHQUAKE_LOSS_MAX - EARTHQUAKE_LOSS_MIN);
    const lossPct = Math.max(
      EARTHQUAKE_LOSS_FLOOR,
      rawLossPct - state.upgrades.earthquakeFund * UPGRADES_BY_ID.earthquakeFund.effectPerLevel
    );
    for (const good of GOODS) {
      supplyShocks[good.id] = -lossPct;
    }
    newEvents.push({
      id: nextId++,
      message: t(state.language, "msg.earthquakeHit", { pct: Math.round(lossPct * 100) }),
      tone: "bad",
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

  let pendingRivalOffer: EconomyState["pendingRivalOffer"] = state.pendingRivalOffer;
  if (!pendingDecision && !pendingRequest && !pendingRivalOffer && Math.random() < RIVAL_OFFER_CHANCE) {
    const { goodId, qty, pricePerUnit } = rollRivalTraderOffer(state);
    pendingRivalOffer = { id: nextId, goodId, qty, pricePerUnit, triggeredAtTick: state.tick + 1 };
    const good = GOODS_BY_ID[goodId];
    newEvents.push({
      id: nextId++,
      message: t(state.language, "msg.rivalOfferPending", {
        qty,
        good: t(state.language, good.nameKey),
      }),
      tone: "neutral",
    });
  }

  // Mini quests run passively alongside everything else, so they don't
  // check pendingDecision/pendingRequest — only that none is already active.
  let activeMiniQuest: EconomyState["activeMiniQuest"] = state.activeMiniQuest;
  if (!activeMiniQuest && Math.random() < MINI_QUEST_CHANCE) {
    const candidates = MINI_QUEST_TEMPLATES.filter((tpl) => !tpl.requiresTrade || state.tradeUnlocked);
    if (candidates.length > 0) {
      const template = candidates[Math.floor(Math.random() * candidates.length)];
      activeMiniQuest = {
        id: nextId,
        templateId: template.id,
        target: template.target,
        reward: template.reward,
        triggeredAtTick: state.tick + 1,
        expiresAtTick: state.tick + 1 + template.durationTicks,
        baseline: template.metric(state.dailyProgress),
      };
      newEvents.push({
        id: nextId++,
        message: t(state.language, "msg.miniQuestPending", {
          icon: template.icon,
          title: t(state.language, template.titleKey),
        }),
        tone: "neutral",
      });
    }
  }

  // Seasonal events run purely on ticks — no player action can complete or
  // interrupt one, so both the expiry check and the spawn roll live here
  // rather than in a reducer post-processing step (contrast with mini quests).
  let activeSeasonalEvent: EconomyState["activeSeasonalEvent"] = state.activeSeasonalEvent;
  if (activeSeasonalEvent && state.tick + 1 >= activeSeasonalEvent.expiresAtTick) {
    const endedTemplate = SEASONAL_EVENT_TEMPLATES_BY_ID[activeSeasonalEvent.templateId];
    if (endedTemplate) {
      newEvents.push({
        id: nextId++,
        message: t(state.language, "msg.seasonalEventEnded", {
          icon: endedTemplate.icon,
          title: t(state.language, endedTemplate.titleKey),
        }),
        tone: "neutral",
      });
    }
    activeSeasonalEvent = null;
  }
  if (!activeSeasonalEvent && Math.random() < SEASONAL_EVENT_CHANCE) {
    const template = SEASONAL_EVENT_TEMPLATES[Math.floor(Math.random() * SEASONAL_EVENT_TEMPLATES.length)];
    activeSeasonalEvent = {
      id: nextId,
      templateId: template.id,
      triggeredAtTick: state.tick + 1,
      expiresAtTick: state.tick + 1 + template.durationTicks,
    };
    newEvents.push({
      id: nextId++,
      message: t(state.language, "msg.seasonalEventStarted", {
        icon: template.icon,
        title: t(state.language, template.titleKey),
      }),
      tone: "good",
    });
  }

  let taxCashDelta = estimateTaxIncomePerTick({ ...state, happiness });
  if (happiness <= ANGRY_THRESHOLD && Math.random() < ANGRY_EVENT_CHANCE) {
    const penalty = Math.min(state.cash + taxCashDelta, ANGRY_CASH_PENALTY);
    taxCashDelta -= penalty;
    newEvents.push({
      id: nextId++,
      message: t(state.language, "msg.angryUprising", {
        amount: formatNumberUtil(penalty, state.language),
      }),
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

  // Permanent, run-independent bonus from past prestiges (see PRESTIGE).
  const prestigeProductionMult =
    1 +
    state.prestigeLevel * PRESTIGE_PRODUCTION_BONUS_PER_LEVEL +
    perkProductionBonus(state.prestigePerks) +
    // Every town rank ever reached (see townRanks.ts) adds a small sliver
    // too — sticky like prestige, but earned within a single run instead
    // of requiring a reset, so there's always a next rank worth chasing.
    state.townRankIndex * TOWN_RANK_PRODUCTION_BONUS_PER_RANK;
  const seasonalTemplate = activeSeasonalEvent
    ? SEASONAL_EVENT_TEMPLATES_BY_ID[activeSeasonalEvent.templateId]
    : null;

  // Hired staff (see workers.ts) cost a wage every tick, capped at what the
  // treasury can actually afford this tick — a shortfall lays off just
  // enough workers (arbitrary but deterministic order) to cover the rest,
  // rather than letting cash go negative.
  let workers = state.workers;
  let workerWageCost = 0;
  {
    let totalWorkers = GOODS.reduce((sum, g) => sum + workers[g.id], 0);
    workerWageCost = totalWorkers * WORKER_WAGE_PER_TICK;
    const availableForWages = state.cash + taxCashDelta;
    let laidOff = 0;
    while (workerWageCost > availableForWages && totalWorkers > 0) {
      const g = GOODS.find((g) => workers[g.id] > 0);
      if (!g) break;
      workers = { ...workers, [g.id]: workers[g.id] - 1 };
      totalWorkers -= 1;
      workerWageCost = totalWorkers * WORKER_WAGE_PER_TICK;
      laidOff++;
    }
    if (laidOff > 0) {
      newEvents.push({
        id: nextId++,
        message: t(state.language, "msg.workersLaidOff", { count: laidOff }),
        tone: "bad",
      });
    }
  }

  const goods = { ...state.goods };
  for (const good of GOODS) {
    const gs = goods[good.id];
    const { min: minSupply, max: maxSupply } = supplyBounds(good);
    const noise = 1 + (Math.random() - 0.5) * PRODUCTION_NOISE;
    const researchedProductionMult = researchMultiplier(state.researched, good.id, "production");
    const researchedValueMult = researchMultiplier(state.researched, good.id, "value");
    const seasonalMult =
      seasonalTemplate && seasonalTemplate.affectedGoods.includes(good.id)
        ? seasonalTemplate.priceMultiplier
        : 1;
    const workerProductionMult = 1 + workers[good.id] * WORKER_PRODUCTION_BONUS_PER_WORKER;
    const propertyProductionMult = propertyProductionMultiplier(state.ownedProperties, good.id);
    const production =
      good.baseProduction *
      productionEfficiency *
      noise *
      researchedProductionMult *
      prestigeProductionMult *
      workerProductionMult *
      propertyProductionMult;
    let supply = gs.supply + (production - good.baseProduction);
    const shockPct = supplyShocks[good.id];
    if (shockPct) supply *= 1 + shockPct;
    supply = clamp(supply, minSupply, maxSupply);
    const demandPressure = clamp(
      gs.demandPressure * DEMAND_PRESSURE_DECAY,
      -DEMAND_PRESSURE_MAX,
      DEMAND_PRESSURE_MAX
    );
    const price =
      priceFromSupply(
        good.basePrice * researchedValueMult * seasonalMult,
        good.baseSupply,
        good.elasticity,
        supply,
        inflationIndex
      ) *
      (1 + demandPressure);

    goods[good.id] = {
      ...gs,
      price,
      supply,
      demandPressure,
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

  const loan = state.loan
    ? { ...state.loan, remainingBalance: state.loan.remainingBalance * (1 + state.loan.interestRatePerTick) }
    : null;

  const nextTick = state.tick + 1;
  const stillTraveling: Caravan[] = [];
  const propertyIncomePerTick = propertyPassiveIncomePerTick(state.ownedProperties);
  let cash = state.cash + taxCashDelta + propertyIncomePerTick - workerWageCost;
  let dailyCashEarned = state.dailyProgress.cashEarned + Math.max(0, taxCashDelta) + propertyIncomePerTick;
  let totalCaravansCompleted = state.stats.totalCaravansCompleted;
  for (const caravan of state.caravans) {
    if (caravan.arrivesAtTick > nextTick) {
      stillTraveling.push(caravan);
      continue;
    }
    const town = TOWNS_BY_ID[caravan.townId];
    const good = GOODS_BY_ID[caravan.goodId];
    totalCaravansCompleted += 1;
    const effectiveRaidChance = Math.max(
      0,
      CARAVAN_RAID_CHANCE - state.upgrades.guardTower * UPGRADES_BY_ID.guardTower.effectPerLevel
    );
    const wasRaided = !caravan.insured && Math.random() < effectiveRaidChance;
    const deliveredAmount = wasRaided
      ? caravan.amount * (1 - (CARAVAN_RAID_LOSS_MIN + Math.random() * (CARAVAN_RAID_LOSS_MAX - CARAVAN_RAID_LOSS_MIN)))
      : caravan.amount;
    if (caravan.direction === "export") {
      cash += deliveredAmount;
      dailyCashEarned += deliveredAmount;
      newEvents.push({
        id: nextId++,
        message: t(state.language, wasRaided ? "msg.caravanRaidedExport" : "msg.caravanReturnedExport", {
          town: t(state.language, town.nameKey),
          amount: formatNumberUtil(deliveredAmount, state.language),
          qty: caravan.qty,
          good: t(state.language, good.nameKey),
        }),
        tone: wasRaided ? "bad" : "good",
      });
    } else {
      const gs = goods[caravan.goodId];
      goods[caravan.goodId] = { ...gs, holding: gs.holding + deliveredAmount };
      newEvents.push({
        id: nextId++,
        message: t(state.language, wasRaided ? "msg.caravanRaidedImport" : "msg.caravanReturnedImport", {
          town: t(state.language, town.nameKey),
          qty: Math.round(deliveredAmount),
          good: t(state.language, good.nameKey),
        }),
        tone: wasRaided ? "bad" : "good",
      });
    }
  }

  if (Math.random() < LOST_TREASURE_CHANCE) {
    const treasureAmount = Math.max(LOST_TREASURE_MIN_AMOUNT, Math.round(cash * LOST_TREASURE_PCT_OF_CASH));
    cash += treasureAmount;
    dailyCashEarned += treasureAmount;
    newEvents.push({
      id: nextId++,
      message: t(state.language, "msg.lostTreasureFound", {
        amount: formatNumberUtil(treasureAmount, state.language),
      }),
      tone: "good",
    });
  }

  const stillOpenContracts: ForwardContract[] = [];
  let contractsWon = state.stats.contractsWon;
  for (const contract of state.contracts) {
    if (contract.maturesAtTick > nextTick) {
      stillOpenContracts.push(contract);
      continue;
    }
    const settlePrice = goods[contract.goodId].price;
    const priceDelta =
      contract.direction === "long"
        ? settlePrice - contract.strikePrice
        : contract.strikePrice - settlePrice;
    // A loss can never exceed the margin put up at signing — no margin
    // calls, no negative cash, just a simple "worst case you lose your
    // deposit" retail-style contract.
    const payoff = Math.max(priceDelta * contract.qty, -contract.margin);
    cash += contract.margin + payoff;
    dailyCashEarned += Math.max(0, payoff);
    if (payoff >= 0) contractsWon += 1;
    const contractGood = GOODS_BY_ID[contract.goodId];
    newEvents.push({
      id: nextId++,
      message: t(state.language, payoff >= 0 ? "msg.contractProfit" : "msg.contractLoss", {
        good: t(state.language, contractGood.nameKey),
        amount: formatNumberUtil(Math.abs(payoff), state.language),
      }),
      tone: payoff >= 0 ? "good" : "bad",
    });
  }

  const gameOver = inflationIndex >= config.hyperinflationIndex;
  if (gameOver && !state.gameOver) {
    newEvents.push({
      id: nextId++,
      message: t(state.language, "msg.hyperinflationGameOver"),
      tone: "bad",
    });
  }

  // A "new record" is only worth celebrating once per run: compare against
  // priorBestNetWorth (the bar set by previous runs, snapshotted at the last
  // prestige/reset) rather than the continuously-climbing bestNetWorthEver,
  // which would otherwise fire on almost every tick while simply playing.
  const netWorthNow = computeNetWorth({ ...state, cash, goods, assets, loan });
  const netWorthHistory = pushCapped(state.netWorthHistory, netWorthNow, HISTORY_LEN);
  const beatPersonalRecord =
    !state.recordBrokenThisRun && state.priorBestNetWorth > 0 && netWorthNow > state.priorBestNetWorth;
  if (beatPersonalRecord) {
    newEvents.push({
      id: nextId++,
      message: t(state.language, "msg.newNetWorthRecord", {
        amount: formatNumberUtil(netWorthNow, state.language),
      }),
      tone: "good",
    });
  }

  const rivalNetWorth =
    state.rivalNetWorth * (1 + RIVAL_TOWN_GROWTH_RATE + (Math.random() - 0.5) * RIVAL_TOWN_GROWTH_JITTER);
  const rivalCurrentlyAhead = rivalNetWorth > netWorthNow;
  if (rivalCurrentlyAhead !== state.rivalCurrentlyAhead) {
    newEvents.push({
      id: nextId++,
      message: t(state.language, rivalCurrentlyAhead ? "msg.rivalTownOvertookYou" : "msg.rivalTownOvertaken", {
        amount: formatNumberUtil(rivalCurrentlyAhead ? rivalNetWorth : netWorthNow, state.language),
      }),
      tone: rivalCurrentlyAhead ? "bad" : "good",
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
    contracts: stillOpenContracts,
    cash,
    happiness,
    nextId,
    lastEvent,
    eventLog,
    gameOver,
    paused: gameOver ? true : state.paused,
    stats: { ...state.stats, totalCaravansCompleted, contractsWon },
    lastSavedAt: Date.now(),
    pendingDecision,
    pendingRequest,
    pendingRivalOffer,
    activeMiniQuest,
    activeSeasonalEvent,
    loan,
    workers,
    bestNetWorthEver: Math.max(state.bestNetWorthEver, netWorthNow),
    recordBrokenThisRun: state.recordBrokenThisRun || beatPersonalRecord,
    netWorthHistory,
    rivalNetWorth,
    rivalCurrentlyAhead,
    dailyProgress: { ...state.dailyProgress, cashEarned: dailyCashEarned },
  };
}

export function trade(state: EconomyState, goodId: GoodId, side: "buy" | "sell", qty: number): EconomyState {
  if (state.gameOver) return state;
  const good = GOODS_BY_ID[goodId];
  const gs = state.goods[goodId];
  const midPrice = gs.price;
  const marketDepth = marketDepthFactor(state);
  const spread = MARKET_SPREAD / marketDepth;
  const { min: minSupply, max: maxSupply } = supplyBounds(good);

  if (side === "buy") {
    const price = midPrice * (1 + spread / 2);
    const affordable = Math.floor(state.cash / price);
    const amount = Math.min(qty, affordable);
    if (amount <= 0) return state;
    const cost = amount * price;
    const holding = gs.holding + amount;
    const avgCost = (gs.avgCost * gs.holding + cost) / holding;
    const demandPressure = clamp(
      gs.demandPressure + (amount / good.baseSupply) * DEMAND_PRESSURE_SENSITIVITY / marketDepth,
      -DEMAND_PRESSURE_MAX,
      DEMAND_PRESSURE_MAX
    );
    return {
      ...state,
      cash: state.cash - cost,
      goods: {
        ...state.goods,
        [goodId]: {
          ...gs,
          holding,
          avgCost,
          demandPressure,
          supply: clamp(gs.supply - amount / marketDepth, minSupply, maxSupply),
        },
      },
      stats: { ...state.stats, totalTrades: state.stats.totalTrades + 1 },
      dailyProgress: { ...state.dailyProgress, trades: state.dailyProgress.trades + 1 },
    };
  }

  const price = midPrice * (1 - spread / 2);
  const amount = Math.min(qty, gs.holding);
  if (amount <= 0) return state;
  const proceeds = amount * price;
  const holding = gs.holding - amount;
  const demandPressure = clamp(
    gs.demandPressure - (amount / good.baseSupply) * DEMAND_PRESSURE_SENSITIVITY / marketDepth,
    -DEMAND_PRESSURE_MAX,
    DEMAND_PRESSURE_MAX
  );
  // Realized profit/loss vs. the cost basis, surfaced right in the event
  // feed — the whole point of buying low is seeing whether a sale landed
  // above or below what was paid for it.
  const pnl = (price - gs.avgCost) * amount;
  const { streak: tradeStreak, bonus } = nextTradeStreak(state.tradeStreak, pnl);
  const message =
    bonus > 0
      ? t(state.language, "msg.goodSoldProfitStreak", {
          streak: tradeStreak,
          good: t(state.language, good.nameKey),
          qty: amount,
          amount: formatNumberUtil(pnl + bonus, state.language),
          bonusPct: Math.round(clamp((tradeStreak - 1) * HOT_STREAK_BONUS_PER_TRADE, 0, HOT_STREAK_MAX_BONUS) * 100),
        })
      : t(state.language, pnl >= 0 ? "msg.goodSoldProfit" : "msg.goodSoldLoss", {
          good: t(state.language, good.nameKey),
          qty: amount,
          amount: formatNumberUtil(Math.abs(pnl), state.language),
        });
  const event: EconomyEvent = { id: state.nextId, message, tone: pnl >= 0 ? "good" : "bad" };
  return {
    ...state,
    cash: state.cash + proceeds + bonus,
    goods: {
      ...state.goods,
      [goodId]: {
        ...gs,
        holding,
        avgCost: holding > 0 ? gs.avgCost : 0,
        demandPressure,
        supply: clamp(gs.supply + amount / marketDepth, minSupply, maxSupply),
      },
    },
    nextId: state.nextId + 1,
    lastEvent: event,
    eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
    tradeStreak,
    stats: {
      ...state.stats,
      totalTrades: state.stats.totalTrades + 1,
      totalRealizedProfit: state.stats.totalRealizedProfit + pnl + bonus,
      bestTradeStreak: Math.max(state.stats.bestTradeStreak, tradeStreak),
    },
    dailyProgress: {
      ...state.dailyProgress,
      trades: state.dailyProgress.trades + 1,
      cashEarned: state.dailyProgress.cashEarned + proceeds + bonus,
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
      stats: { ...state.stats, totalTrades: state.stats.totalTrades + 1 },
      dailyProgress: { ...state.dailyProgress, trades: state.dailyProgress.trades + 1 },
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
  const { streak: tradeStreak, bonus } = nextTradeStreak(state.tradeStreak, pnl);
  const message =
    bonus > 0
      ? t(state.language, "msg.investSoldProfitStreak", {
          streak: tradeStreak,
          asset: t(state.language, asset.nameKey),
          qty: amount,
          amount: formatNumberUtil(pnl + bonus, state.language),
          bonusPct: Math.round(clamp((tradeStreak - 1) * HOT_STREAK_BONUS_PER_TRADE, 0, HOT_STREAK_MAX_BONUS) * 100),
        })
      : t(state.language, pnl >= 0 ? "msg.investSoldProfit" : "msg.investSoldLoss", {
          asset: t(state.language, asset.nameKey),
          qty: amount,
          amount: formatNumberUtil(Math.abs(pnl), state.language),
        });
  const event: EconomyEvent = { id: state.nextId, message, tone: pnl >= 0 ? "good" : "bad" };
  return {
    ...state,
    cash: state.cash + proceeds + bonus,
    assets: {
      ...state.assets,
      [assetId]: { ...as, holding, avgCost: holding > 0 ? as.avgCost : 0 },
    },
    nextId: state.nextId + 1,
    lastEvent: event,
    eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
    tradeStreak,
    stats: {
      ...state.stats,
      totalTrades: state.stats.totalTrades + 1,
      bestTradeStreak: Math.max(state.stats.bestTradeStreak, tradeStreak),
    },
    dailyProgress: {
      ...state.dailyProgress,
      trades: state.dailyProgress.trades + 1,
      cashEarned: state.dailyProgress.cashEarned + proceeds + bonus,
    },
  };
}

/** the real tariff a caravan pays right now: the town's base rate, cut by
 * the Kervansaray upgrade, any owned property, and any prestige perk —
 * shared by the reducer and the trade screen's previews so they never drift. */
export function effectiveTariffRate(state: EconomyState, town: ForeignTown): number {
  return Math.max(
    0,
    town.tariffRate -
      state.upgrades.caravanserai * UPGRADES_BY_ID.caravanserai.effectPerLevel -
      propertyCaravanTariffDiscount(state.ownedProperties) -
      perkCaravanTariffDiscount(state.prestigePerks)
  );
}

export function sendCaravan(
  state: EconomyState,
  townId: TownId,
  goodId: GoodId,
  direction: CaravanDirection,
  qty: number,
  insureRequested: boolean
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
  const tariffRate = effectiveTariffRate(state, town);
  const { min: minSupply, max: maxSupply } = supplyBounds(good);

  if (direction === "export") {
    const amount = Math.min(qty, gs.holding);
    if (amount <= 0) return state;
    const gross = amount * price;
    const net = gross * (1 - tariffRate);
    // Insurance is a small upfront cash premium regardless of trade
    // direction — quietly skipped if the player can't actually afford it,
    // same "clamp rather than block" spirit as an unaffordable buy order.
    const insurancePremium = gross * CARAVAN_INSURANCE_COST_PCT;
    const insured = insureRequested && state.cash >= insurancePremium;
    const caravan: Caravan = {
      id: state.nextId,
      townId,
      goodId,
      direction,
      qty: amount,
      amount: net,
      departedTick: state.tick,
      arrivesAtTick: state.tick + town.distanceTicks,
      insured,
    };
    return {
      ...state,
      nextId: state.nextId + 1,
      cash: state.cash - (insured ? insurancePremium : 0),
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
  const insurancePremium = cost * CARAVAN_INSURANCE_COST_PCT;
  const insured = insureRequested && state.cash >= cost + insurancePremium;
  const caravan: Caravan = {
    id: state.nextId,
    townId,
    goodId,
    direction,
    qty: amount,
    amount,
    departedTick: state.tick,
    arrivesAtTick: state.tick + town.distanceTicks,
    insured,
  };
  return {
    ...state,
    nextId: state.nextId + 1,
    cash: state.cash - cost - (insured ? insurancePremium : 0),
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

function openContract(
  state: EconomyState,
  goodId: GoodId,
  direction: ContractDirection,
  qty: number,
  termDays: number
): EconomyState {
  if (state.gameOver || qty <= 0) return state;
  if (state.contracts.length >= CONTRACT_MAX_ACTIVE) return state;
  if (!CONTRACT_TERM_DAY_STEPS.includes(termDays)) return state;
  const good = GOODS_BY_ID[goodId];
  if (!good || !isGoodUnlocked(good, state)) return state;
  const strikePrice = state.goods[goodId].price;
  const notional = strikePrice * qty;
  const margin = Math.round(notional * CONTRACT_MARGIN_PCT * 100) / 100;
  if (margin <= 0 || state.cash < margin) return state;
  const contract: ForwardContract = {
    id: state.nextId,
    goodId,
    direction,
    qty,
    strikePrice,
    margin,
    signedAtTick: state.tick,
    maturesAtTick: state.tick + termDays * TICKS_PER_GAME_DAY,
  };
  return {
    ...state,
    cash: state.cash - margin,
    nextId: state.nextId + 1,
    contracts: [...state.contracts, contract],
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
    // A mini quest's progress is measured against the daily counters above
    // via a baseline snapshot — resetting those out from under it would
    // make it unwinnable, so just drop it; a new one spawns again soon.
    activeMiniQuest: null,
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

function buyProperty(state: EconomyState, propertyId: string): EconomyState {
  if (state.gameOver) return state;
  if (state.ownedProperties.includes(propertyId)) return state;
  const def = PROPERTIES_BY_ID[propertyId];
  if (!def) return state;
  if (state.cash < def.cost) return state;
  return {
    ...state,
    cash: state.cash - def.cost,
    ownedProperties: [...state.ownedProperties, propertyId],
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

function setEmblem(state: EconomyState, emblemId: string): EconomyState {
  if (!isEmblemUnlocked(emblemId, state)) return state;
  return { ...state, selectedEmblem: emblemId };
}

function setEmblemColor(state: EconomyState, color: string): EconomyState {
  if (!EMBLEM_COLORS.includes(color)) return state;
  return { ...state, selectedEmblemColor: color };
}

export function computeNetWorth(state: EconomyState): number {
  return (
    state.cash +
    GOODS.reduce((sum, g) => sum + state.goods[g.id].holding * state.goods[g.id].price, 0) +
    ASSETS.reduce((sum, a) => sum + state.assets[a.id].holding * state.assets[a.id].price, 0) -
    (state.loan ? state.loan.remainingBalance : 0)
  );
}

export function loanCap(state: EconomyState): number {
  return Math.max(LOAN_MIN_CAP, Math.round(computeNetWorth(state) * LOAN_MAX_NET_WORTH_PCT));
}

/** The per-DAY rate a loan of the given term would carry if signed right
 * now: the base rate, discounted by the Banka upgrade level, plus a
 * premium for how hot inflation is currently running (compounded out to
 * what it implies over a full in-game day) and for how long the term
 * locks the bank in — mirrors how a real lender prices both inflation and
 * duration risk. This is the number worth showing the player. */
export function loanInterestRatePerDay(state: EconomyState, termMonths: number): number {
  const dailyInflation = clamp(Math.pow(1 + state.inflationRate, TICKS_PER_GAME_DAY) - 1, -0.5, 0.5);
  const inflationContribution = clamp(
    dailyInflation * LOAN_INFLATION_SENSITIVITY,
    -LOAN_MAX_INFLATION_DAY_CONTRIB,
    LOAN_MAX_INFLATION_DAY_CONTRIB
  );
  const termContribution = termMonths * LOAN_TERM_RATE_PER_MONTH_PER_DAY;
  return clamp(
    LOAN_BASE_INTEREST_RATE_PER_DAY +
      inflationContribution +
      termContribution -
      state.upgrades.bank * LOAN_BANK_DISCOUNT_PER_LEVEL_PER_DAY -
      propertyLoanRateDiscountPerDay(state.ownedProperties) -
      perkLoanRateDiscountPerDay(state.prestigePerks),
    LOAN_MIN_INTEREST_RATE_PER_DAY,
    LOAN_MAX_INTEREST_RATE_PER_DAY
  );
}

/** loanInterestRatePerDay converted to the equivalent per-tick rate — this
 * is what's actually locked onto the Loan and compounded every tick, so
 * the balance still drifts up smoothly instead of jumping once a day. */
export function loanInterestRatePerTick(state: EconomyState, termMonths: number): number {
  return loanDayRateToTickRate(loanInterestRatePerDay(state, termMonths));
}

export function loanDayRateToTickRate(dayRate: number): number {
  return Math.pow(1 + dayRate, 1 / TICKS_PER_GAME_DAY) - 1;
}

/** Inverse of loanDayRateToTickRate — recovers the "%/day" figure worth
 * displaying for a loan's already-locked-in per-tick rate. */
export function loanTickRateToDayRate(tickRate: number): number {
  return Math.pow(1 + tickRate, TICKS_PER_GAME_DAY) - 1;
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

/** TRADE_UNLOCK_NET_WORTH discounted by the earlyExplorer prestige perk. */
export function effectiveTradeUnlockNetWorth(state: EconomyState): number {
  return TRADE_UNLOCK_NET_WORTH * perkUnlockThresholdMult(state.prestigePerks);
}

/** METROPOL_UNLOCK_NET_WORTH discounted by the earlyExplorer prestige perk. */
export function effectiveMetropolUnlockNetWorth(state: EconomyState): number {
  return METROPOL_UNLOCK_NET_WORTH * perkUnlockThresholdMult(state.prestigePerks);
}

function applyTradeUnlock(state: EconomyState): EconomyState {
  if (state.tradeUnlocked) return state;
  if (computeNetWorth(state) < effectiveTradeUnlockNetWorth(state)) return state;

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

function applyMetropolUnlock(state: EconomyState): EconomyState {
  if (state.metropolUnlocked) return state;
  if (computeNetWorth(state) < effectiveMetropolUnlockNetWorth(state)) return state;

  const event: EconomyEvent = {
    id: state.nextId,
    message: t(state.language, "msg.metropolUnlocked"),
    tone: "good",
  };
  return {
    ...state,
    metropolUnlocked: true,
    nextId: state.nextId + 1,
    lastEvent: event,
    eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
  };
}

// Unlike every other content gate, this one tracks prestigeLevel (a
// permanent counter that survives every reset) rather than the current
// run's net worth — so once earned, the legendary trading partner (see
// towns.ts) stays open from tick one of every future run too.
function applyLegendaryUnlock(state: EconomyState): EconomyState {
  if (state.legendaryUnlocked) return state;
  if (state.prestigeLevel < LEGENDARY_UNLOCK_PRESTIGE_LEVEL) return state;

  const event: EconomyEvent = {
    id: state.nextId,
    message: t(state.language, "msg.legendaryUnlocked"),
    tone: "good",
  };
  return {
    ...state,
    legendaryUnlocked: true,
    nextId: state.nextId + 1,
    lastEvent: event,
    eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
  };
}

// Sticky, endless net-worth milestone ladder (see townRanks.ts) — checked
// every action like an achievement, but unlike achievements a single big
// jump in net worth (e.g. a long offline catch-up) can clear several
// tiers at once, so every skipped tier's reward is paid out, not just the
// one landed on.
function applyTownRankUp(state: EconomyState): EconomyState {
  const targetIndex = townRankIndexForNetWorth(computeNetWorth(state));
  if (targetIndex <= state.townRankIndex) return state;

  let nextId = state.nextId;
  let cash = state.cash;
  const newEvents: EconomyEvent[] = [];
  for (let index = state.townRankIndex + 1; index <= targetIndex; index++) {
    const reward = townRankReward(index);
    cash += reward;
    const beyond = townRankBeyondCount(index);
    const title =
      beyond > 0
        ? t(state.language, "townRank.beyondTitle", { base: t(state.language, townRankNameKey(index)), n: beyond + 1 })
        : t(state.language, townRankNameKey(index));
    newEvents.push({
      id: nextId++,
      message: t(state.language, "msg.townRankUp", {
        icon: townRankIcon(index),
        title,
        reward: formatNumberUtil(reward, state.language),
      }),
      tone: "good",
    });
  }

  return {
    ...state,
    cash,
    nextId,
    townRankIndex: targetIndex,
    lastEvent: newEvents[newEvents.length - 1],
    eventLog: [...newEvents].reverse().concat(state.eventLog).slice(0, EVENT_LOG_CAP),
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

// Only checks completion/expiry of the active mini quest — the random
// spawn roll lives in tick() itself so it fires once per real tick, not
// once per player action (this runs after every action, like the other
// applyX post-processing steps).
function applyMiniQuest(state: EconomyState): EconomyState {
  const mq = state.activeMiniQuest;
  if (!mq) return state;
  const template = MINI_QUEST_TEMPLATES_BY_ID[mq.templateId];
  if (!template) return { ...state, activeMiniQuest: null };

  const progress = template.metric(state.dailyProgress) - mq.baseline;
  if (progress >= mq.target) {
    const event: EconomyEvent = {
      id: state.nextId,
      message: t(state.language, "msg.miniQuestCompleted", {
        icon: template.icon,
        title: t(state.language, template.titleKey),
        reward: mq.reward,
      }),
      tone: "good",
    };
    return {
      ...state,
      cash: state.cash + mq.reward,
      activeMiniQuest: null,
      nextId: state.nextId + 1,
      lastEvent: event,
      eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
    };
  }

  if (state.tick >= mq.expiresAtTick) {
    const event: EconomyEvent = {
      id: state.nextId,
      message: t(state.language, "msg.miniQuestExpired", {
        icon: template.icon,
        title: t(state.language, template.titleKey),
      }),
      tone: "neutral",
    };
    return {
      ...state,
      activeMiniQuest: null,
      nextId: state.nextId + 1,
      lastEvent: event,
      eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
    };
  }

  return state;
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
    // Checked every iteration (unlike the other applyX steps below) since
    // a mini quest's short deadline can spawn, complete, and expire many
    // times over within a single offline gap.
    s = applyMiniQuest(s);
  }
  s = applyTownRankUp(
    applyLegendaryUnlock(applyMetropolUnlock(applyTradeUnlock(applyDailyQuests(applyAchievements(s)))))
  );

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

function resolveRivalOffer(state: EconomyState, accept: boolean): EconomyState {
  const offer = state.pendingRivalOffer;
  if (!offer) return state;
  const good = GOODS_BY_ID[offer.goodId];
  const gs = state.goods[offer.goodId];
  const goodName = t(state.language, good.nameKey);

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
      pendingRivalOffer: null,
      nextId: state.nextId + 1,
      lastEvent: event,
      eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
    };
  }

  if (accept) {
    if (gs.holding < offer.qty) {
      return outcome("msg.rivalOfferInsufficient", { good: goodName }, "neutral", {});
    }
    const total = offer.qty * offer.pricePerUnit;
    return outcome(
      "msg.rivalOfferAccepted",
      { qty: offer.qty, good: goodName, amount: formatNumberUtil(total, state.language) },
      "good",
      {
        cash: state.cash + total,
        goods: { ...state.goods, [offer.goodId]: { ...gs, holding: gs.holding - offer.qty } },
      }
    );
  }

  return outcome("msg.rivalOfferDeclined", undefined, "neutral", {});
}

function prestige(state: EconomyState): EconomyState {
  const netWorthNow = computeNetWorth(state);
  if (netWorthNow < PRESTIGE_UNLOCK_NET_WORTH) return state;
  const nextLevel = state.prestigeLevel + 1;
  const base = initialState(state.difficulty, state.language);
  const bestNetWorthEver = Math.max(state.bestNetWorthEver, netWorthNow);
  const event: EconomyEvent = {
    id: base.nextId,
    message: t(state.language, "msg.prestiged", { level: nextLevel }),
    tone: "good",
  };
  return {
    ...base,
    townName: state.townName,
    prestigeLevel: nextLevel,
    prestigePoints: state.prestigePoints + PRESTIGE_POINTS_PER_PRESTIGE,
    prestigePerks: state.prestigePerks,
    // Identity, not run state — the record and the bar to beat next carry
    // over even though everything else about the run resets.
    bestNetWorthEver,
    priorBestNetWorth: bestNetWorthEver,
    recordBrokenThisRun: false,
    cash: base.cash + nextLevel * PRESTIGE_CASH_BONUS_PER_LEVEL + perkHeadStartBonus(state.prestigePerks),
    nextId: base.nextId + 1,
    lastEvent: event,
    eventLog: [event],
  };
}

function unlockPrestigePerk(state: EconomyState, perkId: string): EconomyState {
  if (state.prestigePerks.includes(perkId)) return state;
  const def = PRESTIGE_PERKS_BY_ID[perkId];
  if (!def) return state;
  if (def.requires && !state.prestigePerks.includes(def.requires)) return state;
  if (state.prestigePoints < def.cost) return state;
  return {
    ...state,
    prestigePoints: state.prestigePoints - def.cost,
    prestigePerks: [...state.prestigePerks, perkId],
  };
}

export function takeLoan(state: EconomyState, amount: number, termMonths: number): EconomyState {
  if (state.gameOver || state.loan || amount <= 0) return state;
  if (!LOAN_TERM_MONTHS_STEPS.includes(termMonths)) return state;
  const principal = Math.min(Math.round(amount), loanCap(state));
  if (principal <= 0) return state;
  const interestRatePerTick = loanInterestRatePerTick(state, termMonths);
  return {
    ...state,
    cash: state.cash + principal,
    loan: { principal, remainingBalance: principal, interestRatePerTick, termMonths, takenAtTick: state.tick },
  };
}

export function repayLoan(state: EconomyState, amount: number): EconomyState {
  if (!state.loan || amount <= 0) return state;
  const payment = Math.min(amount, state.cash, state.loan.remainingBalance);
  if (payment <= 0) return state;
  const remainingBalance = state.loan.remainingBalance - payment;
  const paidOff = remainingBalance <= 0.01;
  return {
    ...state,
    cash: state.cash - payment,
    loan: paidOff ? null : { ...state.loan, remainingBalance },
    stats: paidOff ? { ...state.stats, loansRepaid: state.stats.loansRepaid + 1 } : state.stats,
  };
}

function hireWorker(state: EconomyState, goodId: GoodId): EconomyState {
  if (state.gameOver) return state;
  const count = state.workers[goodId];
  if (count >= WORKER_MAX_PER_GOOD) return state;
  return { ...state, workers: { ...state.workers, [goodId]: count + 1 } };
}

function fireWorker(state: EconomyState, goodId: GoodId): EconomyState {
  const count = state.workers[goodId];
  if (count <= 0) return state;
  return { ...state, workers: { ...state.workers, [goodId]: count - 1 } };
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
      return sendCaravan(state, action.townId, action.goodId, action.direction, action.qty, action.insured);
    case "TOGGLE_PAUSE":
      return state.gameOver ? state : { ...state, paused: !state.paused };
    case "RESET": {
      // A new difficulty starts the economy over, but the player's chosen
      // town name, language, and any earned prestige bonus are identity,
      // not run state — keep them.
      const base = initialState(action.difficulty, state.language);
      const bestNetWorthEver = Math.max(state.bestNetWorthEver, computeNetWorth(state));
      return {
        ...base,
        townName: state.townName,
        prestigeLevel: state.prestigeLevel,
        prestigePoints: state.prestigePoints,
        prestigePerks: state.prestigePerks,
        bestNetWorthEver,
        priorBestNetWorth: bestNetWorthEver,
        recordBrokenThisRun: false,
        cash:
          base.cash +
          state.prestigeLevel * PRESTIGE_CASH_BONUS_PER_LEVEL +
          perkHeadStartBonus(state.prestigePerks),
      };
    }
    case "PRESTIGE":
      return prestige(state);
    case "UNLOCK_PRESTIGE_PERK":
      return unlockPrestigePerk(state, action.perkId);
    case "OPEN_CONTRACT":
      return openContract(state, action.goodId, action.direction, action.qty, action.termDays);
    case "TAKE_LOAN":
      return takeLoan(state, action.amount, action.termMonths);
    case "REPAY_LOAN":
      return repayLoan(state, action.amount);
    case "HIRE_WORKER":
      return hireWorker(state, action.goodId);
    case "FIRE_WORKER":
      return fireWorker(state, action.goodId);
    case "HYDRATE":
      return action.state;
    case "DAILY_CHECKIN":
      return dailyCheckIn(state, action.today);
    case "UPGRADE":
      return upgrade(state, action.upgradeId);
    case "RESEARCH":
      return research(state, action.nodeId);
    case "BUY_PROPERTY":
      return buyProperty(state, action.propertyId);
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
    case "RESOLVE_RIVAL_OFFER":
      return resolveRivalOffer(state, action.accept);
    case "SET_TOWN_NAME":
      return setTownName(state, action.name);
    case "SET_LANGUAGE":
      return setLanguage(state, action.language);
    case "SET_EMBLEM":
      return setEmblem(state, action.emblemId);
    case "SET_EMBLEM_COLOR":
      return setEmblemColor(state, action.color);
    default:
      return state;
  }
}

function reducer(state: EconomyState, action: Action): EconomyState {
  const next = baseReducer(state, action);
  if (next === state || action.type === "RESET") return next;
  return applyMiniQuest(
    applyTownRankUp(
      applyLegendaryUnlock(applyMetropolUnlock(applyTradeUnlock(applyDailyQuests(applyAchievements(next)))))
    )
  );
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
    (townId: TownId, goodId: GoodId, direction: CaravanDirection, qty: number, insured: boolean) =>
      dispatch({ type: "SEND_CARAVAN", townId, goodId, direction, qty, insured }),
    []
  );
  const togglePause = useCallback(() => dispatch({ type: "TOGGLE_PAUSE" }), []);
  const reset = useCallback(
    (difficulty: DifficultyId) => dispatch({ type: "RESET", difficulty }),
    []
  );
  const prestige_ = useCallback(() => dispatch({ type: "PRESTIGE" }), []);
  const unlockPrestigePerk_ = useCallback(
    (perkId: string) => dispatch({ type: "UNLOCK_PRESTIGE_PERK", perkId }),
    []
  );
  const openContract_ = useCallback(
    (goodId: GoodId, direction: ContractDirection, qty: number, termDays: number) =>
      dispatch({ type: "OPEN_CONTRACT", goodId, direction, qty, termDays }),
    []
  );
  const takeLoan_ = useCallback(
    (amount: number, termMonths: number) => dispatch({ type: "TAKE_LOAN", amount, termMonths }),
    []
  );
  const repayLoan_ = useCallback((amount: number) => dispatch({ type: "REPAY_LOAN", amount }), []);
  const hireWorker_ = useCallback((goodId: GoodId) => dispatch({ type: "HIRE_WORKER", goodId }), []);
  const fireWorker_ = useCallback((goodId: GoodId) => dispatch({ type: "FIRE_WORKER", goodId }), []);
  const upgrade_ = useCallback(
    (upgradeId: UpgradeId) => dispatch({ type: "UPGRADE", upgradeId }),
    []
  );
  const research_ = useCallback((nodeId: string) => dispatch({ type: "RESEARCH", nodeId }), []);
  const hydrate_ = useCallback((imported: EconomyState) => dispatch({ type: "HYDRATE", state: imported }), []);
  const buyProperty_ = useCallback(
    (propertyId: string) => dispatch({ type: "BUY_PROPERTY", propertyId }),
    []
  );
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
  const resolveRivalOffer_ = useCallback(
    (accept: boolean) => dispatch({ type: "RESOLVE_RIVAL_OFFER", accept }),
    []
  );
  const setTownName = useCallback((name: string) => dispatch({ type: "SET_TOWN_NAME", name }), []);
  const setEmblem_ = useCallback((emblemId: string) => dispatch({ type: "SET_EMBLEM", emblemId }), []);
  const setEmblemColor_ = useCallback((color: string) => dispatch({ type: "SET_EMBLEM_COLOR", color }), []);
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
  const netWorth = state.cash + portfolioValue + assetsValue - (state.loan ? state.loan.remainingBalance : 0);
  const marketSpreadPct = marketSpread(state);

  return {
    state,
    selectGood,
    trade: trade_,
    sendCaravan: sendCaravan_,
    togglePause,
    reset,
    prestige: prestige_,
    unlockPrestigePerk: unlockPrestigePerk_,
    openContract: openContract_,
    hydrate: hydrate_,
    takeLoan: takeLoan_,
    repayLoan: repayLoan_,
    hireWorker: hireWorker_,
    fireWorker: fireWorker_,
    upgrade: upgrade_,
    research: research_,
    buyProperty: buyProperty_,
    tradeAsset: tradeAsset_,
    setTaxRate: setTaxRate_,
    dismissOfflineSummary,
    resolveDecision: resolveDecision_,
    resolveRequest,
    resolveRivalOffer: resolveRivalOffer_,
    setTownName,
    setEmblem: setEmblem_,
    setEmblemColor: setEmblemColor_,
    setLanguage: setLanguage_,
    t: translate,
    formatCoins: (value: number, decimals?: number) =>
      formatCoinsUtil(value, state.language, decimals),
    portfolioValue,
    assetsValue,
    netWorth,
    marketSpreadPct,
    hydrated,
  };
}

export { GOODS, GOODS_BY_ID };
