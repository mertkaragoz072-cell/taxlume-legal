import { t, tPlural } from "../t";

describe("t", () => {
  it("resolves a dot path and interpolates", () => {
    expect(t("en", "trade.turnsLeft", { n: 5 })).toBe("5 days left");
    expect(t("tr", "trade.turnsLeft", { n: 5 })).toBe("5 gün kaldı");
  });

  it("returns the key itself when nothing resolves, rather than throwing", () => {
    expect(t("en", "nope.not.a.key")).toBe("nope.not.a.key");
  });
});

describe("tPlural", () => {
  it("uses the singular in English only for exactly one", () => {
    expect(tPlural("en", "trade.turnsLeft", 1, { n: 1 })).toBe("1 day left");
    expect(tPlural("en", "trade.turnsLeft", 3, { n: 3 })).toBe("3 days left");
  });

  it("keeps the plural at zero — English says '0 days left'", () => {
    expect(tPlural("en", "trade.turnsLeft", 0, { n: 0 })).toBe("0 days left");
  });

  it("leaves Turkish uninflected, since a numeral already marks the plural", () => {
    expect(tPlural("tr", "trade.turnsLeft", 1, { n: 1 })).toBe("1 gün kaldı");
    expect(tPlural("tr", "trade.turnsLeft", 3, { n: 3 })).toBe("3 gün kaldı");
  });

  it("handles a bare unit with no count inside it", () => {
    expect(tPlural("en", "crisis.daysUnit", 1)).toBe("day");
    expect(tPlural("en", "crisis.daysUnit", 2)).toBe("days");
  });
});
