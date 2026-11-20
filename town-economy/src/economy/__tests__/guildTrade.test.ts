import { applyGuildGoodsIn, applyGuildGoodsOut, guildStorageRoom } from "../guildTrade";
import { initialState } from "../useEconomy";

describe("guild goods in and out of the warehouse", () => {
  it("takes only what the player holds and logs it", () => {
    const s0 = initialState();
    const s1 = { ...s0, goods: { ...s0.goods, grain: { ...s0.goods.grain, holding: 6, avgCost: 3 } } };
    const out = applyGuildGoodsOut(s1, "grain", 10, "friend");
    expect(out.goods.grain.holding).toBe(0);
    expect(out.goods.grain.avgCost).toBe(0); // nothing held, no cost basis
    expect(out.eventLog[0].tone).toBe("good");
    expect(applyGuildGoodsOut(s0, "grain", 5, "order")).toBe(s0); // nothing to give: unchanged
  });

  it("books received goods at today's price, not as free profit", () => {
    const s0 = initialState();
    const price = s0.goods.wool.price;
    const s1 = { ...s0, goods: { ...s0.goods, wool: { ...s0.goods.wool, holding: 10, avgCost: price * 2 } } };
    const inn = applyGuildGoodsIn(s1, "wool", 10, "Ayşe");
    expect(inn.goods.wool.holding).toBe(20);
    expect(inn.goods.wool.avgCost).toBeCloseTo((10 * price * 2 + 10 * price) / 20, 5);
    expect(inn.eventLog[0].tone).toBe("good");
  });

  it("reports the room left in the warehouse", () => {
    const s0 = initialState();
    const full = { ...s0, goods: { ...s0.goods, grain: { ...s0.goods.grain, holding: 100000 } } };
    expect(guildStorageRoom(s0)).toBeGreaterThan(0);
    expect(guildStorageRoom(full)).toBe(0);
  });
});
