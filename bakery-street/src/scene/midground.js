// Props that sit between the shop fronts and the walking lane (static, cached into one layer).
import { DESIGN } from '../config.js';
import { rng } from '../util.js';
import { bakery } from '../buildings/bakery.js';
import {
  planter, lampPost, chalkboard, crate, sack, milkBottle, eggCrate, barrel, bush, tiledRoof, brickWall, awning, shopWindow, beam,
} from './parts.js';

const B = DESIGN.baseY;

/** Returns lamp-top positions so the scene can add animated glow. */
/** Street lamps flanking the bakery; with the final art they sit behind its umbrellas. */
export function drawLamps(ctx) {
  const art = bakery.usesAsset;
  return [lampPost(ctx, art ? 322 : 392, B + 24, 290), lampPost(ctx, art ? 1078 : 1020, B + 24, 290)];
}

export function drawMidground(ctx, v) {
  const art = bakery.usesAsset;
  const lamps = art ? [] : drawLamps(ctx);

  if (!art) { // the final bakery art already includes its own chalkboard, planters and tables
    chalkboard(ctx, 572, B + 22, 64, 92, 'cup');
    chalkboard(ctx, 830, B + 22, 64, 92, 'bread');
    planter(ctx, 400, B + 20, 46, 28, { seed: 301, kind: 'box', bushH: 46 });
    planter(ctx, 992, B + 20, 46, 28, { seed: 302, kind: 'box', bushH: 46 });
    planter(ctx, 640, B + 20, 34, 26, { seed: 303, kind: 'pot', bushH: 34 });
    planter(ctx, 762, B + 20, 34, 26, { seed: 304, kind: 'pot', bushH: 34 });
  }
  planter(ctx, 100, B + 20, 52, 28, { seed: 305, kind: 'box', bushH: 44 });
  planter(ctx, 250, B + 20, 44, 26, { seed: 306, kind: 'pot', bushH: 38 });

  // market goods
  const my = B + 14;
  barrel(ctx, 1072, my + 6, 40, 46);
  crate(ctx, 1066, my - 46, 52, 24, 'greens', 311);
  crate(ctx, 1118, my, 54, 26, 'oranges', 312);
  crate(ctx, 1176, my, 54, 26, 'apples', 313);
  crate(ctx, 1234, my, 54, 26, 'tomato', 314);
  crate(ctx, 1290, my + 4, 50, 22, 'pears', 315);
  crate(ctx, 1176, my - 26, 50, 22, 'lemons', 316);
  eggCrate(ctx, 1122, my - 26, 46, 18, 317);
  for (const [x, s] of [[1106, 1], [1120, 1.05], [1134, 1]]) milkBottle(ctx, x, my - 44, s);
  sack(ctx, 1338, my + 10, 58, 62);
  sack(ctx, 1368, my + 12, 48, 50);
  planter(ctx, 1244, my + 30, 32, 24, { seed: 318, kind: 'pot', bushH: 30 });
  return lamps;
}
