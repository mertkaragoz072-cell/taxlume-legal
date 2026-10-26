import { describe, expect, it, vi } from 'vitest';
import type { RepReport, RepResult } from '../animation/benchPress';
import { WorkoutController, type WorkoutAnimator } from '../app/workoutController';
import { EventBus, type GameEvent } from '../core/events';
import { GYM_PRICES } from '../data/exercises';
import { hasMembership, purchaseMembership } from '../fitness/membership';
import { commitRep, planRep } from '../fitness/workout';
import { MemoryStorage, SaveManager } from '../persistence/save';
import { advanceTime } from '../simulation/needs';
import { gymGame } from './helpers';
import { createNewGame, SAVE_VERSION, START_MONEY, type GameState } from '../simulation/state';
import { DAY, HOUR } from '../simulation/time';

class Fake implements WorkoutAnimator {
  calls: string[] = [];
  onRep: (n: number) => void = () => {};
  n = 0;
  setLoad() {}
  async prepareSet() {
    this.calls.push('prepare');
  }
  async playRep(r: RepResult): Promise<RepReport> {
    this.n++;
    this.onRep(this.n);
    await Promise.resolve();
    return { chestReached: true, lockout: r === 'success' };
  }
  async rackBar() {
    this.calls.push('rack');
  }
  async sitUp() {
    this.calls.push('sitUp');
  }
  restoreLying() {
    this.calls.push('restoreLying');
  }
  flush() {}
}

function setup(state: GameState = gymGame()) {
  const bus = new EventBus();
  const events: GameEvent[] = [];
  bus.on((e) => events.push(e));
  const animator = new Fake();
  const saves = new SaveManager(new MemoryStorage());
  const save = vi.fn(() => saves.save(state));
  const ctl = new WorkoutController({ state: () => state, bus, animator, save, changed: () => {}, bodyChanged: () => {}, delay: async () => {} });
  return { state, bus, events, animator, saves, ctl };
}

describe('single authoritative state', () => {
  it('the active session lives in GameState and disappears from it when the workout ends', async () => {
    const { state, ctl } = setup();
    purchaseMembership(state, 'dayPass');
    ctl.startWorkout(25, 8);
    expect(state.workout).not.toBeNull();
    expect(ctl.session).toBe(state.workout);
    await ctl.endWorkout();
    expect(state.workout).toBeNull();
    expect(ctl.session).toBeNull();
    expect(ctl.phase).toBe('none');
  });

  it('there is never an active session while training is prohibited (expiry between sets)', async () => {
    const { state, ctl, saves } = setup();
    purchaseMembership(state, 'dayPass');
    state.gym.membershipUntil = state.time + 60; // 60 s of pass left
    ctl.startWorkout(25, 6);
    await ctl.performSet(); // 6 reps = 30 s
    expect(ctl.canTrain).toBe(true);
    await ctl.rest(90); // pass runs out during the rest
    await new Promise((r) => setTimeout(r, 10));
    expect(hasMembership(state)).toBe(false);
    expect(state.workout).toBeNull();
    expect(ctl.lastSummary).toMatchObject({ sets: 1, reps: 6 }); // completed work was banked
    expect((await saves.load()).state.workout).toBeNull();
  });

  it('an expiry in the middle of a set lets the rep in progress count, then ends and saves the workout', async () => {
    const { state, ctl, animator, saves } = setup();
    purchaseMembership(state, 'dayPass');
    state.gym.membershipUntil = state.time + 12; // enough for 2 reps (5 s each), expires during the 3rd
    ctl.startWorkout(25, 10);
    await ctl.performSet();
    expect(state.workout).toBeNull();
    expect(ctl.lastSummary!.reps).toBeGreaterThanOrEqual(2);
    expect(ctl.lastSummary!.reps).toBeLessThan(10);
    expect(animator.calls.at(-1)).toBe('sitUp');
    const loaded = (await saves.load()).state;
    expect(loaded.workout).toBeNull();
    expect(loaded.gym.lifts.bench?.totalReps).toBe(ctl.lastSummary!.reps);
  });

  it('cannot start a workout without a valid membership, and nothing else changes', () => {
    const { state, ctl } = setup();
    expect(ctl.canTrain).toBe(false);
    expect(ctl.startWorkout(25, 8)).toBe(false);
    expect(state.workout).toBeNull();
    expect(state.money).toBe(START_MONEY);
  });

  it('startWorkout twice does not replace or duplicate the session', () => {
    const { state, ctl } = setup();
    purchaseMembership(state, 'dayPass');
    expect(ctl.startWorkout(25, 8)).toBe(true);
    const first = state.workout;
    expect(ctl.startWorkout(40, 3)).toBe(false);
    expect(state.workout).toBe(first);
  });
});

describe('refresh / reopen restores a valid state', () => {
  it('restores an active session between sets (lying, bar racked) from the save', async () => {
    const a = setup();
    purchaseMembership(a.state, 'dayPass');
    a.ctl.startWorkout(25, 8);
    await a.ctl.performSet();
    const stored = await a.saves.save(a.state).then(() => a.saves.load());
    const b = setup(stored.state);
    await b.ctl.restore();
    expect(b.state.workout).not.toBeNull();
    expect(b.ctl.phase).toBe('rest');
    expect(b.state.workout!.totalReps).toBe(8);
    expect(b.animator.calls).toContain('restoreLying');
  });

  it('banks reps of a set that was in progress when the app closed', async () => {
    const a = setup();
    purchaseMembership(a.state, 'dayPass');
    a.ctl.startWorkout(25, 10);
    const s = a.state.workout!;
    for (let i = 0; i < 4; i++) commitRep(a.state, s, planRep(a.state, s)); // 4 reps, set never closed
    expect(s.setReps).toBe(4);
    const loaded = (await (async () => (await a.saves.save(a.state), a.saves.load()))()).state;
    const b = setup(loaded);
    await b.ctl.restore();
    expect(b.state.gym.lifts.bench).toMatchObject({ totalReps: 4, totalSets: 1 });
    expect(b.state.workout!.setReps).toBe(0);
    expect(b.state.workout!.completedSets).toBe(1);
  });

  it('reopening after the pass expired ends the session safely and keeps the earned progress', async () => {
    const a = setup();
    purchaseMembership(a.state, 'dayPass');
    a.ctl.startWorkout(25, 8);
    await a.ctl.performSet();
    await a.saves.save(a.state);
    const loaded = (await a.saves.load()).state;
    advanceTime(loaded, 2 * DAY); // time passes in a later session
    const b = setup(loaded);
    await b.ctl.restore();
    expect(b.state.workout).toBeNull();
    expect(b.state.gym.lifts.bench?.totalReps).toBe(8);
    expect(b.animator.calls).toContain('sitUp');
  });
});

describe('repeated taps cannot duplicate purchases or rewards', () => {
  it('two simultaneous Start-set calls run exactly one set', async () => {
    const { state, ctl, animator } = setup();
    purchaseMembership(state, 'dayPass');
    ctl.startWorkout(25, 6);
    await Promise.all([ctl.performSet(), ctl.performSet(), ctl.performSet()]);
    expect(animator.n).toBe(6);
    expect(state.gym.lifts.bench?.totalSets).toBe(1);
  });

  it('ending a workout several times banks and reports it once', async () => {
    const { state, ctl, animator } = setup();
    purchaseMembership(state, 'dayPass');
    ctl.startWorkout(25, 8);
    await ctl.performSet();
    await Promise.all([ctl.endWorkout(), ctl.endWorkout(), ctl.endWorkout()]);
    expect(animator.calls.filter((c) => c === 'sitUp')).toHaveLength(1);
    expect(state.gym.lifts.bench?.totalSets).toBe(1);
  });

  it('the character stays lying between sets and only sits up when the workout ends', async () => {
    const { state, ctl, animator } = setup();
    purchaseMembership(state, 'dayPass');
    ctl.startWorkout(25, 5);
    await ctl.performSet();
    await ctl.rest(90);
    await ctl.performSet();
    expect(animator.calls).toEqual(['prepare', 'rack', 'prepare', 'rack']);
    await ctl.endWorkout();
    expect(animator.calls.at(-1)).toBe('sitUp');
  });
});

describe('purchases', () => {
  it('money is deducted exactly once per purchase and logged once', () => {
    const s = createNewGame();
    expect(purchaseMembership(s, 'dayPass')).toBe(true);
    expect(s.money).toBe(START_MONEY - GYM_PRICES.dayPass);
    expect(s.transactions).toHaveLength(1);
  });
  it('insufficient funds: no deduction, no pass, no workout', () => {
    const { state, ctl } = setup();
    state.money = GYM_PRICES.dayPass - 1;
    expect(purchaseMembership(state, 'dayPass')).toBe(false);
    expect(state.money).toBe(GYM_PRICES.dayPass - 1);
    expect(ctl.startWorkout(25, 8)).toBe(false);
  });
  it('is invalid exactly when game time says so', () => {
    const s = createNewGame();
    purchaseMembership(s, 'dayPass');
    advanceTime(s, DAY - HOUR);
    expect(hasMembership(s)).toBe(true);
    advanceTime(s, HOUR);
    expect(hasMembership(s)).toBe(false);
  });
});

describe('save migration v1 → v3 (via v2)', () => {
  const v1 = (extra: object = {}) =>
    JSON.stringify({
      version: 1,
      savedAt: 1,
      state: { time: 9 * HOUR, money: 321, character: { strength: 12.5, level: 3 }, gym: { membershipUntil: 3 * DAY, fatigue: 10, lifts: { bench: { bestWeight: 40, lastWeight: 35, totalReps: 50, totalSets: 7, bestWorkingWeight: 40 } } }, ...extra },
    });
  const mgr = new SaveManager(new MemoryStorage());

  it('keeps all existing progress and adds an empty workout', () => {
    const s = mgr.parse(v1());
    expect(SAVE_VERSION).toBe(3);
    expect(s.version).toBe(3);
    expect(s.money).toBe(321);
    expect(s.character.strength).toBe(12.5);
    expect(s.gym.membershipUntil).toBe(3 * DAY);
    expect(s.gym.lifts.bench?.totalReps).toBe(50);
    expect(s.workout).toBeNull();
  });
  it('round-trips a v2 save with an active workout', async () => {
    const a = setup();
    purchaseMembership(a.state, 'monthly');
    a.ctl.startWorkout(30, 8);
    const st = new SaveManager(new MemoryStorage());
    await st.save(a.state);
    expect((await st.load()).state).toEqual(a.state);
  });
  it('drops a malformed workout instead of crashing', () => {
    const s = mgr.parse(JSON.stringify({ version: 2, state: { workout: { exercise: 'curl', weight: 'x' } } }));
    expect(s.workout).toBeNull();
    const t = mgr.parse(JSON.stringify({ version: 2, state: { workout: { exercise: 'bench', weight: 9999, targetReps: -4, totalReps: 'many' } } }));
    expect(t.workout?.weight).toBe(200);
    expect(t.workout?.targetReps).toBe(1);
    expect(t.workout?.totalReps).toBe(0);
  });
});
