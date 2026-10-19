// Kitapçı — left of the bakery.
import { DESIGN, TEXT } from '../config.js';
import { drawAsset, getImage } from '../assets.js';
import { rrect, paint, vgrad } from '../util.js';
import { tiledRoof, plankWall, doorway, beam, awning, signBoard, shopWindow, garland, bush, hangingLamp, iconBook } from '../scene/parts.js';

const B = DESIGN.baseY;

export const bookshop = {
  id: 'bookshop',
  bounds: { x: 26, y: 236, w: 352, h: B - 236 },
  lights: [[84, 468, 46], [180, 468, 46], [306, 468, 46]],
  usesAsset: false,

  /** Call after assets load: size/position the building from the final art's aspect ratio. */
  configure() {
    const img = getImage('bookshop');
    if (!img) return;
    const w = 415, h = Math.round((w * img.naturalHeight) / img.naturalWidth), bottom = 600;
    this.usesAsset = true;
    this.bounds = { x: 170 - w / 2, y: bottom - h, w, h };
    this.lights = []; // lamps and windows are already lit in the art
  },

  draw(ctx) {
    const b = this.bounds;
    if (drawAsset(ctx, 'bookshop', b.x, b.y, b.w, b.h)) return;
    tiledRoof(ctx, [[22, 320], [96, 242], [312, 242], [380, 320]], { seed: 71 });
    plankWall(ctx, 40, 316, 322, B - 316, { seed: 72 });
    beam(ctx, 34, 312, 334, 12);
    beam(ctx, 34, B - 10, 334, 12);
    for (const x of [34, 356]) beam(ctx, x, 312, 12, B - 312);
    garland(ctx, 42, 362, 328, { sag: 12, hang: 12, seed: 73, thick: 1.2 });
    signBoard(ctx, 62, 342, 280, 60, TEXT.bookshop, {
      plate: ['#5a3519', '#3e2410'], color: '#f6dd9a', size: 36, left: iconBook, gold: true,
    });
    shopWindow(ctx, 62, 462, 196, 100, 'books', 75);
    doorway(ctx, 280, 452, 70, 124, { frame: '#4e2c12', panel: '#6a3d1c' });
    awning(ctx, 48, 410, 310, 44, '#2f8a4a', '#58b567', 12);
    for (const x of [84, 180, 306]) hangingLamp(ctx, x, 462, 0.9);
    bush(ctx, 160, 568, 200, 26, 77);
  },
};
