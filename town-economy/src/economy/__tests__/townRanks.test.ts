import {
  TOWN_RANK_TIERS,
  townRankBeyondCount,
  townRankIcon,
  townRankIndexForNetWorth,
  townRankNameKey,
  townRankReward,
  townRankThreshold,
  townRankTitle,
} from "../townRanks";

describe("townRankThreshold", () => {
  it("matches the named tier for every index within the fixed list", () => {
    TOWN_RANK_TIERS.forEach((tier, index) => {
      expect(townRankThreshold(index)).toBe(tier.threshold);
    });
  });

  it("keeps multiplying past the last named tier, forever", () => {
    const lastIndex = TOWN_RANK_TIERS.length - 1;
    const last = townRankThreshold(lastIndex);
    const next = townRankThreshold(lastIndex + 1);
    const farBeyond = townRankThreshold(lastIndex + 10);
    expect(next).toBeGreaterThan(last);
    expect(farBeyond).toBeGreaterThan(next);
  });
});

describe("townRankIndexForNetWorth", () => {
  it("starts everyone at rank 0 for free", () => {
    expect(townRankIndexForNetWorth(0)).toBe(0);
  });

  it("returns the highest tier a net worth qualifies for", () => {
    const tier3 = TOWN_RANK_TIERS[3].threshold;
    const tier4 = TOWN_RANK_TIERS[4].threshold;
    expect(townRankIndexForNetWorth(tier3)).toBe(3);
    expect(townRankIndexForNetWorth(tier4 - 1)).toBe(3);
    expect(townRankIndexForNetWorth(tier4)).toBe(4);
  });

  it("keeps climbing endlessly for absurdly large net worths", () => {
    const lastIndex = TOWN_RANK_TIERS.length - 1;
    const huge = townRankThreshold(lastIndex + 5) + 1;
    expect(townRankIndexForNetWorth(huge)).toBe(lastIndex + 5);
  });
});

describe("townRankReward", () => {
  it("gives no reward for the free starting rank", () => {
    expect(townRankReward(0)).toBe(0);
  });

  it("scales with the tier's threshold", () => {
    expect(townRankReward(5)).toBeCloseTo(TOWN_RANK_TIERS[5].threshold * 0.05, 6);
  });
});

describe("townRankIcon / townRankNameKey / townRankBeyondCount", () => {
  it("repeats the last named tier's icon and name key past the fixed list", () => {
    const lastIndex = TOWN_RANK_TIERS.length - 1;
    expect(townRankIcon(lastIndex + 3)).toBe(TOWN_RANK_TIERS[lastIndex].icon);
    expect(townRankNameKey(lastIndex + 3)).toBe(TOWN_RANK_TIERS[lastIndex].nameKey);
  });

  it("counts 0 for every named tier and increments only beyond it", () => {
    const lastIndex = TOWN_RANK_TIERS.length - 1;
    expect(townRankBeyondCount(lastIndex)).toBe(0);
    expect(townRankBeyondCount(lastIndex + 1)).toBe(1);
    expect(townRankBeyondCount(lastIndex + 4)).toBe(4);
  });
});

describe("townRankTitle", () => {
  const t = (key: string, params?: Record<string, string | number>) => {
    if (key === "townRank.beyondTitle") return `${params!.base} ${params!.n}`;
    if (key === TOWN_RANK_TIERS[0].nameKey) return "Village";
    const lastIndex = TOWN_RANK_TIERS.length - 1;
    if (key === TOWN_RANK_TIERS[lastIndex].nameKey) return "Immortal Legend";
    return key;
  };

  it("renders a named tier plainly", () => {
    expect(townRankTitle(0, t)).toBe("Village");
  });

  it("appends a growing numeral once past the named tiers", () => {
    const lastIndex = TOWN_RANK_TIERS.length - 1;
    expect(townRankTitle(lastIndex, t)).toBe("Immortal Legend");
    expect(townRankTitle(lastIndex + 1, t)).toBe("Immortal Legend 2");
    expect(townRankTitle(lastIndex + 2, t)).toBe("Immortal Legend 3");
  });
});
