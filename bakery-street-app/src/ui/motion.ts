// One set of timings and curves for every interface animation, so panels, chips, cards, toasts and scene changes move alike.
import { Easing } from "react-native";

export const MOTION = {
  /** a small piece appearing (chip, toast, hint) */
  enter: 220,
  /** the same piece leaving: a little quicker than it came */
  leave: 140,
  /** a big piece (panel, celebration card) */
  panelEnter: 260,
  panelLeave: 160,
  /** half of a scene change (cover, then uncover) */
  scene: 220,
  /** a value counting or a bar filling */
  count: 320,
  /** a one-off emphasis (badge pop, card flash) */
  pop: 150,
  /** curves: things arrive with a soft overshoot, leave by speeding up, loop smoothly */
  arrive: Easing.out(Easing.back(1.2)),
  depart: Easing.in(Easing.quad),
  settle: Easing.out(Easing.cubic),
  loop: Easing.inOut(Easing.quad),
};
