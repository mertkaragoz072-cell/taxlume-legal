import * as THREE from 'three';
import { easeInOut } from '../core/math';
import { actionPose, blendTargetPose, standPose, walkPose, type ActionKind, type PoseCtx } from './poses';
import { lerpPose, type Pose, type StickmanRig } from './rig';

export interface ActSpot {
  /** Anchor x in room coordinates. */
  x: number;
  facing: 1 | -1;
  /** Seat / mattress top height. */
  surfaceY: number;
}

type Job =
  | { type: 'walk'; x: number; facing?: 1 | -1; done: () => void }
  | { type: 'act'; kind: ActionKind; spot: ActSpot; seconds: number; blendOut: number; done: () => void };

const SPEED = 1.5; // m/s
const STRIDE_RATE = 10.5; // rad/s of walk phase at SPEED

/**
 * Drives one rig through everyday activities in a room: walk to a spot, blend into an action pose,
 * hold it for the action's (real-time) duration, then blend back to standing. Facing is done by mirroring
 * the whole group, so every pose is authored once, facing +x.
 */
export class Actor {
  readonly group = new THREE.Group();
  x = 0;
  facing: 1 | -1 = 1;
  private jobs: Job[] = [];
  private cur: Job | null = null;
  private stage: 'walk' | 'blendIn' | 'hold' | 'blendOut' | 'idle' = 'idle';
  private t = 0;
  private phase = 0;
  private clock = 0;
  private from: Pose;
  private ctx: PoseCtx = { torsoR: 0.1, surfaceY: 0 };
  /** Current action kind while holding (read by the scene for effects like water or Zzz). */
  activeKind: ActionKind = 'idle';

  constructor(private rig: StickmanRig) {
    this.group.add(rig.root);
    this.from = standPose();
    this.place(0, 1);
  }

  place(x: number, facing: 1 | -1 = 1): void {
    this.flush();
    this.x = x;
    this.facing = facing;
    this.apply();
    this.rig.applyPose(standPose());
  }

  get busy(): boolean {
    return this.cur !== null || this.jobs.length > 0;
  }

  private apply(): void {
    this.group.position.x = this.x;
    this.group.scale.x = this.facing;
  }

  walkTo(x: number, facing?: 1 | -1): Promise<void> {
    return new Promise((res) => this.jobs.push({ type: 'walk', x, facing, done: res }));
  }

  /** Walk to the spot, do the action for `seconds` of real time, return to standing. */
  perform(kind: ActionKind, spot: ActSpot, seconds: number, blendOut = 1.0): Promise<void> {
    return new Promise((res) => this.jobs.push({ type: 'act', kind, spot, seconds, blendOut, done: res }));
  }

  /** Cancel everything and resolve pending promises (scene change). */
  flush(): void {
    const pending = [...(this.cur ? [this.cur] : []), ...this.jobs];
    this.jobs = [];
    this.cur = null;
    this.stage = 'idle';
    this.activeKind = 'idle';
    pending.forEach((j) => j.done());
  }

  private startNext(): void {
    this.cur = this.jobs.shift() ?? null;
    this.t = 0;
    if (!this.cur) {
      this.stage = 'idle';
      return;
    }
    const x = this.cur.type === 'walk' ? this.cur.x : this.cur.spot.x;
    this.stage = Math.abs(x - this.x) > 0.03 ? 'walk' : this.cur.type === 'act' ? 'blendIn' : 'idle';
    if (this.stage === 'blendIn' && this.cur.type === 'act') this.enterAction(this.cur);
    if (this.stage === 'idle') this.finish();
  }

  private enterAction(job: Extract<Job, { type: 'act' }>): void {
    this.facing = job.spot.facing;
    this.ctx = { torsoR: this.rig.torsoRadius, surfaceY: job.spot.surfaceY };
    this.apply();
    this.from = this.rig.currentPose;
    this.t = 0;
    this.stage = 'blendIn';
  }

  private finish(): void {
    const j = this.cur;
    this.cur = null;
    this.stage = 'idle';
    this.activeKind = 'idle';
    j?.done();
  }

  update(dt: number): void {
    this.clock += dt;
    if (!this.cur) this.startNext();
    const j = this.cur;
    if (!j) {
      this.rig.applyPose(standPose(this.clock));
      return;
    }
    switch (this.stage) {
      case 'walk': {
        const target = j.type === 'walk' ? j.x : j.spot.x;
        const dx = target - this.x;
        const step = Math.min(Math.abs(dx), SPEED * dt);
        this.facing = dx >= 0 ? 1 : -1;
        this.x += Math.sign(dx) * step;
        this.phase += STRIDE_RATE * dt;
        this.t = Math.min(1, this.t + dt / 0.2);
        this.rig.applyPose(lerpPose(standPose(this.clock), walkPose(this.phase), this.t));
        this.apply();
        if (Math.abs(target - this.x) < 1e-3) {
          this.x = target;
          if (j.type === 'act') this.enterAction(j);
          else {
            if (j.facing) this.facing = j.facing;
            this.apply();
            this.rig.applyPose(standPose(this.clock));
            this.finish();
          }
        }
        break;
      }
      case 'blendIn': {
        if (j.type !== 'act') return;
        this.t = Math.min(1, this.t + dt / 0.9);
        this.rig.applyPose(lerpPose(this.from, blendTargetPose(j.kind, this.ctx), easeInOut(this.t)));
        if (this.t >= 1) {
          this.stage = 'hold';
          this.t = 0;
          this.activeKind = j.kind;
        }
        break;
      }
      case 'hold': {
        if (j.type !== 'act') return;
        this.t += dt;
        this.rig.applyPose(actionPose(j.kind, this.t, this.ctx));
        if (this.t >= j.seconds) {
          this.from = this.rig.currentPose;
          this.stage = 'blendOut';
          this.t = 0;
          this.activeKind = 'idle';
        }
        break;
      }
      case 'blendOut': {
        if (j.type !== 'act') return;
        this.t = Math.min(1, this.t + dt / j.blendOut);
        this.rig.applyPose(lerpPose(this.from, standPose(this.clock), easeInOut(this.t)));
        if (this.t >= 1) this.finish();
        break;
      }
      default:
        break;
    }
  }
}
