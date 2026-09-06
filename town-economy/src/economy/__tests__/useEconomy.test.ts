import { GOODS_BY_ID } from "../goods";
import { TOWNS } from "../towns";
import {
  HOT_STREAK_BONUS_PER_TRADE,
  HOT_STREAK_MAX_BONUS,
  LOAN_MAX_INTEREST_RATE_PER_DAY,
  LOAN_MIN_CAP,
  LOAN_MIN_INTEREST_RATE_PER_DAY,
  LOAN_TERM_MONTHS_STEPS,
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
  repayLoan,
  takeLoan,
  tick,
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
