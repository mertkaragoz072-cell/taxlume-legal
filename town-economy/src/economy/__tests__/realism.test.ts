import { TICKS_PER_GAME_DAY } from "../constants";
import { estimateTaxIncomePerTick } from "../formulas";
import {
  afterSpoilage,
  isPerishable,
  MONEY_PRESSURE_MAX,
  MONEY_PRESSURE_MIN,
  moneySupplyPressure,
  outputValuePerDay,
  taxBaseFactor,
  wageMultiplier,
  workerWagePerTick,
} from "../realism";
import { tick } from "../tick";
import { initialState } from "../useEconomy";
import { WORKER_WAGE_PER_TICK } from "../workers";

const fresh = () => ({ ...initialState(), paused: false });

describe("money supply", () => {
  it("is neutral-to-slightly-deflationary for a new town's small purse", () => {
    const p = moneySupplyPressure(fresh());
    expect(p).toBeLessThanOrEqual(0);
    expect(p).toBeGreaterThanOrEqual(MONEY_PRESSURE_MIN);
  });

  it("pushes prices up as the treasury grows past what the town makes", () => {
    const s = fresh();
    const day = outputValuePerDay(s);
    const small = moneySupplyPressure({ ...s, cash: day * 1 });
    const hoard = moneySupplyPressure({ ...s, cash: day * 3 });
    const vast = moneySupplyPressure({ ...s, cash: day * 100 });
    expect(hoard).toBeGreaterThan(small);
    expect(hoard).toBeGreaterThan(0);
    expect(vast).toBe(MONEY_PRESSURE_MAX);
  });

  it("raises the inflation the town drifts towards", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    const s = fresh();
    // 60% happy: no contentment bonus masking the money term
    const rich = { ...s, happiness: 60, cash: outputValuePerDay(s) * 4, inflationRate: 0.0015 };
    const poor = { ...s, happiness: 60, cash: 10, inflationRate: 0.0015 };
    expect(tick(rich).inflationRate).toBeGreaterThan(tick(poor).inflationRate);
    jest.restoreAllMocks();
  });
});

describe("wages", () => {
  it("follow the price index, never below half", () => {
    expect(workerWagePerTick(100)).toBeCloseTo(WORKER_WAGE_PER_TICK);
    expect(workerWagePerTick(200)).toBeCloseTo(WORKER_WAGE_PER_TICK * 2);
    expect(wageMultiplier(10)).toBe(0.5);
  });

  it("are charged at the indexed rate", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    const s = fresh();
    const staffed = { ...s, cash: 100_000, inflationIndex: 200, workers: { ...s.workers, grain: 2 } };
    const unstaffed = { ...staffed, workers: s.workers };
    const diff = tick(unstaffed).cash - tick(staffed).cash;
    expect(diff).toBeGreaterThan(0.9 * 2 * 1.9); // two workers at about twice the base wage
    jest.restoreAllMocks();
  });
});

describe("tax", () => {
  it("is collected in full up to 20%, then less of the base is declared", () => {
    expect(taxBaseFactor(0)).toBe(1);
    expect(taxBaseFactor(0.2)).toBe(1);
    expect(taxBaseFactor(0.3)).toBeLessThan(1);
    expect(taxBaseFactor(0.5)).toBeGreaterThanOrEqual(0.55);
  });

  it("has a peak: a very high rate collects less than a moderate one", () => {
    const s = { ...fresh(), happiness: 100 };
    const at = (rate: number) => estimateTaxIncomePerTick({ ...s, taxRate: rate });
    expect(at(0.2)).toBeGreaterThan(at(0.1));
    expect(at(0.5)).toBeLessThan(at(0.3) * 1.5); // growth flattens well below the linear 2.5x
  });
});

describe("spoilage", () => {
  it("only touches food", () => {
    expect(isPerishable("bread")).toBe(true);
    expect(isPerishable("iron")).toBe(false);
    expect(afterSpoilage("iron", 100, 0)).toBe(100);
  });

  it("loses about 4% of a food stock a day on average, and never goes negative", () => {
    let held = 400;
    let rolls = 0;
    const rand = () => (rolls++ * 0.61803398875) % 1;
    for (let i = 0; i < TICKS_PER_GAME_DAY; i++) held = afterSpoilage("bread", held, rand());
    expect(held).toBeLessThan(400);
    expect(held).toBeGreaterThan(400 * 0.9);
    expect(afterSpoilage("bread", 0, 0)).toBe(0);
    expect(afterSpoilage("bread", 1, 0)).toBe(0); // the roll can take the last unit
    expect(afterSpoilage("bread", 1, 0.9)).toBe(1);
  });
});
