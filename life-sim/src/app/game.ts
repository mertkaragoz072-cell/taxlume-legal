import type * as THREE from 'three';
import { BenchPressAnimator, type RepReport, type RepResult } from '../animation/benchPress';
import { Actor } from '../character/actor';
import type { ActionKind } from '../character/poses';
import { DEFAULT_SKIN, StickmanRig } from '../character/rig';
import { EventBus } from '../core/events';
import type { HomeRoom, LocationId } from '../core/types';
import { objectById, ROOMS } from '../data/homeObjects';
import { muscleAmount, physiqueStage } from '../fitness/progression';
import { purchaseMembership, type MembershipPlan } from '../fitness/membership';
import { canTravel, goToRoom, travel } from '../navigation/travel';
import { SaveManager } from '../persistence/save';
import { executeAction, type ActionSpec } from '../simulation/actions';
import { advanceTime } from '../simulation/needs';
import { createNewGame, type GameState } from '../simulation/state';
import { readClock } from '../simulation/time';
import { createGymScene, type GymScene } from '../world/gymScene';
import { GameRenderer, type GraphicsQuality } from '../world/renderer';
import { createHomeScene, type RoomScene } from '../world/rooms/homeRooms';
import { WorkoutController, type WorkoutAnimator } from './workoutController';

/** Forwards workout animation calls to whichever gym animator is currently alive (none outside the gym). */
class AnimatorProxy implements WorkoutAnimator {
  target: BenchPressAnimator | null = null;
  setLoad(kg: number) {
    this.target?.setLoad(kg);
  }
  prepareSet() {
    return this.target?.prepareSet() ?? Promise.resolve();
  }
  playRep(r: RepResult): Promise<RepReport> {
    return this.target?.playRep(r) ?? Promise.resolve({ chestReached: false, lockout: false });
  }
  rackBar() {
    return this.target?.rackBar() ?? Promise.resolve();
  }
  sitUp() {
    return this.target?.sitUp() ?? Promise.resolve();
  }
  restoreLying() {
    this.target?.restoreLying();
  }
  flush() {
    this.target?.flush();
  }
}

/** Real seconds an action's animation plays, scaled loosely by its game duration. */
export const animSeconds = (minutes: number): number => Math.min(6, Math.max(2.5, 2 + minutes / 90));

/** Wires the simulation, renderer and animation together; the UI talks only to this. */
export class Game {
  state: GameState = createNewGame();
  readonly bus = new EventBus();
  readonly rig = new StickmanRig();
  readonly actor = new Actor(this.rig);
  station: THREE.Group | null = null;
  private gymScene: GymScene | null = null;
  workout!: WorkoutController;
  /** The interactable object selected in the current room (tap or list). */
  selected: string | null = null;
  /** True while a home action or travel is animating; the UI disables controls. */
  busy = false;
  private proxy = new AnimatorProxy();
  roomScene: RoomScene | null = null;
  private changeListeners = new Set<() => void>();
  private fadeHandler: (on: boolean) => Promise<void> = async () => {};
  private lastPurchaseToken = '';

  constructor(
    private renderer: GameRenderer,
    private saves: SaveManager,
  ) {}

  async init(): Promise<{ recovered: boolean; source: string }> {
    const loaded = await this.saves.load();
    this.state = loaded.state;
    this.workout = new WorkoutController({
      state: () => this.state,
      bus: this.bus,
      animator: this.proxy,
      save: () => this.save(),
      changed: () => this.changed(),
      bodyChanged: () => this.refreshBody(),
    });
    this.refreshBody();
    this.enterScene();
    await this.workout.restore(); // one valid state after load: banks partial sets, ends expired sessions
    this.renderer.start();
    return { recovered: loaded.recovered, source: loaded.source };
  }

  onChange(fn: () => void): () => void {
    this.changeListeners.add(fn);
    return () => this.changeListeners.delete(fn);
  }
  onFade(fn: (on: boolean) => Promise<void>): void {
    this.fadeHandler = fn;
  }
  private changed(): void {
    this.applyHour();
    this.changeListeners.forEach((f) => f());
  }

  private applyHour(): void {
    const c = readClock(this.state.time);
    this.roomScene?.setHour(c.hour + c.minute / 60);
  }

  /** Re-skin the same rig for the current physique. */
  private refreshBody(): void {
    const c = this.state.character;
    this.rig.setMuscle(muscleAmount(c.strength, c.endurance));
  }

  get physiqueStage(): number {
    return physiqueStage(this.state.character.strength);
  }

  get graphics(): GraphicsQuality {
    return this.renderer.graphics;
  }
  setGraphics(q: GraphicsQuality): void {
    this.renderer.setGraphics(q);
    this.gymScene?.setReflections(q !== 'low');
    this.changed();
  }

  get room(): HomeRoom {
    return this.state.room;
  }

  // ---------------------------------------------------------------- scene management

  /** Build the scene for the authoritative state.location / state.room and attach the character. */
  private enterScene(): void {
    this.actor.flush();
    this.rig.root.removeFromParent();
    this.proxy.target = null;
    this.roomScene = null;
    this.station = null;
    this.gymScene = null;
    this.selected = null;
    if (this.state.location === 'gym') {
      const gym: GymScene = createGymScene();
      this.gymScene = gym;
      gym.setReflections(this.renderer.graphics !== 'low');
      this.station = gym.station;
      this.rig.setSkin(gym.skin ?? DEFAULT_SKIN);
      gym.station.add(this.rig.root);
      const animator = new BenchPressAnimator(this.rig, gym.barbell);
      this.proxy.target = animator;
      this.renderer.loadLocation(gym);
      this.renderer.setFrameHandler((dt) => animator.update(dt));
    } else {
      this.rig.setSkin(DEFAULT_SKIN);
      const room = createHomeScene(this.state.room);
      this.roomScene = room;
      room.actorRoot.add(this.actor.group);
      this.actor.group.add(this.rig.root);
      const def = ROOMS[this.state.room];
      this.actor.place(def.doorX, def.doorX > 0 ? -1 : 1);
      this.selected = def.objects[0]?.id ?? null;
      this.renderer.loadLocation(room);
      this.renderer.setFrameHandler((dt) => {
        this.actor.update(dt);
        room.setActivity(this.actor.activeKind);
      });
      this.applyHour();
    }
  }

  private async switchScene(): Promise<void> {
    await this.fadeHandler(true);
    this.enterScene();
    await this.fadeHandler(false);
  }

  // ---------------------------------------------------------------- persistence

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
    this.busy = false;
    await this.switchScene();
    this.changed();
    this.bus.emit('info', 'New game started.');
  }

  /** `token` identifies one confirmed purchase; repeated taps with the same token charge only once. */
  buyMembership(plan: MembershipPlan, token = ''): boolean {
    if (token && token === this.lastPurchaseToken) return false;
    if (token) this.lastPurchaseToken = token;
    const ok = purchaseMembership(this.state, plan, this.bus);
    if (ok) void this.save();
    this.changed();
    return ok;
  }

  /** Let time pass without doing anything. */
  passTime(seconds: number): void {
    advanceTime(this.state, seconds, 'resting', this.bus);
    void this.save();
    this.changed();
    this.workout.enforceAccess();
  }

  // ---------------------------------------------------------------- navigation

  canTravelTo(to: LocationId) {
    return canTravel(this.state, to);
  }

  /** Walk to another location. Ends an active workout first (banking it), then moves and loads the scene. */
  async travelTo(to: LocationId): Promise<boolean> {
    if (this.busy) return false;
    const pre = canTravel({ ...this.state, workout: null }, to);
    if (!pre.ok) {
      this.bus.emit('error', pre.reason);
      return false;
    }
    this.busy = true;
    this.changed();
    if (this.state.workout) await this.workout.endWorkout();
    const r = travel(this.state, to, this.bus);
    if (!r.ok) {
      this.busy = false;
      this.bus.emit('error', r.reason);
      this.changed();
      return false;
    }
    await this.switchScene();
    await this.save();
    this.busy = false;
    this.changed();
    this.bus.emit('info', `You walked ${r.minutes} min to ${to === 'gym' ? 'the gym' : 'home'}.`);
    return true;
  }

  /** Walk into another room of the home (1 game minute). */
  async goRoom(room: HomeRoom): Promise<boolean> {
    if (this.busy) return false;
    const r = goToRoom(this.state, room, this.bus);
    if (!r.ok) {
      this.bus.emit('error', r.reason);
      return false;
    }
    this.busy = true;
    await this.switchScene();
    void this.save();
    this.busy = false;
    this.changed();
    return true;
  }

  // ---------------------------------------------------------------- room interaction

  selectObject(id: string | null): void {
    if (this.busy) return;
    this.selected = id;
    this.changed();
  }

  /** Tap in the scene: select the interactable under the finger, if any. */
  pickAt(clientX: number, clientY: number): void {
    if (!this.roomScene || this.busy) return;
    const id = this.renderer.pick(clientX, clientY, this.roomScene.hits);
    if (id) this.selectObject(id);
  }

  /**
   * Run a home action. The rules commit first (all-or-nothing, time advances once), then the character
   * walks to the object and plays the matching animation; controls stay locked until it finishes.
   */
  async runAction(spec: ActionSpec): Promise<boolean> {
    if (this.busy || !this.roomScene || this.state.location !== 'home') return false;
    const room = this.state.room;
    const objId = this.selected ?? '';
    const obj = objectById(room, objId);
    this.busy = true;
    this.changed();
    const res = executeAction(this.state, spec, this.bus);
    if (!res.ok) {
      this.bus.emit('error', res.reason);
      this.busy = false;
      this.changed();
      return false;
    }
    void this.save();
    this.changed();
    this.bus.emit('success', res.summary);
    if (obj) await this.animate(spec, obj.x, obj.facing, obj.surfaceY, res.minutes);
    this.busy = false;
    this.changed();
    return true;
  }

  private async animate(spec: ActionSpec, x: number, facing: 1 | -1, surfaceY: number, minutes: number): Promise<void> {
    const secs = animSeconds(minutes);
    const spot = { x, facing, surfaceY };
    const table = objectById('kitchen', 'table');
    let kind: ActionKind = 'idle';
    switch (spec.kind) {
      case 'sleep':
        kind = 'sleep';
        break;
      case 'nap':
        kind = 'nap';
        break;
      case 'eat':
        kind = 'eat';
        break;
      case 'cook': {
        await this.actor.perform('cook', spot, secs * 0.45);
        if (table) await this.actor.perform('eat', { x: table.x, facing: table.facing, surfaceY: table.surfaceY }, secs * 0.55);
        return;
      }
      case 'activity':
        kind = spec.id === 'shower' ? 'shower' : spec.id === 'watch_tv' ? 'tv' : spec.id === 'study' ? 'type' : 'drink';
        break;
    }
    await this.actor.perform(kind, spot, secs, kind === 'sleep' || kind === 'nap' ? 1.2 : 0.9);
  }
}
