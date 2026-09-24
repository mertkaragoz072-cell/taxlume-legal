import { STRINGS } from "../../i18n/strings";
import { t } from "../../i18n/t";
import { ONBOARDING_STEPS, ONBOARDING_STEPS_BY_ID, currentOnboardingStep } from "../onboarding";
import { applyOnboarding } from "../progression";
import { initialState } from "../useEconomy";
import { EconomyState } from "../types";

const LANGS = Object.keys(STRINGS) as (keyof typeof STRINGS)[];

function fresh(): EconomyState {
  return initialState();
}

describe("onboarding data", () => {
  it("gives every step a distinct id and indexes it", () => {
    expect(new Set(ONBOARDING_STEPS.map((s) => s.id)).size).toBe(ONBOARDING_STEPS.length);
    for (const step of ONBOARDING_STEPS) expect(ONBOARDING_STEPS_BY_ID[step.id]).toBe(step);
  });

  it("resolves every title and description in both languages", () => {
    // A missing key renders as the key itself, which on a phone looks like
    // "onboarding.buy.title" sitting where the instruction should be.
    for (const step of ONBOARDING_STEPS) {
      for (const lang of LANGS) {
        expect(t(lang, step.titleKey)).not.toBe(step.titleKey);
        expect(t(lang, step.descriptionKey)).not.toBe(step.descriptionKey);
      }
    }
  });

  it("is unfinished on a brand new town, with the first step showing", () => {
    const state = fresh();
    expect(state.onboardingStep).toBe(0);
    expect(currentOnboardingStep(state)?.id).toBe("buy");
    for (const step of ONBOARDING_STEPS) expect(step.isDone(state)).toBe(false);
  });

  it("pays a reward worth having without paying the game for the player", () => {
    const total = ONBOARDING_STEPS.reduce((sum, s) => sum + s.reward, 0);
    expect(total).toBeGreaterThan(0);
    // The fourth step alone asks for 500 net worth, so the whole run of
    // rewards must not add up to a shortcut past it.
    expect(total).toBeLessThan(500);
  });
});

describe("applyOnboarding", () => {
  it("does nothing while the current step is unmet", () => {
    const state = fresh();
    expect(applyOnboarding(state)).toBe(state);
  });

  it("advances one step and pays its reward", () => {
    const state: EconomyState = { ...fresh(), stats: { ...fresh().stats, totalTrades: 1 } };
    const next = applyOnboarding(state);

    expect(next.onboardingStep).toBe(1);
    expect(next.cash).toBe(state.cash + ONBOARDING_STEPS[0].reward);
    expect(next.lastEvent?.tone).toBe("good");
  });

  it("advances past several steps when one action finishes more than one", () => {
    // The sale that first turns a profit can also be the one that carries
    // the town past the trade-unlock threshold.
    const base = fresh();
    const state: EconomyState = {
      ...base,
      stats: { ...base.stats, totalTrades: 4, totalRealizedProfit: 120 },
      taxRate: 0.1,
      tradeUnlocked: true,
    };
    const next = applyOnboarding(state);

    expect(next.onboardingStep).toBe(4);
    const paid = ONBOARDING_STEPS.slice(0, 4).reduce((sum, s) => sum + s.reward, 0);
    expect(next.cash).toBe(state.cash + paid);
  });

  it("stops at the end and never pays twice", () => {
    const base = fresh();
    const finished: EconomyState = {
      ...base,
      onboardingStep: ONBOARDING_STEPS.length,
      stats: { ...base.stats, totalTrades: 99 },
    };
    expect(applyOnboarding(finished)).toBe(finished);
    expect(currentOnboardingStep(finished)).toBeNull();
  });

  it("does not rewind when a step's condition stops holding", () => {
    // Every predicate reads a lifetime counter or a sticky flag for this
    // reason; a daily counter would un-finish a step at midnight.
    const base = fresh();
    const afterFirst = applyOnboarding({ ...base, stats: { ...base.stats, totalTrades: 1 } });
    const laterWithoutTrades = applyOnboarding({ ...afterFirst, stats: { ...base.stats, totalTrades: 0 } });

    expect(laterWithoutTrades.onboardingStep).toBe(1);
  });
});
