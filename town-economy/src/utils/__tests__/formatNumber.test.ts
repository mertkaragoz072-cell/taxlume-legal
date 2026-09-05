import { formatCoins, formatNumber } from "../formatNumber";

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

describe("formatCoins", () => {
  it("appends the coin emoji to a formatted number", () => {
    expect(formatCoins(1500, "en")).toBe("1,500.0 🪙");
    expect(formatCoins(1500, "tr")).toBe("1.500,0 🪙");
  });
});
