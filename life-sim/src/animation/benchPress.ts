import { easeInOut, lerp } from '../core/math';
import { lerpPose, type Pose, type StickmanRig, type V2 } from '../character/rig';
import { BENCH } from '../world/gymScene';
import type { Barbell } from '../world/props';

type Seg = { dur: number; fn: (t: number) => void; done?: () => void };

const HOOK: V2 = [BENCH.rackX + 0.04, BENCH.hookY];
const LOCKOUT: V2 = [-0.13, 1.06];
const CHEST: V2 = [0.0, 0.7];
const FLOOR_Y = 0.045;

/** Seated on the bench edge, hands on knees (idle and rest pose). */
const SIT: Pose = {
  pelvis: [0.58, 0.57],
  torso: 0.06,
  head: 0,
  handNear: [0.84, 0.78],
  handFar: [0.8, 0.76],
  footNear: [1.02, FLOOR_Y],
  footFar: [0.92, FLOOR_Y],
  elbowBend: -1,
  kneeBend: 1,
};

/** Lying on the bench, hands gripping the bar at `bar`. */
function lying(bar: V2, strain = 0): Pose {
  return {
    pelvis: [BENCH.pelvisX, BENCH.padTop + 0.095],
    torso: Math.PI / 2,
    head: -0.05 + strain * 0.08,
    handNear: bar,
    handFar: bar,
    footNear: [0.84 + strain * 0.01, FLOOR_Y],
    footFar: [0.78 + strain * 0.01, FLOOR_Y],
    elbowBend: -1,
    kneeBend: 1,
  };
}

export type RepResult = 'success' | 'failed';

/**
 * Drives the stickman through a full bench-press cycle: sit → lie back →
 * unrack → reps (descend, pause, press) → rerack → sit. Hands are IK-bound to
 * the bar, and the bar position is derived from the same variable, so they
 * cannot drift apart.
 */
export class BenchPressAnimator {
  private queue: Seg[] = [];
  private cur: Seg | null = null;
  private t = 0;
  private bar: V2 = [...HOOK];
  private holding = false;
  private stance: 'sit' | 'lie' = 'sit';
  private clock = 0;

  constructor(
    private rig: StickmanRig,
    private barbell: Barbell,
  ) {
    this.syncBar();
    this.rig.applyPose(SIT);
  }

  get busy(): boolean {
    return this.cur !== null || this.queue.length > 0;
  }
  get isLying(): boolean {
    return this.stance === 'lie';
  }

  setLoad(kg: number): void {
    this.barbell.setLoad(kg);
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

  private segs(): { toLie: Seg; toSit: Seg; unrack: Seg; rerack: Seg } {
    const toLie: Seg = {
      dur: 1.1,
      fn: (t) => {
        this.rig.applyPose(lerpPose(SIT, lying(HOOK), easeInOut(t)));
      },
      done: () => (this.stance = 'lie'),
    };
    const toSit: Seg = {
      dur: 1.1,
      fn: (t) => {
        this.rig.applyPose(lerpPose(lying(HOOK), SIT, easeInOut(t)));
      },
      done: () => (this.stance = 'sit'),
    };
    const unrack: Seg = {
      dur: 0.8,
      fn: (t) => {
        this.holding = true;
        const e = easeInOut(t);
        this.bar = [lerp(HOOK[0], LOCKOUT[0], e), lerp(HOOK[1], LOCKOUT[1], e) + Math.sin(e * Math.PI) * 0.03];
        this.syncBar();
        this.rig.applyPose(lying(this.bar));
      },
    };
    const rerack: Seg = {
      dur: 0.8,
      fn: (t) => {
        const e = easeInOut(t);
        this.bar = [lerp(this.barFrom[0], HOOK[0], e), lerp(this.barFrom[1], HOOK[1], e)];
        this.syncBar();
        this.rig.applyPose(lying(this.bar));
      },
      done: () => (this.holding = false),
    };
    return { toLie, toSit, unrack, rerack };
  }
  private barFrom: V2 = [...LOCKOUT];

  /** Lie back and take the bar off the hooks. */
  async prepareSet(): Promise<void> {
    if (this.stance === 'lie' && this.holding) return;
    const s = this.segs();
    const list: Seg[] = [];
    if (this.stance === 'sit') list.push(s.toLie);
    list.push(s.unrack);
    this.bar = [...HOOK];
    await this.play(list);
  }

  /** Put the bar back and sit up (rest period). */
  async finishSet(): Promise<void> {
    if (this.stance === 'sit') return;
    const s = this.segs();
    this.barFrom = [...this.bar];
    await this.play([s.rerack, s.toSit]);
  }

  /** One repetition. `failed` stalls partway up and the bar settles back before re-racking. */
  playRep(result: RepResult, speed = 1): Promise<void> {
    const rep: Seg = {
      dur: 3.2 / speed,
      fn: (u) => {
        let h: number;
        let strain = 0;
        if (u < 0.4) h = 1 - easeInOut(u / 0.4); // lower
        else if (u < 0.5) h = 0; // pause on chest
        else if (result === 'success') {
          const p = (u - 0.5) / 0.5;
          h = easeInOut(p);
          strain = Math.sin(p * Math.PI);
        } else {
          const p = (u - 0.5) / 0.5;
          // press up to ~28%, shake, then sink back
          const rise = easeInOut(Math.min(1, p / 0.55)) * 0.28;
          const sink = p > 0.75 ? (p - 0.75) / 0.25 : 0;
          h = rise * (1 - sink * 0.9);
          strain = 1 + Math.sin(p * 60) * 0.3;
          h += Math.sin(p * 55) * 0.012 * (p > 0.5 && p < 0.78 ? 1 : 0);
        }
        this.bar = [lerp(CHEST[0], LOCKOUT[0], h), lerp(CHEST[1], LOCKOUT[1], h)];
        this.syncBar();
        this.rig.applyPose(lying(this.bar, strain));
      },
    };
    return this.play([rep]);
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
      this.rig.applyPose({ ...SIT, torso: SIT.torso + b * 2, head: Math.sin(this.clock * 0.7) * 0.04 });
    } else {
      const p = lying(this.bar);
      this.rig.applyPose({ ...p, pelvis: [p.pelvis[0], p.pelvis[1] + b * 0.4] });
    }
  }

  /** Skip all queued animation instantly (used when leaving the scene). */
  flush(): void {
    this.queue.forEach((s) => s.done?.());
    if (this.cur) this.cur.done?.();
    this.queue = [];
    this.cur = null;
  }
}

