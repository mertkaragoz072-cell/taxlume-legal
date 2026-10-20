// Walk-cycle sprite sheets (one horizontal strip per character, all frames face right, feet on the bottom edge).
// Sheets live in assets/characters/ and are registered in assets.js as 'char-<id>'.
import { getImage } from '../assets.js';
import { shadow } from '../util.js';

export const SHEETS = {
  boy_backpack: { frames: 8, w: 109, h: 161 },
  girl_basket: { frames: 7, w: 118, h: 165 },
  oldman: { frames: 7, w: 110, h: 156 },
  boy_cap: { frames: 7, w: 97, h: 165 },
  girl_hat: { frames: 8, w: 104, h: 165 },
  girl_red: { frames: 8, w: 109, h: 162 },
  grandma: { frames: 8, w: 99, h: 158 },
  chef: { frames: 8, w: 143, h: 173 },
  waiter: { frames: 8, w: 112, h: 165 },
};

const SCALE = 0.9; // native sprite px -> design px (a street character ends up ~150 px tall; the cafe scales people up further, see PERSON_SCALE)

export const hasSprite = (id) => !!getImage(`char-${id}`);

/** Draws frame `floor(t*fps+phase)` of the sheet with the feet at (x, y). Returns false when the sheet is not loaded. */
export function drawSprite(ctx, id, x, y, t, { dir = 1, fps = 7, phase = 0, scale = 1, frame = null, bob = 0 } = {}) {
  const img = getImage(`char-${id}`), m = SHEETS[id];
  if (!img || !m) return false;
  const f = frame ?? ((Math.floor(t * fps + phase) % m.frames) + m.frames) % m.frames;   // `frame` freezes the pose (standing)
  const s = SCALE * scale, dw = m.w * s, dh = m.h * s;
  shadow(ctx, x, y + 1, dw * 0.28, 4.5, 0.32);
  ctx.save();
  ctx.translate(x, y);
  if (bob && frame !== null) ctx.scale(1, 1 + Math.sin(t * 2.2 + phase * 1.7) * bob);   // standing pose breathes a little (bob = relative height change)
  ctx.scale(dir, 1);
  ctx.drawImage(img, f * m.w, 0, m.w, m.h, -dw / 2, -dh + 2, dw, dh);
  ctx.restore();
  return true;
}
