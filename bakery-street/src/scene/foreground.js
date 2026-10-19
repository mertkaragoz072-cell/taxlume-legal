// Foreground: benches, bollards, flower beds and the framing tree canopies.
import { DESIGN } from '../config.js';
import { rng } from '../util.js';
import { getImage } from '../assets.js';
import { bench, bollard, bush, planter } from './parts.js';

export function drawForeground(ctx, v) {
  const xmin = -v.ox, xmax = DESIGN.w + v.ox;
  const y = DESIGN.curbY;

  bench(ctx, 310, y + 78, 190);
  bench(ctx, 1090, y + 78, 190);
  for (const x of [170, 222, 520, 880, 1180, 1232]) bollard(ctx, x, y + 70);
  // flowery beds
  bush(ctx, 680, y + 104, 360, 44, 401);
  planter(ctx, 410, y + 112, 150, 30, { seed: 402, kind: 'box', bushH: 40 });
  planter(ctx, 990, y + 112, 150, 30, { seed: 403, kind: 'box', bushH: 40 });
  // corner shrubs
  bush(ctx, xmin + 70, DESIGN.h + 14, 240, 110, 411);
  bush(ctx, xmax - 70, DESIGN.h + 14, 240, 110, 412);
  planter(ctx, xmin + 50, DESIGN.h - 36, 80, 40, { seed: 413, kind: 'box', bushH: 50 });
  planter(ctx, xmax - 50, DESIGN.h - 36, 80, 40, { seed: 414, kind: 'box', bushH: 50 });

  if (!getImage('town-backdrop')) { // framing trees only when there is no painted backdrop
    canopy(ctx, xmin, -v.oy, 1, 601);
    canopy(ctx, xmax, -v.oy, -1, 602);
  }
}

function canopy(ctx, x, top, d, seed) {
  const r = rng(seed);
  // trunk hugging the screen edge
  ctx.fillStyle = '#5a3a22';
  ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + d * 70, top); ctx.quadraticCurveTo(x + d * 40, top + 150, x + d * 54, top + 360); ctx.lineTo(x, top + 380); ctx.closePath();
  ctx.fill(); ctx.strokeStyle = '#3a2213'; ctx.lineWidth = 3; ctx.stroke();
  const cols = ['#1f5a28', '#2f7a30', '#46963a', '#6bb847'];
  for (let layer = 0; layer < 4; layer++) {
    for (let i = 0; i < 26; i++) {
      const px = x + d * (r() * 280 - 10), py = top + r() * 170 - 14 + layer * 4;
      ctx.beginPath(); ctx.arc(px, py, 22 + r() * 36 - layer * 3, 0, 7);
      ctx.fillStyle = cols[layer]; ctx.fill();
      if (layer === 0) { ctx.strokeStyle = 'rgba(10,40,10,.5)'; ctx.lineWidth = 2; ctx.stroke(); }
    }
  }
}
