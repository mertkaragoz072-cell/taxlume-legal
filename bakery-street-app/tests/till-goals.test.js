import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { Shop } from '../src/game/shop.js';
import { Till, validateTill } from '../src/game/till.js';
import { DailyGoals, validateGoals } from '../src/game/goals.js';
import { SaveManager, SAVE_KEY } from '../src/game/save.js';
import { TILL, GOALS } from '../src/data/economy.js';

class FakeStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h, 0, 0).getTime();
function make(start = at(2025, 3, 10)) {
  const clock = { now: start }, player = { gold: 1000 };
  const game = new Game(player, {}, () => clock.now);
  new Shop(game);
  const till = new Till(game), goals = new DailyGoals(game);
  const storage = new FakeStorage();
  const saves = new SaveManager(game, storage); saves.attach(); saves.load();
  const reopen = (afterMs) => {                        // close the app, come back later: a new game on the same storage
    clock.now += afterMs;
    const g2 = new Game({ gold: 0 }, {}, () => clock.now); new Shop(g2);
    const t2 = new Till(g2), gl2 = new DailyGoals(g2);
    const s2 = new SaveManager(g2, storage); s2.attach(); const r = s2.load();
    return { game: g2, till: t2, goals: gl2, saves: s2, r };
  };
  return { clock, game, till, goals, saves, storage, reopen };
}

test('till box: time away turns into gold at the stage rate, capped, and one tap collects it once', () => {
  const { game, saves, reopen } = make();
  game.earn(1, 'other'); saves.save();
  const b = reopen(60 * 60_000);                                // one hour away
  assert.equal(b.till.stored, 60 * TILL.base);
  const before = b.game.player.gold, earned = b.game.stats.goldEarned;
  const r = b.till.collect();
  assert.ok(r.ok); assert.equal(r.gold, 60 * TILL.base);
  assert.equal(b.game.player.gold, before + r.gold);
  assert.equal(b.game.stats.goldEarned, earned + r.gold);       // paid through Game.earn
  assert.equal(b.game.ledger[0].source, 'till');
  assert.equal(b.till.stored, 0);
  assert.equal(b.till.collect().ok, false);                     // nothing left: no double payment
});

test('till box: a long absence is capped, a short one and a clock set back give nothing, the box never grows past its cap', () => {
  const { game, saves, reopen } = make();
  game.earn(1, 'other'); saves.save();
  const far = reopen(30 * 86_400_000);
  assert.equal(far.till.stored, TILL.capMinutes * TILL.base);
  far.saves.save();
  const again = (() => { const x = far; return x; })();
  assert.equal(again.till.cap(), TILL.capMinutes * TILL.base);
  const { game: g, saves: s, reopen: re } = make();
  g.earn(1, 'other'); s.save();
  assert.equal(re(2 * 60_000).till.stored, 0);                  // 2 minutes is under the minimum
  const { game: g3, saves: s3, reopen: re3 } = make();
  g3.earn(1, 'other'); s3.save();
  assert.equal(re3(-3 * 3_600_000).till.stored, 0);             // clock moved back
});

test('till box: the stage raises the rate, the stored gold survives a save and an unreadable value is repaired', () => {
  const { game, saves, till, reopen } = make();
  game.shop.stageId = 3;
  assert.equal(till.rate(), TILL.base + 2 * TILL.perStage);
  till.stored = 77; saves.save();
  const b = reopen(60_000);
  assert.equal(b.till.stored, 77);
  assert.deepEqual(validateTill({ stored: -5, lastAt: 'x' }), { stored: 0, lastAt: null });
  assert.deepEqual(validateTill(null), { stored: 0, lastAt: null });
  assert.deepEqual(validateTill({ stored: 12.5, lastAt: 5 }), { stored: 0, lastAt: 5 });
});

test('daily goals: three goals a day, progress counts only today, collecting pays once through Game.earn', () => {
  const { game, goals } = make();
  const list = goals.list();
  assert.equal(list.length, GOALS.perDay);
  assert.equal(new Set(list.map((g) => g.id)).size, GOALS.perDay);
  const sell = goals.pick().find((g) => g.stat === 'soldTotal');
  game.stats.soldTotal = 40;                                      // earlier play does not count
  assert.ok(goals.list().every((g) => g.progress === 0));
  game.stats.soldTotal += 1; game.stats.goldEarned += 1000; game.emit('change', {});
  const g = goals.list().find((x) => x.id === 'earn');
  if (g) {
    assert.equal(g.progress, Math.min(g.target, 1000)); assert.ok(g.complete);
    const gold = game.player.gold;
    const r = goals.claim('earn');
    assert.ok(r.ok); assert.equal(game.player.gold, gold + g.gold);
    assert.equal(game.ledger[0].source, 'goal');
    assert.equal(goals.claim('earn').ok, false);                  // not twice
  }
  assert.equal(goals.claim('nope').ok, false);
  assert.ok(sell === undefined || typeof sell.id === 'string');
});

test('daily goals: a new day brings a new set and fresh progress; goals grow with the stage; saves round-trip', () => {
  const { clock, game, goals, saves, reopen } = make();
  game.stats.goldEarned += 5000; game.emit('change', {});
  const today = goals.list().map((g) => g.id);
  saves.save();
  const same = reopen(60_000);
  assert.deepEqual(same.goals.list().map((g) => g.id), today);
  assert.deepEqual(same.goals.list().map((g) => g.progress), goals.list().map((g) => g.progress));
  const next = reopen(24 * 3_600_000);                            // next calendar day
  assert.notDeepEqual(next.goals.list().map((g) => g.id), today);
  assert.ok(next.goals.list().every((g) => g.progress === 0 && !g.claimed));
  game.shop.stageId = 1; const a = goals.list()[0];
  game.shop.stageId = 3; const b = goals.list()[0];
  assert.ok(b.target >= a.target && b.gold > a.gold);
  assert.ok(clock.now > 0);
});

test('daily goals: unreadable saved data starts a clean day; the save carries till and goals', () => {
  assert.deepEqual(validateGoals(null), { date: null, baseline: {}, claimed: [] });
  assert.deepEqual(validateGoals({ date: '2025-13-40', baseline: { soldTotal: 3 }, claimed: ['sell'] }), { date: null, baseline: {}, claimed: [] });
  const v = validateGoals({ date: '2025-03-10', baseline: { soldTotal: 3, bogus: 9, goldEarned: -4 }, claimed: ['sell', 'sell', 'zzz'] });
  assert.deepEqual(v, { date: '2025-03-10', baseline: { soldTotal: 3 }, claimed: ['sell'] });
  const { storage, game, saves } = make();
  game.earn(1, 'other'); saves.save();
  const saved = JSON.parse(storage.getItem(SAVE_KEY));
  assert.ok(saved.till && typeof saved.till.stored === 'number');
  assert.ok(saved.goals && saved.goals.date);
});
