import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { SaveManager, SAVE_KEY } from '../src/game/save.js';
import { INGREDIENTS, PRODUCTS, MARKET } from '../src/data/economy.js';

class FakeStorage {
  constructor() { this.m = new Map(); this.fail = false; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { if (this.fail) throw new Error('QuotaExceededError'); this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const make = (gold = 1000) => {
  let now = 1_700_000_000_000;
  const player = { gold };
  const game = new Game(player, {}, () => now);
  return { game, player, advance: (s) => { now += s * 1000; game.tick(); } };
};
const emptyStock = (game) => { for (const k of Object.keys(game.ingredients)) game.ingredients[k] = 0; };
const costOf = (product) => Object.entries(PRODUCTS[product].ingredients).reduce((s, [i, n]) => s + INGREDIENTS[i].price * n, 0);

test('market data: the five requested items plus butter, all with valid prices from the one price list', () => {
  for (const id of ['flour', 'milk', 'egg', 'sugar', 'beans']) assert.ok(MARKET.items.includes(id), id);
  for (const id of MARKET.items) {
    assert.ok(INGREDIENTS[id], `${id} must exist in INGREDIENTS`);
    assert.ok(Number.isInteger(INGREDIENTS[id].price) && INGREDIENTS[id].price > 0);
  }
  assert.ok(MARKET.quantities.every((q) => Number.isInteger(q) && q >= 1 && q <= MARKET.maxPerPurchase));
});

test('a purchase spends exactly price x quantity and adds exactly that quantity of that ingredient', () => {
  const { game, player } = make(1000);
  const before = { ...game.ingredients };
  const r = game.purchase('milk', 4);
  assert.deepEqual({ ok: r.ok, cost: r.cost }, { ok: true, cost: INGREDIENTS.milk.price * 4 });
  assert.equal(player.gold, 1000 - INGREDIENTS.milk.price * 4);
  assert.equal(game.ingredients.milk, before.milk + 4);
  for (const id of Object.keys(before)) if (id !== 'milk') assert.equal(game.ingredients[id], before[id], `${id} must not change`);
});

test('every market item can be bought and only that item changes', () => {
  for (const id of MARKET.items) {
    const { game, player } = make(1000);
    const stock = game.ingredients[id];
    assert.ok(game.purchase(id, 3).ok, id);
    assert.equal(game.ingredients[id], stock + 3);
    assert.equal(player.gold, 1000 - 3 * INGREDIENTS[id].price);
  }
});

test('not enough gold: purchase refused, a clear message, nothing changes', () => {
  const { game, player } = make(20);
  const stock = { ...game.ingredients };
  const r = game.purchase('butter', 2);                       // 2 x 15 = 30 > 20
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'gold');
  assert.match(r.message, /Yetersiz altın: 30 gerekli, 20 var/);
  assert.equal(player.gold, 20);
  assert.deepEqual(game.ingredients, stock);
});

test('exactly enough gold is allowed and leaves zero', () => {
  const { game, player } = make(INGREDIENTS.egg.price * 3);
  assert.ok(game.purchase('egg', 3).ok);
  assert.equal(player.gold, 0);
  assert.equal(game.purchase('egg', 1).ok, false);            // and now nothing more
});

test('maxAffordable follows gold and price', () => {
  const { game } = make(100);
  assert.equal(game.maxAffordable('flour'), Math.floor(100 / INGREDIENTS.flour.price));
  assert.equal(game.maxAffordable('nope'), 0);
});

test('invalid quantities and unknown or unsold items are rejected without side effects', () => {
  const { game, player } = make(5000);
  const stock = { ...game.ingredients };
  for (const q of [0, -1, 1.5, NaN, Infinity, '5', null, undefined, MARKET.maxPerPurchase + 1]) {
    const r = game.purchase('flour', q);
    assert.equal(r.ok, false, `qty ${String(q)}`); assert.equal(r.reason, 'qty');
  }
  assert.equal(game.purchase('unicorn', 1).reason, 'notsold');
  assert.equal(player.gold, 5000);
  assert.deepEqual(game.ingredients, stock);
  const noButter = new Game({ gold: 5000 }, { market: { items: ['flour'], quantities: [1], maxPerPurchase: 9 } }, () => 0);
  assert.equal(noButter.purchase('butter', 1).reason, 'notsold');
});

test('the same purchase request is applied only once (replayed click / event)', () => {
  const { game, player } = make(1000);
  const flour = game.ingredients.flour;
  assert.ok(game.purchase('flour', 5, 'req-1').ok);
  const again = game.purchase('flour', 5, 'req-1');
  assert.equal(again.ok, false); assert.equal(again.reason, 'duplicate');
  assert.equal(game.ingredients.flour, flour + 5);
  assert.equal(player.gold, 1000 - 5 * INGREDIENTS.flour.price);
  assert.ok(game.purchase('flour', 5, 'req-2').ok);           // a genuinely new purchase still works
  assert.equal(game.ingredients.flour, flour + 10);
});

test('a refused purchase does not burn its request id (retry after earning gold works)', () => {
  const { game, player } = make(5);
  assert.equal(game.purchase('flour', 1, 'r1').reason, 'gold');
  player.gold = 100;
  assert.ok(game.purchase('flour', 1, 'r1').ok);
});

// ---------------------------------------------------------------------------------- one inventory, recipes
test('market and production share one inventory: there is no second stock object', () => {
  const { game } = make(1000);
  assert.equal(game.marketStock, undefined);
  const inv = game.ingredients;
  game.purchase('sugar', 2);
  assert.equal(game.ingredients, inv);                        // same object, updated in place
  assert.equal(game.exportState().ingredients.sugar, inv.sugar);
  assert.equal(Object.keys(game.exportState().ingredients).sort().join(), Object.keys(INGREDIENTS).sort().join());
});

test('every ingredient used by any recipe is sold at the Market', () => {
  for (const [pid, p] of Object.entries(PRODUCTS)) {
    for (const ing of Object.keys(p.ingredients)) assert.ok(MARKET.items.includes(ing), `${pid} needs ${ing}, which the Market does not sell`);
  }
});

test('recipes: bread, croissant, cake and coffee can each be made from nothing but Market purchases', () => {
  for (const [pid, p] of Object.entries(PRODUCTS)) {
    const { game, player, advance } = make(10_000);
    emptyStock(game);
    for (const [ing, need] of Object.entries(p.ingredients)) assert.ok(game.purchase(ing, need).ok);
    assert.equal(player.gold, 10_000 - costOf(pid), `${pid} ingredient cost`);
    const productsBefore = game.products[pid];
    assert.ok(game.startProduction(pid).ok, `${pid} should start`);
    for (const ing of Object.keys(p.ingredients)) assert.equal(game.ingredients[ing], 0, `${pid} consumed all of ${ing}`);   // exactly the recipe amount was consumed
    advance(p.time);
    assert.equal(game.products[pid], productsBefore + 1);
  }
});

test('production does not start with a missing ingredient and consumes nothing; buying the missing one fixes it', () => {
  const { game } = make(1000);
  emptyStock(game);
  game.ingredients.flour = 2; game.ingredients.sugar = 2; game.ingredients.egg = 2; game.ingredients.butter = 1;   // cake without milk
  const snapshot = { ...game.ingredients };
  const r = game.startProduction('cake');
  assert.equal(r.ok, false); assert.equal(r.reason, 'ingredients');
  assert.match(r.message, /1 Süt eksik/);
  assert.deepEqual(game.ingredients, snapshot);
  assert.deepEqual(game.jobs, {});
  assert.ok(game.purchase('milk', 1).ok);
  assert.ok(game.startProduction('cake').ok);
});

test('buying more than one batch lets production run repeatedly and stock goes down by exactly one recipe each time', () => {
  const { game, advance } = make(10_000);
  emptyStock(game);
  game.purchase('flour', 6);                                   // three breads
  for (let i = 0; i < 3; i++) {
    assert.ok(game.startProduction('bread').ok);
    assert.equal(game.ingredients.flour, 6 - 2 * (i + 1));
    advance(PRODUCTS.bread.time);
  }
  assert.equal(game.startProduction('bread').ok, false);
});

// ------------------------------------------------------------------------------------- persistence
test('gold and ingredient stock from purchases survive a reload, and the purchase is not applied again', () => {
  const st = new FakeStorage();
  const a = make(1000); const mgrA = new SaveManager(a.game, st); mgrA.load(); mgrA.attach();
  a.game.purchase('flour', 7, 'x'); a.game.purchase('beans', 2, 'y');
  const gold = a.player.gold, flour = a.game.ingredients.flour, beans = a.game.ingredients.beans;
  const b = make(0); const mgrB = new SaveManager(b.game, st);
  assert.equal(mgrB.load().status, 'loaded');
  assert.equal(b.player.gold, gold);
  assert.equal(b.game.ingredients.flour, flour);
  assert.equal(b.game.ingredients.beans, beans);
  const c = make(0); new SaveManager(c.game, st).load();      // loading again must not re-apply anything
  assert.equal(c.player.gold, gold); assert.equal(c.game.ingredients.flour, flour);
});

test('a purchase is saved in one snapshot (gold and stock together), never half-applied', () => {
  const st = new FakeStorage();
  const a = make(500); const mgr = new SaveManager(a.game, st); mgr.load(); mgr.attach();
  a.game.purchase('egg', 4);
  const saved = JSON.parse(st.getItem(SAVE_KEY));
  assert.equal(saved.gold, 500 - 4 * INGREDIENTS.egg.price);
  assert.equal(saved.ingredients.egg, INGREDIENTS.egg.start + 4);
});

test('if saving fails after a purchase the player keeps the purchase in memory and is warned', () => {
  const st = new FakeStorage(); const problems = [];
  const a = make(500); const mgr = new SaveManager(a.game, st, { onProblem: (p) => problems.push(p) }); mgr.load(); mgr.attach();
  st.fail = true;
  assert.ok(a.game.purchase('milk', 2).ok);
  assert.equal(a.game.ingredients.milk, INGREDIENTS.milk.start + 2);
  assert.ok(problems.some((p) => p.kind === 'write'));
});
