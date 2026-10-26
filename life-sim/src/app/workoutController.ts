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
  /** Lie back if seated, then lift the bar off the hooks. */
  prepareSet(): Promise<void>;
  playRep(result: RepResult): Promise<RepReport>;
  /** Put the bar back on the hooks and STAY lying on the bench (between sets). */
  rackBar(): Promise<void>;
  /** Rack (if needed) and sit up — only when the workout is over. */
  sitUp(): Promise<void>;
  /** Snap to "lying with the bar racked" without animating (state restore). */
  restoreLying(): void;
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
 * Workout flow. The session itself lives in `GameState.workout` (single source of truth,
 * saved with the game); this class only holds transient runtime flags. Training is allowed
 * only with a valid membership; whenever that stops being true the session is ended and
 * its completed work banked, so the UI can never show an active workout while training is
 * prohibited.
 */
export class WorkoutController {
  lastSummary: WorkoutSummary | null = null;
  /** True while any animated action (set, rest, ending) is running. */
  busy = false;
  private lifting = false;
  private stopRequested = false;
  private ending: Promise<void> | null = null;

  constructor(private d: WorkoutDeps) {}

  get session(): WorkoutSession | null {
    return this.d.state().workout;
  }

  get phase(): WorkoutPhase {
    const s = this.session;
    if (!s) return 'none';
    return this.lifting ? 'lifting' : s.phase;
  }

  /** The only rule for whether training may happen right now. */
  get canTrain(): boolean {
    const st = this.d.state();
    return st.location === 'gym' && hasMembership(st);
  }

  /** Re-establish a valid state after loading a save. Banks partial sets; ends expired sessions. */
  async restore(): Promise<void> {
    const st = this.d.state();
    const s = st.workout;
    if (!s) return;
    endSet(st, s, this.d.bus); // bank reps of a set that was in progress when the app closed
    if (!this.canTrain) {
      await this.terminate('Your gym pass expired while you were away — workout ended and saved.');
      return;
    }
    s.phase = s.phase === 'ready' ? 'ready' : 'rest';
    this.d.animator.setLoad(s.weight);
    this.d.animator.restoreLying();
    this.d.bodyChanged();
    this.d.changed();
  }

  startWorkout(weight: number, reps: number): boolean {
    if (this.busy || this.session) return false;
    const st = this.d.state();
    const r = startSession(st, 'bench', weight, reps);
    if (!r.ok) {
      this.d.bus.emit('error', r.reason);
      return false;
    }
    st.workout = r.session;
    this.d.animator.setLoad(weight);
    void this.d.save();
    this.d.changed();
    return true;
  }

  setWeight(weight: number): void {
    const def = EXERCISES.bench!;
    const s = this.session;
    if (!s || this.busy) return;
    s.weight = Math.min(def.maxWeight, Math.max(def.minWeight, weight));
    this.d.animator.setLoad(s.weight);
    this.d.changed();
  }

  setTargetReps(reps: number): void {
    const s = this.session;
    if (!s || this.busy) return;
    s.targetReps = Math.min(30, Math.max(1, reps));
    this.d.changed();
  }

  /** Call after anything that advances game time. Ends the session if training became prohibited. */
  enforceAccess(): void {
    if (!this.session || this.canTrain) return;
    if (this.lifting) {
      this.stopRequested = true; // finish the rep in progress, then performSet ends the session
      return;
    }
    if (!this.busy) void this.terminate('Your gym pass expired — workout ended and saved.');
  }

  /** Lift until the target, failure, exhaustion, expiry or a stop request. */
  async performSet(): Promise<void> {
    const s = this.session;
    if (!s || this.busy) return;
    if (!this.canTrain) {
      this.d.bus.emit('error', 'Your gym pass has expired. Buy a new one to keep training.');
      await this.terminate('Workout ended and saved.');
      return;
    }
    const st = this.d.state();
    this.busy = true;
    this.lifting = true;
    this.stopRequested = false;
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
      void this.d.save(); // reps already done survive a refresh
      this.d.changed();
      if (outcome !== 'success') break;
      if (!this.canTrain) break; // pass expired during the set: this rep counted, no more
    }
    endSet(st, s, this.d.bus);
    s.phase = 'rest';
    this.d.bodyChanged();
    await this.d.animator.rackBar(); // stays lying — never pops upright between sets
    this.lifting = false;
    this.busy = false;
    if (!this.canTrain) {
      await this.terminate('Your gym pass expired — workout ended and saved.');
      return;
    }
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
    s.phase = 'rest';
    this.busy = false;
    void this.d.save();
    this.d.changed();
    this.enforceAccess();
  }

  /** End the workout (also the interruption path): banks any partial set, sits up, saves. Idempotent. */
  endWorkout(): Promise<void> {
    if (!this.session) return Promise.resolve();
    this.stopRequested = true;
    this.ending ??= this.terminate().finally(() => (this.ending = null));
    return this.ending;
  }

  private async terminate(message?: string): Promise<void> {
    const s = this.session;
    if (!s) return;
    this.stopRequested = true;
    while (this.lifting) await new Promise((r) => setTimeout(r, 20));
    const st = this.d.state();
    if (st.workout !== s) return; // already ended by another path
    this.busy = true;
    this.lastSummary = endSession(st, s, this.d.bus);
    st.workout = null; // single authority: the session is gone before anything else reacts
    if (message) this.d.bus.emit('warning', message);
    this.d.bodyChanged();
    this.d.changed();
    await this.d.animator.sitUp();
    this.busy = false;
    await this.d.save();
    this.d.changed();
  }

  /** Drop everything without rewards (used by New Game). */
  abort(): void {
    this.d.animator.flush();
    this.d.state().workout = null;
    this.lifting = false;
    this.busy = false;
    this.ending = null;
  }
}
