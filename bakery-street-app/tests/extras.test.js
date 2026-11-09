import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { Shop } from '../src/game/shop.js';
import { Cafe, LOOKS } from '../src/game/customers.js';
import { Album, validateAlbum } from '../src/game/album.js';
import { weekOf, weeklyProduct } from '../src/game/events.js';
import { SaveManager, SAVE_KEY } from '../src/game/save.js';
import { daylightTint, hourOf } from '../src/scene/daylight.js';
import { CAFE, ALBUM, UPGRADES, PRODUCTS } from '../src/data/economy.js';

class FakeStorage { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();
function make(start = at(2025, 3, 10)) {
  const clock = { now: start }, player = { gold: 1000 };
  const game = new Game(player, {}, () => clock.now);
  new Shop(game);
  const cafe = new Cafe(game, { rng: () => 0.9, config: { ...CAFE, firstSpawnSec: 999, spawnEverySec: [999, 999], eatSec: 0, cleanSec: 0, orderPatienceSec: 500, tables: 4, queueMax: 4 } });
  const album = new Album(game, cafe.looks);
  cafe.setActive(true); game.tick();
  return { clock, player, game, cafe, album };
}
function serve(cafe, game, look, product) {
  const c = cafe.arrive(); c.look = look; cafe.seatQueued();
  const o = cafe.orderOf(c); o.product = product; o.price = game.productsDef[product].price;
  game.products[product] = Math.max(game.products[product], 1);
  return cafe.deliver(o.id);
}

test('week of the year: Monday to Sunday share a week, the star product rotates once a week and never picks a locked product', () => {
  assert.equal(weekOf(at(2025, 3, 10)), weekOf(at(2025, 3, 16, 23)));      // Monday 10th .. Sunday 16th
  assert.equal(weekOf(at(2025, 3, 17)), weekOf(at(2025, 3, 10)) + 1);
  const { game } = make();
  const seen = new Set();
  for (let w = 0; w < 12; w++) { const p = weeklyProduct(game, at(2025, 3, 10 + 7 * w)); assert.ok(game.isUnlocked(p)); seen.add(p); }
  assert.ok(seen.size > 1);
  assert.equal(weeklyProduct(game, at(2025, 3, 11)), weeklyProduct(game, at(2025, 3, 15)));
});

test('the star product of the week is ordered more often and pays +15%', () => {
  const { game, cafe } = make();
  const star = weeklyProduct(game);
  const look = LOOKS.find((l) => cafe.favoriteOf(l) !== star);
  cafe.combo = 0; cafe.comboLeft = 0;
  const c = cafe.arrive(); c.look = look; cafe.seatQueued();
  const o = cafe.orderOf(c); o.product = star; o.price = PRODUCTS[star].price; game.products[star] = 3;
  c.patience = 1;                                                      // not fast: only the weekly bonus can apply
  const base = game.unitEconomics(star, PRODUCTS[star].price).customer;
  const r = cafe.deliver(o.id);
  assert.ok(r.bonus.event);
  assert.equal(r.income, base + Math.round(base * CAFE.bonuses.event.share));
  // order weight: every unlocked product is weighted, the star counts double
  const draws = { star: 0, other: 0 }; let seed = 3;
  cafe.rng = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  cafe.cfg = { ...cafe.cfg, bonuses: { ...cafe.cfg.bonuses, favorite: null } };
  for (let i = 0; i < 4000; i++) { const x = cafe.arrive(); x.look = 'oldman'; const ord = cafe.makeOrder(x); if (ord.product === star) draws.star++; else draws.other++; cafe.customers = []; }
  const ids = Object.keys(game.productsDef).filter((id) => game.isUnlocked(id));
  const w = (id) => cafe.cfg.orderWeights[id] ?? 1, total = ids.reduce((s, id) => s + w(id) * (id === star ? 2 : 1), 0);
  assert.ok(Math.abs(draws.star / 4000 - (w(star) * 2) / total) < 0.04, `star share ${draws.star / 4000}`);
});

test('album: a new look pays once, the favourite becomes known, completion pays once, everything is saved', () => {
  const { game, cafe, album, player } = make();
  const gold = player.gold;
  const r1 = serve(cafe, game, 'oldman', 'bread');
  assert.equal(game.ledger.find((e) => e.source === 'album').delta, ALBUM.newLook);
  assert.equal(player.gold, gold + r1.income + ALBUM.newLook);
  assert.equal(album.entry('oldman').served, 1);
  const g2 = player.gold; serve(cafe, game, 'oldman', 'bread');
  assert.equal(game.ledger.filter((e) => e.source === 'album').length, 1);   // same look again: no second reward
  assert.ok(player.gold >= g2);
  const fav = cafe.favoriteOf('grandma'); game.products[fav] = 5;
  serve(cafe, game, 'grandma', fav);
  assert.equal(album.entry('grandma').fav, true);
  for (const l of LOOKS) if (!album.entry(l)) serve(cafe, game, l, 'bread');
  assert.equal(album.count(), LOOKS.length); assert.ok(album.completed);
  assert.equal(game.ledger.filter((e) => e.label === 'Albüm tamamlandı').length, 1);
  const total = game.ledger.filter((e) => e.source === 'album').reduce((s, e) => s + e.delta, 0);
  assert.equal(total, ALBUM.newLook * LOOKS.length + ALBUM.complete);
  assert.equal(album.record('nobody', false), null);
  // save round trip
  const storage = new FakeStorage(), saves = new SaveManager(game, storage); saves.save();
  const g2b = new Game({ gold: 0 }, {}, () => 1); new Shop(g2b); const c2 = new Cafe(g2b); const a2 = new Album(g2b, c2.looks);
  const s2 = new SaveManager(g2b, storage); s2.load();
  assert.equal(a2.count(), LOOKS.length); assert.equal(a2.completed, true); assert.equal(a2.entry('grandma').fav, true);
});

test('album: unreadable saved data is repaired, never throws', () => {
  assert.deepEqual(validateAlbum(null, LOOKS), { seen: {}, completed: false });
  const v = validateAlbum({ seen: { oldman: { served: 3, fav: true }, nobody: { served: 5 }, grandma: { served: -1 }, boy_cap: { served: 2.5 } }, completed: true }, LOOKS);
  assert.deepEqual(v, { seen: { oldman: { served: 3, fav: true } }, completed: false });   // completed is only kept when every look was seen
});

test('stats: the best combo and favourite servings are counted and saved', () => {
  const { game, cafe } = make();
  const fav = cafe.favoriteOf('girl_red');
  serve(cafe, game, 'girl_red', fav);
  assert.equal(game.stats.favoritesServed, 1);
  assert.ok(game.stats.bestCombo >= 1);
  for (let i = 0; i < 4; i++) serve(cafe, game, 'oldman', 'bread');
  assert.ok(game.stats.bestCombo >= 5);
});

test('waiter training: three levels, rising cost, the waiter speed follows the level', () => {
  const u = UPGRADES.waiterTraining;
  assert.equal(u.costs.length, 3); assert.equal(u.values.length, 4);
  assert.ok(u.costs.every((c, i) => i === 0 || c > u.costs[i - 1]) && u.values.every((v, i) => i === 0 || v > u.values[i - 1]));
  const { game } = make();
  assert.equal(game.effect('waiterTraining'), 1);
  game.player.gold = 1e6; assert.ok(game.buyUpgrade('waiterTraining').ok);
  assert.equal(game.effect('waiterTraining'), 1.2);
  assert.ok(game.shop.items.some((d) => d.upgrade === 'waiterTraining'));       // also sold in the shop (expansion)
});

test('time of day: night is cool and dark, midday has no tint, evening is warm, and every hour gives a valid tint', () => {
  assert.equal(daylightTint(12).alpha, 0);
  assert.ok(daylightTint(2).alpha > 0.25 && daylightTint(2).rgb[2] > daylightTint(2).rgb[0]);       // bluish
  const dusk = daylightTint(18); assert.ok(dusk.alpha > 0.15 && dusk.rgb[0] > dusk.rgb[2]);          // warm
  for (let h = 0; h <= 24; h += 0.25) { const t = daylightTint(h); assert.ok(t.alpha >= 0 && t.alpha <= 0.4); assert.ok(t.rgb.every((v) => v >= 0 && v <= 255)); }
  assert.equal(daylightTint(24).alpha, daylightTint(0).alpha);
  assert.deepEqual(daylightTint(NaN), daylightTint(12));
  assert.equal(hourOf(at(2025, 3, 10, 18)), 18);
});
