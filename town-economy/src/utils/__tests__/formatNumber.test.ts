import { formatCoins, formatCompactNumber, formatNumber } from "../formatNumber";

describe("formatNumber", () => {
  it("groups thousands with a dot and uses a comma decimal in Turkish", () => {
    expect(formatNumber(1234567.8, "tr")).toBe("1.234.567,8");
  });

  it("groups thousands with a comma and uses a dot decimal in English", () => {
    expect(formatNumber(1234567.8, "en")).toBe("1,234,567.8");
  });

  it("does not add a separator below 1000", () => {
    expect(formatNumber(999.5, "tr")).toBe("999,5");
    expect(formatNumber(999.5, "en")).toBe("999.5");
  });

  it("preserves the negative sign", () => {
    expect(formatNumber(-2500, "en", 0)).toBe("-2,500");
    expect(formatNumber(-2500, "tr", 0)).toBe("-2.500");
  });

  it("respects the decimals argument", () => {
    expect(formatNumber(1000, "en", 0)).toBe("1,000");
    expect(formatNumber(1000, "en", 2)).toBe("1,000.00");
  });
});

describe("formatCompactNumber", () => {
  it("matches formatNumber below 1000", () => {
    expect(formatCompactNumber(999.5, "en")).toBe("999.5");
    expect(formatCompactNumber(270, "tr")).toBe("270,0");
  });

  it("abbreviates thousands, millions, billions and trillions with K/M/B/T", () => {
    expect(formatCompactNumber(1500, "en")).toBe("1.5K");
    expect(formatCompactNumber(1500000, "en")).toBe("1.5M");
    expect(formatCompactNumber(2300000000, "en")).toBe("2.3B");
    expect(formatCompactNumber(4200000000000, "en")).toBe("4.2T");
  });

  it("uses a comma decimal in Turkish, same suffix letters", () => {
    expect(formatCompactNumber(1500000, "tr")).toBe("1,5M");
  });

  it("drops a trailing .0 for a whole-number multiple", () => {
    expect(formatCompactNumber(2000000, "en")).toBe("2M");
  });

  it("preserves the negative sign on a compacted value", () => {
    expect(formatCompactNumber(-1500000, "en")).toBe("-1.5M");
  });

  it("bumps to the next suffix instead of rounding to 1000 of the current one", () => {
    // 999,950 rounds to 1000.0K at the K tier — should promote to 1.0M instead.
    expect(formatCompactNumber(999950, "en")).toBe("1M");
  });
});

describe("formatCoins", () => {
  it("appends the coin emoji to a formatted number", () => {
    expect(formatCoins(500, "en")).toBe("500.0 🪙");
    expect(formatCoins(500, "tr")).toBe("500,0 🪙");
  });

  it("compacts a large balance instead of showing every digit", () => {
    expect(formatCoins(1500000, "en")).toBe("1.5M 🪙");
    expect(formatCoins(1500000, "tr")).toBe("1,5M 🪙");
  });
});
