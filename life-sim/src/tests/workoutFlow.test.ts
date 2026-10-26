import { describe, expect, it, vi } from 'vitest';
import type { RepReport, RepResult } from '../animation/benchPress';
import { WorkoutController, type WorkoutAnimator } from '../app/workoutController';
import { EventBus, type GameEvent } from '../core/events';
import { GYM_PRICES } from '../data/exercises';
import { hasMembership, membershipRemaining, purchaseMembership } from '../fitness/membership';
import { MemoryStorage, SaveManager } from '../persistence/save';
import { advanceTime } from '../simulation/needs';
import { gymGame } from './helpers';
import { createNewGame, START_MONEY, type GameState } from '../simulation/state';
import { DAY, HOUR } from '../simulation/time';

class FakeAnimator implements WorkoutAnimator {
  reps = 0;
  loads: number[] = [];
  onRep: (n: number) => void = () => {};
  report: RepReport | null = null; // override to simulate an incomplete cycle
  setLoad(kg: number) {
    this.loads.push(kg);
  }
  async prepareSet() {}
  async playRep(r: RepResult): Promise<RepReport> {
    this.reps++;
    this.onRep(this.reps);
    await Promise.resolve();
    return this.report ?? (r === 'success' ? { chestReached: true, lockout: true } : { chestReached: true, lockout: false });
  }
  async rackBar() {}
  async sitUp() {
    this.sat = true;
  }
  sat = false;
  restoreLying() {}
  flush() {}
}

function rig(state: GameState = gymGame()) {
  const bus = new EventBus();
  const events: GameEvent[] = [];
  bus.on((e) => events.push(e));
  const animator = new FakeAnimator();
  const storage = new MemoryStorage();
  const saves = new SaveManager(storage);
  const save = vi.fn(() => saves.save(state));
  const ctl = new WorkoutController({ state: () => state, bus, animator, save, changed: () => {}, bodyChanged: () => {}, delay: async () => {} });
  animator.onRep = () => {};
  return { state, bus, events, animator, ctl, saves, save };
}

describe('gym membership purchases', () => {
  it('day pass costs the listed price, lasts 24h and is logged', () => {
    const s = createNewGame();
    expect(purchaseMembership(s, 'dayPass')).toBe(true);
    expect(s.money).toBe(START_MONEY - GYM_PRICES.dayPass);
    expect(s.gym.membershipUntil).toBe(s.time + DAY);
    expect(s.transactions).toHaveLength(1);
    expect(s.transactions[0]).toMatchObject({ amount: -GYM_PRICES.dayPass, category: 'gym', balanceAfter: s.money });
  });

  it('monthly membership costs the listed price and lasts 30 days', () => {
    const s = createNewGame();
    expect(purchaseMembership(s, 'monthly')).toBe(true);
    expect(s.money).toBe(START_MONEY - GYM_PRICES.monthly);
    expect(membershipRemaining(s)).toBe(30 * DAY);
  });

  it('is valid one second before expiry and invalid exactly at expiry', () => {
    const s = createNewGame();
    purchaseMembership(s, 'dayPass');
    advanceTime(s, DAY - 1);
    expect(hasMembership(s)).toBe(true);
    advanceTime(s, 1);
    expect(hasMembership(s)).toBe(false);
    expect(membershipRemaining(s)).toBe(0);
  });

  it('stacks: buying again extends from the current expiry rather than wasting time', () => {
    const s = createNewGame();
    purchaseMembership(s, 'dayPass');
    advanceTime(s, 6 * HOUR);
    purchaseMembership(s, 'dayPass');
    expect(membershipRemaining(s)).toBe(2 * DAY - 6 * HOUR);
    expect(s.money).toBe(START_MONEY - 2 * GYM_PRICES.dayPass);
  });

  it('refuses without enough money: nothing deducted, no access, no transaction', () => {
    const s = createNewGame();
    s.money = GYM_PRICES.monthly - 1;
    const bus = new EventBus();
    const events: GameEvent[] = [];
    bus.on((e) => events.push(e));
    expect(purchaseMembership(s, 'monthly', bus)).toBe(false);
    expect(s.money).toBe(GYM_PRICES.monthly - 1);
    expect(hasMembership(s)).toBe(false);
    expect(s.transactions).toHaveLength(0);
    expect(events[0]?.kind).toBe('error');
  });
});

describe('access restrictions', () => {
  it('cannot start a workout without a membership', () => {
    const { ctl, events } = rig();
    expect(ctl.startWorkout(25, 8)).toBe(false);
    expect(ctl.session).toBeNull();
    expect(events.some((e) => e.kind === 'error')).toBe(true);
  });

  it('a valid membership unlocks training', () => {
    const { ctl, state } = rig();
    purchaseMembership(state, 'dayPass');
    expect(ctl.startWorkout(25, 8)).toBe(true);
    expect(ctl.phase).toBe('ready');
  });

  it('an expired pass blocks the next set even mid-workout, and nothing is awarded for it', async () => {
    const { ctl, state, events } = rig();
    purchaseMembership(state, 'dayPass');
    ctl.startWorkout(25, 8);
    advanceTime(state, DAY + 5); // pass lapses while resting
    const before = JSON.stringify(state.character);
    await ctl.performSet();
    expect(JSON.stringify(state.character)).toBe(before);
    expect(state.gym.lifts.bench).toBeUndefined();
    expect(events.some((e) => e.message.includes('expired'))).toBe(true);
  });
});

describe('workout flow', () => {
  it('a full set updates reps, sets, energy, xp, strength and records, then autosaves', async () => {
    const { ctl, state, save, saves } = rig();
    purchaseMembership(state, 'dayPass');
    ctl.startWorkout(25, 8);
    const e0 = state.character.energy;
    const t0 = state.time;
    await ctl.performSet();
    const s = ctl.session!;
    expect(s.totalReps).toBe(8);
    expect(s.completedSets).toBe(1);
    expect(state.character.energy).toBeLessThan(e0);
    expect(state.time - t0).toBe(8 * 5);
    expect(state.character.xp).toBeGreaterThan(0);
    expect(state.character.strength).toBeGreaterThan(5);
    expect(state.gym.lifts.bench).toMatchObject({ totalReps: 8, totalSets: 1, bestWeight: 25 });
    expect(ctl.phase).toBe('rest');
    expect(save).toHaveBeenCalled();
    expect((await saves.load()).state).toEqual(state);
  });

  it('a rep whose animation was not a full cycle is not counted', async () => {
    const { ctl, state, animator } = rig();
    purchaseMembership(state, 'dayPass');
    ctl.startWorkout(25, 8);
    animator.report = { chestReached: true, lockout: false };
    await ctl.performSet();
    expect(ctl.session!.totalReps).toBe(0);
    expect(state.gym.lifts.bench).toBeUndefined();
    expect(state.character.strength).toBe(5);
  });

  it('a weight that is too heavy fails: no rep, no strength, set ends', async () => {
    const { ctl, state, animator } = rig();
    purchaseMembership(state, 'dayPass');
    ctl.startWorkout(150, 5);
    await ctl.performSet();
    expect(animator.reps).toBe(1);
    expect(ctl.session!.totalReps).toBe(0);
    expect(state.character.strength).toBe(5);
    expect(ctl.phase).toBe('rest');
  });

  it('multiple sets accumulate, and resting passes game time and restores energy', async () => {
    const { ctl, state } = rig();
    purchaseMembership(state, 'dayPass');
    ctl.startWorkout(25, 6);
    await ctl.performSet();
    const e1 = state.character.energy;
    const t1 = state.time;
    await ctl.rest(90);
    expect(state.time - t1).toBe(90);
    expect(state.character.energy).toBeGreaterThan(e1);
    await ctl.performSet();
    expect(ctl.session!.completedSets).toBe(2);
    expect(state.gym.lifts.bench?.totalSets).toBe(2);
    expect(state.gym.lifts.bench?.totalReps).toBe(12);
  });

  it('interrupting mid-set banks completed reps proportionally and persists them', async () => {
    const { ctl, state, animator, saves } = rig();
    purchaseMembership(state, 'dayPass');
    ctl.startWorkout(25, 10);
    animator.onRep = (n) => n === 4 && ctl.stopSet(); // user taps "stop" during rep 4
    await ctl.performSet();
    expect(ctl.session!.totalReps).toBe(4); // rep in progress finishes, then stops
    const xp = ctl.session!.xpEarned;
    await ctl.endWorkout();
    expect(ctl.lastSummary).toMatchObject({ sets: 1, reps: 4 });
    expect(ctl.lastSummary!.xp).toBeCloseTo(xp, 1);
    expect(state.gym.lifts.bench).toMatchObject({ totalReps: 4, totalSets: 1 });
    expect(state.character.strength).toBeGreaterThan(5);
    // strength gain is proportional to 4/10 of a full set
    const partial = state.character.strength - 5;
    const full = rig();
    purchaseMembership(full.state, 'dayPass');
    full.ctl.startWorkout(25, 10);
    await full.ctl.performSet();
    expect(partial).toBeCloseTo((full.state.character.strength - 5) * 0.4, 6);
    // and the interrupted result is what is on disk
    expect((await saves.load()).state).toEqual(state);
  });

  it('ending a workout between sets keeps everything already earned', async () => {
    const { ctl, state } = rig();
    purchaseMembership(state, 'dayPass');
    ctl.startWorkout(25, 8);
    await ctl.performSet();
    const snap = JSON.stringify(state.gym.lifts);
    await ctl.endWorkout();
    expect(JSON.stringify(state.gym.lifts)).toBe(snap);
    expect(ctl.session).toBeNull();
    expect(ctl.lastSummary).toMatchObject({ sets: 1, reps: 8 });
  });

  it('stops when out of energy instead of lifting for free', async () => {
    const { ctl, state } = rig();
    purchaseMembership(state, 'dayPass');
    state.character.energy = 9;
    ctl.startWorkout(25, 30);
    await ctl.performSet();
    expect(ctl.session!.totalReps).toBeLessThan(30);
    expect(state.character.energy).toBeGreaterThanOrEqual(0);
  });

  it('leveling up from training emits a level-up event', async () => {
    const { ctl, state, events } = rig();
    purchaseMembership(state, 'dayPass');
    state.character.xp = 55; // 60 XP needed for level 2
    ctl.startWorkout(25, 8);
    await ctl.performSet();
    expect(state.character.level).toBeGreaterThanOrEqual(2);
    expect(events.some((e) => e.kind === 'levelUp')).toBe(true);
  });
});
