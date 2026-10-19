// Market — right of the bakery. Counter goods live in market-front.js so they draw in front of the walkway props.
import { DESIGN, TEXT } from '../config.js';
import { drawAsset, getImage } from '../assets.js';
import { rrect, paint, vgrad, hgrad, shadow, INK } from '../util.js';
import { tiledRoof, plasterWall, beam, awning, signBoard, shopWindow, garland, bush, hangingLamp, iconBasket } from '../scene/parts.js';
import { drawPerson } from '../characters/person.js';
import { SHOPKEEPER } from '../characters/crowd.js';

const B = DESIGN.baseY;

export const market = {
  id: 'market',
  bounds: { x: 1030, y: 236, w: 352, h: B - 236 },
  lights: [[1090, 468, 46], [1210, 468, 46], [1330, 468, 46]],
  usesAsset: false,

  /** Call after assets load: size/position the building from the final art's aspect ratio. */
  configure() {
    const img = getImage('market');
    if (!img) return;
    const w = 470, h = Math.round((w * img.naturalHeight) / img.naturalWidth), bottom = 600;
    this.usesAsset = true;
    this.bounds = { x: 1240 - w / 2, y: bottom - h, w, h };
    this.lights = []; // lamps and shelves are already lit in the art
  },

  draw(ctx) {
    const b = this.bounds;
    if (drawAsset(ctx, 'market', b.x, b.y, b.w, b.h)) return;
    tiledRoof(ctx, [[1026, 322], [1100, 244], [1318, 244], [1386, 322]], { seed: 81 });
    plasterWall(ctx, 1044, 318, 322, B - 318);
    beam(ctx, 1038, 314, 334, 12);
    beam(ctx, 1038, B - 10, 334, 12);
    for (const x of [1038, 1360]) beam(ctx, x, 314, 12, B - 314);
    garland(ctx, 1046, 1366, 330, { sag: 12, hang: 12, seed: 83, thick: 1.2 });
    signBoard(ctx, 1088, 344, 240, 58, TEXT.market, { size: 36, left: iconBasket });
    // open storefront with shelves
    shopWindow(ctx, 1068, 462, 276, 100, 'goods', 85, { valance: '#2f8a4a' });
    // shopkeeper behind the counter
    drawPerson(ctx, 1210, 566, SHOPKEEPER, 0);
    awning(ctx, 1052, 410, 310, 44, '#2f8a4a', '#fff3d6', 12);
    for (const x of [1090, 1210, 1330]) hangingLamp(ctx, x, 462, 0.9);
    // counter
    rrect(ctx, 1150, 542, 140, 34, 3); paint(ctx, vgrad(ctx, 542, 576, [[0, '#c08a52'], [1, '#8a5a30']]), 2.4);
    ctx.fillStyle = 'rgba(255,235,190,.3)'; ctx.fillRect(1154, 545, 132, 3);
    // hanging round basket sign on a bracket
    ctx.strokeStyle = INK; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(1368, 396); ctx.lineTo(1396, 396); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1392, 396); ctx.lineTo(1392, 410); ctx.stroke();
    ctx.beginPath(); ctx.arc(1392, 432, 22, 0, 7); paint(ctx, vgrad(ctx, 410, 454, [[0, '#6a3d1c'], [1, '#4a2a12']]), 3);
    iconBasket(ctx, 1392, 432, 30);
  },
};
