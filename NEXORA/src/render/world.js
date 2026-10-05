import { CONFIG } from '../core/config.js';
import { View } from '../core/view.js';
import { TAU } from '../core/util.js';
import { onSurface, visible, outlined } from './draw.js';
import { drawBackground } from './parallax.js';

export function drawSky(ctx) { drawBackground(ctx); }

// Yüzey: devasa gezegenin üst yayı, ekranda yumuşak bir tepe. Gradyan yüzeyden aşağı koyulaşır (cel-shading).
export function drawPlanet(ctx) {
  const { cx, cy, R } = View, c = CONFIG.planet.colors, sc = View.scale;
  const top = cy - R;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
  const g = ctx.createLinearGradient(0, top, 0, top + 380 * sc);
  g.addColorStop(0, c.grassLight); g.addColorStop(0.18, c.grass); g.addColorStop(1, c.grassDark);
  ctx.fillStyle = g; ctx.fill();
  // üst kenarda koyu toprak/çim bandı + açık parlama
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
  ctx.beginPath(); ctx.arc(cx, cy, R - 9 * sc, 0, TAU);
  ctx.lineWidth = 14 * sc; ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R - 120 * sc, 0, TAU);
  ctx.lineWidth = 60 * sc; ctx.strokeStyle = 'rgba(30,90,40,.18)'; ctx.stroke();
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); outlined(ctx, 5 * sc + 1);

  // Dekorlar (dünya açısına sabit; ön plan parallax katmanı)
  for (const d of getDecor()) {
    if (!visible(d.a)) continue;
    onSurface(ctx, d.a, 0, 0, () => {
      if (d.kind === 'grass') drawGrass(ctx, d);
      else if (d.kind === 'rock') drawRock(ctx, d);
      else if (d.kind === 'fence') drawFence(ctx, d);
      else drawTree(ctx, d);
    });
  }
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
