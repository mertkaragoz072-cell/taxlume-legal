import { GOODS_BY_ID } from "../goods";
import { TOWNS } from "../towns";
import { UPGRADES_BY_ID } from "../upgrades";
import {
  addAutoTradeRule,
  applyAutoTradeRules,
  AUTO_TRADE_MAX_RULES,
  AUTO_TRADE_TRIGGER_PCT_STEPS,
  BULK_CONTRACT_BONUS_PCT,
  BULK_CONTRACT_MAX_ACTIVE,
  BULK_CONTRACT_TERM_DAY_STEPS,
  CARAVAN_INSURANCE_COST_PCT,
  CARAVAN_RAID_CHANCE,
  CARAVAN_RAID_LOSS_MAX,
  CARAVAN_RAID_LOSS_MIN,
  HOT_STREAK_BONUS_PER_TRADE,
  HOT_STREAK_MAX_BONUS,
  LOAN_MAX_INTEREST_RATE_PER_DAY,
  LOAN_MIN_CAP,
  LOAN_MIN_INTEREST_RATE_PER_DAY,
  LOAN_TERM_MONTHS_STEPS,
  RIVAL_TOWN_GROWTH_RATE,
  STORAGE_BASE_CAPACITY,
  TICKS_PER_GAME_DAY,
  computeNetWorth,
  effectiveTariffRate,
  estimateTaxIncomePerTick,
  gameDayFromTick,
  initialState,
  isGoodUnlocked,
  loanCap,
  loanDayRateToTickRate,
  loanInterestRatePerDay,
  loanTickRateToDayRate,
  marketSpread,
  openBulkContract,
  removeAutoTradeRule,
  repayLoan,
  sendCaravan,
  storageCapacity,
  takeLoan,
  tick,
  toggleAutoTradeRule,
  totalGoodsHolding,
  trade,
} from "../useEconomy";

describe("gameDayFromTick", () => {
  it("starts at day 1 and advances every TICKS_PER_GAME_DAY ticks", () => {
    expect(gameDayFromTick(0)).toBe(1);
    expect(gameDayFromTick(TICKS_PER_GAME_DAY - 1)).toBe(1);
    expect(gameDayFromTick(TICKS_PER_GAME_DAY)).toBe(2);
    expect(gameDayFromTick(TICKS_PER_GAME_DAY * 3)).toBe(4);
  });
});

describe("isGoodUnlocked", () => {
  it("treats a good with no unlockDay as always available", () => {
    const state = initialState();
    expect(isGoodUnlocked(GOODS_BY_ID.bread, state)).toBe(true);
  });

  it("gates a time-locked good until its unlock day is reached", () => {
    const honey = GOODS_BY_ID.honey;
    expect(honey.unlockDay).toBe(2);
    const day1 = { ...initialState(), tick: 0 };
    const day2 = { ...initialState(), tick: TICKS_PER_GAME_DAY };
    expect(isGoodUnlocked(honey, day1)).toBe(false);
    expect(isGoodUnlocked(honey, day2)).toBe(true);
  });
});

describe("trade", () => {
  it("buying reduces cash and increases holding by the traded amount", () => {
    const state = initialState();
    // Buying fills a hair above the quoted mid-price (the bid/ask spread).
    const buyPrice = state.goods.bread.price * (1 + marketSpread(state) / 2);
    const next = trade(state, "bread", "buy", 5);
    expect(next.goods.bread.holding).toBe(5);
    expect(next.cash).toBeCloseTo(state.cash - 5 * buyPrice, 6);
    expect(next.stats.totalTrades).toBe(1);
  });

  it("clamps a buy order to what the player can actually afford", () => {
    const state = { ...initialState(), cash: 10 };
    const buyPrice = state.goods.bread.price * (1 + marketSpread(state) / 2);
    const affordable = Math.floor(10 / buyPrice);
    const next = trade(state, "bread", "buy", 999);
    expect(next.goods.bread.holding).toBe(affordable);
    expect(next.cash).toBeGreaterThanOrEqual(0);
  });

  it("selling more than held is a no-op", () => {
    const state = initialState();
    const next = trade(state, "bread", "sell", 5);
    expect(next).toBe(state);
  });

  it("buying then selling the same quantity costs exactly the round-trip spread", () => {
    const state = initialState();
    const bought = trade(state, "bread", "buy", 3);
    const soldBack = trade(bought, "bread", "sell", 3);
    const spreadCost = 3 * state.goods.bread.price * marketSpread(state);
    expect(state.cash - soldBack.cash).toBeCloseTo(spreadCost, 6);
    expect(soldBack.goods.bread.holding).toBe(0);
  });

  it("a large buy leaves lingering upward demand pressure that a tick then decays", () => {
    const state = { ...initialState(), cash: 100000 };
    const bought = trade(state, "bread", "buy", 100);
    expect(bought.goods.bread.demandPressure).toBeGreaterThan(0);
    // The price paid for the trade itself is still quoted off the old mid —
    // the bump only shows up once tick() re-derives price from it.
    const afterTick = tick({ ...bought, paused: false });
    expect(afterTick.goods.bread.price).toBeGreaterThan(state.goods.bread.price);
    expect(afterTick.goods.bread.demandPressure).toBeLessThan(bought.goods.bread.demandPressure);
  });

  it("a large sell leaves lingering downward demand pressure", () => {
    const state = { ...initialState(), cash: 100000 };
    const bought = trade(state, "bread", "buy", 150);
    const sold = trade(bought, "bread", "sell", 100);
    expect(sold.goods.bread.demandPressure).toBeLessThan(bought.goods.bread.demandPressure);
  });

  it("clamps a buy order to the remaining storage capacity", () => {
    const state = { ...initialState(), cash: 1000000 };
    const cap = storageCapacity(state);
    const next = trade(state, "bread", "buy", cap + 500);
    expect(totalGoodsHolding(next)).toBeCloseTo(cap, 6);
  });

  it("rejects a buy outright once storage is already full", () => {
    const state = { ...initialState(), cash: 1000000 };
    const cap = storageCapacity(state);
    const full = trade(state, "bread", "buy", cap);
    const next = trade(full, "honey", "buy", 5);
    expect(next).toBe(full);
  });
});

describe("storageCapacity", () => {
  it("starts at the base capacity with no storageYard upgrade", () => {
    const state = initialState();
    expect(storageCapacity(state)).toBe(STORAGE_BASE_CAPACITY);
  });

  it("grows with the storageYard upgrade level", () => {
    const state = { ...initialState(), upgrades: { ...initialState().upgrades, storageYard: 2 } };
    expect(storageCapacity(state)).toBeGreaterThan(STORAGE_BASE_CAPACITY);
  });
});

describe("openBulkContract", () => {
  it("rejects opening a contract without enough holding of the good", () => {
    const state = initialState();
    expect(state.goods.bread.holding).toBe(0);
    const next = openBulkContract(state, "bread", 10, BULK_CONTRACT_TERM_DAY_STEPS[0]);
    expect(next).toBe(state);
  });

  it("reserves the goods and opens a contract when holding is sufficient", () => {
    const bought = trade({ ...initialState(), cash: 100000 }, "bread", "buy", 20);
    const next = openBulkContract(bought, "bread", 10, BULK_CONTRACT_TERM_DAY_STEPS[0]);
    expect(next.goods.bread.holding).toBe(10);
    expect(next.bulkContracts).toHaveLength(1);
    const contract = next.bulkContracts[0];
    expect(contract.qty).toBe(10);
    expect(contract.lockedPricePerUnit).toBeCloseTo(bought.goods.bread.price * (1 + BULK_CONTRACT_BONUS_PCT), 6);
  });

  it("rejects opening beyond the max active bulk contracts", () => {
    let state = trade({ ...initialState(), cash: 100000 }, "bread", "buy", 100);
    for (let i = 0; i < BULK_CONTRACT_MAX_ACTIVE; i++) {
      state = openBulkContract(state, "bread", 1, BULK_CONTRACT_TERM_DAY_STEPS[0]);
    }
    expect(state.bulkContracts).toHaveLength(BULK_CONTRACT_MAX_ACTIVE);
    const next = openBulkContract(state, "bread", 1, BULK_CONTRACT_TERM_DAY_STEPS[0]);
    expect(next).toBe(state);
  });

  describe("settlement at maturity", () => {
    const originalRandom = Math.random;
    afterEach(() => {
      Math.random = originalRandom;
    });

    it("pays out the locked price per unit at maturity via tick()", () => {
      Math.random = () => 0.999999; // clears every chance check in tick() so only the settlement itself moves cash
      const bought = trade({ ...initialState(), cash: 100000, happiness: 50 }, "bread", "buy", 10);
      const opened = openBulkContract(bought, "bread", 10, BULK_CONTRACT_TERM_DAY_STEPS[0]);
      const termTicks = BULK_CONTRACT_TERM_DAY_STEPS[0] * TICKS_PER_GAME_DAY;
      let state = { ...opened, paused: false };
      const expectedPayout = opened.bulkContracts[0].qty * opened.bulkContracts[0].lockedPricePerUnit;
      for (let i = 0; i < termTicks; i++) {
        state = tick(state);
      }
      expect(state.bulkContracts).toHaveLength(0);
      expect(state.cash).toBeCloseTo(opened.cash + expectedPayout, 1);
    });
  });
});

describe("loanCap", () => {
  it("caps a loan at a percentage of net worth", () => {
    const state = { ...initialState(), cash: 1000 };
    expect(computeNetWorth(state)).toBe(1000);
    expect(loanCap(state)).toBe(600); // 1000 * LOAN_MAX_NET_WORTH_PCT (0.6)
  });

  it("never drops below LOAN_MIN_CAP even for a very poor town", () => {
    const state = { ...initialState(), cash: 10 };
    expect(loanCap(state)).toBe(LOAN_MIN_CAP);
  });
});

describe("loanInterestRatePerDay", () => {
  it("stays within the configured min/max bounds", () => {
    const state = initialState();
    for (const termMonths of LOAN_TERM_MONTHS_STEPS) {
      const rate = loanInterestRatePerDay(state, termMonths);
      expect(rate).toBeGreaterThanOrEqual(LOAN_MIN_INTEREST_RATE_PER_DAY);
      expect(rate).toBeLessThanOrEqual(LOAN_MAX_INTEREST_RATE_PER_DAY);
    }
  });

  it("a higher bank upgrade level never increases the rate", () => {
    const base = initialState();
    const upgraded = { ...base, upgrades: { ...base.upgrades, bank: 5 } };
    const termMonths = LOAN_TERM_MONTHS_STEPS[0];
    expect(loanInterestRatePerDay(upgraded, termMonths)).toBeLessThanOrEqual(
      loanInterestRatePerDay(base, termMonths)
    );
  });

  it("a longer term never carries a lower rate", () => {
    const state = initialState();
    const shortRate = loanInterestRatePerDay(state, LOAN_TERM_MONTHS_STEPS[0]);
    const longRate = loanInterestRatePerDay(state, LOAN_TERM_MONTHS_STEPS[LOAN_TERM_MONTHS_STEPS.length - 1]);
    expect(longRate).toBeGreaterThanOrEqual(shortRate);
  });
});

describe("loan day/tick rate conversion", () => {
  it("round-trips a day rate through the tick rate and back", () => {
    const dayRate = 0.05;
    const tickRate = loanDayRateToTickRate(dayRate);
    expect(loanTickRateToDayRate(tickRate)).toBeCloseTo(dayRate, 10);
  });
});

describe("takeLoan / repayLoan", () => {
  it("caps the principal at loanCap even if a larger amount is requested", () => {
    const state = { ...initialState(), cash: 1000 };
    const cap = loanCap(state);
    const next = takeLoan(state, cap * 10, LOAN_TERM_MONTHS_STEPS[0]);
    expect(next.loan).not.toBeNull();
    expect(next.loan!.principal).toBe(cap);
    expect(next.cash).toBeCloseTo(state.cash + cap, 6);
  });

  it("refuses to stack a second loan on top of an active one", () => {
    const state = takeLoan({ ...initialState(), cash: 1000 }, 100, LOAN_TERM_MONTHS_STEPS[0]);
    const again = takeLoan(state, 50, LOAN_TERM_MONTHS_STEPS[0]);
    expect(again).toBe(state);
  });

  it("fully repaying clears the loan and records it in stats", () => {
    const withLoan = takeLoan({ ...initialState(), cash: 1000 }, 100, LOAN_TERM_MONTHS_STEPS[0]);
    const principal = withLoan.loan!.principal;
    const repaid = repayLoan(withLoan, principal);
    expect(repaid.loan).toBeNull();
    expect(repaid.stats.loansRepaid).toBe(withLoan.stats.loansRepaid + 1);
  });

  it("a partial repayment reduces the balance without clearing the loan", () => {
    const withLoan = takeLoan({ ...initialState(), cash: 1000 }, 100, LOAN_TERM_MONTHS_STEPS[0]);
    const principal = withLoan.loan!.principal;
    const partial = repayLoan(withLoan, principal / 2);
    expect(partial.loan).not.toBeNull();
    expect(partial.loan!.remainingBalance).toBeCloseTo(principal / 2, 6);
  });
});

describe("estimateTaxIncomePerTick", () => {
  it("is zero when the tax rate is zero", () => {
    expect(estimateTaxIncomePerTick(initialState())).toBe(0);
  });

  it("is positive once a tax rate is set and villagers are happy", () => {
    const state = { ...initialState(), taxRate: 0.2 };
    expect(estimateTaxIncomePerTick(state)).toBeGreaterThan(0);
  });
});

describe("effectiveTariffRate", () => {
  it("matches the town's base tariff with no discounts applied", () => {
    const state = initialState();
    const town = TOWNS[0];
    expect(effectiveTariffRate(state, town)).toBeCloseTo(town.tariffRate, 10);
  });

  it("never goes negative even with a huge discount", () => {
    const state = { ...initialState(), upgrades: { ...initialState().upgrades, caravanserai: 999 } };
    const town = TOWNS[0];
    expect(effectiveTariffRate(state, town)).toBeGreaterThanOrEqual(0);
  });
});

describe("tick — loan interest accrual", () => {
  const originalRandom = Math.random;
  beforeEach(() => {
    // Suppress every random-chance branch (events, etc.) so this test only
    // exercises tick()'s deterministic math.
    Math.random = () => 0.999999;
  });
  afterEach(() => {
    Math.random = originalRandom;
  });

  it("compounds the loan balance by its per-tick rate on every tick", () => {
    const withLoan = takeLoan({ ...initialState(), cash: 1000 }, 100, LOAN_TERM_MONTHS_STEPS[0]);
    const { principal, interestRatePerTick } = withLoan.loan!;
    const next = tick(withLoan);
    expect(next.loan!.remainingBalance).toBeCloseTo(principal * (1 + interestRatePerTick), 6);
  });

  it("advances the in-game day after a full day's worth of ticks", () => {
    let state = initialState();
    for (let i = 0; i < TICKS_PER_GAME_DAY; i++) {
      state = tick(state);
    }
    expect(gameDayFromTick(state.tick)).toBe(2);
  });

  it("samples net worth into netWorthHistory every tick, capped at HISTORY_LEN", () => {
    let state = initialState();
    expect(state.netWorthHistory).toEqual([state.cash]);
    for (let i = 0; i < 5; i++) {
      state = tick(state);
    }
    expect(state.netWorthHistory.length).toBe(6); // seed value + 5 ticks
    expect(state.netWorthHistory[state.netWorthHistory.length - 1]).toBeCloseTo(computeNetWorth(state), 6);
  });
});

describe("hot streak trading bonus", () => {
  // A very low avgCost relative to the market price guarantees every sell in
  // these tests realizes a profit, regardless of the bid/ask spread.
  function stateWithCheapBread(): ReturnType<typeof initialState> {
    const state = initialState();
    return {
      ...state,
      cash: 100000,
      goods: {
        ...state.goods,
        bread: { ...state.goods.bread, holding: 1000, avgCost: 0.01 },
      },
    };
  }

  it("does not award a bonus on the first win of a streak", () => {
    const state = stateWithCheapBread();
    const next = trade(state, "bread", "sell", 1);
    expect(next.tradeStreak).toBe(1);
    const price = state.goods.bread.price * (1 - marketSpread(state) / 2);
    expect(next.cash).toBeCloseTo(state.cash + price, 6);
  });

  it("stacks a growing bonus on each consecutive profitable sell", () => {
    let state = stateWithCheapBread();
    state = trade(state, "bread", "sell", 1); // streak 1, no bonus yet
    const beforeSecond = state;
    state = trade(state, "bread", "sell", 1); // streak 2
    expect(state.tradeStreak).toBe(2);

    const price = beforeSecond.goods.bread.price * (1 - marketSpread(beforeSecond) / 2);
    const pnl = (price - beforeSecond.goods.bread.avgCost) * 1;
    const expectedBonus = pnl * HOT_STREAK_BONUS_PER_TRADE; // (streak - 1) = 1
    expect(state.cash).toBeCloseTo(beforeSecond.cash + price + expectedBonus, 6);
    expect(state.stats.bestTradeStreak).toBe(2);
  });

  it("caps the bonus percentage at HOT_STREAK_MAX_BONUS however long the streak runs", () => {
    let state = stateWithCheapBread();
    const tradesToExceedCap = Math.ceil(HOT_STREAK_MAX_BONUS / HOT_STREAK_BONUS_PER_TRADE) + 5;
    for (let i = 0; i < tradesToExceedCap; i++) {
      state = trade(state, "bread", "sell", 1);
    }
    const beforeLast = state;
    state = trade(state, "bread", "sell", 1);
    const price = beforeLast.goods.bread.price * (1 - marketSpread(beforeLast) / 2);
    const pnl = (price - beforeLast.goods.bread.avgCost) * 1;
    const expectedBonus = pnl * HOT_STREAK_MAX_BONUS;
    expect(state.cash).toBeCloseTo(beforeLast.cash + price + expectedBonus, 6);
  });

  it("resets the streak to 0 on a loss, without lowering the recorded best streak", () => {
    let state = stateWithCheapBread();
    state = trade(state, "bread", "sell", 1);
    state = trade(state, "bread", "sell", 1);
    state = trade(state, "bread", "sell", 1);
    expect(state.tradeStreak).toBe(3);
    expect(state.stats.bestTradeStreak).toBe(3);

    // Force a losing sell by setting the holding's avg cost above the market price.
    const losingState = { ...state, goods: { ...state.goods, bread: { ...state.goods.bread, avgCost: 1e9 } } };
    const afterLoss = trade(losingState, "bread", "sell", 1);
    expect(afterLoss.tradeStreak).toBe(0);
    expect(afterLoss.stats.bestTradeStreak).toBe(3);
  });
});

describe("sendCaravan insurance", () => {
  const townId = TOWNS[0].id;

  it("export: charges no cash and marks the caravan uninsured when insurance isn't requested", () => {
    const state = {
      ...initialState(),
      cash: 1000,
      goods: { ...initialState().goods, bread: { ...initialState().goods.bread, holding: 50 } },
    };
    const next = sendCaravan(state, townId, "bread", "export", 10, false);
    const caravan = next.caravans[next.caravans.length - 1];
    expect(caravan.insured).toBe(false);
    expect(next.cash).toBe(state.cash);
    expect(next.goods.bread.holding).toBe(40);
  });

  it("export: deducts an upfront premium and marks the caravan insured when affordable", () => {
    const state = {
      ...initialState(),
      cash: 1000,
      goods: { ...initialState().goods, bread: { ...initialState().goods.bread, holding: 50 } },
    };
    const price = state.foreignTowns[townId].prices.bread;
    const gross = 10 * price;
    const next = sendCaravan(state, townId, "bread", "export", 10, true);
    const caravan = next.caravans[next.caravans.length - 1];
    expect(caravan.insured).toBe(true);
    expect(next.cash).toBeCloseTo(state.cash - gross * CARAVAN_INSURANCE_COST_PCT, 6);
  });

  it("export: silently skips insurance if the premium isn't affordable", () => {
    const state = {
      ...initialState(),
      cash: 0,
      goods: { ...initialState().goods, bread: { ...initialState().goods.bread, holding: 50 } },
    };
    const next = sendCaravan(state, townId, "bread", "export", 10, true);
    const caravan = next.caravans[next.caravans.length - 1];
    expect(caravan.insured).toBe(false);
    expect(next.cash).toBe(0);
  });

  it("import: deducts cost plus an upfront premium and marks the caravan insured when affordable", () => {
    const state = { ...initialState(), cash: 100000 };
    const town = state.foreignTowns[townId];
    const price = town.prices.bread;
    const tariffRate = effectiveTariffRate(state, TOWNS[0]);
    const cost = 10 * price * (1 + tariffRate);
    const next = sendCaravan(state, townId, "bread", "import", 10, true);
    const caravan = next.caravans[next.caravans.length - 1];
    expect(caravan.insured).toBe(true);
    expect(next.cash).toBeCloseTo(state.cash - cost - cost * CARAVAN_INSURANCE_COST_PCT, 6);
  });

  it("import: skips insurance (but still buys the goods) if only the premium is unaffordable", () => {
    const state = { ...initialState(), cash: 100000 };
    const town = state.foreignTowns[townId];
    const price = town.prices.bread;
    const tariffRate = effectiveTariffRate(state, TOWNS[0]);
    const cost = 10 * price * (1 + tariffRate);
    // Leave exactly enough for the goods themselves, nothing left for the premium.
    const tightState = { ...state, cash: cost };
    const next = sendCaravan(tightState, townId, "bread", "import", 10, true);
    const caravan = next.caravans[next.caravans.length - 1];
    expect(caravan.insured).toBe(false);
    expect(next.cash).toBeCloseTo(0, 6);
  });
});

describe("caravan bandit raids", () => {
  const originalRandom = Math.random;
  afterEach(() => {
    Math.random = originalRandom;
  });

  function stateWithArrivingCaravan(insured: boolean, guardTowerLevel = 0) {
    const state = { ...initialState(), cash: 1000, paused: false };
    const caravan = {
      id: state.nextId,
      townId: TOWNS[0].id,
      goodId: "bread" as const,
      direction: "export" as const,
      qty: 10,
      amount: 100,
      departedTick: state.tick,
      arrivesAtTick: state.tick + 1,
      insured,
    };
    return {
      ...state,
      nextId: state.nextId + 1,
      caravans: [caravan],
      upgrades: { ...state.upgrades, guardTower: guardTowerLevel },
    };
  }

  // tick() also credits passive tax/production income independent of any
  // caravan, so isolate the caravan's own contribution by diffing against
  // an otherwise-identical tick with no caravan in flight (same Math.random
  // mock makes every other random effect land identically in both calls).
  function caravanCashContribution(insured: boolean, guardTowerLevel = 0) {
    const withCaravan = stateWithArrivingCaravan(insured, guardTowerLevel);
    const withoutCaravan = { ...withCaravan, caravans: [] };
    const nextWith = tick(withCaravan);
    const nextWithout = tick(withoutCaravan);
    return nextWith.cash - nextWithout.cash;
  }

  it("delivers the full amount when the raid roll misses", () => {
    Math.random = () => 0.999999; // clears every chance check in tick(), including the raid roll
    expect(caravanCashContribution(false)).toBeCloseTo(100, 6);
    const next = tick(stateWithArrivingCaravan(false));
    expect(next.caravans.length).toBe(0);
  });

  it("reduces the delivered amount when an uninsured caravan is raided", () => {
    Math.random = () => 0.01; // clears CARAVAN_RAID_CHANCE and sets the loss pct
    const lossPct = CARAVAN_RAID_LOSS_MIN + 0.01 * (CARAVAN_RAID_LOSS_MAX - CARAVAN_RAID_LOSS_MIN);
    expect(caravanCashContribution(false)).toBeCloseTo(100 * (1 - lossPct), 6);
    expect(caravanCashContribution(false)).toBeLessThan(100);
  });

  it("never raids an insured caravan even when the raid roll would otherwise hit", () => {
    Math.random = () => 0.01;
    expect(caravanCashContribution(true)).toBeCloseTo(100, 6);
  });

  it("a maxed guard tower lowers the effective raid chance below the base rate", () => {
    const guardTowerLevel = UPGRADES_BY_ID.guardTower.maxLevel;
    const reducedChance = CARAVAN_RAID_CHANCE - guardTowerLevel * UPGRADES_BY_ID.guardTower.effectPerLevel;
    // Pick a roll that clears the (lower) guard-tower chance but would have
    // triggered a raid at the base rate, so the two only differ because of
    // the upgrade.
    const roll = (reducedChance + CARAVAN_RAID_CHANCE) / 2;
    Math.random = () => roll;
    expect(caravanCashContribution(false, 0)).toBeLessThan(100); // raided without the upgrade
    expect(caravanCashContribution(false, guardTowerLevel)).toBeCloseTo(100, 6); // safe with it maxed
  });
});

describe("lost treasure", () => {
  const originalRandom = Math.random;
  afterEach(() => {
    Math.random = originalRandom;
  });

  // Happiness sits strictly between ANGRY_THRESHOLD and CONTENT_THRESHOLD so
  // neither of those happiness-driven cash events (which fire on their own,
  // much larger, chance) can stack with the treasure roll and throw off the
  // exact-cash assertions below.
  it("does not add anything when the roll misses", () => {
    Math.random = () => 0.999999;
    const state = { ...initialState(), cash: 1000, happiness: 50, paused: false };
    const next = tick(state);
    expect(next.cash).toBeCloseTo(1000, 6);
  });

  it("adds a cash windfall sized off current cash when the rare roll hits", () => {
    Math.random = () => 0; // clears every chance check in tick(), including LOST_TREASURE_CHANCE
    const state = { ...initialState(), cash: 1000, happiness: 50, paused: false };
    const next = tick(state);
    expect(next.cash).toBeCloseTo(1000 + 1000 * 0.05, 6);
    expect(next.lastEvent?.message).toMatch(/hazine|treasure/i);
  });

  it("floors the windfall so it's still meaningful with little cash", () => {
    Math.random = () => 0;
    const state = { ...initialState(), cash: 10, happiness: 50, paused: false };
    const next = tick(state);
    expect(next.cash).toBeCloseTo(10 + 20, 6);
  });
});

describe("earthquake disaster", () => {
  const originalRandom = Math.random;
  afterEach(() => {
    Math.random = originalRandom;
  });

  it("does not report a quake when the rare roll misses", () => {
    Math.random = () => 0.999999;
    const state = { ...initialState(), happiness: 50, paused: false };
    const next = tick(state);
    expect(next.eventLog.some((e) => /deprem|earthquake/i.test(e.message))).toBe(false);
  });

  it("reports a quake in the event log when the rare roll hits", () => {
    Math.random = () => 0.001; // clears EARTHQUAKE_CHANCE and sets the severity roll
    const state = { ...initialState(), happiness: 50, paused: false };
    const next = tick(state);
    expect(next.eventLog.some((e) => /deprem|earthquake/i.test(e.message))).toBe(true);
  });

  it("a maxed Earthquake Fund softens the supply loss relative to no fund at all", () => {
    Math.random = () => 0.001;
    const base = { ...initialState(), happiness: 50, paused: false };
    const withoutFund = tick(base);
    const withFund = tick({
      ...base,
      upgrades: { ...base.upgrades, earthquakeFund: UPGRADES_BY_ID.earthquakeFund.maxLevel },
    });
    expect(withFund.goods.bread.supply).toBeGreaterThan(withoutFund.goods.bread.supply);
  });
});

describe("personal net-worth record", () => {
  it("does not celebrate on a fresh save with nothing to beat yet (priorBestNetWorth = 0)", () => {
    const state = { ...initialState(), paused: false };
    expect(state.priorBestNetWorth).toBe(0);
    const next = tick(state);
    expect(next.recordBrokenThisRun).toBe(false);
  });

  it("fires a new-record event once net worth crosses priorBestNetWorth, and stays quiet after", () => {
    const state = { ...initialState(), cash: 1000, priorBestNetWorth: 500, paused: false };
    const next = tick(state);
    expect(next.recordBrokenThisRun).toBe(true);
    expect(next.lastEvent?.message).toMatch(/record|rekor/i);
    expect(next.bestNetWorthEver).toBeGreaterThanOrEqual(computeNetWorth(next));

    // A second tick shouldn't re-fire the celebration even though net worth
    // is still comfortably above the old record.
    const afterSecondTick = tick({ ...next, lastEvent: { id: -1, message: "", tone: "neutral" } });
    expect(afterSecondTick.recordBrokenThisRun).toBe(true);
    expect(afterSecondTick.lastEvent?.message).not.toMatch(/record|rekor/i);
  });
});

describe("ghost rival town", () => {
  const originalRandom = Math.random;
  afterEach(() => {
    Math.random = originalRandom;
  });

  it("grows the rival's net worth each tick", () => {
    Math.random = () => 0.5; // zeroes out the symmetric jitter term
    const state = { ...initialState(), happiness: 50, paused: false };
    const next = tick(state);
    expect(next.rivalNetWorth).toBeCloseTo(state.rivalNetWorth * (1 + RIVAL_TOWN_GROWTH_RATE), 6);
  });

  it("fires an event when the rival overtakes the player, then stays quiet while still ahead", () => {
    Math.random = () => 0.5;
    // Rival starts just below the player's net worth, so growth pushes it ahead this tick.
    const state = {
      ...initialState(),
      cash: 1000,
      happiness: 50,
      paused: false,
      rivalNetWorth: 999,
      rivalCurrentlyAhead: false,
    };
    const next = tick(state);
    expect(next.rivalCurrentlyAhead).toBe(true);
    expect(next.lastEvent?.message).toMatch(/rakip|rival/i);

    const afterSecondTick = tick({ ...next, lastEvent: { id: -1, message: "", tone: "neutral" } });
    expect(afterSecondTick.rivalCurrentlyAhead).toBe(true);
    expect(afterSecondTick.lastEvent?.message).not.toMatch(/rakip|rival/i);
  });

  it("fires the opposite event when the player retakes the lead", () => {
    Math.random = () => 0.5;
    const state = {
      ...initialState(),
      cash: 100000,
      happiness: 50,
      paused: false,
      rivalNetWorth: 500,
      rivalCurrentlyAhead: true,
    };
    const next = tick(state);
    expect(next.rivalCurrentlyAhead).toBe(false);
    expect(next.lastEvent?.message).toMatch(/rakip|rival/i);
  });
});

describe("addAutoTradeRule", () => {
  it("captures the trigger price relative to the good's price at creation time", () => {
    const state = initialState();
    const price = state.goods.bread.price;
    const pct = AUTO_TRADE_TRIGGER_PCT_STEPS[0];
    const next = addAutoTradeRule(state, "bread", "buy", pct, 5);
    expect(next.autoTradeRules).toHaveLength(1);
    const rule = next.autoTradeRules[0];
    expect(rule.trigger).toBe("priceBelow");
    expect(rule.triggerPrice).toBeCloseTo(price * (1 - pct), 6);
    expect(rule.enabled).toBe(true);
  });

  it("rejects adding beyond the max active rules", () => {
    let state = initialState();
    for (let i = 0; i < AUTO_TRADE_MAX_RULES; i++) {
      state = addAutoTradeRule(state, "bread", "sell", AUTO_TRADE_TRIGGER_PCT_STEPS[0], 1);
    }
    expect(state.autoTradeRules).toHaveLength(AUTO_TRADE_MAX_RULES);
    const next = addAutoTradeRule(state, "bread", "sell", AUTO_TRADE_TRIGGER_PCT_STEPS[0], 1);
    expect(next).toBe(state);
  });

  it("rejects an unrecognized trigger percentage", () => {
    const state = initialState();
    const next = addAutoTradeRule(state, "bread", "buy", 0.99, 1);
    expect(next).toBe(state);
  });
});

describe("removeAutoTradeRule / toggleAutoTradeRule", () => {
  it("removes a rule by id", () => {
    const withRule = addAutoTradeRule(initialState(), "bread", "buy", AUTO_TRADE_TRIGGER_PCT_STEPS[0], 5);
    const ruleId = withRule.autoTradeRules[0].id;
    const next = removeAutoTradeRule(withRule, ruleId);
    expect(next.autoTradeRules).toHaveLength(0);
  });

  it("toggles a rule's enabled flag without affecting others", () => {
    const withRule = addAutoTradeRule(initialState(), "bread", "buy", AUTO_TRADE_TRIGGER_PCT_STEPS[0], 5);
    const ruleId = withRule.autoTradeRules[0].id;
    const toggledOff = toggleAutoTradeRule(withRule, ruleId);
    expect(toggledOff.autoTradeRules[0].enabled).toBe(false);
    const toggledOn = toggleAutoTradeRule(toggledOff, ruleId);
    expect(toggledOn.autoTradeRules[0].enabled).toBe(true);
  });
});

describe("applyAutoTradeRules", () => {
  it("does nothing when the price hasn't crossed the threshold", () => {
    const state = addAutoTradeRule(initialState(), "bread", "buy", AUTO_TRADE_TRIGGER_PCT_STEPS[0], 5);
    const next = applyAutoTradeRules(state);
    expect(next.goods.bread.holding).toBe(0);
  });

  it("fires a buy once the price is at or below the trigger", () => {
    const withRule = addAutoTradeRule({ ...initialState(), cash: 100000 }, "bread", "buy", 0.1, 5);
    const droppedPrice = withRule.autoTradeRules[0].triggerPrice;
    const state = {
      ...withRule,
      goods: { ...withRule.goods, bread: { ...withRule.goods.bread, price: droppedPrice } },
    };
    const next = applyAutoTradeRules(state);
    expect(next.goods.bread.holding).toBe(5);
    expect(next.cash).toBeLessThan(state.cash);
  });

  it("fires a sell once the price is at or above the trigger", () => {
    const bought = trade({ ...initialState(), cash: 100000 }, "bread", "buy", 10);
    const withRule = addAutoTradeRule(bought, "bread", "sell", 0.1, 5);
    const risenPrice = withRule.autoTradeRules[0].triggerPrice;
    const state = {
      ...withRule,
      goods: { ...withRule.goods, bread: { ...withRule.goods.bread, price: risenPrice } },
    };
    const next = applyAutoTradeRules(state);
    expect(next.goods.bread.holding).toBe(5);
  });

  it("skips a disabled rule", () => {
    const withRule = addAutoTradeRule({ ...initialState(), cash: 100000 }, "bread", "buy", 0.1, 5);
    const ruleId = withRule.autoTradeRules[0].id;
    const disabled = toggleAutoTradeRule(withRule, ruleId);
    const droppedPrice = disabled.autoTradeRules[0].triggerPrice;
    const state = {
      ...disabled,
      goods: { ...disabled.goods, bread: { ...disabled.goods.bread, price: droppedPrice } },
    };
    const next = applyAutoTradeRules(state);
    expect(next.goods.bread.holding).toBe(0);
  });
});
