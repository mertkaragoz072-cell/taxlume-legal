import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { Cafe, validateCafe, LOOKS } from '../src/game/customers.js';
import { SaveManager, SAVE_KEY } from '../src/game/save.js';
import { CAFE, PRODUCTS } from '../src/data/economy.js';
import { AREAS, chairSpot, QUEUE_SPOTS } from '../src/scene/interior-layout.js';

/** Deterministic rng so tests are repeatable. */
const seeded = (seed = 1) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

function make({ gold = 1000, config = {}, seed = 7 } = {}) {
  const clock = { now: 1_700_000_000_000 };
  const player = { gold };
  const game = new Game(player, {}, () => clock.now);
  const cfg = { ...CAFE, tablesUpgrade: null, firstSpawnSec: 1, spawnEverySec: [5, 5], ...config };
  const cafe = new Cafe(game, { rng: seeded(seed), config: cfg });
  cafe.setActive(true);   // customers only run while the interior is open
  /** advance fake time in 1 s steps, ticking each step */
  const run = (sec) => { for (let i = 0; i < sec; i++) { clock.now += 1000; game.tick(); } };
  game.tick();   // establishes the cafe's time reference
  return { clock, player, game, cafe, run, cfg };
}
/** Put a customer straight to a table with a chosen order (bypasses randomness for exact assertions). */
function seatWith(cafe, product) {
  const c = cafe.arrive(); cafe.seatQueued();
  const order = cafe.orderOf(c); order.product = product; order.price = PRODUCTS[product].price;
  return { c, order };
}

test('customers arrive at intervals and sit at free tables', () => {
  const { cafe, run } = make();
  assert.equal(cafe.customers.length, 0);
  run(2);
  assert.equal(cafe.customers.length, 1);
  assert.equal(cafe.customers[0].state, 'seated');
  run(5);
  assert.equal(cafe.customers.length, 2);
});

test('every order is one of the four existing products with its current price and status open', () => {
  const { cafe, run } = make({ config: { spawnEverySec: [1, 1], tables: 3, queueMax: 3 } });
  run(30);
  for (const o of cafe.orders) {
    assert.ok(Object.keys(PRODUCTS).includes(o.product));
    assert.equal(o.price, PRODUCTS[o.product].price);
    assert.ok(['open', 'paid', 'cancelled'].includes(o.status));
  }
  assert.ok(cafe.orders.length > 0);
});

test('a customer never takes an occupied table; with no free table they queue', () => {
  const { cafe, game } = make({ config: { tables: 2, queueMax: 3 } });
  for (let i = 0; i < 4; i++) cafe.arrive();
  cafe.seatQueued();
  const seated = cafe.customers.filter((c) => c.state === 'seated');
  assert.equal(seated.length, 2);
  assert.notEqual(seated[0].table, seated[1].table);
  assert.equal(cafe.queued().length, 2);
  assert.deepEqual(cafe.freeTables(), []);
  assert.equal(game.cafe, cafe);
});

test('queued customers are seated in arrival order when a table frees up, and the table becomes usable again', () => {
  const { cafe, game } = make({ config: { tables: 1, queueMax: 3 } });
  const first = cafe.arrive(), second = cafe.arrive(), third = cafe.arrive();
  cafe.seatQueued();
  assert.equal(first.state, 'seated'); assert.equal(second.state, 'queued');
  game.products[cafe.orderOf(first).product] = 1;
  assert.ok(cafe.deliver(first.orderId).ok);                      // first leaves
  assert.equal(second.state, 'seated');                           // next in line takes the same table
  assert.equal(second.table, 0);
  assert.equal(third.state, 'queued');
  assert.equal(cafe.counts().seated, 1);
});

test('queue is capped: no new arrivals beyond queueMax', () => {
  const { cafe, run } = make({ config: { tables: 1, queueMax: 2, spawnEverySec: [1, 1], queuePatienceSec: 9999, orderPatienceSec: 9999 } });
  run(40);
  assert.equal(cafe.counts().queued, 2);
  assert.equal(cafe.counts().customers, 3);
});

test('delivering the right product: stock -1, gold +price, order paid, customer leaves, table free', () => {
  const { cafe, game, player } = make({ gold: 100 });
  const { c, order } = seatWith(cafe, 'croissant');
  game.products.croissant = 2;
  const table = c.table;
  const r = cafe.deliver(order.id);
  assert.deepEqual({ ok: r.ok, income: r.income }, { ok: true, income: PRODUCTS.croissant.price });
  assert.equal(game.products.croissant, 1);
  assert.equal(player.gold, 100 + PRODUCTS.croissant.price);
  assert.equal(order.status, 'paid');
  assert.equal(cafe.customers.includes(c), false);
  assert.equal(cafe.tableOwner(table), null);
});

test('without stock the sale is refused and nothing changes', () => {
  const { cafe, game, player } = make({ gold: 100 });
  const { c, order } = seatWith(cafe, 'cake');
  game.products.cake = 0;
  const r = cafe.deliver(order.id);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'stock');
  assert.match(r.message, /Stokta Pasta yok/);
  assert.equal(player.gold, 100);
  assert.equal(order.status, 'open');
  assert.ok(cafe.customers.includes(c));
  assert.equal(game.products.cake, 0);
});

test('the same order cannot be sold twice or pay twice', () => {
  const { cafe, game, player } = make({ gold: 0 });
  const { order } = seatWith(cafe, 'bread');
  game.products.bread = 5;
  assert.ok(cafe.deliver(order.id).ok);
  const again = cafe.deliver(order.id);
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'closed');
  assert.equal(player.gold, PRODUCTS.bread.price);                // paid exactly once
  assert.equal(game.products.bread, 4);                           // one unit taken exactly once
});

test('a double tap on the customer sells once', () => {
  const { cafe, game, player } = make({ gold: 0 });
  const { c } = seatWith(cafe, 'coffee');
  game.products.coffee = 3;
  const a = cafe.deliverToCustomer(c.id), b = cafe.deliverToCustomer(c.id);
  assert.equal(a.ok, true); assert.equal(b.ok, false);
  assert.equal(player.gold, PRODUCTS.coffee.price);
  assert.equal(game.products.coffee, 2);
});

test('delivering a different product than ordered does not satisfy the order (only the ordered product is taken)', () => {
  const { cafe, game } = make();
  const { order } = seatWith(cafe, 'cake');
  game.products.bread = 9; game.products.cake = 0;
  assert.equal(cafe.deliver(order.id).ok, false);                  // bread in stock does not help
  assert.equal(game.products.bread, 9);
});

test('an impatient customer leaves without paying, the order is cancelled and the table frees up', () => {
  const { cafe, game, player, run } = make({ gold: 50, config: { orderPatienceSec: 10, spawnEverySec: [999, 999], firstSpawnSec: 999 } });
  const { c, order } = seatWith(cafe, 'bread');
  game.products.bread = 5;
  run(11);
  assert.equal(cafe.customers.includes(c), false);
  assert.equal(order.status, 'cancelled');
  assert.equal(player.gold, 50);
  assert.equal(game.products.bread, 5);
  assert.deepEqual(cafe.freeTables().length, cafe.cfg.tables);
  assert.equal(cafe.deliver(order.id).ok, false);                  // cancelled orders cannot be sold afterwards
});

test('a hidden tab does not burn patience: one step advances at most maxStepSec', () => {
  const { cafe, clock, game } = make({ config: { orderPatienceSec: 100, maxStepSec: 2, spawnEverySec: [999, 999], firstSpawnSec: 999 } });
  const { c } = seatWith(cafe, 'bread');
  const before = c.patience;
  clock.now += 3600_000; game.tick();                              // an hour later
  assert.equal(before - c.patience, 2000);
});

test('events: arrive, seat and leave are reported', () => {
  const { cafe, game } = make();
  const seen = []; game.on('customer', (e) => seen.push(e.type + (e.happy === undefined ? '' : ':' + e.happy)));
  const { c } = seatWith(cafe, 'bread'); game.products.bread = 1; cafe.deliver(c.orderId);
  assert.deepEqual(seen, ['arrive', 'seat', 'leave:true']);
});

test('counts report customers, queue and open orders', () => {
  const { cafe } = make({ config: { tables: 2, queueMax: 3 } });
  for (let i = 0; i < 3; i++) cafe.arrive();
  cafe.seatQueued();
  assert.deepEqual(cafe.counts(), { customers: 3, seated: 2, queued: 1, openOrders: 2 });
});

// ------------------------------------------------------------------------------------ persistence
class FakeStorage { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }
function session(storage, clock, seed = 3) {
  const player = { gold: 54320 }, game = new Game(player, {}, () => clock.now);
  const cafe = new Cafe(game, { rng: seeded(seed), config: { ...CAFE, firstSpawnSec: 999, spawnEverySec: [999, 999] } });
  cafe.setActive(true);
  const problems = [];
  const mgr = new SaveManager(game, storage, { onProblem: (p) => problems.push(p) });
  return { game, cafe, mgr, problems, player };
}

test('gold, stock, customers, tables and order status survive a reload', () => {
  const st = new FakeStorage(), clock = { now: 1_700_000_000_000 };
  const a = session(st, clock); a.mgr.load(); a.mgr.attach();
  for (let i = 0; i < 4; i++) a.cafe.arrive();
  a.cafe.seatQueued(); a.game.emit('change', { type: 'cafe' });
  const sold = a.cafe.customers.find((c) => c.state === 'seated');
  a.game.products[a.cafe.orderOf(sold).product] = 2;
  assert.ok(a.cafe.deliver(sold.orderId).ok);
  const before = a.game.exportState();

  clock.now += 3600_000;                                           // app closed for an hour
  const b = session(st, clock); b.mgr.load();
  const after = b.game.exportState();
  assert.equal(after.gold, before.gold);
  assert.deepEqual(after.products, before.products);
  assert.deepEqual(after.cafe.customers, before.cafe.customers);   // same customers, tables, patience (nothing aged while closed)
  assert.deepEqual(after.cafe.orders, before.cafe.orders);
  assert.equal(b.cafe.orders.find((o) => o.id === sold.orderId).status, 'paid');
});

test('a paid order is not paid again after reload', () => {
  const st = new FakeStorage(), clock = { now: 1_700_000_000_000 };
  const a = session(st, clock); a.mgr.load(); a.mgr.attach();
  const { c, order } = seatWith(a.cafe, 'bread');
  a.game.products.bread = 3; a.cafe.deliver(order.id);
  const gold = a.player.gold;
  const b = session(st, clock); b.mgr.load();
  assert.equal(b.cafe.deliver(order.id).ok, false);
  assert.equal(b.player.gold, gold);
  assert.equal(b.game.products.bread, 2);
  assert.equal(b.cafe.customers.some((x) => x.id === c.id), false);
});

test('v1 saves (without a cafe section) still load, with an empty cafe', () => {
  const st = new FakeStorage(), clock = { now: 1_700_000_000_000 };
  st.setItem(SAVE_KEY, JSON.stringify({ version: 1, gold: 777, ingredients: {}, products: { bread: 4 }, jobs: {} }));
  const s = session(st, clock);
  assert.equal(s.mgr.load().status, 'loaded');
  assert.equal(s.player.gold, 777);
  assert.equal(s.cafe.customers.length, 0);
});

test('invalid or finished orders in a save are repaired safely instead of crashing', () => {
  const game = new Game({ gold: 0 }, {}, () => 0);
  const cfg = { ...CAFE, queueMax: 3 };
  const raw = {
    nextId: 3,
    orders: [
      { id: 1, product: 'bread', price: 30, status: 'open', customerId: 10 },       // fine
      { id: 2, product: 'unicorn', price: 99, status: 'open', customerId: 11 },       // unknown product -> dropped
      { id: 3, product: 'cake', price: 120, status: 'paid', customerId: 12 },         // already paid
      { id: 4, product: 'coffee', price: 40, status: 'open', customerId: 99 },        // owner does not exist -> cancelled
      { id: 1, product: 'bread', price: 30, status: 'open', customerId: 10 },        // duplicate id -> dropped
    ],
    customers: [
      { id: 10, look: LOOKS[0], state: 'seated', table: 0, orderId: 1, patience: 5000 },
      { id: 11, look: 'ghost', state: 'seated', table: 0, orderId: 2, patience: 5000 },   // bad look, bad order, same table
      { id: 12, look: LOOKS[1], state: 'seated', table: 1, orderId: 3, patience: 5000 },   // seated with a paid order -> back to queue
      { id: 13, look: LOOKS[2], state: 'seated', table: 7, orderId: 1, patience: -5 },     // table out of range, order owned by another
    ],
  };
  const { state, repaired } = validateCafe(raw, game, cfg);
  assert.ok(repaired > 0);
  const byId = Object.fromEntries(state.customers.map((c) => [c.id, c]));
  assert.equal(byId[10].state, 'seated'); assert.equal(byId[10].table, 0);
  for (const id of [11, 12, 13]) assert.equal(byId[id].state, 'queued');
  const tables = state.customers.filter((c) => c.state === 'seated').map((c) => c.table);
  assert.equal(new Set(tables).size, tables.length);              // no two on one table
  for (const c of state.customers.filter((x) => x.state === 'seated')) assert.equal(state.orders.find((o) => o.id === c.orderId).status, 'open');
  assert.ok(state.orders.every((o) => o.product !== 'unicorn'));
  assert.equal(state.orders.find((o) => o.id === 4)?.status ?? 'cancelled', 'cancelled');
  assert.ok(state.customers.every((c) => c.patience > 0));
  assert.ok(state.nextId > Math.max(...state.customers.map((c) => c.id), ...state.orders.map((o) => o.id)));
});

test('garbage cafe data gives an empty, working cafe', () => {
  const game = new Game({ gold: 0 }, {}, () => 0);
  for (const raw of [null, 'x', 42, [], { customers: 'no', orders: 7 }]) {
    const { state } = validateCafe(raw, game);
    assert.deepEqual(state.customers, []);
    assert.deepEqual(state.orders, []);
  }
});

test('a damaged cafe section does not cost the player the rest of the save, and the repair is reported', () => {
  const st = new FakeStorage(), clock = { now: 1_700_000_000_000 };
  st.setItem(SAVE_KEY, JSON.stringify({ version: 2, gold: 4242, ingredients: { flour: 9 }, products: { bread: 3 }, jobs: {},
    cafe: { nextId: 5, orders: [{ id: 1, product: 'bread', price: 30, status: 'open', customerId: 2 }], customers: [{ id: 2, look: LOOKS[0], state: 'seated', table: 99, orderId: 1, patience: 1000 }] } }));
  const s = session(st, clock);
  const r = s.mgr.load();
  assert.equal(r.status, 'loaded');
  assert.equal(s.player.gold, 4242);
  assert.equal(s.game.ingredients.flour, 9);
  assert.ok(s.problems.some((p) => p.kind === 'repair'));
  assert.equal(s.cafe.customers[0].state, 'queued');               // bad table -> back to the queue, will be re-seated
});

test('importing a snapshot does not age waiting customers while the app was closed', () => {
  const clock = { now: 1_700_000_000_000 };
  const s = session(new FakeStorage(), clock);
  const { c } = seatWith(s.cafe, 'bread');
  const snap = s.cafe.exportState();
  clock.now += 86_400_000;                                          // a day later
  s.cafe.importState(validateCafe(snap, s.game, s.cafe.cfg).state);
  s.game.tick();
  const same = s.cafe.customers.find((x) => x.id === c.id);
  assert.ok(same, 'customer is still there');
  assert.ok(same.patience >= c.patience - 1, 'patience was not consumed by the offline day');
});

// ------------------------------------------------------------------------------ 3.1: pause outside the cafe
test('a new cafe is paused until the interior opens (app starts on the street)', () => {
  const clock = { now: 1_700_000_000_000 };
  const game = new Game({ gold: 0 }, {}, () => clock.now);
  const cafe = new Cafe(game, { rng: seeded(1), config: { ...CAFE, firstSpawnSec: 1, spawnEverySec: [1, 1] } });
  assert.equal(cafe.active, false);
  game.tick();
  for (let i = 0; i < 60; i++) { clock.now += 1000; game.tick(); }
  assert.equal(cafe.customers.length, 0);                          // nobody arrives while paused
});

test('while paused no customer arrives and no patience is consumed', () => {
  const { cafe, clock, game, run } = make({ config: { orderPatienceSec: 20, queuePatienceSec: 20, spawnEverySec: [3, 3], firstSpawnSec: 1 } });
  run(8);                                                          // let a few customers in
  const snapshot = JSON.stringify(cafe.exportState());
  const spawnIn = cafe.spawnIn;
  cafe.setActive(false);
  for (let i = 0; i < 300; i++) { clock.now += 1000; game.tick(); }   // five minutes on the street
  assert.equal(JSON.stringify(cafe.exportState()), snapshot);      // customers, tables, orders and patience are untouched
  assert.equal(cafe.spawnIn, spawnIn);                             // arrival timer frozen too
});

test('resuming continues where it stopped: no catch-up and no burst of new customers', () => {
  const { cafe, clock, game, run } = make({ config: { spawnEverySec: [5, 5], firstSpawnSec: 1, orderPatienceSec: 500, queuePatienceSec: 500, tables: 3, queueMax: 3 } });
  run(2);
  const before = cafe.customers.length, patience = cafe.customers.map((c) => c.patience);
  cafe.setActive(false);
  clock.now += 3 * 3600 * 1000;                                    // three hours later
  cafe.setActive(true);
  game.tick();
  assert.equal(cafe.customers.length, before);                     // nothing was created for the time away
  assert.deepEqual(cafe.customers.map((c) => c.patience), patience);
  clock.now += 1000; game.tick();
  assert.ok(cafe.customers.length - before <= 1);                  // at most the normal single arrival afterwards
});

test('open orders survive leaving and re-entering and can still be sold afterwards', () => {
  const { cafe, game, player, clock } = make({ gold: 10 });
  const { c, order } = seatWith(cafe, 'bread');
  game.products.bread = 2;
  cafe.setActive(false); clock.now += 600_000; game.tick(); cafe.setActive(true);
  assert.equal(order.status, 'open');
  assert.ok(cafe.customers.includes(c));
  assert.equal(cafe.deliver(order.id).ok, true);
  assert.equal(player.gold, 10 + PRODUCTS.bread.price);
});

test('the pause state is not saved: a reloaded app starts paused and keeps customers and orders', () => {
  const st = new FakeStorage(), clock = { now: 1_700_000_000_000 };
  const a = session(st, clock); a.mgr.load(); a.mgr.attach();
  const { order } = seatWith(a.cafe, 'coffee'); a.game.emit('change', { type: 'cafe' });
  const b = new Game({ gold: 0 }, {}, () => clock.now);
  const cafeB = new Cafe(b, { rng: seeded(1), config: { ...CAFE, firstSpawnSec: 1, spawnEverySec: [1, 1] } });
  new SaveManager(b, st).load();
  assert.equal(cafeB.active, false);
  assert.ok(cafeB.orders.find((o) => o.id === order.id && o.status === 'open'));
  assert.equal(cafeB.customers.length, 1);
  clock.now += 1000; b.tick(); clock.now += 1000; b.tick();
  assert.equal(cafeB.customers.length, 1);                         // still paused
});

test('a table never holds two customers and is free again after the customer leaves (randomised simulation)', () => {
  const { cafe, game, clock } = make({ config: { spawnEverySec: [1, 3], firstSpawnSec: 1, queueMax: 3, orderPatienceSec: 15, queuePatienceSec: 10 }, seed: 99 });
  for (const k of Object.keys(game.products)) game.products[k] = 3;
  const rnd = seeded(5);
  for (let step = 0; step < 900; step++) {
    clock.now += 1000; game.tick();
    if (rnd() < 0.25) { const open = cafe.openOrders(); if (open.length) { for (const k of Object.keys(game.products)) game.products[k] = 3; cafe.deliver(open[Math.floor(rnd() * open.length)].id); } }
    const seated = cafe.customers.filter((c) => c.state === 'seated');
    const tables = seated.map((c) => c.table);
    assert.equal(new Set(tables).size, tables.length, `step ${step}: two customers share a table`);
    assert.ok(tables.every((t) => t >= 0 && t < cafe.cfg.tables));
    assert.equal(cafe.freeTables().length, cafe.cfg.tables - seated.length, 'free tables must equal tables minus seated customers');
    assert.equal(cafe.openOrders().length, seated.length, 'every seated customer has exactly one open order');
    assert.ok(cafe.customers.length <= cafe.cfg.tables + cafe.cfg.queueMax);
  }
});

test('a freed table can be taken at once by a waiting customer, and never by two', () => {
  const { cafe, game } = make({ config: { tables: 1, queueMax: 3 } });
  const a = cafe.arrive(), b = cafe.arrive(), c = cafe.arrive();
  cafe.seatQueued();
  game.products[cafe.orderOf(a).product] = 1;
  cafe.deliver(a.orderId);
  assert.equal(cafe.customers.filter((x) => x.state === 'seated').length, 1);
  assert.equal(b.state, 'seated'); assert.equal(c.state, 'queued');
});

test('visual layout: every seated spot is apart from the other tables, the queue and the entrance', () => {
  const spots = AREAS.filter((a) => a.id.startsWith('table')).map((_, i) => chairSpot(i));
  assert.equal(spots.length, CAFE.tables);
  const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
  for (let i = 0; i < spots.length; i++) {
    for (let j = i + 1; j < spots.length; j++) assert.ok(dist(spots[i], spots[j]) > 200, `table spots ${i} and ${j} overlap`);
    for (const q of QUEUE_SPOTS) assert.ok(dist(spots[i], q) > 130, `table ${i} overlaps a queue spot`);
  }
  for (let i = 0; i < QUEUE_SPOTS.length; i++) for (let j = i + 1; j < QUEUE_SPOTS.length; j++) assert.ok(dist(QUEUE_SPOTS[i], QUEUE_SPOTS[j]) > 85, 'queue spots too close');
  assert.ok(QUEUE_SPOTS.length >= CAFE.queueMax);
});
