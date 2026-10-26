import { easeInOut, lerp } from '../core/math';
import { BODY, type Pose, type V2 } from './rig';

/**
 * Pose library for everyday activities. All poses are in BODY-LOCAL coordinates: the figure faces +x,
 * x = 0 is the anchor point (where the character stands/sits), y = 0 is the floor. The Actor mirrors and
 * translates the whole figure, so these never need to know about facing or room position.
 */

export const ANKLE = 0.085; // ankle height with the shoe resting on the floor (shoe radius + offset)
const TAU = Math.PI * 2;

const base = (): Pose => ({
  pelvis: [0, 0.905],
  torso: 0,
  head: 0,
  headLift: 0,
  headYaw: 0,
  handNear: [0.04, -0.52],
  handFar: [-0.02, -0.52],
  footNear: [0.08, ANKLE],
  footFar: [-0.08, ANKLE],
  elbowBend: -1,
  kneeBend: 1,
});

export interface PoseCtx {
  /** Torso radius of the current physique (so the body rests ON surfaces). */
  torsoR: number;
  /** Surface height the body rests on (seat or mattress top). */
  surfaceY: number;
}

export const standPose = (t = 0): Pose => {
  const p = base();
  const b = Math.sin(t * 2) * 0.004;
  p.pelvis = [0, 0.905 + b];
  p.head = Math.sin(t * 0.6) * 0.03;
  return p;
};

/** Walk cycle: `phase` in radians; feet swing and lift alternately, arms counter-swing. */
export const walkPose = (phase: number): Pose => {
  const p = base();
  const A = 0.21;
  const swing = (ph: number): V2 => [A * Math.sin(ph), ANKLE + 0.09 * Math.max(0, Math.cos(ph))];
  p.footNear = swing(phase);
  p.footFar = swing(phase + Math.PI);
  p.pelvis = [0, 0.872 + 0.012 * Math.abs(Math.sin(phase))];
  p.torso = 0.05;
  p.handNear = [0.04 - 0.2 * Math.sin(phase), -0.5];
  p.handFar = [0.04 + 0.2 * Math.sin(phase), -0.5];
  p.elbowBend = -1;
  return p;
};

export function sitPose(ctx: PoseCtx, lean = 0.05): Pose {
  const p = base();
  p.pelvis = [0, ctx.surfaceY + ctx.torsoR + 0.025];
  p.torso = lean;
  p.footNear = [0.34, ANKLE];
  p.footFar = [0.27, ANKLE];
  p.handNear = [0.24, -0.34];
  p.handFar = [0.2, -0.36];
  return p;
}

/** Lying on a bed/sofa, head to the left of the anchor, feet to the right. */
export function lyingPose(ctx: PoseCtx, t = 0): Pose {
  const p = base();
  const y = ctx.surfaceY + ctx.torsoR + 0.012;
  p.pelvis = [0.45, y + Math.sin(t * 1.6) * 0.004];
  p.torso = Math.PI / 2;
  p.headLift = BODY.headR - ctx.torsoR + 0.005;
  p.head = 0.1;
  p.footNear = [1.23, ctx.surfaceY + ANKLE];
  p.footFar = [1.15, ctx.surfaceY + ANKLE];
  // arms almost straight beside the body so the elbows rest on the mattress instead of sinking into it
  p.handNear = [0.57, 0.03];
  p.handFar = [0.56, 0.03];
  return p;
}

export type ActionKind = 'idle' | 'sleep' | 'nap' | 'sitRest' | 'tv' | 'eat' | 'cook' | 'shower' | 'drink' | 'type';

/** Pose of an action `t` seconds after the blend-in finished. */
export function actionPose(kind: ActionKind, t: number, ctx: PoseCtx): Pose {
  switch (kind) {
    case 'sleep':
      return lyingPose(ctx, t);
    case 'sitRest':
      return sitPose(ctx);
    case 'nap': {
      const p = sitPose(ctx, 0.38);
      p.head = 0.4 + Math.sin(t * 1.4) * 0.02;
      p.handNear = [0.26, -0.32];
      return p;
    }
    case 'tv': {
      const p = sitPose(ctx, 0.32);
      p.head = 0.04 + Math.sin(t * 0.5) * 0.02;
      p.handNear = [0.26, -0.3];
      return p;
    }
    case 'eat': {
      const p = sitPose(ctx);
      const k = 0.5 - 0.5 * Math.cos(t * TAU * 0.45); // a bite every ~2.2 s
      const lap: V2 = [0.24, -0.34];
      const mouth: V2 = [0.19, 0.2];
      p.handNear = [lerp(lap[0], mouth[0], easeInOut(k)), lerp(lap[1], mouth[1], easeInOut(k))];
      p.head = 0.04 + 0.05 * k;
      return p;
    }
    case 'type': {
      const p = sitPose(ctx, 0.08);
      p.head = -0.08;
      const w = Math.sin(t * 14) * 0.015;
      p.handNear = [0.44, -0.23 + w];
      p.handFar = [0.4, -0.24 - w];
      return p;
    }
    case 'cook': {
      const p = standPose(t);
      p.torso = 0.1;
      p.handNear = [0.38 + Math.cos(t * 4) * 0.05, -0.3 + Math.sin(t * 4) * 0.04];
      p.handFar = [0.3, -0.34];
      return p;
    }
    case 'shower': {
      const p = standPose(t);
      p.head = -0.25;
      const w = Math.sin(t * 6) * 0.04;
      p.handNear = [0.13 + w, 0.3];
      p.handFar = [0.0 - w, 0.32];
      p.elbowBend = -1;
      return p;
    }
    case 'drink': {
      const p = standPose(t);
      const k = 0.5 - 0.5 * Math.cos(t * TAU * 0.5);
      p.handNear = [lerp(0.04, 0.2, easeInOut(k)), lerp(-0.52, 0.2, easeInOut(k))];
      p.head = -0.15 * k;
      return p;
    }
    default:
      return standPose(t);
  }
}

/** Where a kind of action rests the body. */
export const blendTargetPose = (kind: ActionKind, ctx: PoseCtx): Pose => actionPose(kind, 0, ctx);
