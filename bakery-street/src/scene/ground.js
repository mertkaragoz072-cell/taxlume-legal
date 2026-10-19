// Flat, front-on ground built from the supplied stone-slab art: curb blocks on top, brick face below,
// then repeating brick courses down to the bottom of the screen. No perspective plane, so it reads as ground level.
import { DESIGN } from '../config.js';
import { getImage } from '../assets.js';
import { softBand } from '../util.js';

const S = 1.25;          // art scale
const LIP_Y = 60;        // native y where the front row of curb blocks begins (just under the paving plane)
const COURSE_Y = 143, COURSE_H = 33; // a plain brick course used to extend the wall downward

/** Returns false when the art is missing so the procedural pavement can take over. */
export function drawGround(ctx, v) {
  const A = getImage('ground-walk-a'), B = getImage('ground-walk-b');
  if (!A || !B) return false;
  const xmin = -v.ox - 20, xmax = DESIGN.w + v.ox + 20, W = xmax - xmin;
  const imgs = [A, B], gy = DESIGN.groundY;

  // backing colour so no gaps show between strips
  ctx.fillStyle = '#5a3a20';
  ctx.fillRect(xmin, gy, W, DESIGN.h - gy + 8);

  const rowFrom = (y, sy, sh, shift) => {
    let x = xmin - shift;
    for (let i = 0; x < xmax; i++) {
      const im = imgs[i % 2], w = im.naturalWidth * S;
      ctx.drawImage(im, 0, sy, im.naturalWidth, sh, x, y, w + 1, sh * S);
      x += w;
    }
  };
  // curb blocks + first brick face (native y LIP_Y .. bottom)
  const topH = (A.naturalHeight - LIP_Y);
  rowFrom(gy, LIP_Y, topH, 0);
  // brick courses down to the bottom of the screen, offset each row like a running bond
  let y = gy + topH * S - 2, row = 1;
  while (y < DESIGN.h + 12) {
    rowFrom(y, COURSE_Y, COURSE_H, (row % 2) * 150 + row * 37);
    y += COURSE_H * S - 1; row++;
  }
  // depth shading: darker toward the bottom of the screen
  const g = ctx.createLinearGradient(0, gy, 0, DESIGN.h);
  g.addColorStop(0, 'rgba(30,15,5,0)'); g.addColorStop(1, 'rgba(25,12,4,0.38)');
  ctx.fillStyle = g; ctx.fillRect(xmin, gy, W, DESIGN.h - gy + 8);
  softBand(ctx, xmin, gy - 14, W, 14, 0.18, true); // faint grounding shadow where the shops meet the ground
  return true;
}
