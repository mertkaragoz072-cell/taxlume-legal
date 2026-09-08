/** The simulation tick: one step of the whole economy.
 *
 * Production, consumption and pricing for every good, foreign market drift,
 * asset random walks, tax and wages, loan interest, caravan arrivals, contract
 * settlement, random events, and the in-game day roll. Kept in its own module
 * because it is by far the largest single transition in the game. */

import { ASSETS } from "./assets";
import { DECISION_TEMPLATES } from "./decisions";
import { DIFFICULTIES } from "./difficulty";
import { GOODS, GOODS_BY_ID } from "./goods";
import { EVENT_TEMPLATES } from "./events";
import { MINI_QUEST_TEMPLATES } from "./miniQuests";
import {
  propertyHappinessBonus,
  propertyPassiveIncomePerTick,
  propertyProductionMultiplier,
} from "./properties";
import { perkProductionBonus, perkTaxHappinessRelief } from "./prestigePerks";
import { researchMultiplier } from "./research";
import { rollRivalTraderOffer } from "./rivalTrader";
import { SEASONAL_EVENT_TEMPLATES, SEASONAL_EVENT_TEMPLATES_BY_ID } from "./seasonalEvents";
import { WORKER_PRODUCTION_BONUS_PER_WORKER, WORKER_WAGE_PER_TICK } from "./workers";
import { effectiveDifficultyConfig } from "./ngPlusModifiers";
import { TOWNS, TOWNS_BY_ID } from "./towns";
import { UPGRADES_BY_ID } from "./upgrades";
import { rollVillagerRequest } from "./villagerRequests";
import { t } from "../i18n/t";
import { formatCompactNumber as formatNumberUtil } from "../utils/formatNumber";
import { BulkContract, Caravan, EconomyEvent, EconomyState, ForwardContract, GoodId } from "./types";
import {
  ANGRY_CASH_PENALTY,
  ANGRY_EVENT_CHANCE,
  ANGRY_THRESHOLD,
  ASSET_MAX_FACTOR,
  ASSET_MIN_FACTOR,
  ASSET_SPIKE_CHANCE,
  ASSET_SPIKE_MULT,
  CARAVAN_RAID_CHANCE,
  CARAVAN_RAID_LOSS_MAX,
  CARAVAN_RAID_LOSS_MIN,
  CONTENT_BONUS_FACTOR,
  CONTENT_CASH_BONUS,
  CONTENT_EVENT_CHANCE,
  CONTENT_THRESHOLD,
  DEBT_HAPPINESS_DRAG,
  DECISION_EVENT_CHANCE,
  DEMAND_PRESSURE_DECAY,
  DEMAND_PRESSURE_MAX,
  EARTHQUAKE_CHANCE,
  EARTHQUAKE_LOSS_FLOOR,
  EARTHQUAKE_LOSS_MAX,
  EARTHQUAKE_LOSS_MIN,
  EFFICIENCY_MAX,
  EFFICIENCY_MIN,
  EVENT_LOG_CAP,
  FOREIGN_NOISE,
  FOREIGN_SUPPLY_REVERSION,
  HAPPINESS_EASE,
  HAPPINESS_TARGET_SLOPE,
  HISTORY_LEN,
  INFLATION_REVERSION_RATE,
  LOST_TREASURE_CHANCE,
  LOST_TREASURE_MIN_AMOUNT,
  LOST_TREASURE_PCT_OF_CASH,
  MINI_QUEST_CHANCE,
  PRESTIGE_PRODUCTION_BONUS_PER_LEVEL,
  PRODUCTION_BONUS_FACTOR,
  PRODUCTION_INFLATION_FACTOR,
  PRODUCTION_NOISE,
  PRODUCTION_PENALTY_FACTOR,
  RIVAL_OFFER_CHANCE,
  RIVAL_TOWN_GROWTH_JITTER,
  RIVAL_TOWN_GROWTH_RATE,
  SEASONAL_EVENT_CHANCE,
  TOWN_RANK_PRODUCTION_BONUS_PER_RANK,
  VILLAGER_REQUEST_CHANCE,
} from "./constants";
import {
  clamp,
  computeNetWorth,
  estimateTaxIncomePerTick,
  priceFromSupply,
  pushCapped,
  supplyBounds,
} from "./formulas";

export function tick(state: EconomyState): EconomyState {
  // The speed boost is a real-world timer, not a tick count, so it must
  // expire here (checked on every interval firing, whether paused or not)
  // rather than depending on simulation ticks that stop while paused.
  if (state.speedBoostExpiresAt !== null && Date.now() >= state.speedBoostExpiresAt) {
    state = { ...state, speedBoostExpiresAt: null };
  }
  if (
    state.paused ||
    state.gameOver ||
    state.pendingDecision ||
    state.pendingRequest ||
    state.pendingRivalOffer
  )
    return state;
  const config = effectiveDifficultyConfig(DIFFICULTIES[state.difficulty], state.activeNgPlusModifiers);

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
  const happiness = clamp(state.happiness + (targetHappiness - state.happiness) * HAPPINESS_EASE, 0, 100);
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
  let totalWorkers = GOODS.reduce((sum, g) => sum + workers[g.id], 0);
  let workerWageCost = totalWorkers * WORKER_WAGE_PER_TICK;
  const availableForWages = state.cash + taxCashDelta;
  let laidOff = 0;
  while (workerWageCost > availableForWages && totalWorkers > 0) {
    const g = GOODS.find((good) => workers[good.id] > 0);
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
      ? caravan.amount *
        (1 - (CARAVAN_RAID_LOSS_MIN + Math.random() * (CARAVAN_RAID_LOSS_MAX - CARAVAN_RAID_LOSS_MIN)))
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
      contract.direction === "long" ? settlePrice - contract.strikePrice : contract.strikePrice - settlePrice;
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

  const stillOpenBulkContracts: BulkContract[] = [];
  for (const contract of state.bulkContracts) {
    if (contract.maturesAtTick > nextTick) {
      stillOpenBulkContracts.push(contract);
      continue;
    }
    const payout = contract.qty * contract.lockedPricePerUnit;
    cash += payout;
    dailyCashEarned += payout;
    const contractGood = GOODS_BY_ID[contract.goodId];
    newEvents.push({
      id: nextId++,
      message: t(state.language, "msg.bulkContractDelivered", {
        qty: contract.qty,
        good: t(state.language, contractGood.nameKey),
        amount: formatNumberUtil(payout, state.language),
      }),
      tone: "good",
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
      message: t(
        state.language,
        rivalCurrentlyAhead ? "msg.rivalTownOvertookYou" : "msg.rivalTownOvertaken",
        {
          amount: formatNumberUtil(rivalCurrentlyAhead ? rivalNetWorth : netWorthNow, state.language),
        }
      ),
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
    bulkContracts: stillOpenBulkContracts,
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
