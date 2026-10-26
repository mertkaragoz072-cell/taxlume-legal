import { BenchPressAnimator } from '../animation/benchPress';
import { StickmanRig } from '../character/rig';
import { EventBus } from '../core/events';
import { muscleAmount, physiqueStage } from '../fitness/progression';
import { purchaseMembership, type MembershipPlan } from '../fitness/membership';
import { SaveManager } from '../persistence/save';
import { advanceTime } from '../simulation/needs';
import { createNewGame, type GameState } from '../simulation/state';
import { createGymScene } from '../world/gymScene';
import { GameRenderer, type GraphicsQuality } from '../world/renderer';
import { WorkoutController } from './workoutController';

/** Wires the simulation, renderer and animation together; the UI talks only to this. */
export class Game {
  state: GameState = createNewGame();
  readonly bus = new EventBus();
  private rig = new StickmanRig();
  private changeListeners = new Set<() => void>();
  workout!: WorkoutController;

  constructor(
    private renderer: GameRenderer,
    private saves: SaveManager,
  ) {}

  async init(): Promise<{ recovered: boolean; source: string }> {
    const loaded = await this.saves.load();
    this.state = loaded.state;
    const gym = createGymScene();
    gym.station.add(this.rig.root);
    const animator = new BenchPressAnimator(this.rig, gym.barbell);
    this.workout = new WorkoutController({
      state: () => this.state,
      bus: this.bus,
      animator,
      save: () => this.save(),
      changed: () => this.changed(),
      bodyChanged: () => this.refreshBody(),
    });
    this.renderer.loadLocation(gym);
    this.renderer.setFrameHandler((dt) => animator.update(dt));
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

  get graphics(): GraphicsQuality {
    return this.renderer.graphics;
  }

  setGraphics(q: GraphicsQuality): void {
    this.renderer.setGraphics(q);
    this.changed();
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
    this.workout.abort();
    await this.saves.reset();
    this.state = createNewGame();
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

  /** Let time pass without exercising. */
  passTime(seconds: number): void {
    advanceTime(this.state, seconds, 'resting', this.bus);
    void this.save();
    this.changed();
  }
}
