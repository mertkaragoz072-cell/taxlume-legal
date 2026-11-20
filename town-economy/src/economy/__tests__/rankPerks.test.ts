import {
  effectiveAutoTradeMaxRules,
  effectiveContractMaxActive,
  effectiveWorkerMaxPerGood,
  storageCapacity,
} from "../formulas";
import { rankGainLines } from "../rankPerks";
import { rankTheme } from "../rankTheme";
import { initialState } from "../useEconomy";

const t = (key: string, params?: Record<string, string | number>) =>
  key + (params ? JSON.stringify(params) : "");

describe("rankGainLines", () => {
  it("is empty when nothing was climbed", () => {
    expect(rankGainLines(3, 3, t)).toEqual([]);
    expect(rankGainLines(4, 2, t)).toEqual([]);
  });

  it("gives every single promotion at least the passive line", () => {
    for (let i = 0; i < 14; i++) expect(rankGainLines(i, i + 1, t).length).toBeGreaterThanOrEqual(1);
  });

  it("lists goods, research and new crises where they unlock", () => {
    expect(rankGainLines(0, 1, t).join("|")).toContain("rankGain.good");
    expect(rankGainLines(5, 6, t).join("|")).toContain("rankGain.research");
    expect(rankGainLines(4, 5, t).join("|")).toContain("rankGain.crisis");
    expect(rankGainLines(6, 7, t).join("|")).toContain("rankGain.crisis");
  });

  it("slot gains match the real formulas", () => {
    for (let from = 0; from < 12; from++) {
      const a = { ...initialState(), townRankIndex: from };
      const b = { ...initialState(), townRankIndex: from + 1 };
      const lines = rankGainLines(from, from + 1, t).join("|");
      expect(lines.includes("rankGain.contracts")).toBe(
        effectiveContractMaxActive(b) > effectiveContractMaxActive(a)
      );
      expect(lines.includes("rankGain.auto")).toBe(
        effectiveAutoTradeMaxRules(b) > effectiveAutoTradeMaxRules(a)
      );
      expect(lines.includes("rankGain.workers")).toBe(
        effectiveWorkerMaxPerGood(b) > effectiveWorkerMaxPerGood(a)
      );
      expect(storageCapacity(b) - storageCapacity(a)).toBe(40);
    }
  });
});

describe("rankTheme", () => {
  it("gives each of the first nine ranks its own look", () => {
    const looks = Array.from({ length: 9 }, (_, i) => rankTheme(i));
    expect(new Set(looks.map((l) => l.accent)).size).toBe(9);
    expect(new Set(looks.map((l) => l.atmosphere.tint)).size).toBe(9);
  });

  it("keeps Golden Age ranks apart too", () => {
    const looks = [8, 9, 10, 11, 12, 13].map((i) => rankTheme(i).atmosphere.tint);
    expect(new Set(looks).size).toBe(6);
  });
});
