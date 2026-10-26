// The cafe scene must keep working with NO pictures loaded at all (a missing or broken asset falls back to the vector art / draws nothing),
// through a whole service: arrival, order, the waiter bringing it, eating, leaving.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { Cafe } from '../src/game/customers.js';
import { CAFE } from '../src/data/economy.js';
import { setCanvasFactory } from '../src/util.js';
import { InteriorScene } from '../src/scene/interior-scene.js';
import { Progression } from '../src/game/progression.js';
import { Shop } from '../src/game/shop.js';
import { SHOP_ITEMS } from '../src/data/economy.js';

function mockCtx() {
  const calls = { n: 0 };
  const grad = { addColorStop() {} };
  const target = { canvas: { width: 780, height: 1688 }, getTransform: () => ({ a: 0.43, b: 0, c: 0, d: 0.43, e: 0, f: 0 }), measureText: (t) => ({ width: String(t).length * 9 }), createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => ({}), getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }) };
  const ctx = new Proxy(target, {
    get(t, k) { if (k in t) return t[k]; if (k === '__calls') return calls; return (...a) => { calls.n++; }; },
    set(t, k, v) { t[k] = v; return true; },
  });
  return ctx;
}

test('the cafe scene draws and runs a whole service without any picture loaded', () => {
  setCanvasFactory((w, h) => { const c = mockCtx(); return { width: w, height: h, getContext: () => c }; });
  const clock = { now: 1_700_000_000_000 };
  const player = { gold: 5000 };
  const game = new Game(player, {}, () => clock.now);
  const cafe = new Cafe(game, { config: { ...CAFE, tablesUpgrade: null, spawnEverySec: [2, 2], firstSpawnSec: 0.5, eatSec: 2, cleanSec: 0.5, orderPatienceSec: 500 } });
  cafe.setActive(true);
  game.tick();
  for (const k of Object.keys(game.products)) game.products[k] = 99;
  const scene = new InteriorScene(game);
  scene.resize({ vw: 390, vh: 844, dpr: 2 });
  scene.snap?.();
  const ctx = mockCtx();
  const paid = []; game.on('customer', (e) => { if (e.type === 'leave' && e.income) paid.push(e.id); });
  const gold0 = player.gold;
  let landed = 0, lastLanded = 0; const till = scene.customers.onRegister; scene.customers.onRegister = (c) => { landed++; if (c.last) lastLanded++; till(c); };
  for (let i = 0; i < 60 * 40; i++) {                              // 40 s at 60 fps
    clock.now += 1000 / 60; game.tick(); scene.update(1 / 60);
    if (i % 3 === 0) scene.render(ctx);
    const tables = cafe.customers.filter((c) => c.state === 'seated').map((c) => c.table);
    assert.equal(new Set(tables).size, tables.length, 'one guest per table');
  }
  assert.ok(paid.length >= 2, `the waiter served and the guests paid (${paid.length})`);
  assert.equal(new Set(paid).size, paid.length, 'nobody paid twice');
  assert.ok(player.gold > gold0);
  assert.ok(lastLanded >= 1 && landed >= 3 * lastLanded, `paying guests throw their coins onto the register (${landed} coins, ${lastLanded} payments)`);
  assert.ok(ctx.__calls.n > 1000, 'something was drawn');
});

test('everything in the shop can be bought and drawn without any picture loaded (stand-ins), and the guests still pay', () => {
  setCanvasFactory((w, h) => { const c = mockCtx(); return { width: w, height: h, getContext: () => c }; });
  const clock = { now: 1_700_000_000_000 };
  const player = { gold: 5_000_000 };
  const game = new Game(player, {}, () => clock.now);
  const prog = new Progression(game); prog.level = 20; prog.rewardedLevel = 20;
  const shop = new Shop(game); shop.stageId = 4;
  const cafe = new Cafe(game, { config: { ...CAFE, spawnEverySec: [2, 2], firstSpawnSec: 0.5, eatSec: 2, cleanSec: 0.5, orderPatienceSec: 500 } });
  cafe.setActive(true); game.tick();
  for (const k of Object.keys(game.products)) game.products[k] = 99;
  for (const k of Object.keys(game.ingredients)) game.ingredients[k] = 50;
  const scene = new InteriorScene(game);
  scene.resize({ vw: 390, vh: 844, dpr: 2 });
  const ctx = mockCtx();
  let bought = 0;
  for (let round = 0; round < 6; round++) for (const d of SHOP_ITEMS) if (shop.status(d.id) === 'ready' && shop.buy(d.id).ok) bought++;
  assert.ok(bought >= SHOP_ITEMS.length - 1, `bought ${bought} of ${SHOP_ITEMS.length}`);
  for (const theme of ['spring', 'cozy']) { shop.place('theme', theme === 'spring' ? 'themeSpring' : 'themeCozy'); for (let i = 0; i < 90; i++) { clock.now += 1000 / 60; game.tick(); scene.update(1 / 60); scene.render(ctx); } }
  game.products.bread = 0; game.products.coffee = 0; assert.ok(game.startProduction('bread').ok && game.startProduction('coffee').ok); game.products.bread = 99; game.products.coffee = 99; game.emit('change', { type: 'sale' });    // first use of the new equipment plays its introduction
  const paid = []; game.on('customer', (e) => { if (e.type === 'leave' && e.income) paid.push(e.id); });
  for (let i = 0; i < 60 * 20; i++) { clock.now += 1000 / 60; game.tick(); scene.update(1 / 60); if (i % 3 === 0) scene.render(ctx); }
  assert.ok(paid.length >= 1);
  assert.equal(shop.pendingIntro('oven'), null);
});
