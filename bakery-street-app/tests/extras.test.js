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

// ---- variety, weather, rating, kitchen helper, weekly goal, season ---------------------------------------------------------
import { weatherOf } from '../src/game/weather.js';
import { seasonTint } from '../src/scene/daylight.js';
import { DailyGoals } from '../src/game/goals.js';
import { GOALS } from '../src/data/economy.js';

function bonusCafe(extra = {}) {
  const clock = { now: at(2025, 3, 10) }, player = { gold: 1e6 };
  const game = new Game(player, {}, () => clock.now);
  new Shop(game);
  const bonuses = { ...CAFE.bonuses, event: null, types: null, ...extra };
  const cafe = new Cafe(game, { rng: () => 0.9, config: { ...CAFE, bonuses, firstSpawnSec: 999, spawnEverySec: [999, 999], eatSec: 0, cleanSec: 0, orderPatienceSec: 5000, tables: 4, queueMax: 4 } });
  cafe.setActive(true); game.tick();
  return { clock, game, cafe, player };
}
const sell = (cafe, game, product, look = 'oldman') => { const r = serve(cafe, game, look, product); cafe.holds = {}; return r; };

test('variety: three different products in a row pay +5%; repeating one does not', () => {
  const { cafe, game } = bonusCafe();
  const a = sell(cafe, game, 'bread'), b = sell(cafe, game, 'coffee'), c = sell(cafe, game, 'croissant');
  assert.ok(!a.bonus.variety && !b.bonus.variety && c.bonus.variety);
  const d = sell(cafe, game, 'croissant');
  assert.ok(!d.bonus.variety);
});

test('weather: decided by the date alone, rainy about as often as configured, rain brings hot drinks and slows arrivals', () => {
  const rain = [];
  for (let d = 0; d < 400; d++) rain.push(weatherOf(at(2025, 1, 1 + d), 0.22));
  const share = rain.filter((w) => w === 'rain').length / rain.length;
  assert.ok(share > 0.15 && share < 0.3, `rain share ${share}`);
  assert.equal(weatherOf(at(2025, 3, 10, 6), 0.22), weatherOf(at(2025, 3, 10, 23), 0.22));
  assert.equal(weatherOf(at(2025, 3, 10), 0), 'clear');
  // find a rainy and a clear day and compare the cafe's behaviour
  let rainy = null, clear = null;
  for (let d = 0; d < 60 && !(rainy && clear); d++) { const t = at(2025, 4, 1 + d); if (weatherOf(t, 0.22) === 'rain') rainy ??= t; else clear ??= t; }
  const mk = (t) => { const x = bonusCafe(); x.clock.now = t; x.cafe.last = null; return x; };
  const wet = mk(rainy), dry = mk(clear);
  assert.equal(wet.cafe.weather(), 'rain'); assert.equal(dry.cafe.weather(), 'clear');
  const coffeeShare = (x) => { let n = 0, seed = 5; x.cafe.rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; x.cafe.cfg = { ...x.cafe.cfg, bonuses: { ...x.cafe.cfg.bonuses, favorite: null } }; for (let i = 0; i < 3000; i++) { const g = x.cafe.arrive(); g.look = 'oldman'; if (x.game.productsDef[x.cafe.makeOrder(g).product].station === 'coffee') n++; x.cafe.customers = []; } return n / 3000; };
  assert.ok(coffeeShare(wet) > coffeeShare(dry) + 0.04);
  const gap = (x) => { let s = 0; x.cafe.rng = () => 0.5; for (let i = 0; i < 5; i++) s += x.cafe.nextInterval(); return s; };
  assert.ok(gap(wet) > gap(dry));
  const off = bonusCafe({ weather: null }); off.clock.now = rainy; assert.equal(off.cafe.weather(), 'clear');
});

test('cafe rating: starts at 3 stars, follows how many guests left happy, speeds arrivals up or down a little', () => {
  const { cafe, game } = bonusCafe();
  assert.equal(cafe.rating().stars, 3);
  for (let i = 0; i < 10; i++) sell(cafe, game, 'bread');
  assert.equal(cafe.rating().stars, 5);
  cafe.rng = () => 0.5;
  const happyGap = cafe.nextInterval();
  for (let i = 0; i < 20; i++) { const g = cafe.arrive(); cafe.seatQueued(); cafe.leave(g, false); }
  assert.equal(cafe.rating().stars, 1);
  assert.ok(cafe.nextInterval() > happyGap);
  assert.ok(cafe.results.length <= 20);
});

test('kitchen helper: repeats the last product when a machine finishes, only when it is bought, never buys anything', () => {
  const clock = { now: at(2025, 3, 10) };
  const game = new Game({ gold: 1e6 }, {}, () => clock.now);
  new Shop(game);
  game.ingredients.flour = 20;
  assert.ok(game.startProduction('bread').ok);
  clock.now += 21_000; game.tick();
  assert.equal(game.products.bread, 3);                                 // 2 at the start + 1 made, nothing restarted
  assert.equal((game.jobs.oven ?? []).length, 0);
  assert.ok(game.buyUpgrade('kitchenHelper').ok);
  assert.ok(game.startProduction('bread').ok);
  const flourBefore = game.ingredients.flour;
  clock.now += 21_000; game.tick();
  assert.equal((game.jobs.oven ?? []).length, 1);                       // restarted by itself
  assert.equal(game.ingredients.flour, flourBefore - 2);
  game.ingredients.flour = 0; clock.now += 21_000; game.tick();
  assert.equal((game.jobs.oven ?? []).length, 0);                       // no flour: it stops, and does not buy any
  assert.equal(game.ingredients.flour, 0);
});

test('weekly goal: one goal a week, counts from Monday, pays once through Game.earn, a new week brings the next one', () => {
  const clock = { now: at(2025, 3, 10) }, game = new Game({ gold: 0 }, {}, () => clock.now);
  new Shop(game); const goals = new DailyGoals(game);
  const w1 = goals.weekly();
  assert.equal(goals.weekly().id, w1.id);
  game.stats[GOALS.weekly.find((g) => g.id === w1.id).stat] += w1.target + 5;
  const w = goals.weekly(); assert.ok(w.complete && !w.claimed); assert.equal(w.progress, w.target);
  assert.ok(goals.claimable().some((g) => g.id === w1.id));
  const r = goals.claimWeekly(); assert.ok(r.ok); assert.equal(game.player.gold, w1.gold); assert.equal(game.ledger[0].source, 'goal');
  assert.equal(goals.claimWeekly().ok, false);
  clock.now = at(2025, 3, 14); assert.equal(goals.weekly().id, w1.id); assert.ok(goals.weekly().claimed);   // same week: still collected
  clock.now = at(2025, 3, 17);
  const next = goals.weekly(); assert.notEqual(next.id, w1.id); assert.equal(next.progress, 0); assert.equal(next.claimed, false);
});

test('season tint: winter cool, autumn warm, summer none, every month valid', () => {
  assert.ok(seasonTint(0).rgb[2] > seasonTint(0).rgb[0]);
  assert.ok(seasonTint(9).rgb[0] > seasonTint(9).rgb[2]);
  assert.equal(seasonTint(6).alpha, 0);
  for (let m = 0; m < 12; m++) { const t = seasonTint(m); assert.ok(t.alpha >= 0 && t.alpha < 0.15 && t.rgb.every((v) => v >= 0 && v <= 255)); }
});

// ---- guest types, cafe name, play time, quick production ----------------------------------------------------------------
import { cleanName, NAME_MAX } from '../src/game/profile.js';
import { GUEST_TYPES, validateCafe } from '../src/game/customers.js';

test('guest types: chances roughly as configured; hurried guests wait less, kids more; gourmets order dear, kids cheap; the bonus applies per type', () => {
  const { cafe, game } = bonusCafe({ types: CAFE.bonuses.types });
  let seed = 11; cafe.rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const counts = { hurried: 0, gourmet: 0, kid: 0, none: 0 };
  for (let i = 0; i < 3000; i++) { const g = cafe.arrive(); counts[g.type ?? 'none']++; cafe.customers = []; }
  for (const t of GUEST_TYPES) assert.ok(Math.abs(counts[t] / 3000 - CAFE.bonuses.types[t].chance) < 0.03, `${t} ${counts[t] / 3000}`);
  const mk = (type) => { const g = cafe.arrive(); g.type = type; g.state = 'queued'; return g; };
  const h = mk('hurried'), n = mk(null), k = mk('kid');
  assert.ok(cafe.patienceMult(h) < 1 && cafe.patienceMult(k) > 1 && cafe.patienceMult(n) === 1);
  cafe.customers = [];
  // order prices
  game.shop.stageId = 4; for (const id of Object.keys(game.productsDef)) game.products[id] = 5;
  const prices = (type) => { const out = []; for (let i = 0; i < 400; i++) { const g = cafe.arrive(); g.type = type; out.push(game.productsDef[cafe.makeOrder(g).product].price); cafe.customers = []; } return out.reduce((a, b) => a + b, 0) / out.length; };
  assert.ok(prices('gourmet') > prices(null) && prices(null) > prices('kid'));
  // bonus: a gourmet always pays +10%, a hurried guest only when served fast
  const g1 = cafe.arrive(); g1.look = 'oldman'; g1.type = 'gourmet'; cafe.seatQueued();
  const o1 = cafe.orderOf(g1); o1.product = 'bread'; o1.price = 30; g1.patience = 1; game.products.bread = 5;
  assert.equal(cafe.deliver(o1.id).bonus.guest, 'gourmet');
  const g2 = cafe.arrive(); g2.look = 'oldman'; g2.type = 'hurried'; cafe.seatQueued();
  const o2 = cafe.orderOf(g2); o2.product = 'bread'; o2.price = 30;
  const fastPct = cafe.serviceBonus(g2, o2).pct; g2.patience = 1; const slowPct = cafe.serviceBonus(g2, o2).pct;
  assert.ok(fastPct > slowPct);
});

test('guest types: saved with the guest, unknown types dropped on load', () => {
  const { cafe, game } = bonusCafe({ types: CAFE.bonuses.types });
  const g = cafe.arrive(); g.type = 'kid'; cafe.seatQueued();
  const state = cafe.exportState();
  assert.equal(state.customers[0].type, 'kid');
  const ok = validateCafe(state, game, cafe.cfg, cafe.looks);
  assert.equal(ok.state.customers[0].type, 'kid');
  state.customers[0].type = 'wizard';
  assert.equal(validateCafe(state, game, cafe.cfg, cafe.looks).state.customers[0].type, undefined);
});

test('cafe name: cleaned, capped, saved with the game, empty falls back to the stage name', () => {
  assert.equal(cleanName('  Pati   Fırın \n'), 'Pati Fırın');
  assert.equal(cleanName('x'.repeat(40)).length, NAME_MAX);
  assert.equal(cleanName('a\u0000b​c'), 'a b c');
  assert.equal(cleanName(42), ''); assert.equal(cleanName('   '), '');
  assert.equal([...cleanName('🐱'.repeat(30))].length, NAME_MAX);          // characters, not bytes
  const { game, cafe } = make();
  assert.equal(game.setCafeName('  Mırmır Kafe  '), 'Mırmır Kafe');
  const storage = new FakeStorage(), saves = new SaveManager(game, storage); saves.save();
  const g2 = new Game({ gold: 0 }, {}, () => 1); new Shop(g2); new Cafe(g2);
  new SaveManager(g2, storage).load();
  assert.equal(g2.profile.name, 'Mırmır Kafe');
  assert.equal(game.setCafeName(''), ''); assert.ok(cafe);
});

test('play time counts whole seconds spent in the cafe only, and quick production starts up to three in a row', () => {
  const { clock, game, cafe } = make();
  const before = game.stats.playSec;
  for (let i = 0; i < 10; i++) { clock.now += 1000; game.tick(); }
  assert.ok(game.stats.playSec - before >= 9 && game.stats.playSec - before <= 10);
  cafe.setActive(false); const mid = game.stats.playSec;
  for (let i = 0; i < 10; i++) { clock.now += 1000; game.tick(); }
  assert.equal(game.stats.playSec, mid);                                // away from the cafe: not counted
  game.player.gold = 1e6; game.buyUpgrade('ovenCapacity'); game.buyUpgrade('ovenCapacity');
  game.ingredients.flour = 50;
  const r = game.startMany('bread', 3);
  assert.equal(r.started, 3); assert.equal(game.jobsOf('oven').length, 3);
  const r2 = game.startMany('bread', 3);
  assert.equal(r2.started, 0); assert.ok(r2.message);
});

// ---- first-steps hints -------------------------------------------------------------------------------------------------------
import { currentTip, TIPS } from '../src/game/tips.js';
import { Quests } from '../src/game/quests.js';

test('first-steps hints: one at a time, in order, each gone once done; nothing left for an experienced player', () => {
  const clock = { now: at(2025, 3, 10) };
  const game = new Game({ gold: 54320 }, {}, () => clock.now);
  new Shop(game); new Quests(game);
  assert.equal(currentTip(game).id, 'produce');
  assert.ok(game.startProduction('bread').ok);
  assert.equal(currentTip(game).id, 'serve');                         // a job running counts as done
  game.stats.soldTotal = 1;
  assert.equal(currentTip(game).id, 'quest');                         // the first bread / first sale quests are complete
  for (const q of game.quests.claimable()) game.quests.claim(q.def.id);
  assert.equal(currentTip(game).id, 'shop');
  game.stats.shopBought = 1;
  assert.equal(currentTip(game), null);
  assert.ok(TIPS.every((t) => t.text.length < 140));
});
