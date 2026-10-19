import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, formatTime } from '../src/game/game.js';
import { INGREDIENTS, PRODUCTS, SALES } from '../src/data/economy.js';

const make = (gold = 1000) => {
  let now = 0;
  const player = { gold };
  const game = new Game(player, {}, () => now);
  return { game, player, advance: (sec) => { now += sec * 1000; game.tick(); } };
};

test('starting stock comes from the data tables', () => {
  const { game } = make();
  for (const [id, d] of Object.entries(INGREDIENTS)) assert.equal(game.ingredients[id], d.start);
  for (const [id, d] of Object.entries(PRODUCTS)) assert.equal(game.products[id], d.start);
});

test('every product defines time, ingredients, price and station', () => {
  for (const [id, p] of Object.entries(PRODUCTS)) {
    assert.ok(p.time > 0, `${id} time`);
    assert.ok(p.price > 0, `${id} price`);
    assert.ok(Object.keys(p.ingredients).length > 0, `${id} ingredients`);
    for (const ing of Object.keys(p.ingredients)) assert.ok(INGREDIENTS[ing], `${id} uses unknown ingredient ${ing}`);
  }
});

test('production consumes ingredients and adds stock only after the timer ends', () => {
  const { game, advance } = make();
  const flourBefore = game.ingredients.flour, breadBefore = game.products.bread;
  assert.deepEqual(game.startProduction('bread'), { ok: true });
  assert.equal(game.ingredients.flour, flourBefore - PRODUCTS.bread.ingredients.flour);
  assert.equal(game.products.bread, breadBefore);          // not yet
  advance(PRODUCTS.bread.time - 1);
  assert.equal(game.products.bread, breadBefore);          // 1 s early
  assert.ok(game.remaining('oven') > 0 && game.remaining('oven') <= 1);
  advance(1);
  assert.equal(game.products.bread, breadBefore + 1);      // done
  assert.equal(game.remaining('oven'), 0);
  assert.equal(game.jobs.oven, undefined);
});

test('remaining time and progress are reported while a job runs', () => {
  const { game, advance } = make();
  game.startProduction('croissant');
  assert.equal(Math.round(game.remaining('oven')), PRODUCTS.croissant.time);
  advance(10);
  assert.equal(Math.round(game.remaining('oven')), PRODUCTS.croissant.time - 10);
  assert.ok(Math.abs(game.progress('oven') - 10 / PRODUCTS.croissant.time) < 1e-9);
});

test('production is refused with a clear message when ingredients are short', () => {
  const { game } = make();
  game.ingredients.butter = 0;
  const flour = game.ingredients.flour;
  const r = game.startProduction('croissant');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'ingredients');
  assert.match(r.message, /Yetersiz malzeme: 1 Tereyağı eksik/);
  assert.equal(game.ingredients.flour, flour);             // nothing consumed
  assert.equal(game.jobs.oven, undefined);                 // nothing started
});

test('the oven runs one job at a time; the coffee machine is independent', () => {
  const { game, advance } = make();
  assert.ok(game.startProduction('bread').ok);
  const flour = game.ingredients.flour;
  const busy = game.startProduction('croissant');
  assert.equal(busy.ok, false);
  assert.equal(busy.reason, 'busy');
  assert.match(busy.message, /Fırın meşgul/);
  assert.equal(game.ingredients.flour, flour);
  assert.ok(game.startProduction('coffee').ok);            // other station is free
  advance(PRODUCTS.coffee.time);
  assert.equal(game.products.coffee, 1);
  assert.ok(game.jobs.oven);                               // bread still baking
  advance(PRODUCTS.bread.time);
  assert.equal(game.products.bread, PRODUCTS.bread.start + 1);
});

test('tick catches up after a long pause and finishes jobs once', () => {
  const { game, advance } = make();
  game.startProduction('cake');
  advance(5000);
  assert.equal(game.products.cake, 1);
  advance(5000);
  assert.equal(game.products.cake, 1);
});

test('buying ingredients spends gold and adds stock', () => {
  const { game, player } = make(100);
  const r = game.buyIngredient('flour', 5);
  assert.deepEqual(r, { ok: true, cost: INGREDIENTS.flour.price * 5 });
  assert.equal(player.gold, 100 - INGREDIENTS.flour.price * 5);
  assert.equal(game.ingredients.flour, INGREDIENTS.flour.start + 5);
});

test('buying is refused without enough gold and changes nothing', () => {
  const { game, player } = make(10);
  const r = game.buyIngredient('butter', 1);               // costs 15
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'gold');
  assert.match(r.message, /Yetersiz altın/);
  assert.equal(player.gold, 10);
  assert.equal(game.ingredients.butter, INGREDIENTS.butter.start);
});

test('selling removes stock and pays the sale price', () => {
  const { game, player } = make(0);
  const r = game.sellProduct('bread', 2);
  const unit = Math.round(PRODUCTS.bread.price * SALES.showcaseRate);
  assert.deepEqual(r, { ok: true, income: unit * 2 });
  assert.equal(player.gold, unit * 2);
  assert.equal(game.products.bread, PRODUCTS.bread.start - 2);
});

test('showcase sales pay less than customer orders, yet every product stays profitable', () => {
  const { game } = make(0);
  assert.ok(SALES.showcaseRate > 0 && SALES.showcaseRate < 1);
  for (const [id, p] of Object.entries(PRODUCTS)) {
    const cost = Object.entries(p.ingredients).reduce((s, [i, n]) => s + INGREDIENTS[i].price * n, 0);
    assert.ok(game.showcaseIncome(p.price) < game.saleIncome(p.price), `${id}: showcase must pay less than a customer`);
    assert.ok(game.showcaseIncome(p.price) > cost, `${id}: showcase sale must still beat the ingredient cost`);
  }
});

test('selling more than the stock is refused', () => {
  const { game, player } = make(0);
  const r = game.sellProduct('cake', 1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'stock');
  assert.equal(player.gold, 0);
});

test('a full produce-and-sell round trip balances the economy', () => {
  const { game, player, advance } = make(500);
  const cost = Object.entries(PRODUCTS.coffee.ingredients).reduce((s, [i, n]) => s + INGREDIENTS[i].price * n, 0);
  game.startProduction('coffee'); advance(PRODUCTS.coffee.time);
  game.sellProduct('coffee', 1);
  assert.equal(player.gold, 500 + game.showcaseIncome(PRODUCTS.coffee.price));   // ingredients were already owned
  assert.ok(game.showcaseIncome(PRODUCTS.coffee.price) > cost, 'coffee must stay profitable even when sold from the showcase');
});

test('change and complete events fire', () => {
  const { game, advance } = make();
  const seen = [];
  game.on('change', (e) => seen.push(e.type));
  game.on('complete', (e) => seen.push(`done:${e.product}`));
  game.startProduction('coffee'); advance(PRODUCTS.coffee.time);
  game.buyIngredient('milk', 1); game.sellProduct('coffee', 1);
  assert.deepEqual(seen, ['start', 'done:coffee', 'complete', 'buy', 'sell']);
});

test('formatTime renders m:ss', () => {
  assert.equal(formatTime(75), '1:15');
  assert.equal(formatTime(9.2), '0:10');
  assert.equal(formatTime(0), '0:00');
});
