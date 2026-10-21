// Flowers, foliage, planters and garlands.
import { INK, rng, rrect, poly, vgrad, hgrad, paint, shadow, mix, lighten, darken, softBand } from '../util.js';

export const FLOWERS = ['#ff7a9a', '#ffd34d', '#ffffff', '#ff9a3d', '#e8473d', '#c77dff', '#ff5c8a'];
const LEAF = ['#1f5f26', '#2a7a2c', '#3a9433', '#52ad3c', '#78c44c'];

/** A single blossom: 5 rounded petals around a centre, with a lit top-left edge. */
export function flower(ctx, x, y, s, col, kind = 0) {
  if (kind === 2) { // tiny cluster (geranium / hydrangea)
    for (const [dx, dy] of [[0, -1.4], [-1.5, 0.9], [1.5, 0.9], [0, 0.2]]) {
      ctx.beginPath(); ctx.arc(x + dx * s * 0.8, y + dy * s * 0.8, s * 0.72, 0, 7); ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = 'rgba(70,25,35,.5)'; ctx.lineWidth = 0.7; ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(x - s * 0.5, y - s * 0.9, s * 0.3, 0, 7); ctx.fill();
    return;
  }
  const n = kind === 1 ? 6 : 5, pr = s * 0.62;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.4;
    ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * s * 0.6, y + Math.sin(a) * s * 0.6, pr, pr * (kind === 1 ? 0.5 : 0.85), a, 0, 7);
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = 'rgba(70,25,35,.55)'; ctx.lineWidth = 0.7; ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(x, y, s * 0.4, 0, 7); ctx.fillStyle = col === '#ffd34d' ? '#e8923a' : '#ffe27a'; ctx.fill();
  ctx.strokeStyle = 'rgba(90,50,10,.6)'; ctx.lineWidth = 0.6; ctx.stroke();
}

function leaf(ctx, x, y, len, ang, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(-len / 2, 0); ctx.quadraticCurveTo(0, -len * 0.42, len / 2, 0); ctx.quadraticCurveTo(0, len * 0.42, -len / 2, 0);
  ctx.fillStyle = col; ctx.fill();
  ctx.strokeStyle = 'rgba(12,45,14,.6)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.strokeStyle = 'rgba(220,255,170,.35)'; ctx.beginPath(); ctx.moveTo(-len * 0.4, 0); ctx.lineTo(len * 0.4, 0); ctx.stroke();
  ctx.restore();
}

export function bush(ctx, x, y, w, h, seed = 1, { flowers = FLOWERS, density = 1 } = {}) {
  const r = rng(seed);
  const pts = [];
  const n = Math.floor((w * h) / 70);
  // dark body to give the foliage depth
  ctx.beginPath(); ctx.ellipse(x, y - h * 0.35, w * 0.5, h * 0.5, 0, 0, 7); ctx.fillStyle = '#1b5522'; ctx.fill();
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, v = r();
    pts.push({ x: x + u * w / 2, y: y - v * h * Math.sqrt(1 - u * u), v, u, a: (r() - 0.5) * 3.1, s: 9 + r() * 7 });
  }
  pts.sort((a, b) => a.y - b.y);
  for (const p of pts) {
    const lit = p.v * 0.75 + (-p.u) * 0.2 + r() * 0.25;
    leaf(ctx, p.x, p.y, p.s, p.a, LEAF[Math.max(0, Math.min(LEAF.length - 1, Math.floor(lit * LEAF.length)))]);
  }
  if (!flowers) return;
  const m = Math.floor(n * 0.75 * density), fl = [];
  for (let i = 0; i < m; i++) {
    const u = r() * 2 - 1, v = r() * 0.95 + 0.05;
    fl.push({ x: x + u * w / 2 * 0.95, y: y - v * h * Math.sqrt(1 - u * u) * 0.95, c: flowers[Math.floor(r() * flowers.length)], s: 3 + r() * 2.2, k: Math.floor(r() * 3) });
  }
  fl.sort((a, b) => a.y - b.y);
  for (const f of fl) flower(ctx, f.x, f.y, f.s, f.c, f.k);
}

export function garland(ctx, x0, x1, y, { sag = 10, hang = 28, seed = 4, thick = 1 } = {}) {
  const r = rng(seed);
  const n = Math.floor((x1 - x0) / 4);
  const fl = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, px = x0 + (x1 - x0) * t, py = y + sag * Math.sin(Math.PI * t);
    for (let k = 0; k < 2 * thick; k++) leaf(ctx, px + (r() - 0.5) * 10, py + (r() - 0.5) * 12 * thick, 10 + r() * 6, r() * 6, LEAF[Math.floor(r() * LEAF.length)]);
    if (r() < 0.5) fl.push({ x: px + (r() - 0.5) * 10, y: py + (r() - 0.5) * 12 });
    if (r() < 0.12) {
      const len = 8 + r() * hang;
      for (let d = 0; d < len; d += 6) leaf(ctx, px + Math.sin(d) * 1.5, py + 6 + d, 9 + r() * 4, Math.PI / 2 + (r() - 0.5), LEAF[Math.floor(r() * 4)]);
      fl.push({ x: px, y: py + 6 + len });
    }
  }
  for (const f of fl) flower(ctx, f.x, f.y, 3.2 + r() * 2, FLOWERS[Math.floor(r() * FLOWERS.length)], Math.floor(r() * 3));
}

export function planter(ctx, x, y, w, h, { seed = 1, kind = 'box', bushH = 40, flowers } = {}) {
  shadow(ctx, x + 4, y + 1, w * 0.62, 5, 0.28);
  bush(ctx, x, y - h + 6, w * 0.98, bushH, seed, { flowers });
  if (kind === 'pot') {
    ctx.beginPath(); ctx.moveTo(x - w / 2, y - h + 2); ctx.lineTo(x + w / 2, y - h + 2); ctx.lineTo(x + w * 0.36, y); ctx.lineTo(x - w * 0.36, y); ctx.closePath();
    paint(ctx, hgrad(ctx, x - w / 2, x + w / 2, [[0, '#e8935a'], [0.35, '#d27a3e'], [1, '#8f451c']]), 2.2);
    ctx.fillStyle = 'rgba(255,230,190,.3)'; ctx.fillRect(x - w * 0.38, y - h + 8, 3, h - 14);
    ctx.strokeStyle = 'rgba(90,40,10,.5)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - w * 0.43, y - h * 0.5); ctx.lineTo(x + w * 0.43, y - h * 0.5); ctx.stroke();
    rrect(ctx, x - w / 2 - 3, y - h - 3, w + 6, 10, 3.5); paint(ctx, vgrad(ctx, y - h - 3, y - h + 7, [[0, '#f0a870'], [1, '#b8602c']]), 2.2);
    softBand(ctx, x - w / 2, y - h + 7, w, 6, 0.3);
  } else {
    rrect(ctx, x - w / 2, y - h, w, h, 4);
    paint(ctx, hgrad(ctx, x - w / 2, x + w / 2, [[0, '#b27a44'], [0.45, '#8d5f33'], [1, '#5f3b1c']]), 2.2);
    ctx.strokeStyle = 'rgba(30,12,2,.55)'; ctx.lineWidth = 1.4;
    for (let k = 1; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x - w / 2, y - (h * k) / 3); ctx.lineTo(x + w / 2, y - (h * k) / 3); ctx.stroke(); }
    ctx.fillStyle = '#2f2a26'; ctx.fillRect(x - w / 2 + 6, y - h, 5, h); ctx.fillRect(x + w / 2 - 11, y - h, 5, h);
    ctx.fillStyle = 'rgba(255,225,170,.35)'; ctx.fillRect(x - w / 2 + 2, y - h + 2, w - 4, 1.6);
  }
}
