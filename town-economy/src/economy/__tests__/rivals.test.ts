import { RIVAL_TRADERS, RIVAL_TRADERS_BY_ID, rollRivalActivity, rivalSupplyDelta, isRivalId } from "../rivals";
import { GOODS } from "../goods";

describe("rivals on home market", () => {
  test("every rival exists and is indexed", () => {
    expect(RIVAL_TRADERS.length).toBeGreaterThan(0);
    for (const rival of RIVAL_TRADERS) {
      expect(RIVAL_TRADERS_BY_ID[rival.id]).toBe(rival);
      expect(rival.id).toBeTruthy();
      expect(rival.nameKey).toBeTruthy();
      expect(rival.pressure).toBeGreaterThan(0);
      expect(rival.pressure).toBeLessThan(1);
    }
  });

  test("rivals roll random activities on different goods", () => {
    const rival = RIVAL_TRADERS[0];
    const goodIds = GOODS.map((g) => g.id);
    const activities = [
      rollRivalActivity(rival.id, 0, 40, goodIds),
      rollRivalActivity(rival.id, 0, 40, goodIds),
      rollRivalActivity(rival.id, 0, 40, goodIds),
    ];

    // Should have diverse activity — at least some different goods
    const goods = new Set(activities.map((a) => a.goodId));
    expect(goods.size).toBeGreaterThan(1);

    // Each activity should have a good and a side
    for (const a of activities) {
      expect(goodIds).toContain(a.goodId);
      expect(["buying", "selling"]).toContain(a.side);
      expect(a.untilTick).toBeGreaterThan(0);
    }
  });

  test("rival activities last the expected duration", () => {
    const rival = RIVAL_TRADERS[0];
    const goodIds = GOODS.map((g) => g.id);
    const TICKS_PER_DAY = 40;
    const activity = rollRivalActivity(rival.id, 0, TICKS_PER_DAY, goodIds);

    // 1.5 days = 60 ticks
    expect(activity.untilTick).toBeCloseTo(60, -1);
  });

  test("rival supply delta moves market based on pressure", () => {
    const rival = RIVAL_TRADERS[0];
    const good = GOODS[0];
    const baseProduction = good.baseProduction;
    const rivalMap = RIVAL_TRADERS_BY_ID;

    // Buying activity drains supply
    const buyActivity = [{ rivalId: rival.id, goodId: good.id, side: "buying" as const, untilTick: 100 }];
    const buyDelta = rivalSupplyDelta(buyActivity, good.id, baseProduction, rivalMap);
    expect(buyDelta).toBeLessThan(0);

    // Selling activity adds supply
    const sellActivity = [{ rivalId: rival.id, goodId: good.id, side: "selling" as const, untilTick: 100 }];
    const sellDelta = rivalSupplyDelta(sellActivity, good.id, baseProduction, rivalMap);
    expect(sellDelta).toBeGreaterThan(0);

    // Effects should be symmetric
    expect(Math.abs(buyDelta)).toBeCloseTo(Math.abs(sellDelta), 2);
  });

  test("multiple rivals can act on the same good", () => {
    const good = GOODS[0];
    const baseProduction = good.baseProduction;
    const rivalMap = RIVAL_TRADERS_BY_ID;

    const activities = [
      { rivalId: RIVAL_TRADERS[0].id, goodId: good.id, side: "buying" as const, untilTick: 100 },
      { rivalId: RIVAL_TRADERS[1].id, goodId: good.id, side: "buying" as const, untilTick: 100 },
    ];

    const delta = rivalSupplyDelta(activities, good.id, baseProduction, rivalMap);
    // Should be sum of individual effects (but not necessarily double since pressures differ)
    const delta1 = rivalSupplyDelta([activities[0]], good.id, baseProduction, rivalMap);
    const delta2 = rivalSupplyDelta([activities[1]], good.id, baseProduction, rivalMap);
    expect(delta).toBeCloseTo(delta1 + delta2, 1);
  });

  test("rival id validation works", () => {
    for (const rival of RIVAL_TRADERS) {
      expect(isRivalId(rival.id)).toBe(true);
    }
    expect(isRivalId("notARival")).toBe(false);
  });
});
