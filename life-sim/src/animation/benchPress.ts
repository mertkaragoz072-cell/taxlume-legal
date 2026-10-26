import { easeInOut, lerp } from '../core/math';
import { BODY, lerpPose, shoulderOf, type Pose, type StickmanRig, type V2 } from '../character/rig';
import { BENCH } from '../world/gymScene';
import type { Barbell } from '../world/props';

type Seg = { dur: number; fn: (t: number) => void; done?: () => void };

/** What actually happened during one animated repetition. Only a full cycle may be counted. */
export interface RepReport {
  /** The bar touched the chest. */
  chestReached: boolean;
  /** The arms returned to lockout at the top. */
  lockout: boolean;
}

export type RepResult = 'success' | 'failed';

const FLOOR_Y = 0.065; // ankle height: shoe radius resting on the floor
/** Feet stay planted at the same spot in every pose, so they never slide during transitions. */
const FOOT_NEAR: V2 = [0.95, FLOOR_Y];
const FOOT_FAR: V2 = [0.85, FLOOR_Y];
/** Hands resting on the thighs when seated (relative to the shoulder). */
const SIT_HAND: V2 = [0.25, -0.35];
/** Arc control for the hands while reaching: forward and slightly up, clear of the torso. */
const REACH_CTRL: V2 = [0.45, 0.1];
/** While resting the head turns toward the viewer (the body faces along the bench, away from the camera). */
const SIT_HEAD_YAW = 1.15;
const LIE_HEAD_TILT = 0.75;
const ARM_REACH = BODY.upperArm + BODY.foreArm;

const smooth = (t: number): number => easeInOut(Math.min(1, Math.max(0, t)));
const bez = (a: V2, c: V2, b: V2, t: number): V2 => {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
};

/**
 * Drives the stickman through a bench-press cycle: sit → lie back → unrack → reps
 * (lower, pause on chest, press) → rerack → sit. All poses live in station-local
 * coordinates. Hands are shoulder-relative IK targets derived from the bar position,
 * so they cannot detach; feet are fixed; the torso rests on the pad using the live
 * muscle-dependent torso radius so it never sinks into it.
 */
export class BenchPressAnimator {
  private queue: Seg[] = [];
  private cur: Seg | null = null;
  private t = 0;
  private bar: V2;
  private holding = false;
  private stance: 'sit' | 'lie' = 'sit';
  private clock = 0;
  private barFrom: V2;

  constructor(
    private rig: StickmanRig,
    private barbell: Barbell,
  ) {
    this.bar = this.hook();
    this.barFrom = this.lockout();
    this.syncBar();
    this.rig.applyPose(this.sitPose());
  }

  get busy(): boolean {
    return this.cur !== null || this.queue.length > 0;
  }
  get isLying(): boolean {
    return this.stance === 'lie';
  }
  get barPosition(): V2 {
    return [this.bar[0], this.bar[1]];
  }

  setLoad(kg: number): void {
    this.barbell.setLoad(kg);
  }

  // ----- Geometry anchors (depend on the current physique) -----

  private seatY(): number {
    return BENCH.padTop + this.rig.torsoRadius + 0.012;
  }
  private hook(): V2 {
    return [BENCH.rackX + 0.04, BENCH.hookY];
  }
  private lockout(): V2 {
    const [sx, sy] = shoulderOf(this.lyingBase());
    return [sx + 0.02, sy + ARM_REACH * 0.93];
  }
  private chest(): V2 {
    return [BENCH.pelvisX - 0.36, BENCH.padTop + 2 * this.rig.torsoRadius + 0.03];
  }

  private lyingBase(): Pose {
    const tr = this.rig.torsoRadius;
    return {
      pelvis: [BENCH.pelvisX, this.seatY()],
      torso: Math.PI / 2,
      // chin tilted back toward the camera so the face stays readable
      head: LIE_HEAD_TILT,
      headLift: BODY.headR - tr + 0.005,
      handNear: [0, 0],
      handFar: [0, 0],
      footNear: FOOT_NEAR,
      footFar: FOOT_FAR,
      elbowBend: -1,
      kneeBend: 1,
    };
  }

  /** Lying with both hands gripping the bar at `bar` (strain tilts the head slightly). */
  private lyingPose(bar: V2, strain = 0): Pose {
    const p = this.lyingBase();
    const sh = shoulderOf(p);
    const rel: V2 = [bar[0] - sh[0], bar[1] - sh[1]];
    return { ...p, head: p.head + strain * 0.08, handNear: rel, handFar: rel };
  }

  private sitPose(): Pose {
    return {
      pelvis: [0.58, this.seatY()],
      torso: 0.06,
      head: 0,
      headLift: 0,
      headYaw: SIT_HEAD_YAW,
      handNear: SIT_HAND,
      handFar: [SIT_HAND[0] - 0.04, SIT_HAND[1] + 0.02],
      footNear: FOOT_NEAR,
      footFar: FOOT_FAR,
      elbowBend: -1,
      kneeBend: 1,
    };
  }

  /** Blend seated ↔ lying: body eases smoothly, hands arc out over the chest toward the bar. */
  private transitionPose(t: number, toLying: boolean): Pose {
    const sit = this.sitPose();
    const lie = this.lyingPose(this.hook());
    const a = toLying ? sit : lie;
    const b = toLying ? lie : sit;
    const body = lerpPose(a, b, smooth(t));
    const handT = smooth((t - 0.08) / 0.92);
    const hand = bez(a.handNear, REACH_CTRL, b.handNear, handT);
    const handFar = bez(a.handFar, REACH_CTRL, b.handFar, handT);
    return { ...body, handNear: hand, handFar };
  }

  private syncBar(): void {
    this.barbell.position.set(this.bar[0], this.bar[1], 0);
  }

  private play(segs: Seg[]): Promise<void> {
    return new Promise((resolve) => {
      const last = segs[segs.length - 1]!;
      const prev = last.done;
      last.done = () => {
        prev?.();
        resolve();
      };
      this.queue.push(...segs);
    });
  }

  private moveBar(from: V2, to: V2, e: number, lift = 0): void {
    this.bar = [lerp(from[0], to[0], e), lerp(from[1], to[1], e) + Math.sin(e * Math.PI) * lift];
    this.syncBar();
    this.rig.applyPose(this.lyingPose(this.bar));
  }

  /** Lie back and take the bar off the hooks. */
  async prepareSet(): Promise<void> {
    if (this.stance === 'lie' && this.holding) return;
    const list: Seg[] = [];
    if (this.stance === 'sit') {
      list.push({
        dur: 2.2,
        fn: (t) => this.rig.applyPose(this.transitionPose(t, true)),
        done: () => (this.stance = 'lie'),
      });
    }
    this.bar = this.hook();
    this.syncBar();
    list.push({
      dur: 0.8,
      fn: (t) => {
        this.holding = true;
        this.moveBar(this.hook(), this.lockout(), easeInOut(t), 0.03);
      },
    });
    await this.play(list);
  }

  /** Put the bar back and sit up (rest period). */
  async finishSet(): Promise<void> {
    if (this.stance === 'sit') return;
    this.barFrom = [...this.bar];
    await this.play([
      {
        dur: 0.8,
        fn: (t) => this.moveBar(this.barFrom, this.hook(), easeInOut(t)),
        done: () => (this.holding = false),
      },
      {
        dur: 2.0,
        fn: (t) => this.rig.applyPose(this.transitionPose(t, false)),
        done: () => (this.stance = 'sit'),
      },
    ]);
  }

  /**
   * One repetition: lower to the chest, pause, press. A `failed` rep stalls partway
   * up and sinks back (the bar is re-racked after the set). Resolves with what
   * physically happened so the caller can count only full, valid cycles.
   */
  playRep(result: RepResult, speed = 1): Promise<RepReport> {
    let minH = 1;
    let finalH = 1;
    const rep: Seg = {
      dur: 3.2 / speed,
      fn: (u) => {
        let h: number;
        let strain = 0;
        if (u < 0.38) h = 1 - easeInOut(u / 0.38);
        else if (u < 0.5) h = 0;
        else {
          const p = (u - 0.5) / 0.5;
          if (result === 'success') {
            h = easeInOut(p);
            strain = Math.sin(p * Math.PI);
          } else {
            const rise = easeInOut(Math.min(1, p / 0.55)) * 0.28;
            const sink = p > 0.75 ? (p - 0.75) / 0.25 : 0;
            h = rise * (1 - sink * 0.9) + (p > 0.5 && p < 0.78 ? Math.sin(p * 55) * 0.012 : 0);
            strain = 1 + Math.sin(p * 60) * 0.3;
          }
        }
        minH = Math.min(minH, h);
        finalH = h;
        const c = this.chest();
        const l = this.lockout();
        this.bar = [lerp(c[0], l[0], h), lerp(c[1], l[1], h)];
        this.syncBar();
        this.rig.applyPose(this.lyingPose(this.bar, strain));
      },
    };
    return this.play([rep]).then(() => ({ chestReached: minH <= 0.002, lockout: finalH >= 0.998 }));
  }

  /** Per-frame update; also idle breathing. */
  update(dt: number): void {
    this.clock += dt;
    if (!this.cur) {
      this.cur = this.queue.shift() ?? null;
      this.t = 0;
    }
    if (this.cur) {
      this.t += dt;
      const u = Math.min(1, this.t / this.cur.dur);
      this.cur.fn(u);
      if (u >= 1) {
        const done = this.cur.done;
        this.cur = null;
        done?.();
      }
    } else {
      this.idle();
    }
  }

  private idle(): void {
    const b = Math.sin(this.clock * 2.1) * 0.006;
    if (this.stance === 'sit') {
      const p = this.sitPose();
      this.rig.applyPose({ ...p, torso: p.torso + b * 2, head: Math.sin(this.clock * 0.7) * 0.04, headYaw: SIT_HEAD_YAW + Math.sin(this.clock * 0.5) * 0.1 });
    } else {
      // Breathe with the head only: moving the shoulders without the bar would detach the hands.
      this.rig.applyPose(this.lyingPose(this.bar, b * 8));
    }
  }

  /** Skip all queued animation instantly (used when leaving the scene). */
  flush(): void {
    const pending = [...(this.cur ? [this.cur] : []), ...this.queue];
    this.queue = [];
    this.cur = null;
    pending.forEach((s) => s.done?.());
  }
}
