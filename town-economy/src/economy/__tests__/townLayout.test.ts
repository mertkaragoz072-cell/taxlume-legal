import {
  autoLayout,
  builtBuildings,
  layoutHappinessBonus,
  layoutOf,
  PLACED_HAPPINESS,
  PLACED_HAPPINESS_MAX,
  placeBuilding,
  plotCount,
  PLOT_BASE,
  PLOT_MAX,
  unplacedBuildings,
} from "../townLayout";
import { EconomyState } from "../types";
import { initialState } from "../useEconomy";

const town = (over: Partial<EconomyState> = {}): EconomyState => ({
  ...initialState(),
  upgrades: { ...initialState().upgrades, market: 2, bank: 1 },
  ownedProperties: ["house", "farm"],
  ...over,
});

describe("town plan", () => {
  it("has six plots to begin with and one more per rank, up to twelve", () => {
    expect(plotCount(0)).toBe(PLOT_BASE);
    expect(plotCount(3)).toBe(PLOT_BASE + 3);
    expect(plotCount(50)).toBe(PLOT_MAX);
  });

  it("lists what has been built: upgrades bought and properties owned", () => {
    expect(builtBuildings(town()).sort()).toEqual(["bank", "farm", "house", "market"].sort());
    expect(builtBuildings(initialState())).toEqual([]);
  });

  it("places a building, moves it, and empties a plot", () => {
    let s = town();
    s = placeBuilding(s, 0, "market");
    expect(layoutOf(s)[0]).toBe("market");
    s = placeBuilding(s, 3, "market"); // moved, not copied
    expect(layoutOf(s)[0]).toBeNull();
    expect(layoutOf(s)[3]).toBe("market");
    s = placeBuilding(s, 3, null);
    expect(layoutOf(s)[3]).toBeNull();
    expect(unplacedBuildings(s)).toContain("market");
  });

  it("refuses plots the town does not have and buildings it has not built", () => {
    const s = town();
    expect(placeBuilding(s, PLOT_BASE, "market")).toBe(s);
    expect(placeBuilding(s, 0, "mansion")).toBe(s);
  });

  it("arranges everything built into the empty plots", () => {
    const s = autoLayout(town());
    expect(unplacedBuildings(s)).toEqual([]);
    expect(layoutOf(s).filter(Boolean)).toHaveLength(4);
  });

  it("adds a little beauty per placed building, capped", () => {
    let s = town();
    expect(layoutHappinessBonus(s)).toBe(0);
    s = placeBuilding(s, 0, "market");
    expect(layoutHappinessBonus(s)).toBe(PLACED_HAPPINESS);
    const big = autoLayout({
      ...town(),
      townRankIndex: 8,
      upgrades: {
        market: 1,
        caravanserai: 1,
        townhall: 1,
        bank: 1,
        guardTower: 1,
        earthquakeFund: 1,
        storageYard: 1,
      },
      ownedProperties: ["landPlot", "house", "warehouse", "farm", "inn", "mansion"],
    });
    expect(layoutHappinessBonus(big)).toBe(PLACED_HAPPINESS_MAX);
  });

  it("stops counting a building that is no longer built", () => {
    let s = placeBuilding(town(), 0, "market");
    s = { ...s, upgrades: { ...s.upgrades, market: 0 } };
    expect(layoutHappinessBonus(s)).toBe(0);
  });
});
