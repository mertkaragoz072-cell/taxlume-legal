import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { SaveManager, validate, SAVE_KEY, BACKUP_KEY, SAVE_VERSION } from '../src/game/save.js';
import { INGREDIENTS, PRODUCTS } from '../src/data/economy.js';

class FakeStorage {
  constructor() { this.data = new Map(); this.failWrites = false; this.failReads = false; this.failBackup = false; }
  getItem(k) { if (this.failReads) throw new Error('blocked'); return this.data.has(k) ? this.data.get(k) : null; }
  setItem(k, v) {
    if (this.failWrites || (this.failBackup && k === BACKUP_KEY)) throw new Error('QuotaExceededError');
    this.data.set(k, String(v));
  }
  removeItem(k) { this.data.delete(k); }
}

/** One "app session": a fresh Game + SaveManager over shared storage and a shared fake wall clock. */
function session(storage, clock, gold = 54320) {
  const player = { gold };
  const game = new Game(player, {}, () => clock.now);
  const problems = [];
  const mgr = new SaveManager(game, storage, { onProblem: (p) => problems.push(p), onRecover: () => problems.push({ kind: 'recovered' }) });
  return { game, player, mgr, problems };
}
const T0 = 1_700_000_000_000;

test('a new game starts from the data tables and writes a first save', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const s = session(st, clock);
  assert.equal(s.mgr.load().status, 'new');
  const saved = JSON.parse(st.getItem(SAVE_KEY));
  assert.equal(saved.version, SAVE_VERSION);
  assert.equal(saved.gold, 54320);
  assert.equal(saved.ingredients.flour, INGREDIENTS.flour.start);
});

test('gold, ingredient stock, product stock and a running job survive a reload', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const a = session(st, clock); a.mgr.load(); a.mgr.attach();
  a.game.buyIngredient('butter', 3);
  assert.ok(a.game.startProduction('cake').ok);               // job + ingredients consumed in one snapshot
  a.game.sellProduct('bread', 1);
  const before = a.game.exportState();

  clock.now += 10_000;                                          // 10 s later, app was closed and reopened
  const b = session(st, clock, 0);                              // note: a different starting gold; the save must win
  assert.equal(b.mgr.load().status, 'loaded');
  const after = b.game.exportState();
  assert.equal(after.gold, before.gold);
  assert.deepEqual(after.ingredients, before.ingredients);
  assert.deepEqual(after.products, before.products);
  assert.deepEqual(after.jobs, before.jobs);
  assert.equal(Math.round(b.game.remaining('oven')), PRODUCTS.cake.time - 10);   // real time passed while away
});

test('production keeps counting real time while the app is closed and completes exactly once', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const a = session(st, clock); a.mgr.load(); a.mgr.attach();
  a.game.startProduction('croissant');
  const flourAfterStart = a.game.ingredients.flour;

  clock.now += (PRODUCTS.croissant.time + 500) * 1000;          // away much longer than the recipe
  const b = session(st, clock); b.mgr.load(); b.mgr.attach();
  b.game.tick(); b.game.tick(); b.game.tick();
  assert.equal(b.game.products.croissant, 1);                   // credited once, not three times
  assert.equal(b.game.ingredients.flour, flourAfterStart);      // not charged again
  assert.deepEqual(b.game.jobs, {});

  const c = session(st, clock); c.mgr.load(); c.game.tick();    // third launch
  assert.equal(c.game.products.croissant, 1);
  assert.equal(c.game.ingredients.flour, flourAfterStart);
});

test('completion that was never saved is not duplicated when the old save is reloaded', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const a = session(st, clock); a.mgr.load(); a.mgr.attach();
  a.game.startProduction('bread');
  clock.now += 60_000;
  st.failWrites = true;
  a.game.tick();                                                // completes in memory, save fails
  assert.equal(a.game.products.bread, PRODUCTS.bread.start + 1);
  st.failWrites = false;
  const b = session(st, clock); b.mgr.load(); b.game.tick();    // reload from the older snapshot (job still inside)
  assert.equal(b.game.products.bread, PRODUCTS.bread.start + 1);   // still exactly one extra bread
});

test('starting production twice does not charge ingredients twice', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const s = session(st, clock); s.mgr.load(); s.mgr.attach();
  const flour = s.game.ingredients.flour;
  assert.ok(s.game.startProduction('bread').ok);
  assert.equal(s.game.startProduction('bread').ok, false);      // double tap
  assert.equal(s.game.startProduction('cake').ok, false);       // same oven
  assert.equal(s.game.ingredients.flour, flour - PRODUCTS.bread.ingredients.flour);
});

test('a finished product is added to stock exactly once per job', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const s = session(st, clock); s.mgr.load(); s.mgr.attach();
  s.game.startProduction('coffee');
  clock.now += PRODUCTS.coffee.time * 1000;
  let events = 0; s.game.on('complete', () => events++);
  s.game.tick(); s.game.tick();
  assert.equal(events, 1);
  assert.equal(s.game.products.coffee, 1);
});

test('device clock set backwards neither stalls nor completes a job early', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const s = session(st, clock); s.mgr.load();
  s.game.startProduction('bread');
  clock.now -= 3600_000;                                        // clock jumps back one hour
  s.game.tick();
  assert.equal(s.game.products.bread, PRODUCTS.bread.start);    // no early credit
  assert.ok(s.game.remaining('oven') <= PRODUCTS.bread.time);
  clock.now += PRODUCTS.bread.time * 1000;
  s.game.tick();
  assert.equal(s.game.products.bread, PRODUCTS.bread.start + 1);   // countdown restarted from the new time, not stuck for an hour
});

test('a failed write keeps progress in memory, reports a clear message and recovers later', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const s = session(st, clock); s.mgr.load(); s.mgr.attach();
  st.failWrites = true;
  const r = s.game.buyIngredient('flour', 2);
  assert.equal(r.ok, true);                                      // the game keeps working
  assert.equal(s.game.ingredients.flour, INGREDIENTS.flour.start + 2);
  const err = s.problems.find((p) => p.kind === 'write');
  assert.ok(err, 'player was told');
  assert.match(err.message, /İlerleme kaydedilemedi/);
  assert.equal(s.mgr.failing, true);
  const stored = JSON.parse(st.getItem(SAVE_KEY));
  assert.equal(stored.ingredients.flour, INGREDIENTS.flour.start);   // last good save untouched
  st.failWrites = false;
  s.game.sellProduct('bread', 1);
  assert.equal(s.mgr.failing, false);
  assert.ok(s.problems.some((p) => p.kind === 'recovered'));
  assert.equal(JSON.parse(st.getItem(SAVE_KEY)).ingredients.flour, INGREDIENTS.flour.start + 2);   // newest state written
});

test('a corrupt save is backed up and reported, not silently reset', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  st.setItem(SAVE_KEY, '{"version":1,"gold":"lots"');           // truncated JSON
  const s = session(st, clock);
  const res = s.mgr.load();
  assert.equal(res.status, 'corrupt');
  assert.match(res.message, /bozuk/);
  assert.equal(st.getItem(BACKUP_KEY), '{"version":1,"gold":"lots"');   // original text preserved
  assert.ok(s.problems.some((p) => p.kind === 'corrupt'));
});

test('invalid values are rejected by validation (negative, fractional, NaN, wrong station, unknown product)', () => {
  const game = new Game({ gold: 0 }, {}, () => T0);
  const base = () => ({ version: 1, gold: 100, ingredients: {}, products: {}, jobs: {} });
  const bad = [
    { ...base(), gold: -5 }, { ...base(), gold: 1.5 }, { ...base(), gold: null },
    { ...base(), ingredients: { flour: -1 } }, { ...base(), ingredients: { flour: NaN } },
    { ...base(), products: { bread: '3' } },
    { ...base(), jobs: { oven: { product: 'coffee', startedAt: T0 } } },
    { ...base(), jobs: { oven: { product: 'nope', startedAt: T0 } } },
    { ...base(), jobs: { oven: { product: 'bread', startedAt: 'x' } } },
    { ...base(), version: 'a' }, null, 'text',
  ];
  for (const b of bad) assert.throws(() => validate(b, game));
  assert.equal(game.player.gold, 0);                             // validation never mutates the game
  const ok = validate({ ...base(), ingredients: { flour: 3 } }, game);
  assert.equal(ok.ingredients.flour, 3);
  assert.equal(ok.ingredients.butter, INGREDIENTS.butter.start); // missing entries fall back to start values
});

test('a save from a newer version is never overwritten', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const future = JSON.stringify({ version: SAVE_VERSION + 1, gold: 1 });
  st.setItem(SAVE_KEY, future);
  const s = session(st, clock); s.mgr.attach();
  assert.equal(s.mgr.load().status, 'future');
  s.game.buyIngredient('flour', 1);
  assert.equal(st.getItem(SAVE_KEY), future);
});

test('if the corrupt save cannot be backed up it is not overwritten either', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  st.setItem(SAVE_KEY, 'garbage'); st.failBackup = true;
  const s = session(st, clock); s.mgr.attach();
  assert.equal(s.mgr.load().status, 'corrupt');
  s.game.buyIngredient('flour', 1);
  assert.equal(st.getItem(SAVE_KEY), 'garbage');
  assert.ok(s.problems.some((p) => /yedeklenemedi/.test(p.message || '')));
});

test('storage that cannot even be read does not wipe anything', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  st.setItem(SAVE_KEY, JSON.stringify({ version: 1, gold: 5, ingredients: {}, products: {}, jobs: {} }));
  st.failReads = true;
  const s = session(st, clock); s.mgr.attach();
  s.mgr.load();
  st.failReads = false;
  s.game.buyIngredient('flour', 1);
  assert.equal(JSON.parse(st.getItem(SAVE_KEY)).gold, 5);       // existing save untouched
});

test('no storage at all: game works and the player is told progress will not persist', () => {
  const clock = { now: T0 };
  const s = session(null, clock); s.mgr.attach();
  assert.equal(s.mgr.load().status, 'nostorage');
  assert.ok(s.problems.some((p) => p.kind === 'nostorage'));
  assert.ok(s.game.startProduction('bread').ok);
});

test('applying a save does not trigger an autosave loop', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const a = session(st, clock); a.mgr.load(); a.mgr.attach(); a.game.buyIngredient('flour', 1);
  let writes = 0; const orig = st.setItem.bind(st); st.setItem = (k, v) => { writes++; orig(k, v); };
  const b = session(st, clock); b.mgr.attach(); b.mgr.load();
  assert.equal(writes, 0);                                       // loading alone writes nothing
});
