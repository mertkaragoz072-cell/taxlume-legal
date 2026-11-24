import { STRINGS } from "../../i18n/strings";
import { DECISION_TEMPLATES, DECISION_TEMPLATES_BY_ID, ERA_DECISION_TEMPLATES } from "../decisions";
import { eraChapterNumber, eraDecreeId, eraForRank, ERAS } from "../eras";
import { applyTownRankUp } from "../progression";
import { UPGRADES_BY_ID } from "../upgrades";
import { initialState } from "../useEconomy";

function lookup(lang: "tr" | "en", key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], STRINGS[lang]);
}

describe("eras", () => {
  it("has a title, story and two headlines in both languages for every era", () => {
    for (const era of ERAS) {
      for (const lang of ["tr", "en"] as const) {
        for (const key of [
          `era.${era.key}.title`,
          `era.${era.key}.story`,
          `townChatter.era.${era.key}.v0`,
          `townChatter.era.${era.key}.v1`,
        ]) {
          expect(typeof lookup(lang, key)).toBe("string");
        }
      }
    }
  });

  it("gives every charter its texts and hints in both languages", () => {
    for (const era of ERAS) {
      if (!era.decree) continue;
      const tpl = DECISION_TEMPLATES_BY_ID[`era_${era.key}`];
      expect(tpl).toBeDefined();
      for (const lang of ["tr", "en"] as const) {
        for (const key of [
          tpl.titleKey,
          tpl.descriptionKey,
          ...tpl.options.flatMap((o) => [o.labelKey, o.hintKey]),
        ]) {
          expect(typeof lookup(lang, key)).toBe("string");
        }
      }
    }
  });

  it("keeps charters out of the random decision pool", () => {
    expect(DECISION_TEMPLATES.some((d) => d.id.startsWith("era_"))).toBe(false);
    expect(ERA_DECISION_TEMPLATES.length).toBe(ERAS.length - 1);
  });

  it("numbers chapters from one and stays in the last era forever", () => {
    expect(eraChapterNumber(0)).toBe(1);
    expect(eraChapterNumber(4)).toBe(5);
    expect(eraForRank(99).key).toBe(ERAS[ERAS.length - 1].key);
    expect(eraDecreeId(0)).toBeNull();
    expect(eraDecreeId(1)).toBe("era_town");
  });

  it("hands the player the new era's charter on promotion, replacing a routine decision", () => {
    const base = {
      ...initialState(),
      cash: 1500,
      pendingDecision: { id: 1, templateId: "tax_amnesty", triggeredAtTick: 0 },
    };
    const next = applyTownRankUp(base);
    expect(next.townRankIndex).toBe(1);
    expect(next.pendingDecision?.templateId).toBe("era_town");
    expect(next.merveRankUp).not.toBeNull();
  });

  it("signing a charter clears the decision and applies its effect", () => {
    const base = applyTownRankUp({ ...initialState(), cash: 1500 });
    const tpl = DECISION_TEMPLATES_BY_ID.era_town;
    const upgraded = tpl.resolve(base, "a");
    expect(upgraded.pendingDecision).toBeNull();
    expect(upgraded.upgrades.market).toBe(base.upgrades.market + 1);
    const feast = tpl.resolve(base, "b");
    expect(feast.happiness).toBeGreaterThanOrEqual(base.happiness);
    expect(feast.cash).toBeGreaterThan(base.cash);
  });

  it("pays cash instead when the free upgrade is already at its peak", () => {
    const base = applyTownRankUp({ ...initialState(), cash: 1500 });
    const maxed = { ...base, upgrades: { ...base.upgrades, market: UPGRADES_BY_ID.market.maxLevel } };
    const after = DECISION_TEMPLATES_BY_ID.era_town.resolve(maxed, "a");
    expect(after.upgrades.market).toBe(UPGRADES_BY_ID.market.maxLevel);
    expect(after.cash).toBeGreaterThan(maxed.cash);
  });

  it("every charter option resolves cleanly in every era", () => {
    for (const tpl of ERA_DECISION_TEMPLATES) {
      for (const opt of tpl.options) {
        const s = {
          ...initialState(),
          townRankIndex: 6,
          pendingDecision: { id: 9, templateId: tpl.id, triggeredAtTick: 0 },
        };
        const after = tpl.resolve(s, opt.id);
        expect(after.pendingDecision).toBeNull();
        expect(Number.isFinite(after.cash)).toBe(true);
      }
    }
  });
});
