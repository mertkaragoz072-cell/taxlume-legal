import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { Cafe } from '../src/game/customers.js';
import { Quests } from '../src/game/quests.js';
import { Progression } from '../src/game/progression.js';
import { Town } from '../src/game/town.js';
import { Research } from '../src/game/research.js';
import { Shop, validateShop, describeEffect } from '../src/game/shop.js';
import { SaveManager, SAVE_KEY, SAVE_VERSION } from '../src/game/save.js';
import { SHOP_ITEMS, STAGES, RECIPES, UPGRADES, PRODUCTS, INGREDIENTS, CAFE, APPEAL, XP, DECOR_SLOT_TYPES } from '../src/data/economy.js';

class FakeStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const T0 = 1_700_000_000_000;
const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

/** The whole stack the app builds (src/runtime/world.ts), over a fake clock and storage. */
function make({ gold = 54320, level = 1, storage = new FakeStorage(), clock = { now: T0 }, rng = seeded(11), cafeCfg = {} } = {}) {
  const player = { gold, gems: 0 };
  const game = new Game(player, {}, () => clock.now);
  const progression = new Progression(game);
  new Town(game); new Research(game);
  const shop = new Shop(game);
  const quests = new Quests(game);
  const cafe = new Cafe(game, { rng, config: { ...CAFE, firstSpawnSec: 999, spawnEverySec: [999, 999], eatSec: 0, cleanSec: 0, ...cafeCfg } });
  cafe.setActive(true);
  const saves = new SaveManager(game, storage);
  const status = saves.load();
  saves.attach();
  if (level > 1) { progression.level = level; progression.rewardedLevel = level; }
  game.tick();
  return { game, player, progression, shop, quests, cafe, saves, storage, clock, status, advance: (s) => { clock.now += s * 1000; game.tick(); } };
}

// ---------------------------------------------------------------------------------- the vertical slice: an extra table
test('slice: the shop sells the 3rd table; gold drops by exactly the price, the café opens it, and a guest can use it', () => {
  const c = make({ level: 2, cafeCfg: { tablesUpgrade: 'cafeTables' } });
  assert.equal(c.cafe.tableCount(), 2);
  const price = UPGRADES.cafeTables.costs[0], gold = c.player.gold;
  const r = c.shop.buy('table3');
  assert.ok(r.ok, r.message);
  assert.equal(c.player.gold, gold - price);                         // exactly the price, once
  assert.equal(c.game.upgrades.cafeTables, 1);
  assert.equal(c.cafe.tableCount(), 3);
  assert.equal(c.shop.status('table3'), 'owned');
  for (let i = 0; i < 3; i++) c.cafe.arrive();                       // three guests: all three tables are used (and the queue holds nobody)
  c.cafe.seatQueued();
  const tables = c.cafe.customers.filter((g) => g.state === 'seated').map((g) => g.table).sort();
  assert.deepEqual(tables, [0, 1, 2]);
});

test('slice: the table and the gold survive closing and reopening the game', () => {
  const storage = new FakeStorage(), clock = { now: T0 };
  const a = make({ level: 2, storage, clock, cafeCfg: { tablesUpgrade: 'cafeTables' } });
  assert.ok(a.shop.buy('table3').ok);
  const gold = a.player.gold;
  const b = make({ gold: 0, storage, clock, cafeCfg: { tablesUpgrade: 'cafeTables' } });          // a new session over the same storage: the save wins
  assert.equal(b.status.status, 'loaded');
  assert.equal(b.player.gold, gold);
  assert.equal(b.game.upgrades.cafeTables, 1);
  assert.equal(b.cafe.tableCount(), 3);
  assert.equal(b.shop.has('table3'), true);
  assert.equal(b.shop.status('table4'), 'locked');                    // the 4th table still needs level 4
});

test('the 3rd table needs level 2: below it the purchase is refused and no gold is taken', () => {
  const c = make({ level: 1, cafeCfg: { tablesUpgrade: 'cafeTables' } });
  const gold = c.player.gold, r = c.shop.buy('table3');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'level');
  assert.match(r.message, /Seviye 2/);
  assert.equal(c.player.gold, gold);
  assert.equal(c.game.upgrades.cafeTables, 0);
});

// ---------------------------------------------------------------------------------- money rules
test('not enough gold: nothing is bought, the missing amount is stated', () => {
  const c = make({ gold: 1000, level: 3 });
  const r = c.shop.buy('ovenT2');
  assert.equal(r.ok, false); assert.equal(r.reason, 'gold');
  assert.match(r.message, /2\.200 altın eksik/);
  assert.equal(c.player.gold, 1000); assert.equal(c.shop.has('ovenT2'), false);
  assert.equal(c.shop.view('ovenT2').missingGold, 2200);
});

test('a purchase is checked again at the moment of buying (gold spent in between)', () => {
  const c = make({ gold: 3300, level: 3 });
  assert.equal(c.shop.view('ovenT2').missingGold, 0);                 // the card said "affordable"
  c.game.buyIngredient('flour', 20);                                  // ... then the player spends elsewhere
  const r = c.shop.buy('ovenT2');
  assert.equal(r.ok, false); assert.equal(r.reason, 'gold');
  assert.equal(c.shop.has('ovenT2'), false);
});

test('the same purchase can never be applied twice (owned, replayed request, double tap)', () => {
  const c = make({ level: 3 });
  const gold = c.player.gold;
  assert.ok(c.shop.buy('ovenT2', 'req-1').ok);
  assert.equal(c.shop.buy('ovenT2', 'req-1').reason, 'duplicate');
  assert.equal(c.shop.buy('ovenT2', 'req-2').reason, 'owned');
  assert.equal(c.player.gold, gold - 3200);
  assert.equal(c.game.stats.shopBought, 1);
  assert.equal(c.game.stats.goldSpent, 3200);
});

test('every payment goes through Game.spend: lifetime gold spent counts ingredients, upgrades, town, research and the shop', () => {
  const c = make({ level: 5 });
  c.game.buyIngredient('flour', 2);                                  // 16
  c.game.buyUpgrade('productionSpeed');                              // 600
  c.shop.buy('matPaw');                                              // 350
  assert.equal(c.game.stats.goldSpent, 16 + 600 + 350);
  assert.equal(c.game.spend(1e12), false);                           // cannot spend what is not there
  assert.equal(c.game.spend(-5), false);
  assert.equal(c.game.stats.goldSpent, 966);
});

test('a purchase that fails half-way gives the gold back and the item is not owned', () => {
  const c = make({ level: 3 });
  const gold = c.player.gold, spent = c.game.stats.goldSpent;
  c.game.progression.gain = () => { throw new Error('boom'); };       // something in the purchase step breaks
  const r = c.shop.buy('ovenT2');
  assert.equal(r.ok, false); assert.equal(r.reason, 'error');
  assert.equal(c.player.gold, gold); assert.equal(c.game.stats.goldSpent, spent);
  assert.equal(c.shop.has('ovenT2'), false); assert.equal(c.game.stats.shopBought, 0);
});

// ---------------------------------------------------------------------------------- gating
test('content opens step by step: level, previous tier, stage, recipe chain', () => {
  const c = make({ level: 1 });
  assert.equal(c.shop.status('matPaw'), 'ready');                    // an early first purchase
  assert.equal(c.shop.status('ovenT2'), 'locked');                   // level 3
  c.progression.level = 3;
  assert.equal(c.shop.status('ovenT2'), 'ready');
  assert.equal(c.shop.status('ovenT3'), 'locked');                   // needs ovenT2, level 7, stage 2
  assert.deepEqual(c.shop.conditions('ovenT3').map((x) => x.kind).sort(), ['item', 'level', 'stage']);
  assert.equal(c.shop.status('recipeKurabiye'), 'locked');           // simit first
  assert.ok(c.shop.buy('recipeSimit').ok);
  c.progression.level = 4;
  assert.equal(c.shop.status('recipeKurabiye'), 'ready');
  assert.ok(['level', 'locked'].includes(c.shop.buy('ovenT3').reason));
});

test('with 54.320 gold at level 1 the whole catalogue is NOT buyable (level / stage gates hold the player back)', () => {
  const c = make({ level: 1 });
  const ready = SHOP_ITEMS.filter((d) => c.shop.status(d.id) === 'ready');
  assert.ok(ready.length >= 2 && ready.length <= 5, `${ready.map((d) => d.id)}`);
  assert.ok(SHOP_ITEMS.reduce((s, d) => s + (d.price ?? 0), 0) > 54320 * 4, 'the catalogue is far bigger than the starting gold');
});

// ---------------------------------------------------------------------------------- effects, each applied once
test('equipment tiers replace each other: the oven gets faster by the best tier, never stacked', () => {
  const c = make({ level: 12 });
  const base = c.game.duration('bread');
  assert.equal(base, PRODUCTS.bread.time);
  c.game.upgrades.productionSpeed = 0;
  c.progression.level = 7; c.shop.stageId = 3;
  assert.ok(c.shop.buy('ovenT2').ok);
  assert.equal(c.game.duration('bread'), Math.round(PRODUCTS.bread.time * 0.92 * 10) / 10);
  assert.ok(c.shop.buy('ovenT3').ok);
  assert.equal(c.game.duration('bread'), Math.round(PRODUCTS.bread.time * 0.84 * 10) / 10);   // 16%, not 8% + 16%
  assert.equal(c.game.duration('coffee'), PRODUCTS.coffee.time);                              // the coffee machine is not touched
  c.game.upgrades.productionSpeed = 1;                                                       // upgrade, research and equipment are three sources
  assert.equal(c.game.duration('bread'), Math.round(PRODUCTS.bread.time * 0.9 * 0.84 * 10) / 10);
});

test('coffee machine tiers add parallel jobs; the save accepts them and rejects more', () => {
  const c = make({ level: 3 });
  assert.equal(c.game.capacity('coffee'), 1);
  assert.ok(c.shop.buy('coffeeT2').ok);
  assert.equal(c.game.capacity('coffee'), 2);
  for (const k of Object.keys(c.game.ingredients)) c.game.ingredients[k] = 50;
  assert.ok(c.game.startProduction('coffee').ok); assert.ok(c.game.startProduction('coffee').ok);
  assert.equal(c.game.startProduction('coffee').ok, false);          // capacity reached
  const reloaded = make({ storage: c.storage, clock: c.clock });
  assert.equal(reloaded.status.status, 'loaded');
  assert.equal(reloaded.game.jobsOf('coffee').length, 2);
});

test('showcase tier: more units can be kept; storage tier: ingredient purchases are limited by the cap and refused beyond it', () => {
  const c = make({ level: 5, gold: 200_000 });
  assert.equal(c.game.showcaseLimit(), UPGRADES.showcaseCapacity.values[0]);
  assert.ok(c.shop.buy('showcaseT2').ok);
  assert.equal(c.game.showcaseLimit(), UPGRADES.showcaseCapacity.values[0] + 10);
  c.game.upgrades.showcaseCapacity = 2;                              // the upgrade and the equipment add up (two sources)
  assert.equal(c.game.showcaseLimit(), 20 + 10);
  // storage
  assert.equal(c.game.ingredientCap(), 60);
  c.game.ingredients.flour = 50;
  const refused = c.game.purchase('flour', 20);
  assert.equal(refused.ok, false); assert.equal(refused.reason, 'storage'); assert.match(refused.message, /10 adetlik yer/);
  assert.equal(c.game.ingredients.flour, 50);
  assert.ok(c.game.purchase('flour', 10).ok);
  assert.equal(c.game.purchase('flour', 1).reason, 'storage');
  assert.ok(c.shop.buy('storageT2').ok);
  assert.equal(c.game.ingredientCap(), 120);
  assert.ok(c.game.purchase('flour', 40).ok);
});

test('rewards ignore the storage cap (a quest, level or daily reward is never lost)', () => {
  const c = make({ level: 1 });
  c.game.ingredients.flour = 60;
  c.quests.claim('firstBread');                                       // not complete yet: refused, nothing changes
  c.game.stats.soldTotal = 1; assert.ok(c.quests.claim('firstSale').ok);   // +4 flour
  assert.equal(c.game.ingredients.flour, 64);
});

test('prep counter: the refund adds to the research refund inside ONE function and never exceeds the ingredient value', () => {
  const c = make({ level: 12, gold: 500_000 });
  const value = c.game.ingredientCost('cake');
  assert.equal(c.game.ingredientRebate('cake'), 0);
  assert.ok(c.shop.buy('counterT2').ok);
  assert.equal(c.game.ingredientRebate('cake'), Math.round(value * 0.05));
  c.game.research.levels.efficientProduction = 5;                         // 25% research
  assert.equal(c.game.ingredientRebate('cake'), Math.round(value * 0.30));
  const gold = c.player.gold;
  for (const k of Object.keys(c.game.ingredients)) c.game.ingredients[k] = 50;
  const r = c.game.startProduction('cake');
  assert.equal(r.rebate, Math.round(value * 0.30));
  assert.equal(c.player.gold, gold + Math.round(value * 0.30));
});

// ---------------------------------------------------------------------------------- recipes
test('a recipe is locked until bought: it cannot be made, is never ordered, and then works everywhere', () => {
  const c = make({ level: 1, cafeCfg: { orderWeights: { bread: 0, croissant: 0, cake: 0, coffee: 0, simit: 5 } } });
  for (const k of Object.keys(c.game.ingredients)) c.game.ingredients[k] = 50;
  const blocked = c.game.startProduction('simit');
  assert.equal(blocked.ok, false); assert.equal(blocked.reason, 'locked');
  assert.equal(c.game.isUnlocked('simit'), false);
  const g1 = c.cafe.arrive(); c.cafe.seatQueued();
  assert.notEqual(c.cafe.orderOf(g1).product, 'simit');              // not ordered while locked
  assert.ok(c.shop.buy('recipeSimit').ok);
  assert.ok(c.game.startProduction('simit').ok);
  c.advance(RECIPES.simit.time);
  assert.equal(c.game.products.simit, 1);
  assert.equal(c.game.stats.produced.simit, 1);
  assert.ok(c.game.progression.xp >= XP.produce.simit);
  // the guest after the purchase can order it, and the sale pays the recipe price
  const g2 = c.cafe.arrive(); c.cafe.seatQueued();
  const o = c.cafe.orderOf(g2); assert.equal(o.product, 'simit');
  const r = c.cafe.deliver(o.id);
  assert.ok(r.ok); assert.equal(r.income, RECIPES.simit.price);
});

test('recipes and their stock survive a reload; an old save without a shop loads with every recipe locked', () => {
  const storage = new FakeStorage(), clock = { now: T0 };
  const a = make({ level: 1, storage, clock });
  a.shop.buy('recipeSimit'); a.game.products.simit = 3;
  a.game.emit('change', { type: 'cafe' });
  const b = make({ storage, clock });
  assert.equal(b.game.isUnlocked('simit'), true); assert.equal(b.game.products.simit, 3);
  // an old (v9) save: no shop key at all
  const old = JSON.parse(storage.getItem(SAVE_KEY)); delete old.shop; old.version = 9; delete old.stats.goldSpent; delete old.stats.shopBought;
  storage.setItem(SAVE_KEY, JSON.stringify(old));
  const c = make({ gold: 1, storage, clock });
  assert.equal(c.status.status, 'loaded');
  assert.equal(c.player.gold, old.gold);                              // gold and progress are kept
  assert.equal(c.game.isUnlocked('simit'), false);
  assert.equal(c.game.stats.goldSpent, 0);
  assert.equal(c.shop.ownedCount(), 0);
  assert.equal(c.shop.stageId, 1);
});

test('new recipes are balanced above the old ones per gold of ingredients, and every one has its XP and order weight', () => {
  const cost = (r) => Object.entries(r.ingredients).reduce((s, [i, n]) => s + n * INGREDIENTS[i].price, 0);
  for (const [id, r] of Object.entries(RECIPES)) {
    assert.ok(XP.produce[id] > 0 && XP.sale[id] > 0, id);
    assert.ok(CAFE.orderWeights[id] > 0, id);
    assert.ok(r.price > cost(r), `${id} must earn more than it costs`);
    const net = (r.price - cost(r)) / r.time;
    assert.ok(net >= 0.75 && net <= 1.15, `${id}: ${net.toFixed(2)} gold/s`);           // close to the old products (0.7 - 1.06): no recipe is the best at everything
    assert.ok(SHOP_ITEMS.some((d) => d.recipe === id), `${id} is sold`);
  }
});

// ---------------------------------------------------------------------------------- decoration, appeal, tips
test('recipe choice is real: within a station a longer recipe always pays more per unit, while gold per second stays in one band (no recipe wins both ways)', () => {
  const all = { ...PRODUCTS, ...RECIPES };
  const cost = (r) => Object.entries(r.ingredients).reduce((s, [i, n]) => s + n * INGREDIENTS[i].price, 0);
  for (const station of ['oven', 'coffee']) {
    const list = Object.entries(all).filter(([, r]) => r.station === station).map(([id, r]) => ({ id, time: r.time, net: r.price - cost(r), perSec: (r.price - cost(r)) / r.time })).sort((a, b) => a.time - b.time);
    for (let i = 1; i < list.length; i++) assert.ok(list[i].net > list[i - 1].net, `${station}: ${list[i].id} (${list[i].time}s) must pay more per unit than ${list[i - 1].id}`);
    for (const r of list) assert.ok(r.perSec >= 0.69 && r.perSec <= 1.1, `${r.id}: ${r.perSec.toFixed(2)} gold/s`);
    const best = Math.max(...list.map((r) => r.perSec)), top = list[list.length - 1];
    assert.ok(top.perSec < best, `${station}: the slowest, biggest recipe (${top.id}) is not the best per second`);
  }
});

test('decoration: placed items add appeal; guests come faster and sometimes tip; a shared slot holds one at a time', () => {
  const c = make({ level: 6, gold: 200_000, cafeCfg: { tablesUpgrade: null, tables: 4 } });
  assert.equal(c.shop.appeal(), 0); assert.equal(c.shop.arrivalFactor(), 1); assert.equal(c.shop.tipChance(), 0);
  assert.equal(c.shop.status('rugAisle'), 'locked');                 // the aisle must be opened first
  assert.ok(c.shop.buy('areaAisle').ok);
  for (const id of ['matPaw', 'plantA', 'rugAisle']) assert.ok(c.shop.buy(id).ok, id);
  assert.equal(c.shop.appeal(), 1 + 2 + 2);
  assert.ok(Math.abs(c.shop.arrivalFactor() - (1 - 5 * APPEAL.arrivalPerPoint)) < 1e-9);
  assert.ok(Math.abs(c.shop.tipChance() - 5 * APPEAL.tipPerPoint) < 1e-9);
  // shared slot: the latest bought is placed; the other can be placed again
  c.progression.level = 6;
  assert.ok(c.shop.buy('tableCake').ok); assert.equal(c.shop.tableTop(), 'cake');
  assert.ok(c.shop.buy('tableCup').ok); assert.equal(c.shop.tableTop(), 'cup');
  assert.equal(c.shop.isPlaced('tableCake'), false);
  const appealBefore = c.shop.appeal();
  c.shop.place('tableTop', 'tableCake'); assert.equal(c.shop.tableTop(), 'cake');
  assert.equal(c.shop.appeal(), appealBefore);                       // one table top counts once
});

test('tips: a guest with a tip pays the bill plus the tip once; without appeal no random number is drawn', () => {
  let draws = 0; const rng = () => { draws++; return 0.0001; };       // always "lucky"
  const plain = make({ level: 1, rng, cafeCfg: { orderWeights: { bread: 1, croissant: 0, cake: 0, coffee: 0 } } });
  plain.game.products.bread = 5;
  const g0 = plain.cafe.arrive(); plain.cafe.seatQueued(); draws = 0;
  const gold0 = plain.player.gold, r0 = plain.cafe.deliverToCustomer(g0.id);
  assert.equal(r0.income, PRODUCTS.bread.price); assert.equal(r0.tip, 0); assert.equal(draws, 0);
  assert.equal(plain.player.gold, gold0 + PRODUCTS.bread.price);
  const c = make({ level: 6, gold: 100_000, rng, cafeCfg: { orderWeights: { bread: 1, croissant: 0, cake: 0, coffee: 0 } } });
  c.shop.buy('areaAisle');
  for (const id of ['matPaw', 'plantA', 'rugAisle']) c.shop.buy(id);
  c.game.products.bread = 5;
  const g = c.cafe.arrive(); c.cafe.seatQueued();
  const gold = c.player.gold, r = c.cafe.deliverToCustomer(g.id);
  const tip = Math.max(1, Math.round(PRODUCTS.bread.price * APPEAL.tipShare));
  assert.equal(r.tip, tip); assert.equal(r.income, PRODUCTS.bread.price + tip);
  assert.equal(c.player.gold, gold + PRODUCTS.bread.price + tip);    // once
  assert.equal(c.cafe.deliver(r.orderId).ok, false);                  // not twice
});

// ---------------------------------------------------------------------------------- expansion and special guests
test('waiting area: more guests can wait outside; the save keeps them', () => {
  const c = make({ level: 3, cafeCfg: { tablesUpgrade: 'cafeTables', tables: 4 } });
  assert.equal(c.cafe.queueCap(), 1);
  assert.ok(c.shop.buy('waitingA').ok);
  assert.equal(c.cafe.queueCap(), 2);
  c.cafe.arrive(); c.cafe.arrive(); c.cafe.seatQueued();             // the two open tables fill up
  c.cafe.arrive(); c.cafe.arrive();                                   // two more wait outside: the cap is 2 now
  c.game.emit('change', { type: 'cafe' });
  const waiting = c.cafe.queued().length;
  const b = make({ storage: c.storage, clock: c.clock, cafeCfg: { tablesUpgrade: 'cafeTables', tables: 4 } });
  assert.equal(b.cafe.queued().length, waiting);                      // nobody is trimmed on reload: the SAVED waiting area counts
});

test('VIP guests: unlocked by the shop, flagged, saved, and they pay more once', () => {
  const noVip = make({ level: 8, rng: () => 0.01 });
  assert.equal(noVip.shop.vip(), null);
  assert.equal(noVip.cafe.arrive().vip, undefined);
  const c = make({ level: 13, gold: 500_000, rng: () => 0.01, cafeCfg: { orderWeights: { bread: 1, croissant: 0, cake: 0, coffee: 0 } } });
  c.shop.stageId = 4; assert.ok(c.shop.buy('vip1').ok);
  const g = c.cafe.arrive(); c.cafe.seatQueued();
  assert.equal(g.vip, true);
  c.game.emit('change', { type: 'cafe' });
  const b = make({ storage: c.storage, clock: c.clock, rng: () => 0.99 });
  assert.equal(b.cafe.customers.find((x) => x.id === g.id)?.vip, true);
  c.game.products.bread = 3;
  const r = c.cafe.deliverToCustomer(g.id);
  assert.equal(r.income, Math.round(PRODUCTS.bread.price * 1.6));
});

// ---------------------------------------------------------------------------------- stages and goals
test('stages: every condition is real game data (level, spending, sales, equipment, recipes, items, upgrades); the reward is paid once; the next goal is visible', () => {
  const c = make({ level: 1, gold: 100_000 });
  const s2 = STAGES[1];
  assert.equal(c.shop.stageId, 1);
  const prog = () => Object.fromEntries(c.shop.stageProgress(s2).map((p) => [p.key, p.ok]));
  assert.deepEqual(prog(), { level: false, spent: false, sold: false, equipment: false, recipes: false, items: false, upgrades: false });
  c.progression.level = 4;
  assert.equal(prog().level, true);
  c.shop.buy('matPaw'); c.shop.buy('plantA');
  c.game.buyUpgrade('productionSpeed'); c.game.buyUpgrade('showcaseCapacity');
  assert.equal(prog().upgrades, true); assert.equal(prog().items, false);
  c.shop.buy('recipeSimit');
  assert.deepEqual([prog().recipes, prog().items], [true, true]);
  c.game.buyIngredient('flour', 40); c.game.buyIngredient('butter', 30); c.game.buyIngredient('beans', 20);   // spending counts, however it is spent
  assert.equal(prog().equipment, false);
  c.shop.buy('storageT2');
  assert.equal(prog().equipment, true); assert.equal(prog().spent, true);
  assert.equal(c.shop.stageId, 1, 'sales are still missing');
  const gold = c.player.gold;
  c.game.products.bread = 30; c.game.sellProduct('bread', 24);       // 24 of 25 sold
  assert.equal(c.shop.stageId, 1); assert.equal(c.shop.stageProgress(s2).find((p) => p.key === 'sold').have, 24);
  c.game.sellProduct('bread', 1);
  assert.equal(c.shop.stageId, 2);
  const afterReward = c.player.gold;
  assert.ok(afterReward >= gold + s2.reward.gold, 'the stage reward was paid');
  c.game.emit('change', { type: 'cafe' }); c.game.emit('change', { type: 'cafe' });
  assert.equal(c.player.gold, afterReward);                           // no second payment
  assert.equal(c.shop.nextStage().id, 3);
});

test('the next goal: nearest thing to save for, then "ready", then the level gate', () => {
  const c = make({ level: 1, gold: 100 });
  let g = c.shop.nextGoal();
  assert.equal(g.kind, 'save'); assert.equal(g.item.id, 'matPaw');   // the cheapest open item
  assert.equal(g.missingGold, 250); assert.ok(Math.abs(g.progress - 100 / 350) < 1e-9);
  c.player.gold = 100_000;
  g = c.shop.nextGoal();
  assert.equal(g.kind, 'ready');
  for (const d of SHOP_ITEMS) if (c.shop.status(d.id) === 'ready') c.shop.buy(d.id);
  g = c.shop.nextGoal();
  assert.equal(g.kind, 'level'); assert.match(g.text, /Seviye|Aşama/);
});

// ---------------------------------------------------------------------------------- save
test('validateShop repairs garbage and never loses an owned decoration', () => {
  const c = make({ level: 6 });
  const v = validateShop({ owned: ['plantA', 'nope', 'plantA', 'tableCake', 'plantB'], placed: { 'edge-left': 'nope', tableTop: 'plantA', 'edge-right': 'plantA', 'wall-r1': 'plantB' }, stored: ['plantB', 'matPaw'], introduced: ['ovenT2', 'plantA'], stage: 99 }, c.shop);
  assert.deepEqual(v.owned, ['plantA', 'tableCake', 'plantB']);
  assert.equal(v.placed['edge-right'], 'plantA');                     // a plant in a plant slot stays
  assert.equal(v.placed.tableTop, 'tableCake');                       // wrong-type entries ignored, the owned piece placed where it belongs
  assert.equal(v.placed['wall-r1'], undefined);                       // a plant cannot stand on a shelf
  assert.ok(Object.values(v.placed).includes('plantB') || v.stored.includes('plantB'), 'plantB is placed or stored, never lost');
  assert.deepEqual(v.stored.filter((id) => !['plantB'].includes(id)), []);   // matPaw is not owned: dropped from stored
  assert.deepEqual(v.introduced, ['plantA']);
  assert.equal(v.stage, 4);                                           // clamped, not trusted
  assert.deepEqual(validateShop(undefined, c.shop), { owned: [], placed: {}, stored: [], introduced: [], stage: 1 });
  assert.deepEqual(validateShop('x', c.shop), { owned: [], placed: {}, stored: [], introduced: [], stage: 1 });
  // a v10 save (no `stored`) loads: pieces keep their slots
  const old = validateShop({ owned: ['plantA', 'lampA'], placed: { 'edge-left': 'plantA', 'lamp-1': 'lampA' }, introduced: [], stage: 2 }, c.shop);
  assert.deepEqual(old.placed, { 'edge-left': 'plantA', 'lamp-1': 'lampA' }); assert.deepEqual(old.stored, []);
});

test('placement mode: pieces move between the slots of their type, swap, are taken down and put back; appeal follows what stands; it all survives a reload', () => {
  const storage = new FakeStorage(), clock = { now: T0 };
  const c = make({ level: 8, gold: 400_000, storage, clock });
  for (const id of ['plantA', 'plantB', 'areaAisle', 'plantC']) assert.ok(c.shop.buy(id).ok, id);
  assert.deepEqual(c.shop.placed, { 'edge-left': 'plantA', 'edge-right': 'plantB', 'aisle-top': 'plantC' });   // each in the first free slot
  assert.equal(c.shop.appeal(), 2 + 3 + 3);
  assert.deepEqual(c.shop.slotChoices('plantA').map((x) => [x.slot, x.here, x.occupant]), [['edge-left', true, null], ['edge-right', false, 'Pembe Çiçekli Saksı'], ['aisle-top', false, 'Sarkık Bitki']]);
  assert.equal(c.shop.place('wall-r1', 'plantA').ok, false);          // wrong type of slot
  assert.equal(c.shop.place('edge-right', 'matPaw').ok, false);       // not owned / wrong type
  assert.ok(c.shop.place('edge-right', 'plantA').ok);                 // swap: plantB takes plantA's old slot
  assert.deepEqual(c.shop.placed, { 'edge-left': 'plantB', 'edge-right': 'plantA', 'aisle-top': 'plantC' });
  assert.ok(c.shop.unplace('plantC').ok);                             // taken down: owned, stored, no appeal
  assert.equal(c.shop.has('plantC'), true); assert.equal(c.shop.isPlaced('plantC'), false);
  assert.equal(c.shop.appeal(), 2 + 3); assert.deepEqual([...c.shop.stored], ['plantC']);
  assert.equal(c.shop.unplace('plantC').ok, false);                   // twice: nothing to do
  const gold = c.player.gold; assert.ok(c.shop.place('aisle-top', 'plantC').ok); assert.equal(c.player.gold, gold);   // placing is free
  assert.ok(c.shop.unplace('plantA').ok);
  const b = make({ storage, clock });                                 // reopen: the arrangement is still there, the stored piece still stored
  assert.deepEqual(b.shop.placed, { 'edge-left': 'plantB', 'aisle-top': 'plantC' });
  assert.deepEqual([...b.shop.stored], ['plantA']);
  assert.equal(b.shop.appeal(), 3 + 3);
});

test('wall shelves: three pieces compete for two places, so the player chooses; the extra one waits in storage; a shared slot swaps in the newest', () => {
  const c = make({ level: 8, gold: 400_000 });
  for (const id of ['areaWall', 'shelfPlants', 'shelfBread', 'rackPots']) assert.ok(c.shop.buy(id).ok, id);
  assert.equal(Object.keys(c.shop.placed).filter((s) => s.startsWith('wall')).length, 2);
  assert.deepEqual([...c.shop.stored], ['rackPots']);
  assert.ok(c.shop.place('wall-r1', 'rackPots').ok);                 // rack replaces what stood there, which goes to storage (it does not fit anywhere else)
  assert.equal(c.shop.placed['wall-r1'], 'rackPots');
  assert.equal(c.shop.appeal(), 3 + 3);
  assert.ok(c.shop.buy('tableCake').ok); assert.ok(c.shop.buy('tablePlain').ok);
  assert.equal(c.shop.tableTop(), 'plain');                          // the newest table set stands; the old one is stored and can come back
  assert.ok(c.shop.place('tableTop', 'tableCake').ok); assert.equal(c.shop.tableTop(), 'cake'); assert.ok(c.shop.stored.has('tablePlain'));
});

test('everything bought and where it stands survives a reload; reset starts clean', () => {
  const storage = new FakeStorage(), clock = { now: T0 };
  const a = make({ level: 8, gold: 300_000, storage, clock });
  for (const id of ['matPaw', 'plantA', 'areaAisle', 'areaWall', 'lampA', 'shelfPlants', 'tableCake', 'ovenT2', 'storageT2', 'waitingA', 'recipeSimit']) assert.ok(a.shop.buy(id).ok, id);
  a.shop.stageId = 2;
  a.game.emit('change', { type: 'cafe' });
  const saved = JSON.parse(storage.getItem(SAVE_KEY));
  assert.equal(saved.version, SAVE_VERSION);
  const b = make({ storage, clock });
  assert.deepEqual(b.shop.exportState(), a.shop.exportState());
  assert.equal(b.player.gold, a.player.gold); assert.notEqual(a.player.gold, 54320);
  assert.equal(b.game.stats.goldSpent, a.game.stats.goldSpent);
  assert.equal(b.shop.appeal(), a.shop.appeal());
  assert.equal(b.game.ingredientCap(), 120);
  const r = b.saves.reset({ confirmed: true });
  assert.ok(r.ok);
  assert.equal(b.shop.ownedCount(), 0); assert.equal(b.shop.stageId, 1); assert.equal(b.game.isUnlocked('simit'), false);
  assert.equal(b.player.gold, 54320);
});

test('first use of new equipment: the introduction plays once and is remembered', () => {
  const c = make({ level: 3 });
  assert.equal(c.shop.pendingIntro('oven'), null);                   // tier 1 has no introduction
  c.shop.buy('ovenT2');
  assert.equal(c.shop.pendingIntro('oven').id, 'ovenT2');
  const seen = []; c.game.on('shopIntro', (e) => seen.push(e.item.id));
  assert.equal(c.shop.introduce('oven').id, 'ovenT2');
  assert.equal(c.shop.introduce('oven'), null);
  assert.deepEqual(seen, ['ovenT2']);
  const b = make({ storage: c.storage, clock: c.clock });
  assert.equal(b.shop.pendingIntro('oven'), null);                   // does not replay after a reload
});

test('descriptions are built from the numbers (they cannot disagree with the effect)', () => {
  const c = make({ level: 1 });
  assert.match(describeEffect(c.shop.def('ovenT2'), c.game), /%8 daha hızlı/);
  assert.match(describeEffect(c.shop.def('coffeeT3'), c.game), /3 ürün/);
  assert.match(describeEffect(c.shop.def('storageT2'), c.game), /120 adet/);
  assert.match(describeEffect(c.shop.def('table3'), c.game), /3 masa/);
  for (const d of SHOP_ITEMS) assert.ok(d.price > 0 || d.kind === 'upgrade', d.id);
});

test('the catalogue is consistent: unique ids, valid requirements, equipment lines are chains, slots exist for every decoration', async () => {
  const { DECOR_SLOTS } = await import('../src/scene/interior-layout.js');
  for (const slot of Object.keys(DECOR_SLOT_TYPES)) assert.ok(DECOR_SLOTS[slot] || ['tableTop', 'theme'].includes(slot), `slot ${slot} has a position`);
  for (const slot of Object.keys(DECOR_SLOTS)) assert.ok(DECOR_SLOT_TYPES[slot], `slot ${slot} has a type`);
  const ids = SHOP_ITEMS.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const d of SHOP_ITEMS) {
    for (const r of d.requires ?? []) if (r.item) assert.ok(ids.includes(r.item), `${d.id} requires ${r.item}`);
    if (d.type) assert.ok(Object.values(DECOR_SLOT_TYPES).some((x) => x.type === d.type), `${d.id}: type ${d.type} has a slot`);
    if (d.kind === 'recipe') assert.ok(RECIPES[d.recipe], d.id);
    if (d.kind === 'upgrade') assert.ok(UPGRADES[d.upgrade].costs[d.level - 1] > 0, d.id);
    if (d.kind === 'equipment' && d.tier > 2) assert.ok(d.requires.some((r) => r.item), `${d.id} follows a lower tier`);
  }
  const lines = [...new Set(SHOP_ITEMS.filter((d) => d.line).map((d) => d.line))];
  for (const l of lines) { const tiers = SHOP_ITEMS.filter((d) => d.line === l).map((d) => d.tier).sort(); assert.deepEqual(tiers, tiers.map((_, i) => i + 2).slice(0, tiers.length), `${l} tiers are 2,3,4`); }
  const prices = (line) => SHOP_ITEMS.filter((d) => d.line === line).sort((a, b) => a.tier - b.tier).map((d) => d.price);
  for (const l of ['oven', 'coffee', 'counter', 'showcase', 'storage']) { const p = prices(l); for (let i = 1; i < p.length; i++) assert.ok(p[i] > p[i - 1] * 2, `${l}: each tier costs well over double the last`); }
});
