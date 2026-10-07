import { CONFIG, WORLD } from '../core/config.js';
import { Assets } from '../core/assets.js';
import { View } from '../core/view.js';
import { TAU, wrapAngle } from '../core/util.js';
import { state } from '../game/state.js';
import { onSurface, visible, outlined } from './draw.js';
import { drawBackground } from './parallax.js';
import { currentTheme, currentThemeId } from './theme.js';

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


// ---- Plaka zemin (gezegen başına 5 "seamless" plaka; tools/extract_planet_ground.py) ----
// Plakalar gezegenin çevresine (2πR) tohumlu rastgele sırayla dizilir; toplam genişlik çevreye tam oturacak şekilde ölçeklenir → iki yandan sonsuz, dikişsiz dönüş.
// Her plaka dar dilimlere bölünüp yüzeye teğet döndürülerek çizilir (kavisli yüzey, altta boşluk kalmaz). Ayaklar plakanın üst yüzüne basar (laneDepth).
const TILE_GROUND = {};
function getTileGround(id) {
  if (id in TILE_GROUND) return TILE_GROUND[id];
  const cfg = WORLD.groundTiles?.[id], all = cfg && cfg.tiles.map((k) => Assets.get('gt_' + k));
  if (!cfg || all.some((i) => !i)) return (TILE_GROUND[id] = null);
  const minH = Math.min(...all.map((i) => i.height)), imgs = all.filter((i) => i.height <= minH * 1.15);   // kalınlığı benzer plakalar (kalın olanlar alt kenarda basamak yapar)
  const ext = WORLD.groundTiles.extend;
  const rowAvg = (img, y0, n) => { const t = document.createElement('canvas'); t.width = img.width; t.height = img.height; const tg = t.getContext('2d'); tg.drawImage(img, 0, 0); const d = tg.getImageData(0, 0, img.width, img.height).data; return { d, cover: (y) => { let c = 0; for (let x = 0; x < img.width; x++) if (d[(y * img.width + x) * 4 + 3] > 128) c++; return c / img.width; } }; };
  const tops = imgs.map((img) => { const c = rowAvg(img).cover; let y = 0; while (y < img.height - 1 && c(y) < 0.8) y++; return y; });   // yüzey kenarı: kapsama ≥ %80 olan ilk satır (çim uçları üstte kalır)
  const pad = Math.max(...tops), maxH = Math.max(...imgs.map((im, i) => im.height - tops[i])) + pad, Hc = maxH + ext;
  const pieces = imgs.map((img, i) => {                    // plakalar üst kenardan hizalanır; alta doğru koyulaşan dolgu (pürüzlü alt kenarı örter)
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = Hc; const g = cv.getContext('2d');
    const { d } = rowAvg(img); let r = 0, gg = 0, b = 0, n = 0;
    for (let y = img.height - 5; y < img.height - 2; y++) for (let x = 0; x < img.width; x++) { const o = (y * img.width + x) * 4; if (d[o + 3] > 128) { r += d[o]; gg += d[o + 1]; b += d[o + 2]; n++; } }
    const col = n ? `rgb(${r / n | 0},${gg / n | 0},${b / n | 0})` : cfg.deep, yb = pad - tops[i] + img.height - 10;
    const bot = g.createLinearGradient(0, yb, 0, Hc); bot.addColorStop(0, col); bot.addColorStop(1, cfg.deep);
    g.fillStyle = bot; g.fillRect(0, yb, img.width, Hc - yb);
    g.drawImage(img, 0, pad - tops[i]); return cv;
  });
  tops.pad = pad;
  if (cfg.mirror) pieces.push(...pieces.map((cv) => { const m = document.createElement('canvas'); m.width = cv.width; m.height = cv.height; const g = m.getContext('2d'); g.translate(cv.width, 0); g.scale(-1, 1); g.drawImage(cv, 0, 0); return m; }));   // ayna kopyaları: [P,P'] ardışık dizilince birleşim yerleri simetrik → dikişsiz
  const len = TAU * CONFIG.planet.radius, list = []; let seed = 5 + id.length * 13, x = 0, last = -1;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  if (cfg.mirror) {                                   // dönüşümlü orijinal/ayna, çift sayıda plaka
    const n0 = pieces.length / 2, n = Math.max(2, Math.round(len / (pieces[0].width * cfg.scale) / 2) * 2);
    for (let i = 0; i < n; i++) { const k = (Math.floor(i / 2) % n0) + ((i % 2) ? n0 : 0), w = pieces[k].width * cfg.scale; list.push({ k, x, w }); x += w; }
  } else while (x < len) {
    let k; do { k = Math.floor(r() * pieces.length); } while (k === last && pieces.length > 1);
    const w = pieces[k].width * cfg.scale; list.push({ k, x, w }); x += w; last = k;
  }
  const f = len / x; for (const p of list) { p.x *= f; p.w *= f; }       // çevreye tam oturt
  return (TILE_GROUND[id] = { cfg, pieces, list, Hc, pad });
}

function drawTileGround(ctx, tg, deepColor) {
  const { cx, cy, R } = View, sc = View.scale, Rw = CONFIG.planet.radius, pa = state.player.a;
  ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, TAU); ctx.fillStyle = deepColor; ctx.fill();
  const sw = WORLD.groundTiles.sliceWidth, top = -(R + (tg.cfg.lift + tg.pad * tg.cfg.scale) * sc), hh = tg.Hc * tg.cfg.scale * sc;
  ctx.save(); ctx.translate(cx, cy);
  for (const p of tg.list) {
    const ac = (p.x + p.w / 2) / Rw - Math.PI;                    // plaka merkez açısı (-π..π)
    const hw = p.w / 2 / Rw, rel0 = wrapAngle(ac - pa);
    if (rel0 < -View.spanLeft - hw || rel0 > View.spanRight + hw) continue;
    const img = tg.pieces[p.k], n = Math.max(1, Math.round(p.w / sw)), dw = p.w / n, sx = img.width / n;
    for (let j = 0; j < n; j++) {
      const a = (p.x + dw * (j + 0.5)) / Rw - Math.PI, sa = a - pa + View.heroAngle;
      const rel = wrapAngle(a - pa);                                  // yalnız ekrandaki dilimler
      if (rel < -View.spanLeft - 0.02 || rel > View.spanRight + 0.02) continue;
      ctx.save(); ctx.rotate(sa);
      ctx.drawImage(img, sx * j, 0, sx, img.height, -dw * sc / 2 - 0.6, top, dw * sc + 1.2, hh);
      ctx.restore();
    }
  }
  ctx.restore();
}

export function drawPlanet(ctx) {
  const tg = getTileGround(currentThemeId());
  if (tg) {                                             // plaka zemin: eski gradyan/doku/leke/kontur çizilmez
    drawTileGround(ctx, tg, tg.cfg.deep); drawDecor(ctx, 'back'); return;
  }
  const { cx, cy, R } = View, th = currentTheme(), c = { ...CONFIG.planet.colors, ...(th?.ground?.colors || {}) }, sc = View.scale;
  const top = cy - R;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
  const g = ctx.createLinearGradient(0, top, 0, top + 380 * sc);
  g.addColorStop(0, c.grassLight); g.addColorStop(0.18, c.grass); g.addColorStop(1, c.grassDark);
  ctx.fillStyle = g; ctx.fill();
  drawGroundTexture(ctx);
  if (th?.ground?.tint) { ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = th.ground.tint; ctx.fill(); }   // harita zemin tonu
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
  ctx.globalAlpha = (cfg.alpha ?? 1) * (currentTheme()?.ground?.decalAlpha ?? 1);
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
  const th = currentTheme();
  if (th && !Object.keys(th.props).length) return;      // dekorsuz tema (desert/volcanic)
  if (th && Assets.get(`tp_${th.id}_${Object.keys(th.props)[0]}`)) {          // tema dekoru (data/world_props.json → themes)
    for (const d of getThemeDecor(th)) {
      if (d.layer !== layer || !visible(d.a)) continue;
      const img = Assets.get(`tp_${th.id}_${d.key}`); if (!img) continue;
      const p = th.props[d.key], k = (p.height * d.s) / img.height;
      onSurface(ctx, d.a, -d.depth, 0, () => ctx.drawImage(img, -p.pivot[0] * k, -p.pivot[1] * k, img.width * k, img.height * k));
    }
    return;
  }
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

// Tema dekoru: aynı kurallar, tema başına deterministik saçılım (bölüm değişince farklı set)
const THEME_DECOR = {};
function getThemeDecor(th) {
  if (THEME_DECOR[th.id]) return THEME_DECOR[th.id];
  const list = [], len = TAU * CONFIG.planet.radius; let seed = 31 + th.id.length * 7;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const g of th.decor) {
    for (let i = 0, n = Math.round(len / g.every); i < n; i++) {
      list.push({ key: g.keys[Math.floor(r() * g.keys.length)], a: r() * TAU - Math.PI, s: g.scale[0] + r() * (g.scale[1] - g.scale[0]), depth: g.depth[0] + r() * (g.depth[1] - g.depth[0]), layer: g.layer });
    }
  }
  return (THEME_DECOR[th.id] = list.sort((a, b) => a.depth - b.depth));
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
