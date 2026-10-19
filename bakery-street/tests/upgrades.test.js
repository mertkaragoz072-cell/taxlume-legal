import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { SaveManager, SAVE_KEY, SAVE_VERSION } from '../src/game/save.js';
import { UPGRADES, PRODUCTS, INGREDIENTS } from '../src/data/economy.js';

class FakeStorage {
  constructor() { this.m = new Map(); this.fail = false; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { if (this.fail) throw new Error('QuotaExceededError'); this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const T0 = 1_700_000_000_000;
function make(gold = 1_000_000) {
  const clock = { now: T0 }, player = { gold };
  const game = new Game(player, {}, () => clock.now);
  for (const k of Object.keys(game.ingredients)) game.ingredients[k] = 500;     // plenty of ingredients so only the upgrade under test matters
  for (const k of Object.keys(game.products)) game.products[k] = 0;
  return { game, player, clock, advance: (s) => { clock.now += s * 1000; game.tick(); } };
}
const level = (game, id, n) => { for (let i = 0; i < n; i++) assert.ok(game.buyUpgrade(id).ok); };

test('every upgrade has at least 5 purchasable levels with strictly rising costs and a real effect each level', () => {
  for (const [id, u] of Object.entries(UPGRADES)) {
    assert.ok(u.costs.length >= 5, `${id} needs 5+ levels`);
    assert.equal(u.values.length, u.costs.length + 1, `${id} has a value for level 0 and for every level`);
    for (let i = 1; i < u.costs.length; i++) assert.ok(u.costs[i] > u.costs[i - 1], `${id} costs must rise`);
    for (let i = 1; i < u.values.length; i++) assert.notEqual(u.values[i], u.values[i - 1], `${id} level ${i} must change something`);
  }
  assert.deepEqual(Object.keys(UPGRADES).sort(), ['ovenCapacity', 'productionSpeed', 'showcaseCapacity']);
});

// ---------------------------------------------------------------- 1. oven capacity changes real production
test('oven capacity: level 0 bakes one item at a time; each level allows exactly one more at the same time', () => {
  for (let lvl = 0; lvl <= 5; lvl++) {
    const { game } = make();
    level(game, 'ovenCapacity', lvl);
    const cap = UPGRADES.ovenCapacity.values[lvl];
    assert.equal(game.capacity('oven'), cap);
    for (let i = 0; i < cap; i++) assert.ok(game.startProduction('bread').ok, `slot ${i + 1}/${cap} at level ${lvl}`);
    const full = game.startProduction('bread');
    assert.equal(full.ok, false, `slot ${cap + 1} must be refused at level ${lvl}`);
    assert.equal(full.reason, 'busy');
    assert.equal(game.jobsOf('oven').length, cap);
  }
});

test('oven capacity: parallel jobs all finish and each adds exactly one product; ingredients are charged per job', () => {
  const { game, advance } = make();
  level(game, 'ovenCapacity', 2);                                 // 3 slots
  const flour = game.ingredients.flour;
  game.startProduction('bread'); game.startProduction('croissant'); game.startProduction('bread');
  assert.equal(game.ingredients.flour, flour - 2 - 2 - 2);
  advance(PRODUCTS.bread.time);
  assert.equal(game.products.bread, 2);                           // both breads done together
  assert.equal(game.products.croissant, 0);                       // croissant still baking
  assert.equal(game.jobsOf('oven').length, 1);
  advance(PRODUCTS.croissant.time - PRODUCTS.bread.time);
  assert.equal(game.products.croissant, 1);
  assert.equal(game.jobs.oven, undefined);
  advance(1000);
  assert.equal(game.products.bread + game.products.croissant, 3); // nothing completes twice
});

test('a freed oven slot can be used again straight away', () => {
  const { game, advance } = make();
  level(game, 'ovenCapacity', 1);
  game.startProduction('coffee');                                 // coffee is on its own machine
  game.startProduction('bread'); game.startProduction('bread');
  assert.equal(game.startProduction('bread').ok, false);
  advance(PRODUCTS.bread.time);
  assert.ok(game.startProduction('bread').ok);
});

test('oven capacity does not change the coffee machine (it stays at one job)', () => {
  const { game } = make();
  level(game, 'ovenCapacity', 5);
  assert.equal(game.capacity('coffee'), 1);
  assert.ok(game.startProduction('coffee').ok);
  assert.equal(game.startProduction('coffee').ok, false);
});

// ---------------------------------------------------------------- 2. production speed changes real durations
test('production speed: each level shortens the real production time of every product by the listed factor', () => {
  for (let lvl = 0; lvl <= 5; lvl++) {
    for (const pid of Object.keys(PRODUCTS)) {
      const { game, advance } = make();
      level(game, 'productionSpeed', lvl);
      const expected = Math.max(1, Math.round(PRODUCTS[pid].time * UPGRADES.productionSpeed.values[lvl] * 10) / 10);
      assert.equal(game.duration(pid), expected);
      assert.ok(game.startProduction(pid).ok);
      assert.equal(game.remaining(PRODUCTS[pid].station), expected);
      advance(expected - 0.1);
      assert.equal(game.products[pid], 0, `${pid} must not finish early at level ${lvl}`);
      advance(0.1);
      assert.equal(game.products[pid], 1, `${pid} finishes at the shortened time at level ${lvl}`);
    }
  }
});

test('speed level 5 really halves the time, and a job already running keeps the time it started with', () => {
  const { game, advance } = make();
  game.startProduction('cake');                                   // started at normal speed (75 s)
  level(game, 'productionSpeed', 5);
  assert.equal(game.duration('cake'), PRODUCTS.cake.time / 2);
  advance(PRODUCTS.cake.time - 1);
  assert.equal(game.products.cake, 0);                            // the running job is not shortened retroactively
  advance(1);
  assert.equal(game.products.cake, 1);
  assert.ok(game.startProduction('cake').ok);
  advance(PRODUCTS.cake.time / 2);
  assert.equal(game.products.cake, 2);
});

// ---------------------------------------------------------------- 3. showcase capacity changes real stock limits
test('showcase capacity: production is refused once stock (plus items being made) reaches the limit', () => {
  const { game } = make();
  level(game, 'ovenCapacity', 1);                                  // two oven slots, so only the showcase can block
  const limit = UPGRADES.showcaseCapacity.values[0];
  game.products.bread = limit - 1;
  assert.ok(game.startProduction('bread').ok);                    // fills the last slot
  const r = game.startProduction('bread');
  assert.equal(r.ok, false); assert.equal(r.reason, 'showcase');
  assert.match(r.message, new RegExp(`Vitrin dolu: Ekmek ${limit}/${limit}`));
  assert.equal(game.ingredients.flour, 500 - PRODUCTS.bread.ingredients.flour);   // nothing consumed by the refusal
  assert.ok(game.startProduction('coffee').ok);                   // other products have their own room
});

test('showcase capacity: items in production count, so stock can never exceed the limit', () => {
  const { game, advance } = make();
  level(game, 'ovenCapacity', 5);
  const limit = game.showcaseLimit();
  game.products.bread = limit - 2;
  assert.ok(game.startProduction('bread').ok); assert.ok(game.startProduction('bread').ok);
  assert.equal(game.startProduction('bread').ok, false);
  advance(PRODUCTS.bread.time);
  assert.equal(game.products.bread, limit);                       // exactly at the limit, never above
});

test('showcase capacity: each level raises the limit by the listed amount and selling frees room', () => {
  for (let lvl = 0; lvl <= 5; lvl++) {
    const { game } = make();
    level(game, 'showcaseCapacity', lvl);
    const limit = UPGRADES.showcaseCapacity.values[lvl];
    assert.equal(game.showcaseLimit(), limit);
    game.products.cake = limit;
    assert.equal(game.startProduction('cake').reason, 'showcase');
    game.products.cake = limit - 1;
    assert.ok(game.startProduction('cake').ok, `one free place at level ${lvl}`);
  }
  const { game } = make();
  game.products.bread = 10;
  assert.equal(game.startProduction('bread').reason, 'showcase');
  game.sellProduct('bread', 1);
  assert.ok(game.startProduction('bread').ok);
});

test('buying a showcase level immediately lets production continue', () => {
  const { game } = make();
  game.products.coffee = 10;
  assert.equal(game.startProduction('coffee').reason, 'showcase');
  game.buyUpgrade('showcaseCapacity');
  assert.ok(game.startProduction('coffee').ok);
});

test('stock above the limit (older save) is kept, never deleted', () => {
  const { game } = make();
  game.products.bread = 25;
  assert.equal(game.startProduction('bread').reason, 'showcase');
  assert.equal(game.products.bread, 25);
});

// ---------------------------------------------------------------- 4. economy and safety
test('gold is spent only when the purchase succeeds, by exactly the level cost', () => {
  const { game, player } = make(5000);
  const r = game.buyUpgrade('ovenCapacity');
  assert.deepEqual({ ok: r.ok, level: r.level, cost: r.cost }, { ok: true, level: 1, cost: UPGRADES.ovenCapacity.costs[0] });
  assert.equal(player.gold, 5000 - UPGRADES.ovenCapacity.costs[0]);
  assert.equal(game.upgrades.ovenCapacity, 1);
  assert.equal(game.upgrades.productionSpeed, 0);                  // other upgrades untouched
});

test('not enough gold: the upgrade is refused with a clear message and nothing changes', () => {
  const { game, player } = make(UPGRADES.ovenCapacity.costs[0] - 1);
  const before = JSON.stringify(game.exportState());
  const r = game.buyUpgrade('ovenCapacity');
  assert.equal(r.ok, false); assert.equal(r.reason, 'gold');
  assert.match(r.message, /Yetersiz altın: 800 gerekli, 799 var/);
  assert.equal(JSON.stringify(game.exportState()), before);
  assert.equal(player.gold, 799);
});

test('exactly enough gold works and leaves zero', () => {
  const { game, player } = make(UPGRADES.productionSpeed.costs[0]);
  assert.ok(game.buyUpgrade('productionSpeed').ok);
  assert.equal(player.gold, 0);
});

test('costs rise level by level: buying all levels spends exactly the sum of the costs', () => {
  for (const [id, u] of Object.entries(UPGRADES)) {
    const { game, player } = make(10_000_000);
    const paid = [];
    for (let i = 0; i < u.costs.length; i++) { const g = player.gold; assert.ok(game.buyUpgrade(id).ok); paid.push(g - player.gold); }
    assert.deepEqual(paid, u.costs);
    assert.equal(game.upgrades[id], u.costs.length);
  }
});

test('maximum level: further purchases are refused and cost nothing', () => {
  const { game, player } = make(10_000_000);
  level(game, 'showcaseCapacity', 5);
  assert.equal(game.nextCost('showcaseCapacity'), null);
  const gold = player.gold;
  const r = game.buyUpgrade('showcaseCapacity');
  assert.equal(r.ok, false); assert.equal(r.reason, 'max');
  assert.equal(player.gold, gold);
  assert.equal(game.upgrades.showcaseCapacity, 5);
});

test('double purchase: pressing twice at the same level buys only one level', () => {
  const { game, player } = make(100_000);
  const seen = game.upgrades.oven ?? game.upgrades.ovenCapacity;   // the level the player saw
  const a = game.buyUpgrade('ovenCapacity', seen);
  const b = game.buyUpgrade('ovenCapacity', seen);                 // second tap still carries the old level
  assert.equal(a.ok, true);
  assert.equal(b.ok, false); assert.equal(b.reason, 'stale');
  assert.equal(game.upgrades.ovenCapacity, 1);
  assert.equal(player.gold, 100_000 - UPGRADES.ovenCapacity.costs[0]);
});

test('double purchase: a replayed request id is ignored, a refused one does not burn its id', () => {
  const { game, player } = make(100_000);
  assert.ok(game.buyUpgrade('productionSpeed', 0, 'r1').ok);
  const again = game.buyUpgrade('productionSpeed', null, 'r1');
  assert.equal(again.reason, 'duplicate');
  assert.equal(game.upgrades.productionSpeed, 1);
  player.gold = 0;
  assert.equal(game.buyUpgrade('productionSpeed', 1, 'r2').reason, 'gold');
  player.gold = 100_000;
  assert.ok(game.buyUpgrade('productionSpeed', 1, 'r2').ok);
  assert.equal(game.upgrades.productionSpeed, 2);
});

test('unknown upgrades are rejected', () => {
  const { game, player } = make(100);
  assert.equal(game.buyUpgrade('nope').reason, 'unknown');
  assert.equal(player.gold, 100);
});

test('upgrades work together with ingredient purchases and stock rules (gold shared, nothing double-charged)', () => {
  const { game, player } = make(10_000);
  const gold0 = player.gold;
  game.buyUpgrade('ovenCapacity');
  game.purchase('flour', 4);
  assert.equal(player.gold, gold0 - UPGRADES.ovenCapacity.costs[0] - 4 * INGREDIENTS.flour.price);
});

// ---------------------------------------------------------------- 5. persistence
test('upgrade levels, gold, stock and running jobs survive a reload, and the effects still apply', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const mk = (gold) => { const player = { gold }, game = new Game(player, {}, () => clock.now); const mgr = new SaveManager(game, st); return { player, game, mgr }; };
  const a = mk(100_000); a.mgr.load(); a.mgr.attach();
  level(a.game, 'ovenCapacity', 2); level(a.game, 'productionSpeed', 3); level(a.game, 'showcaseCapacity', 1);
  a.game.startProduction('bread'); a.game.startProduction('cake');
  const before = a.game.exportState();

  clock.now += 5000;
  const b = mk(0); assert.equal(b.mgr.load().status, 'loaded');
  const after = b.game.exportState();
  assert.deepEqual(after.upgrades, { ovenCapacity: 2, productionSpeed: 3, showcaseCapacity: 1 });
  assert.equal(after.gold, before.gold);
  assert.deepEqual(after.jobs, before.jobs);
  assert.equal(b.game.capacity('oven'), 3);                        // effects are live again after the reload
  assert.equal(b.game.duration('bread'), Math.round(PRODUCTS.bread.time * 0.7 * 10) / 10);
  assert.equal(b.game.showcaseLimit(), 15);
  assert.equal(Math.round(b.game.remaining('oven') * 10) / 10, Math.round((PRODUCTS.bread.time * 0.7 - 5) * 10) / 10);   // running job kept its own duration
  const c = mk(0); c.mgr.load();                                   // loading again never re-applies anything
  assert.deepEqual(c.game.exportState().upgrades, after.upgrades);
  assert.equal(c.player.gold, before.gold);
});

test('a job started before a speed upgrade keeps its original duration after a reload', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const mk = (gold) => { const player = { gold }, game = new Game(player, {}, () => clock.now); const mgr = new SaveManager(game, st); return { game, mgr, player }; };
  const a = mk(100_000); a.mgr.load(); a.mgr.attach();
  a.game.startProduction('cake'); level(a.game, 'productionSpeed', 5);
  const b = mk(0); b.mgr.load();
  assert.equal(Math.round(b.game.remaining('oven')), PRODUCTS.cake.time);
});

test('the purchase and its gold are saved in one snapshot', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const game = new Game({ gold: 3000 }, {}, () => clock.now); const mgr = new SaveManager(game, st); mgr.load(); mgr.attach();
  game.buyUpgrade('showcaseCapacity');
  const saved = JSON.parse(st.getItem(SAVE_KEY));
  assert.equal(saved.version, SAVE_VERSION);
  assert.equal(saved.upgrades.showcaseCapacity, 1);
  assert.equal(saved.gold, 3000 - UPGRADES.showcaseCapacity.costs[0]);
});

test('old saves load: v2 jobs (single object) migrate and missing upgrades default to level 0', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  st.setItem(SAVE_KEY, JSON.stringify({ version: 2, gold: 900, ingredients: {}, products: { bread: 3 }, jobs: { oven: { product: 'cake', startedAt: T0 - 10_000 } } }));
  const game = new Game({ gold: 0 }, {}, () => clock.now); const mgr = new SaveManager(game, st);
  assert.equal(mgr.load().status, 'loaded');
  assert.deepEqual(game.upgrades, { ovenCapacity: 0, productionSpeed: 0, showcaseCapacity: 0 });
  assert.equal(game.jobsOf('oven').length, 1);
  assert.equal(Math.round(game.remaining('oven')), PRODUCTS.cake.time - 10);
});

test('invalid upgrade data in a save is rejected (backed up, not silently used)', () => {
  for (const bad of [{ ovenCapacity: 99 }, { ovenCapacity: -1 }, { productionSpeed: 1.5 }, { showcaseCapacity: '3' }]) {
    const st = new FakeStorage(), problems = [];
    st.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, gold: 10, ingredients: {}, products: {}, jobs: {}, upgrades: bad }));
    const game = new Game({ gold: 0 }, {}, () => T0); const mgr = new SaveManager(game, st, { onProblem: (p) => problems.push(p) });
    assert.equal(mgr.load().status, 'corrupt');
    assert.ok(problems.some((p) => p.kind === 'corrupt'));
    assert.deepEqual(game.upgrades, { ovenCapacity: 0, productionSpeed: 0, showcaseCapacity: 0 });
  }
});

test('more saved oven jobs than the highest capacity is treated as corrupt', () => {
  const st = new FakeStorage();
  const jobs = Array.from({ length: 9 }, () => ({ product: 'bread', startedAt: T0 }));
  st.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, gold: 1, ingredients: {}, products: {}, jobs: { oven: jobs }, upgrades: {} }));
  const game = new Game({ gold: 0 }, {}, () => T0);
  assert.equal(new SaveManager(game, st).load().status, 'corrupt');
});

test('if the save cannot be written the upgrade stays in memory and the player is warned', () => {
  const st = new FakeStorage(), problems = [], clock = { now: T0 };
  const game = new Game({ gold: 5000 }, {}, () => clock.now); const mgr = new SaveManager(game, st, { onProblem: (p) => problems.push(p) }); mgr.load(); mgr.attach();
  st.fail = true;
  assert.ok(game.buyUpgrade('ovenCapacity').ok);
  assert.equal(game.upgrades.ovenCapacity, 1);
  assert.ok(problems.some((p) => p.kind === 'write'));
});
