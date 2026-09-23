import {
  CRISIS_LOSS_FLOOR,
  CRISIS_TEMPLATES,
  CRISIS_TEMPLATES_BY_ID,
  CRISIS_WARNING_DAYS,
  crisisAffectedGoodIds,
  crisisSupplyLoss,
  rollCrisisTemplate,
} from "../crises";
import { GOODS } from "../goods";

describe("crisis templates", () => {
  it("gives every template a distinct id", () => {
    expect(new Set(CRISIS_TEMPLATES.map((c) => c.id)).size).toBe(CRISIS_TEMPLATES.length);
  });

  it("indexes every template by id", () => {
    for (const c of CRISIS_TEMPLATES) expect(CRISIS_TEMPLATES_BY_ID[c.id]).toBe(c);
  });

  it("keeps every loss range ordered and within a sane band", () => {
    for (const c of CRISIS_TEMPLATES) {
      expect(c.supplyLossMin).toBeLessThanOrEqual(c.supplyLossMax);
      expect(c.supplyLossMin).toBeGreaterThan(0);
      expect(c.supplyLossMax).toBeLessThan(1);
    }
  });

  it("only names goods that actually exist", () => {
    const ids = new Set(GOODS.map((g) => g.id));
    for (const c of CRISIS_TEMPLATES) {
      for (const id of c.affectedGoods) expect(ids.has(id)).toBe(true);
    }
  });

  it("always rolls a known template", () => {
    const ids = new Set(CRISIS_TEMPLATES.map((c) => c.id));
    for (let i = 0; i < 100; i++) expect(ids.has(rollCrisisTemplate().id)).toBe(true);
  });

  it("warns at least a day ahead, or the warning would be pointless", () => {
    expect(CRISIS_WARNING_DAYS).toBeGreaterThanOrEqual(1);
  });
});

describe("crisisAffectedGoodIds", () => {
  it("treats an empty list as every good", () => {
    const all = crisisAffectedGoodIds(CRISIS_TEMPLATES_BY_ID.earthquake);
    expect(all).toHaveLength(GOODS.length);
  });

  it("returns just the named goods otherwise", () => {
    const drought = CRISIS_TEMPLATES_BY_ID.drought;
    expect(crisisAffectedGoodIds(drought)).toEqual(drought.affectedGoods);
  });
});

describe("crisisSupplyLoss", () => {
  it("stays inside the template's range with no fund", () => {
    const c = CRISIS_TEMPLATES_BY_ID.drought;
    for (let i = 0; i < 200; i++) {
      const loss = crisisSupplyLoss(c, 0);
      expect(loss).toBeGreaterThanOrEqual(c.supplyLossMin);
      expect(loss).toBeLessThanOrEqual(c.supplyLossMax);
    }
  });

  it("lets the fund soften a covered crisis but never past the floor", () => {
    const c = CRISIS_TEMPLATES_BY_ID.earthquake;
    for (let i = 0; i < 200; i++) {
      expect(crisisSupplyLoss(c, 10)).toBe(CRISIS_LOSS_FLOOR);
    }
  });

  it("leaves a crisis the fund does not cover at full strength", () => {
    // The fund insures stores against physical damage, not against unrest.
    const c = CRISIS_TEMPLATES_BY_ID.unrest;
    for (let i = 0; i < 100; i++) {
      expect(crisisSupplyLoss(c, 10)).toBeGreaterThanOrEqual(c.supplyLossMin);
    }
  });
});
