import { GOODS, GOODS_BY_ID } from "../goods";
import { TOWNS } from "../towns";
import {
  houseSupplyDelta,
  isTradingHouseId,
  rollActivity,
  TRADING_HOUSE_SPELL_DAYS,
  TRADING_HOUSES,
  TRADING_HOUSES_BY_ID,
  TradingHouseActivity,
} from "../tradingHouses";
import { GoodId } from "../types";
import { TownId } from "../towns";

const TICKS_PER_DAY = 40;
const TOWN_IDS: TownId[] = TOWNS.map((t) => t.id);
const GOOD_IDS: GoodId[] = GOODS.map((g) => g.id);

describe("trading house data", () => {
  it("gives every house a distinct id and indexes it", () => {
    expect(new Set(TRADING_HOUSES.map((h) => h.id)).size).toBe(TRADING_HOUSES.length);
    for (const h of TRADING_HOUSES) expect(TRADING_HOUSES_BY_ID[h.id]).toBe(h);
  });

  it("gives every house real pressure, or it would not be competition", () => {
    for (const h of TRADING_HOUSES) expect(h.pressure).toBeGreaterThan(0);
  });

  it("validates ids without falling through to the prototype chain", () => {
    for (const h of TRADING_HOUSES) expect(isTradingHouseId(h.id)).toBe(true);
    expect(isTradingHouseId("toString")).toBe(false);
    expect(isTradingHouseId("nobody")).toBe(false);
  });
});

describe("rollActivity", () => {
  it("only ever picks a real town and a real good", () => {
    for (let i = 0; i < 200; i++) {
      const a = rollActivity("goldenScales", 0, TICKS_PER_DAY, TOWN_IDS, GOOD_IDS);
      expect(TOWN_IDS).toContain(a.townId);
      expect(GOOD_IDS).toContain(a.goodId);
      expect(["buying", "selling"]).toContain(a.side);
    }
  });

  it("runs for exactly the spell length from its start tick", () => {
    const a = rollActivity("saltRoad", 120, TICKS_PER_DAY, TOWN_IDS, GOOD_IDS);
    expect(a.untilTick).toBe(120 + TRADING_HOUSE_SPELL_DAYS * TICKS_PER_DAY);
  });

  it("keeps the house it was rolled for", () => {
    expect(rollActivity("blackSail", 0, TICKS_PER_DAY, TOWN_IDS, GOOD_IDS).houseId).toBe("blackSail");
  });

  it("eventually produces both sides", () => {
    const sides = new Set(
      Array.from({ length: 200 }, () => rollActivity("saltRoad", 0, TICKS_PER_DAY, TOWN_IDS, GOOD_IDS).side)
    );
    expect(sides.size).toBe(2);
  });
});

describe("houseSupplyDelta", () => {
  const town = TOWN_IDS[0];
  const bread = GOODS_BY_ID.bread;
  const act = (side: "buying" | "selling", houseId = "goldenScales"): TradingHouseActivity => ({
    houseId,
    townId: town,
    goodId: "bread",
    side,
    untilTick: 100,
  });

  it("drains the market a house is buying and floods the one it is selling", () => {
    expect(houseSupplyDelta([act("buying")], town, "bread", bread.baseProduction)).toBeLessThan(0);
    expect(houseSupplyDelta([act("selling")], town, "bread", bread.baseProduction)).toBeGreaterThan(0);
  });

  it("leaves every market the houses are not working alone", () => {
    expect(houseSupplyDelta([act("buying")], town, "milk", bread.baseProduction)).toBe(0);
    expect(houseSupplyDelta([act("buying")], TOWN_IDS[1], "bread", bread.baseProduction)).toBe(0);
    expect(houseSupplyDelta([], town, "bread", bread.baseProduction)).toBe(0);
  });

  it("has two houses on opposite sides of one market cancel out", () => {
    const both = [act("buying", "saltRoad"), act("selling", "saltRoad")];
    expect(houseSupplyDelta(both, town, "bread", bread.baseProduction)).toBeCloseTo(0, 6);
  });

  it("adds up when two houses lean the same way", () => {
    const one = houseSupplyDelta([act("buying", "saltRoad")], town, "bread", bread.baseProduction);
    const two = houseSupplyDelta(
      [act("buying", "saltRoad"), act("buying", "blackSail")],
      town,
      "bread",
      bread.baseProduction
    );
    expect(two).toBeLessThan(one);
  });

  it("ignores an activity naming a house that does not exist", () => {
    expect(houseSupplyDelta([act("buying", "ghostHouse")], town, "bread", bread.baseProduction)).toBe(0);
  });

  it("scales with the good's own production rate", () => {
    const fast = GOODS.reduce((a, b) => (a.baseProduction > b.baseProduction ? a : b));
    const slow = GOODS.reduce((a, b) => (a.baseProduction < b.baseProduction ? a : b));
    const at = (goodId: GoodId): TradingHouseActivity => ({ ...act("buying"), goodId });
    expect(
      Math.abs(houseSupplyDelta([at(fast.id)], town, fast.id, fast.baseProduction))
    ).toBeGreaterThanOrEqual(Math.abs(houseSupplyDelta([at(slow.id)], town, slow.id, slow.baseProduction)));
  });
});
