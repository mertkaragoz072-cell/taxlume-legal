import { CONFIG, WORLD } from '../core/config.js';
import { Assets } from '../core/assets.js';
import { View } from '../core/view.js';
import { TAU } from '../core/util.js';
import { state } from '../game/state.js';
import { onSurface, visible, outlined } from './draw.js';
import { drawBackground } from './parallax.js';

export function drawSky(ctx) { drawBackground(ctx); }

// Yüzey: devasa gezegenin üst yayı, ekranda yumuşak bir tepe. Gradyan yüzeyden aşağı koyulaşır (cel-shading).
// Zemin dokusu: ground_tile (dikişsiz çim) gezegenin yerel koordinatlarında döşenir; yüzeyle birlikte hareket eder.
let groundPattern = null;
function drawGroundTexture(ctx) {
  const tile = Assets.get('ground_tile'); if (!tile) return;
  const { cx, cy, R } = View, gt = CONFIG.planet.groundTexture, sc = View.scale;
  if (!groundPattern) groundPattern = ctx.createPattern(tile, 'repeat');
  groundPattern.setTransform(new DOMMatrix([gt.scale * sc, 0, 0, gt.scale * sc, 0, 0]));
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(View.heroAngle - state.player.a);   // gezegenle birlikte dön
  ctx.globalAlpha = gt.alpha;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fillStyle = groundPattern; ctx.fill();
  ctx.restore();
  // derinlik gölgesi: yüzeyden aşağı koyulaşır (doku üstüne)
  const top = cy - R, g = ctx.createLinearGradient(0, top, 0, top + 380 * sc);
  g.addColorStop(0, 'rgba(255,255,160,.10)'); g.addColorStop(0.25, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,50,20,.55)');
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = g; ctx.fill();
}

export function drawPlanet(ctx) {
  const { cx, cy, R } = View, c = CONFIG.planet.colors, sc = View.scale;
  const top = cy - R;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
  const g = ctx.createLinearGradient(0, top, 0, top + 380 * sc);
  g.addColorStop(0, c.grassLight); g.addColorStop(0.18, c.grass); g.addColorStop(1, c.grassDark);
  ctx.fillStyle = g; ctx.fill();
  drawGroundTexture(ctx);
  // üst kenarda koyu toprak/çim bandı + açık parlama
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
  ctx.beginPath(); ctx.arc(cx, cy, R - 9 * sc, 0, TAU);
  ctx.lineWidth = 14 * sc; ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R - 120 * sc, 0, TAU);
  ctx.lineWidth = 60 * sc; ctx.strokeStyle = 'rgba(30,90,40,.18)'; ctx.stroke();
  ctx.restore();
  // ince, yumuşak kontur: koyu yeşil (siyah değil), hafif dış gölge + iç parlak çim kenarı
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.lineWidth = 6 * sc; ctx.strokeStyle = 'rgba(28,78,40,.12)'; ctx.stroke();
  ctx.lineWidth = 1.6 * sc + 0.3; ctx.strokeStyle = 'rgba(28,78,40,.62)'; ctx.stroke();

  drawDecals(ctx);
  drawDecor(ctx, 'back');
}

// Toprak lekeleri: zeminde yassı decal'lar (yüzeyin altında, ayakların bastığı çim alanı)
let DECALS = null;
function drawDecals(ctx) {
  const cfg = CONFIG.planet.decals; if (!cfg || !Assets.get(cfg.keys[0])) return;
  if (!DECALS) {
    DECALS = []; let seed = 23;
    const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0, n = Math.round(TAU * CONFIG.planet.radius / cfg.every); i < n; i++) {
      DECALS.push({ key: cfg.keys[Math.floor(r() * cfg.keys.length)], a: r() * TAU - Math.PI, s: cfg.scale[0] + r() * (cfg.scale[1] - cfg.scale[0]), depth: cfg.depth[0] + r() * (cfg.depth[1] - cfg.depth[0]) });
    }
    DECALS.sort((p, q) => p.depth - q.depth);
  }
  ctx.globalAlpha = cfg.alpha ?? 1;
  for (const d of DECALS) {
    if (!visible(d.a)) continue;
    const img = Assets.get(d.key); if (!img) continue;
    const k = (cfg.width * d.s) / img.width;
    onSurface(ctx, d.a, -d.depth, 0, () => ctx.drawImage(img, -img.width * k / 2, -img.height * k * cfg.squash / 2, img.width * k, img.height * k * cfg.squash));
  }
  ctx.globalAlpha = 1;
}

// Karakterlerin ÖNÜNDE kalan ön plan dekoru (büyük kaya/çalı; yüzeyin biraz altında). renderer.js karakterlerden sonra çağırır.
export function drawForeground(ctx) { drawDecor(ctx, 'front'); }

const hasSprites = () => !!(WORLD.props && Assets.get('prop_pine_large'));

function drawDecor(ctx, layer) {
  if (hasSprites()) {
    for (const d of getSpriteDecor()) {
      if (d.layer !== layer || !visible(d.a)) continue;
      const img = Assets.get('prop_' + d.key); if (!img) continue;
      const p = WORLD.props[d.key], k = (p.height * d.s) / img.height;
      onSurface(ctx, d.a, -d.depth, 0, () => ctx.drawImage(img, -p.pivot[0] * k, -p.pivot[1] * k, img.width * k, img.height * k));
    }
    return;
  }
  if (layer !== 'back') return;
  for (const d of getDecor()) {                 // sprite yoksa Canvas placeholder
    if (!visible(d.a)) continue;
    onSurface(ctx, d.a, 0, 0, () => {
      if (d.kind === 'grass') drawGrass(ctx, d);
      else if (d.kind === 'rock') drawRock(ctx, d);
      else if (d.kind === 'fence') drawFence(ctx, d);
      else drawTree(ctx, d);
    });
  }
}

// Sprite dekor: data/world_props.json → decor kuralları, yüzey uzunluğuna göre deterministik saçılım
let SPRITE_DECOR = null;
function getSpriteDecor() {
  if (SPRITE_DECOR) return SPRITE_DECOR;
  const list = [], len = TAU * CONFIG.planet.radius; let seed = 11;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const g of WORLD.decor) {
    for (let i = 0, n = Math.round(len / g.every); i < n; i++) {
      list.push({ key: g.keys[Math.floor(r() * g.keys.length)], a: r() * TAU - Math.PI, s: g.scale[0] + r() * (g.scale[1] - g.scale[0]),
        depth: g.depth[0] + r() * (g.depth[1] - g.depth[0]), layer: g.layer });
    }
  }
  // arkadan öne: yüzeyde (depth 0) olanlar önce, yüzeyin altında kalanlar sonra
  SPRITE_DECOR = list.sort((a, b) => a.depth - b.depth);
  return SPRITE_DECOR;
}

// Dekor yoğunluğu yüzey uzunluğuna göre (data/config.json → planet.decor)
let DECOR = null;
function getDecor() {
  if (DECOR) return DECOR;
  const list = [], P = CONFIG.planet, len = TAU * P.radius, D = P.decor; let seed = 7;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const add = (kind, every, smin, smax) => {
    for (let i = 0, n = Math.round(len / every); i < n; i++) list.push({ kind, a: r() * TAU - Math.PI, s: smin + r() * (smax - smin) });
  };
  add('grass', D.grassEvery, 1.0, 1.7); add('rock', D.rockEvery, 1.6, 2.6);
  add('tree', D.treeEvery, 1.8, 2.6); add('fence', D.fenceEvery, 1.6, 1.9);
  // ağaçlar/çitler arkada kalsın: önce büyükler
  DECOR = list.sort((a, b) => (a.kind === 'tree' ? 0 : a.kind === 'fence' ? 1 : 2) - (b.kind === 'tree' ? 0 : b.kind === 'fence' ? 1 : 2));
  return DECOR;
}

function drawFence(ctx, d) {
  ctx.save(); ctx.scale(d.s, d.s);
  for (const x of [-16, 0, 16]) { ctx.beginPath(); ctx.roundRect(x - 4, -26, 8, 28, 2); ctx.fillStyle = '#b0743c'; ctx.fill(); outlined(ctx, 2.5); }
  for (const y of [-20, -9]) { ctx.beginPath(); ctx.roundRect(-22, y, 44, 6, 2); ctx.fillStyle = '#c98a4b'; ctx.fill(); outlined(ctx, 2.5); }
  ctx.restore();
}

function drawGrass(ctx, d) {
  ctx.save(); ctx.scale(d.s, d.s);
  ctx.beginPath(); ctx.moveTo(-6, 2); ctx.lineTo(-4, -9); ctx.lineTo(-1, 2); ctx.lineTo(1, -12); ctx.lineTo(4, 2); ctx.lineTo(7, -8); ctx.lineTo(8, 2);
  ctx.fillStyle = '#3fa646'; ctx.fill(); outlined(ctx, 2);
  ctx.restore();
}
function drawRock(ctx, d) {
  ctx.save(); ctx.scale(d.s, d.s);
  ctx.beginPath(); ctx.moveTo(-16, 4); ctx.lineTo(-12, -10); ctx.lineTo(-2, -16); ctx.lineTo(10, -11); ctx.lineTo(16, 4); ctx.closePath();
  ctx.fillStyle = '#a7aebf'; ctx.fill(); outlined(ctx, 3);
  ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(-2, -16); ctx.lineTo(-4, -4); ctx.lineTo(-13, 0); ctx.closePath();
  ctx.fillStyle = '#d3d8e6'; ctx.fill();
  ctx.restore();
}
function drawTree(ctx, d) {
  ctx.save(); ctx.scale(d.s, d.s);
  ctx.beginPath(); ctx.rect(-5, -30, 10, 34);
  ctx.fillStyle = '#9a6535'; ctx.fill(); outlined(ctx, 3);
  const blobs = [[0, -52, 24], [-16, -38, 17], [16, -38, 17]];
  for (const [x, y, rad] of blobs) {
    ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fillStyle = '#34b84a'; ctx.fill(); outlined(ctx, 3);
  }
  ctx.beginPath(); ctx.arc(-6, -58, 11, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fill();
  ctx.restore();
}
