// Architectural primitives: roofs, masonry, timber, awnings, windows, doors. Light comes from the top-left.
import { INK, rng, rrect, poly, vgrad, hgrad, paint, mix, lighten, darken, softBand } from '../util.js';

const WOOD_D = '#5a3417', WOOD_M = '#7d4c26', WOOD_L = '#a8703a';

// ------------------------------------------------------------------ roofs
export function tiledRoof(ctx, pts, { seed = 1, rowH = 11, tileW = 15, ridge = true } = {}) {
  const r = rng(seed);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const cols = ['#d9603a', '#e47a44', '#c9502c', '#d06a3a', '#bf4528'];
  ctx.save();
  poly(ctx, pts); ctx.fillStyle = '#8e2f1a'; ctx.fill(); ctx.clip();
  let row = 0;
  for (let y = y1 + rowH; y > y0 - rowH; y -= rowH, row++) {
    const off = (row % 2) * tileW / 2;
    for (let x = x0 - tileW; x < x1 + tileW; x += tileW) {
      const px = x + off, c = cols[Math.floor(r() * cols.length)];
      const g = ctx.createLinearGradient(0, y - rowH, 0, y + 2);
      g.addColorStop(0, darken(c, 0.42)); g.addColorStop(0.5, c); g.addColorStop(1, lighten(c, 0.12));
      ctx.beginPath();
      ctx.moveTo(px, y - rowH); ctx.lineTo(px + tileW, y - rowH); ctx.lineTo(px + tileW, y - rowH * 0.3);
      ctx.quadraticCurveTo(px + tileW, y + 2, px + tileW / 2, y + 2);
      ctx.quadraticCurveTo(px, y + 2, px, y - rowH * 0.3);
      ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(70,18,8,.7)'; ctx.lineWidth = 1.1; ctx.stroke();
      // lit rim on the curved lower lip
      ctx.beginPath();
      ctx.moveTo(px + 2, y - rowH * 0.3);
      ctx.quadraticCurveTo(px + 2, y - 1.5, px + tileW / 2, y - 1.5);
      ctx.strokeStyle = 'rgba(255,215,160,.38)'; ctx.lineWidth = 1.1; ctx.stroke();
    }
  }
  ctx.fillStyle = hgrad(ctx, x0, x1, [[0, 'rgba(255,230,160,.26)'], [0.45, 'rgba(255,230,160,0)'], [1, 'rgba(60,8,0,.34)']]);
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.fillStyle = vgrad(ctx, y0, y1, [[0, 'rgba(255,240,200,.14)'], [1, 'rgba(60,8,0,.18)']]);
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.restore();

  // barge boards along the slopes, eave fascia and shadow on the wall below
  const base = pts[0][1];
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    ctx.strokeStyle = INK; ctx.lineWidth = ay === by ? 11 : 8.5;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = ay === by ? '#c24a2c' : WOOD_M; ctx.lineWidth = ay === by ? 8 : 5.5;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,225,170,.45)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(ax, ay - 1.5); ctx.lineTo(bx, by - 1.5); ctx.stroke();
  }
  const last = pts[pts.length - 1];
  ctx.fillStyle = vgrad(ctx, base, base + 6, [[0, WOOD_L], [1, WOOD_D]]);
  ctx.fillRect(pts[0][0], base - 1, last[0] - pts[0][0], 7);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.strokeRect(pts[0][0], base - 1, last[0] - pts[0][0], 7);
  softBand(ctx, pts[0][0] + 6, base + 6, last[0] - pts[0][0] - 12, 18, 0.4);
}

// ------------------------------------------------------------------ walls
export function brickWall(ctx, x, y, w, h, { seed = 2, base = '#ecd3a0', bh = 15, moss = true } = {}) {
  const r = rng(seed);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = '#a07a48'; ctx.fillRect(x, y, w, h);
  const tints = [base, '#e2c690', '#f4dfb2', '#d9ba85', '#e9cc98'];
  let row = 0;
  for (let yy = y; yy < y + h; yy += bh, row++) {
    let xx = x - (row % 2) * 18 - r() * 10;
    while (xx < x + w) {
      const bw = 24 + r() * 16;
      const c = tints[Math.floor(r() * tints.length)];
      rrect(ctx, xx + 1, yy + 1, bw - 2, bh - 2, 2.6);
      ctx.fillStyle = vgrad(ctx, yy, yy + bh, [[0, lighten(c, 0.1)], [1, darken(c, 0.12)]]); ctx.fill();
      ctx.fillStyle = 'rgba(255,250,225,.5)'; ctx.fillRect(xx + 3, yy + 1.4, bw - 6, 1.3);
      ctx.fillStyle = 'rgba(110,70,25,.35)'; ctx.fillRect(xx + 2, yy + bh - 2.8, bw - 4, 1.6);
      if (r() < 0.12) { ctx.fillStyle = 'rgba(120,80,40,.18)'; ctx.fillRect(xx + 4, yy + 3, bw - 9, bh - 7); }
      xx += bw;
    }
  }
  ctx.fillStyle = hgrad(ctx, x, x + w, [[0, 'rgba(255,235,180,.2)'], [0.5, 'rgba(255,235,180,0)'], [1, 'rgba(70,35,5,.28)']]);
  ctx.fillRect(x, y, w, h);
  softBand(ctx, x, y, w, 30, 0.42);               // roof overhang shadow
  softBand(ctx, x, y + h - 26, w, 26, 0.3, true); // grime at the foot
  if (moss) {
    for (let i = 0; i < 10; i++) {
      const mx = x + r() * w, my = y + h - r() * 12;
      ctx.fillStyle = 'rgba(70,120,40,.22)';
      ctx.beginPath(); ctx.ellipse(mx, my, 10 + r() * 16, 4 + r() * 5, 0, 0, 7); ctx.fill();
    }
  }
  ctx.restore();
}

/** Alternating corner stones on a wall edge. */
export function quoins(ctx, x, y, h, side = 1) {
  const bh = 22;
  for (let i = 0, yy = y; yy < y + h - 4; yy += bh, i++) {
    const bw = i % 2 ? 26 : 38;
    const bx = side > 0 ? x : x - bw;
    rrect(ctx, bx, yy + 1, bw, bh - 2, 3);
    paint(ctx, vgrad(ctx, yy, yy + bh, [[0, '#f6e6c0'], [1, '#d6b985']]), 1.6, 'rgba(90,55,20,.7)');
    ctx.fillStyle = 'rgba(255,255,240,.55)'; ctx.fillRect(bx + 3, yy + 2.5, bw - 6, 1.4);
  }
}

export function plankWall(ctx, x, y, w, h, { seed = 3, a = '#a1703f', b = '#8d5f33', pw = 22 } = {}) {
  const r = rng(seed);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  for (let xx = x, i = 0; xx < x + w; xx += pw, i++) {
    ctx.fillStyle = hgrad(ctx, xx, xx + pw, [[0, lighten(i % 2 ? a : b, 0.08)], [1, darken(i % 2 ? a : b, 0.12)]]);
    ctx.fillRect(xx, y, pw, h);
    ctx.fillStyle = 'rgba(30,12,2,.5)'; ctx.fillRect(xx, y, 1.6, h);
    ctx.fillStyle = 'rgba(255,225,170,.18)'; ctx.fillRect(xx + 2.5, y, 1.4, h);
    ctx.strokeStyle = 'rgba(50,22,6,.28)'; ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) { // grain
      const gx = xx + 4 + r() * (pw - 8), gy = y + r() * h;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.bezierCurveTo(gx + 2, gy + 10, gx - 2, gy + 20, gx + 1, gy + 32 + r() * 20); ctx.stroke();
    }
    for (let k = 0; k < 2; k++) { // knots
      if (r() < 0.45) { ctx.beginPath(); ctx.ellipse(xx + pw / 2, y + r() * h, 2.6, 4, 0, 0, 7); ctx.fillStyle = 'rgba(50,22,6,.45)'; ctx.fill(); }
    }
  }
  ctx.fillStyle = hgrad(ctx, x, x + w, [[0, 'rgba(255,220,150,.16)'], [1, 'rgba(30,10,0,.3)']]);
  ctx.fillRect(x, y, w, h);
  softBand(ctx, x, y, w, 28, 0.42);
  softBand(ctx, x, y + h - 24, w, 24, 0.28, true);
  ctx.restore();
}

export function plasterWall(ctx, x, y, w, h, { top = '#f8ebcb', bottom = '#e3c892' } = {}) {
  const r = rng(5);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = vgrad(ctx, y, y + h, [[0, top], [1, bottom]]); ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 40; i++) { // trowel mottling
    ctx.fillStyle = r() < 0.5 ? 'rgba(255,250,230,.25)' : 'rgba(150,100,40,.1)';
    ctx.beginPath(); ctx.ellipse(x + r() * w, y + r() * h, 12 + r() * 26, 5 + r() * 10, r() * 3, 0, 7); ctx.fill();
  }
  ctx.fillStyle = hgrad(ctx, x, x + w, [[0, 'rgba(255,240,200,.22)'], [1, 'rgba(80,40,5,.26)']]); ctx.fillRect(x, y, w, h);
  softBand(ctx, x, y, w, 30, 0.4);
  softBand(ctx, x, y + h - 24, w, 24, 0.26, true);
  ctx.restore();
}

export function beam(ctx, x, y, w, h) {
  const horiz = w > h;
  rrect(ctx, x, y, w, h, 2.5);
  paint(ctx, horiz ? vgrad(ctx, y, y + h, [[0, '#9a6234'], [0.5, WOOD_M], [1, WOOD_D]])
                   : hgrad(ctx, x, x + w, [[0, '#9a6234'], [0.5, WOOD_M], [1, WOOD_D]]), 2.2);
  ctx.save(); rrect(ctx, x, y, w, h, 2.5); ctx.clip();
  ctx.strokeStyle = 'rgba(40,16,4,.35)'; ctx.lineWidth = 1;
  const r = rng(Math.floor(x * 7 + y));
  const n = Math.floor((horiz ? w : h) / 22);
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    if (horiz) { const gx = x + r() * w, gy = y + 2 + r() * (h - 4); ctx.moveTo(gx, gy); ctx.lineTo(gx + 18 + r() * 30, gy + (r() - 0.5) * 2); }
    else { const gx = x + 2 + r() * (w - 4), gy = y + r() * h; ctx.moveTo(gx, gy); ctx.lineTo(gx + (r() - 0.5) * 2, gy + 18 + r() * 30); }
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,225,170,.4)';
  if (horiz) ctx.fillRect(x + 2, y + 1.3, w - 4, 1.5); else ctx.fillRect(x + 1.3, y + 2, 1.5, h - 4);
  ctx.restore();
  ctx.fillStyle = '#2c1a0e';
  const step = 70;
  for (let i = step / 2; i < (horiz ? w : h); i += step) {
    ctx.beginPath(); ctx.arc(horiz ? x + i : x + w / 2, horiz ? y + h / 2 : y + i, 1.7, 0, 7); ctx.fill();
  }
}

// ------------------------------------------------------------------ awning
export function awning(ctx, x, y, w, h, c1, c2, n = 14) {
  const inset = 10;
  softBand(ctx, x + 6, y + h - 2, w - 12, 40, 0.5);
  // iron support arms
  ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (const sx of [x + 14, x + w - 14]) { ctx.beginPath(); ctx.moveTo(sx, y + 2); ctx.lineTo(sx + (sx < x + w / 2 ? -4 : 4), y + h); ctx.stroke(); }
  const sw = w / n, tw = (w - inset * 2) / n;
  for (let i = 0; i < n; i++) {
    const tl = x + inset + i * tw, tr = tl + tw, bl = x + i * sw, br = bl + sw, c = i % 2 ? c2 : c1;
    ctx.beginPath();
    ctx.moveTo(tl, y); ctx.lineTo(tr, y); ctx.lineTo(br, y + h);
    ctx.quadraticCurveTo((bl + br) / 2, y + h + 13, bl, y + h);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, y, y + h + 8, [[0, darken(c, 0.35)], [0.35, c], [0.85, lighten(c, 0.1)], [1, darken(c, 0.08)]]);
    ctx.fill();
    // fold shading on the right side of each stripe
    ctx.beginPath();
    ctx.moveTo(tl + tw * 0.62, y); ctx.lineTo(tr, y); ctx.lineTo(br, y + h); ctx.lineTo(bl + sw * 0.62, y + h); ctx.closePath();
    ctx.fillStyle = 'rgba(70,25,5,.13)'; ctx.fill();
    ctx.strokeStyle = 'rgba(58,34,19,.8)'; ctx.lineWidth = 1.4; ctx.stroke();
  }
  // scallop hem line
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const bl = x + i * sw, br = bl + sw;
    if (i === 0) ctx.moveTo(bl, y + h);
    ctx.quadraticCurveTo((bl + br) / 2, y + h + 13, br, y + h);
  }
  ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
  // valance rail
  rrect(ctx, x + inset - 5, y - 8, w - inset * 2 + 10, 11, 3);
  paint(ctx, vgrad(ctx, y - 8, y + 3, [[0, WOOD_L], [1, WOOD_D]]), 2);
  ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(x + inset, y - 6, w - inset * 2, 2);
}

// ------------------------------------------------------------------ windows & doors
export function shopWindow(ctx, x, y, w, h, kind, seed = 5, { valance = null } = {}) {
  const r = rng(seed);
  // stone sill
  rrect(ctx, x - 12, y + h + 3, w + 24, 10, 3);
  paint(ctx, vgrad(ctx, y + h, y + h + 13, [[0, '#f2e2bb'], [1, '#c4a56c']]), 2);
  softBand(ctx, x - 6, y + h + 13, w + 12, 12, 0.3);
  // frame
  rrect(ctx, x - 8, y - 8, w + 16, h + 16, 7);
  paint(ctx, vgrad(ctx, y - 8, y + h + 8, [[0, '#9a6234'], [1, WOOD_D]]), 2.8);
  rrect(ctx, x - 3.5, y - 3.5, w + 7, h + 7, 4); paint(ctx, null, 1.4, 'rgba(30,12,2,.7)');
  ctx.save();
  rrect(ctx, x, y, w, h, 3); ctx.clip();
  // lit interior
  ctx.fillStyle = vgrad(ctx, y, y + h, [[0, '#ffeab8'], [0.5, '#ffc86a'], [1, '#f0953a']]);
  ctx.fillRect(x, y, w, h);
  const rg = ctx.createRadialGradient(x + w / 2, y + h * 0.55, 4, x + w / 2, y + h * 0.55, w * 0.65);
  rg.addColorStop(0, 'rgba(255,250,215,.75)'); rg.addColorStop(1, 'rgba(255,200,100,0)');
  ctx.fillStyle = rg; ctx.fillRect(x, y, w, h);
  const shelves = 3;
  for (let s = 0; s < shelves; s++) {
    const sy = y + (h / shelves) * (s + 1) - 5;
    const items = Math.floor(w / 24);
    for (let i = 0; i < items; i++) {
      const ix = x + 12 + i * (w - 24) / items + r() * 4;
      if (kind === 'bread') bakeryItem(ctx, ix, sy, r);
      else if (kind === 'books') bookItem(ctx, ix, sy, r);
      else goodsItem(ctx, ix, sy, r);
    }
    rrect(ctx, x, sy, w, 6, 1.5); paint(ctx, vgrad(ctx, sy, sy + 6, [[0, '#a8703a'], [1, '#6a4020']]), 1.2, 'rgba(40,16,4,.7)');
    ctx.fillStyle = 'rgba(40,15,0,.35)'; ctx.fillRect(x, sy + 6, w, 5);
  }
  // inset shadow (frame depth)
  softBand(ctx, x, y, w, 14, 0.4);
  ctx.fillStyle = hgrad(ctx, x, x + 12, [[0, 'rgba(40,15,0,.35)'], [1, 'rgba(40,15,0,0)']]); ctx.fillRect(x, y, 12, h);
  // glass sheen
  ctx.fillStyle = 'rgba(190,225,255,.10)'; ctx.fillRect(x, y, w, h * 0.35);
  ctx.fillStyle = 'rgba(255,255,255,.2)';
  poly(ctx, [[x + w * 0.08, y], [x + w * 0.24, y], [x + w * 0.04, y + h], [x - w * 0.12, y + h]]); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  poly(ctx, [[x + w * 0.4, y], [x + w * 0.46, y], [x + w * 0.26, y + h], [x + w * 0.2, y + h]]); ctx.fill();
  if (valance) { // scalloped cloth valance
    const n = Math.max(4, Math.round(w / 22));
    for (let i = 0; i < n; i++) {
      const vx = x + (i * w) / n;
      ctx.beginPath(); ctx.moveTo(vx, y); ctx.lineTo(vx + w / n, y); ctx.lineTo(vx + w / n, y + 9); ctx.quadraticCurveTo(vx + w / (2 * n), y + 20, vx, y + 9); ctx.closePath();
      paint(ctx, i % 2 ? '#fff3d6' : valance, 1.3, 'rgba(60,25,10,.75)');
    }
  }
  ctx.restore();
  // glazing bars
  ctx.fillStyle = WOOD_M;
  if (w > 110) { ctx.fillRect(x + w / 2 - 3, y, 6, h); ctx.fillStyle = 'rgba(255,225,170,.4)'; ctx.fillRect(x + w / 2 - 3, y, 1.5, h); }
  ctx.fillStyle = WOOD_M; ctx.fillRect(x, y + h * 0.2, w, 5);
  ctx.fillStyle = 'rgba(255,225,170,.4)'; ctx.fillRect(x, y + h * 0.2, w, 1.5);
}

function bakeryItem(ctx, x, sy, r) {
  const k = r();
  if (k < 0.32) { // loaf
    ctx.beginPath(); ctx.ellipse(x, sy - 8.5, 12, 8, 0, 0, 7);
    paint(ctx, vgrad(ctx, sy - 17, sy, [[0, '#f0b45a'], [0.6, '#d98a2b'], [1, '#a85e1c']]), 1.5, '#6a3a12');
    ctx.strokeStyle = '#f9d890'; ctx.lineWidth = 1.7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 6, sy - 12); ctx.lineTo(x - 3, sy - 5); ctx.moveTo(x + 1, sy - 13); ctx.lineTo(x + 4, sy - 6); ctx.moveTo(x + 7, sy - 11); ctx.lineTo(x + 9, sy - 6); ctx.stroke();
  } else if (k < 0.56) { // croissant
    ctx.save(); ctx.translate(x, sy - 8);
    for (const [dx, rot, s] of [[-7, -0.5, 0.8], [0, 0, 1], [7, 0.5, 0.8]]) {
      ctx.beginPath(); ctx.ellipse(dx, 0, 5.5 * s, 7.5 * s, rot, 0, 7); paint(ctx, '#e29a3a', 1.2, '#6a3a12');
    }
    ctx.restore();
  } else if (k < 0.74) { // cake with cherry
    rrect(ctx, x - 9, sy - 15, 18, 15, 3); paint(ctx, vgrad(ctx, sy - 15, sy, [[0, '#fff1dc'], [1, '#e9b88a']]), 1.3, '#6a3a12');
    ctx.fillStyle = '#c93a5a'; ctx.fillRect(x - 9, sy - 9, 18, 2.5);
    ctx.beginPath(); ctx.arc(x, sy - 18, 3.6, 0, 7); paint(ctx, '#d6283f', 1.1, '#5a0f1a');
  } else if (k < 0.88) { // baguettes in a basket
    ctx.strokeStyle = '#6a3a12'; ctx.lineWidth = 6.5; ctx.lineCap = 'round';
    for (const dx of [-5, 0, 5]) { ctx.beginPath(); ctx.moveTo(x + dx, sy - 4); ctx.lineTo(x + dx - 3 + dx * 0.4, sy - 27); ctx.stroke(); }
    ctx.strokeStyle = '#d9953a'; ctx.lineWidth = 4;
    for (const dx of [-5, 0, 5]) { ctx.beginPath(); ctx.moveTo(x + dx, sy - 4); ctx.lineTo(x + dx - 3 + dx * 0.4, sy - 27); ctx.stroke(); }
    rrect(ctx, x - 10, sy - 11, 20, 11, 2); paint(ctx, '#b87a3a', 1.3, '#4a2a10');
  } else { // pie
    ctx.beginPath(); ctx.ellipse(x, sy - 5, 11, 5.5, 0, 0, 7); paint(ctx, '#b86a2a', 1.4, '#5a2a0a');
    ctx.beginPath(); ctx.ellipse(x, sy - 7, 8, 3.5, 0, 0, 7); ctx.fillStyle = '#d4503a'; ctx.fill();
  }
}
function bookItem(ctx, x, sy, r) {
  const cols = ['#b23a3a', '#2f6f4f', '#2b4f8a', '#d59a2b', '#6a3d8a', '#8a5a2b', '#c9682a', '#3a8a8a'];
  const n = 1 + Math.floor(r() * 3);
  let bx = x - 8;
  for (let i = 0; i < n; i++) {
    const bw = 5.5 + r() * 4.5, bh = 19 + r() * 12, c = cols[Math.floor(r() * cols.length)];
    ctx.fillStyle = hgrad(ctx, bx, bx + bw, [[0, lighten(c, 0.2)], [1, darken(c, 0.2)]]);
    ctx.fillRect(bx, sy - bh, bw, bh);
    ctx.fillStyle = '#f2d48a'; ctx.fillRect(bx, sy - bh + 4, bw, 1.6); ctx.fillRect(bx, sy - 7, bw, 1.6);
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(bx + 1, sy - bh + 8, bw - 2, 5);
    ctx.strokeStyle = 'rgba(40,15,0,.75)'; ctx.lineWidth = 1; ctx.strokeRect(bx, sy - bh, bw, bh);
    bx += bw;
  }
}
function goodsItem(ctx, x, sy, r) {
  const k = r();
  if (k < 0.4) { // jar with label
    const c = ['#e8923a', '#c24a3a', '#8fbf4a', '#f2d04a'][Math.floor(r() * 4)];
    rrect(ctx, x - 6.5, sy - 21, 13, 21, 3.5); paint(ctx, hgrad(ctx, x - 6, x + 6, [[0, lighten(c, 0.25)], [1, darken(c, 0.15)]]), 1.3, '#4a2a12');
    ctx.fillStyle = '#f4e6c0'; ctx.fillRect(x - 6, sy - 15, 12, 7);
    rrect(ctx, x - 7, sy - 25, 14, 5, 2); paint(ctx, '#d9b878', 1.2, '#4a2a12');
  } else if (k < 0.75) { // bottle
    rrect(ctx, x - 4.5, sy - 22, 9, 22, 3); paint(ctx, hgrad(ctx, x - 4, x + 4, [[0, '#ffffff'], [1, '#d2dde6']]), 1.3, '#4a2a12');
    ctx.fillStyle = '#4b90d8'; ctx.fillRect(x - 4.5, sy - 25, 9, 4);
  } else { // box
    rrect(ctx, x - 8, sy - 16, 16, 16, 2); paint(ctx, vgrad(ctx, sy - 16, sy, [[0, '#e6b86a'], [1, '#b98a42']]), 1.3, '#4a2a12');
    ctx.fillStyle = '#c24a3a'; ctx.fillRect(x - 8, sy - 10, 16, 4);
  }
}

export function doorway(ctx, x, y, w, h, { frame = '#6a3d1c', panel = '#8a5028', glow = true, step = true } = {}) {
  if (step) { rrect(ctx, x - 10, y + h - 4, w + 20, 14, 3); paint(ctx, vgrad(ctx, y + h - 4, y + h + 10, [[0, '#e8d2a0'], [1, '#b8975c']]), 2); }
  rrect(ctx, x, y, w, h, 6); paint(ctx, vgrad(ctx, y, y + h, [[0, lighten(frame, 0.15)], [1, darken(frame, 0.2)]]), 3);
  // lower wooden panels
  const gh = h * 0.58;
  rrect(ctx, x + 9, y + 9 + gh, w - 18, h - gh - 16, 3); paint(ctx, vgrad(ctx, y + gh, y + h, [[0, lighten(panel, 0.1)], [1, darken(panel, 0.15)]]), 1.8, 'rgba(30,12,2,.75)');
  rrect(ctx, x + 15, y + gh + 16, w - 30, h - gh - 30, 2); paint(ctx, null, 1.2, 'rgba(255,225,170,.35)');
  // glazed upper part
  rrect(ctx, x + 9, y + 9, w - 18, gh, 3);
  paint(ctx, glow ? vgrad(ctx, y, y + gh, [[0, '#fff3c4'], [1, '#f6a940']]) : '#cfe6f0', 2, 'rgba(30,12,2,.8)');
  ctx.fillStyle = frame; ctx.fillRect(x + w / 2 - 2.5, y + 9, 5, gh); ctx.fillRect(x + 9, y + 9 + gh * 0.42, w - 18, 5);
  ctx.fillStyle = 'rgba(255,255,255,.22)'; poly(ctx, [[x + 14, y + 9], [x + 40, y + 9], [x + 14, y + gh * 0.8]]); ctx.fill();
  // brass handle + kick plate
  ctx.beginPath(); ctx.arc(x + w - 17, y + h * 0.58, 4.2, 0, 7); paint(ctx, vgrad(ctx, y + h * 0.55, y + h * 0.62, [[0, '#ffe08a'], [1, '#b8821e']]), 1.5, '#5a3a08');
  rrect(ctx, x + 12, y + h - 18, w - 24, 10, 2); paint(ctx, vgrad(ctx, y + h - 18, y + h - 8, [[0, '#e8c46a'], [1, '#a8741a']]), 1.2, '#5a3a08');
}

export function hangingLamp(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#26211d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, -5); ctx.stroke();
  poly(ctx, [[-9, -5], [9, -5], [0, -14]]); paint(ctx, '#26211d', 1.5);
  ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(8, -5); ctx.lineTo(5.5, 13); ctx.lineTo(-5.5, 13); ctx.closePath();
  paint(ctx, vgrad(ctx, -5, 13, [[0, '#fffbd0'], [0.5, '#ffd868'], [1, '#f5a82e']]), 1.8, '#26211d');
  ctx.fillStyle = '#26211d'; ctx.fillRect(-1, -5, 2, 18);
  rrect(ctx, -6, 12, 12, 3.5, 1.5); paint(ctx, '#26211d', 1);
  ctx.restore();
}
