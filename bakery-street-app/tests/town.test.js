import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { Quests } from '../src/game/quests.js';
import { Progression } from '../src/game/progression.js';
import { Town, validateTown } from '../src/game/town.js';
import { SaveManager, SAVE_KEY, SAVE_VERSION } from '../src/game/save.js';
import { TOWN_UNLOCKS, TOWN_REWARDS } from '../src/data/economy.js';

class FakeStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
function make({ gold = 100_000, level = 1, cfg } = {}) {
  const player = { gold, gems: 0 };
  const game = new Game(player, {}, () => 1_700_000_000_000);
  const quests = new Quests(game);
  const prog = new Progression(game);
  const town = new Town(game, cfg);
  prog.level = level;
  return { game, player, prog, town, quests };
}
const U = TOWN_UNLOCKS.bookshop;

test('starter buildings are open, the Bookshop is locked at level 1, the plot is coming soon', () => {
  const { town } = make();
  assert.equal(town.status('bakery'), 'open');
  assert.equal(town.status('market'), 'open');
  assert.equal(town.status('bookshop'), 'locked');
  assert.equal(town.status('plot'), 'locked');
  assert.equal(town.open('plot').reason, 'soon');
});

test('available once the level is reached, even with too little gold', () => {
  const { town } = make({ gold: 10, level: U.minLevel });
  assert.equal(town.status('bookshop'), 'available');
});

test('too low a level blocks opening and names the requirement; nothing is spent', () => {
  const { town, player } = make({ level: 1 });
  const gold = player.gold;
  const r = town.open('bookshop');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'level');
  assert.match(r.message, /Seviye 3 gerekli \(şu an 1\)/);
  assert.equal(player.gold, gold);
  assert.equal(town.isOpen('bookshop'), false);
});

test('too little gold blocks opening and shows the missing amount', () => {
  const { town, player } = make({ gold: U.gold - 100, level: U.minLevel });
  const r = town.open('bookshop');
  assert.equal(r.reason, 'gold');
  assert.match(r.message, /100 altın eksik/);
  assert.equal(player.gold, U.gold - 100);
});

test('a successful opening spends gold once, gives XP, counts the stat and never repeats', () => {
  const { town, player, game, prog } = make({ gold: U.gold + 700, level: U.minLevel });
  const xp0 = prog.xp;
  const r = town.open('bookshop');
  assert.ok(r.ok);
  assert.equal(player.gold, 700);
  assert.equal(town.status('bookshop'), 'open');
  assert.equal(game.stats.buildingsOpened, 1);
  assert.equal(prog.xp - xp0, TOWN_REWARDS.bookshop.open.xp);
  const again = town.open('bookshop');
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'owned');
  assert.equal(player.gold, 700);
  assert.equal(game.stats.buildingsOpened, 1);
});

test('opening emits one change event (consistent autosave snapshot)', () => {
  const { town, game } = make({ level: U.minLevel });
  let n = 0; game.on('change', () => n++);
  town.open('bookshop');
  assert.equal(n, 1);
});

test('development: needs the building open, rising costs, level gate, stale tap refused, ends at max', () => {
  const { town, player } = make({ gold: 100_000, level: U.minLevel });
  assert.equal(town.develop('bookshop').reason, 'closed');
  town.open('bookshop');
  const r1 = town.develop('bookshop', 0);
  assert.equal(r1.ok, false);
  assert.equal(r1.reason, 'level');                    // level 5 needed
  town.game.progression.level = 5;
  const g = player.gold;
  assert.ok(town.develop('bookshop', 0).ok);
  assert.equal(player.gold, g - U.levels[0].gold);
  assert.equal(town.develop('bookshop', 0).reason, 'stale');   // replayed tap
  assert.equal(player.gold, g - U.levels[0].gold);
  town.game.progression.level = 8;
  assert.ok(town.develop('bookshop', 1).ok);
  assert.equal(town.level('bookshop'), 2);
  assert.equal(town.develop('bookshop', 2).reason, 'max');
  assert.ok(U.levels[1].gold > U.levels[0].gold);
});

test('opening gives no gold or products: the Bookshop makes no fake income', () => {
  const { town, player, game } = make({ gold: U.gold, level: U.minLevel });
  const ing = JSON.stringify(game.ingredients);
  town.open('bookshop');
  assert.equal(player.gold, 0);
  assert.equal(JSON.stringify(game.ingredients), ing);
  game.tick();
  assert.equal(player.gold, 0);
});

test('the quest "Kasaba büyüyor" completes through the opened-building counter', () => {
  const { town, quests } = make({ level: U.minLevel });
  assert.equal(quests.list().find((s) => s.def.id === 'openBookshop').complete, false);
  town.open('bookshop');
  assert.equal(quests.list().find((s) => s.def.id === 'openBookshop').complete, true);
});

test('opening can level the player up and pays that level reward once', () => {
  const { town, prog } = make({ level: U.minLevel, cfg: { rewards: { bookshop: { open: { xp: 10_000 }, levels: [] } } } });
  prog.xp = 0;
  town.open('bookshop');
  assert.ok(prog.level > U.minLevel);
  assert.equal(prog.rewardedLevel, prog.level);
});

test('persistence: opened buildings and development survive a reload; starters need no saving', () => {
  const st = new FakeStorage();
  const a = make({ level: 8 });
  const sa = new SaveManager(a.game, st); sa.load();
  a.town.open('bookshop'); a.town.develop('bookshop', 0);
  sa.save();
  const saved = JSON.parse(st.getItem(SAVE_KEY));
  assert.equal(saved.version, SAVE_VERSION);
  assert.deepEqual(saved.town, { opened: ['bookshop'], levels: { bookshop: 1 } });
  const b = make({ level: 1 });
  new SaveManager(b.game, st).load();
  assert.equal(b.town.isOpen('bookshop'), true);
  assert.equal(b.town.level('bookshop'), 1);
  assert.equal(b.game.stats.buildingsOpened, 1);
  assert.equal(b.town.open('bookshop').ok, false);       // still cannot be bought twice
});

test('old saves without town data open with only the starter buildings', () => {
  const st = new FakeStorage();
  st.setItem(SAVE_KEY, JSON.stringify({ version: 6, gold: 1234, ingredients: {}, products: {}, jobs: {}, upgrades: {}, stats: {}, progression: { level: 4, xp: 3, rewardedLevel: 4 } }));
  const a = make();
  assert.equal(new SaveManager(a.game, st).load().status, 'loaded');
  assert.equal(a.player.gold, 1234);
  assert.equal(a.town.isOpen('bookshop'), false);
  assert.equal(a.town.isOpen('bakery') && a.town.isOpen('market'), true);
});

test('invalid saved town data is repaired, never trusted', () => {
  const { town } = make();
  const v = validateTown({ opened: ['bookshop', 'bakery', 'ghost', 'plot'], levels: { bookshop: 99, ghost: 2 } }, town);
  assert.deepEqual(v.opened, ['bookshop']);
  assert.deepEqual(v.levels, { bookshop: 2 });
  assert.deepEqual(validateTown(undefined, town), { opened: [], levels: {} });
  assert.deepEqual(validateTown({ opened: 'x', levels: { bookshop: -1 } }, town), { opened: [], levels: {} });
  assert.deepEqual(validateTown({ levels: { bookshop: 1.5 } }, town), { opened: [], levels: {} });
  assert.deepEqual(validateTown({ levels: { bookshop: 1 } }, town).opened, ['bookshop']);   // developed implies open
});

test('confirmed reset closes the Bookshop again', () => {
  const st = new FakeStorage();
  const a = make({ level: U.minLevel });
  const s = new SaveManager(a.game, st); s.load();
  a.town.open('bookshop');
  assert.ok(s.reset({ confirmed: true }).ok);
  assert.equal(a.town.isOpen('bookshop'), false);
  assert.equal(a.game.stats.buildingsOpened, 0);
});

test('conditions and rewards are separate, configurable tables', () => {
  const cfg = { unlocks: { bookshop: { gold: 10, minLevel: 1, levels: [] } }, rewards: {} };
  const { town, player } = make({ gold: 10, cfg });
  assert.ok(town.open('bookshop').ok);
  assert.equal(player.gold, 0);
});
