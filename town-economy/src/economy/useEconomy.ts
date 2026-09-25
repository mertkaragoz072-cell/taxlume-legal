import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ACHIEVEMENTS } from "./achievements";
import { ASSETS, ASSETS_BY_ID, AssetId } from "./assets";
import { DECISION_TEMPLATES_BY_ID } from "./decisions";
import { DIFFICULTIES, DifficultyId } from "./difficulty";
import { EMBLEM_COLORS, isEmblemUnlocked } from "./emblems";
import { GOODS, GOODS_BY_ID } from "./goods";
import { openingDemandCycles } from "./demandCycles";
import { MENTOR_STEPS } from "./mentor";
import { rollActivity, TRADING_HOUSES } from "./tradingHouses";
import { TRADERS, TRADERS_BY_ID, reputationDelta, REPUTATION_TO_PRICE_MODIFIER } from "./traders";
import { RIVAL_TRADERS, rollRivalActivity } from "./rivals";
import { generateDailyQuotas } from "./productionQuotas";
import { DOCTRINES_BY_ID, doctrineModifiers, isDoctrineId } from "./doctrines";
import { loadEconomyState, saveEconomyState } from "./persist";
import { PROPERTIES_BY_ID } from "./properties";
import { perkHeadStartBonus, PRESTIGE_PERKS_BY_ID } from "./prestigePerks";
import { makeInitialDailyProgress, pickDailyQuestTemplates, QUEST_TEMPLATES_BY_ID } from "./quests";
import { RESEARCH_NODES_BY_ID } from "./research";
import { WORKER_MAX_PER_GOOD } from "./workers";
import {
  isoWeekKey,
  WEEKLY_CHALLENGE_TEMPLATES_BY_ID,
  weeklyChallengeTemplateForWeek,
} from "./weeklyChallenges";
import { effectiveDifficultyConfig, ngPlusBonusPrestigePoints } from "./ngPlusModifiers";
import { TOWNS, TOWNS_BY_ID, TownId } from "./towns";
import { UPGRADES_BY_ID, upgradeCost } from "./upgrades";
import { VILLAGER_REQUEST_GIVE_HAPPINESS, VILLAGER_REQUEST_REFUSE_HAPPINESS } from "./villagerRequests";
import { deviceLanguage } from "../i18n/deviceLanguage";
import { DEFAULT_LANGUAGE, Language, t, tPlural } from "../i18n/t";
import {
  formatCoins as formatCoinsUtil,
  formatCompactNumber as formatNumberUtil,
} from "../utils/formatNumber";
import {
  AutoTradeRule,
  BulkContract,
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
  WeeklyChallenge,
} from "./types";
import {
  AUTO_TRADE_MAX_RULES,
  AUTO_TRADE_TRIGGER_PCT_STEPS,
  BOOSTED_TICK_MS,
  BULK_CONTRACT_BONUS_PCT,
  BULK_CONTRACT_MAX_ACTIVE,
  BULK_CONTRACT_TERM_DAY_STEPS,
  CARAVAN_INSURANCE_COST_PCT,
  CONTRACT_MARGIN_PCT,
  CONTRACT_MAX_ACTIVE,
  CONTRACT_TERM_DAY_STEPS,
  DAILY_BONUS_BASE,
  DAILY_BONUS_CAP,
  DAILY_BONUS_PER_STREAK_DAY,
  DAILY_QUEST_COUNT,
  DEFAULT_DIFFICULTY,
  DOCTRINE_UNLOCK_NET_WORTH,
  DEMAND_PRESSURE_MAX,
  DEMAND_PRESSURE_SENSITIVITY,
  EVENT_LOG_CAP,
  HOT_STREAK_BONUS_PER_TRADE,
  HOT_STREAK_MAX_BONUS,
  LEGENDARY_POINTS_PER_PRESTIGE,
  LOAN_TERM_MONTHS_STEPS,
  MARKET_SPREAD,
  MAX_OFFLINE_MS,
  MAX_OFFLINE_TICKS,
  MIN_OFFLINE_MS_TO_SHOW,
  MS_PER_DAY,
  PRESTIGE_CASH_BONUS_PER_LEVEL,
  PRESTIGE_POINTS_PER_PRESTIGE,
  PRESTIGE_UNLOCK_NET_WORTH,
  SPEED_BOOST_DURATION_MS,
  TAX_RATE_MAX,
  TICKS_PER_GAME_DAY,
  INTERRUPTION_COOLDOWN_TICKS,
  TICK_MS,
  TOWN_NAME_MAX_LENGTH,
} from "./constants";
import {
  clamp,
  computeNetWorth,
  effectiveTariffRate,
  isGoodUnlocked,
  loanCap,
  loanInterestRatePerTick,
  marketDepthFactor,
  marketSpread,
  nextTradeStreak,
  researchCost,
  storageCapacity,
  supplyBounds,
  totalGoodsHolding,
} from "./formulas";
import {
  applyAchievements,
  applyDailyQuests,
  applyOnboarding,
  applyLegendaryUnlock,
  applyMetropolUnlock,
  applyMiniQuest,
  applyMythicUnlock,
  applyTownRankUp,
  applyTradeUnlock,
} from "./progression";
import { tick } from "./tick";

// The simulation was split out of this file; these re-exports keep it the
// single import site for the rest of the app, so a screen still reaches for
// `economy/useEconomy` rather than needing to know which module a constant
// or formula now lives in.
export {
  AUTO_TRADE_MAX_RULES,
  AUTO_TRADE_TRIGGER_PCT_STEPS,
  BOOSTED_TICK_MS,
  BULK_CONTRACT_BONUS_PCT,
  BULK_CONTRACT_MAX_ACTIVE,
  BULK_CONTRACT_TERM_DAY_STEPS,
  CARAVAN_INSURANCE_COST_PCT,
  CARAVAN_RAID_CHANCE,
  CARAVAN_RAID_LOSS_MAX,
  CARAVAN_RAID_LOSS_MIN,
  CONTRACT_MARGIN_PCT,
  CONTRACT_MAX_ACTIVE,
  CONTRACT_TERM_DAY_STEPS,
  HOT_STREAK_BONUS_PER_TRADE,
  HOT_STREAK_MAX_BONUS,
  LEGENDARY_POINTS_PER_PRESTIGE,
  LEGENDARY_UNLOCK_PRESTIGE_LEVEL,
  LOAN_BANK_DISCOUNT_PER_LEVEL_PER_DAY,
  LOAN_BASE_INTEREST_RATE_PER_DAY,
  LOAN_INFLATION_SENSITIVITY,
  LOAN_MAX_INFLATION_DAY_CONTRIB,
  LOAN_MAX_INTEREST_RATE_PER_DAY,
  LOAN_MAX_NET_WORTH_PCT,
  LOAN_MIN_CAP,
  LOAN_MIN_INTEREST_RATE_PER_DAY,
  LOAN_TERM_DAYS_PER_MONTH,
  LOAN_TERM_MONTHS_STEPS,
  LOAN_TERM_RATE_PER_MONTH_PER_DAY,
  MARKET_SPREAD,
  MAX_OFFLINE_MS,
  MAX_OFFLINE_TICKS,
  DOCTRINE_UNLOCK_NET_WORTH,
  METROPOL_UNLOCK_NET_WORTH,
  MIN_OFFLINE_MS_TO_SHOW,
  MYTHIC_UNLOCK_LEGENDARY_POINTS,
  PRESTIGE_CASH_BONUS_PER_LEVEL,
  PRESTIGE_POINTS_PER_PRESTIGE,
  PRESTIGE_PRODUCTION_BONUS_PER_LEVEL,
  PRESTIGE_UNLOCK_NET_WORTH,
  RIVAL_TOWN_GRACE_DAYS,
  RIVAL_TOWN_GROWTH_RATE,
  SPEED_BOOST_DURATION_MS,
  SPEED_BOOST_MULTIPLIER,
  STORAGE_BASE_CAPACITY,
  TAX_OUTPUT_FACTOR,
  TAX_RATE_MAX,
  TAX_RATE_STEPS,
  TICKS_PER_GAME_DAY,
  TICK_MS,
  TOWN_NAME_MAX_LENGTH,
  TOWN_RANK_PRODUCTION_BONUS_PER_RANK,
  TRADE_UNLOCK_NET_WORTH,
} from "./constants";
export {
  computeNetWorth,
  effectiveMetropolUnlockNetWorth,
  effectiveTariffRate,
  effectiveTradeUnlockNetWorth,
  estimateTaxIncomePerTick,
  gameDayFromTick,
  isGoodUnlocked,
  loanCap,
  loanDayRateToTickRate,
  loanInterestRatePerDay,
  loanInterestRatePerTick,
  loanTickRateToDayRate,
  marketDepthFactor,
  marketSpread,
  researchCost,
  storageCapacity,
  totalGoodsHolding,
} from "./formulas";
export { applyMythicUnlock } from "./progression";
export { tick } from "./tick";

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
      tariffDiscountBonus?: number;
    }
  | { type: "TOGGLE_PAUSE" }
  | { type: "RESET"; difficulty: DifficultyId; ngPlusModifiers?: string[] }
  | { type: "PRESTIGE" }
  | { type: "UNLOCK_PRESTIGE_PERK"; perkId: string }
  | { type: "CHOOSE_DOCTRINE"; doctrineId: string }
  | {
      type: "OPEN_CONTRACT";
      goodId: GoodId;
      direction: ContractDirection;
      qty: number;
      termDays: number;
    }
  | { type: "OPEN_BULK_CONTRACT"; goodId: GoodId; qty: number; termDays: number }
  | { type: "ADD_AUTO_TRADE_RULE"; goodId: GoodId; side: "buy" | "sell"; triggerPct: number; qty: number }
  | { type: "REMOVE_AUTO_TRADE_RULE"; ruleId: number }
  | { type: "TOGGLE_AUTO_TRADE_RULE"; ruleId: number }
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
  | { type: "SET_EMBLEM_COLOR"; color: string }
  | { type: "CLAIM_SPEED_BOOST" }
  | { type: "ADVANCE_MENTOR"; to: number }
  | { type: "DISMISS_DAILY_BONUS" };
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
  language: Language = DEFAULT_LANGUAGE,
  ngPlusModifierIds: string[] = []
): EconomyState {
  const config = effectiveDifficultyConfig(DIFFICULTIES[difficulty], ngPlusModifierIds);
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
  const day1GoodIds = GOODS.filter((g) => !g.unlockDay).map((g) => g.id);
  const allTownIds = TOWNS.map((tn) => tn.id);
  const opening = openingDemandCycles(TICKS_PER_GAME_DAY, day1GoodIds);
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
    mythicUnlocked: false,
    townRankIndex: 0,
    researched: [],
    assets,
    upgrades: {
      market: 0,
      caravanserai: 0,
      townhall: 0,
      bank: 0,
      guardTower: 0,
      earthquakeFund: 0,
      storageYard: 0,
    },
    taxRate: 0,
    happiness: 100,
    lastSavedAt: Date.now(),
    offlineSummary: null,
    onboardingStep: 0,
    mentorStep: 0,
    pendingDecision: null,
    pendingRequest: null,
    pendingRivalOffer: null,
    // Negative, so the first interruption of a new town is not held back by
    // a cooldown that has notionally been running since before tick 0.
    lastInterruptionTick: -INTERRUPTION_COOLDOWN_TICKS,
    dailyProgress: makeInitialDailyProgress(),
    dailyQuests: makeDailyQuests("init"),
    activeMiniQuest: null,
    prestigeLevel: 0,
    prestigePoints: 0,
    prestigePerks: [],
    legendaryPoints: 0,
    bestNetWorthEver: 0,
    priorBestNetWorth: 0,
    recordBrokenThisRun: false,
    activeSeasonalEvent: null,
    loan: null,
    workers: Object.fromEntries(GOODS.map((g) => [g.id, 0])) as Record<GoodId, number>,
    ownedProperties: [],
    contracts: [],
    bulkContracts: [],
    autoTradeRules: [],
    weeklyChallenge: null,
    activeBounties: [],
    productionQuotas: generateDailyQuotas(),
    productionToday: Object.fromEntries(GOODS.map((g) => [g.id, 0])) as Record<GoodId, number>,
    activeNgPlusModifiers: ngPlusModifierIds,
    speedBoostExpiresAt: null,
    speedBoostClaimedDate: null,
    dailyBonusPending: null,
    // Both cycles exist from tick 0, so a brand-new town already has a market
    // rhythm to read and a forecast to plan against. Only day-1 goods are
    // eligible; the later ones join the draw as they unlock.
    demandCycle: opening.first,
    nextDemandCycle: opening.next,
    pendingCrisis: null,
    doctrine: null,
    // Every house is already at work on day one, so the foreign markets
    // are contested from the first caravan rather than only later.
    tradingHouses: TRADING_HOUSES.map((h) =>
      rollActivity(h.id, 0, TICKS_PER_GAME_DAY, allTownIds, day1GoodIds)
    ),
    // Known traders start at neutral reputation (0); they will become known
    // to the player through repeated trades, see traders.ts.
    traderReputations: {},
    // Rival traders start with activity on day 1, so the home market is contested
    // from the beginning rather than only later, see rivals.ts.
    rivalActivities: RIVAL_TRADERS.map((r) => rollRivalActivity(r.id, 0, TICKS_PER_GAME_DAY, day1GoodIds)),
    firstCaravanSent: false,
  };
}
export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}
export function trade(state: EconomyState, goodId: GoodId, side: "buy" | "sell", qty: number): EconomyState {
  if (state.gameOver) return state;
  const good = GOODS_BY_ID[goodId];
  const gs = state.goods[goodId];
  let midPrice = gs.price;
  const marketDepth = marketDepthFactor(state);
  const spread = MARKET_SPREAD / marketDepth;
  const { min: minSupply, max: maxSupply } = supplyBounds(good);

  // A random trader appears for each transaction, bringing their reputation into the price.
  const traderId = TRADERS[Math.floor(Math.random() * TRADERS.length)].id;
  const traderRep = state.traderReputations[traderId] ?? {
    traderId,
    reputation: 0,
    tradeCount: 0,
    metAtTick: state.tick,
  };
  const priceModifier = REPUTATION_TO_PRICE_MODIFIER(traderRep.reputation);
  midPrice = midPrice * (1 + priceModifier);

  if (side === "buy") {
    const price = midPrice * (1 + spread / 2);
    const affordable = Math.floor(state.cash / price);
    const capRemaining = Math.max(0, Math.floor(storageCapacity(state) - totalGoodsHolding(state)));
    const amount = Math.min(qty, affordable, capRemaining);
    if (amount <= 0) return state;
    const cost = amount * price;
    const holding = gs.holding + amount;
    const avgCost = (gs.avgCost * gs.holding + cost) / holding;
    const demandPressure = clamp(
      gs.demandPressure + ((amount / good.baseSupply) * DEMAND_PRESSURE_SENSITIVITY) / marketDepth,
      -DEMAND_PRESSURE_MAX,
      DEMAND_PRESSURE_MAX
    );
    // Update trader reputation
    const trader = TRADERS_BY_ID[traderId];
    const repDelta = reputationDelta(goodId, "buy", amount, trader);
    const updatedTraderRep: typeof traderRep = {
      ...traderRep,
      reputation: Math.max(-100, Math.min(100, traderRep.reputation + repDelta)),
      tradeCount: traderRep.tradeCount + 1,
    };
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
      traderReputations: {
        ...state.traderReputations,
        [traderId]: updatedTraderRep,
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
    gs.demandPressure - ((amount / good.baseSupply) * DEMAND_PRESSURE_SENSITIVITY) / marketDepth,
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
          bonusPct: Math.round(
            clamp((tradeStreak - 1) * HOT_STREAK_BONUS_PER_TRADE, 0, HOT_STREAK_MAX_BONUS) * 100
          ),
        })
      : t(state.language, pnl >= 0 ? "msg.goodSoldProfit" : "msg.goodSoldLoss", {
          good: t(state.language, good.nameKey),
          qty: amount,
          amount: formatNumberUtil(Math.abs(pnl), state.language),
        });
  const event: EconomyEvent = { id: state.nextId, message, tone: pnl >= 0 ? "good" : "bad" };
  // Update trader reputation
  const trader = TRADERS_BY_ID[traderId];
  const repDelta = reputationDelta(goodId, "sell", amount, trader);
  const updatedTraderRep: typeof traderRep = {
    ...traderRep,
    reputation: Math.max(-100, Math.min(100, traderRep.reputation + repDelta)),
    tradeCount: traderRep.tradeCount + 1,
  };
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
    traderReputations: {
      ...state.traderReputations,
      [traderId]: updatedTraderRep,
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
function tradeAsset(state: EconomyState, assetId: AssetId, side: "buy" | "sell", qty: number): EconomyState {
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
          bonusPct: Math.round(
            clamp((tradeStreak - 1) * HOT_STREAK_BONUS_PER_TRADE, 0, HOT_STREAK_MAX_BONUS) * 100
          ),
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
export function sendCaravan(
  state: EconomyState,
  townId: TownId,
  goodId: GoodId,
  direction: CaravanDirection,
  qty: number,
  insureRequested: boolean,
  // A one-off tariff cut for this caravan only, won by tapping "stop" near
  // the sweet spot in the bargaining mini-game (see BargainingModal.tsx) —
  // 0 by every existing caller, never stored, never affects the town's
  // actual tariffRate for the next trade.
  tariffDiscountBonus = 0
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
  // A merchant town's caravans are on the road less time; every other
  // doctrine leaves the distance exactly as the map says.
  const travelTicks =
    town.distanceDays * TICKS_PER_GAME_DAY * doctrineModifiers(state.doctrine).caravanSpeedMult;
  const tariffRate = effectiveTariffRate(state, town) * (1 - clamp(tariffDiscountBonus, 0, 1));
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
      arrivesAtTick: state.tick + Math.max(1, Math.round(travelTicks)),
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
      firstCaravanSent: true,
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
    arrivesAtTick: state.tick + Math.max(1, Math.round(travelTicks)),
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
    firstCaravanSent: true,
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
export function openBulkContract(
  state: EconomyState,
  goodId: GoodId,
  qty: number,
  termDays: number
): EconomyState {
  if (state.gameOver || qty <= 0) return state;
  if (state.bulkContracts.length >= BULK_CONTRACT_MAX_ACTIVE) return state;
  if (!BULK_CONTRACT_TERM_DAY_STEPS.includes(termDays)) return state;
  const good = GOODS_BY_ID[goodId];
  if (!good || !isGoodUnlocked(good, state)) return state;
  const gs = state.goods[goodId];
  if (gs.holding < qty) return state;
  const lockedPricePerUnit = gs.price * (1 + BULK_CONTRACT_BONUS_PCT);
  const contract: BulkContract = {
    id: state.nextId,
    goodId,
    qty,
    lockedPricePerUnit,
    signedAtTick: state.tick,
    maturesAtTick: state.tick + termDays * TICKS_PER_GAME_DAY,
  };
  return {
    ...state,
    nextId: state.nextId + 1,
    goods: { ...state.goods, [goodId]: { ...gs, holding: gs.holding - qty } },
    bulkContracts: [...state.bulkContracts, contract],
  };
}
export function addAutoTradeRule(
  state: EconomyState,
  goodId: GoodId,
  side: "buy" | "sell",
  triggerPct: number,
  qty: number
): EconomyState {
  if (state.gameOver || qty <= 0) return state;
  if (state.autoTradeRules.length >= AUTO_TRADE_MAX_RULES) return state;
  if (!AUTO_TRADE_TRIGGER_PCT_STEPS.includes(triggerPct)) return state;
  const good = GOODS_BY_ID[goodId];
  if (!good || !isGoodUnlocked(good, state)) return state;
  const price = state.goods[goodId].price;
  const rule: AutoTradeRule = {
    id: state.nextId,
    goodId,
    side,
    trigger: side === "buy" ? "priceBelow" : "priceAbove",
    triggerPrice: side === "buy" ? price * (1 - triggerPct) : price * (1 + triggerPct),
    qty,
    enabled: true,
  };
  return { ...state, nextId: state.nextId + 1, autoTradeRules: [...state.autoTradeRules, rule] };
}
export function removeAutoTradeRule(state: EconomyState, ruleId: number): EconomyState {
  return { ...state, autoTradeRules: state.autoTradeRules.filter((r) => r.id !== ruleId) };
}
export function toggleAutoTradeRule(state: EconomyState, ruleId: number): EconomyState {
  return {
    ...state,
    autoTradeRules: state.autoTradeRules.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r)),
  };
}
// Runs once per tick, right after tick() — a standing rule re-fires trade()
// every tick its condition still holds (no one-shot arming), so the same
// low-price dip can trigger several small buys in a row rather than one.
export function applyAutoTradeRules(state: EconomyState): EconomyState {
  if (state.gameOver || state.autoTradeRules.length === 0) return state;
  let next = state;
  for (const rule of state.autoTradeRules) {
    if (!rule.enabled) continue;
    const good = GOODS_BY_ID[rule.goodId];
    if (!good || !isGoodUnlocked(good, next)) continue;
    const price = next.goods[rule.goodId].price;
    const triggered = rule.trigger === "priceBelow" ? price <= rule.triggerPrice : price >= rule.triggerPrice;
    if (!triggered) continue;
    next = trade(next, rule.goodId, rule.side, rule.qty);
  }
  return next;
}
export function dailyCheckIn(state: EconomyState, today: string): EconomyState {
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

  // A first launch pays nothing and announces nothing. The streak starts,
  // the quest board is set up, and that is all — a player opening this for
  // the first time should be a trader with a purse and no patron, not
  // someone handed a welcome bonus before they have bought anything. The
  // daily reward is for coming back, and there is nothing yet to come back
  // to; from tomorrow it pays, and the wheel shows up with it.
  if (!prevDate) {
    return {
      ...state,
      streak: { count: 1, lastOpenedDate: today },
      dailyProgress: makeInitialDailyProgress(),
      dailyQuests: makeDailyQuests(today),
      activeMiniQuest: null,
      productionQuotas: generateDailyQuotas(),
      productionToday: Object.fromEntries(GOODS.map((g) => [g.id, 0])) as Record<GoodId, number>,
      weeklyChallenge: ensureWeeklyChallenge(state, today),
    };
  }

  const bankBonus = state.upgrades.bank * UPGRADES_BY_ID.bank.effectPerLevel;
  const bonus =
    Math.min(DAILY_BONUS_BASE + (count - 1) * DAILY_BONUS_PER_STREAK_DAY, DAILY_BONUS_CAP) + bankBonus;
  const message = t(state.language, "msg.dailyCheckInReturning", { count, bonus });
  const event: EconomyEvent = { id: state.nextId, message, tone: "good" };

  return {
    ...state,
    cash: state.cash + bonus,
    nextId: state.nextId + 1,
    streak: { count, lastOpenedDate: today },
    lastEvent: event,
    eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
    // The reward wheel modal spins to reveal this once the player next sees
    // the app; dismissDailyBonus clears it after they've watched it land.
    // Only ever reached on a return visit — see the early return above.
    dailyBonusPending: bonus,
    // A genuinely new day (this function only reaches here when one
    // started) resets the daily quest board and its progress counters.
    dailyProgress: makeInitialDailyProgress(),
    dailyQuests: makeDailyQuests(today),
    // A mini quest's progress is measured against the daily counters above
    // via a baseline snapshot — resetting those out from under it would
    // make it unwinnable, so just drop it; a new one spawns again soon.
    activeMiniQuest: null,
    productionQuotas: generateDailyQuotas(),
    productionToday: Object.fromEntries(GOODS.map((g) => [g.id, 0])) as Record<GoodId, number>,
    weeklyChallenge: ensureWeeklyChallenge(state, today),
  };
}
// Deterministic on the ISO week number, not RNG — every player sees the same
// challenge in the same calendar week with no seed or server sync needed.
// Checked on every check-in so a save reopened after a week rollover (or
// several) always lands on the current week's challenge, never a stale one.
function ensureWeeklyChallenge(state: EconomyState, today: string): WeeklyChallenge {
  const weekKey = isoWeekKey(today);
  if (state.weeklyChallenge && state.weeklyChallenge.weekKey === weekKey) return state.weeklyChallenge;
  const template = weeklyChallengeTemplateForWeek(weekKey);
  return { weekKey, templateId: template.id, startValue: template.metric(state.stats), claimed: false };
}
// Runs once per tick, right after tick() — auto-claims the moment progress
// reaches the target, the same "no separate claim button" choice as bulk
// contract settlement.
export function applyWeeklyChallengeClaim(state: EconomyState): EconomyState {
  const wc = state.weeklyChallenge;
  if (!wc || wc.claimed) return state;
  const template = WEEKLY_CHALLENGE_TEMPLATES_BY_ID[wc.templateId];
  if (!template) return state;
  const progress = template.metric(state.stats) - wc.startValue;
  if (progress < template.target) return state;
  const event: EconomyEvent = {
    id: state.nextId,
    message: t(state.language, "msg.weeklyChallengeComplete", {
      title: t(state.language, template.titleKey),
      amount: formatNumberUtil(template.reward, state.language),
    }),
    tone: "good",
  };
  return {
    ...state,
    cash: state.cash + template.reward,
    nextId: state.nextId + 1,
    lastEvent: event,
    eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
    weeklyChallenge: { ...wc, claimed: true },
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
  const cost = researchCost(state, node);
  if (state.cash < cost) return state;
  return {
    ...state,
    cash: state.cash - cost,
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
    applyMythicUnlock(
      applyLegendaryUnlock(
        applyMetropolUnlock(applyTradeUnlock(applyOnboarding(applyDailyQuests(applyAchievements(s)))))
      )
    )
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

  return outcome("msg.villagerRefuse", { amount: VILLAGER_REQUEST_REFUSE_HAPPINESS }, "bad", {
    happiness: clamp(state.happiness - VILLAGER_REQUEST_REFUSE_HAPPINESS, 0, 100),
  });
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
export function prestige(state: EconomyState): EconomyState {
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
    prestigePoints:
      state.prestigePoints +
      PRESTIGE_POINTS_PER_PRESTIGE +
      ngPlusBonusPrestigePoints(state.activeNgPlusModifiers),
    prestigePerks: state.prestigePerks,
    // Only accrues once legendharbor is already open — the first legendary
    // unlock itself (2 -> 3) doesn't pay out, every prestige after it does.
    legendaryPoints: state.legendaryPoints + (state.legendaryUnlocked ? LEGENDARY_POINTS_PER_PRESTIGE : 0),
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
/** Commit the town to a doctrine. Deliberately one-way for the rest of the
 * run: the choice only means something if it cannot be walked back, and
 * prestige is what hands the decision back to the player. */
/** Hand out today's speed boost. Free, but only once per calendar day, so
 * it rewards showing up rather than being farmable in a single sitting.
 *
 * Deliberately not tied to rating the app: both stores forbid incentivising
 * reviews, and expo-store-review's requestReview() resolves to void whether
 * the player reviewed, dismissed the sheet, or never saw it at all — so
 * "reward them if they rate us" is not something the app can actually know. */
export function claimSpeedBoost(state: EconomyState, today: string = todayString()): EconomyState {
  if (state.gameOver) return state;
  if (state.speedBoostClaimedDate === today) return state;
  return {
    ...state,
    speedBoostExpiresAt: Date.now() + SPEED_BOOST_DURATION_MS,
    speedBoostClaimedDate: today,
  };
}

export function chooseDoctrine(state: EconomyState, doctrineId: string): EconomyState {
  if (state.gameOver) return state;
  if (state.doctrine !== null) return state;
  if (!isDoctrineId(doctrineId)) return state;
  if (computeNetWorth(state) < DOCTRINE_UNLOCK_NET_WORTH) return state;
  const event: EconomyEvent = {
    id: state.nextId,
    message: t(state.language, "msg.doctrineChosen", {
      icon: DOCTRINES_BY_ID[doctrineId].icon,
      name: t(state.language, DOCTRINES_BY_ID[doctrineId].nameKey),
    }),
    tone: "good",
  };
  return {
    ...state,
    doctrine: doctrineId,
    nextId: state.nextId + 1,
    lastEvent: event,
    eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
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
    loan: {
      principal,
      remainingBalance: principal,
      interestRatePerTick,
      termMonths,
      takenAtTick: state.tick,
    },
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
      return applyWeeklyChallengeClaim(applyAutoTradeRules(tick(state)));
    case "SELECT_GOOD":
      return { ...state, selectedGood: action.goodId };
    case "TRADE":
      return trade(state, action.goodId, action.side, action.qty);
    case "TRADE_ASSET":
      return tradeAsset(state, action.assetId, action.side, action.qty);
    case "SEND_CARAVAN":
      return sendCaravan(
        state,
        action.townId,
        action.goodId,
        action.direction,
        action.qty,
        action.insured,
        action.tariffDiscountBonus ?? 0
      );
    case "TOGGLE_PAUSE":
      return state.gameOver ? state : { ...state, paused: !state.paused };
    case "CLAIM_SPEED_BOOST":
      return claimSpeedBoost(state);
    case "RESET": {
      // A new difficulty starts the economy over, but the player's chosen
      // town name, language, and any earned prestige bonus are identity,
      // not run state — keep them.
      const base = initialState(action.difficulty, state.language, action.ngPlusModifiers ?? []);
      const bestNetWorthEver = Math.max(state.bestNetWorthEver, computeNetWorth(state));
      return {
        ...base,
        townName: state.townName,
        prestigeLevel: state.prestigeLevel,
        prestigePoints: state.prestigePoints,
        prestigePerks: state.prestigePerks,
        legendaryPoints: state.legendaryPoints,
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
    case "CHOOSE_DOCTRINE":
      return chooseDoctrine(state, action.doctrineId);
    case "OPEN_CONTRACT":
      return openContract(state, action.goodId, action.direction, action.qty, action.termDays);
    case "OPEN_BULK_CONTRACT":
      return openBulkContract(state, action.goodId, action.qty, action.termDays);
    case "ADD_AUTO_TRADE_RULE":
      return addAutoTradeRule(state, action.goodId, action.side, action.triggerPct, action.qty);
    case "REMOVE_AUTO_TRADE_RULE":
      return removeAutoTradeRule(state, action.ruleId);
    case "TOGGLE_AUTO_TRADE_RULE":
      return toggleAutoTradeRule(state, action.ruleId);
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
    case "DISMISS_DAILY_BONUS":
      return state.dailyBonusPending === null ? state : { ...state, dailyBonusPending: null };
    case "RESOLVE_DECISION":
      return resolveDecision(state, action.optionId);
    case "RESOLVE_REQUEST":
      return resolveVillagerRequest(state, action.give);
    case "RESOLVE_RIVAL_OFFER":
      return resolveRivalOffer(state, action.accept);
    case "ADVANCE_MENTOR":
      // Clamped and monotonic: the tour only ever moves forward, and
      // finishing and skipping are the same thing — both land on the end.
      return { ...state, mentorStep: Math.max(state.mentorStep, Math.min(action.to, MENTOR_STEPS.length)) };
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
      applyMythicUnlock(
        applyLegendaryUnlock(
          applyMetropolUnlock(applyTradeUnlock(applyOnboarding(applyDailyQuests(applyAchievements(next)))))
        )
      )
    )
  );
}
export function useEconomy() {
  // The device's language is read here rather than inside `initialState`, so
  // the reducer stays pure and the tests keep their fixed Turkish default
  // instead of depending on whatever locale the machine running them has.
  // Overwritten a moment later by HYDRATE if there is a save — this only
  // decides what a first launch looks like.
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    initialState(DEFAULT_DIFFICULTY, deviceLanguage())
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // Whether the launch found a save to restore. Not the same question as
  // `state.tick > 0`: the clock makes that true a few seconds into a brand
  // new game too, so a title screen asking it would offer to "continue" a
  // town the player has never seen.
  const [hasSave, setHasSave] = useState(false);
  // The title screen holds the game in front of the player before they go
  // in. The clock waits for `start()` rather than running from mount: an
  // economy that ticks behind a menu spends the player's events and crises
  // while nobody is watching, and the first thing they would see is the
  // aftermath.
  const [started, setStarted] = useState(false);
  const start = useCallback(() => setStarted(true), []);

  const isSpeedBoosted = state.speedBoostExpiresAt !== null;
  const isMentorActive = state.mentorStep < MENTOR_STEPS.length;
  useEffect(() => {
    if (!hydrated || !started || isMentorActive) return;
    const intervalMs = isSpeedBoosted ? BOOSTED_TICK_MS : TICK_MS;
    intervalRef.current = setInterval(() => dispatch({ type: "TICK" }), intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSpeedBoosted, hydrated, started, isMentorActive]);

  // Load any previous save once on mount, fast-forward the town through
  // however long the app was closed, then start persisting future changes.
  useEffect(() => {
    let cancelled = false;
    loadEconomyState().then((saved) => {
      if (cancelled) return;
      if (saved) {
        setHasSave(true);
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
    (
      townId: TownId,
      goodId: GoodId,
      direction: CaravanDirection,
      qty: number,
      insured: boolean,
      tariffDiscountBonus?: number
    ) => dispatch({ type: "SEND_CARAVAN", townId, goodId, direction, qty, insured, tariffDiscountBonus }),
    []
  );
  const togglePause = useCallback(() => dispatch({ type: "TOGGLE_PAUSE" }), []);
  const reset = useCallback(
    (difficulty: DifficultyId, ngPlusModifiers?: string[]) =>
      dispatch({ type: "RESET", difficulty, ngPlusModifiers }),
    []
  );
  const prestige_ = useCallback(() => dispatch({ type: "PRESTIGE" }), []);
  const unlockPrestigePerk_ = useCallback(
    (perkId: string) => dispatch({ type: "UNLOCK_PRESTIGE_PERK", perkId }),
    []
  );
  const chooseDoctrine_ = useCallback(
    (doctrineId: string) => dispatch({ type: "CHOOSE_DOCTRINE", doctrineId }),
    []
  );
  const openContract_ = useCallback(
    (goodId: GoodId, direction: ContractDirection, qty: number, termDays: number) =>
      dispatch({ type: "OPEN_CONTRACT", goodId, direction, qty, termDays }),
    []
  );
  const openBulkContract_ = useCallback(
    (goodId: GoodId, qty: number, termDays: number) =>
      dispatch({ type: "OPEN_BULK_CONTRACT", goodId, qty, termDays }),
    []
  );
  const addAutoTradeRule_ = useCallback(
    (goodId: GoodId, side: "buy" | "sell", triggerPct: number, qty: number) =>
      dispatch({ type: "ADD_AUTO_TRADE_RULE", goodId, side, triggerPct, qty }),
    []
  );
  const removeAutoTradeRule_ = useCallback(
    (ruleId: number) => dispatch({ type: "REMOVE_AUTO_TRADE_RULE", ruleId }),
    []
  );
  const toggleAutoTradeRule_ = useCallback(
    (ruleId: number) => dispatch({ type: "TOGGLE_AUTO_TRADE_RULE", ruleId }),
    []
  );
  const takeLoan_ = useCallback(
    (amount: number, termMonths: number) => dispatch({ type: "TAKE_LOAN", amount, termMonths }),
    []
  );
  const repayLoan_ = useCallback((amount: number) => dispatch({ type: "REPAY_LOAN", amount }), []);
  const hireWorker_ = useCallback((goodId: GoodId) => dispatch({ type: "HIRE_WORKER", goodId }), []);
  const fireWorker_ = useCallback((goodId: GoodId) => dispatch({ type: "FIRE_WORKER", goodId }), []);
  const upgrade_ = useCallback((upgradeId: UpgradeId) => dispatch({ type: "UPGRADE", upgradeId }), []);
  const research_ = useCallback((nodeId: string) => dispatch({ type: "RESEARCH", nodeId }), []);
  const hydrate_ = useCallback(
    (imported: EconomyState) => dispatch({ type: "HYDRATE", state: imported }),
    []
  );
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
  const dismissDailyBonus = useCallback(() => dispatch({ type: "DISMISS_DAILY_BONUS" }), []);
  const resolveDecision_ = useCallback(
    (optionId: string) => dispatch({ type: "RESOLVE_DECISION", optionId }),
    []
  );
  const resolveRequest = useCallback((give: boolean) => dispatch({ type: "RESOLVE_REQUEST", give }), []);
  const resolveRivalOffer_ = useCallback(
    (accept: boolean) => dispatch({ type: "RESOLVE_RIVAL_OFFER", accept }),
    []
  );
  const setTownName = useCallback((name: string) => dispatch({ type: "SET_TOWN_NAME", name }), []);
  const setEmblem_ = useCallback((emblemId: string) => dispatch({ type: "SET_EMBLEM", emblemId }), []);
  const setEmblemColor_ = useCallback((color: string) => dispatch({ type: "SET_EMBLEM_COLOR", color }), []);
  const advanceMentor = useCallback((to: number) => dispatch({ type: "ADVANCE_MENTOR", to }), []);
  const setLanguage_ = useCallback((language: Language) => dispatch({ type: "SET_LANGUAGE", language }), []);
  const claimSpeedBoost_ = useCallback(() => dispatch({ type: "CLAIM_SPEED_BOOST" }), []);
  const translate = useCallback(
    (key: string, params?: Record<string, string | number>) => t(state.language, key, params),
    [state.language]
  );
  const translatePlural = useCallback(
    (key: string, count: number, params?: Record<string, string | number>) =>
      tPlural(state.language, key, count, params),
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
    chooseDoctrine: chooseDoctrine_,
    openContract: openContract_,
    openBulkContract: openBulkContract_,
    addAutoTradeRule: addAutoTradeRule_,
    removeAutoTradeRule: removeAutoTradeRule_,
    toggleAutoTradeRule: toggleAutoTradeRule_,
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
    dismissDailyBonus,
    resolveDecision: resolveDecision_,
    resolveRequest,
    resolveRivalOffer: resolveRivalOffer_,
    advanceMentor,
    setTownName,
    setEmblem: setEmblem_,
    setEmblemColor: setEmblemColor_,
    setLanguage: setLanguage_,
    claimSpeedBoost: claimSpeedBoost_,
    t: translate,
    tPlural: translatePlural,
    formatCoins: (value: number, decimals?: number) => formatCoinsUtil(value, state.language, decimals),
    portfolioValue,
    assetsValue,
    netWorth,
    marketSpreadPct,
    hydrated,
    hasSave,
    started,
    start,
  };
}

export { GOODS, GOODS_BY_ID };
