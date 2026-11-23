// Café life, part two: petting, the end-of-day summary, the memory book, the weekend market, guest stories, the weekly theme,
// collecting everything at once and a new branch (what resets, what stays, and that the stages do not jump).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { Shop } from '../src/game/shop.js';
import { Cafe } from '../src/game/customers.js';
import { Album } from '../src/game/album.js';
import { Life } from '../src/game/life.js';
import { Achievements } from '../src/game/achievements.js';
import { Branch, validateBranch } from '../src/game/branch.js';
import { Progression } from '../src/game/progression.js';
import { Quests } from '../src/game/quests.js';
import { DailyGoals } from '../src/game/goals.js';
import { SaveManager } from '../src/game/save.js';
import { CAFE, LIFE } from '../src/data/economy.js';

class FakeStorage { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();
function make({ level = 10, start = at(2025, 3, 10) } = {}) {          // 10 March 2025 is a Monday
  const clock = { now: start }, player = { gold: 100000, gems: 0 };
  const game = new Game(player, {}, () => clock.now);
  const prog = new Progression(game);
  const shop = new Shop(game); const quests = new Quests(game); const goals = new DailyGoals(game);
  const cafe = new Cafe(game, { rng: () => 0.99, config: { ...CAFE, firstSpawnSec: 999, spawnEverySec: [999, 999], eatSec: 0, cleanSec: 0, orderPatienceSec: 500, tables: 4, queueMax: 4 } });
  const album = new Album(game, cafe.looks), life = new Life(game, LIFE, () => 0.99), ach = new Achievements(game), branch = new Branch(game);
  prog.level = level; prog.rewardedLevel = level;
  cafe.setActive(true); game.tick();
  return { clock, player, game, prog, shop, quests, goals, cafe, album, life, ach, branch };
}
const serveLook = (w, look, product) => { const c = w.cafe.arrive(); c.look = look; w.cafe.seatQueued(); const o = w.cafe.orderOf(c); if (product) o.product = product; delete o.extra; w.game.products[o.product] = Math.max(1, w.game.products[o.product]); return w.cafe.deliver(o.id); };

test('petting: the first few pets of a day pay a little, the rest are for fun; a new day pays again', () => {
  const { game, life, clock } = make();
  const gold = game.gold;
  for (let i = 0; i < LIFE.pet.paid + 3; i++) life.pet();
  assert.equal(game.gold - gold, LIFE.pet.paid * LIFE.pet.gold);
  assert.equal(life.petsTotal, LIFE.pet.paid + 3);
  clock.now += 24 * 3600_000;
  assert.equal(life.pet().gold, LIFE.pet.gold);
  assert.ok(life.memories.some((m) => /kediyi sevdin/.test(m.text)));
});

test('end of the day: the first change of a new day turns yesterday into a summary, shown once', () => {
  const w = make();
  w.life.rollDay();
  for (let i = 0; i < 3; i++) serveLook(w, w.cafe.looks[0], 'bread');
  serveLook(w, w.cafe.looks[1], 'coffee');
  w.clock.now += 24 * 3600_000;
  w.game.emit('change', {});
  const s = w.life.takeSummary();
  assert.ok(s);
  assert.equal(s.sold, 4); assert.equal(s.best, 'bread'); assert.ok(s.earned > 0);
  assert.equal(w.life.takeSummary(), null, 'only once');
  w.clock.now += 24 * 3600_000; w.game.emit('change', {});
  assert.equal(w.life.takeSummary(), null, 'a day without play has no summary');
});

test('memory book: the first sale and other moments are written down, newest first, limited', () => {
  const w = make();
  serveLook(w, w.cafe.looks[0], 'bread');
  assert.ok(w.life.memories.some((m) => /İlk satış/.test(m.text)));
  for (let i = 0; i < 80; i++) w.life.remember('•', `anı ${i}`);
  assert.equal(w.life.memories.length, 60);
  assert.equal(w.life.memories[0].text, 'anı 79');
});

test('weekend market: open on Saturday and Sunday only, sells at the guest price, a daily limit', () => {
  const w = make();
  w.game.products.bread = 50;
  assert.equal(w.life.weekendOpen(), false);
  assert.equal(w.life.sellWeekend('bread').ok, false);
  w.clock.now = at(2025, 3, 15);                     // Saturday
  assert.ok(w.life.weekendOpen());
  const gold = w.game.gold, r = w.life.sellWeekend('bread', 5);
  assert.ok(r.ok && r.n === 5);
  assert.equal(w.game.gold - gold, w.game.unitEconomics('bread').customer * 5);
  assert.equal(w.life.sellWeekend('bread', 100).n, LIFE.weekend.perDay - 5, 'capped by the daily limit');
  assert.equal(w.life.sellWeekend('bread').ok, false);
  w.clock.now = at(2025, 3, 16); assert.ok(w.life.sellWeekend('bread').ok, 'Sunday starts a new limit');
  w.game.products.cake = 0; assert.equal(w.life.sellWeekend('cake').ok, false);
});

test('guest stories: three steps in order, each pays once, the last one brings a letter', () => {
  const w = make(), look = w.cafe.looks[2];
  assert.equal(w.life.claimStory(look).ok, false);
  for (let i = 0; i < LIFE.stories.visits; i++) serveLook(w, look, 'bread');
  const gold = w.game.gold;
  assert.ok(w.life.claimStory(look).ok);
  assert.equal(w.game.gold - gold, LIFE.stories.gold[0]);
  assert.equal(w.life.claimStory(look).ok, false, 'step 2 needs the favourite');
  serveLook(w, look, w.cafe.favoriteOf(look));
  assert.ok(w.life.claimStory(look).ok);
  while (w.album.heartsOf(look) < LIFE.stories.hearts) serveLook(w, look, 'bread');
  assert.equal(w.life.storiesReady(), 1);
  const r = w.life.claimStory(look);
  assert.ok(r.ok && r.finished);
  assert.ok(w.life.story(look).finished);
  assert.ok(w.life.letters.some((l) => /evim/.test(l.text)));
  assert.equal(w.life.claimStory(look).ok, false);
});

test('weekly theme: sell the star product this week, once; next week is a new theme', () => {
  const w = make();
  const t = w.life.weekTheme();
  assert.ok(t && t.target > 0 && !t.complete);
  for (let i = 0; i < t.target; i++) serveLook(w, w.cafe.looks[i % 8], t.product);
  assert.ok(w.life.weekTheme().complete);
  assert.ok(w.life.claimTheme().ok);
  assert.equal(w.life.claimTheme().ok, false);
  w.clock.now += 7 * 24 * 3600_000;
  const n = w.life.weekTheme();
  assert.equal(n.claimed, false); assert.equal(n.progress, 0);
});

test('a new branch: locked until the last stage and top level; then the economy restarts and the loved things stay', () => {
  const w = make({ level: 30 });
  assert.ok(w.branch.missing().length > 0);
  const st = new FakeStorage(), saves = new SaveManager(w.game, st); saves.save();
  assert.equal(saves.openBranch({ confirmed: true }).ok, false);
  // reach the last stage the honest way would take long: set it, buy and level some decoration, make friends
  w.game.player.gold = 5e6;
  for (let pass = 0; pass < 5; pass++) for (const d of w.shop.items) if (d.category !== 'ingredients') w.shop.buy(d.id);
  const decor = w.shop.items.find((d) => d.kind === 'decor' && w.shop.owned.has(d.id));
  w.shop.upgradeItem(decor.id);
  const decorLevel = w.shop.itemLevel(decor.id);
  w.shop.stageId = Math.max(...w.shop.stages.map((s) => s.id));
  for (let i = 0; i < 12; i++) serveLook(w, w.cafe.looks[0], 'bread');
  w.game.stats.soldTotal = 600; w.ach.claim('sold500'); w.ach.claim('sold50');
  w.game.setCafeName('Pati Kafe');
  const hearts = w.album.heartsOf(w.cafe.looks[0]), gems = w.game.player.gems, letters = w.life.letters.length;
  assert.deepEqual(w.branch.missing(), []);
  assert.equal(saves.openBranch().ok, false, 'needs a confirmation');
  const r = saves.openBranch({ confirmed: true });
  assert.ok(r.ok, r.message);
  assert.equal(w.branch.count, 1);
  assert.equal(w.game.gold, w.game.initial.gold);
  assert.equal(w.prog.level, 1);
  assert.equal(w.shop.stageId, 1, 'the new café starts at stage 1');
  w.game.tick(); w.shop.checkStage?.();
  assert.equal(w.shop.stageId, 1, 'and does not jump stages from the old statistics');
  assert.equal(w.game.stats.soldTotal, 0);
  assert.ok(w.shop.owned.has(decor.id), 'decoration stays');
  assert.equal(w.shop.itemLevel(decor.id), decorLevel, 'with its level');
  assert.ok(!w.shop.items.some((d) => d.kind === 'equipment' && d.tier > 1 && w.shop.owned.has(d.id)), 'better machines are bought again');
  assert.equal(w.album.heartsOf(w.cafe.looks[0]), hearts);
  assert.equal(w.game.player.gems, gems);
  assert.ok(w.life.letters.length >= letters);
  assert.ok(w.ach.claimed.has('sold500'), 'achievements stay');
  assert.equal(w.ach.list().find((a) => a.def.id === 'sold500').complete, true, 'achievements count every branch');
  assert.equal(w.game.profile.name, 'Pati Kafe');
  assert.ok(w.game.saleIncome(100) >= 110, 'every sale +10%');
  assert.ok(st.getItem('bakery-street:save.before-branch'), 'the old café is backed up');
  const w2 = make(); assert.equal(new SaveManager(w2.game, st).load().status, 'loaded');
  assert.equal(w2.branch.count, 1); assert.ok(w2.branch.carry.soldTotal >= 600);
  assert.deepEqual(validateBranch({ count: 99, carry: { soldTotal: -5, sold: { bread: 3, x: 'a' } } }), { count: LIFE.branch.max, carry: { sold: { bread: 3 } } });
});

test('kitchen counter: a product made by hand takes its ingredients, is ready at once for the order, and counts as made by hand', () => {
  const w = make();
  for (const k of Object.keys(w.game.ingredients)) w.game.ingredients[k] = 0;
  assert.equal(w.game.handMake('croissant').ok, false, 'no ingredients, nothing made');
  w.game.ingredients.flour = 2; w.game.ingredients.butter = 1;
  const c = w.cafe.arrive(); w.cafe.seatQueued(); const o = w.cafe.orderOf(c); o.product = 'croissant'; delete o.extra;
  w.game.products.croissant = 0;
  const jobs = JSON.stringify(w.game.jobs);
  const r = w.game.handMake('croissant');
  assert.ok(r.ok);
  assert.equal(w.game.ingredients.flour, 0); assert.equal(w.game.ingredients.butter, 0);
  assert.equal(w.game.products.croissant, 1);
  assert.equal(JSON.stringify(w.game.jobs), jobs, 'the machines are not touched');
  assert.equal(w.game.stats.handMade, 1); assert.equal(w.game.stats.producedTotal, 1);
  const s = w.cafe.deliver(o.id);
  assert.ok(s.ok);
  assert.equal(w.game.products.croissant, 0);
  assert.equal(w.game.handMake('nope').ok, false);
  w.game.products.bread = 999; w.game.ingredients.flour = 2;
  assert.ok(w.game.handMake('bread').ok, 'the showcase limit does not apply: it goes straight to a guest');
});

test('head chef: level 1 cooks what waiting guests ordered, level 2 keeps recent orders ready, level 3 buys ingredients but keeps a reserve; can be sent on a break', () => {
  const w = make({ level: 20 });
  const g = w.game;
  for (const k of Object.keys(g.ingredients)) g.ingredients[k] = 30;
  for (const k of Object.keys(g.products)) g.products[k] = 0;
  assert.equal(g.runChef(true), 0, 'no chef hired: nothing happens');
  g.player.gold = 1e6;
  assert.ok(g.buyUpgrade('headChef').ok);
  const c = w.cafe.arrive(); w.cafe.seatQueued(); const o = w.cafe.orderOf(c); o.product = 'croissant'; delete o.extra;
  assert.equal(g.runChef(true), 1);
  assert.ok(g.jobsOf('oven').some((j) => j.product === 'croissant'));
  assert.equal(g.runChef(true), 0, 'already under way: not made twice');
  g.setChef(false); w.cafe.arrive(); w.cafe.seatQueued();
  assert.equal(g.runChef(true), 0, 'on a break');
  g.setChef(true);
  // level 3: no flour, the chef buys it (and stops at the reserve)
  g.buyUpgrade('headChef'); g.buyUpgrade('headChef');
  assert.equal(g.chefLevel(), 3);
  g.jobs = {}; g.queue = {};
  g.ingredients.flour = 0; g.ingredients.butter = 0;
  g.runChef(true);
  assert.ok(g.jobsOf('oven').length > 0, 'it bought what it needed and started');
  g.jobs = {}; g.ingredients.flour = 0; g.ingredients.butter = 0; g.player.gold = 510;
  g.runChef(true);
  assert.ok(g.player.gold >= 500, 'never below the reserve');
  // saved: the break switch
  g.setChef(false);
  assert.equal(g.exportState().chefOn, false);
});

test('popularity: happy guests raise it (fast ones more), guests who give up lower it; titles bring guests more often; saved', () => {
  const w = make();
  const start = w.life.popularity, gap0 = w.life.arrivalFactor();
  const titles = [];
  w.game.on('popularity', (e) => titles.push(e.title.name));
  for (let i = 0; i < 20; i++) serveLook(w, w.cafe.looks[i % 8], 'bread');
  assert.ok(w.life.popularity >= start + 20, 'every happy guest adds');
  assert.ok(w.life.arrivalFactor() < gap0, 'a better title: guests come more often');
  assert.ok(titles.length >= 1);
  const p = w.life.popularity;
  const c = w.cafe.arrive(); w.cafe.leave(c, false);
  assert.equal(w.life.popularity, p - LIFE.popularity.sad);
  w.life.popularity = 99.5; for (let i = 0; i < 5; i++) serveLook(w, w.cafe.looks[0], 'bread');
  assert.equal(w.life.popularity, LIFE.popularity.max, 'capped');
  assert.equal(w.life.popTitle().next, null);
  const st = new FakeStorage(), saves = new SaveManager(w.game, st); saves.save();
  const w2 = make(); new SaveManager(w2.game, st).load();
  assert.equal(w2.life.popularity, LIFE.popularity.max);
});
