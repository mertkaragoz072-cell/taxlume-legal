import { DOCTRINES, DOCTRINES_BY_ID, doctrineModifiers, isDoctrineId, NEUTRAL_DOCTRINE } from "../doctrines";

const MODIFIER_KEYS = Object.keys(NEUTRAL_DOCTRINE) as (keyof typeof NEUTRAL_DOCTRINE)[];

describe("doctrine data", () => {
  it("gives every doctrine a distinct id and indexes it", () => {
    expect(new Set(DOCTRINES.map((d) => d.id)).size).toBe(DOCTRINES.length);
    for (const d of DOCTRINES) expect(DOCTRINES_BY_ID[d.id]).toBe(d);
  });

  it("defines every modifier on every doctrine, so nothing falls back silently", () => {
    for (const d of DOCTRINES) {
      for (const key of MODIFIER_KEYS) expect(typeof d[key]).toBe("number");
    }
  });

  it("keeps every modifier positive — a zero would break a price outright", () => {
    for (const d of DOCTRINES) {
      for (const key of MODIFIER_KEYS) expect(d[key]).toBeGreaterThan(0);
    }
  });

  it("makes every doctrine a real trade-off, not a free upgrade", () => {
    // The point of the system: each one has to be worse at something, or the
    // choice is just "pick the strongest".
    for (const d of DOCTRINES) {
      const better = MODIFIER_KEYS.filter((k) => isBetter(k, d[k]));
      const worse = MODIFIER_KEYS.filter((k) => isWorse(k, d[k]));
      expect(better.length).toBeGreaterThan(0);
      expect(worse.length).toBeGreaterThan(0);
    }
  });
});

/** For most modifiers a higher number is better; for costs and travel time it
 * is the other way round. */
const LOWER_IS_BETTER = new Set(["tariffMult", "caravanSpeedMult", "researchCostMult", "loanRateMult"]);
function isBetter(key: string, value: number): boolean {
  return LOWER_IS_BETTER.has(key) ? value < 1 : value > 1;
}
function isWorse(key: string, value: number): boolean {
  return LOWER_IS_BETTER.has(key) ? value > 1 : value < 1;
}

describe("doctrineModifiers", () => {
  it("is fully neutral before a doctrine is chosen", () => {
    const mods = doctrineModifiers(null);
    for (const key of MODIFIER_KEYS) expect(mods[key]).toBe(1);
  });

  it("falls back to neutral for an id it does not recognise", () => {
    const mods = doctrineModifiers("not-a-doctrine");
    for (const key of MODIFIER_KEYS) expect(mods[key]).toBe(1);
  });

  it("returns the chosen doctrine's own numbers", () => {
    const merchants = DOCTRINES_BY_ID.merchants;
    expect(doctrineModifiers("merchants").tariffMult).toBe(merchants.tariffMult);
    expect(doctrineModifiers("merchants").productionMult).toBe(merchants.productionMult);
  });
});

describe("isDoctrineId", () => {
  it("accepts every real id", () => {
    for (const d of DOCTRINES) expect(isDoctrineId(d.id)).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isDoctrineId("merchant")).toBe(false);
    expect(isDoctrineId("")).toBe(false);
    expect(isDoctrineId("toString")).toBe(false);
  });
});
