import { TICKS_PER_GAME_DAY } from "../constants";
import { INPUT_FACTOR_MAX, INPUT_FACTOR_MIN, productionInputFactor } from "../formulas";
import { GOODS, GOODS_BY_ID } from "../goods";
import { tick } from "../tick";
import { EconomyState, GoodId } from "../types";
import { initialState } from "../useEconomy";

const CHAINS: [GoodId, GoodId][] = [
  ["bread", "grain"],
  ["cloth", "wool"],
  ["cheese", "milk"],
  ["paper", "wood"],
  ["glass", "sand"],
  ["jewelry", "iron"],
];

function withSupply(state: EconomyState, id: GoodId, ratio: number): EconomyState {
  return {
    ...state,
    goods: {
      ...state.goods,
      [id]: { ...state.goods[id], supply: GOODS_BY_ID[id].baseSupply * ratio },
    },
  };
}

describe("what a good is made from", () => {
  it("wires every chain to a good that exists and is not itself", () => {
    for (const good of GOODS) {
      for (const input of good.inputs ?? []) {
        expect(GOODS_BY_ID[input]).toBeDefined();
        expect(input).not.toBe(good.id);
        // No cycles: an input may not itself be made from its own output.
        expect(GOODS_BY_ID[input].inputs ?? []).not.toContain(good.id);
      }
    }
  });

  it("keeps the declared chains", () => {
    for (const [output, input] of CHAINS) {
      expect(GOODS_BY_ID[output].inputs).toContain(input);
    }
  });

  it("throttles on the scarcest input and never past the floor", () => {
    const state = initialState();
    const glass = GOODS_BY_ID.glass; // made from sand *and* wood
    const supplyOf = (id: GoodId) => state.goods[id].supply;
    const base = (id: GoodId) => GOODS_BY_ID[id].baseSupply;

    const plenty = productionInputFactor(glass, () => 1e9, base);
    expect(plenty).toBeCloseTo(INPUT_FACTOR_MAX);

    const nothing = productionInputFactor(glass, () => 0, base);
    expect(nothing).toBeCloseTo(INPUT_FACTOR_MIN);

    // One scarce input is enough: a glassworks with sand but no fuel is
    // still a glassworks that cannot fire.
    const halfWood = productionInputFactor(glass, (id) => (id === "wood" ? base(id) * 0.5 : base(id)), base);
    expect(halfWood).toBeCloseTo(0.5);
    expect(productionInputFactor(GOODS_BY_ID.spice, supplyOf, base)).toBe(1); // no inputs
  });

  it("passes a shortage downstream: short wool means less cloth", () => {
    // The whole point. Two identical towns, one with the wool shelves half
    // empty, run for a day — the one short of wool ends with less cloth.
    const base = { ...initialState(), paused: false };
    const run = (state: EconomyState) => {
      let s = state;
      for (let i = 0; i < TICKS_PER_GAME_DAY; i++) s = tick(s);
      return s.goods.cloth.supply;
    };
    const normal = run(base);
    const shortOfWool = run(withSupply(base, "wool", 0.35));
    expect(shortOfWool).toBeLessThan(normal);
  });

  it("cannot starve a chain to a standstill", () => {
    // The floor exists so a chain that runs dry recovers instead of dying.
    // Zero wool for a week must still leave cloth being made.
    let s: EconomyState = withSupply({ ...initialState(), paused: false }, "wool", 0);
    for (let i = 0; i < TICKS_PER_GAME_DAY * 7; i++) s = tick(withSupply(s, "wool", 0));
    expect(s.goods.cloth.supply).toBeGreaterThan(0);
  });
});
