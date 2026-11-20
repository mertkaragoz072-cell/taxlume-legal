// Café life: production line, dish of the day, set menus, friendship, letters, the critic, special orders, the Market deal,
// achievements, phone reminder planning, and that all of it survives a save and load.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { Shop } from '../src/game/shop.js';
import { Cafe } from '../src/game/customers.js';
import { Album, validateAlbum } from '../src/game/album.js';
import { Life, validateLife } from '../src/game/life.js';
import { Achievements, validateAchievements } from '../src/game/achievements.js';
import { Progression } from '../src/game/progression.js';
import { Exploration } from '../src/game/exploration.js';
import { Till } from '../src/game/till.js';
import { SaveManager } from '../src/game/save.js';
import { planNotifications, quietHours, stationDoneIn } from '../src/game/notify-plan.js';
import { CAFE, LIFE } from '../src/data/economy.js';

class FakeStorage { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();
/** A small world; `r` is the random number every roll gets (0.99 = nothing random happens). */
function make({ r = 0.99, level = 10, start = at(2025, 3, 10) } = {}) {
  const clock = { now: start }, player = { gold: 100000, gems: 0 };
  const rng = () => (typeof r === 'function' ? r() : r);
  const game = new Game(player, {}, () => clock.now);
  const prog = new Progression(game);
  new Shop(game);
  new Exploration(game);
  new Till(game);
  const cafe = new Cafe(game, { rng, config: { ...CAFE, firstSpawnSec: 999, spawnEverySec: [999, 999], eatSec: 0, cleanSec: 0, orderPatienceSec: 500, tables: 4, queueMax: 4 } });
  const album = new Album(game, cafe.looks);
  const life = new Life(game, LIFE, rng);
  const ach = new Achievements(game);
  prog.level = level; prog.rewardedLevel = level;
  for (const k of Object.keys(game.ingredients)) game.ingredients[k] = 50;
  cafe.setActive(true); game.tick();
  return { clock, player, game, cafe, album, life, ach, prog };
}
const seatOne = (cafe, look) => { const c = cafe.arrive(); if (look) c.look = look; cafe.seatQueued(); return c; };

// ---- production line -------------------------------------------------------------------------------------------------
test('a busy machine takes jobs into its line: ingredients are taken at once and the line starts by itself, in order', () => {
  const { game, clock } = make();
  const cap = game.capacity('oven');
  for (let i = 0; i < cap; i++) assert.ok(game.produceOrQueue('bread').ok);
  const flour = game.ingredients.flour;
  const r = game.produceOrQueue('croissant');
  assert.ok(r.ok && r.queued && r.position === 1);
  assert.ok(game.ingredients.flour < flour, 'ingredients are taken when the job joins the line');
  assert.deepEqual(game.queueOf('oven'), ['croissant']);
  assert.equal(game.committed('croissant'), 1, 'a waiting job counts towards the showcase limit');
  clock.now += game.duration('bread') * 1000 + 10; game.tick();
  assert.equal(game.queueOf('oven').length, 0);
  assert.ok(game.jobsOf('oven').some((j) => j.product === 'croissant'));
});

test('the line is limited, and a full line says so instead of taking ingredients', () => {
  const { game } = make();
  for (let i = 0; i < game.capacity('oven'); i++) game.produceOrQueue('bread');
  for (let i = 0; i < game.queueMax; i++) assert.ok(game.produceOrQueue('bread').ok);
  const flour = game.ingredients.flour, r = game.produceOrQueue('bread');
  assert.equal(r.ok, false); assert.ok(['queue', 'showcase'].includes(r.reason));
  assert.equal(game.ingredients.flour, flour);
});

test('while the app is closed the line keeps going: each waiting job starts the moment a slot came free', () => {
  const { game, clock } = make();
  const cap = game.capacity('oven');
  for (let i = 0; i < cap + 2; i++) assert.ok(game.produceOrQueue('bread').ok);
  const before = game.products.bread, d = game.duration('bread');
  clock.now += d * 1000 * 3 + 50; game.tick();       // long enough for every job, even the queued ones that start one after the other
  assert.equal(game.products.bread, before + cap + 2);
  assert.equal(game.jobsOf('oven').length, 0); assert.equal(game.queueOf('oven').length, 0);
});

test('the line is saved; a damaged one is cleaned (wrong machine, unknown product, too long)', () => {
  const { game } = make();
  for (let i = 0; i < game.capacity('oven') + 2; i++) game.produceOrQueue('bread');
  const st = new FakeStorage(), saves = new SaveManager(game, st); saves.save();
  const raw = JSON.parse(st.getItem(saves.key));
  assert.deepEqual(raw.queue.oven, ['bread', 'bread']);
  const g2 = make().game, s2 = new SaveManager(g2, st);
  assert.equal(s2.load().status, 'loaded');
  assert.deepEqual(g2.queueOf('oven'), ['bread', 'bread']);
  raw.queue = { oven: ['coffee', 'nope', 'bread', 'bread', 'bread', 'bread', 'bread'], nowhere: ['bread'] };
  st.setItem(saves.key, JSON.stringify(raw));
  const g3 = make().game; new SaveManager(g3, st).load();
  assert.deepEqual(g3.queueOf('oven'), Array(g3.queueMax).fill('bread'));
  assert.equal(g3.queueOf('nowhere').length, 0);
});

// ---- dish of the day -------------------------------------------------------------------------------------------------
test('the dish of the day is picked for today only, is ordered more often and pays a little more', () => {
  const { game, cafe, life, clock } = make({ r: 0.5 });
  assert.equal(life.dish(), null);
  assert.ok(life.setDish('coffee').ok);
  assert.equal(life.dish(), 'coffee');
  assert.equal(life.setDish('nope').ok, false);
  let n = 0, seed = 7;
  cafe.rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 200; i++) { const c = seatOne(cafe); if (cafe.orderOf(c).product === 'coffee') n++; cafe.leave(c, true); }
  assert.ok(n > 200 / 4, `coffee ordered ${n}/200 times`);
  cafe.rng = () => 0.99;
  const c = seatOne(cafe), o = cafe.orderOf(c); o.product = 'coffee'; delete o.extra; game.products.coffee = 5;
  const r = cafe.deliver(o.id);
  assert.ok(r.ok && r.bonus.dish);
  clock.now += 24 * 3600_000; assert.equal(life.dish(), null, 'a new day needs a new pick');
});

// ---- set menu --------------------------------------------------------------------------------------------------------
test('a set order needs both products, pays for both plus a bonus, and only from the right level', () => {
  const low = make({ r: 0.01, level: 1 });
  const c0 = seatOne(low.cafe); assert.equal(low.cafe.orderOf(c0).extra, undefined);
  const { game, cafe } = make({ r: 0.01, level: 10 });
  const c = seatOne(cafe), o = cafe.orderOf(c);
  assert.ok(o.extra && o.extra !== o.product, 'a set has two different products');
  for (const id of Object.keys(game.products)) game.products[id] = 0;
  game.products[o.product] = 1;
  assert.equal(cafe.orderReady(o), false);
  assert.equal(cafe.deliver(o.id).ok, false);
  assert.equal(game.products[o.product], 1, 'nothing is taken when the set cannot be served');
  game.products[o.extra] = 1;
  const gold = game.gold, r = cafe.deliver(o.id);
  assert.ok(r.ok && r.bonus.set);
  assert.equal(game.products[o.product], 0); assert.equal(game.products[o.extra], 0);
  const single = game.unitEconomics(o.product).customer + game.unitEconomics(o.extra).customer;
  assert.ok(game.gold - gold > single, 'pays both products and a bonus');
  assert.equal(game.stats.soldTotal, 2);
});

test('a set order survives a save; a broken extra product is dropped', () => {
  const { game, cafe } = make({ r: 0.01 });
  const c = seatOne(cafe), o = cafe.orderOf(c);
  const st = new FakeStorage(), saves = new SaveManager(game, st); saves.save();
  const g2 = make().game, s2 = new SaveManager(g2, st); s2.load();
  const o2 = g2.cafe.orders.find((x) => x.id === o.id);
  assert.equal(o2.extra, o.extra);
  const raw = JSON.parse(st.getItem(saves.key)); raw.cafe.orders[0].extra = 'nope'; st.setItem(saves.key, JSON.stringify(raw));
  const g3 = make().game; new SaveManager(g3, st).load();
  assert.equal(g3.cafe.orders[0].extra, undefined);
});

// ---- friendship & letters --------------------------------------------------------------------------------------------
test('friendship: hearts fill with visits, each pays once, raises that guest\'s sales and brings a letter', () => {
  const { game, cafe, album, life } = make();
  const look = cafe.looks[0];
  const serve = () => { const c = seatOne(cafe, look), o = cafe.orderOf(c); game.products[o.product] = 5; if (o.extra) game.products[o.extra] = 5; return cafe.deliver(o.id); };
  let hearts = 0; const heard = [];
  game.on('friend', (e) => heard.push(e.hearts));
  for (let i = 0; i < LIFE.friend.visits[1]; i++) serve();
  hearts = album.heartsOf(look);
  assert.equal(hearts, 2);
  assert.deepEqual(heard, [1, 2]);
  assert.ok(life.letters.some((l) => l.from === album.nameOf(look)));
  assert.equal(album.friendShare(look), 2 * LIFE.friend.tipPerHeart);
  assert.equal(album.toNextHeart(look), LIFE.friend.visits[2] - LIFE.friend.visits[1]);
  const v = validateAlbum(JSON.parse(JSON.stringify(album.exportState())), cafe.looks);
  assert.equal(v.seen[look].hearts, 2);
});

test('letters: a gift is paid once, the inbox keeps a limited number and never drops an unopened gift first', () => {
  const { game, life } = make();
  const g = life.addLetter('Nine', 'Merhaba', 100);
  assert.equal(life.unread(), 1);
  const gold = game.gold;
  assert.equal(life.open(g.id).gold, 100);
  assert.equal(life.open(g.id).gold, 0);
  assert.equal(game.gold - gold, 100);
  const gift = life.addLetter('Nine', 'Hediye', 50);
  for (let i = 0; i < LIFE.letters.max + 5; i++) life.addLetter('X', 'not');
  assert.equal(life.letters.length, LIFE.letters.max);
  assert.ok(life.letters.some((l) => l.id === gift.id), 'the unopened gift is kept');
});

test('random letters: at most a few a day', () => {
  const { life, cafe } = make({ r: 0.001 });
  let n = 0;
  for (let i = 0; i < 20; i++) if (life.maybeLetter(cafe.looks[1], 'bread')) n++;
  assert.equal(n, LIFE.letters.perDay);
});

// ---- the critic ------------------------------------------------------------------------------------------------------
test('the critic comes at most once a day, only from its level, and pays when served', () => {
  const low = make({ r: 0.001, level: 1 });
  assert.ok(!low.cafe.arrive().critic);
  const { game, cafe, life, clock } = make({ r: 0.001 });
  const c = seatOne(cafe); assert.ok(c.critic);
  assert.ok(!cafe.arrive().critic, 'one a day');
  const o = cafe.orderOf(c); game.products[o.product] = 3; if (o.extra) game.products[o.extra] = 3;
  const gems = game.player.gems, r = cafe.deliver(o.id);
  assert.ok(r.critic && r.critic.gold > 0);
  assert.equal(game.player.gems - gems, LIFE.critic.gems);
  assert.equal(life.critics, 1);
  assert.ok(life.letters[0].from === 'Gizemli Eleştirmen');
  clock.now += 24 * 3600_000;
  assert.ok(cafe.arrive().critic, 'the next day another can come');
});

// ---- special orders --------------------------------------------------------------------------------------------------
test('special order: appears from its level, is delivered from stock in one step, rests, and expiring costs nothing', () => {
  const low = make({ level: 1 }); assert.equal(low.life.special(), null);
  const { game, life, clock } = make({ r: 0.3 });
  const s = life.special();
  assert.ok(s && !s.resting && s.items.length >= 1 && s.reward > 0);
  assert.equal(life.deliverSpecial().ok, false);
  for (const i of s.items) game.products[i.id] = i.need + 1;
  const gold = game.gold, r = life.deliverSpecial();
  assert.ok(r.ok);
  assert.equal(game.gold - gold, s.reward);
  for (const i of s.items) assert.equal(game.products[i.id], 1);
  assert.ok(life.special().resting);
  clock.now += LIFE.orders.restMin * 60_000 + 1;
  const n = life.special(); assert.ok(!n.resting);
  const goldBefore = game.gold;
  clock.now += LIFE.orders.hours * 3600_000 + 1;
  assert.ok(life.special().resting, 'an expired order simply goes away');
  assert.equal(game.gold, goldBefore);
});

// ---- the Market deal -------------------------------------------------------------------------------------------------
test('the deal of the day makes one Market ingredient cheaper, and changes from day to day', () => {
  const { game, life, clock } = make();
  const d = life.deal();
  assert.ok(game.marketDef.items.includes(d));
  assert.ok(game.ingredientPrice(d) < game.ingredientsDef[d].price);
  const other = game.marketDef.items.find((i) => i !== d);
  assert.equal(game.ingredientPrice(other), game.ingredientsDef[other].price);
  game.ingredients[d] = 0;
  const gold = game.gold; game.buyIngredient(d, 10);
  assert.equal(gold - game.gold, game.ingredientPrice(d) * 10);
  clock.now += 24 * 3600_000; assert.notEqual(life.deal(), d);
});

// ---- achievements ----------------------------------------------------------------------------------------------------
test('achievements: finished ones are announced once and collected once', () => {
  const { game, ach } = make();
  const seen = [];
  game.on('achievementComplete', (e) => seen.push(e.achievement.id));
  game.emit('change', {});
  game.stats.soldTotal = 50; game.emit('change', {}); game.emit('change', {});
  assert.deepEqual(seen, ['sold50']);
  const gold = game.gold;
  assert.ok(ach.claim('sold50').ok);
  assert.equal(game.gold - gold, 150);
  assert.equal(ach.claim('sold50').ok, false);
  assert.equal(ach.claim('sold500').ok, false);
  assert.deepEqual(validateAchievements({ claimed: ['sold50', 'sold50', 'nope'] }, ach).claimed, ['sold50']);
});

// ---- reminders -------------------------------------------------------------------------------------------------------
test('reminders: the machine is done when its last job (line included) ends, and night reminders move to the morning', () => {
  const { game } = make();
  assert.equal(stationDoneIn(game, 'oven'), 0);
  const cap = game.capacity('oven'), d = game.duration('bread');
  for (let i = 0; i < cap + 1; i++) game.produceOrQueue('bread');
  assert.ok(Math.abs(stationDoneIn(game, 'oven') - d * 2) < 0.01);
  const night = new Date(2025, 2, 10, 23, 30).getTime(), early = new Date(2025, 2, 11, 4).getTime();
  assert.equal(new Date(quietHours(night)).getHours(), 9);
  assert.equal(new Date(quietHours(night)).getDate(), 11);
  assert.equal(new Date(quietHours(early)).getHours(), 9);
  assert.equal(quietHours(at(2025, 3, 10, 15)), at(2025, 3, 10, 15));
  for (let i = 0; i < 4; i++) game.produceOrQueue('cake');                  // long enough to be worth a reminder
  const plan = planNotifications(game, at(2025, 3, 10, 12));
  assert.ok(plan.some((p) => p.id === 'station-oven'));
  assert.ok(plan.some((p) => p.id === 'till'));
  assert.ok(plan.every((p) => p.seconds >= 60));
});

// ---- persistence -----------------------------------------------------------------------------------------------------
test('café life is saved and loaded; damaged data falls back without breaking the save; old saves load with defaults', () => {
  const { game, life, ach } = make({ r: 0.3 });
  life.setDish('bread'); life.addLetter('Nine', 'Merhaba', 40); life.special(); life.critics = 2;
  game.stats.soldTotal = 50; ach.claim('sold50');
  const st = new FakeStorage(), saves = new SaveManager(game, st); saves.save();
  const w2 = make(), s2 = new SaveManager(w2.game, st);
  assert.equal(s2.load().status, 'loaded');
  assert.equal(w2.life.dish(), 'bread');
  assert.equal(w2.life.letters[0].gift, 40);
  assert.equal(w2.life.critics, 2);
  assert.deepEqual(w2.life.order?.items, life.order?.items);
  assert.ok(w2.ach.claimed.has('sold50'));
  const raw = JSON.parse(st.getItem(saves.key));
  raw.life = { menu: { date: 'x', product: 'nope' }, letters: [{ id: 'a' }, { id: 3, text: 5 }], order: { items: { nope: 3 } }, critics: -1 };
  raw.achievements = 'garbage';
  st.setItem(saves.key, JSON.stringify(raw));
  const w3 = make(); assert.equal(new SaveManager(w3.game, st).load().status, 'loaded');
  assert.equal(w3.life.dish(), null); assert.equal(w3.life.letters.length, 0); assert.equal(w3.life.order, null); assert.equal(w3.life.critics, 0);
  delete raw.life; delete raw.achievements; delete raw.queue;
  st.setItem(saves.key, JSON.stringify(raw));
  const w4 = make(); assert.equal(new SaveManager(w4.game, st).load().status, 'loaded');
  assert.equal(validateLife(null, w4.game), null);
});

test('a progress reset clears café life too', () => {
  const { game, life, ach } = make();
  life.addLetter('Nine', 'Merhaba'); life.setDish('bread'); game.stats.soldTotal = 60; ach.claim('sold50');
  for (let i = 0; i < game.capacity('oven') + 1; i++) game.produceOrQueue('bread');
  const st = new FakeStorage(), saves = new SaveManager(game, st); saves.save();
  assert.ok(saves.reset({ confirmed: true }).ok);
  assert.equal(life.letters.length, 0); assert.equal(life.dish(), null); assert.equal(ach.claimed.size, 0);
  assert.equal(game.queueOf('oven').length, 0);
});
