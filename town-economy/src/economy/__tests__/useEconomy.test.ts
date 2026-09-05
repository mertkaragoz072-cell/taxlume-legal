import { GOODS_BY_ID } from "../goods";
import { TOWNS } from "../towns";
import {
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
    const price = state.goods.bread.price;
    const next = trade(state, "bread", "buy", 5);
    expect(next.goods.bread.holding).toBe(5);
    expect(next.cash).toBeCloseTo(state.cash - 5 * price, 6);
    expect(next.stats.totalTrades).toBe(1);
  });

  it("clamps a buy order to what the player can actually afford", () => {
    const state = { ...initialState(), cash: 10 };
    const price = state.goods.bread.price;
    const affordable = Math.floor(10 / price);
    const next = trade(state, "bread", "buy", 999);
    expect(next.goods.bread.holding).toBe(affordable);
    expect(next.cash).toBeGreaterThanOrEqual(0);
  });

  it("selling more than held is a no-op", () => {
    const state = initialState();
    const next = trade(state, "bread", "sell", 5);
    expect(next).toBe(state);
  });

  it("buying then selling the same quantity returns cash to its starting point", () => {
    const state = initialState();
    const bought = trade(state, "bread", "buy", 3);
    const soldBack = trade(bought, "bread", "sell", 3);
    expect(soldBack.cash).toBeCloseTo(state.cash, 6);
    expect(soldBack.goods.bread.holding).toBe(0);
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
