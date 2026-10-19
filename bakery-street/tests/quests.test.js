import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { Cafe } from '../src/game/customers.js';
import { Quests } from '../src/game/quests.js';
import { SaveManager, SAVE_KEY, SAVE_VERSION } from '../src/game/save.js';
import { QUESTS, INGREDIENTS, PRODUCTS, UPGRADES } from '../src/data/economy.js';

class FakeStorage {
  constructor() { this.m = new Map(); this.fail = false; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { if (this.fail) throw new Error('QuotaExceededError'); this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const T0 = 1_700_000_000_000;
function make(gold = 100_000) {
  const clock = { now: T0 }, player = { gold };
  const game = new Game(player, {}, () => clock.now);
  const quests = new Quests(game);
  const cafe = new Cafe(game, { rng: () => 0.5, config: { ...(game.cafe?.cfg ?? {}), tables: 3, queueMax: 3, firstSpawnSec: 999, spawnEverySec: [999, 999], queuePatienceSec: 999, orderPatienceSec: 999, maxStepSec: 2, history: 20, orderWeights: { bread: 1, croissant: 0, cake: 0, coffee: 0 } } });
  cafe.setActive(true);
  const advance = (s) => { clock.now += s * 1000; game.tick(); };
  const q = (id) => quests.list().find((s) => s.def.id === id);
  return { game, player, clock, quests, cafe, advance, q };
}
const produce = (ctx, pid) => { assert.ok(ctx.game.startProduction(pid).ok); ctx.advance(PRODUCTS[pid].time); };

test('the requested quests exist with valid goals and rewards', () => {
  assert.deepEqual(QUESTS.map((q) => q.id), ['firstBread', 'firstSale', 'marketTrip', 'sellFive', 'firstUpgrade', 'produceTen', 'openBookshop', 'firstExplore']);
  assert.equal(new Set(QUESTS.map((q) => q.id)).size, QUESTS.length);
  const byId = Object.fromEntries(QUESTS.map((q) => [q.id, q]));
  assert.deepEqual([byId.firstBread.stat, byId.firstBread.target], ['produced.bread', 1]);
  assert.deepEqual([byId.firstSale.stat, byId.firstSale.target], ['soldTotal', 1]);
  assert.deepEqual([byId.marketTrip.stat, byId.marketTrip.target], ['marketPurchases', 1]);
  assert.deepEqual([byId.sellFive.stat, byId.sellFive.target], ['soldTotal', 5]);
  assert.deepEqual([byId.firstUpgrade.stat, byId.firstUpgrade.target], ['upgradesBought', 1]);
  assert.deepEqual([byId.produceTen.stat, byId.produceTen.target], ['producedTotal', 10]);
  for (const q of QUESTS) {
    assert.ok(q.name && q.condition && q.icon);
    assert.ok((q.reward.gold ?? 0) >= 0);
    for (const [ing, n] of Object.entries(q.reward.ingredients ?? {})) { assert.ok(INGREDIENTS[ing], `${q.id}: unknown ingredient ${ing}`); assert.ok(Number.isInteger(n) && n > 0); }
    assert.ok(q.reward.gold || Object.keys(q.reward.ingredients ?? {}).length, `${q.id} must give something`);
  }
});

// ---------------------------------------------------------------------------------- progress follows game events
test('first bread: only a finished bread counts (not a started one, not another product)', () => {
  const c = make();
  assert.equal(c.q('firstBread').progress, 0);
  c.game.startProduction('bread');
  assert.equal(c.q('firstBread').progress, 0);                 // still baking
  c.advance(PRODUCTS.bread.time - 1);
  assert.equal(c.q('firstBread').complete, false);
  c.advance(1);
  assert.equal(c.q('firstBread').complete, true);
  const d = make();
  produce(d, 'croissant');
  assert.equal(d.q('firstBread').progress, 0);                 // croissant does not satisfy "first bread"
  assert.equal(d.q('produceTen').progress, 1);                 // but it counts toward total production
});

test('a refused production does not advance any quest', () => {
  const c = make();
  for (const k of Object.keys(c.game.ingredients)) c.game.ingredients[k] = 0;
  assert.equal(c.game.startProduction('bread').ok, false);
  assert.equal(c.game.stats.producedTotal, 0);
  c.advance(1000);
  assert.equal(c.q('firstBread').progress, 0);
});

test('produce ten: counts every finished product and completes exactly at ten', () => {
  const c = make();
  for (const k of Object.keys(c.game.ingredients)) c.game.ingredients[k] = 500;
  c.game.upgrades.showcaseCapacity = 5;
  for (let i = 1; i <= 10; i++) {
    produce(c, i % 2 ? 'coffee' : 'bread');                     // mixed products all count
    assert.equal(c.q('produceTen').progress, i);
    assert.equal(c.q('produceTen').complete, i >= 10, `after ${i}`);
  }
  assert.equal(c.game.stats.producedTotal, 10);
  produce(c, 'coffee');
  assert.equal(c.q('produceTen').progress, 10);                // progress is capped at the target
  assert.equal(c.game.stats.producedTotal, 11);
});

test('first sale and sell five: showcase sales count, quantity counts', () => {
  const c = make();
  c.game.products.bread = 10;
  assert.equal(c.q('firstSale').complete, false);
  c.game.sellProduct('bread', 1);
  assert.equal(c.q('firstSale').complete, true);
  assert.equal(c.q('sellFive').progress, 1);
  c.game.sellProduct('bread', 3);
  assert.equal(c.q('sellFive').complete, false);
  c.game.sellProduct('bread', 1);
  assert.equal(c.q('sellFive').complete, true);
  assert.equal(c.game.stats.sold.bread, 5);
});

test('customer deliveries count as sales too, exactly once each', () => {
  const c = make();
  c.game.products.bread = 5;
  const a = c.cafe.arrive(); c.cafe.seatQueued();
  const order = c.cafe.orderOf(a);
  assert.ok(c.cafe.deliver(order.id).ok);
  assert.equal(c.game.stats.soldTotal, 1);
  assert.equal(c.cafe.deliver(order.id).ok, false);            // second delivery refused...
  assert.equal(c.game.stats.soldTotal, 1);                     // ...and not counted
  assert.equal(c.q('firstSale').complete, true);
});

test('a refused sale (no stock) does not count', () => {
  const c = make();
  c.game.products.bread = 0;                                   // starting stock is 2 bread
  assert.equal(c.game.sellProduct('cake', 1).ok, false);
  const a = c.cafe.arrive(); c.cafe.seatQueued();
  assert.equal(c.cafe.deliver(c.cafe.orderOf(a).id).ok, false);
  assert.equal(c.game.stats.soldTotal, 0);
});

test('market purchase quest: a successful Market purchase counts; Depo purchases, refusals and invalid requests do not', () => {
  const c = make(1000);
  c.game.buyIngredient('flour', 1);                            // Depo / direct buy
  assert.equal(c.q('marketTrip').progress, 0);
  assert.equal(c.game.purchase('flour', 0).ok, false);
  assert.equal(c.game.purchase('flour', 1000).ok, false);      // cannot afford
  assert.equal(c.q('marketTrip').progress, 0);
  assert.ok(c.game.purchase('flour', 2, 'r1').ok);
  assert.equal(c.q('marketTrip').complete, true);
  c.game.purchase('flour', 2, 'r1');                           // replayed request: ignored
  assert.equal(c.game.stats.marketPurchases, 1);
});

test('upgrade quest: only a successful upgrade counts', () => {
  const c = make(UPGRADES.ovenCapacity.costs[0] - 1);
  assert.equal(c.game.buyUpgrade('ovenCapacity').ok, false);
  assert.equal(c.q('firstUpgrade').progress, 0);
  c.player.gold = 5000;
  assert.ok(c.game.buyUpgrade('ovenCapacity').ok);
  assert.equal(c.q('firstUpgrade').complete, true);
  c.game.buyUpgrade('ovenCapacity', 0);                        // stale double tap: refused
  assert.equal(c.game.stats.upgradesBought, 1);
});

test('questComplete is announced once when a quest reaches its target, and not for old completions after a load', () => {
  const c = make();
  const seen = []; c.game.on('questComplete', ({ quest }) => seen.push(quest.id));
  c.game.products.bread = 9; c.game.sellProduct('bread', 1);
  assert.deepEqual(seen, ['firstSale']);
  c.game.sellProduct('bread', 1);
  assert.deepEqual(seen, ['firstSale']);                       // not repeated
  c.game.sellProduct('bread', 3);
  assert.deepEqual(seen, ['firstSale', 'sellFive']);
});

// ---------------------------------------------------------------------------------- claiming rewards
test('claiming an incomplete quest is refused and changes nothing', () => {
  const c = make(500);
  const before = JSON.stringify(c.game.exportState());
  const r = c.quests.claim('firstSale');
  assert.equal(r.ok, false); assert.equal(r.reason, 'incomplete');
  assert.match(r.message, /henüz tamamlanmadı \(0\/1\)/);
  assert.equal(JSON.stringify(c.game.exportState()), before);
});

test('claiming a completed quest adds exactly its gold and ingredients to the shared gold and inventory', () => {
  const c = make(1000);
  c.game.products.bread = 3; c.game.sellProduct('bread', 1);   // completes "first sale"
  const gold = c.player.gold, flour = c.game.ingredients.flour, inv = c.game.ingredients, others = { ...c.game.ingredients };
  const reward = QUESTS.find((q) => q.id === 'firstSale').reward;
  const r = c.quests.claim('firstSale');
  assert.equal(r.ok, true);
  assert.equal(c.player.gold, gold + reward.gold);
  assert.equal(c.game.ingredients.flour, flour + reward.ingredients.flour);
  assert.equal(c.game.ingredients, inv);                       // same inventory object production and Market use
  for (const k of Object.keys(others)) if (k !== 'flour') assert.equal(c.game.ingredients[k], others[k]);
  assert.equal(c.q('firstSale').claimed, true);
});

test('every quest reward can be collected and matches its definition', () => {
  const c = make(0);
  c.game.stats = { produced: { bread: 99, croissant: 99, cake: 99, coffee: 99 }, sold: { bread: 99, croissant: 99, cake: 99, coffee: 99 }, producedTotal: 999, soldTotal: 999, marketPurchases: 9, upgradesBought: 9, buildingsOpened: 1, buildingUpgrades: 0, explorationsDone: 1 };
  for (const q of QUESTS) {
    const gold = c.player.gold, inv = { ...c.game.ingredients };
    assert.ok(c.quests.claim(q.id).ok, q.id);
    assert.equal(c.player.gold, gold + (q.reward.gold ?? 0));
    for (const [ing, n] of Object.entries(q.reward.ingredients ?? {})) assert.equal(c.game.ingredients[ing], inv[ing] + n);
  }
  assert.equal(c.quests.claimable().length, 0);
});

test('the same reward cannot be collected twice (double tap or replay)', () => {
  const c = make(0);
  c.game.products.bread = 5; c.game.sellProduct('bread', 1);
  const first = c.quests.claim('firstSale'), gold = c.player.gold, flour = c.game.ingredients.flour;
  const second = c.quests.claim('firstSale');
  assert.equal(first.ok, true);
  assert.equal(second.ok, false); assert.equal(second.reason, 'claimed');
  assert.equal(c.player.gold, gold);
  assert.equal(c.game.ingredients.flour, flour);
  for (let i = 0; i < 5; i++) c.quests.claim('firstSale');
  assert.equal(c.player.gold, gold);
});

test('claim bookkeeping: claimable lists completed unclaimed quests only; unknown ids are refused', () => {
  const c = make();
  c.game.products.bread = 5; c.game.sellProduct('bread', 5);   // completes firstSale and sellFive
  assert.deepEqual(c.quests.claimable().map((s) => s.def.id).sort(), ['firstSale', 'sellFive']);
  c.quests.claim('firstSale');
  assert.deepEqual(c.quests.claimable().map((s) => s.def.id), ['sellFive']);
  assert.equal(c.quests.claim('nope').reason, 'unknown');
});

// ---------------------------------------------------------------------------------- persistence
function session(storage, clock, gold = 100_000) {
  const player = { gold }, game = new Game(player, {}, () => clock.now);
  const quests = new Quests(game); new Cafe(game, { rng: () => 0.5 });
  const problems = [];
  const mgr = new SaveManager(game, storage, { onProblem: (p) => problems.push(p) });
  return { game, player, quests, mgr, problems };
}

test('progress, claimed rewards, gold and granted ingredients survive a reload; the reward is not given again', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const a = session(st, clock); a.mgr.load(); a.mgr.attach();
  a.game.products.bread = 6; a.game.sellProduct('bread', 5);
  a.game.purchase('flour', 1, 'r');
  a.quests.claim('firstSale');
  const before = a.game.exportState();

  const b = session(st, clock, 0); assert.equal(b.mgr.load().status, 'loaded');
  const after = b.game.exportState();
  assert.deepEqual(after.stats, before.stats);
  assert.deepEqual(after.quests, { claimed: ['firstSale'] });
  assert.equal(after.gold, before.gold);
  assert.deepEqual(after.ingredients, before.ingredients);
  assert.equal(b.quests.claim('firstSale').reason, 'claimed');   // cannot be collected again after the reload
  assert.equal(b.player.gold, before.gold);
  assert.equal(b.quests.list().find((s) => s.def.id === 'sellFive').complete, true);
  assert.equal(b.quests.claim('sellFive').ok, true);            // unclaimed completed quests stay claimable
});

test('collecting a reward is saved in one snapshot (flag, gold and ingredients together)', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const a = session(st, clock, 0); a.mgr.load(); a.mgr.attach();
  a.game.products.bread = 1; a.game.sellProduct('bread', 1);
  a.quests.claim('firstSale');
  const saved = JSON.parse(st.getItem(SAVE_KEY));
  assert.equal(saved.version, SAVE_VERSION);
  assert.deepEqual(saved.quests.claimed, ['firstSale']);
  const reward = QUESTS.find((q) => q.id === 'firstSale').reward;
  assert.equal(saved.gold, PRODUCTS.bread.price + reward.gold);
  assert.equal(saved.ingredients.flour, INGREDIENTS.flour.start + reward.ingredients.flour);
  assert.equal(saved.stats.soldTotal, 1);
});

test('no announcement and no progress loss after a reload; counters keep growing from the saved values', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const a = session(st, clock); a.mgr.load(); a.mgr.attach();
  a.game.products.bread = 9; a.game.sellProduct('bread', 4);
  const b = session(st, clock); const seen = []; b.game.on('questComplete', (e) => seen.push(e.quest.id));
  b.mgr.load(); b.mgr.attach();
  assert.deepEqual(seen, []);                                    // firstSale was completed before the reload: not announced again
  b.game.sellProduct('bread', 1);
  assert.deepEqual(seen, ['sellFive']);                          // 4 saved + 1 new = 5
});

test('saves from before quests existed load with zero counters and no claimed quests', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  st.setItem(SAVE_KEY, JSON.stringify({ version: 3, gold: 777, ingredients: {}, products: { bread: 2 }, jobs: {}, upgrades: { ovenCapacity: 1 } }));
  const s = session(st, clock);
  assert.equal(s.mgr.load().status, 'loaded');
  assert.equal(s.player.gold, 777);
  assert.equal(s.game.stats.soldTotal, 0);
  assert.equal(s.quests.claimed.size, 0);
  assert.ok(s.quests.list().every((x) => !x.complete));
});

test('invalid counters in a save are rejected (backed up) instead of being used', () => {
  for (const stats of [{ soldTotal: -1 }, { producedTotal: 1.5 }, { sold: { bread: 'x' } }, { marketPurchases: NaN }, 'bad']) {
    const st = new FakeStorage(), problems = [];
    st.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, gold: 5, ingredients: {}, products: {}, jobs: {}, upgrades: {}, stats }));
    const s = session(st, { now: T0 }); s.mgr.problems = problems;
    assert.equal(s.mgr.load().status, 'corrupt', JSON.stringify(stats));
    assert.equal(s.game.stats.soldTotal, 0);
  }
});

test('unknown or duplicate claimed ids in a save are dropped; known ones stay claimed', () => {
  const st = new FakeStorage();
  st.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, gold: 5, ingredients: {}, products: {}, jobs: {}, upgrades: {}, stats: {}, quests: { claimed: ['firstBread', 'firstBread', 'ghost', 7] } }));
  const s = session(st, { now: T0 });
  assert.equal(s.mgr.load().status, 'loaded');
  assert.deepEqual([...s.quests.claimed], ['firstBread']);
});

test('if the save cannot be written the claim still happens in memory and the player is warned', () => {
  const st = new FakeStorage(), clock = { now: T0 };
  const a = session(st, clock, 0); a.mgr.load(); a.mgr.attach();
  a.game.products.bread = 1; a.game.sellProduct('bread', 1);
  st.fail = true;
  assert.ok(a.quests.claim('firstSale').ok);
  assert.equal(a.quests.claim('firstSale').reason, 'claimed');
  assert.ok(a.problems.some((p) => p.kind === 'write'));
});

test('works together with the whole loop: produce -> customer buys -> quest rewards -> reward funds the next purchase', () => {
  const c = make(0);
  produce(c, 'bread');
  assert.equal(c.q('firstBread').complete, true);
  c.quests.claim('firstBread');
  assert.equal(c.player.gold, 100);
  const cust = c.cafe.arrive(); c.cafe.seatQueued();
  assert.ok(c.cafe.deliver(c.cafe.orderOf(cust).id).ok);       // sells the bread
  assert.equal(c.q('firstSale').complete, true);
  assert.ok(c.game.purchase('flour', 1, 'x').ok);              // gold from the quest and sale pays for it
  assert.equal(c.q('marketTrip').complete, true);
});
