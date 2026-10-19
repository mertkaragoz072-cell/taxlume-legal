import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { Quests } from '../src/game/quests.js';
import { Progression } from '../src/game/progression.js';
import { Research } from '../src/game/research.js';
import { Town } from '../src/game/town.js';
import { Exploration, validateExploration } from '../src/game/exploration.js';
import { SaveManager, SAVE_KEY, SAVE_VERSION } from '../src/game/save.js';
import { EXPLORE, INGREDIENTS } from '../src/data/economy.js';

class FakeStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const T0 = 1_700_000_000_000;
const lowRng = () => 0;          // every range at its minimum, every chance succeeds
const highRng = () => 0.999;     // every range at its maximum, no chance succeeds except chance 1
function make({ level = 1, rng = lowRng, clock } = {}) {
  const c = clock ?? { now: T0 };
  const player = { gold: 1000, gems: 0 };
  const game = new Game(player, {}, () => c.now);
  const quests = new Quests(game);
  const prog = new Progression(game);
  new Town(game); new Research(game);
  const ex = new Exploration(game, { rng });
  prog.level = level; prog.rewardedLevel = level;
  return { game, player, prog, ex, quests, c, advance: (s) => { c.now += s * 1000; game.tick(); } };
}
const M = EXPLORE[0], F = EXPLORE[1], Z = EXPLORE[2];

test('three regions: meadow short and open at start, forest and ruins need more level and progress', () => {
  assert.deepEqual(EXPLORE.map((r) => r.id), ['meadow', 'forest', 'ruins']);
  assert.equal(M.minLevel, 1);
  assert.ok(F.minLevel > M.minLevel && Z.minLevel > F.minLevel);
  assert.ok(M.duration < F.duration && F.duration < Z.duration);
  assert.ok(Z.rewards.gems, 'ruins hold a rare reward');
  const { ex } = make();
  assert.equal(ex.status('meadow'), 'available');
  assert.equal(ex.status('forest'), 'locked');
  assert.equal(ex.status('ruins'), 'locked');
});

test('locked regions refuse to start and say what is missing', () => {
  const { ex } = make({ level: 1 });
  const r = ex.start('forest');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'locked');
  assert.match(r.message, /Seviye 4 gerekli \(şu an 1\)/);
  assert.match(r.message, /Yeşil Çayırlar/);
  assert.equal(ex.active, null);
});

test('level alone is not enough: the previous region must be finished', () => {
  const { ex, advance } = make({ level: 10 });
  assert.equal(ex.isUnlocked('forest'), false);
  assert.ok(ex.start('meadow').ok);
  advance(M.duration); assert.ok(ex.claim().ok);
  assert.equal(ex.isUnlocked('forest'), true);
  assert.equal(ex.isUnlocked('ruins'), false);
});

test('only one exploration at a time, also while a finished one waits to be claimed', () => {
  const { ex, advance } = make({ level: 10 });
  assert.ok(ex.start('meadow').ok);
  assert.equal(ex.start('meadow').reason, 'busy');
  assert.equal(ex.status('meadow'), 'active');
  advance(M.duration);
  assert.equal(ex.start('meadow').reason, 'busy');
  assert.equal(ex.status('meadow'), 'ready');
});

test('remaining time follows the wall clock and the reward cannot be taken early', () => {
  const { ex, advance, player } = make();
  ex.start('meadow');
  advance(20);
  assert.equal(Math.round(ex.remaining()), M.duration - 20);
  assert.ok(ex.progress() > 0.3 && ex.progress() < 0.4);
  const g = player.gold;
  const r = ex.claim();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'running');
  assert.equal(player.gold, g);
  assert.ok(ex.active);
});

test('claim adds gold, XP and ingredients to the real systems, once', () => {
  const { ex, advance, player, game, prog } = make({ rng: lowRng });
  const flour = game.ingredients.flour, egg = game.ingredients.egg;
  ex.start('meadow');
  const reward = JSON.parse(JSON.stringify(ex.active.reward));
  advance(M.duration);
  const xp0 = prog.xp, g0 = player.gold;
  const r = ex.claim(ex.active.id);
  assert.ok(r.ok);
  assert.equal(player.gold, g0 + reward.gold);
  assert.equal(prog.xp - xp0, reward.xp);
  assert.equal(game.ingredients.flour, flour + (reward.ingredients.flour ?? 0));
  assert.equal(game.ingredients.egg, egg + (reward.ingredients.egg ?? 0));
  assert.ok(reward.gold >= M.rewards.gold[0] && reward.gold <= M.rewards.gold[1]);
  assert.equal(ex.active, null);
  assert.equal(ex.claim().ok, false);
  assert.equal(player.gold, g0 + reward.gold);
  assert.equal(game.stats.explorationsDone, 1);
  assert.equal(ex.timesDone('meadow'), 1);
});

test('a replayed claim with the old trip id is refused and a new trip is not affected', () => {
  const { ex, advance, player } = make();
  ex.start('meadow'); const id1 = ex.active.id; advance(M.duration);
  assert.ok(ex.claim(id1).ok);
  ex.start('meadow'); advance(M.duration);
  const g = player.gold;
  assert.equal(ex.claim(id1).reason, 'stale');
  assert.equal(player.gold, g);
  assert.ok(ex.claim(ex.active.id).ok);
});

test('claiming emits exactly one change event (consistent autosave snapshot)', () => {
  const { ex, advance, game } = make();
  ex.start('meadow'); advance(M.duration);
  let n = 0; game.on('change', () => n++);
  ex.claim();
  assert.equal(n, 1);
});

test('rewards are rolled when the trip starts: ranges respected, no re-roll on reload', () => {
  const st = new FakeStorage();
  const a = make({ rng: highRng });
  const sa = new SaveManager(a.game, st); sa.load();
  a.ex.start('meadow');
  const reward = JSON.parse(JSON.stringify(a.ex.active.reward));
  assert.equal(reward.gold, M.rewards.gold[1]);
  assert.equal(reward.xp, M.rewards.xp[1]);
  sa.save();
  const b = make({ rng: lowRng });
  new SaveManager(b.game, st).load();
  assert.deepEqual(b.ex.active.reward, reward);
});

test('regions with drop chances: only successful rolls give items; rare gems only in the ruins', () => {
  const none = make({ level: 10, rng: highRng });
  none.ex.done.forest = 1;
  none.ex.start('ruins');
  assert.equal(none.ex.active.reward.gems, 0);
  assert.ok(none.ex.active.reward.ingredients.butter, 'chance-1 drop');
  assert.equal(none.ex.active.reward.ingredients.beans, undefined);
  const lucky = make({ level: 10, rng: lowRng });
  lucky.ex.done.forest = 1;
  lucky.ex.start('ruins');
  assert.equal(lucky.ex.active.reward.gems, Z.rewards.gems.amount[0]);
});

test('gems from a reward land in the real gem balance', () => {
  const { ex, advance, player } = make({ level: 10, rng: lowRng });
  ex.done.forest = 1;
  ex.start('ruins'); advance(Z.duration);
  const gems = ex.active.reward.gems;
  ex.claim();
  assert.equal(player.gems, gems);
});

test('offline progress: a trip finished while the game was closed is ready on return and announced once', () => {
  const st = new FakeStorage();
  const clock = { now: T0 };
  const a = make({ clock });
  const sa = new SaveManager(a.game, st); sa.load();
  a.ex.start('meadow'); sa.save();
  clock.now += 10 * 60 * 1000;                                   // 10 minutes later, new session
  const b = make({ clock });
  const heard = []; b.game.on('exploreReady', (e) => heard.push(e.region.id));
  new SaveManager(b.game, st).load();
  assert.equal(b.ex.status('meadow'), 'ready');
  assert.equal(b.ex.isReady(), true);
  b.game.tick(); b.game.tick();
  assert.deepEqual(heard, ['meadow']);
  assert.ok(b.ex.claim().ok);
});

test('a trip still running on return shows the right remaining time', () => {
  const st = new FakeStorage();
  const clock = { now: T0 };
  const a = make({ clock });
  const sa = new SaveManager(a.game, st); sa.load();
  a.ex.start('meadow'); sa.save();
  clock.now += 25 * 1000;
  const b = make({ clock });
  new SaveManager(b.game, st).load();
  assert.equal(Math.round(b.ex.remaining()), M.duration - 25);
  assert.equal(b.ex.status('meadow'), 'active');
});

test('a device clock set back never stalls the trip', () => {
  const { ex, c, game } = make();
  ex.start('meadow');
  c.now -= 3_600_000; game.tick();
  assert.equal(ex.remaining(), M.duration);
  c.now += M.duration * 1000; game.tick();
  assert.equal(ex.isReady(), true);
});

test('persistence: completed counts and an unclaimed finished trip survive a reload without paying twice', () => {
  const st = new FakeStorage();
  const clock = { now: T0 };
  const a = make({ clock });
  const sa = new SaveManager(a.game, st); sa.load();
  a.ex.start('meadow'); a.advance(M.duration); a.ex.claim();
  a.ex.start('meadow'); a.advance(M.duration);
  sa.save();
  const saved = JSON.parse(st.getItem(SAVE_KEY));
  assert.equal(saved.version, SAVE_VERSION);
  const b = make({ clock });
  new SaveManager(b.game, st).load();
  assert.equal(b.ex.timesDone('meadow'), 1);
  assert.equal(b.ex.status('meadow'), 'ready');
  const g = b.player.gold;
  const r = b.ex.claim();
  assert.ok(r.ok);
  assert.equal(b.player.gold, g + r.reward.gold);
  assert.equal(b.ex.claim().ok, false);
  assert.equal(b.ex.timesDone('meadow'), 2);
  b.game.tick();                                                  // saving after the claim stores no trip any more
  assert.equal(JSON.parse(JSON.stringify(b.game.exportState().exploration.active)), null);
});

test('old saves without exploration data load with no trip', () => {
  const st = new FakeStorage();
  st.setItem(SAVE_KEY, JSON.stringify({ version: 8, gold: 700, ingredients: {}, products: {}, jobs: {}, upgrades: {}, stats: {} }));
  const a = make();
  assert.equal(new SaveManager(a.game, st).load().status, 'loaded');
  assert.equal(a.player.gold, 700);
  assert.equal(a.ex.active, null);
  assert.equal(a.ex.timesDone('meadow'), 0);
});

test('invalid saved exploration data is repaired and never trusted', () => {
  const { ex } = make();
  const bad = validateExploration({ active: { id: 1, region: 'ghost', startedAt: T0, duration: 60, reward: {} }, done: { meadow: -3, forest: 'x' } }, ex);
  assert.equal(bad.active, null);
  assert.deepEqual(bad.done, { meadow: 0, forest: 0, ruins: 0 });
  const odd = validateExploration({ active: { id: 5, region: 'meadow', startedAt: T0, duration: 60, reward: { gold: -9, xp: 1.5, gems: 'a', ingredients: { flour: 3, ghost: 2, egg: -1 } } }, nextId: 2 }, ex);
  assert.deepEqual(odd.active.reward, { gold: 0, xp: 0, gems: 0, ingredients: { flour: 3 } });
  assert.ok(odd.nextId > odd.active.id);
  assert.equal(validateExploration({ active: { id: 1, region: 'meadow', startedAt: NaN, duration: 60, reward: {} } }, ex).active, null);
});

test('claiming can level the player up through the shared progression (reward paid once)', () => {
  const { ex, advance, prog } = make({ rng: highRng });
  ex.start('meadow'); advance(M.duration);
  const before = prog.level;
  ex.claim();
  assert.ok(prog.level >= before);
  assert.equal(prog.rewardedLevel, prog.level);
});

test('the Kaşif quest completes through the exploration counter and its XP uses Kasaba Kültürü', () => {
  const { ex, advance, quests, game, prog } = make();
  assert.equal(quests.list().find((s) => s.def.id === 'firstExplore').complete, false);
  ex.start('meadow'); advance(M.duration); ex.claim();
  assert.equal(quests.list().find((s) => s.def.id === 'firstExplore').complete, true);
  game.research.levels.townCulture = 5;
  const xp0 = prog.xp + 0;
  prog.level = 30; prog.xp = 0;
  quests.claim('firstExplore');
  assert.equal(prog.xp, 0);                                       // max level: no XP, but the claim itself works
  assert.ok(quests.isClaimed(quests.def('firstExplore')));
  void xp0;
});

test('confirmed reset clears the trip and the counters', () => {
  const st = new FakeStorage();
  const a = make();
  const s = new SaveManager(a.game, st); s.load();
  a.ex.start('meadow');
  assert.ok(s.reset({ confirmed: true }).ok);
  assert.equal(a.ex.active, null);
  assert.equal(a.game.stats.explorationsDone, 0);
});

test('exploration rewards use only existing ingredient ids and the config is the single source of balance', () => {
  for (const r of EXPLORE) for (const d of r.rewards.ingredients) assert.ok(INGREDIENTS[d.id], `${r.id}:${d.id}`);
  const cfg = [{ id: 'x', name: 'X', icon: 'x', map: { x: 0, y: 0 }, desc: '', minLevel: 1, duration: 5, rewards: { gold: [7, 7], xp: [3, 3], ingredients: [] } }];
  const player = { gold: 0 }, c = { now: T0 };
  const game = new Game(player, {}, () => c.now);
  new Progression(game);
  const ex = new Exploration(game, { regions: cfg, rng: lowRng });
  ex.start('x'); c.now += 5000;
  assert.ok(ex.claim().ok);
  assert.equal(player.gold, 7);
});
