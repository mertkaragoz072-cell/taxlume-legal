// Walk-cycle sprite sheets (one horizontal strip per character, all frames face right, feet on the bottom edge).
// Sheets live in assets/characters/ and are registered in assets.js as 'char-<id>'.
import { getImage } from '../assets.js';
import { shadow } from '../util.js';

export const SHEETS = {
  boy_backpack: { frames: 1, w: 83, h: 142 },
  girl_basket: { frames: 1, w: 127, h: 170 },
  oldman: { frames: 1, w: 110, h: 163 },
  boy_cap: { frames: 1, w: 96, h: 171 },
  boy_redcap: { frames: 1, w: 101, h: 164 },
  girl_glasses: { frames: 1, w: 97, h: 159 },
  girl_red: { frames: 1, w: 114, h: 147 },
  grandma: { frames: 1, w: 101, h: 163 },
  chef: { frames: 8, w: 143, h: 173 },
  waiter: { frames: 8, w: 112, h: 165 },
};

const SCALE = 0.9; // native sprite px -> design px (a street character ends up ~150 px tall; the cafe scales people up further, see PERSON_SCALE)

export const hasSprite = (id) => !!getImage(`char-${id}`);

/** Draws frame `floor(t*fps+phase)` of the sheet with the feet at (x, y). Returns false when the sheet is not loaded. */
export function drawSprite(ctx, id, x, y, t, { dir = 1, fps = 7, phase = 0, scale = 1, frame = null, bob = 0, sway = 0, shade = true } = {}) {
  const img = getImage(`char-${id}`), m = SHEETS[id];
  if (!img || !m) return false;
  const f = m.frames === 1 ? 0 : frame ?? ((Math.floor(t * fps + phase) % m.frames) + m.frames) % m.frames;   // `frame` freezes the pose (standing)
  const walking = m.frames === 1 && frame === null;          // one-picture characters: the walk is made by moving the picture (bounce, lean, squash)
  const s = SCALE * scale, dw = m.w * s, dh = m.h * s;
  if (shade) shadow(ctx, x, y + 1, dw * 0.28, 4.5, 0.32);
  ctx.save();
  ctx.translate(x, y);
  if (bob && frame !== null) ctx.scale(1, 1 + Math.sin(t * 2.2 + phase * 1.7) * bob);   // standing pose breathes a little (bob = relative height change)
  if (sway) ctx.rotate(Math.sin(t * 3.1 + phase) * sway);     // a working lean: the standing pose rocks gently around the feet
  let lift = 0;
  if (walking) {
    const ph = t * fps * Math.PI + phase * 1.3, step = Math.abs(Math.sin(ph));            // two bounces per cycle, like footfalls
    lift = step * 4.5 * s;
    ctx.rotate(Math.sin(ph) * 0.045);                                                    // the body leans with each step
    ctx.scale(1 + (0.5 - step) * 0.035, 1 - (0.5 - step) * 0.05);                         // squash on contact, stretch in the air
  }
  ctx.scale(dir, 1);
  const sw = img.naturalWidth / m.frames, sh = img.naturalHeight;
  ctx.drawImage(img, f * sw, 0, sw, sh, -dw / 2, -dh + 2 - lift, dw, dh);
  ctx.restore();
  return true;
}
