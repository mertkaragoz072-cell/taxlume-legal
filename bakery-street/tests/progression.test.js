import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { Cafe } from '../src/game/customers.js';
import { Quests } from '../src/game/quests.js';
import { Progression, validateProgression } from '../src/game/progression.js';
import { SaveManager, SAVE_KEY, SAVE_VERSION } from '../src/game/save.js';
import { XP, LEVELS, LEVEL_REWARD, PRODUCTS, UPGRADES, QUESTS, INGREDIENTS } from '../src/data/economy.js';

class FakeStorage {
  constructor() { this.m = new Map(); this.fail = false; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { if (this.fail) throw new Error('QuotaExceededError'); this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const T0 = 1_700_000_000_000;
function make(gold = 100_000, cfg = {}) {
  const clock = { now: T0 }, player = { gold, gems: 0 };
  const game = new Game(player, {}, () => clock.now);
  const quests = new Quests(game);
  const prog = new Progression(game, cfg);
  const cafe = new Cafe(game, { rng: () => 0.5, config: { tables: 3, queueMax: 3, firstSpawnSec: 999, spawnEverySec: [999, 999], queuePatienceSec: 999, orderPatienceSec: 999, maxStepSec: 2, history: 20, orderWeights: { bread: 1, croissant: 0, cake: 0, coffee: 0 } } });
  cafe.setActive(true);
  for (const k of Object.keys(game.ingredients)) game.ingredients[k] = 500;
  for (const k of Object.keys(game.products)) game.products[k] = 0;
  game.upgrades.showcaseCapacity = 5;
  return { game, player, prog, quests, cafe, clock, advance: (s) => { clock.now += s * 1000; game.tick(); } };
}
const produce = (c, pid) => { assert.ok(c.game.startProduction(pid).ok); c.advance(PRODUCTS[pid].time); };
const sumNeed = (prog, from, to) => { let s = 0; for (let l = from; l < to; l++) s += prog.xpToNext(l); return s; };

// ---------------------------------------------------------------------------------- configuration
test('XP curve: each level needs more XP than the last, all whole numbers; level 1 needs 100', () => {
  const { prog } = make();
  assert.equal(prog.xpToNext(1), 100);
  for (let l = 1; l < prog.maxLevel; l++) {
    assert.ok(Number.isInteger(prog.xpToNext(l)) && prog.xpToNext(l) > 0);
    if (l > 1) assert.ok(prog.xpToNext(l) > prog.xpToNext(l - 1), `level ${l} must need more than level ${l - 1}`);
  }
  assert.equal(prog.xpToNext(prog.maxLevel), null);
  assert.equal(prog.maxLevel, LEVELS.maxLevel);
});

test('every product and quest has a positive XP value; upgrades give more XP at higher levels', () => {
  const { prog } = make();
  for (const pid of Object.keys(PRODUCTS)) { assert.ok(XP.produce[pid] > 0, pid); assert.ok(XP.sale[pid] > 0, pid); }
  for (const q of QUESTS) assert.ok(prog.xpFor('quest', q.id) > 0, q.id);
  for (let l = 2; l <= 5; l++) assert.ok(prog.xpFor('upgrade', l) > prog.xpFor('upgrade', l - 1));
  assert.equal(prog.xpFor('unknown', 'x'), 0);
});

test('level rewards: gold every level, ingredients every 3rd level, all known ingredients; level 1 gives nothing', () => {
  const { prog } = make();
  assert.deepEqual(prog.rewardFor(1), { gold: 0, ingredients: {} });
  for (let l = 2; l <= prog.maxLevel; l++) {
    const r = prog.rewardFor(l);
    assert.equal(r.gold, LEVEL_REWARD.gold.base + LEVEL_REWARD.gold.perLevel * (l - 1));
    assert.equal(Object.keys(r.ingredients).length > 0, l % LEVEL_REWARD.ingredientsEvery === 0);
    for (const id of Object.keys(r.ingredients)) assert.ok(INGREDIENTS[id]);
  }
});

// ---------------------------------------------------------------------------------- gaining XP and levelling up
test('a new player starts at level 1 with 0 XP', () => {
  const { prog } = make();
  assert.deepEqual(prog.exportState(), { level: 1, xp: 0, rewardedLevel: 1 });
});

test('XP accumulates below the threshold without levelling', () => {
  const { prog } = make();
  prog.gain(40); prog.gain(59);
  assert.deepEqual({ level: prog.level, xp: prog.xp }, { level: 1, xp: 99 });
  assert.ok(Math.abs(prog.fraction() - 0.99) < 1e-9);
});

test('reaching exactly the threshold levels up with 0 left over; surplus XP carries into the next level', () => {
  const a = make().prog; a.gain(100);
  assert.deepEqual({ level: a.level, xp: a.xp }, { level: 2, xp: 0 });
  const b = make().prog; b.gain(130);
  assert.deepEqual({ level: b.level, xp: b.xp }, { level: 2, xp: 30 });
});

test('one gain can jump several levels correctly, with every skipped level paying its reward once', () => {
  const { prog, player, game } = make(0);
  const flour = game.ingredients.flour;
  const total = sumNeed(prog, 1, 6) + 17;                       // enough for levels 1 -> 6, plus 17 XP
  const r = prog.gain(total);
  assert.equal(prog.level, 6);
  assert.equal(prog.xp, 17);
  assert.deepEqual(r.levels.map((l) => l.level), [2, 3, 4, 5, 6]);
  let gold = 0; for (let l = 2; l <= 6; l++) gold += prog.rewardFor(l).gold;
  assert.equal(player.gold, gold);
  assert.equal(game.ingredients.flour, flour + 2 * LEVEL_REWARD.ingredients.flour);   // levels 3 and 6 pay ingredients
  assert.equal(prog.rewardedLevel, 6);
});

test('one single action can cause a multi-level jump (cheap curve, huge XP value)', () => {
  const c = make(0, { xp: { ...XP, produce: { ...XP.produce, coffee: 1000 } } });
  produce(c, 'coffee');
  const need = (l) => c.prog.xpToNext(l);
  assert.ok(c.prog.level > 3, `level ${c.prog.level}`);
  let acc = 0, lvl = 1; while (acc + need(lvl) <= 1000) { acc += need(lvl); lvl++; }
  assert.equal(c.prog.level, lvl);
  assert.equal(c.prog.xp, 1000 - acc);
  let gold = 0; for (let l = 2; l <= lvl; l++) gold += c.prog.rewardFor(l).gold;
  assert.equal(c.player.gold, gold);
});

test('maximum level: XP stops, no overflow, no extra rewards', () => {
  const { prog, player } = make(0);
  prog.gain(10_000_000);
  assert.equal(prog.level, prog.maxLevel);
  assert.equal(prog.xp, 0);
  assert.equal(prog.fraction(), 1);
  const gold = player.gold, state = JSON.stringify(prog.exportState());
  assert.deepEqual(prog.gain(500), { gained: 0, levels: [] });
  assert.equal(player.gold, gold);
  assert.equal(JSON.stringify(prog.exportState()), state);
});

test('invalid XP amounts are ignored; fractions are floored', () => {
  const { prog } = make();
  for (const bad of [0, -5, NaN, Infinity, undefined, null, '10', 0.9]) prog.gain(bad);
  assert.deepEqual({ level: prog.level, xp: prog.xp }, { level: 1, xp: 0 });
  prog.gain(10.9);
  assert.equal(prog.xp, 10);
});

// ---------------------------------------------------------------------------------- level rewards (once, shared systems)
test('a level-up reward lands in the shared gold and inventory, and an event describes it', () => {
  const { prog, player, game } = make(500);
  const seen = []; game.on('levelUp', (e) => seen.push(e));
  const inv = game.ingredients;
  prog.gain(100);
  assert.equal(player.gold, 500 + prog.rewardFor(2).gold);
  assert.equal(game.ingredients, inv);
  assert.deepEqual(seen.map((e) => e.level), [2]);
  assert.equal(seen[0].reward.gold, prog.rewardFor(2).gold);
  const flour = game.ingredients.flour;
  prog.gain(prog.xpToNext(2));                                  // level 3 gives ingredients
  assert.equal(game.ingredients.flour, flour + LEVEL_REWARD.ingredients.flour);
  assert.equal(game.ingredients.milk, 500 + LEVEL_REWARD.ingredients.milk);
});

test('a level reward is never paid twice, even if the level counter is moved back', () => {
  const { prog, player } = make(0);
  prog.gain(sumNeed(prog, 1, 4));
  assert.equal(prog.level, 4);
  const gold = player.gold;
  prog.level = 2; prog.xp = 0;                                  // simulate a rewind of the level counter
  prog.gain(sumNeed(prog, 2, 4));
  assert.equal(prog.level, 4);
  assert.equal(player.gold, gold);                              // levels 3 and 4 were already rewarded
});

// ---------------------------------------------------------------------------------- XP from actions
test('producing: XP comes when the product is finished (not when it starts), for the right product', () => {
  for (const pid of Object.keys(PRODUCTS)) {
    const c = make();
    assert.ok(c.game.startProduction(pid).ok);
    assert.equal(c.prog.xp, 0, `${pid}: no XP at start`);
    c.advance(PRODUCTS[pid].time - 1);
    assert.equal(c.prog.xp, 0);
    c.advance(1);
    assert.equal(c.prog.xp, XP.produce[pid], pid);
    c.advance(1000);
    assert.equal(c.prog.xp, XP.produce[pid], `${pid}: a job pays XP only once`);
  }
});

test('a refused production gives no XP', () => {
  const c = make();
  for (const k of Object.keys(c.game.ingredients)) c.game.ingredients[k] = 0;
  assert.equal(c.game.startProduction('bread').ok, false);
  c.advance(1000);
  assert.equal(c.prog.xp, 0);
});

test('selling from the showcase gives XP per unit; refused sales give none', () => {
  const c = make();
  c.game.products.cake = 5;
  c.game.sellProduct('cake', 3);
  assert.equal(c.prog.xp, 3 * XP.sale.cake);
  const before = c.prog.xp;
  assert.equal(c.game.sellProduct('cake', 99).ok, false);
  assert.equal(c.game.sellProduct('coffee', 1).ok, false);
  assert.equal(c.prog.xp, before);
});

test('customer deliveries give sale XP exactly once; refused or repeated deliveries give none', () => {
  const c = make();
  const cust = c.cafe.arrive(); c.cafe.seatQueued();
  const order = c.cafe.orderOf(cust);                          // bread
  assert.equal(c.cafe.deliver(order.id).reason, 'stock');
  assert.equal(c.prog.xp, 0);
  c.game.products.bread = 3;
  assert.ok(c.cafe.deliver(order.id).ok);
  assert.equal(c.prog.xp, XP.sale.bread);
  assert.equal(c.cafe.deliver(order.id).ok, false);
  assert.equal(c.prog.xp, XP.sale.bread);
});

test('buying an upgrade gives XP that grows with the level; a refused upgrade gives none', () => {
  const c = make(100_000);
  const total = () => sumNeed(c.prog, 1, c.prog.level) + c.prog.xp;   // cumulative XP, independent of level-ups
  assert.ok(c.game.buyUpgrade('ovenCapacity', 0).ok);
  assert.equal(total(), XP.upgrade.base + XP.upgrade.perLevel * 1);
  const after1 = total();
  assert.ok(c.game.buyUpgrade('ovenCapacity', 1).ok);
  assert.equal(total(), after1 + XP.upgrade.base + XP.upgrade.perLevel * 2);
  const before = total();
  assert.equal(c.game.buyUpgrade('ovenCapacity', 1).ok, false);   // stale double tap
  c.player.gold = 0;
  assert.equal(c.game.buyUpgrade('productionSpeed').ok, false);   // cannot afford
  assert.equal(total(), before);
});

test('completing a quest gives XP when its reward is collected, once', () => {
  const c = make(0);
  c.game.products.bread = 5; c.game.sellProduct('bread', 1);    // completes "first sale" (and gives sale XP)
  const before = c.prog.xp;
  assert.ok(c.quests.claim('firstSale').ok);
  assert.equal(c.prog.xp - before, XP.quest.default);
  assert.equal(c.quests.claim('firstSale').ok, false);
  assert.equal(c.prog.xp - before, XP.quest.default);           // a second claim gives nothing
  assert.equal(c.quests.claim('sellFive').ok, false);           // incomplete: nothing
  assert.equal(c.prog.xp - before, XP.quest.default);
});

test('quest-specific XP overrides the default', () => {
  const c = make(0);
  c.game.stats.producedTotal = 10;
  const before = c.prog.xp;
  c.quests.claim('produceTen');
  assert.equal(c.prog.xp - before, XP.quest.byId.produceTen);
});

test('Market purchases and daily rewards do not give XP', () => {
  const c = make(1000);
  c.game.purchase('flour', 3, 'a');
  assert.equal(c.prog.xp, 0);
});

test('the whole loop adds up: produce, sell and upgrade XP together decide the level', () => {
  const c = make(100_000);
  produce(c, 'bread');                                          // +5
  c.game.sellProduct('bread', 1);                               // +3
  c.game.buyUpgrade('showcaseCapacity', 5);                     // already level 5: refused, no XP
  c.game.buyUpgrade('ovenCapacity', 0);                         // +75
  assert.equal(c.prog.xp, 5 + 3 + 75);
  produce(c, 'cake');                                           // +20 -> 103 total: level 2 with 3 left
  assert.equal(c.prog.level, 2);
  assert.equal(c.prog.xp, 3);
});

// ---------------------------------------------------------------------------------- persistence
function session(storage, clock, gold = 100_000) {
  const player = { gold, gems: 0 }, game = new Game(player, {}, () => clock.now);
  new Quests(game);
  const prog = new Progression(game);
  new Cafe(game, { rng: () => 0.5 });
  const problems = [];
  const mgr = new SaveManager(game, storage, { onProblem: (p) => problems.push(p) });
  return { game, player, prog, mgr, problems };
}

test('level, XP and rewarded level survive a reload; rewards are not paid again after loading', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const a = session(st, clock, 0); a.mgr.load(); a.mgr.attach();
  a.prog.gain(sumNeed(a.prog, 1, 5) + 42);
  a.game.emit('change', {});
  const before = a.game.exportState();
  const b = session(st, clock, 999_999); assert.equal(b.mgr.load().status, 'loaded');
  assert.deepEqual(b.prog.exportState(), { level: 5, xp: 42, rewardedLevel: 5 });
  assert.equal(b.player.gold, before.gold);
  assert.deepEqual(b.game.ingredients, before.ingredients);
  b.mgr.attach(); b.game.emit('change', {});
  assert.equal(b.player.gold, before.gold);                    // no reward re-granted by loading
  const c = session(st, clock); c.mgr.load();
  assert.equal(c.player.gold, before.gold);
  assert.equal(c.prog.level, 5);
});

test('an action, its XP and the level-up reward are saved in one snapshot', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const a = session(st, clock, 0); a.mgr.load(); a.mgr.attach();
  a.prog.xp = 98;                                              // 2 XP short of level 2
  a.game.products.bread = 5;
  a.game.sellProduct('bread', 1);                              // +3 XP -> level 2 and its reward
  const saved = JSON.parse(st.getItem(SAVE_KEY));
  assert.equal(saved.version, SAVE_VERSION);
  assert.deepEqual(saved.progression, { level: 2, xp: 1, rewardedLevel: 2 });
  assert.equal(saved.gold, PRODUCTS.bread.price + a.prog.rewardFor(2).gold);
});

test('older saves (before levels existed) load safely as level 1 with 0 XP and keep everything else', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  st.setItem(SAVE_KEY, JSON.stringify({ version: 5, gold: 4321, gems: 7, ingredients: { flour: 9 }, products: { bread: 3 }, jobs: {}, upgrades: { ovenCapacity: 2 }, stats: { soldTotal: 12 }, quests: { claimed: ['firstBread'] }, daily: { lastDate: null, day: 0 } }));
  const s = session(st, clock, 0);
  assert.equal(s.mgr.load().status, 'loaded');
  assert.deepEqual(s.prog.exportState(), { level: 1, xp: 0, rewardedLevel: 1 });
  assert.equal(s.player.gold, 4321); assert.equal(s.player.gems, 7);
  assert.equal(s.game.ingredients.flour, 9);
  assert.equal(s.game.upgrades.ovenCapacity, 2);
  assert.equal(s.game.stats.soldTotal, 12);
});

test('invalid level data in a save is rejected (backed up) instead of being used', () => {
  const bad = [{ level: 0, xp: 0 }, { level: 99, xp: 0 }, { level: 2.5, xp: 0 }, { level: 2, xp: -1 }, { level: 2, xp: 160 }, { level: 2, xp: 1.5 },
    { level: 3, xp: 0, rewardedLevel: 4 }, { level: 3, xp: 0, rewardedLevel: 0 }, { level: 30, xp: 5 }, 'x', null];
  for (const progression of bad) {
    const st = new FakeStorage();
    st.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, gold: 5, ingredients: {}, products: {}, jobs: {}, upgrades: {}, stats: {}, progression }));
    const s = session(st, { now: T0 });
    assert.equal(s.mgr.load().status, 'corrupt', JSON.stringify(progression));
    assert.equal(s.prog.level, 1);
  }
});

test('a reward pointer behind the level is moved up (no retroactive double payment); max level needs 0 XP', () => {
  const { prog } = make();
  assert.deepEqual(validateProgression({ level: 5, xp: 10, rewardedLevel: 2 }, prog), { level: 5, xp: 10, rewardedLevel: 5 });
  assert.deepEqual(validateProgression({ level: prog.maxLevel, xp: 0 }, prog), { level: prog.maxLevel, xp: 0, rewardedLevel: prog.maxLevel });
  assert.deepEqual(validateProgression(undefined, prog), { level: 1, xp: 0, rewardedLevel: 1 });
});

test('if saving fails the XP and level-up still apply in memory and the player is warned', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const a = session(st, clock, 0); a.mgr.load(); a.mgr.attach();
  st.fail = true;
  a.game.products.bread = 2;
  a.prog.xp = 99;
  a.game.sellProduct('bread', 1);
  assert.equal(a.prog.level, 2);
  assert.ok(a.problems.some((p) => p.kind === 'write'));
});

test('a confirmed progress reset returns to level 1 with 0 XP', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const a = session(st, clock); a.mgr.load(); a.mgr.attach();
  a.prog.gain(sumNeed(a.prog, 1, 7));
  assert.ok(a.prog.level >= 7);
  assert.equal(a.mgr.reset({ confirmed: true }).ok, true);
  assert.deepEqual(a.prog.exportState(), { level: 1, xp: 0, rewardedLevel: 1 });
});

test('works with Market, production and upgrades: buying, producing and upgrading still behave as before', () => {
  const c = make(100_000);
  const gold = c.player.gold;
  assert.ok(c.game.purchase('flour', 2, 'x').ok);
  assert.equal(c.player.gold, gold - 2 * INGREDIENTS.flour.price);   // Market price unaffected by levels
  produce(c, 'bread');
  assert.equal(c.game.products.bread, 1);
  assert.equal(c.game.duration('bread'), PRODUCTS.bread.time);        // levels do not change recipes
  assert.ok(c.game.buyUpgrade('productionSpeed', 0).ok);
  assert.equal(c.game.duration('bread'), Math.round(PRODUCTS.bread.time * UPGRADES.productionSpeed.values[1] * 10) / 10);
});
