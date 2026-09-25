import { ScreenId } from "../components/TabBar";
import { SpotlightId } from "../components/Spotlight";
import { EconomyState } from "./types";

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
  /** a control to cut a lit hole over while everything else goes dark and
   * inert (see Spotlight.tsx). */
  spotlight?: SpotlightId;
  /** when set, the beat is a thing to *do*, not to read: the Continue
   * button is withheld and the tour moves on by itself the moment this
   * comes back true. Must read only state that cannot go backwards, so a
   * player who is already past it is never held. */
  isDone?: (state: EconomyState) => boolean;
}

/** Merve's walk-through: the first two minutes of a new town, led by a
 * person instead of a slide deck.
 *
 * Three things each beat is written to. Say where a thing is and what the
 * player does with it, then get out of the way — she is standing on the
 * screen she is talking about, so nothing has to describe what anything
 * looks like. Where there is something to press, dim the rest of the game
 * and let them press it, rather than describing the press. And say plainly
 * how a run ends, because a player who does not know what loses cannot be
 * said to be playing yet.
 *
 * It stops at the handover to the guided steps rather than touring the
 * whole game. Research, investing, caravans and prestige are all still
 * locked here; a tour of screens the player cannot open was the thing this
 * replaced.
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
    id: "buy",
    titleKey: "mentor.buyTitle",
    textKey: "mentor.buy",
    tipKey: "mentor.buyTip",
    screen: "market",
    spotlight: "buy",
    // Lifetime count, so a player who somehow already traded walks straight
    // through instead of being asked to do it again.
    isDone: (state) => state.stats.totalTrades > 0,
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
    spotlight: "inflation",
  },
  {
    id: "lose",
    titleKey: "mentor.loseTitle",
    textKey: "mentor.lose",
    tipKey: "mentor.loseTip",
    spotlight: "inflation",
  },
  {
    id: "tax",
    titleKey: "mentor.taxTitle",
    textKey: "mentor.tax",
    tipKey: "mentor.taxTip",
    screen: "town",
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
