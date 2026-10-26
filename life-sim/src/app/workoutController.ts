import type { RepReport, RepResult } from '../animation/benchPress';
import type { EventBus } from '../core/events';
import { EXERCISES } from '../data/exercises';
import { hasMembership } from '../fitness/membership';
import { commitRep, endSession, endSet, planRep, restBetweenSets, startSession, type WorkoutSession, type WorkoutSummary } from '../fitness/workout';
import type { GameState } from '../simulation/state';

export type WorkoutPhase = 'none' | 'ready' | 'lifting' | 'rest';

/** The animation surface the workout flow needs (implemented by BenchPressAnimator; faked in tests). */
export interface WorkoutAnimator {
  setLoad(kg: number): void;
  prepareSet(): Promise<void>;
  playRep(result: RepResult): Promise<RepReport>;
  finishSet(): Promise<void>;
  flush(): void;
}

export interface WorkoutDeps {
  state: () => GameState;
  bus: EventBus;
  animator: WorkoutAnimator;
  save: () => Promise<void>;
  /** UI refresh. */
  changed: () => void;
  /** Re-skin the body after stats change. */
  bodyChanged: () => void;
  /** Real-time pause used for the rest animation; replaceable in tests. */
  delay?: (ms: number) => Promise<void>;
}

/**
 * Orchestrates a workout: it asks the simulation what a rep would do, plays the
 * animation, and only commits a rep if the animation reports a complete, valid
 * cycle (chest touch + lockout). Interrupting at any time banks completed work.
 */
export class WorkoutController {
  session: WorkoutSession | null = null;
  phase: WorkoutPhase = 'none';
  lastSummary: WorkoutSummary | null = null;
  busy = false;
  private stopRequested = false;

  constructor(private d: WorkoutDeps) {}

  startWorkout(weight: number, reps: number): boolean {
    if (this.busy) return false;
    const r = startSession(this.d.state(), 'bench', weight, reps);
    if (!r.ok) {
      this.d.bus.emit('error', r.reason);
      return false;
    }
    this.session = r.session;
    this.phase = 'ready';
    this.lastSummary = null;
    this.d.animator.setLoad(weight);
    this.d.changed();
    return true;
  }

  setWeight(weight: number): void {
    const def = EXERCISES.bench!;
    if (!this.session || this.busy) return;
    const w = Math.min(def.maxWeight, Math.max(def.minWeight, weight));
    this.session.weight = w;
    this.d.animator.setLoad(w);
    this.d.changed();
  }

  setTargetReps(reps: number): void {
    if (!this.session || this.busy) return;
    this.session.targetReps = Math.min(30, Math.max(1, reps));
    this.d.changed();
  }

  /** Lift until the target, failure, exhaustion or a stop request. */
  async performSet(): Promise<void> {
    const s = this.session;
    if (!s || this.busy) return;
    const st = this.d.state();
    if (!hasMembership(st)) {
      this.d.bus.emit('error', 'Your gym pass has expired. Buy a new one to keep training.');
      return;
    }
    this.busy = true;
    this.stopRequested = false;
    this.phase = 'lifting';
    this.d.changed();
    await this.d.animator.prepareSet();
    while (s.setReps < s.targetReps && !this.stopRequested) {
      let outcome = planRep(st, s);
      if (outcome === 'exhausted') {
        commitRep(st, s, outcome, this.d.bus);
        break;
      }
      const report = await this.d.animator.playRep(outcome === 'success' ? 'success' : 'failed');
      // A rep only counts if the movement was physically complete.
      if (outcome === 'success' && !(report.chestReached && report.lockout)) outcome = 'failed';
      commitRep(st, s, outcome, this.d.bus);
      this.d.bodyChanged();
      this.d.changed();
      if (outcome !== 'success') break;
    }
    endSet(st, s, this.d.bus);
    this.d.bodyChanged();
    await this.d.animator.finishSet();
    this.phase = 'rest';
    this.busy = false;
    void this.d.save();
    this.d.changed();
  }

  /** Finish the set after the rep in progress. */
  stopSet(): void {
    this.stopRequested = true;
  }

  async rest(seconds = 90): Promise<void> {
    const s = this.session;
    if (!s || this.busy) return;
    this.busy = true;
    this.d.changed();
    await (this.d.delay ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms))))(900);
    restBetweenSets(this.d.state(), s, seconds, this.d.bus);
    this.busy = false;
    void this.d.save();
    this.d.changed();
  }

  /** End the workout (also the interruption path): banks any partial set and saves. */
  async endWorkout(): Promise<void> {
    const s = this.session;
    if (!s) return;
    this.stopRequested = true;
    while (this.busy) await new Promise((r) => setTimeout(r, 20));
    this.lastSummary = endSession(this.d.state(), s, this.d.bus);
    this.session = null;
    this.phase = 'none';
    this.d.bodyChanged();
    await this.d.animator.finishSet();
    await this.d.save();
    this.d.changed();
  }

  /** Drop everything without rewards (used by New Game). */
  abort(): void {
    this.d.animator.flush();
    this.session = null;
    this.phase = 'none';
    this.busy = false;
  }
}
