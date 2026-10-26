import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { DailyReward, dateKey, dayNumber, validateDaily } from '../src/game/daily.js';
import { Quests } from '../src/game/quests.js';
import { SaveManager, SAVE_KEY, SAVE_VERSION } from '../src/game/save.js';
import { DAILY, INGREDIENTS } from '../src/data/economy.js';

class FakeStorage {
  constructor() { this.m = new Map(); this.failKeys = new Set(); this.failAll = false; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { if (this.failAll || this.failKeys.has(k)) throw new Error('QuotaExceededError'); this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
/** Local-time timestamp: hour/minute matter for "same day" tests. */
const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();

function make(start = at(2024, 3, 10, 9), gold = 1000) {
  const clock = { now: start }, player = { gold, gems: 50 };
  const game = new Game(player, {}, () => clock.now);
  const daily = new DailyReward(game);
  return { game, player, daily, clock, set: (ms) => { clock.now = ms; } };
}

test('the cycle has seven days and every reward is gold, gems and/or known ingredients', () => {
  assert.equal(DAILY.length, 7);
  const kinds = new Set();
  for (const r of DAILY) {
    assert.ok(r.gold || r.gems || r.ingredients, 'reward must give something');
    for (const k of ['gold', 'gems']) if (r[k] !== undefined) assert.ok(Number.isInteger(r[k]) && r[k] > 0);
    for (const [id, n] of Object.entries(r.ingredients ?? {})) { assert.ok(INGREDIENTS[id], id); assert.ok(n > 0); }
    for (const k of ['gold', 'gems', 'ingredients']) if (r[k]) kinds.add(k);
  }
  assert.deepEqual([...kinds].sort(), ['gems', 'gold', 'ingredients']);   // all three reward types are used
});

test('date helpers: local date keys, real-date validation, day arithmetic across month, year and leap boundaries', () => {
  assert.equal(dateKey(at(2024, 1, 5, 0, 1)), '2024-01-05');
  assert.equal(dateKey(at(2024, 1, 5, 23, 59)), '2024-01-05');
  assert.equal(dayNumber('2024-02-01') - dayNumber('2024-01-31'), 1);
  assert.equal(dayNumber('2025-01-01') - dayNumber('2024-12-31'), 1);
  assert.equal(dayNumber('2024-03-01') - dayNumber('2024-02-29'), 1);      // leap day exists in 2024
  assert.equal(dayNumber('2023-03-01') - dayNumber('2023-02-28'), 1);      // and not in 2023
  assert.ok(Number.isNaN(dayNumber('2023-02-29')));
  assert.ok(Number.isNaN(dayNumber('2024-13-01')));
  assert.ok(Number.isNaN(dayNumber('hello')));
  assert.ok(Number.isNaN(dayNumber(null)));
});

test('first ever claim: day 1 reward is given and applied to the shared gold', () => {
  const c = make();
  assert.deepEqual({ canClaim: c.daily.status().canClaim, nextDay: c.daily.status().nextDay }, { canClaim: true, nextDay: 1 });
  const r = c.daily.claim();
  assert.equal(r.ok, true); assert.equal(r.day, 1);
  assert.equal(c.player.gold, 1000 + DAILY[0].gold);
  assert.deepEqual(c.daily.exportState(), { lastDate: '2024-03-10', day: 1, lastAt: c.clock.now });
});

test('a second claim on the same day is refused and gives nothing, even much later that day', () => {
  const c = make(at(2024, 3, 10, 0, 5));
  c.daily.claim();
  const gold = c.player.gold, gems = c.player.gems, snapshot = JSON.stringify(c.game.exportState());
  for (const t of [at(2024, 3, 10, 0, 5), at(2024, 3, 10, 12), at(2024, 3, 10, 23, 59)]) {
    c.set(t);
    assert.equal(c.daily.status().canClaim, false);
    const again = c.daily.claim();
    assert.equal(again.ok, false); assert.equal(again.reason, 'claimed');
  }
  assert.equal(c.player.gold, gold); assert.equal(c.player.gems, gems);
  assert.equal(JSON.stringify(c.game.exportState()), snapshot);        // nothing changed at all
});

test('when the date changes a new reward opens: the next day of the cycle', () => {
  const c = make(at(2024, 3, 10, 23, 58));
  c.daily.claim();
  c.set(at(2024, 3, 11, 0, 2));                                         // four minutes later, but a new calendar day
  assert.equal(c.daily.status().canClaim, true);
  assert.equal(c.daily.status().nextDay, 2);
  const flour = c.game.ingredients.flour, milk = c.game.ingredients.milk, inv = c.game.ingredients;
  const r = c.daily.claim();
  assert.equal(r.day, 2);
  assert.equal(c.game.ingredients.flour, flour + DAILY[1].ingredients.flour);   // ingredients go into the shared inventory
  assert.equal(c.game.ingredients.milk, milk + DAILY[1].ingredients.milk);
  assert.equal(c.game.ingredients, inv);
});

test('seven consecutive days walk the whole cycle and day 8 starts over at day 1', () => {
  const c = make(at(2024, 3, 1));
  for (let i = 0; i < 14; i++) {
    c.set(at(2024, 3, 1 + i));
    const expectedDay = (i % 7) + 1, def = DAILY[expectedDay - 1];
    const gold = c.player.gold, gems = c.player.gems, inv = { ...c.game.ingredients };
    const r = c.daily.claim();
    assert.equal(r.ok, true, `day ${i + 1}`);
    assert.equal(r.day, expectedDay);
    assert.equal(c.player.gold, gold + (def.gold ?? 0));
    assert.equal(c.player.gems, gems + (def.gems ?? 0));
    for (const [id, n] of Object.entries(def.ingredients ?? {})) assert.equal(c.game.ingredients[id], inv[id] + n);
    assert.equal(r.streakBroken, false);
  }
});

test('gems from the daily reward are added to the player gems', () => {
  const c = make(at(2024, 3, 1));
  c.daily.lastDate = '2024-02-29'; c.daily.day = 3;                      // yesterday was day 3 -> today is day 4 (5 gems)
  c.daily.claim();
  assert.equal(c.player.gems, 55);
  c.set(at(2024, 3, 2)); c.daily.claim(); c.set(at(2024, 3, 3)); c.daily.claim();   // day 5, day 6
  c.set(at(2024, 3, 4));
  const r = c.daily.claim();                                             // day 7: 20 gems + 1000 gold
  assert.equal(r.day, 7);
  assert.equal(c.player.gems, 75);
});

test('missed-day rule: skipping one or more days restarts the cycle at day 1 (and says so)', () => {
  for (const skip of [2, 3, 10, 400]) {
    const c = make(at(2024, 3, 1));
    c.daily.lastDate = '2024-03-01'; c.daily.day = 5;
    c.set(at(2024, 3, 1) + skip * 86_400_000 + 3_600_000);
    const s = c.daily.status();
    assert.equal(s.nextDay, 1, `skipped ${skip - 1} day(s)`);
    assert.equal(s.streakBroken, true);
    const r = c.daily.claim();
    assert.equal(r.day, 1); assert.equal(r.streakBroken, true);
    assert.equal(c.daily.day, 1);
  }
});

test('missing exactly one day (claim on day N, nothing on N+1, claim on N+2) restarts; claiming every day does not', () => {
  const c = make(at(2024, 5, 1)); c.daily.claim(); c.set(at(2024, 5, 2)); c.daily.claim();          // days 1, 2
  c.set(at(2024, 5, 4)); assert.equal(c.daily.claim().day, 1);                                       // skipped May 3rd
  c.set(at(2024, 5, 5)); assert.equal(c.daily.claim().day, 2);                                       // back to a streak
});

test('day 7 followed by a missed day also restarts at day 1; day 7 followed by the next day wraps to 1', () => {
  const a = make(at(2024, 3, 8)); a.daily.lastDate = '2024-03-07'; a.daily.day = 7;
  assert.equal(a.daily.claim().day, 1);
  const b = make(at(2024, 3, 9)); b.daily.lastDate = '2024-03-07'; b.daily.day = 7;
  const r = b.daily.claim(); assert.equal(r.day, 1); assert.equal(r.streakBroken, true);
});

test('month, year and leap-day boundaries continue the streak', () => {
  for (const [from, to] of [[[2024, 1, 31], [2024, 2, 1]], [[2024, 12, 31], [2025, 1, 1]], [[2024, 2, 28], [2024, 2, 29]], [[2024, 2, 29], [2024, 3, 1]], [[2023, 2, 28], [2023, 3, 1]]]) {
    const c = make(at(...from)); c.daily.claim();
    c.set(at(...to, 0, 30));
    const r = c.daily.claim();
    assert.equal(r.day, 2, `${from} -> ${to}`);
  }
});

test('daylight-saving shifts do not break day counting (23h / 25h days)', () => {
  for (const [a, b] of [[[2024, 3, 30], [2024, 3, 31]], [[2024, 10, 26], [2024, 10, 27]], [[2024, 3, 9], [2024, 3, 10]], [[2024, 11, 2], [2024, 11, 3]]]) {
    const c = make(at(...a, 23, 50)); c.daily.claim();
    c.set(at(...b, 0, 10));
    assert.equal(c.daily.status().canClaim, true);
    assert.equal(c.daily.claim().day, 2);
  }
});

test('clock moved back: one day (time-zone change) still counts as claimed; more than a day allows a new cycle', () => {
  const c = make(at(2024, 3, 10)); c.daily.claim();
  c.set(at(2024, 3, 9, 20));                                              // a day earlier (e.g. travelled west)
  assert.equal(c.daily.status().canClaim, false);
  c.set(at(2024, 3, 1));                                                  // clock set far back: no new claim (a second 'day 1' for free), until it catches up
  const s = c.daily.status();
  assert.equal(s.canClaim, false); assert.equal(s.clockBack, true);
  const gold = c.player.gold;
  assert.equal(c.daily.claim().ok, false); assert.equal(c.player.gold, gold);
  c.set(at(2024, 3, 11));                                                 // time moves on normally: the next day's reward opens
  assert.equal(c.daily.status().canClaim, true);
  assert.equal(c.daily.claim().day, 2);
});

test('a clock set absurdly far forward and then corrected does not lock the daily reward for years', () => {
  const c = make(at(2030, 3, 10)); c.daily.claim();                       // claimed with a wrong clock in 2030
  c.set(at(2024, 3, 10));                                                 // the player fixes the date
  assert.equal(c.daily.status().canClaim, true);
});

// ---------------------------------------------------------------------------------- persistence
function session(storage, clock, gold = 1000) {
  const player = { gold, gems: 50 }, game = new Game(player, {}, () => clock.now);
  const daily = new DailyReward(game); new Quests(game);
  const problems = [];
  const mgr = new SaveManager(game, storage, { onProblem: (p) => problems.push(p) });
  return { game, player, daily, mgr, problems };
}

test('last reward date, cycle day, gold, gems and inventory survive a reload; the same day cannot be claimed again', () => {
  const st = new FakeStorage(), clock = { now: at(2024, 3, 10, 9) };
  const a = session(st, clock); a.mgr.load(); a.mgr.attach();
  a.daily.claim(); clock.now = at(2024, 3, 11, 9); a.daily.claim();       // day 1, day 2
  const before = a.game.exportState();
  const b = session(st, clock, 0); assert.equal(b.mgr.load().status, 'loaded');
  assert.deepEqual({ ...b.daily.exportState(), lastAt: 0 }, { lastDate: '2024-03-11', day: 2, lastAt: 0 });
  assert.equal(b.player.gold, before.gold); assert.equal(b.player.gems, before.gems);
  assert.deepEqual(b.game.ingredients, before.ingredients);
  assert.equal(b.daily.claim().ok, false);                                // same day after reload
  clock.now = at(2024, 3, 12, 9);
  assert.equal(b.daily.claim().day, 3);                                   // next day continues the cycle after the reload
});

test('closing the app for days applies the missed-day rule on the next start', () => {
  const st = new FakeStorage(), clock = { now: at(2024, 3, 10, 9) };
  const a = session(st, clock); a.mgr.load(); a.mgr.attach(); a.daily.claim();
  clock.now = at(2024, 3, 20, 9);
  const b = session(st, clock); b.mgr.load();
  assert.equal(b.daily.status().canClaim, true);
  assert.equal(b.daily.status().streakBroken, true);
  assert.equal(b.daily.claim().day, 1);
});

test('claiming is saved in one snapshot (date, day and rewards together)', () => {
  const st = new FakeStorage(), clock = { now: at(2024, 3, 10, 9) };
  const a = session(st, clock, 0); a.mgr.load(); a.mgr.attach(); a.daily.claim();
  const saved = JSON.parse(st.getItem(SAVE_KEY));
  assert.equal(saved.version, SAVE_VERSION);
  assert.deepEqual({ ...saved.daily, lastAt: 0 }, { lastDate: '2024-03-10', day: 1, lastAt: 0 });
  assert.equal(saved.gold, DAILY[0].gold);
  assert.equal(saved.gems, 50);
});

test('older saves (no gems / no daily section) load: gems keep the starting value, reward is claimable', () => {
  const st = new FakeStorage(), clock = { now: at(2024, 3, 10) };
  st.setItem(SAVE_KEY, JSON.stringify({ version: 4, gold: 500, ingredients: {}, products: {}, jobs: {}, upgrades: {}, stats: {}, quests: { claimed: [] } }));
  const s = session(st, clock);
  assert.equal(s.mgr.load().status, 'loaded');
  assert.equal(s.player.gems, 50);
  assert.equal(s.daily.status().canClaim, true);
});

test('invalid daily or gem data in a save is rejected (backed up) instead of being trusted', () => {
  const bad = [
    { daily: { lastDate: '2024-02-31', day: 2 } }, { daily: { lastDate: 'yesterday', day: 1 } }, { daily: { lastDate: '2024-03-10', day: 9 } },
    { daily: { lastDate: '2024-03-10', day: 0 } }, { daily: { lastDate: null, day: 3 } }, { daily: 'x' }, { gems: -5 }, { gems: 1.5 },
  ];
  for (const extra of bad) {
    const st = new FakeStorage(), clock = { now: at(2024, 3, 10) };
    st.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, gold: 5, ingredients: {}, products: {}, jobs: {}, upgrades: {}, stats: {}, ...extra }));
    const s = session(st, clock);
    assert.equal(s.mgr.load().status, 'corrupt', JSON.stringify(extra));
    assert.equal(s.daily.lastDate, null);
  }
  assert.throws(() => validateDaily({ lastDate: '2024-03-10', day: 0 }));
  assert.deepEqual(validateDaily(undefined), { lastDate: null, day: 0, lastAt: null });
});

test('if saving fails the claim still works in memory, the player is warned, and it cannot be claimed twice', () => {
  const st = new FakeStorage(), clock = { now: at(2024, 3, 10, 9) };
  const a = session(st, clock); a.mgr.load(); a.mgr.attach();
  st.failAll = true;
  assert.equal(a.daily.claim().ok, true);
  assert.equal(a.daily.claim().ok, false);
  assert.ok(a.problems.some((p) => p.kind === 'write'));
});

// ---------------------------------------------------------------------------------- confirmed reset
test('progress reset never happens without confirmation', () => {
  const st = new FakeStorage(), clock = { now: at(2024, 3, 10) };
  const a = session(st, clock); a.mgr.load(); a.mgr.attach(); a.daily.claim();
  const before = st.getItem(SAVE_KEY), state = JSON.stringify(a.game.exportState());
  for (const arg of [undefined, {}, { confirmed: false }, { confirmed: 'yes' }, { confirmed: 1 }]) {
    const r = a.mgr.reset(arg);
    assert.equal(r.ok, false); assert.equal(r.reason, 'unconfirmed');
  }
  assert.equal(st.getItem(SAVE_KEY), before);
  assert.equal(JSON.stringify(a.game.exportState()), state);
});

test('a confirmed reset restores a fresh game (including daily reward and gems), keeps a backup and saves the new state', () => {
  const st = new FakeStorage(), clock = { now: at(2024, 3, 10) };
  const a = session(st, clock); a.mgr.load(); a.mgr.attach();
  a.daily.claim(); a.game.buyIngredient('flour', 5); a.game.products.bread = 9; a.game.upgrades.ovenCapacity = 2; a.game.player.gems = 999;
  a.game.emit('change', {});
  const old = st.getItem(SAVE_KEY);
  const r = a.mgr.reset({ confirmed: true });
  assert.equal(r.ok, true);
  assert.equal(a.player.gold, 1000); assert.equal(a.player.gems, 50);
  assert.equal(a.game.ingredients.flour, INGREDIENTS.flour.start);
  assert.equal(a.game.products.bread, 2); assert.equal(a.game.upgrades.ovenCapacity, 0);
  assert.equal(a.daily.status().canClaim, true);                          // today's reward is available again
  assert.equal(st.getItem('bakery-street:save.before-reset'), old);       // the old progress is not lost
  assert.equal(JSON.parse(st.getItem(SAVE_KEY)).gold, 1000);
  const b = session(st, clock, 0); b.mgr.load();
  assert.equal(b.player.gold, 1000);                                      // and the reset survives a reload
});

test('if the backup cannot be written the reset is refused and nothing changes', () => {
  const st = new FakeStorage(), clock = { now: at(2024, 3, 10) };
  const a = session(st, clock); a.mgr.load(); a.mgr.attach(); a.daily.claim();
  st.failKeys.add('bakery-street:save.before-reset');
  const r = a.mgr.reset({ confirmed: true });
  assert.equal(r.ok, false); assert.equal(r.reason, 'backup');
  assert.equal(a.daily.lastDate, '2024-03-10');
  assert.equal(a.player.gold, 1000 + DAILY[0].gold);
});
