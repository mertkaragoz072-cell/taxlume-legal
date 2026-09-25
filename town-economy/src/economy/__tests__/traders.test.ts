import {
  TRADERS,
  TRADERS_BY_ID,
  TraderReputation,
  reputationDelta,
  REPUTATION_TO_PRICE_MODIFIER,
  TRADER_KNOWN_THRESHOLD,
  isKnownTrader,
} from "../traders";

describe("known traders", () => {
  test("every trader exists and is indexed", () => {
    expect(TRADERS.length).toBeGreaterThan(0);
    for (const trader of TRADERS) {
      expect(TRADERS_BY_ID[trader.id]).toBe(trader);
      expect(trader.id).toBeTruthy();
      expect(trader.nameKey).toBeTruthy();
      expect(trader.buyPreferences).toBeDefined();
      expect(trader.sellPreferences).toBeDefined();
    }
  });

  test("traders have realistic preferences", () => {
    // Each trader should prefer some goods to buy and some to sell
    for (const trader of TRADERS) {
      expect(trader.buyPreferences.length).toBeGreaterThan(0);
      expect(trader.sellPreferences.length).toBeGreaterThan(0);
      // Preferences should not overlap (can't both buy and sell the same thing)
      const overlap = trader.buyPreferences.filter((g) => trader.sellPreferences.includes(g));
      expect(overlap).toEqual([]);
    }
  });

  test("reputation changes track direction: selling to buyers increases reputation more than buying", () => {
    const trader = TRADERS[0];
    const buyGood = trader.buyPreferences[0];

    // Selling what they buy: +2/unit
    const sellDelta = reputationDelta(buyGood, "sell", 1, trader);
    expect(sellDelta).toBe(2);

    // Buying what they buy: -0.5/unit (opposite of what they want)
    const buyDelta = reputationDelta(buyGood, "buy", 1, trader);
    expect(buyDelta).toBe(-0.5);
  });

  test("reputation bounds are -100 to +100", () => {
    const rep = 50;
    const modifier = REPUTATION_TO_PRICE_MODIFIER(rep);
    expect(modifier).toBeGreaterThanOrEqual(-0.06);
    expect(modifier).toBeLessThanOrEqual(0.06);

    // At neutral, no price change
    const neutralMod = REPUTATION_TO_PRICE_MODIFIER(0);
    expect(neutralMod).toBe(0);
  });

  test("reputation affects price linearly: 50 rep = 3% discount, 100 rep = 6%", () => {
    expect(REPUTATION_TO_PRICE_MODIFIER(50)).toBeCloseTo(0.03, 2);
    expect(REPUTATION_TO_PRICE_MODIFIER(100)).toBeCloseTo(0.06, 2);
    expect(REPUTATION_TO_PRICE_MODIFIER(-50)).toBeCloseTo(-0.03, 2);
    expect(REPUTATION_TO_PRICE_MODIFIER(-100)).toBeCloseTo(-0.06, 2);
  });

  test("traders become known after threshold trades", () => {
    const rep: TraderReputation = {
      traderId: "test",
      reputation: TRADER_KNOWN_THRESHOLD - 1,
      tradeCount: 1,
      metAtTick: 0,
    };
    expect(isKnownTrader(rep.reputation)).toBe(false);

    rep.reputation = TRADER_KNOWN_THRESHOLD;
    expect(isKnownTrader(rep.reputation)).toBe(true);
  });

  test("delta scales with quantity", () => {
    const trader = TRADERS[0];
    const buyGood = trader.buyPreferences[0];

    const delta1 = reputationDelta(buyGood, "sell", 1, trader);
    const delta10 = reputationDelta(buyGood, "sell", 10, trader);

    expect(delta10).toBe(delta1 * 10);
  });
});
