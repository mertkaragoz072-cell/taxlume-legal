import { BenchPressAnimator } from '../animation/benchPress';
import { StickmanRig } from '../character/rig';
import { EventBus } from '../core/events';
import { EXERCISES } from '../data/exercises';
import { muscleAmount, physiqueStage } from '../fitness/progression';
import { purchaseMembership, type MembershipPlan } from '../fitness/membership';
import {
  commitRep,
  endSession,
  endSet,
  planRep,
  restBetweenSets,
  startSession,
  type WorkoutSession,
  type WorkoutSummary,
} from '../fitness/workout';
import { SaveManager } from '../persistence/save';
import { advanceTime } from '../simulation/needs';
import { createNewGame, type GameState } from '../simulation/state';
import { createGymScene, type GymScene } from '../world/gymScene';
import { GameRenderer } from '../world/renderer';

export type WorkoutPhase = 'none' | 'ready' | 'lifting' | 'rest';

/** Wires the simulation, renderer and animation together; the UI talks only to this. */
export class Game {
  state: GameState = createNewGame();
  readonly bus = new EventBus();
  session: WorkoutSession | null = null;
  phase: WorkoutPhase = 'none';
  lastSummary: WorkoutSummary | null = null;
  /** Busy while a rest/animation is running; UI disables controls. */
  busy = false;
  private stopRequested = false;
  private rig = new StickmanRig();
  private animator!: BenchPressAnimator;
  private gym!: GymScene;
  private changeListeners = new Set<() => void>();

  constructor(
    private renderer: GameRenderer,
    private saves: SaveManager,
  ) {}

  async init(): Promise<{ recovered: boolean; source: string }> {
    const loaded = await this.saves.load();
    this.state = loaded.state;
    this.gym = createGymScene();
    this.gym.root.add(this.rig.root);
    this.animator = new BenchPressAnimator(this.rig, this.gym.barbell);
    this.renderer.loadLocation(this.gym);
    this.renderer.setFrameHandler((dt) => this.animator.update(dt));
    this.refreshBody();
    this.renderer.start();
    return { recovered: loaded.recovered, source: loaded.source };
  }

  onChange(fn: () => void): () => void {
    this.changeListeners.add(fn);
    return () => this.changeListeners.delete(fn);
  }
  private changed(): void {
    this.changeListeners.forEach((f) => f());
  }

  /** Re-skin the same rig for the current physique. */
  private refreshBody(): void {
    const c = this.state.character;
    this.rig.setMuscle(muscleAmount(c.strength, c.endurance));
  }

  get physiqueStage(): number {
    return physiqueStage(this.state.character.strength);
  }

  async save(): Promise<void> {
    try {
      await this.saves.save(this.state);
    } catch {
      this.bus.emit('error', 'Could not save the game (storage unavailable).');
    }
  }

  async resetGame(): Promise<void> {
    this.animator.flush();
    await this.saves.reset();
    this.state = createNewGame();
    this.session = null;
    this.phase = 'none';
    this.busy = false;
    this.refreshBody();
    this.changed();
    this.bus.emit('info', 'New game started.');
  }

  buyMembership(plan: MembershipPlan): boolean {
    const ok = purchaseMembership(this.state, plan, this.bus);
    if (ok) void this.save();
    this.changed();
    return ok;
  }

  // ----- Workout flow -----

  startWorkout(weight: number, reps: number): boolean {
    if (this.busy) return false;
    const r = startSession(this.state, 'bench', weight, reps);
    if (!r.ok) {
      this.bus.emit('error', r.reason);
      return false;
    }
    this.session = r.session;
    this.phase = 'ready';
    this.lastSummary = null;
    this.animator.setLoad(weight);
    this.changed();
    return true;
  }

  setWeight(weight: number): void {
    const d = EXERCISES.bench!;
    if (!this.session || this.busy || this.phase === 'lifting') return;
    const w = Math.min(d.maxWeight, Math.max(d.minWeight, weight));
    this.session.weight = w;
    this.animator.setLoad(w);
    this.changed();
  }

  setTargetReps(reps: number): void {
    if (!this.session || this.busy) return;
    this.session.targetReps = Math.min(30, Math.max(1, reps));
    this.changed();
  }

  /** Lift until the target, failure, exhaustion or a stop request. */
  async performSet(): Promise<void> {
    const s = this.session;
    if (!s || this.busy) return;
    this.busy = true;
    this.stopRequested = false;
    this.phase = 'lifting';
    this.changed();
    await this.animator.prepareSet();
    while (s.setReps < s.targetReps && !this.stopRequested) {
      const outcome = planRep(this.state, s);
      if (outcome === 'exhausted') {
        commitRep(this.state, s, outcome, this.bus);
        break;
      }
      await this.animator.playRep(outcome === 'success' ? 'success' : 'failed');
      commitRep(this.state, s, outcome, this.bus);
      this.refreshBody();
      this.changed();
      if (outcome !== 'success') break;
    }
    endSet(this.state, s, this.bus);
    this.refreshBody();
    await this.animator.finishSet();
    this.phase = 'rest';
    this.busy = false;
    void this.save();
    this.changed();
  }

  /** Ask the current set to finish after the rep in progress. */
  stopSet(): void {
    this.stopRequested = true;
  }

  async rest(seconds = 90): Promise<void> {
    const s = this.session;
    if (!s || this.busy) return;
    this.busy = true;
    this.changed();
    await new Promise((r) => setTimeout(r, 900));
    restBetweenSets(this.state, s, seconds, this.bus);
    this.busy = false;
    void this.save();
    this.changed();
  }

  async endWorkout(): Promise<void> {
    const s = this.session;
    if (!s) return;
    this.stopRequested = true;
    while (this.busy) await new Promise((r) => setTimeout(r, 50));
    this.lastSummary = endSession(this.state, s, this.bus);
    this.session = null;
    this.phase = 'none';
    this.refreshBody();
    await this.animator.finishSet();
    void this.save();
    this.changed();
  }

  /** Wait without exercising (rest of the day); keeps the sim honest for the idle clock. */
  passTime(seconds: number): void {
    advanceTime(this.state, seconds, 'resting', this.bus);
    void this.save();
    this.changed();
  }
}
