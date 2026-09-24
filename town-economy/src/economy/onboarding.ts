import { ScreenId } from "../components/TabBar";
import { EconomyState } from "./types";

/** A guided first session.
 *
 * The game drops a new player into a live market with seven tabs, a price
 * index, auto-trade rules and a tax slider, and the ten-slide tutorial that
 * opens over it is read once and forgotten. Nothing then tells anyone what
 * to do next. This is the missing middle: one small task at a time, each
 * teaching a single mechanic by making the player use it, in the order the
 * game itself unlocks them.
 *
 * Every step is checked against a number that only ever goes up — lifetime
 * stats, sticky unlock flags, a list of owned things. Daily counters would
 * reset at midnight and un-finish a step the player had already done.
 *
 * The rewards are deliberately small. They are a nudge and a bit of
 * punctuation, not a bankroll; the fifth step alone needs the player to grow
 * the town to 500, which no amount of step rewards will do for them.
 */
export interface OnboardingStep {
  id: string;
  icon: string;
  titleKey: string;
  descriptionKey: string;
  reward: number;
  /** where the task is done — the banner points the player at this tab */
  screen: ScreenId;
  isDone: (state: EconomyState) => boolean;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "buy",
    icon: "🛒",
    titleKey: "onboarding.buy.title",
    descriptionKey: "onboarding.buy.description",
    reward: 25,
    screen: "market",
    isDone: (s) => s.stats.totalTrades >= 1,
  },
  {
    // Buying is half a trade. This is the step that teaches what the game is
    // actually about: the price moved, and the difference is the profit.
    id: "profit",
    icon: "💰",
    titleKey: "onboarding.profit.title",
    descriptionKey: "onboarding.profit.description",
    reward: 30,
    screen: "market",
    isDone: (s) => s.stats.totalRealizedProfit > 0,
  },
  {
    id: "tax",
    icon: "🏛️",
    titleKey: "onboarding.tax.title",
    descriptionKey: "onboarding.tax.description",
    reward: 30,
    screen: "town",
    isDone: (s) => s.taxRate > 0,
  },
  {
    // The one step the player cannot shortcut, and the reason the first four
    // are small: reaching 500 is a few minutes of actually playing the
    // market, and it is the game's own gate on the Trade tab.
    id: "networth",
    icon: "📈",
    titleKey: "onboarding.networth.title",
    descriptionKey: "onboarding.networth.description",
    reward: 40,
    screen: "market",
    isDone: (s) => s.tradeUnlocked,
  },
  {
    id: "caravan",
    icon: "🚚",
    titleKey: "onboarding.caravan.title",
    descriptionKey: "onboarding.caravan.description",
    reward: 50,
    screen: "trade",
    isDone: (s) => s.stats.totalCaravansSent >= 1,
  },
  {
    id: "research",
    icon: "🔬",
    titleKey: "onboarding.research.title",
    descriptionKey: "onboarding.research.description",
    reward: 50,
    screen: "research",
    isDone: (s) => s.researched.length >= 1,
  },
  {
    id: "invest",
    icon: "💹",
    titleKey: "onboarding.invest.title",
    descriptionKey: "onboarding.invest.description",
    reward: 50,
    screen: "invest",
    isDone: (s) => Object.values(s.assets).some((a) => a.holding > 0),
  },
  {
    // Ends by handing the player the thing that keeps them coming back, so
    // the guided run stops somewhere useful rather than just stopping.
    id: "quest",
    icon: "🏆",
    titleKey: "onboarding.quest.title",
    descriptionKey: "onboarding.quest.description",
    reward: 60,
    screen: "achievements",
    isDone: (s) => s.dailyQuests.some((q) => q.completed),
  },
];

export const ONBOARDING_STEPS_BY_ID: Record<string, OnboardingStep> = Object.fromEntries(
  ONBOARDING_STEPS.map((s) => [s.id, s])
);

/** The step the player is on, or null once the run is finished. */
export function currentOnboardingStep(state: EconomyState): OnboardingStep | null {
  return ONBOARDING_STEPS[state.onboardingStep] ?? null;
}
