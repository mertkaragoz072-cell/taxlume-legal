import { ScreenId } from "../components/TabBar";

export interface MentorStep {
  id: string;
  /** the one-or-two word subject of this beat, so a player can see what it
   * is about before reading a word of it */
  titleKey: string;
  /** what she says, in the player's language */
  textKey: string;
  /** the single thing to actually do, pulled out of the prose and set apart.
   * Left out of the welcome and wherever there is nothing yet to act on. */
  tipKey?: string;
  /** the tab this beat is about. The tour walks there itself, so the player
   * is looking at the real screen while she describes it — nothing is
   * explained against a picture of the game. Left out when the beat is
   * about the header, which is on every screen anyway. */
  screen?: ScreenId;
}

/** Defne's walk-through: the first two minutes of a new town, led by a
 * person instead of a slide deck.
 *
 * The rule each line is written to: say where a thing is and what the
 * player does with it, then get out of the way. She is standing on the
 * screen she is talking about — the tab is already switched and lit — so
 * none of these has to describe what something looks like.
 *
 * It ends by handing over to the guided steps (see onboarding.ts) rather
 * than trying to cover the whole game. Research, investing, caravans and
 * prestige are all still locked at this point; a tour of screens the
 * player cannot open yet is the thing this replaced.
 */
export const MENTOR_STEPS: MentorStep[] = [
  { id: "greet", titleKey: "mentor.greetTitle", textKey: "mentor.greet" },
  {
    id: "market",
    titleKey: "mentor.marketTitle",
    textKey: "mentor.market",
    tipKey: "mentor.marketTip",
    screen: "market",
  },
  {
    id: "prices",
    titleKey: "mentor.pricesTitle",
    textKey: "mentor.prices",
    tipKey: "mentor.pricesTip",
    screen: "market",
  },
  {
    id: "inventory",
    titleKey: "mentor.inventoryTitle",
    textKey: "mentor.inventory",
    tipKey: "mentor.inventoryTip",
    screen: "inventory",
  },
  {
    id: "inflation",
    titleKey: "mentor.inflationTitle",
    textKey: "mentor.inflation",
    tipKey: "mentor.inflationTip",
  },
  {
    id: "trade",
    titleKey: "mentor.tradeTitle",
    textKey: "mentor.trade",
    tipKey: "mentor.tradeTip",
    screen: "trade",
  },
  {
    id: "handoff",
    titleKey: "mentor.handoffTitle",
    textKey: "mentor.handoff",
    tipKey: "mentor.handoffTip",
    screen: "market",
  },
];

export const MENTOR_DONE = MENTOR_STEPS.length;

export function currentMentorStep(step: number): MentorStep | null {
  return step >= 0 && step < MENTOR_STEPS.length ? MENTOR_STEPS[step] : null;
}
