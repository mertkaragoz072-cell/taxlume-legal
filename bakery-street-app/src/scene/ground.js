// Ground plane built from the supplied stone art: the paving surface of the slabs, laid in rows that grow toward the viewer,
// so the street reads as one continuous cobbled plane seen from slightly above (shop bases at the back, screen bottom at the front).
import { DESIGN } from '../config.js';
import { getImage } from '../assets.js';
import { rng, softBand } from '../util.js';

const TOP_Y = 9, TOP_H = 49;      // native rows of the slab sprite that hold only the paving surface
const ROW_MIN = 15, ROW_GROW = 3.4; // row height (design px) at the back and its growth per row toward the viewer

/** Returns false when the art is missing so the procedural pavement can take over. */
export function drawGround(ctx, v) {
  const A = getImage('ground-walk-a'), B = getImage('ground-walk-b');
  if (!A || !B) return false;
  const xmin = -v.ox - 20, xmax = DESIGN.w + v.ox + 20, W = xmax - xmin;
  const gy = DESIGN.groundY, imgs = [A, B], r = rng(31);

  ctx.fillStyle = '#9a7a4e';
  ctx.fillRect(xmin, gy, W, DESIGN.h - gy + 8);

  let y = gy - 2, k = 0;
  while (y < DESIGN.h + 12) {
    const h = ROW_MIN + k * ROW_GROW, s = h / TOP_H;
    let x = xmin - r() * 200 * s - 20, i = Math.floor(r() * 2);
    while (x < xmax) {
      const im = imgs[i++ % 2], w = im.naturalWidth * s;
      ctx.drawImage(im, 0, TOP_Y, im.naturalWidth, TOP_H, x, y, w + 1, h + 1.5);
      x += w;
    }
    y += h; k++;
  }
  // warm the stones a little and add depth: dark where the shops meet the ground, soft light toward the viewer
  const g = ctx.createLinearGradient(0, gy, 0, DESIGN.h);
  g.addColorStop(0, 'rgba(255,225,170,0.10)'); g.addColorStop(1, 'rgba(255,240,205,0.20)');
  ctx.fillStyle = g; ctx.fillRect(xmin, gy, W, DESIGN.h - gy + 8);
  softBand(ctx, xmin, gy, W, 30, 0.42);
  return true;
}
