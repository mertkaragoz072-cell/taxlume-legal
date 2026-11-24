import { hallOutputBonus, hallStorageBonus } from "../guildPerks";
import { storageCapacity } from "../formulas";
import { HALL_PROJECTS } from "../../guild/types";
import { initialState } from "../useEconomy";

describe("guild hall bonuses", () => {
  it("add up building by building, and nothing without a guild", () => {
    expect(hallStorageBonus(undefined)).toBe(0);
    expect(hallOutputBonus(0)).toBe(0);
    expect(hallStorageBonus(1)).toBe(80);
    expect(hallOutputBonus(2)).toBeCloseTo(0.005);
    expect(hallStorageBonus(99)).toBe(80 + 160 + 240);
    expect(hallOutputBonus(99)).toBeCloseTo(0.005 + 0.005 + 0.01 + 0.015);
  });

  it("match the numbers the hall screen shows", () => {
    for (let n = 1; n <= HALL_PROJECTS.length; n++) {
      const storage = HALL_PROJECTS.slice(0, n).reduce((a, p) => a + p.storage, 0);
      const output = HALL_PROJECTS.slice(0, n).reduce((a, p) => a + p.output, 0);
      expect(hallStorageBonus(n)).toBe(storage);
      expect(hallOutputBonus(n)).toBeCloseTo(output);
    }
  });

  it("buildings give every member's warehouse more room", () => {
    const s = initialState();
    expect(storageCapacity({ ...s, guildProjects: 3 })).toBe(storageCapacity(s) + 240);
  });
});
