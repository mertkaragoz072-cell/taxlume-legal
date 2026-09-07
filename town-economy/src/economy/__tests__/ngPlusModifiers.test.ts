import { DIFFICULTIES } from "../difficulty";
import { effectiveDifficultyConfig, ngPlusBonusPrestigePoints, NG_PLUS_MODIFIERS } from "../ngPlusModifiers";

describe("effectiveDifficultyConfig", () => {
  it("returns the base config unchanged with no modifiers active", () => {
    const base = DIFFICULTIES.normal;
    expect(effectiveDifficultyConfig(base, [])).toEqual(base);
  });

  it("applies a single modifier's harsher transform", () => {
    const base = DIFFICULTIES.normal;
    const next = effectiveDifficultyConfig(base, ["leanStart"]);
    expect(next.startingCash).toBeLessThan(base.startingCash);
  });

  it("stacks multiple modifiers", () => {
    const base = DIFFICULTIES.normal;
    const next = effectiveDifficultyConfig(base, ["harsherInflation", "frequentEvents", "tightMargin"]);
    expect(next.baseInflationDrift).toBeGreaterThan(base.baseInflationDrift);
    expect(next.eventChance).toBeGreaterThan(base.eventChance);
    expect(next.hyperinflationIndex).toBeLessThan(base.hyperinflationIndex);
  });

  it("ignores an unrecognized modifier id", () => {
    const base = DIFFICULTIES.normal;
    expect(effectiveDifficultyConfig(base, ["not_a_real_modifier"])).toEqual(base);
  });
});

describe("ngPlusBonusPrestigePoints", () => {
  it("is 0 with no modifiers active", () => {
    expect(ngPlusBonusPrestigePoints([])).toBe(0);
  });

  it("sums each active modifier's flat bonus", () => {
    const ids = NG_PLUS_MODIFIERS.map((m) => m.id);
    const expected = NG_PLUS_MODIFIERS.reduce((sum, m) => sum + m.bonusPrestigePoints, 0);
    expect(ngPlusBonusPrestigePoints(ids)).toBe(expected);
  });

  it("ignores an unrecognized modifier id", () => {
    expect(ngPlusBonusPrestigePoints(["not_a_real_modifier"])).toBe(0);
  });
});
