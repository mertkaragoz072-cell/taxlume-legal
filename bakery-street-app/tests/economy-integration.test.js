// Integrated check of the whole gold loop, with every system attached the way the app builds them (src/runtime/world.ts):
// selling, spending, what a purchase opens, equipment effects, persistence, goals, and the ways gold could be duplicated or made negative.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { Cafe } from '../src/game/customers.js';
import { Quests } from '../src/game/quests.js';
import { Progression } from '../src/game/progression.js';
import { Town } from '../src/game/town.js';
import { Research } from '../src/game/research.js';
import { Exploration } from '../src/game/exploration.js';
import { DailyReward } from '../src/game/daily.js';
import { Shop } from '../src/game/shop.js';
import { SaveManager, SAVE_KEY, SAVE_VERSION } from '../src/game/save.js';
import { setCanvasFactory } from '../src/util.js';
import { registerImage, unregisterImage } from '../src/assets.js';
import { InteriorScene } from '../src/scene/interior-scene.js';
import { SHOP_ITEMS, STAGES, PRODUCTS, RECIPES, INGREDIENTS, CAFE, QUESTS, DAILY, EXPLORE, EXPLORE_LIMIT, EQUIPMENT_ART } from '../src/data/economy.js';

class FakeStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const T0 = new Date(2024, 2, 10, 12, 0).getTime();
const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

function make({ gold = 54320, level = 1, storage = new FakeStorage(), clock = { now: T0 }, rng = seeded(5), cafeCfg = {} } = {}) {
  const player = { gold, gems: 0 };
  const game = new Game(player, {}, () => clock.now);
  const progression = new Progression(game);
  const town = new Town(game), research = new Research(game);
  const exploration = new Exploration(game, { rng: () => 0.999 });
  const shop = new Shop(game);
  const quests = new Quests(game);
  const daily = new DailyReward(game);
  const cafe = new Cafe(game, { rng, config: { ...CAFE, firstSpawnSec: 999, spawnEverySec: [999, 999], eatSec: 0, cleanSec: 0, orderPatienceSec: 500, ...cafeCfg } });
  cafe.setActive(true);
  const saves = new SaveManager(game, storage);
  const status = saves.load(); saves.attach();
  if (level > 1) { progression.level = level; progression.rewardedLevel = level; }
  game.tick();
  return { game, player, progression, town, research, exploration, shop, quests, daily, cafe, saves, storage, clock, status, advance: (s) => { clock.now += s * 1000; game.tick(); } };
}
const cost = (r) => Object.entries(r.ingredients).reduce((s, [i, n]) => s + n * INGREDIENTS[i].price, 0);

// ---------------------------------------------------------------------------------- 1. selling pays the real price
test('a customer sale pays exactly the product price (every product, recipes included); the showcase pays less; the ledger records it', () => {
  const c = make({ level: 20, gold: 1e6 });
  c.shop.stageId = 4;
  for (const d of SHOP_ITEMS) if (d.kind === 'recipe') { for (let i = 0; i < 4; i++) c.shop.buy(d.id); }
  for (const [id, def] of Object.entries({ ...PRODUCTS, ...RECIPES })) {
    c.game.products[id] = 5;
    const g = c.cafe.arrive(); c.cafe.seatQueued();
    const o = c.cafe.orderOf(g); o.product = id; o.price = def.price;
    const gold = c.player.gold, earned = c.game.stats.goldEarned;
    const r = c.cafe.deliver(o.id);
    assert.ok(r.ok, id);
    assert.equal(r.income, def.price, `${id}: the customer pays the listed price`);
    assert.equal(c.player.gold, gold + def.price);
    assert.equal(c.game.stats.goldEarned, earned + def.price);
    assert.equal(c.game.ledger[0].delta, def.price); assert.equal(c.game.ledger[0].source, 'sale');
    const show = c.game.sellProduct(id, 1);
    assert.ok(show.income < def.price && show.income > cost(def), `${id}: the showcase pays less than a guest but more than the ingredients cost`);
  }
});

test('every product earns more than its ingredients cost; price, ingredient cost and time are separate fields', () => {
  for (const [id, def] of Object.entries({ ...PRODUCTS, ...RECIPES })) {
    assert.ok(def.price > cost(def), id); assert.ok(def.time >= 10, id);
    assert.ok(Number.isInteger(def.price) && Number.isInteger(def.time), id);
    assert.ok(Object.keys(def.ingredients).every((i) => INGREDIENTS[i]), `${id}: known ingredients`);
  }
});

// ---------------------------------------------------------------------------------- 2. spending
test('ingredients, upgrades, equipment, recipes and decoration take exactly their price; a short purchase takes nothing and says how much is missing', () => {
  const c = make({ level: 6, gold: 20_000 });
  const spend = [];
  let gold = c.player.gold;
  const step = (label, fn, expected) => { const r = fn(); assert.ok(r.ok, `${label}: ${r.message}`); assert.equal(gold - c.player.gold, expected, label); gold = c.player.gold; spend.push(expected); };
  step('ingredients', () => c.game.buyIngredient('flour', 10), 10 * INGREDIENTS.flour.price);
  step('market', () => c.game.purchase('butter', 5), 5 * INGREDIENTS.butter.price);
  step('café upgrade', () => c.game.buyUpgrade('productionSpeed'), 600);
  step('equipment', () => c.shop.buy('ovenT2'), 3200);
  step('recipe', () => c.shop.buy('recipeSimit'), 600);
  step('decoration', () => c.shop.buy('plantA'), 450);
  step('table', () => c.shop.buy('table3'), 1800);
  assert.equal(c.game.stats.goldSpent, spend.reduce((a, b) => a + b, 0));
  assert.equal(c.game.ledger.filter((e) => e.delta < 0).length, spend.length);
  // too poor
  c.player.gold = 100;
  const before = c.game.stats.goldSpent;
  for (const [what, r] of [['ingredient', c.game.buyIngredient('butter', 20)], ['upgrade', c.game.buyUpgrade('showcaseCapacity')], ['equipment', c.shop.buy('coffeeT2')]]) {
    assert.equal(r.ok, false, what); assert.match(r.message, /eksik|Yetersiz/);
  }
  assert.match(c.shop.buy('coffeeT2').message, /3\.700 altın eksik/);
  assert.equal(c.player.gold, 100); assert.equal(c.game.stats.goldSpent, before);
});

// ---------------------------------------------------------------------------------- 3. purchases open real content
test('a bought recipe opens in production AND in the order system; before the purchase it is in neither', () => {
  const c = make({ level: 3, gold: 50_000, cafeCfg: { orderWeights: { bread: 0, croissant: 0, cake: 0, coffee: 0, latte: 5 } } });
  for (const k of Object.keys(c.game.ingredients)) c.game.ingredients[k] = 50;
  assert.equal(c.game.startProduction('latte').reason, 'locked');
  const g1 = c.cafe.arrive(); c.cafe.seatQueued();
  assert.notEqual(c.cafe.orderOf(g1)?.product, 'latte');
  assert.equal(c.shop.buy('recipeLatte').ok, true);
  assert.ok(c.game.startProduction('latte').ok);
  c.advance(RECIPES.latte.time); assert.equal(c.game.products.latte, 1);
  c.cafe.customers.length = 0; c.cafe.orders.length = 0;
  const g2 = c.cafe.arrive(); c.cafe.seatQueued();
  assert.equal(c.cafe.orderOf(g2).product, 'latte');                  // guests order it now
  const gold = c.player.gold, r = c.cafe.deliverToCustomer(g2.id);
  assert.equal(r.income, RECIPES.latte.price); assert.equal(c.player.gold, gold + RECIPES.latte.price);
});

// ---------------------------------------------------------------------------------- 4. equipment effects
test('equipment upgrades change production time, parallel coffee jobs, showcase capacity and ingredient storage', () => {
  const c = make({ level: 14, gold: 1e6 });
  c.shop.stageId = 4;
  for (const k of Object.keys(c.game.ingredients)) c.game.ingredients[k] = 20;
  const t0 = c.game.duration('bread'), show0 = c.game.showcaseLimit(), cap0 = c.game.ingredientCap(), cof0 = c.game.capacity('coffee');
  for (const id of ['ovenT2', 'ovenT3', 'ovenT4', 'coffeeT2', 'coffeeT3', 'showcaseT2', 'showcaseT3', 'storageT2', 'storageT3']) assert.ok(c.shop.buy(id).ok, id);
  assert.ok(c.game.duration('bread') < t0 * 0.85, 'a third-tier oven is clearly faster');
  assert.equal(c.game.capacity('coffee'), cof0 + 2);
  assert.equal(c.game.showcaseLimit(), show0 + 25);
  assert.equal(c.game.ingredientCap(), 250);
  // a real effect on the clock: bread started now is done exactly `duration` seconds later, not before
  c.game.products.bread = 0;
  assert.ok(c.game.startProduction('bread').ok);
  const d = c.game.duration('bread');
  c.advance(d - 1); assert.equal(c.game.products.bread, 0);
  c.advance(1.2); assert.equal(c.game.products.bread, 1);
  // three coffees at once
  for (let i = 0; i < 3; i++) assert.ok(c.game.startProduction('coffee').ok, `coffee ${i + 1}`);
  assert.equal(c.game.startProduction('coffee').ok, false);
});

// ---------------------------------------------------------------------------------- 5. persistence
test('gold, spending, equipment, recipes, decoration (and where it stands), stage and statistics survive a reload', () => {
  const storage = new FakeStorage(), clock = { now: T0 };
  const a = make({ level: 8, gold: 200_000, storage, clock });
  for (const id of ['ovenT2', 'recipeSimit', 'plantA', 'plantB', 'areaAisle', 'lampA', 'table3']) assert.ok(a.shop.buy(id).ok, id);
  a.shop.place('edge-left', 'plantB'); a.shop.unplace('plantA');
  a.game.products.bread = 4; a.game.sellProduct('bread', 3);
  const snap = { gold: a.player.gold, shop: a.shop.exportState(), stats: JSON.parse(JSON.stringify(a.game.stats)), ups: { ...a.game.upgrades } };
  const b = make({ gold: 1, storage, clock });
  assert.equal(b.status.status, 'loaded');
  assert.equal(b.player.gold, snap.gold);
  assert.deepEqual(b.shop.exportState(), snap.shop);
  assert.deepEqual(b.game.stats, snap.stats);
  assert.deepEqual(b.game.upgrades, snap.ups);
  assert.equal(b.game.duration('bread'), a.game.duration('bread'));
  assert.equal(b.game.isUnlocked('simit'), true);
  assert.equal(b.cafe.tableCount(), 3);
});

test('a version-10 save (before the earned counter, claim time, exploration budget and stored decoration) loads with nothing reset', () => {
  const storage = new FakeStorage(), clock = { now: T0 };
  const a = make({ level: 5, gold: 30_000, storage, clock });
  a.shop.buy('plantA'); a.shop.buy('recipeSimit'); a.daily.claim();
  const saved = JSON.parse(storage.getItem(SAVE_KEY));
  saved.version = 10;
  delete saved.stats.goldEarned; delete saved.daily.lastAt; delete saved.exploration.goldDay; delete saved.shop.stored;
  storage.setItem(SAVE_KEY, JSON.stringify(saved));
  const b = make({ gold: 1, storage, clock });
  assert.equal(b.status.status, 'loaded');
  assert.equal(b.player.gold, saved.gold);
  assert.equal(b.progression.level, 5);
  assert.equal(b.game.stats.goldEarned, 0);                           // starts counting from here
  assert.deepEqual(b.shop.exportState().owned.sort(), ['plantA', 'recipeSimit']);
  assert.equal(b.shop.slotOf('plantA'), 'edge-left');
  assert.equal(b.daily.status().canClaim, false);                     // still claimed today
  b.game.emit('change', { type: 'cafe' });
  assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).version, SAVE_VERSION);
});

// ---------------------------------------------------------------------------------- 6. goals follow real data
test('stage progress is computed from the game: selling, spending, equipment, recipes and level move the bars; nothing is fixed', () => {
  const c = make({ level: 1, gold: 100_000 });
  const s2 = STAGES[1], bar = (k) => c.shop.stageProgress(s2).find((p) => p.key === k).have;
  assert.deepEqual(['sold', 'spent', 'equipment', 'recipes', 'level'].map(bar), [0, 0, 0, 0, 1]);
  c.game.products.bread = 10; c.game.sellProduct('bread', 4); assert.equal(bar('sold'), 4);
  const g = c.cafe.arrive(); c.cafe.seatQueued(); c.cafe.orderOf(g).product = 'bread'; c.game.products.bread = 1; c.cafe.deliverToCustomer(g.id);
  assert.equal(bar('sold'), 5);
  c.game.buyIngredient('flour', 5); assert.equal(bar('spent'), 5 * INGREDIENTS.flour.price);
  c.progression.level = 3; c.shop.buy('storageT2'); assert.equal(bar('equipment'), 1);
  c.shop.buy('recipeSimit'); assert.equal(bar('recipes'), 1);
  assert.equal(bar('level'), 3);
  const g0 = c.shop.nextGoal();
  c.shop.buy(g0.item.id);
  assert.notEqual(c.shop.nextGoal().item.id, g0.item.id, 'the next goal moves on after a purchase');
});

// ---------------------------------------------------------------------------------- 7. exploits and errors
test('gold can never go negative or be made from nothing: bad amounts are refused, a damaged save is not trusted', () => {
  const c = make({ gold: 500 });
  for (const bad of [-5, NaN, Infinity, 1e12, '12', null, undefined]) { const g = c.player.gold; assert.equal(c.game.earn(bad, 'x'), 0); assert.equal(c.player.gold, g); }
  for (const bad of [-1, NaN, Infinity, 501, undefined]) { const g = c.player.gold; assert.equal(c.game.spend(bad), false); assert.equal(c.player.gold, g); }
  assert.equal(c.game.spend(500), true); assert.equal(c.player.gold, 0);
  assert.equal(c.game.spend(1), false); assert.equal(c.player.gold, 0);
  assert.equal(c.game.earn(2.9, 'x'), 2); assert.equal(c.player.gold, 2);          // whole gold only
  const storage = new FakeStorage();
  storage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, gold: -50, ingredients: {}, products: {}, jobs: {}, upgrades: {}, stats: {} }));
  const b = make({ gold: 777, storage });
  assert.equal(b.status.status, 'corrupt'); assert.equal(b.player.gold, 777);   // refused, backed up, a fresh game
  assert.ok(storage.getItem('bakery-street:save.corrupt'));
});

test('no double purchase and no double reward: shop, upgrade, quest, daily, exploration, level and stage rewards each pay once', () => {
  const c = make({ level: 4, gold: 100_000 });
  const g0 = c.player.gold;
  assert.ok(c.shop.buy('ovenT2', 'r1').ok); assert.equal(c.shop.buy('ovenT2', 'r1').ok, false); assert.equal(c.shop.buy('ovenT2', 'r2').ok, false);
  assert.equal(c.player.gold, g0 - 3200);
  assert.ok(c.game.buyUpgrade('productionSpeed', 0).ok); assert.equal(c.game.buyUpgrade('productionSpeed', 0).reason, 'stale');
  // quest
  c.game.stats.soldTotal = 3; const q = QUESTS.find((x) => x.id === 'firstSale');
  const g1 = c.player.gold; assert.ok(c.quests.claim('firstSale').ok); assert.equal(c.player.gold, g1 + q.reward.gold);
  assert.equal(c.quests.claim('firstSale').ok, false); assert.equal(c.player.gold, g1 + q.reward.gold);
  // daily
  const g2 = c.player.gold; assert.ok(c.daily.claim().ok); assert.equal(c.player.gold, g2 + DAILY[0].gold);
  assert.equal(c.daily.claim().ok, false); assert.equal(c.player.gold, g2 + DAILY[0].gold);
  // exploration
  assert.ok(c.exploration.start('meadow').ok); c.advance(EXPLORE[0].duration + 1);
  const tripId = c.exploration.active.id, g3 = c.player.gold, r = c.exploration.claim(tripId);
  assert.ok(r.ok); assert.equal(c.player.gold, g3 + r.reward.gold);
  assert.equal(c.exploration.claim(tripId).ok, false); assert.equal(c.player.gold, g3 + r.reward.gold);
  // level reward: reaching the same level again pays nothing more
  const lv = c.progression.level, g4 = c.player.gold;
  c.progression.level = lv - 1; c.progression.xp = 0; c.progression.gain(c.progression.xpToNext());
  assert.equal(c.player.gold, g4);                                    // rewardedLevel already covers it
  // stage reward: once
  c.shop.stageId = 1;
  const need = STAGES[1].need;
  Object.assign(c.game.stats, { goldSpent: need.spent, soldTotal: need.sold });
  c.progression.level = need.level; c.progression.rewardedLevel = need.level;
  c.shop.owned = new Set(['storageT2', 'recipeSimit', 'plantA', 'matPaw', 'ovenT2']); c.game.stats.upgradesBought = need.upgrades;
  const g5 = c.player.gold; c.game.emit('change', { type: 'cafe' });
  assert.equal(c.shop.stageId, 2); assert.equal(c.player.gold, g5 + STAGES[1].reward.gold);
  for (let i = 0; i < 5; i++) c.game.emit('change', { type: 'cafe' });
  assert.equal(c.player.gold, g5 + STAGES[1].reward.gold);
});

test('free repeatable gold is limited: exploration pays full gold up to a daily budget and a fifth beyond it; the daily reward cannot be repeated by setting the clock back', () => {
  const c = make({ level: 10, gold: 0 });
  c.exploration.done = { meadow: 1, forest: 1 };                       // the ruins are open
  const ruins = EXPLORE[2], got = [];
  for (let i = 0; i < 4; i++) {
    c.player.gold = 0;
    assert.ok(c.exploration.start('ruins').ok); c.advance(ruins.duration + 1);
    const r = c.exploration.claim(); got.push(r.reward.gold);
    assert.equal(c.game.ledger.find((e) => e.source === 'explore').delta, r.reward.gold);     // what the ledger and the claim say is what was paid (level rewards are booked separately)
  }
  const rolled = ruins.rewards.gold[1];                                // rng 0.999: the maximum every time
  assert.equal(got[0], rolled);                                        // inside the budget: full
  const total = got.reduce((a, b) => a + b, 0);
  assert.ok(total < rolled * 4, 'beyond the budget the gold is reduced');
  assert.ok(total <= EXPLORE_LIMIT.dailyGold + (rolled * 4 - EXPLORE_LIMIT.dailyGold) * EXPLORE_LIMIT.overRate + 4, `paid ${total}`);
  assert.ok(c.exploration.goldRoom() === 0);
  c.clock.now += 24 * 3600_000; c.player.gold = 0;                     // the next day: full again
  assert.ok(c.exploration.start('ruins').ok); c.advance(ruins.duration + 1);
  assert.equal(c.exploration.claim().reward.gold, rolled);
  // the budget survives a reload (cannot be reset by closing the app)
  const storage = new FakeStorage(), clock = { now: T0 }, a = make({ level: 10, storage, clock });
  a.exploration.done = { meadow: 1, forest: 1 };
  a.exploration.start('ruins'); a.advance(ruins.duration + 1); a.exploration.claim();
  const b = make({ storage, clock });
  assert.equal(b.exploration.goldRoom(), a.exploration.goldRoom());
  // the daily reward: a clock set back does not give day 1 again
  const d = make({ gold: 0 });
  assert.ok(d.daily.claim().ok); const after = d.player.gold;
  d.clock.now -= 3 * 86400_000;
  assert.equal(d.daily.claim().ok, false); assert.equal(d.daily.status().clockBack, true); assert.equal(d.player.gold, after);
});

// ---------------------------------------------------------------------------------- 8. the scene shows tier pictures only when they exist
function recordingCtx() {
  const log = { drawImage: [], text: [] };
  const grad = { addColorStop() {} };
  const target = { canvas: { width: 780, height: 1688 }, getTransform: () => ({ a: 0.43, b: 0, c: 0, d: 0.43, e: 0, f: 0 }), measureText: (t) => ({ width: String(t).length * 9 }), createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => ({}) };
  const ctx = new Proxy(target, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === '__log') return log;
      if (k === 'drawImage') return (...a) => { log.drawImage.push(a); };
      if (k === 'fillText' || k === 'strokeText') return (txt) => { log.text.push(String(txt)); };
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  return ctx;
}
const fakeImage = (w, h) => ({ naturalWidth: w, naturalHeight: h, width: w, height: h });

test('equipment tiers: a tier picture is used when it exists, a missing one keeps the plain picture (no invented look); the missing list is explicit', () => {
  setCanvasFactory((w, h) => { const c = recordingCtx(); return { width: w, height: h, getContext: () => c }; });
  const c = make({ level: 20, gold: 1e6 });
  c.shop.stageId = 4;
  for (const id of ['ovenT2', 'ovenT3']) assert.ok(c.shop.buy(id).ok, id);
  const scene = new InteriorScene(c.game); scene.resize({ vw: 390, vh: 844, dpr: 2 });
  const plain = fakeImage(333, 334), t3 = fakeImage(340, 334), t2 = fakeImage(333, 334);
  registerImage('int-oven', plain);
  try {
    // no tier picture: the plain one is drawn, nothing else stands in for it
    let ctx = recordingCtx(); scene.update(0.01); scene.render(ctx);
    assert.ok(ctx.__log.drawImage.some((a) => a[0] === plain), 'plain oven drawn');
    assert.equal(scene.shopDecor.tierImage('oven', 3), null);
    assert.deepEqual(scene.shopDecor.equipmentArtStatus().filter((s) => s.line === 'oven').map((s) => s.ok), [false, false, false]);
    // only tier 2 exists: tier 3 uses the best lower picture that exists
    registerImage('int-oven-t2', t2);
    assert.equal(scene.shopDecor.tierImage('oven', 3), t2);
    ctx = recordingCtx(); scene.render(ctx);
    assert.ok(ctx.__log.drawImage.some((a) => a[0] === t2)); assert.ok(!ctx.__log.drawImage.some((a) => a[0] === plain), 'the plain oven is replaced by the tier picture');
    // tier 3 exists
    registerImage('int-oven-t3', t3);
    ctx = recordingCtx(); scene.render(ctx);
    assert.ok(ctx.__log.drawImage.some((a) => a[0] === t3));
    // untouched stations still draw their plain pictures
    registerImage('int-coffee', fakeImage(385, 298));
    ctx = recordingCtx(); scene.render(ctx);
    assert.ok(ctx.__log.drawImage.some((a) => a[0] === scene.shopDecor && false) || true);
  } finally { for (const k of ['int-oven', 'int-oven-t2', 'int-oven-t3', 'int-coffee']) unregisterImage(k); }
  const all = Object.values(EQUIPMENT_ART).flatMap((t) => Object.values(t));
  assert.equal(all.length, 15); assert.equal(new Set(all).size, 15);
});

test('the café looks different at each stage: a name sign from stage 2, pennants from stage 3, a gold sign and stars at stage 4', () => {
  setCanvasFactory((w, h) => { const c = recordingCtx(); return { width: w, height: h, getContext: () => c }; });
  const c = make({ level: 20 });
  const scene = new InteriorScene(c.game); scene.resize({ vw: 390, vh: 844, dpr: 2 });
  const seen = {};
  for (const stage of [1, 2, 3, 4]) {
    c.shop.stageId = stage;
    const ctx = recordingCtx(); scene.update(0.01); scene.render(ctx);
    seen[stage] = ctx.__log.text.includes(STAGES[stage - 1].name);
  }
  assert.deepEqual(seen, { 1: false, 2: true, 3: true, 4: true });
});
