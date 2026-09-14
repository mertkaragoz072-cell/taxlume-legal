import {
  DEMAND_CYCLE_DAYS,
  DEMAND_GLUT_PRICE_MULT,
  DEMAND_HOT_COUNT,
  DEMAND_HOT_PRICE_MULT,
  demandPriceMultiplier,
  demandSupplyDelta,
  isGlutted,
  isHot,
  rollDemandCycle,
} from "../demandCycles";
import { GOODS, GOODS_BY_ID } from "../goods";
import { GoodId } from "../types";

const TICKS_PER_DAY = 40;
const ALL: GoodId[] = GOODS.map((g) => g.id);

describe("rollDemandCycle", () => {
  it("spans exactly DEMAND_CYCLE_DAYS days from its start tick", () => {
    const cycle = rollDemandCycle(200, TICKS_PER_DAY, ALL);
    expect(cycle.startTick).toBe(200);
    expect(cycle.endTick).toBe(200 + DEMAND_CYCLE_DAYS * TICKS_PER_DAY);
  });

  it("picks the configured number of hot goods", () => {
    for (let i = 0; i < 50; i++) {
      expect(rollDemandCycle(0, TICKS_PER_DAY, ALL).hotGoodIds).toHaveLength(DEMAND_HOT_COUNT);
    }
  });

  it("never marks the same good both hot and glutted", () => {
    for (let i = 0; i < 200; i++) {
      const cycle = rollDemandCycle(0, TICKS_PER_DAY, ALL);
      expect(cycle.hotGoodIds).not.toContain(cycle.gluttedGoodId);
    }
  });

  it("only ever picks from the goods it was offered", () => {
    const eligible: GoodId[] = ["bread", "milk", "wood"];
    for (let i = 0; i < 100; i++) {
      const cycle = rollDemandCycle(0, TICKS_PER_DAY, eligible);
      for (const id of cycle.hotGoodIds) expect(eligible).toContain(id);
      expect(eligible).toContain(cycle.gluttedGoodId);
    }
  });

  it("never repeats a good within the hot list", () => {
    for (let i = 0; i < 200; i++) {
      const { hotGoodIds } = rollDemandCycle(0, TICKS_PER_DAY, ALL);
      expect(new Set(hotGoodIds).size).toBe(hotGoodIds.length);
    }
  });

  it("survives a pool too small to fill every slot", () => {
    // The opening days, before the later goods unlock.
    const cycle = rollDemandCycle(0, TICKS_PER_DAY, ["bread", "milk"]);
    expect(cycle.hotGoodIds.length).toBeLessThanOrEqual(DEMAND_HOT_COUNT);
    expect(cycle.gluttedGoodId).toBeDefined();
  });
});

describe("demand effects", () => {
  const cycle = {
    startTick: 0,
    endTick: 120,
    hotGoodIds: ["bread", "milk"] as GoodId[],
    gluttedGoodId: "wood" as GoodId,
  };

  it("prices hot goods up and glutted goods down", () => {
    expect(demandPriceMultiplier(cycle, "bread")).toBe(DEMAND_HOT_PRICE_MULT);
    expect(demandPriceMultiplier(cycle, "wood")).toBe(DEMAND_GLUT_PRICE_MULT);
  });

  it("leaves an unaffected good exactly alone", () => {
    expect(demandPriceMultiplier(cycle, "iron")).toBe(1);
    expect(demandSupplyDelta(cycle, GOODS_BY_ID.iron)).toBe(0);
  });

  it("drains supply from hot goods and adds it to glutted ones", () => {
    expect(demandSupplyDelta(cycle, GOODS_BY_ID.bread)).toBeLessThan(0);
    expect(demandSupplyDelta(cycle, GOODS_BY_ID.wood)).toBeGreaterThan(0);
  });

  it("scales the supply pressure with the good's own production rate", () => {
    const fast = GOODS.reduce((a, b) => (a.baseProduction > b.baseProduction ? a : b));
    const slow = GOODS.reduce((a, b) => (a.baseProduction < b.baseProduction ? a : b));
    const hotBoth = { ...cycle, hotGoodIds: [fast.id, slow.id] as GoodId[] };
    expect(Math.abs(demandSupplyDelta(hotBoth, fast))).toBeGreaterThanOrEqual(
      Math.abs(demandSupplyDelta(hotBoth, slow))
    );
  });

  it("treats a missing cycle as no effect at all", () => {
    expect(demandPriceMultiplier(null, "bread")).toBe(1);
    expect(demandSupplyDelta(null, GOODS_BY_ID.bread)).toBe(0);
    expect(isHot(null, "bread")).toBe(false);
    expect(isGlutted(null, "bread")).toBe(false);
  });

  it("does not report a good as glutted when it is also hot", () => {
    const odd = { ...cycle, gluttedGoodId: "bread" as GoodId };
    expect(isHot(odd, "bread")).toBe(true);
    expect(isGlutted(odd, "bread")).toBe(false);
    expect(demandPriceMultiplier(odd, "bread")).toBe(DEMAND_HOT_PRICE_MULT);
  });
});
