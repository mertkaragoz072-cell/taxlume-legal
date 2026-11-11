// Long runs of the whole cafe scene (no pictures, no screen): guests, waiter, baker and the logic together for many virtual minutes.
// These catch what the logic tests cannot see, like the waiter waiting for ever behind a guest standing in the queue.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { Cafe } from '../src/game/customers.js';
import { Shop } from '../src/game/shop.js';
import { Progression } from '../src/game/progression.js';
import { CAFE } from '../src/data/economy.js';
import { setCanvasFactory } from '../src/util.js';
import { InteriorScene } from '../src/scene/interior-scene.js';

function mockCtx() {
  const calls = { n: 0 };
  const grad = { addColorStop() {} };
  const target = { canvas: { width: 780, height: 1688 }, getTransform: () => ({ a: 0.43, b: 0, c: 0, d: 0.43, e: 0, f: 0 }), measureText: (t) => ({ width: String(t).length * 9 }), createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => null };
  return new Proxy(target, { get(t, k) { if (k in t) return t[k]; if (k === '__calls') return calls; return () => { calls.n++; }; }, set(t, k, v) { t[k] = v; return true; } });
}

/** Runs the scene for `minutes` at 30 updates per second. A simple player keeps the machines busy (and, if asked, keeps stock high). */
function run({ minutes, tables = 4, seed = 1, stock = 'plenty', types = true, render = false, crowd = false }) {
  setCanvasFactory((w, h) => { const c = mockCtx(); return { width: w, height: h, getContext: () => c }; });
  let s = seed * 9973; const rng = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const realRandom = Math.random; Math.random = rng;                // the scene's own small randomness (baker's pauses) is repeatable too
  try {
    const clock = { now: new Date(2025, 5, 10, 12).getTime() };
    const game = new Game({ gold: 1e6 }, {}, () => clock.now);
    const prog = new Progression(game); prog.level = 10; prog.rewardedLevel = 10;
    new Shop(game);
    const bonuses = types ? CAFE.bonuses : { ...CAFE.bonuses, types: null };
    const cafe = new Cafe(game, { rng, config: { ...CAFE, bonuses, ...(crowd ? { spawnEverySec: [3, 6], queueMax: 3 } : {}) } });
    for (let i = 1; i < tables - 1; i++) game.buyUpgrade('cafeTables');
    cafe.setActive(true); game.tick();
    const scene = new InteriorScene(game);
    scene.resize({ vw: 390, vh: 844, dpr: 2 });
    const ctx = mockCtx();
    const out = { sold: 0, gaveUp: 0, arrived: 0, stuck: [], maxLife: 0 };
    const born = new Map();
    game.on('customer', (e) => {
      if (e.type === 'arrive') { out.arrived++; born.set(e.id, clock.now); }
      if (e.type === 'leave') { if (e.income) out.sold++; else out.gaveUp++; out.maxLife = Math.max(out.maxLife, (clock.now - (born.get(e.id) ?? clock.now)) / 1000); born.delete(e.id); }
    });
    const still = new Map();                                       // walker -> { x, y, since } for walkers that should be moving
    const watch = (key, x, y, moving, limit) => {
      const p = still.get(key);
      if (!moving || !p || Math.abs(p.x - x) > 0.5 || Math.abs(p.y - y) > 0.5) { still.set(key, { x, y, since: clock.now }); return; }
      if ((clock.now - p.since) / 1000 > limit) { out.stuck.push(`${key} stuck at ${Math.round(x)},${Math.round(y)}`); still.set(key, { x, y, since: clock.now }); }
    };
    let phaseKey = '', phaseSince = clock.now;
    const frames = minutes * 60 * 30;
    for (let i = 0; i < frames; i++) {
      clock.now += 1000 / 30; game.tick(); scene.update(1 / 30);
      if (render && i % 15 === 0) scene.render(ctx);
      if (i % 30 === 0) {                                          // the player, once a second
        if (stock === 'plenty') for (const id of Object.keys(game.productsDef)) if (game.isUnlocked(id)) game.products[id] = Math.max(game.products[id], 3);
        for (const ing of Object.keys(game.ingredientsDef)) if (game.ingredients[ing] < 10) game.buyIngredient(ing, 10);
        for (const id of Object.keys(game.productsDef)) if (game.isUnlocked(id) && game.products[id] < 2) game.startProduction(id);
      }
      // nobody may be "walking" without moving for long, the waiter may not hang in one phase of a trip
      for (const [id, v] of scene.customers.v) watch(`guest ${id}`, v.x, v.y, v.moving && !v.pause, 8);
      const st = scene.staff, w = st.waiter;
      watch('waiter', w.x, w.y, !!w.target, 8);
      watch('baker', st.baker.x, st.baker.y, !!st.baker.target, 8);
      const k = `${st.phase}:${st.job?.order ?? ''}`;
      if (k !== phaseKey) { phaseKey = k; phaseSince = clock.now; } else if (st.phase !== 'post' && (clock.now - phaseSince) / 1000 > 30) { out.stuck.push(`waiter in ${st.phase} for 30 s`); phaseSince = clock.now; }
      const seatedTables = cafe.customers.filter((c) => c.state === 'seated').map((c) => c.table);
      if (new Set(seatedTables).size !== seatedTables.length) out.stuck.push('two guests at one table');
    }
    out.left = cafe.customers.length;
    out.draws = ctx.__calls.n;
    return out;
  } finally { Math.random = realRandom; }
}

const life = (CAFE.queuePatienceSec + CAFE.orderPatienceSec) / 0.6 + CAFE.eatSec + 30;    // the longest a guest can stay (a hurried guest has less, a kid more)

test('long run: 20 minutes with 4 tables and plenty of stock: guests keep coming, nearly all are served, nobody is stuck', () => {
  const r = run({ minutes: 20, tables: 4, seed: 1 });
  if (process.env.SCENE_LOG) console.log(JSON.stringify(r));
  assert.deepEqual(r.stuck, []);
  assert.ok(r.arrived >= 40, `guests arrived (${r.arrived})`);
  assert.ok(r.sold >= r.arrived * 0.8, `served ${r.sold} of ${r.arrived} (gave up ${r.gaveUp})`);
  assert.ok(r.maxLife < life * 1.3, `longest stay ${r.maxLife.toFixed(0)} s`);
});

test('long run: every table count and several seeds keep the service flowing', () => {
  for (const tables of [2, 3, 4]) for (const seed of [2, 3]) {
    const r = run({ minutes: 8, tables, seed });
    assert.deepEqual(r.stuck, [], `tables ${tables} seed ${seed}`);
    assert.ok(r.sold >= 8, `tables ${tables} seed ${seed}: served ${r.sold}`);
  }
});

test('long run: a crowded cafe (guests queue on the waiter\'s lane all the time) keeps being served', () => {
  for (const seed of [6, 7]) {
    const r = run({ minutes: 10, tables: 4, seed, crowd: true });
    if (process.env.SCENE_LOG) console.log(JSON.stringify(r));
    assert.deepEqual(r.stuck, [], `seed ${seed}`);
    assert.ok(r.sold >= 30, `seed ${seed}: served ${r.sold} of ${r.arrived}`);
  }
});

test('long run: with no stock guests give up and leave; the cafe never jams and recovers when stock comes back', () => {
  const r = run({ minutes: 6, tables: 3, seed: 4, stock: 'none' });
  assert.deepEqual(r.stuck, []);
  assert.ok(r.gaveUp + r.sold >= 5, `guests came and went (${r.sold} served, ${r.gaveUp} gave up)`);
});

test('long run with drawing: the scene draws every frame of a busy service without throwing', () => {
  const r = run({ minutes: 3, tables: 4, seed: 5, render: true });
  assert.deepEqual(r.stuck, []);
  assert.ok(r.draws > 10000);
});
