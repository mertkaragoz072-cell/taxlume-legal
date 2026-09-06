import { isoWeekKey, weeklyChallengeTemplateForWeek, WEEKLY_CHALLENGE_TEMPLATES } from "../weeklyChallenges";

describe("isoWeekKey", () => {
  it("returns the same week key for two dates in the same ISO week", () => {
    // Monday and Wednesday of the same week
    expect(isoWeekKey("2026-01-05")).toBe(isoWeekKey("2026-01-07"));
  });

  it("returns a different week key across a week boundary", () => {
    expect(isoWeekKey("2026-01-04")).not.toBe(isoWeekKey("2026-01-05"));
  });

  it("formats as YYYY-Www", () => {
    expect(isoWeekKey("2026-01-05")).toMatch(/^\d{4}-W\d{2}$/);
  });
});

describe("weeklyChallengeTemplateForWeek", () => {
  it("is deterministic for the same week key", () => {
    const a = weeklyChallengeTemplateForWeek("2026-W02");
    const b = weeklyChallengeTemplateForWeek("2026-W02");
    expect(a.id).toBe(b.id);
  });

  it("always returns one of the known templates", () => {
    const ids = new Set(WEEKLY_CHALLENGE_TEMPLATES.map((t) => t.id));
    for (let i = 1; i <= 52; i++) {
      const key = `2026-W${String(i).padStart(2, "0")}`;
      expect(ids.has(weeklyChallengeTemplateForWeek(key).id)).toBe(true);
    }
  });
});
