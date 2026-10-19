// Extra shop fronts that fill the extra width on long phones (left of the bookshop / right of the market).
import { DESIGN } from '../config.js';
import { rng, rrect, paint, vgrad } from '../util.js';
import { tiledRoof, brickWall, beam, awning, shopWindow, garland, bush } from './parts.js';

const B = DESIGN.baseY;
const KINDS = ['books', 'bread', 'goods'];

function facade(ctx, x, w, seed) {
  const r = rng(seed);
  const top = 290 + Math.floor(r() * 50);
  tiledRoof(ctx, [[x - 4, top + 52], [x + w * 0.2, top], [x + w * 0.8, top], [x + w + 4, top + 52]], { seed });
  brickWall(ctx, x + 6, top + 48, w - 12, B - top - 48, { seed: seed + 1, base: r() < 0.5 ? '#ecd3a0' : '#e8c496' });
  beam(ctx, x, top + 44, w, 10);
  beam(ctx, x, B - 10, w, 12);
  garland(ctx, x + 6, x + w - 6, top + 62, { sag: 14, hang: 16, seed: seed + 2, thick: 1 });
  shopWindow(ctx, x + 18, 462, w - 36, 98, KINDS[Math.floor(r() * 3)], seed + 3);
  awning(ctx, x + 6, 410, w - 12, 42, r() < 0.5 ? '#2f8a4a' : '#d6382e', '#fff3d6', Math.max(6, Math.round(w / 26)));
  bush(ctx, x + w / 2, B + 6, w * 0.8, 26, seed + 4);
}

export function drawSides(ctx, v) {
  const left = -v.ox - 40, right = DESIGN.w + v.ox + 40;
  let seed = 900;
  // left of the bookshop (starts at x=26)
  for (let x = 26; x > left; ) { const w = 150; x -= w + 4; facade(ctx, x, w, seed += 7); }
  // right of the market (ends at ~1386)
  for (let x = 1386; x < right; ) { const w = 150; x += 4; facade(ctx, x, w, seed += 7); x += w; }
}
