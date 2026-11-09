import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { Progression } from '../src/game/progression.js';
import { Town } from '../src/game/town.js';
import { Exploration } from '../src/game/exploration.js';
import { Research } from '../src/game/research.js';
import { Shop } from '../src/game/shop.js';
import { Quests } from '../src/game/quests.js';
import { DailyReward } from '../src/game/daily.js';
import { Till } from '../src/game/till.js';
import { DailyGoals } from '../src/game/goals.js';
import { Cafe } from '../src/game/customers.js';
import { Album } from '../src/game/album.js';
import { SaveManager, SAVE_KEY } from '../src/game/save.js';

class FakeStorage { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }

/** The whole game wired the way src/runtime/world.ts does it. */
function world(storage, clock, rng) {
  const game = new Game({ gold: 54320, gems: 0 }, {}, () => clock.now);
  const parts = { progression: new Progression(game), town: new Town(game), exploration: new Exploration(game, { rng }), research: new Research(game) };
  parts.shop = new Shop(game); parts.quests = new Quests(game); parts.daily = new DailyReward(game); parts.till = new Till(game); parts.goals = new DailyGoals(game);
  parts.cafe = new Cafe(game, { rng }); parts.album = new Album(game, parts.cafe.looks);
  const saves = new SaveManager(game, storage); saves.attach();
  const status = saves.load();
  parts.cafe.setActive(true);
  return { game, saves, status, ...parts };
}
/** Where two JSON texts first differ (for a readable failure). */
function firstDiff(a, b) {
  const x = JSON.parse(a), y = JSON.parse(b);
  const walk = (p, u, v) => {
    if (JSON.stringify(u) === JSON.stringify(v)) return null;
    if (u && v && typeof u === 'object' && typeof v === 'object') for (const k of new Set([...Object.keys(u), ...Object.keys(v)])) { const r = walk(`${p}.${k}`, u[k], v[k]); if (r) return r; }
    return `${p}: ${JSON.stringify(u)?.slice(0, 120)} != ${JSON.stringify(v)?.slice(0, 120)}`;
  };
  return walk('', x, y) ?? 'same';
}
const same = (a, b, note) => assert.ok(a === b, `${note}: ${firstDiff(a, b)}`);
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const stable = (v) => (Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])])) : v);
const keyState = (w) => { const s = w.game.exportState(); return JSON.stringify(stable({ gold: s.gold, gems: s.gems, ingredients: s.ingredients, products: s.products, jobs: s.jobs, upgrades: s.upgrades, stats: s.stats, quests: s.quests, daily: s.daily, progression: s.progression, town: s.town, research: s.research, shop: s.shop, album: s.album, profile: s.profile, goals: s.goals, cafe: { customers: s.cafe?.customers, open: s.cafe?.orders?.filter((o) => o.status === 'open') } })); };

function sane(w, note) {
  const g = w.game;
  assert.ok(Number.isFinite(g.gold) && g.gold >= 0, `${note}: gold ${g.gold}`);
  assert.ok(Number.isFinite(g.player.gems ?? 0) && (g.player.gems ?? 0) >= 0, `${note}: gems`);
  for (const [id, n] of Object.entries(g.ingredients)) assert.ok(Number.isInteger(n) && n >= 0, `${note}: ingredient ${id} = ${n}`);
  for (const [id, n] of Object.entries(g.products)) assert.ok(Number.isInteger(n) && n >= 0, `${note}: product ${id} = ${n}`);
  for (const [k, v] of Object.entries(g.stats)) if (typeof v === 'number') assert.ok(Number.isFinite(v) && v >= 0, `${note}: stat ${k} = ${v}`);
  assert.ok(w.till.stored >= 0 && Number.isFinite(w.till.stored), `${note}: till`);
  const used = new Set();
  for (const c of w.cafe.customers) { if (c.state === 'seated') { assert.ok(!used.has(c.table), `${note}: two guests at table ${c.table}`); used.add(c.table); assert.ok(w.cafe.orderOf(c)?.status === 'open', `${note}: seated guest without open order`); } }
  for (const o of w.cafe.openOrders()) assert.ok(w.cafe.customers.some((c) => c.orderId === o.id), `${note}: open order without guest`);
  const e = g.exportState();
  JSON.parse(JSON.stringify(e));                                           // always serialisable
}

test('fuzz: random play (production, shop, upgrades, quests, goals, service, time jumps incl. backwards, save + reload) never breaks an invariant', () => {
  for (let seed = 1; seed <= 12; seed++) {
    let s = seed * 7919; const rng = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const clock = { now: new Date(2025, 5, 10, 9, 0).getTime() }, storage = new FakeStorage();
    let w = world(storage, clock, rng);
    for (let step = 0; step < 400; step++) {
      const g = w.game, note = `seed ${seed} step ${step}`;
      const action = Math.floor(rng() * 14);
      if (action === 0) g.startProduction(pick(rng, Object.keys(g.productsDef)));
      else if (action === 1) g.startMany(pick(rng, Object.keys(g.productsDef)), 3);
      else if (action === 2) { const d = pick(rng, w.shop.items); w.shop.buy(d.id); }
      else if (action === 3) g.buyUpgrade(pick(rng, Object.keys(g.upgradesDef)));
      else if (action === 4) for (const q of w.quests.claimable()) w.quests.claim(q.def.id);
      else if (action === 5) { for (const x of w.goals.claimable()) (x.id.startsWith('w') ? w.goals.claimWeekly() : w.goals.claim(x.id)); }
      else if (action === 6) { for (const o of w.cafe.openOrders()) w.cafe.deliver(o.id); }
      else if (action === 7) { const c = pick(rng, [...w.cafe.customers, null]); if (c?.orderId) w.cafe.deliver(c.orderId); }
      else if (action === 8) g.buyIngredient(pick(rng, Object.keys(g.ingredientsDef)), 1 + Math.floor(rng() * 8));
      else if (action === 9) { const id = pick(rng, Object.keys(g.productsDef)); g.products[id] = Math.min(g.products[id] + 5, 40); }
      else if (action === 10) { clock.now += Math.floor(rng() * 90) * 1000; }
      else if (action === 11) { clock.now += (rng() < 0.3 ? -1 : 1) * Math.floor(rng() * 8) * 3600_000; }          // hours forward or back
      else if (action === 12) { w.till.collect(); w.daily.claim?.(); }
      else if (action === 13) { w.saves.save(); const before = keyState(w); const w2 = world(storage, clock, rng); assert.equal(w2.status.status, 'loaded', `${note}: save did not load (${w2.status.message ?? ''})`); same(keyState(w2), before, note); w = w2; }
      for (let i = 0; i < 1 + Math.floor(rng() * 6); i++) { clock.now += 1000 + Math.floor(rng() * 4000); g.tick(); w.goals.announce(); }
      sane(w, note);
    }
  }
});

test('fuzz: a saved game written by this version reloads to exactly the same state (all systems)', () => {
  let s = 99; const rng = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const clock = { now: new Date(2025, 5, 10, 9, 0).getTime() }, storage = new FakeStorage();
  const w = world(storage, clock, rng);
  w.game.player.gold = 5e6; w.progression.level = 25; w.progression.rewardedLevel = 25;
  for (let pass = 0; pass < 6; pass++) for (const d of w.shop.items) if (d.category !== 'ingredients') w.shop.buy(d.id);
  w.game.setCafeName('Mırmır Kafe');
  for (let i = 0; i < 300; i++) { clock.now += 3000; w.game.tick(); for (const o of w.cafe.openOrders()) { w.game.products[o.product] = Math.max(1, w.game.products[o.product]); w.cafe.deliver(o.id); } if (i % 7 === 0) w.game.startProduction(pick(rng, Object.keys(w.game.productsDef))); }
  w.saves.save();
  const before = keyState(w);
  const w2 = world(storage, clock, rng);
  assert.equal(w2.status.status, 'loaded');
  same(keyState(w2), before, 'reload');
});
