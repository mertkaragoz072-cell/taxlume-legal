// Ground built from the supplied stone-slab art: a raised sidewalk (paving + curb blocks + brick face), then plaza paving.
import { DESIGN } from '../config.js';
import { getImage } from '../assets.js';
import { rng, softBand } from '../util.js';

const WALK_S = 0.845;   // scales the slab so its paving + curb lip fill the sidewalk band (baseY .. curbY)
const SLAB_TOP = 5;      // native y of the paving's back edge inside the slab sprite

/** Returns false when the art is missing so the procedural pavement can take over. */
export function drawGround(ctx, v) {
  const A = getImage('ground-walk-a'), B = getImage('ground-walk-b'), P = getImage('ground-plaza');
  if (!A || !B || !P) return false;
  const xmin = -v.ox - 20, xmax = DESIGN.w + v.ox + 20;
  const y0 = DESIGN.baseY - SLAB_TOP * WALK_S;
  const faceBottom = y0 + A.naturalHeight * WALK_S;

  // plaza under the curb: tiled paving rows, darkened a little so the sidewalk reads as raised
  ctx.fillStyle = '#7a5a30';
  ctx.fillRect(xmin, faceBottom - 4, xmax - xmin, DESIGN.h - faceBottom + 8);
  const ps = 0.95, pw = P.naturalWidth * ps, ph = P.naturalHeight * ps - 2;
  const r = rng(12);
  for (let y = faceBottom - 2, row = 0; y < DESIGN.h + 4; y += ph, row++) {
    for (let x = xmin - r() * pw; x < xmax; x += pw - 1) ctx.drawImage(P, x, y, pw, ph + 3);
  }
  ctx.fillStyle = 'rgba(50,25,5,0.2)';
  ctx.fillRect(xmin, faceBottom - 4, xmax - xmin, DESIGN.h - faceBottom + 8);

  // sidewalk slab: alternating strips cut from the supplied pieces
  const imgs = [A, B];
  for (let x = xmin, i = 0; x < xmax; i++) {
    const im = imgs[i % 2], w = im.naturalWidth * WALK_S;
    ctx.drawImage(im, x, y0, w + 1, im.naturalHeight * WALK_S);
    x += w;
  }
  softBand(ctx, xmin, faceBottom, xmax - xmin, 22, 0.38);               // shade under the curb
  softBand(ctx, xmin, DESIGN.baseY, xmax - xmin, 22, 0.3);              // shade from the shop fronts
  return true;
}
