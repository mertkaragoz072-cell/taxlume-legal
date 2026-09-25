import { FOOD_GOODS, GOODS, goodGroup } from "../goods";
import { TICKS_PER_GAME_DAY } from "../constants";
import {
  SEASONS,
  SEASON_DAYS,
  daysUntilNextSeason,
  nextSeasonFromTick,
  seasonFromTick,
  seasonProductionMultiplier,
} from "../seasons";
import { tick } from "../tick";
import { initialState } from "../useEconomy";

describe("the calendar", () => {
  it("turns once per SEASON_DAYS and comes back round", () => {
    const year = SEASONS.length * SEASON_DAYS;
    for (let day = 0; day < year * 3; day++) {
      const t = day * TICKS_PER_GAME_DAY;
      expect(seasonFromTick(t).id).toBe(SEASONS[Math.floor(day / SEASON_DAYS) % SEASONS.length].id);
      // Same season the whole day through, not just on its first tick.
      expect(seasonFromTick(t + TICKS_PER_GAME_DAY - 1).id).toBe(seasonFromTick(t).id);
    }
  });

  it("starts a new town in spring", () => {
    expect(seasonFromTick(0).id).toBe("spring");
  });

  it("counts down to the next season and names it", () => {
    for (let day = 0; day < SEASONS.length * SEASON_DAYS; day++) {
      const t = day * TICKS_PER_GAME_DAY;
      const left = daysUntilNextSeason(t);
      expect(left).toBeGreaterThanOrEqual(1);
      expect(left).toBeLessThanOrEqual(SEASON_DAYS);
      // Count the days out and you land in the season it promised.
      expect(seasonFromTick(t + left * TICKS_PER_GAME_DAY).id).toBe(nextSeasonFromTick(t).id);
    }
  });
});

describe("what a season does", () => {
  it("makes autumn a glut and winter a squeeze for food", () => {
    const autumn = SEASONS.find((s) => s.id === "autumn")!;
    const winter = SEASONS.find((s) => s.id === "winter")!;
    for (const id of FOOD_GOODS) {
      expect(seasonProductionMultiplier(autumn, id)).toBeGreaterThan(1.2);
      expect(seasonProductionMultiplier(winter, id)).toBeLessThan(0.8);
    }
  });

  it("sorts every good into exactly one group", () => {
    // A good missing from the lists would silently take `undefined` as its
    // multiplier and quietly stop being produced at all.
    for (const good of GOODS) {
      expect(goodGroup(good.id)).toBeDefined();
      for (const season of SEASONS) {
        expect(Number.isFinite(seasonProductionMultiplier(season, good.id))).toBe(true);
      }
    }
  });

  it("actually moves the market: food is scarcer after a winter than an autumn", () => {
    // The whole point of the feature. Run the same town through a full
    // autumn and a full winter and compare what is on the shelves.
    const run = (startDay: number) => {
      let state = { ...initialState(), paused: false, tick: startDay * TICKS_PER_GAME_DAY };
      for (let i = 0; i < SEASON_DAYS * TICKS_PER_GAME_DAY; i++) state = tick(state);
      return state.goods.bread.supply;
    };
    const autumnIdx = SEASONS.findIndex((s) => s.id === "autumn");
    const winterIdx = SEASONS.findIndex((s) => s.id === "winter");
    const afterAutumn = run(autumnIdx * SEASON_DAYS);
    const afterWinter = run(winterIdx * SEASON_DAYS);
    expect(afterWinter).toBeLessThan(afterAutumn);
  });
});
