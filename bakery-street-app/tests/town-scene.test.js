import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { Progression } from '../src/game/progression.js';
import { Town } from '../src/game/town.js';
import { setCanvasFactory } from '../src/util.js';
import { TownScene, TOWN_SPOTS } from '../src/scene/town-scene.js';

const mockCtx = () => { const grad = { addColorStop() {} }; const t = { canvas: { width: 786, height: 1704 }, measureText: (s) => ({ width: String(s).length * 12 }), createLinearGradient: () => grad, createRadialGradient: () => grad }; return new Proxy(t, { get(o, k) { return k in o ? o[k] : () => {}; }, set(o, k, v) { o[k] = v; return true; } }); };

function make(level = 1, gold = 0) {
  setCanvasFactory(() => ({ width: 1, height: 1, getContext: () => mockCtx() }));
  const game = new Game({ gold }, {}, () => new Date(2025, 5, 10, 12).getTime());
  const prog = new Progression(game); prog.level = level; prog.rewardedLevel = level;
  const town = new Town(game);
  const scene = new TownScene({ town, game });
  scene.resize({ W: 393, H: 852, dpr: 2, scale: 393 / 800, vw: 800, vh: 852 * 800 / 393, ox: 0, oy: 0, portrait: true });
  return { game, town, scene };
}
const centre = (scene, id) => { const sp = TOWN_SPOTS.find((s) => s.id === id), f = scene.fit(); const [cx, cy] = sp.circle ? sp.circle : [(sp.box[0] + sp.box[2]) / 2, (sp.box[1] + sp.box[3]) / 2]; return { x: cx * f.s + f.ox, y: cy * f.s + f.oy }; };

test('town square: each building is found where it is drawn, the sky and plaza are not buildings', () => {
  const { scene } = make();
  for (const w of scene.walkers) { w.x = -999; w.y = -999; }        // the cats are tested on their own below (a cat in front of a building takes the tap)
  for (const id of ['market', 'bakery', 'bookshop', 'daily', 'quests', 'board', 'map', 'fountain', 'bench', 'paw', 'flowers']) { const p = centre(scene, id); assert.equal(scene.hitTest(p.x, p.y), id, id); }
  assert.equal(scene.hitTest(400, 100), null);
  { const f = scene.fit(); assert.equal(scene.hitTest(300 * f.s + f.ox, 1000 * f.s + f.oy), null, 'open plaza'); }
  const f = scene.fit();
  assert.ok(f.ox <= 0 && f.ox + 1024 * f.s >= scene.view.vw - 0.5, 'the picture covers the width');
  assert.ok(f.oy + 1267 * f.s >= scene.view.vh - 200, 'the picture reaches the bottom bar');
});

test('town square: a cat on the plaza can be petted: it stops and hearts float up', () => {
  const { scene } = make();
  const w = scene.walkers[1], f = scene.fit();
  w.x = 500; w.y = 1000; w.moving = true;
  const hit = scene.hitTest(500 * f.s + f.ox, 960 * f.s + f.oy);
  assert.equal(hit, 'cat:1');
  scene.tapBuilding(hit);
  assert.equal(w.moving, false);
  assert.ok(scene.hearts.list.length > 0);
  scene.update(3); assert.equal(scene.hearts.list.length, 0, 'the hearts fade away');
});

test('town square: a closed building shows what it needs, an open one shows nothing; the scene runs and draws', () => {
  const a = make(1, 0);
  assert.deepEqual(a.scene.plateFor('bookshop'), { text: 'Seviye 3', tone: 'locked' });
  assert.equal(a.scene.plateFor('bakery'), null);
  assert.equal(a.scene.plateFor('market'), null);
  const b = make(3, 0);
  assert.equal(b.scene.plateFor('bookshop').tone, 'locked');
  assert.match(b.scene.plateFor('bookshop').text, /altın/);
  const c = make(3, 1e6);
  assert.deepEqual(c.scene.plateFor('bookshop'), { text: 'Açılabilir', tone: 'ready' });
  assert.ok(c.town.open('bookshop').ok);
  assert.equal(c.scene.plateFor('bookshop'), null);
  for (let i = 0; i < 600; i++) { c.scene.update(1 / 30); if (i % 10 === 0) c.scene.render(mockCtx()); }
  for (const w of c.scene.walkers) assert.ok(w.x >= 200 && w.x <= 820 && w.y >= 650 && w.y <= 1080, 'cats stay on the plaza');
  c.scene.tapBuilding('paw'); for (let i = 0; i < 300; i++) c.scene.update(1 / 30);
  for (const w of c.scene.walkers) assert.ok(Math.hypot(w.x - 512, w.y - 787) < 140, 'tapping the paw circle gathers the cats');
  c.scene.tapBuilding('fountain'); assert.ok(c.scene.ripples.length && c.scene.notes.length);
});
