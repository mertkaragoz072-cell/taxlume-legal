import { GOODS } from "../goods";
import { tick } from "../tick";
import { initialState } from "../useEconomy";
import { todayKey, WEEKLY_THEMES, weeklyThemeForDate, weeklyThemeMultiplier } from "../weeklyTheme";

describe("weekly market theme", () => {
  it("is the same all week and can change from one week to the next", () => {
    const mon = weeklyThemeForDate("2026-11-23");
    expect(weeklyThemeForDate("2026-11-29").id).toBe(mon.id);
    const seen = new Set<string>();
    for (let w = 0; w < 30; w++) seen.add(weeklyThemeForDate(todayKey(Date.UTC(2026, 0, 5 + w * 7))).id);
    expect(seen.size).toBeGreaterThan(2);
  });

  it("only names goods that exist, and raises their price", () => {
    for (const th of WEEKLY_THEMES) {
      for (const g of th.goods) {
        expect(GOODS.some((x) => x.id === g)).toBe(true);
        expect(weeklyThemeMultiplier(th, g)).toBeGreaterThan(1);
      }
      expect(weeklyThemeMultiplier(th, "paper")).toBe(1);
    }
  });

  it("shows up in the market price of a themed good", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    // a week where grain is themed, and one where it is not
    let themedWeek = 0;
    let plainWeek = 0;
    for (let w = 0; w < 30 && !(themedWeek && plainWeek); w++) {
      const day = Date.UTC(2026, 0, 5 + w * 7);
      const hasGrain = weeklyThemeForDate(todayKey(day)).goods.includes("grain");
      if (hasGrain && !themedWeek) themedWeek = day;
      if (!hasGrain && !plainWeek) plainWeek = day;
    }
    expect(themedWeek).toBeGreaterThan(0);
    expect(plainWeek).toBeGreaterThan(0);
    const price = (day: number) => {
      jest.spyOn(Date, "now").mockReturnValue(day);
      let st = { ...initialState(), paused: false, tick: 300, lastInterruptionTick: 1e9 };
      for (let i = 0; i < 80; i++) st = tick(st);
      return st.goods.grain.price;
    };
    expect(price(themedWeek)).toBeGreaterThan(price(plainWeek));
    jest.restoreAllMocks();
  });
});
