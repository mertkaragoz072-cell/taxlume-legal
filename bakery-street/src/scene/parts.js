// Reusable building / prop drawing primitives. All coordinates are design space.
import { INK, rng, rrect, poly, vgrad, hgrad, paint, shadow } from '../util.js';

export const FLOWERS = ['#ff7a9a', '#ffd34d', '#ffffff', '#ff9a3d', '#e8473d', '#c77dff', '#ff5c8a'];
const LEAVES = ['#2a7326', '#3a8f30', '#52a83a', '#72c049'];

// ---------------------------------------------------------------- roofs / walls
export function tiledRoof(ctx, pts, { seed = 1, rowH = 11, tileW = 15 } = {}) {
  const r = rng(seed);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  ctx.save();
  poly(ctx, pts);
  ctx.fillStyle = vgrad(ctx, y0, y1, [[0, '#d9643a'], [1, '#a83a22']]);
  ctx.fill();
  ctx.clip();
  let row = 0;
  for (let y = y1 + rowH; y > y0 - rowH; y -= rowH, row++) {
    const off = (row % 2) * tileW / 2;
    for (let x = x0 - tileW; x < x1 + tileW; x += tileW) {
      const px = x + off, k = r();
      ctx.fillStyle = k < 0.33 ? '#d4562f' : k < 0.66 ? '#e47440' : '#c64a2a';
      ctx.beginPath();
      ctx.moveTo(px, y - rowH);
      ctx.lineTo(px + tileW, y - rowH);
      ctx.lineTo(px + tileW, y - rowH * 0.3);
      ctx.quadraticCurveTo(px + tileW, y + 2, px + tileW / 2, y + 2);
      ctx.quadraticCurveTo(px, y + 2, px, y - rowH * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(80,22,10,.55)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
  }
  ctx.fillStyle = hgrad(ctx, x0, x1, [[0, 'rgba(255,225,150,.22)'], [0.5, 'rgba(255,225,150,0)'], [1, 'rgba(70,10,0,.28)']]);
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
  poly(ctx, pts);
  paint(ctx, null, 3);
}

export function brickWall(ctx, x, y, w, h, { seed = 2, base = '#ecd3a0', bw = 30, bh = 15, shade = true } = {}) {
  const r = rng(seed);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = '#b98f58'; ctx.fillRect(x, y, w, h);
  const tints = [base, '#e2c690', '#f2dcae', '#d9ba85'];
  let row = 0;
  for (let yy = y; yy < y + h; yy += bh, row++) {
    const off = (row % 2) * bw / 2;
    for (let xx = x - bw; xx < x + w + bw; xx += bw) {
      ctx.fillStyle = tints[Math.floor(r() * tints.length)];
      rrect(ctx, xx + off + 1, yy + 1, bw - 2, bh - 2, 3);
      ctx.fill();
    }
  }
  if (shade) {
    ctx.fillStyle = hgrad(ctx, x, x + w, [[0, 'rgba(255,230,170,.18)'], [1, 'rgba(90,50,10,.22)']]);
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

export function plankWall(ctx, x, y, w, h, { seed = 3, a = '#a1703f', b = '#8d5f33', pw = 22 } = {}) {
  const r = rng(seed);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  for (let xx = x, i = 0; xx < x + w; xx += pw, i++) {
    ctx.fillStyle = i % 2 ? a : b;
    ctx.fillRect(xx, y, pw, h);
    ctx.fillStyle = 'rgba(40,18,5,.35)';
    ctx.fillRect(xx, y, 1.6, h);
    ctx.fillStyle = 'rgba(255,230,180,.12)';
    ctx.fillRect(xx + 3, y + r() * h * 0.6, 2, 20 + r() * 30);
  }
  ctx.fillStyle = hgrad(ctx, x, x + w, [[0, 'rgba(255,220,150,.15)'], [1, 'rgba(40,15,0,.25)']]);
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

export function plasterWall(ctx, x, y, w, h, { top = '#f6e7c4', bottom = '#e6cc98' } = {}) {
  ctx.save();
  ctx.fillStyle = vgrad(ctx, y, y + h, [[0, top], [1, bottom]]);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = hgrad(ctx, x, x + w, [[0, 'rgba(255,240,200,.2)'], [1, 'rgba(90,50,10,.2)']]);
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

export function beam(ctx, x, y, w, h) {
  rrect(ctx, x, y, w, h, 2);
  paint(ctx, w > h ? vgrad(ctx, y, y + h, [[0, '#8a5530'], [1, '#5a3417']])
                  : hgrad(ctx, x, x + w, [[0, '#8a5530'], [1, '#5a3417']]), 2);
}

// ---------------------------------------------------------------- awning / sign
export function awning(ctx, x, y, w, h, c1, c2, n = 14, scallop = true) {
  const inset = 10;
  // soft shadow on the wall below
  ctx.fillStyle = vgrad(ctx, y + h, y + h + 34, [[0, 'rgba(40,15,0,.35)'], [1, 'rgba(40,15,0,0)']]);
  ctx.fillRect(x + 4, y + h - 2, w - 8, 36);
  const sw = w / n, tw = (w - inset * 2) / n;
  for (let i = 0; i < n; i++) {
    const tl = x + inset + i * tw, tr = tl + tw, bl = x + i * sw, br = bl + sw;
    ctx.beginPath();
    ctx.moveTo(tl, y);
    ctx.lineTo(tr, y);
    ctx.lineTo(br, y + h);
    if (scallop) ctx.quadraticCurveTo((bl + br) / 2, y + h + 12, bl, y + h);
    else ctx.lineTo(bl, y + h);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? c2 : c1;
    ctx.fill();
    ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(58,34,19,.8)'; ctx.stroke();
  }
  // top valance + highlight
  rrect(ctx, x + inset - 4, y - 7, w - inset * 2 + 8, 9, 3);
  paint(ctx, '#7a4824', 2);
  ctx.fillStyle = hgrad(ctx, x, x + w, [[0, 'rgba(255,255,255,.18)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.18)']]);
  ctx.fillRect(x + 2, y, w - 4, h);
}

export function signBoard(ctx, x, y, w, h, text, { plate = ['#fff2cf', '#f0d594'], color = '#6a3a14', size = 34, left, right } = {}) {
  rrect(ctx, x, y, w, h, 9);
  paint(ctx, vgrad(ctx, y, y + h, [[0, '#9a6232'], [1, '#5e3518']]), 3);
  rrect(ctx, x + 7, y + 7, w - 14, h - 14, 5);
  paint(ctx, vgrad(ctx, y, y + h, [[0, plate[0]], [1, plate[1]]]), 1.6, 'rgba(58,34,19,.85)');
  ctx.fillStyle = '#d9a95a';
  for (const [rx, ry] of [[x + 4, y + 4], [x + w - 4, y + 4], [x + 4, y + h - 4], [x + w - 4, y + h - 4]]) {
    ctx.beginPath(); ctx.arc(rx, ry, 2.2, 0, 7); ctx.fill();
  }
  const cx = x + w / 2, cy = y + h / 2 + 1;
  ctx.font = `italic 700 ${size}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillText(text, cx + 1.5, cy + 2);
  ctx.fillStyle = color; ctx.fillText(text, cx, cy);
  const tw = ctx.measureText(text).width;
  if (left) left(ctx, cx - tw / 2 - h * 0.55, cy, h * 0.62);
  if (right) right(ctx, cx + tw / 2 + h * 0.55, cy, h * 0.62);
}

// ---------------------------------------------------------------- sign icons
export function iconBread(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.3); const k = s / 40; ctx.scale(k, k);
  ctx.beginPath(); ctx.ellipse(0, 0, 23, 12, 0, 0, 7);
  paint(ctx, vgrad(ctx, -12, 12, [[0, '#f2b556'], [1, '#c9772a']]), 2.4);
  ctx.strokeStyle = '#f9d58a'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  for (const dx of [-11, 0, 11]) { ctx.beginPath(); ctx.moveTo(dx - 3, -6); ctx.lineTo(dx + 3, 5); ctx.stroke(); }
  ctx.restore();
}
export function iconCup(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); const k = s / 40; ctx.scale(k, k);
  ctx.beginPath(); ctx.ellipse(0, 14, 20, 5.5, 0, 0, 7); paint(ctx, '#fff', 2);
  ctx.beginPath(); ctx.moveTo(-13, -6); ctx.lineTo(13, -6); ctx.quadraticCurveTo(12, 14, 0, 14); ctx.quadraticCurveTo(-12, 14, -13, -6);
  paint(ctx, '#fffaf0', 2.2);
  ctx.beginPath(); ctx.ellipse(0, -6, 13, 4, 0, 0, 7); paint(ctx, '#7a4320', 1.8);
  ctx.beginPath(); ctx.arc(14, 1, 6, -1.4, 1.6); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  ctx.strokeStyle = 'rgba(120,90,70,.7)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (const dx of [-5, 3]) { ctx.beginPath(); ctx.moveTo(dx, -12); ctx.quadraticCurveTo(dx - 5, -18, dx, -24); ctx.stroke(); }
  ctx.restore();
}
export function iconBook(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); const k = s / 40; ctx.scale(k, k);
  for (const d of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(d * 12, -18, d * 24, -12); ctx.lineTo(d * 24, 14); ctx.quadraticCurveTo(d * 12, 8, 0, 14); ctx.closePath();
    paint(ctx, '#fff6e0', 2.2);
    ctx.strokeStyle = 'rgba(90,60,30,.5)'; ctx.lineWidth = 1.4;
    for (const yy of [-5, 1, 7]) { ctx.beginPath(); ctx.moveTo(d * 4, yy); ctx.lineTo(d * 20, yy - 1); ctx.stroke(); }
  }
  ctx.restore();
}
export function iconBasket(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); const k = s / 40; ctx.scale(k, k);
  ctx.beginPath(); ctx.arc(0, -4, 15, Math.PI, 0); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.arc(-7, -4, 6, 0, 7); paint(ctx, '#7bc043', 1.6);
  ctx.beginPath(); ctx.arc(6, -5, 6, 0, 7); paint(ctx, '#e8473d', 1.6);
  ctx.beginPath(); ctx.moveTo(-22, -4); ctx.lineTo(22, -4); ctx.lineTo(16, 16); ctx.lineTo(-16, 16); ctx.closePath();
  paint(ctx, '#c93a2e', 2.2);
  ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.6;
  for (const dx of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(dx, -3); ctx.lineTo(dx * .8, 15); ctx.stroke(); }
  ctx.restore();
}

// ---------------------------------------------------------------- windows & goods
export function shopWindow(ctx, x, y, w, h, kind, seed = 5) {
  const r = rng(seed);
  rrect(ctx, x - 6, y - 6, w + 12, h + 12, 6);
  paint(ctx, '#7a4824', 2.6);
  ctx.save();
  rrect(ctx, x, y, w, h, 3); ctx.clip();
  ctx.fillStyle = vgrad(ctx, y, y + h, [[0, '#ffe9b0'], [0.5, '#ffc765'], [1, '#f19a3a']]);
  ctx.fillRect(x, y, w, h);
  const shelves = 3;
  for (let s = 0; s < shelves; s++) {
    const sy = y + (h / shelves) * (s + 1) - 5;
    const items = Math.floor(w / 22);
    for (let i = 0; i < items; i++) {
      const ix = x + 10 + i * (w - 20) / items + r() * 4;
      if (kind === 'bread') bakeryItem(ctx, ix, sy, r);
      else if (kind === 'books') bookItem(ctx, ix, sy, r);
      else goodsItem(ctx, ix, sy, r);
    }
    ctx.fillStyle = '#8a5530'; ctx.fillRect(x, sy, w, 6);
    ctx.fillStyle = 'rgba(40,15,0,.4)'; ctx.fillRect(x, sy + 6, w, 4);
  }
  // glass reflections
  ctx.fillStyle = 'rgba(255,255,255,.16)';
  poly(ctx, [[x + w * 0.1, y], [x + w * 0.3, y], [x + w * 0.1, y + h], [x - w * 0.1, y + h]]); ctx.fill();
  poly(ctx, [[x + w * 0.45, y], [x + w * 0.52, y], [x + w * 0.32, y + h], [x + w * 0.25, y + h]]); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#7a4824';
  if (w > 110) ctx.fillRect(x + w / 2 - 3, y, 6, h);
  ctx.fillRect(x, y + h * 0.18, w, 5);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
}

function bakeryItem(ctx, x, sy, r) {
  const k = r();
  if (k < 0.4) { // loaf
    ctx.beginPath(); ctx.ellipse(x, sy - 8, 11, 7.5, 0, 0, 7);
    paint(ctx, '#d98a2b', 1.4, '#7a4417');
    ctx.strokeStyle = '#f2c070'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 5, sy - 11); ctx.lineTo(x - 2, sy - 5); ctx.moveTo(x + 2, sy - 12); ctx.lineTo(x + 5, sy - 5); ctx.stroke();
  } else if (k < 0.7) { // bun
    ctx.beginPath(); ctx.arc(x, sy - 7, 7.5, 0, 7); paint(ctx, '#eaa64a', 1.4, '#7a4417');
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(x - 2, sy - 10, 2.5, 0, 7); ctx.fill();
  } else if (k < 0.88) { // baguette
    ctx.save(); ctx.translate(x, sy - 12); ctx.rotate(-0.5);
    rrect(ctx, -3.5, -13, 7, 26, 3.5); paint(ctx, '#d9953a', 1.2, '#7a4417'); ctx.restore();
  } else { // pie
    ctx.beginPath(); ctx.ellipse(x, sy - 5, 10, 5, 0, 0, 7); paint(ctx, '#b86a2a', 1.4, '#6a3410');
    ctx.fillStyle = '#e64a3a'; ctx.beginPath(); ctx.arc(x, sy - 7, 3, 0, 7); ctx.fill();
  }
}
function bookItem(ctx, x, sy, r) {
  const cols = ['#b23a3a', '#2f6f4f', '#2b4f8a', '#d59a2b', '#6a3d8a', '#8a5a2b', '#c9682a'];
  const n = 1 + Math.floor(r() * 3);
  let bx = x - 8;
  for (let i = 0; i < n; i++) {
    const bw = 5 + r() * 4, bh = 18 + r() * 12;
    ctx.fillStyle = cols[Math.floor(r() * cols.length)];
    ctx.fillRect(bx, sy - bh, bw, bh);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(bx + 1, sy - bh + 4, bw - 2, 2);
    ctx.strokeStyle = 'rgba(40,15,0,.7)'; ctx.lineWidth = 1; ctx.strokeRect(bx, sy - bh, bw, bh);
    bx += bw;
  }
}
function goodsItem(ctx, x, sy, r) {
  const k = r();
  if (k < 0.4) { // jar
    const c = ['#e8923a', '#c24a3a', '#8fbf4a', '#f2d04a'][Math.floor(r() * 4)];
    rrect(ctx, x - 6, sy - 20, 12, 20, 3); paint(ctx, c, 1.3, '#4a2a12');
    ctx.fillStyle = '#e8d6a8'; ctx.fillRect(x - 6.5, sy - 23, 13, 4);
  } else if (k < 0.75) { // bottle
    rrect(ctx, x - 4.5, sy - 22, 9, 22, 3); paint(ctx, '#fff8ea', 1.3, '#4a2a12');
    ctx.fillStyle = '#4b90d8'; ctx.fillRect(x - 4.5, sy - 24, 9, 4);
  } else { // box
    rrect(ctx, x - 8, sy - 16, 16, 16, 2); paint(ctx, '#d9a95a', 1.3, '#4a2a12');
    ctx.fillStyle = '#c24a3a'; ctx.fillRect(x - 8, sy - 10, 16, 4);
  }
}

// ---------------------------------------------------------------- foliage
export function bush(ctx, x, y, w, h, seed = 1, { flowers = FLOWERS, density = 1, leaf = LEAVES } = {}) {
  const r = rng(seed);
  const pts = [];
  const n = Math.floor((w * h) / 85);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, v = r();
    pts.push({ x: x + u * w / 2, y: y - v * h * Math.sqrt(1 - u * u), v, s: 5 + r() * 6 });
  }
  pts.sort((a, b) => a.y - b.y);
  for (const p of pts) {
    ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7);
    ctx.fillStyle = leaf[Math.min(leaf.length - 1, Math.floor(p.v * leaf.length + r() * 0.8))];
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,50,15,.55)'; ctx.lineWidth = 1.2; ctx.stroke();
  }
  if (!flowers) return;
  const m = Math.floor(n * 0.8 * density);
  const fl = [];
  for (let i = 0; i < m; i++) {
    const u = r() * 2 - 1, v = r() * 0.95 + 0.05;
    fl.push({ x: x + u * w / 2 * 0.95, y: y - v * h * Math.sqrt(1 - u * u) * 0.95, c: flowers[Math.floor(r() * flowers.length)], s: 2.6 + r() * 2.4 });
  }
  fl.sort((a, b) => a.y - b.y);
  for (const f of fl) {
    ctx.beginPath(); ctx.arc(f.x, f.y, f.s, 0, 7);
    ctx.fillStyle = f.c; ctx.fill();
    ctx.strokeStyle = 'rgba(70,25,25,.55)'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = '#fff1a8'; ctx.beginPath(); ctx.arc(f.x, f.y, f.s * 0.35, 0, 7); ctx.fill();
  }
}

export function garland(ctx, x0, x1, y, { sag = 10, hang = 28, seed = 4, thick = 1 } = {}) {
  const r = rng(seed);
  const n = Math.floor((x1 - x0) / 5);
  const flowerPts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, px = x0 + (x1 - x0) * t, py = y + sag * Math.sin(Math.PI * t);
    for (let k = 0; k < 2 * thick; k++) {
      const ox = (r() - 0.5) * 10, oy = (r() - 0.5) * 12 * thick;
      ctx.beginPath(); ctx.arc(px + ox, py + oy, 5 + r() * 4, 0, 7);
      ctx.fillStyle = LEAVES[Math.floor(r() * LEAVES.length)]; ctx.fill();
      ctx.strokeStyle = 'rgba(15,50,15,.5)'; ctx.lineWidth = 1; ctx.stroke();
    }
    if (r() < 0.55) flowerPts.push({ x: px + (r() - 0.5) * 10, y: py + (r() - 0.5) * 12 });
    if (r() < 0.11) { // hanging strand
      const len = 8 + r() * hang;
      for (let d = 0; d < len; d += 6) {
        ctx.beginPath(); ctx.arc(px + Math.sin(d) * 1.5, py + 6 + d, 4 + r() * 2, 0, 7);
        ctx.fillStyle = LEAVES[Math.floor(r() * 3)]; ctx.fill();
        ctx.strokeStyle = 'rgba(15,50,15,.5)'; ctx.lineWidth = 1; ctx.stroke();
      }
      flowerPts.push({ x: px, y: py + 6 + len });
    }
  }
  for (const f of flowerPts) {
    const c = FLOWERS[Math.floor(r() * FLOWERS.length)], s = 3 + r() * 2.4;
    ctx.beginPath(); ctx.arc(f.x, f.y, s, 0, 7); ctx.fillStyle = c; ctx.fill();
    ctx.strokeStyle = 'rgba(70,25,25,.55)'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = '#fff1a8'; ctx.beginPath(); ctx.arc(f.x, f.y, s * 0.35, 0, 7); ctx.fill();
  }
}

// ---------------------------------------------------------------- containers & furniture
export function planter(ctx, x, y, w, h, { seed = 1, kind = 'box', bushH = 40, flowers } = {}) {
  shadow(ctx, x, y + 1, w * 0.62, 5, 0.25);
  bush(ctx, x, y - h + 4, w * 0.95, bushH, seed, { flowers });
  if (kind === 'pot') {
    ctx.beginPath(); ctx.moveTo(x - w / 2, y - h); ctx.lineTo(x + w / 2, y - h); ctx.lineTo(x + w * 0.38, y); ctx.lineTo(x - w * 0.38, y); ctx.closePath();
    paint(ctx, hgrad(ctx, x - w / 2, x + w / 2, [[0, '#d9803f'], [0.5, '#c46a2c'], [1, '#9c4f1f']]), 2.2);
    rrect(ctx, x - w / 2 - 3, y - h - 4, w + 6, 8, 3); paint(ctx, '#d98a4a', 2);
  } else { // wooden barrel / box
    rrect(ctx, x - w / 2, y - h, w, h, 4);
    paint(ctx, hgrad(ctx, x - w / 2, x + w / 2, [[0, '#a8743f'], [0.5, '#8d5f33'], [1, '#6a4322']]), 2.2);
    ctx.strokeStyle = '#3a2213'; ctx.lineWidth = 2;
    for (const f of [0.3, 0.7]) { ctx.beginPath(); ctx.moveTo(x - w / 2, y - h * f); ctx.lineTo(x + w / 2, y - h * f); ctx.stroke(); }
  }
}

export function lampPost(ctx, x, baseY, h) {
  shadow(ctx, x, baseY + 1, 22, 5, 0.3);
  rrect(ctx, x - 12, baseY - 16, 24, 16, 3); paint(ctx, '#2a2623', 2);
  rrect(ctx, x - 8, baseY - 34, 16, 20, 3); paint(ctx, '#34302b', 2);
  rrect(ctx, x - 4, baseY - h + 40, 8, h - 70, 2);
  paint(ctx, hgrad(ctx, x - 4, x + 4, [[0, '#4a443e'], [0.4, '#2a2623'], [1, '#161311']]), 2);
  rrect(ctx, x - 7, baseY - h + 60, 14, 8, 3); paint(ctx, '#2a2623', 2);
  // lantern
  const ly = baseY - h + 24;
  poly(ctx, [[x - 17, ly - 24], [x + 17, ly - 24], [x, ly - 42]]); paint(ctx, '#26211d', 2.2);
  ctx.beginPath(); ctx.arc(x, ly - 44, 3.5, 0, 7); paint(ctx, '#26211d', 1.5);
  ctx.beginPath(); ctx.moveTo(x - 15, ly - 24); ctx.lineTo(x + 15, ly - 24); ctx.lineTo(x + 11, ly + 22); ctx.lineTo(x - 11, ly + 22); ctx.closePath();
  paint(ctx, vgrad(ctx, ly - 24, ly + 22, [[0, '#fff2a8'], [0.5, '#ffd25a'], [1, '#f5a82e']]), 2.4);
  ctx.strokeStyle = '#26211d'; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(x, ly - 24); ctx.lineTo(x, ly + 22); ctx.stroke();
  rrect(ctx, x - 13, ly + 22, 26, 6, 2); paint(ctx, '#26211d', 1.5);
  return { x, y: ly };
}

export function bench(ctx, cx, y, w = 190) {
  shadow(ctx, cx, y + 2, w * 0.55, 6, 0.28);
  const x = cx - w / 2;
  for (const lx of [x + 14, x + w - 14]) { // iron legs
    rrect(ctx, lx - 4, y - 44, 8, 44, 2); paint(ctx, '#26211d', 1.8);
    rrect(ctx, lx - 9, y - 6, 18, 6, 2); paint(ctx, '#26211d', 1.5);
  }
  const slat = (yy, hh) => {
    rrect(ctx, x, yy, w, hh, 3);
    paint(ctx, vgrad(ctx, yy, yy + hh, [[0, '#a8743f'], [1, '#7a4f28']]), 2);
  };
  slat(y - 78, 11); slat(y - 63, 11); slat(y - 48, 11);
  slat(y - 34, 12);
  ctx.fillStyle = 'rgba(255,230,170,.25)';
  ctx.fillRect(x + 6, y - 76, w - 12, 2); ctx.fillRect(x + 6, y - 32, w - 12, 2);
}

export function bollard(ctx, x, y) {
  shadow(ctx, x + 2, y + 1, 14, 4, 0.3);
  rrect(ctx, x - 9, y - 56, 18, 56, 4);
  paint(ctx, hgrad(ctx, x - 9, x + 9, [[0, '#55504a'], [0.35, '#2a2623'], [1, '#141210']]), 2);
  ctx.beginPath(); ctx.arc(x, y - 62, 8.5, 0, 7); paint(ctx, hgrad(ctx, x - 8, x + 8, [[0, '#55504a'], [1, '#161311']]), 2);
  rrect(ctx, x - 11, y - 48, 22, 6, 3); paint(ctx, '#34302b', 1.6);
  rrect(ctx, x - 11, y - 12, 22, 6, 3); paint(ctx, '#34302b', 1.6);
}

export function chalkboard(ctx, x, y, w, h, kind) {
  shadow(ctx, x, y + 1, w * 0.6, 5, 0.25);
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - w * 0.36, y - h * 0.15); ctx.lineTo(x - w * 0.44, y); ctx.moveTo(x + w * 0.36, y - h * 0.15); ctx.lineTo(x + w * 0.44, y); ctx.stroke();
  rrect(ctx, x - w / 2, y - h, w, h * 0.86, 5); paint(ctx, '#8a5530', 2.6);
  rrect(ctx, x - w / 2 + 6, y - h + 6, w - 12, h * 0.86 - 12, 3); paint(ctx, '#2f3a36', 1.5);
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  const cx = x, cy = y - h * 0.6;
  if (kind === 'cup') {
    ctx.beginPath(); ctx.moveTo(cx - 12, cy - 6); ctx.lineTo(cx + 10, cy - 6); ctx.quadraticCurveTo(cx + 9, cy + 12, cx - 1, cy + 12); ctx.quadraticCurveTo(cx - 11, cy + 12, cx - 12, cy - 6); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 12, cy, 5, -1.4, 1.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 5, cy - 12); ctx.quadraticCurveTo(cx - 9, cy - 17, cx - 5, cy - 22); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.ellipse(cx, cy, 18, 8, -0.3, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 8, cy - 5); ctx.lineTo(cx - 3, cy + 3); ctx.moveTo(cx + 2, cy - 7); ctx.lineTo(cx + 7, cy + 1); ctx.stroke();
  }
  ctx.lineWidth = 1.6;
  for (const yy of [y - h * 0.3, y - h * 0.22]) { ctx.beginPath(); ctx.moveTo(x - w * 0.3, yy); ctx.lineTo(x + w * 0.3, yy); ctx.stroke(); }
}

// ---------------------------------------------------------------- market goods
export function crate(ctx, x, y, w, h, fill = 'apples', seed = 1) {
  const r = rng(seed);
  const col = { apples: ['#e0372e', '#ff7a5a'], oranges: ['#f58a1f', '#ffc060'], greens: ['#4caf3a', '#9be069'], lemons: ['#f4d63a', '#fff08a'], tomato: ['#d6281f', '#ff6a50'], pears: ['#a9c93a', '#dff07a'] }[fill];
  if (col) {
    const n = Math.floor(w / 9) + 2;
    for (let row = 0; row < 2; row++) for (let i = 0; i < n; i++) {
      const px = x - w / 2 + 6 + i * (w - 12) / (n - 1) + (row ? 4 : 0) * (r() - 0.5), py = y - h - 6 - row * 9 + r() * 3, s = 8 + r() * 2;
      if (fill === 'greens') {
        ctx.beginPath(); ctx.arc(px, py - 2, s + 1, 0, 7); paint(ctx, col[0], 1.3, '#1f5a1f');
        ctx.strokeStyle = col[1]; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(px, py - 2, s - 3, 3.6, 5.4); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(px, py, s, 0, 7); paint(ctx, col[0], 1.3, 'rgba(60,15,10,.8)');
        ctx.fillStyle = col[1]; ctx.beginPath(); ctx.arc(px - 2.5, py - 3, s * 0.32, 0, 7); ctx.fill();
      }
    }
  }
  rrect(ctx, x - w / 2, y - h, w, h, 3);
  paint(ctx, vgrad(ctx, y - h, y, [[0, '#b98250'], [1, '#8a5a30']]), 2.4);
  ctx.strokeStyle = 'rgba(40,18,5,.55)'; ctx.lineWidth = 1.6;
  for (const f of [0.34, 0.67]) { ctx.beginPath(); ctx.moveTo(x - w / 2, y - h * f); ctx.lineTo(x + w / 2, y - h * f); ctx.stroke(); }
}

export function sack(ctx, x, y, w, h) {
  shadow(ctx, x, y + 1, w * 0.55, 5, 0.25);
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, y); ctx.quadraticCurveTo(x - w * 0.62, y - h * 0.55, x - w * 0.34, y - h * 0.86);
  ctx.lineTo(x - w * 0.2, y - h); ctx.lineTo(x + w * 0.2, y - h); ctx.lineTo(x + w * 0.34, y - h * 0.86);
  ctx.quadraticCurveTo(x + w * 0.62, y - h * 0.55, x + w * 0.5, y); ctx.closePath();
  paint(ctx, hgrad(ctx, x - w / 2, x + w / 2, [[0, '#f6ead0'], [0.6, '#e8d4a8'], [1, '#c9ac78']]), 2.4);
  rrect(ctx, x - w * 0.3, y - h * 1.0, w * 0.6, 9, 4); paint(ctx, '#d9b878', 2);
  // wheat emblem
  ctx.strokeStyle = '#a9761e'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y - h * 0.18); ctx.lineTo(x, y - h * 0.62); ctx.stroke();
  for (let i = 0; i < 4; i++) for (const d of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(x + d * 5, y - h * (0.32 + i * 0.1), 3.2, 1.7, d * -0.7, 0, 7); ctx.fillStyle = '#d9a032'; ctx.fill();
  }
}

export function milkBottle(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(-5, -24); ctx.lineTo(-5, -32); ctx.lineTo(5, -32); ctx.lineTo(5, -24);
  ctx.quadraticCurveTo(10, -20, 10, -12); ctx.lineTo(10, -2); ctx.quadraticCurveTo(10, 0, 8, 0); ctx.lineTo(-8, 0); ctx.quadraticCurveTo(-10, 0, -10, -2); ctx.lineTo(-10, -12); ctx.quadraticCurveTo(-10, -20, -5, -24);
  paint(ctx, hgrad(ctx, -10, 10, [[0, '#ffffff'], [1, '#dfe8ef']]), 2);
  ctx.fillStyle = '#e8473d'; ctx.fillRect(-5.6, -35, 11.2, 5);
  ctx.fillStyle = '#6aaee8'; ctx.fillRect(-9, -17, 18, 9);
  ctx.restore();
}

export function eggCrate(ctx, x, y, w, h, seed = 1) {
  const r = rng(seed);
  rrect(ctx, x - w / 2, y - h, w, h, 3); paint(ctx, '#c79a62', 2.2);
  const n = Math.floor(w / 11);
  for (let row = 0; row < 2; row++) for (let i = 0; i < n; i++) {
    ctx.beginPath(); ctx.ellipse(x - w / 2 + 8 + i * (w - 16) / (n - 1), y - h - 2 + row * -6, 5, 6.2, 0, 0, 7);
    paint(ctx, r() < 0.3 ? '#e8c9a0' : '#fff3df', 1.2, 'rgba(80,50,20,.7)');
  }
}

export function barrel(ctx, x, y, w, h) {
  shadow(ctx, x, y + 1, w * 0.6, 5, 0.25);
  ctx.beginPath(); ctx.moveTo(x - w * 0.42, y); ctx.quadraticCurveTo(x - w * 0.62, y - h * 0.5, x - w * 0.42, y - h);
  ctx.lineTo(x + w * 0.42, y - h); ctx.quadraticCurveTo(x + w * 0.62, y - h * 0.5, x + w * 0.42, y); ctx.closePath();
  paint(ctx, hgrad(ctx, x - w / 2, x + w / 2, [[0, '#b27a44'], [0.5, '#8d5f33'], [1, '#5f3b1c']]), 2.4);
  ctx.strokeStyle = '#2f2a26'; ctx.lineWidth = 3;
  for (const f of [0.2, 0.8]) { ctx.beginPath(); ctx.moveTo(x - w * 0.5, y - h * f); ctx.lineTo(x + w * 0.5, y - h * f); ctx.stroke(); }
}

export function hangingLamp(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#26211d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -4); ctx.stroke();
  poly(ctx, [[-8, -4], [8, -4], [0, -12]]); paint(ctx, '#26211d', 1.5);
  ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(7, -4); ctx.lineTo(5, 12); ctx.lineTo(-5, 12); ctx.closePath();
  paint(ctx, vgrad(ctx, -4, 12, [[0, '#fff5b8'], [1, '#ffc24a']]), 1.8);
  ctx.restore();
}
