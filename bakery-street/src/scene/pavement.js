// Cobbled sidewalk, curb and the lower plaza.
import { DESIGN } from '../config.js';
import { rng, rrect, vgrad } from '../util.js';

export function drawPavement(ctx, v) {
  const xmin = -v.ox - 20, xmax = DESIGN.w + v.ox + 20, W = xmax - xmin;
  const { baseY, curbY } = DESIGN;
  ctx.fillStyle = vgrad(ctx, baseY, curbY, [[0, '#d9bd88'], [1, '#e9d3a0']]);
  ctx.fillRect(xmin, baseY, W, curbY - baseY);
  cobbles(ctx, xmin, xmax, baseY, curbY, 31, ['#e9d4a4', '#dcc08c', '#f0dcb0', '#d3b57e'], 9, 14);
  // contact shadow under the shop fronts
  ctx.fillStyle = vgrad(ctx, baseY, baseY + 24, [[0, 'rgba(50,25,5,.38)'], [1, 'rgba(50,25,5,0)']]);
  ctx.fillRect(xmin, baseY, W, 24);
  // curb
  ctx.fillStyle = '#f2e2bb'; ctx.fillRect(xmin, curbY, W, 12);
  ctx.fillStyle = '#b89558'; ctx.fillRect(xmin, curbY + 12, W, 5);
  ctx.fillStyle = '#7a5a30'; ctx.fillRect(xmin, curbY + 17, W, 2);
  // plaza
  ctx.fillStyle = '#cba972'; ctx.fillRect(xmin, curbY + 19, W, DESIGN.h - curbY);
  cobbles(ctx, xmin, xmax, curbY + 19, DESIGN.h + 4, 47, ['#d4b27a', '#c8a56c', '#dcbc86', '#bf9c62'], 14, 22);
  ctx.fillStyle = vgrad(ctx, curbY + 19, DESIGN.h, [[0, 'rgba(60,30,5,.18)'], [1, 'rgba(60,30,5,.0)']]);
  ctx.fillRect(xmin, curbY + 19, W, DESIGN.h);
}

function cobbles(ctx, x0, x1, y0, y1, seed, tints, hMin, hMax) {
  const r = rng(seed);
  let y = y0, row = 0;
  while (y < y1) {
    const t = (y - y0) / (y1 - y0), h = hMin + (hMax - hMin) * t;
    const w = h * 2.2;
    const off = (row % 2) * w / 2 + (r() * 6);
    for (let x = x0 - w; x < x1 + w; x += w) {
      ctx.fillStyle = tints[Math.floor(r() * tints.length)];
      rrect(ctx, x + off + 1, y + 1, w - 2.4, h - 2.2, h * 0.28);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.fillRect(x + off + 4, y + 2, w * 0.35, 1.6);
    }
    y += h; row++;
  }
  ctx.strokeStyle = 'rgba(110,75,35,.35)';
  ctx.lineWidth = 1;
}
