import { ScreenId } from "../components/TabBar";

export interface MentorStep {
  id: string;
  /** what she says, in the player's language */
  textKey: string;
  /** the tab this beat is about. The tour walks there itself, so the player
   * is looking at the real screen while she describes it — nothing is
   * explained against a picture of the game. Left out when the beat is
   * about the header, which is on every screen anyway. */
  screen?: ScreenId;
  mood: "warm" | "explaining";
}

/** Zeyno's walk-through: the first two minutes of a new town, led by a
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
  { id: "greet", textKey: "mentor.greet", mood: "warm" },
  { id: "market", textKey: "mentor.market", screen: "market", mood: "explaining" },
  { id: "prices", textKey: "mentor.prices", screen: "market", mood: "explaining" },
  { id: "inventory", textKey: "mentor.inventory", screen: "inventory", mood: "explaining" },
  { id: "inflation", textKey: "mentor.inflation", mood: "explaining" },
  { id: "trade", textKey: "mentor.trade", screen: "trade", mood: "explaining" },
  { id: "handoff", textKey: "mentor.handoff", screen: "market", mood: "warm" },
];

export const MENTOR_DONE = MENTOR_STEPS.length;

export function currentMentorStep(step: number): MentorStep | null {
  return step >= 0 && step < MENTOR_STEPS.length ? MENTOR_STEPS[step] : null;
}
