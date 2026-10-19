// Fırın & Kafe — the hero building. Drawn on its own so the scene can animate it as one sprite.
import { DESIGN, TEXT } from '../config.js';
import { drawAsset } from '../assets.js';
import { INK, rrect, poly, paint, vgrad, hgrad } from '../util.js';
import {
  tiledRoof, brickWall, quoins, doorway, beam, awning, signBoard, shopWindow, garland, bush, hangingLamp,
  iconBread, iconCup,
} from '../scene/parts.js';

const B = DESIGN.baseY;

export const bakery = {
  id: 'bakery',
  // Whole building (roof to doorstep) is the tap target.
  bounds: { x: 398, y: 160, w: 612, h: B - 160 + 28 },
  pivot: { x: 704, y: B },
  doorX: 700,
  // lights: [x, y, radius]
  lights: [[497, 452, 50], [600, 452, 50], [700, 452, 50], [800, 452, 50], [905, 452, 50], [547, 505, 70], [852, 505, 70]],
  steamCups: [],

  draw(ctx) {
    const b = this.bounds;
    if (drawAsset(ctx, 'bakery', b.x, b.y, b.w, b.h)) return;

    // chimneys sit behind the roofs
    chimney(ctx, 506, 150, 44, 140);
    chimney(ctx, 936, 214, 44, 100);

    // right wing roof then main gable
    tiledRoof(ctx, [[782, 372], [900, 262], [1008, 372]], { seed: 11 });
    tiledRoof(ctx, [[396, 376], [608, 168], [826, 376]], { seed: 7 });

    // dormer window
    poly(ctx, [[574, 300], [608, 252], [642, 300]]); paint(ctx, '#c64a2a', 2.5);
    rrect(ctx, 582, 288, 52, 50, 3); paint(ctx, '#f3deae', 2.5);
    rrect(ctx, 590, 296, 36, 34, 2); paint(ctx, vgrad(ctx, 296, 330, [[0, '#ffe7a0'], [1, '#f4a43c']]), 2);
    ctx.fillStyle = '#7a4824'; ctx.fillRect(606, 296, 4, 34); ctx.fillRect(590, 311, 36, 4);

    // stone wall + timber frame
    brickWall(ctx, 424, 372, 560, B - 372, { seed: 21 });
    quoins(ctx, 424, 384, B - 384, 1);
    quoins(ctx, 984, 384, B - 384, -1);
    beam(ctx, 418, 366, 572, 12);
    beam(ctx, 418, B - 10, 572, 12);
    for (const x of [418, 612, 786, 978]) beam(ctx, x, 366, 12, B - 366 + 2);
    // decorative cross braces in the upper wall
    ctx.strokeStyle = '#6a3d1c'; ctx.lineWidth = 7;
    for (const [x0, x1] of [[430, 530], [880, 978]]) {
      ctx.beginPath(); ctx.moveTo(x0, 380); ctx.lineTo(x1, 396); ctx.stroke();
    }

    // upper-left small window on the stone wall (left of the shopfront)

    // sign + vines
    garland(ctx, 410, 990, 318, { sag: 16, hang: 14, seed: 31, thick: 1.3 });
    signBoard(ctx, 505, 330, 410, 72, TEXT.bakery, { size: 44, left: iconBread, right: iconCup });

    // shopfront
    shopWindow(ctx, 466, 462, 150, 98, 'bread', 41, { valance: '#d6382e' });
    shopWindow(ctx, 784, 462, 150, 98, 'bread', 43, { valance: '#d6382e' });
    // door
    doorway(ctx, 636, 450, 128, 126, { frame: '#6a3d1c', panel: '#8a5028' });
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(0, 0, 0, 0);
    rrect(ctx, 676, 470, 48, 16, 4); paint(ctx, vgrad(ctx, 470, 486, [[0, '#e0483a'], [1, '#a82a20']]), 1.8);
    ctx.fillStyle = '#fff'; ctx.font = '700 10px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('AÇIK', 700, 478.5);

    // awning with lanterns underneath
    awning(ctx, 452, 406, 496, 46, '#d6382e', '#fff3d6', 16);
    for (const x of [497, 600, 700, 800, 905]) hangingLamp(ctx, x, 462, 1);

    // wall planters under the windows
    for (const [x, s] of [[541, 51], [859, 53]]) bush(ctx, x, 566, 150, 28, s);
  },
};

function chimney(ctx, x, y, w, h) {
  rrect(ctx, x, y, w, h, 3);
  paint(ctx, brickFill(ctx, x, w), 2.6);
  rrect(ctx, x - 6, y - 8, w + 12, 14, 3); paint(ctx, '#c9a56c', 2.4);
  ctx.strokeStyle = 'rgba(90,50,10,.5)'; ctx.lineWidth = 1.2;
  for (let yy = y + 10; yy < y + h; yy += 14) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
}
function brickFill(ctx, x, w) { return hgrad(ctx, x, x + w, [[0, '#f0d6a2'], [1, '#c79e62']]); }
