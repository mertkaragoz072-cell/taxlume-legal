import { BODY, type V2 } from '../character/rig';

/**
 * Incline bench-press geometry in station-local metres (x along the bench: head toward −x, feet toward +x;
 * y up). Shared by the bench model, the rack and the animation so they can never disagree.
 *
 * The lifter sits on the seat and leans back against an inclined pad. The pad is a fixed plane; the torso axis
 * is always placed exactly one torso-radius in front of it, so every physique rests on it without clipping.
 */
export const BENCH = {
  seatTop: 0.45,
  /** Torso angle from upright (rad). 0.75 ≈ a 47° incline above horizontal — the reference pose. */
  incline: 0.75,
  /** Torso radius the pad was modelled for. */
  refTorsoR: 0.125,
  /** Seat-contact allowance (pelvis centre above seat = torso radius + this). */
  seatGap: 0.012,
  /** Along-torso distance from the pelvis to where the bar touches the chest. */
  chestAlong: 0.4,
  /** Fraction of full arm length used at lockout (leaves a margin so IK never over-extends). */
  lockoutReach: 0.9,
} as const;

/** Unit vector along the spine toward the head, and the unit normal pointing out of the chest. */
export const SPINE_U: V2 = [-Math.sin(BENCH.incline), Math.cos(BENCH.incline)];
export const SPINE_N: V2 = [Math.cos(BENCH.incline), Math.sin(BENCH.incline)];

const ARM_REACH = BODY.upperArm + BODY.foreArm;
const SHOULDER_ALONG = BODY.torso - 0.02;

/** Pelvis centre for a torso radius: on the seat, and exactly r in front of the pad plane. */
export function pelvisFor(r: number): V2 {
  const refY = BENCH.seatTop + BENCH.refTorsoR + BENCH.seatGap;
  const planeD = 0 * SPINE_N[0] + refY * SPINE_N[1] - BENCH.refTorsoR; // plane: p·N = D
  const y = BENCH.seatTop + r + BENCH.seatGap;
  const x = (r + planeD - y * SPINE_N[1]) / SPINE_N[0];
  return [x, y];
}

export function shoulderFor(r: number): V2 {
  const p = pelvisFor(r);
  return [p[0] + SPINE_U[0] * SHOULDER_ALONG, p[1] + SPINE_U[1] * SHOULDER_ALONG];
}

/** Bar position when it touches the chest. */
export function chestFor(r: number): V2 {
  const p = pelvisFor(r);
  return [p[0] + SPINE_U[0] * BENCH.chestAlong + SPINE_N[0] * (r + 0.03), p[1] + SPINE_U[1] * BENCH.chestAlong + SPINE_N[1] * (r + 0.03)];
}

/** Bar position at lockout: straight above the chest touch point (a vertical bar path). */
export function lockoutFor(r: number): V2 {
  const c = chestFor(r);
  const s = shoulderFor(r);
  const reach = ARM_REACH * BENCH.lockoutReach;
  const dx = c[0] - s[0];
  return [c[0], s[1] + Math.sqrt(Math.max(0, reach * reach - dx * dx))];
}

/** Rack hooks: just above and slightly head-ward of lockout, for the reference physique. */
export const HOOK: V2 = (() => {
  const l = lockoutFor(BENCH.refTorsoR);
  return [l[0] - 0.08, l[1] + 0.03];
})();

/** Rack uprights stand just behind the hooks (hooks stick out toward +x). */
export const RACK_X = HOOK[0] - 0.06;

/** Centre and size of the back pad (box along the spine). */
export function backPad(): { center: V2; length: number; thickness: number } {
  const p = pelvisFor(BENCH.refTorsoR);
  const length = 0.8;
  const thickness = 0.1;
  const along = 0.36;
  const off = BENCH.refTorsoR + thickness / 2;
  return { center: [p[0] + SPINE_U[0] * along - SPINE_N[0] * off, p[1] + SPINE_U[1] * along - SPINE_N[1] * off], length, thickness };
}
