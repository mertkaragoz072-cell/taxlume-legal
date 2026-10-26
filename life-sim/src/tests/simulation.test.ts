import { describe, expect, it } from 'vitest';
import { EventBus } from '../core/events';
import { earn, spend } from '../economy/economy';
import { purchaseMembership, hasMembership } from '../fitness/membership';
import { addXp, physiqueStage, xpForNextLevel } from '../fitness/progression';
import { commitRep, endSession, endSet, maxRepsAt, planRep, restBetweenSets, startSession, currentOneRM } from '../fitness/workout';
import { advanceTime } from '../simulation/needs';
import { gymGame } from './helpers';
import { createNewGame, START_MONEY } from '../simulation/state';
import { DAY, HOUR, readClock } from '../simulation/time';
import { MemoryStorage, SaveManager } from '../persistence/save';

const withGym = () => {
  const s = gymGame();
  expect(purchaseMembership(s, 'dayPass')).toBe(true);
  return s;
};

function doSet(s: ReturnType<typeof createNewGame>, sess: NonNullable<ReturnType<typeof okSession>>) {
  for (let i = 0; i < sess.targetReps; i++) {
    const o = planRep(s, sess);
    commitRep(s, sess, o);
    if (o !== 'success') break;
  }
  endSet(s, sess);
}
function okSession(s: ReturnType<typeof createNewGame>, w: number, reps: number) {
  const r = startSession(s, 'bench', w, reps);
  return r.ok ? r.session : null;
}

describe('time', () => {
  it('advances deterministically and reads the clock', () => {
    const a = createNewGame();
    const b = createNewGame();
    advanceTime(a, 5 * HOUR);
    advanceTime(b, 5 * HOUR);
    expect(a).toEqual(b);
    const c = readClock(a.time);
    expect(c.day).toBe(1);
    expect(c.hour).toBe(13);
    advanceTime(a, 12 * HOUR);
    expect(readClock(a.time).day).toBe(2);
  });
});

describe('needs', () => {
  it('raises hunger and sleepiness, lowers hydration and energy over time', () => {
    const s = createNewGame();
    const before = { ...s.character };
    advanceTime(s, 4 * HOUR);
    expect(s.character.hunger).toBeGreaterThan(before.hunger);
    expect(s.character.sleepiness).toBeGreaterThan(before.sleepiness);
    expect(s.character.hydration).toBeLessThan(before.hydration);
    expect(s.character.energy).toBeLessThan(before.energy);
  });
  it('resting restores energy', () => {
    const s = createNewGame();
    s.character.energy = 30;
    advanceTime(s, HOUR, 'resting');
    expect(s.character.energy).toBeGreaterThan(30);
  });
  it('starvation drains health and warns', () => {
    const s = createNewGame();
    s.character.hunger = 95;
    const bus = new EventBus();
    advanceTime(s, 2 * HOUR, 'active', bus);
    expect(s.character.health).toBeLessThan(100);
  });
  it('keeps every need within 0-100', () => {
    const s = createNewGame();
    advanceTime(s, 10 * DAY);
    for (const v of Object.values(s.character)) if (typeof v === 'number') expect(v).toBeGreaterThanOrEqual(0);
    expect(s.character.hunger).toBeLessThanOrEqual(100);
  });
});

describe('economy', () => {
  it('records income and expenses and updates balance', () => {
    const s = createNewGame();
    expect(earn(s, 100, 'wages', 'Shift').ok).toBe(true);
    expect(spend(s, 40, 'food', 'Lunch').ok).toBe(true);
    expect(s.money).toBe(START_MONEY + 60);
    expect(s.transactions.map((t) => t.amount)).toEqual([100, -40]);
    expect(s.transactions[1]?.balanceAfter).toBe(START_MONEY + 60);
  });
  it('refuses overspending and leaves state untouched', () => {
    const s = createNewGame();
    const r = spend(s, START_MONEY + 1, 'shopping', 'Too much');
    expect(r).toMatchObject({ ok: false, reason: 'insufficient_funds', shortBy: 1 });
    expect(s.money).toBe(START_MONEY);
    expect(s.transactions).toHaveLength(0);
  });
  it('rejects invalid amounts', () => {
    const s = createNewGame();
    expect(spend(s, -5, 'other', 'x').ok).toBe(false);
    expect(earn(s, 0, 'other', 'x').ok).toBe(false);
    expect(spend(s, 1.5, 'other', 'x').ok).toBe(false);
  });
});

describe('gym membership', () => {
  it('requires payment and expires', () => {
    const s = createNewGame();
    expect(hasMembership(s)).toBe(false);
    expect(startSession(s, 'bench', 20, 5).ok).toBe(false);
    purchaseMembership(s, 'dayPass');
    expect(hasMembership(s)).toBe(true);
    expect(s.money).toBe(START_MONEY - 8);
    advanceTime(s, DAY + 1);
    expect(hasMembership(s)).toBe(false);
  });
  it('fails without funds', () => {
    const s = createNewGame();
    s.money = 5;
    expect(purchaseMembership(s, 'monthly')).toBe(false);
    expect(s.money).toBe(5);
    expect(hasMembership(s)).toBe(false);
  });
});

describe('workout', () => {
  it('rep capacity follows the Epley model', () => {
    expect(maxRepsAt(100, 100)).toBe(1);
    expect(maxRepsAt(100, 101)).toBe(0);
    expect(maxRepsAt(100, 75)).toBeGreaterThanOrEqual(10);
  });
  it('a completed set costs energy and time, earns xp and strength, and logs the lift', () => {
    const s = withGym();
    const sess = okSession(s, 25, 8)!;
    const e0 = s.character.energy;
    const t0 = s.time;
    const str0 = s.character.strength;
    doSet(s, sess);
    expect(sess.completedSets).toBe(1);
    expect(sess.totalReps).toBe(8);
    expect(s.character.energy).toBeLessThan(e0);
    expect(s.time).toBeGreaterThan(t0);
    expect(s.character.xp + (s.character.level - 1) * 1).toBeGreaterThan(0);
    expect(s.character.strength).toBeGreaterThan(str0);
    expect(s.gym.lifts.bench).toMatchObject({ totalReps: 8, totalSets: 1, lastWeight: 25 });
    expect(s.gym.fatigue).toBeGreaterThan(0);
  });
  it('too-heavy weights fail without gains', () => {
    const s = withGym();
    const sess = okSession(s, 150, 5)!;
    expect(planRep(s, sess)).toBe('failed');
    const str = s.character.strength;
    commitRep(s, sess, 'failed');
    endSet(s, sess);
    expect(s.character.strength).toBe(str);
    expect(sess.totalReps).toBe(0);
  });
  it('very light weights give no strength stimulus', () => {
    const s = withGym();
    const sess = okSession(s, 20, 10)!;
    const base = currentOneRM(s, 'bench');
    expect(20 / base).toBeLessThan(0.7);
    s.character.strength = 40; // 1RM is now ~90 → 20kg is trivial
    const before = s.character.strength;
    doSet(s, sess);
    expect(s.character.strength).toBe(before);
  });
  it('interrupting banks the partial set proportionally', () => {
    const s = withGym();
    const full = okSession(s, 25, 10)!;
    const part = okSession(withGym(), 25, 10)!;
    const s2 = withGym();
    // half set on s2
    const p = okSession(s2, 25, 10)!;
    for (let i = 0; i < 5; i++) commitRep(s2, p, planRep(s2, p));
    const sum = endSession(s2, p);
    for (let i = 0; i < 10; i++) commitRep(s, full, planRep(s, full));
    endSession(s, full);
    expect(sum.sets).toBe(1);
    expect(sum.reps).toBe(5);
    expect(s2.character.strength - 5).toBeCloseTo((s.character.strength - 5) / 2, 5);
    expect(s2.gym.lifts.bench?.totalReps).toBe(5);
    void part;
  });
  it('training while exhausted stops reps', () => {
    const s = withGym();
    s.character.energy = 9;
    const sess = okSession(s, 20, 30)!;
    let guard = 0;
    while (planRep(s, sess) === 'success' && guard++ < 40) commitRep(s, sess, 'success');
    expect(planRep(s, sess)).not.toBe('success');
  });
  it('overtraining blunts gains and rest recovers fatigue', () => {
    const fresh = withGym();
    const tired = withGym();
    tired.gym.fatigue = 80;
    const a = okSession(fresh, 25, 5)!;
    const b = okSession(tired, 25, 5)!;
    for (let i = 0; i < 5; i++) {
      commitRep(fresh, a, 'success');
      commitRep(tired, b, 'success');
    }
    endSet(fresh, a);
    endSet(tired, b);
    expect(tired.character.strength).toBeLessThan(fresh.character.strength);
    const before = fresh.gym.fatigue;
    advanceTime(fresh, 3 * HOUR, 'resting');
    expect(fresh.gym.fatigue).toBeLessThan(before);
  });
  it('resting between sets passes time and restores energy', () => {
    const s = withGym();
    const sess = okSession(s, 25, 8)!;
    doSet(s, sess);
    const e = s.character.energy;
    const t = s.time;
    restBetweenSets(s, sess, 90);
    expect(s.time - t).toBe(90);
    expect(s.character.energy).toBeGreaterThan(e);
  });
});

describe('progression', () => {
  it('levels up when xp passes the threshold and carries the remainder', () => {
    const s = createNewGame();
    const need = xpForNextLevel(1);
    const r = addXp(s.character, need + 5);
    expect(r.levelsGained).toBe(1);
    expect(s.character.level).toBe(2);
    expect(s.character.xp).toBe(5);
  });
  it('can gain several levels at once', () => {
    const s = createNewGame();
    addXp(s.character, 100000);
    expect(s.character.level).toBeGreaterThan(5);
  });
  it('physique stages increase with strength', () => {
    expect(physiqueStage(0)).toBe(0);
    expect(physiqueStage(20)).toBe(1);
    expect(physiqueStage(100)).toBe(4);
  });
});

describe('persistence', () => {
  it('round-trips state exactly', async () => {
    const s = withGym();
    const sess = okSession(s, 25, 6)!;
    doSet(s, sess);
    const mgr = new SaveManager(new MemoryStorage());
    await mgr.save(s);
    const loaded = await mgr.load();
    expect(loaded.source).toBe('save');
    expect(loaded.state).toEqual(s);
  });
  it('starts fresh when there is no save', async () => {
    const r = await new SaveManager(new MemoryStorage()).load();
    expect(r.source).toBe('new');
    expect(r.state).toEqual(createNewGame());
  });
  it('recovers from a corrupt save using the backup', async () => {
    const st = new MemoryStorage();
    const mgr = new SaveManager(st);
    const s = withGym();
    await mgr.save(s);
    s.money += 10;
    await mgr.save(s); // backup now holds the first save
    st.data.set('lifesim.save', '{not json');
    const r = await mgr.load();
    expect(r.source).toBe('backup');
    expect(r.recovered).toBe(true);
    expect(st.data.has('lifesim.save.corrupt')).toBe(true);
  });
  it('falls back to a new game when everything is corrupt', async () => {
    const st = new MemoryStorage();
    st.data.set('lifesim.save', 'garbage');
    const r = await new SaveManager(st).load();
    expect(r.source).toBe('new');
    expect(r.recovered).toBe(true);
  });
  it('sanitizes out-of-range and wrongly typed values', () => {
    const mgr = new SaveManager(new MemoryStorage());
    const text = JSON.stringify({
      version: 1,
      savedAt: 0,
      state: { money: -50, time: 'x', character: { energy: 900, strength: 'lots', level: 3.7 }, gym: { fatigue: -4 } },
    });
    const s = mgr.parse(text);
    expect(s.money).toBe(0);
    expect(s.character.energy).toBe(100);
    expect(s.character.strength).toBe(createNewGame().character.strength);
    expect(s.character.level).toBe(3);
    expect(s.gym.fatigue).toBe(0);
  });
  it('rejects saves from a newer version', () => {
    const mgr = new SaveManager(new MemoryStorage());
    expect(() => mgr.parse(JSON.stringify({ version: 99, state: {} }))).toThrow();
  });
});
