// Hand-laid cobblestone sidewalk, stone curb and the lower plaza.
import { DESIGN } from '../config.js';
import { drawGround } from './ground.js';
import { rng, rrect, vgrad, hgrad, mix, lighten, darken, softBand } from '../util.js';

const WARM = ['#ecd8a8', '#e0c48e', '#f2e0b4', '#d6b880', '#e8cf9a', '#dcc08a'];
const PLAZA = ['#d8b680', '#cba570', '#e0c08c', '#c29c64', '#d2ae78'];

export function drawPavement(ctx, v) {
  if (drawGround(ctx, v)) return;
  const xmin = -v.ox - 20, xmax = DESIGN.w + v.ox + 20, W = xmax - xmin;
  const { baseY, curbY } = DESIGN;
  ctx.fillStyle = '#9a7646'; ctx.fillRect(xmin, baseY, W, curbY - baseY);
  stones(ctx, xmin, xmax, baseY, curbY, 31, WARM, 10, 15, 1);
  softBand(ctx, xmin, baseY, W, 26, 0.42);                    // shade from the shop fronts
  dapple(ctx, xmin, xmax, baseY, curbY, 5);

  // curb: bevelled granite blocks
  ctx.fillStyle = '#7a5a30'; ctx.fillRect(xmin, curbY + 14, W, 6);
  const r = rng(61);
  for (let x = xmin; x < xmax; ) {
    const bw = 70 + r() * 40, c = ['#f4e6c0', '#ecd9ae', '#f8ecc8'][Math.floor(r() * 3)];
    rrect(ctx, x + 1, curbY, bw - 2, 14, 3);
    ctx.fillStyle = vgrad(ctx, curbY, curbY + 14, [[0, lighten(c, 0.1)], [1, darken(c, 0.16)]]); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x + 4, curbY + 1.4, bw - 8, 1.6);
    ctx.fillStyle = 'rgba(90,60,25,.5)'; ctx.fillRect(x + 2, curbY + 12, bw - 4, 1.8);
    x += bw;
  }
  ctx.fillStyle = vgrad(ctx, curbY + 20, curbY + 34, [[0, 'rgba(40,20,5,.35)'], [1, 'rgba(40,20,5,0)']]);
  ctx.fillRect(xmin, curbY + 20, W, 14);

  // plaza
  ctx.fillStyle = '#8f6c3e'; ctx.fillRect(xmin, curbY + 20, W, DESIGN.h - curbY);
  stones(ctx, xmin, xmax, curbY + 20, DESIGN.h + 6, 47, PLAZA, 14, 24, 1.25);
  dapple(ctx, xmin, xmax, curbY + 20, DESIGN.h, 9);
  ctx.fillStyle = vgrad(ctx, curbY + 20, DESIGN.h, [[0, 'rgba(60,30,5,.16)'], [1, 'rgba(60,30,5,0)']]);
  ctx.fillRect(xmin, curbY + 20, W, DESIGN.h);
}

/** Irregular bevelled stones: lit top-left edge, shaded bottom-right edge, speckles, the odd crack or moss patch. */
function stones(ctx, x0, x1, y0, y1, seed, tints, hMin, hMax, wk) {
  const r = rng(seed);
  let y = y0, row = 0;
  while (y < y1) {
    const t = (y - y0) / (y1 - y0), h = hMin + (hMax - hMin) * t;
    let x = x0 - (r() * h * 2);
    while (x < x1) {
      const w = h * (1.7 + r() * 1.1) * wk;
      const c = tints[Math.floor(r() * tints.length)];
      const jy = (r() - 0.5) * 1.6;
      rrect(ctx, x + 1.2, y + 1 + jy, w - 2.4, h - 2.2, h * 0.3);
      ctx.fillStyle = vgrad(ctx, y, y + h, [[0, lighten(c, 0.1)], [1, darken(c, 0.1)]]); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,240,.5)'; ctx.fillRect(x + h * 0.35, y + 1.6 + jy, w - h * 0.7, 1.4);
      ctx.fillStyle = 'rgba(100,65,25,.32)'; ctx.fillRect(x + h * 0.3, y + h - 3 + jy, w - h * 0.6, 1.6);
      for (let k = 0; k < 3; k++) { ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.28)' : 'rgba(110,75,35,.22)'; ctx.fillRect(x + 3 + r() * (w - 6), y + 3 + r() * (h - 6), 1.4, 1.4); }
      if (r() < 0.035) { ctx.strokeStyle = 'rgba(90,60,25,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + 2); ctx.lineTo(x + w * 0.45, y + h * 0.5); ctx.lineTo(x + w * 0.4, y + h - 2); ctx.stroke(); }
      if (r() < 0.04) { ctx.fillStyle = 'rgba(80,130,50,.3)'; ctx.beginPath(); ctx.ellipse(x + w * 0.5, y + h - 2, w * 0.3, 3.2, 0, 0, 7); ctx.fill(); }
      x += w;
    }
    y += h; row++;
  }
}

/** Soft leaf-shadow patches so the ground does not look flat. */
function dapple(ctx, x0, x1, y0, y1, seed) {
  const r = rng(seed);
  for (let i = 0; i < 46; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
    ctx.fillStyle = r() < 0.55 ? 'rgba(40,70,20,.07)' : 'rgba(255,245,190,.12)';
    ctx.beginPath(); ctx.ellipse(x, y, 20 + r() * 40, 6 + r() * 12, r() * 0.4, 0, 7); ctx.fill();
  }
}
