import { ASSETS } from "../assets";

describe("investment assets", () => {
  it("has unique ids and sane parameters", () => {
    expect(new Set(ASSETS.map((a) => a.id)).size).toBe(ASSETS.length);
    expect(ASSETS.length).toBeGreaterThanOrEqual(8);
    for (const a of ASSETS) {
      expect(a.basePrice).toBeGreaterThan(0);
      expect(a.volatility).toBeGreaterThan(0);
    }
  });
  it("bond is the calmest and crypto the wildest", () => {
    const vol = (id: string) => ASSETS.find((a) => a.id === id)!.volatility;
    expect(vol("bond")).toBe(Math.min(...ASSETS.map((a) => a.volatility)));
    expect(vol("crypto")).toBe(Math.max(...ASSETS.map((a) => a.volatility)));
  });
});
