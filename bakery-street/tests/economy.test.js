import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { Cafe } from '../src/game/customers.js';
import { Progression } from '../src/game/progression.js';
import { Research } from '../src/game/research.js';
import { Town } from '../src/game/town.js';
import { SaveManager, SAVE_KEY } from '../src/game/save.js';
import { PRODUCTS, INGREDIENTS, UPGRADES, RESEARCH, SALES, LEVEL_REWARD, LEVELS } from '../src/data/economy.js';

class FakeStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const T0 = 1_700_000_000_000;
function make({ gold = 1_000_000, sell = 0, eff = 0, upgrades = {} } = {}) {
  const clock = { now: T0 }, player = { gold, gems: 0 };
  const game = new Game(player, {}, () => clock.now);
  new Town(game);
  const research = new Research(game);
  research.levels.masterSeller = sell; research.levels.efficientProduction = eff;
  Object.assign(game.upgrades, upgrades);
  for (const k of Object.keys(game.ingredients)) game.ingredients[k] = 1000;
  for (const k of Object.keys(game.products)) game.products[k] = 0;
  const cafe = new Cafe(game, { rng: () => 0.5, config: { tables: 3, queueMax: 3, firstSpawnSec: 999, spawnEverySec: [999, 999], queuePatienceSec: 999, orderPatienceSec: 999, maxStepSec: 2, history: 20, orderWeights: {} } });
  const advance = (s) => { clock.now += s * 1000; game.tick(); };
  return { game, player, research, cafe, clock, advance };
}
/** Real flow: start production, wait, then sell one unit through `channel`. Returns the true net = sale income + refund - ingredient cost. */
function netOf(id, channel, opts) {
  const { game, player, cafe, advance } = make(opts);
  const before = player.gold;
  game.ingredients = Object.fromEntries(Object.entries(game.ingredients).map(([k]) => [k, 1000]));
  const spent = {};
  for (const ing of Object.keys(PRODUCTS[id].ingredients)) spent[ing] = game.ingredients[ing];
  assert.ok(game.startProduction(id).ok);
  advance(PRODUCTS[id].time * 2);
  assert.equal(game.products[id], 1);
  if (channel === 'showcase') assert.ok(game.sellProduct(id, 1).ok);
  else {
    cafe.customers.push({ id: 1, state: 'seated', table: 0, orderId: 1, look: 'boy_cap', patience: 1e9 });
    cafe.orders.push({ id: 1, product: id, price: PRODUCTS[id].price, status: 'open', customerId: 1 });
    assert.ok(cafe.deliver(1).ok);
  }
  const ingredientCost = Object.entries(PRODUCTS[id].ingredients).reduce((s, [i, n]) => s + n * INGREDIENTS[i].price, 0);
  return player.gold - before - ingredientCost;        // the ingredients were already owned (free): subtract their price for the true net (income + refund - cost)
}

// ------------------------------------------------------------------------------------------------ showcase vs customer
test('real flow: for every product and every research combination the showcase nets ~20% less than a customer', () => {
  for (const sell of [0, 1, 3, 5]) for (const eff of [0, 2, 5]) for (const id of Object.keys(PRODUCTS)) {
    const opts = { sell, eff }, c = netOf(id, 'customer', opts), s = netOf(id, 'showcase', opts);
    assert.ok(c > 0 && s > 0, `${id} s${sell} e${eff}`);
    assert.ok(s < c, `${id} s${sell} e${eff}: showcase ${s} must be below customer ${c}`);
    assert.ok(Math.abs(s - SALES.showcaseNetShare * c) <= 0.5 + 1e-9, `${id} s${sell} e${eff}: showcase ${s}, customer ${c}`);
  }
});

test('unitEconomics is the single source: it matches the gold that actually moves, and the bonus is applied once', () => {
  for (const sell of [0, 2, 5]) for (const id of Object.keys(PRODUCTS)) {
    const { game, player } = make({ sell, eff: 3 });
    const u = game.unitEconomics(id);
    game.products[id] = 3;
    const g = player.gold;
    assert.equal(game.sellProduct(id, 3).income, u.showcase * 3);
    assert.equal(player.gold - g, u.showcase * 3);
    assert.equal(u.customer, Math.round(PRODUCTS[id].price * (1 + RESEARCH.masterSeller.values[sell])));   // once, not squared
    assert.equal(u.cost, game.ingredientCost(id) - game.ingredientRebate(id));
    assert.equal(game.saleIncome(PRODUCTS[id].price), u.customer);
    assert.equal(game.showcaseIncome(id), u.showcase);
  }
});

test('a saved order keeps the price it was created with while the bonus still applies once', () => {
  const { game } = make({ sell: 2 });
  assert.equal(game.unitEconomics('coffee', 40).customer, Math.round(40 * 1.10));
});

test('selling one unit n times pays the same as selling n units at once (no rounding gain)', () => {
  for (const id of Object.keys(PRODUCTS)) {
    const a = make({ sell: 3, eff: 3 }), b = make({ sell: 3, eff: 3 });
    a.game.products[id] = b.game.products[id] = 7;
    for (let i = 0; i < 7; i++) a.game.sellProduct(id, 1);
    b.game.sellProduct(id, 7);
    assert.equal(a.player.gold, b.player.gold, id);
  }
});

// ------------------------------------------------------------------------------------------------ showcase capacity / stock rules
test('stock plus running jobs never exceed the showcase capacity, however production is started', () => {
  const { game, advance } = make({ upgrades: { ovenCapacity: 5, showcaseCapacity: 0 } });
  const limit = game.showcaseLimit();
  for (let round = 0; round < 40; round++) {
    for (let k = 0; k < 8; k++) game.startProduction('bread');
    assert.ok(game.committed('bread') <= limit, `committed ${game.committed('bread')} > ${limit}`);
    advance(PRODUCTS.bread.time);
    assert.ok(game.products.bread <= limit);
  }
  assert.equal(game.products.bread, limit);
  assert.equal(game.startProduction('bread').reason, 'showcase');
  game.sellProduct('bread', 2);
  assert.ok(game.startProduction('bread').ok);                 // selling frees exactly the room that was sold
});

test('offline completion cannot overfill the showcase either', () => {
  const { game, advance } = make({ upgrades: { ovenCapacity: 5, showcaseCapacity: 1 } });
  for (let k = 0; k < 20; k++) game.startProduction('croissant');
  advance(10 * 3600);
  assert.ok(game.products.croissant <= game.showcaseLimit());
});

test('customers and showcase draw from the same stock: no negative stock, no double sale', () => {
  const { game, cafe, player } = make();
  game.products.bread = 1;
  cafe.customers.push({ id: 1, state: 'seated', table: 0, orderId: 1, look: 'boy_cap', patience: 1e9 }, { id: 2, state: 'seated', table: 1, orderId: 2, look: 'boy_cap', patience: 1e9 });
  cafe.orders.push({ id: 1, product: 'bread', price: 30, status: 'open', customerId: 1 }, { id: 2, product: 'bread', price: 30, status: 'open', customerId: 2 });
  assert.ok(cafe.deliver(1).ok);
  const g = player.gold;
  assert.equal(cafe.deliver(2).ok, false);
  assert.equal(game.sellProduct('bread', 1).ok, false);
  assert.equal(game.products.bread, 0);
  assert.equal(player.gold, g);
});

test('income per hour is bounded by production, never by the sale channel: showcase-only vs customer-first over one hour', () => {
  const run = (strategy, upgrades) => {
    const { game, player, cafe, clock, advance } = make({ gold: 5000, upgrades });
    let seed = 12345; cafe.rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);   // varied, repeatable customers
    cafe.setActive(true);
    cafe.cfg.firstSpawnSec = 0; cafe.spawnIn = 0; cafe.cfg.spawnEverySec = [20, 20]; cafe.cfg.orderWeights = { bread: 4, croissant: 3, cake: 2, coffee: 4 };
    cafe.cfg.queuePatienceSec = 45; cafe.cfg.orderPatienceSec = 100;
    game.ingredients = Object.fromEntries(Object.keys(INGREDIENTS).map((k) => [k, 0]));
    let spent = 0;
    const order = ['coffee', 'bread', 'croissant', 'cake'];
    for (let t = 0; t < 3600; t += 2) {
      advance(2);
      for (const id of order) {                                 // keep production running: buy only what the recipe needs
        const station = PRODUCTS[id].station;
        if (game.jobsOf(station).length >= game.capacity(station) || game.committed(id) >= game.showcaseLimit()) continue;
        for (const [ing, n] of Object.entries(PRODUCTS[id].ingredients)) {
          const lack = n - game.ingredients[ing];
          if (lack > 0) { game.buyIngredient(ing, lack); spent += lack * INGREDIENTS[ing].price; }
        }
        game.startProduction(id);
      }
      if (strategy === 'customer-first') for (const o of cafe.openOrders()) if (game.products[o.product] > 0) cafe.deliver(o.id);
      if (t % 30 === 0) for (const id of order) if (game.products[id] > 0) game.sellProduct(id, game.products[id]);   // sweep the rest to the showcase
    }
    return player.gold - 5000;                                    // net gold made in one hour (ingredients were bought from the same purse)
  };
  for (const upgrades of [{}, { ovenCapacity: 2, productionSpeed: 2 }, { ovenCapacity: 5, productionSpeed: 5, showcaseCapacity: 3 }]) {
    const customerFirst = run('customer-first', upgrades), showcaseOnly = run('showcase-only', upgrades);
    assert.ok(customerFirst > 0 && showcaseOnly > 0);
    assert.ok(customerFirst >= showcaseOnly, `customers must never be worse: ${customerFirst} vs ${showcaseOnly}`);
    assert.ok(showcaseOnly >= customerFirst * 0.7, `ignoring customers may cost at most ~30%: ${showcaseOnly} vs ${customerFirst}`);
  }
});

// ------------------------------------------------------------------------------------------------ research pay-back
test('Verimli Üretim and Usta Satıcı pay back in a sensible time at every stage (about 3-7 hours of active production)', () => {
  const UTIL = 0.5;                                              // an active player keeps the stations busy about half of the time
  const cost = (id) => Object.entries(PRODUCTS[id].ingredients).reduce((s, [i, n]) => s + n * INGREDIENTS[i].price, 0);
  for (const key of ['masterSeller', 'efficientProduction']) {
    const d = RESEARCH[key];
    for (let i = 1; i <= d.costs.length; i++) {
      const cap = UPGRADES.ovenCapacity.values[i], speed = UPGRADES.productionSpeed.values[i];     // upgrades roughly in step with research
      const bread = (cap * 60) / (PRODUCTS.bread.time * speed) * UTIL, coffee = 60 / (PRODUCTS.coffee.time * speed) * UTIL;
      const income = (bread * PRODUCTS.bread.price + coffee * PRODUCTS.coffee.price) * 0.9, ingredients = bread * cost('bread') + coffee * cost('coffee');
      const gainPerMin = (key === 'masterSeller' ? income : ingredients) * (d.values[i] - d.values[i - 1]);
      const hours = d.costs[i - 1] / gainPerMin / 60;
      assert.ok(hours >= 3 && hours <= 7, `${key} level ${i}: pays back in ${hours.toFixed(1)} h`);
    }
    for (let i = 1; i < d.costs.length; i++) assert.ok(d.costs[i] > d.costs[i - 1]);
  }
});

test('changing research prices never touches saved research levels', () => {
  const st = new FakeStorage();
  const a = make({ sell: 4, eff: 2 });
  const sa = new SaveManager(a.game, st); sa.load(); sa.save();
  const b = make();
  new SaveManager(b.game, st).load();
  assert.equal(b.research.level('masterSeller'), 4);
  assert.equal(b.research.level('efficientProduction'), 2);
  assert.equal(b.game.player.gold, 1_000_000);
});

test('starting gold stays 54.320', async () => {
  const { PLAYER } = await import('../src/config.js');
  assert.equal(PLAYER.gold, 54320);
});

// ------------------------------------------------------------------------------------------------ levels beyond 10
function levelGame() {
  const player = { gold: 0, gems: 0 }, game = new Game(player, {}, () => T0);
  const prog = new Progression(game);
  for (const k of Object.keys(game.ingredients)) game.ingredients[k] = 0;
  return { game, player, prog };
}
test('levels 10-30: every level is reached and rewarded exactly once, whatever the XP chunking', () => {
  for (const chunk of [1, 7, 97, 1000, 123456]) {
    const { game, player, prog } = levelGame();
    const seen = [];
    game.on('levelUp', (e) => seen.push(e.level));
    for (let guard = 0; guard < 200000 && !prog.isMax; guard++) prog.gain(chunk);
    assert.ok(prog.isMax, `chunk ${chunk}`);
    assert.deepEqual(seen, Array.from({ length: LEVELS.maxLevel - 1 }, (_, i) => i + 2), `chunk ${chunk}`);
    let gold = 0; const ing = { flour: 0, milk: 0, egg: 0 };
    for (let l = 2; l <= LEVELS.maxLevel; l++) { gold += prog.rewardFor(l).gold; if (l % LEVEL_REWARD.ingredientsEvery === 0) for (const k of Object.keys(ing)) ing[k] += LEVEL_REWARD.ingredients[k]; }
    assert.equal(player.gold, gold, `chunk ${chunk}`);
    for (const k of Object.keys(ing)) assert.equal(game.ingredients[k], ing[k], `${k} chunk ${chunk}`);
    assert.equal(prog.xp, 0);
    assert.equal(prog.rewardedLevel, LEVELS.maxLevel);
  }
});

test('cumulative XP needed matches the formula, level by level, past level 10', () => {
  const { prog } = levelGame();
  let total = 0;
  for (let l = 1; l < LEVELS.maxLevel; l++) {
    const need = prog.xpToNext(l);
    assert.equal(need, LEVELS.base + LEVELS.linear * (l - 1) + LEVELS.quad * (l - 1) ** 2);
    total += need;
    const p = levelGame().prog;
    p.gain(total - 1); assert.equal(p.level, l, `one XP short of level ${l + 1}`);
    p.gain(1); assert.equal(p.level, l + 1);
  }
});

test('saving and loading at any level 10-30 never pays a level reward twice', () => {
  for (let target = 10; target <= LEVELS.maxLevel; target++) {
    const st = new FakeStorage();
    const a = levelGame();
    const sa = new SaveManager(a.game, st); sa.load();
    while (a.prog.level < target) a.prog.gain(1);
    a.game.emit('change', { type: 'x' }); sa.save();
    const b = levelGame();
    new SaveManager(b.game, st).load();
    assert.equal(b.prog.level, target);
    assert.equal(b.prog.rewardedLevel, target);
    const gold = b.player.gold, flour = b.game.ingredients.flour;
    b.prog.gain(0); b.prog.gain(-5);
    assert.equal(b.player.gold, gold);
    assert.equal(b.game.ingredients.flour, flour);
    b.prog.gain(10_000_000);
    assert.equal(b.prog.level, LEVELS.maxLevel);
    let expect = 0; for (let l = target + 1; l <= LEVELS.maxLevel; l++) expect += b.prog.rewardFor(l).gold;
    assert.equal(b.player.gold - gold, expect);
  }
});

test('XP at the maximum level changes nothing (no gold, no reward, bar stays full)', () => {
  const { prog, player } = levelGame();
  prog.gain(10_000_000);
  const g = player.gold;
  prog.gain(5000); prog.award('produce', 'cake', 50);
  assert.equal(player.gold, g);
  assert.equal(prog.fraction(), 1);
});
