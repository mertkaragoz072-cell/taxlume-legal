import { CONFIG, WORLD } from '../core/config.js';
import { Assets } from '../core/assets.js';
import { View } from '../core/view.js';
import { state } from '../game/state.js';
import { TAU } from '../core/util.js';
import { outlined } from './draw.js';
import { currentTheme } from './theme.js';

// ARKA PLAN KATMANLARI (uzaktan yakına). Her katman yatayda tekrarlanan bir şerittir; kayma = oyuncunun gittiği
// mesafe × katman hızı. Derinlik hissi için uzak katmanlar gökyüzü rengine doğru "atmosferik sis" ile soldurulur;
// böylece sprite'lar arka plana yapıştırılmış gibi değil, uzaklıkta duruyormuş gibi görünür.
//   0 gökyüzü + güneş parıltısı          (sabit)
//   1 uzak bulutlar                      (çok yavaş)
//   2 uzak yüzen adalar, sisli           (0.03)
//   3 orta mesafe adalar/kale, az sisli  (0.07)
//   4 ufuktaki sis bulutları             (0.10)  adaların altını gökyüzüne bağlar
//   5 uzak tepe siluetleri               (0.18)
//   6 yakın ağaç/çalı şeridi, hafif sisli(0.36)
//   7 oyun zemini + dekor (world.js)     (1.00)
// Katman tanımları data/world_props.json (islandLayers) ve aşağıdaki sabitler.
const HAZE = [214, 236, 255];            // ufuk sis rengi (açık mavi)
const hasSprites = () => !!(WORLD.islandLayers && Assets.get('bg_island_01'));

const tintCache = new Map();
// Sprite'ı sis rengine doğru karıştırılmış kopyasını döndürür (bir kez üretilir).
function tinted(key, amt) {
  const id = key + '@' + amt;
  if (tintCache.has(id)) return tintCache.get(id);
  const src = Assets.get(key); if (!src) return null;
  if (amt <= 0) { tintCache.set(id, src); return src; }
  const cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height;
  const g = cv.getContext('2d'); g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(${HAZE[0]},${HAZE[1]},${HAZE[2]},${amt})`; g.fillRect(0, 0, cv.width, cv.height);
  tintCache.set(id, cv); return cv;
}

// Tema arka planı (bölüm haritası): tema gökyüzü + uzak panorama şeridi (aynalı döşeme, üstü gökyüzüne solar) + ufuk sisi.
// Panorama düşük çözünürlüklü olduğundan uzak/sisli katman olarak kullanılır.
const backdropCache = new Map();
function backdropImage(th, s) {
  const key = th.id + '@' + s.toFixed(3), hit = backdropCache.get(key); if (hit) return hit;
  const src = Assets.get(th.backdrop.key); if (!src) return null;
  const h = Math.round(th.backdrop.height * s), k = h / src.height, w = Math.round(src.width * k);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, w, h);
  g.globalCompositeOperation = 'destination-in'; const m = g.createLinearGradient(0, 0, 0, h); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.4, 'rgba(0,0,0,1)'); g.fillStyle = m; g.fillRect(0, 0, w, h);   // üst kenar gökyüzüne solar
  const row = g.getImageData(0, h - 3, w, 1).data; let r = 0, gg = 0, b = 0, n = 0;                 // alt kenar ortalama rengi: şeridin altını doldurmak için
  for (let i = 0; i < row.length; i += 4) if (row[i + 3] > 200) { r += row[i]; gg += row[i + 1]; b += row[i + 2]; n++; }
  cv.floor = n ? `rgb(${Math.round(r / n)},${Math.round(gg / n)},${Math.round(b / n)})` : '#000';
  backdropCache.set(key, cv); return cv;
}
function drawThemed(ctx, th, travelled, crest) {
  const s = View.scale, sky = th.sky, hz = th.haze;
  const gr = ctx.createLinearGradient(0, 0, 0, crest + 30 * s);
  gr.addColorStop(0, sky[0]); gr.addColorStop(0.45, sky[1]); gr.addColorStop(0.8, sky[2]); gr.addColorStop(1, sky[3]);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, View.w, View.h);
  if (th.sun) {
    const sx = View.w * 0.5, sy = crest * 0.5, sr = 120 * s, rg = ctx.createRadialGradient(sx, sy, sr * 0.15, sx, sy, sr * 2.2);
    rg.addColorStop(0, 'rgba(255,250,210,.7)'); rg.addColorStop(0.35, 'rgba(255,246,190,.3)'); rg.addColorStop(1, 'rgba(255,246,190,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, View.w, View.h);
  }
  if (th.clouds) strip(ctx, travelled, 0.009, 1700, (x0, P) => farClouds(ctx, x0, P, crest));
  const img = backdropImage(th, s);
  if (img) {                                              // aynalı döşeme: dikiş görünmez
    const w = img.width, scroll = travelled * th.backdrop.speed * s, t0 = Math.floor(scroll / w), off = scroll - t0 * w, y = crest - img.height + 16 * s;
    for (let j = 0; -off + j * w < View.w; j++) {
      const flip = ((t0 + j) % 2 + 2) % 2 === 1, x = -off + j * w;
      ctx.save(); ctx.translate(flip ? x + w : x, y); if (flip) ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore();
    }
    ctx.fillStyle = img.floor; ctx.fillRect(0, y + img.height - 1, View.w, View.h);      // gezegenin yanlarında görünen alan: şerit altı düz zemin rengi
  }
  const hg = ctx.createLinearGradient(0, crest - 70 * s, 0, crest + 40 * s);
  hg.addColorStop(0, `rgba(${hz[0]},${hz[1]},${hz[2]},0)`); hg.addColorStop(0.7, `rgba(${hz[0]},${hz[1]},${hz[2]},.38)`); hg.addColorStop(1, `rgba(${hz[0]},${hz[1]},${hz[2]},0)`);
  ctx.fillStyle = hg; ctx.fillRect(0, crest - 70 * s, View.w, 110 * s);
}

export function drawBackground(ctx) {
  const s = View.scale, travelled = state.player.a * CONFIG.planet.radius;
  const crest = View.cy - View.R;                       // zemin yayının tepe noktası (ufuk)
  const th = currentTheme();
  if (th && th.backdrop && Assets.get(th.backdrop.key)) { drawThemed(ctx, th, travelled, crest); return; }
  drawSky(ctx, crest);
  if (!hasSprites()) { drawLegacy(ctx, travelled, crest); return; }

  strip(ctx, travelled, 0.009, 1700, (x0, P) => farClouds(ctx, x0, P, crest));
  for (const L of WORLD.islandLayers) {
    const haze = L.id === 'islands_far' ? 0.45 : 0.18;
    strip(ctx, travelled, L.speed, L.period, (x0, P) => {
      ctx.globalAlpha = L.alpha ?? 1;
      for (const [key, fx, fy, h] of L.items) {
        const img = tinted('bg_' + key, haze); if (!img) continue;
        const k = (h * s) / img.height, w = img.width * k;
        ctx.drawImage(img, x0 + P * fx - w / 2, crest * (1 - fy) - 10 * s, w, img.height * k);
      }
      ctx.globalAlpha = 1;
    }, 1300 * s);
  }
  strip(ctx, travelled, 0.07, 1100, (x0, P) => fogBanks(ctx, x0, P, crest));
  strip(ctx, travelled, 0.13, 900, (x0, P) => hills(ctx, x0, P, crest, 0.18));
  strip(ctx, travelled, 0.26, 760, (x0, P) => nearTrees(ctx, x0, P, crest));
  // ufuk boyunca yumuşak sis: ağaç/tepe tabanını zemine bağlar
  const hg = ctx.createLinearGradient(0, crest - 90 * s, 0, crest + 40 * s);
  hg.addColorStop(0, 'rgba(214,236,255,0)'); hg.addColorStop(0.7, 'rgba(214,236,255,.35)'); hg.addColorStop(1, 'rgba(214,236,255,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, crest - 90 * s, View.w, 130 * s);
}

// Yatayda tekrarlanan şerit: period birim genişlikte, hız oyuncu mesafesiyle çarpılır.
function strip(ctx, travelled, speed, periodUnits, fn) {
  const P = periodUnits * View.scale;
  const off = (((travelled * speed * View.scale) % P) + P) % P;
  for (let x = -P - off; x < View.w + P; x += P) fn(x, P);
}

function drawSky(ctx, crest) {
  const g = ctx.createLinearGradient(0, 0, 0, crest + 30 * View.scale);
  g.addColorStop(0, '#2a7de0'); g.addColorStop(0.45, '#58aef2'); g.addColorStop(0.8, '#a9dcfb'); g.addColorStop(1, '#d6ecff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, View.w, View.h);
  // büyük yumuşak güneş parıltısı
  const sx = View.w * 0.5, sy = crest * 0.5, sr = 120 * View.scale;
  const rg = ctx.createRadialGradient(sx, sy, sr * 0.15, sx, sy, sr * 2.2);
  rg.addColorStop(0, 'rgba(255,250,210,.95)'); rg.addColorStop(0.35, 'rgba(255,246,190,.5)'); rg.addColorStop(1, 'rgba(255,246,190,0)');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, View.w, View.h);
}

// 1: uzak bulutlar — hem yavaş parallax hem zamanla sürüklenme
function farClouds(ctx, x0, P, crest) {
  const s = View.scale, drift = state.time * 5 * s;
  for (let i = 0; i < 4; i++) {
    const img = tinted('bg_cloud_' + String(((i * 2) % 6) + 1).padStart(2, '0'), 0.2); if (!img) continue;
    const k = s * (0.9 + (i % 3) * 0.25), w = img.width * k;
    const x = x0 + ((P * (i + 0.5) / 4 + drift * (0.6 + i * 0.15)) % P);
    ctx.globalAlpha = 0.85;
    ctx.drawImage(img, x - w / 2, crest * (0.12 + (i % 3) * 0.14), w, img.height * k);
  }
  ctx.globalAlpha = 1;
}

// 4: ufuk sis bulutları — adaların altını gökyüzüne/tepelere bağlar
function fogBanks(ctx, x0, P, crest) {
  const s = View.scale;
  for (let i = 0; i < 5; i++) {
    const img = tinted('bg_cloud_' + String((i % 6) + 1).padStart(2, '0'), 0.1); if (!img) continue;
    const k = s * (1.5 + (i % 2) * 0.5), w = img.width * k;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(img, x0 + P * (i + 0.3) / 5 - w / 2, crest - img.height * k * 0.55, w, img.height * k);
  }
  ctx.globalAlpha = 1;
}

// 5: uzak tepe siluetleri (mavi-yeşil, sisli)
function hills(ctx, x0, P, crest, speed) {
  const s = View.scale, base = crest - 6 * s;
  ctx.beginPath(); ctx.moveTo(x0, View.h);
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const t = i / n, h = (26 + 20 * Math.sin(t * TAU * 2 + 0.6) + 12 * Math.sin(t * TAU * 5)) * s;
    ctx.lineTo(x0 + P * t, base - h);
  }
  ctx.lineTo(x0 + P, View.h); ctx.closePath();
  const g = ctx.createLinearGradient(0, base - 60 * s, 0, base + 10 * s);
  g.addColorStop(0, 'rgba(120,175,200,.9)'); g.addColorStop(1, 'rgba(160,205,210,.95)');
  ctx.fillStyle = g; ctx.fill();
}

// 6: yakın ağaç ve çalı şeridi (zemin yayının arkasında; tabanı yayın altına gömülür)
function nearTrees(ctx, x0, P, crest) {
  const s = View.scale, base = crest + 26 * s;          // tabanı yayın arkasında kalsın (kenarlarda havada durmasın)
  const items = [['pine_large', 0.08, 1.0], ['bush_02', 0.22, 0.9], ['pine_small', 0.36, 1.0], ['bush_03', 0.5, 0.8], ['pine_large', 0.64, 0.85],
                 ['bush_01', 0.78, 0.95], ['pine_small', 0.9, 0.9]];
  for (const [key, fx, sc] of items) {
    const img = tinted('prop_' + key, 0.42); const p = WORLD.props?.[key]; if (!img || !p) continue;
    const k = (p.height * sc * 0.5 * s) / img.height, w = img.width * k, h = img.height * k;
    ctx.drawImage(img, x0 + P * fx - w / 2, base - h, w, h);
  }
}

// Sprite yoksa eski placeholder (kaleler/dağlar/ağaçlar)
function drawLegacy(ctx, travelled, crest) {
  const horizon = crest;
  for (const L of CONFIG.parallax || []) {
    const P = L.period * View.scale, off = (((travelled * L.speed * View.scale) % P) + P) % P;
    for (let x = -P - off; x < View.w + P; x += P) {
      ctx.save(); ctx.translate(x, 0); ctx.fillStyle = 'rgba(80,120,190,.5)';
      ctx.fillRect(P * 0.3, horizon - 120 * View.scale, 60 * View.scale, 120 * View.scale); ctx.restore();
    }
  }
}
