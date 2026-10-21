// Walk-cycle sprite sheets (one horizontal strip per character, all frames face right, feet on the bottom edge).
// Sheets live in assets/characters/ and are registered in assets.js as 'char-<id>'.
import { getImage } from '../assets.js';
import { shadow } from '../util.js';

export const SHEETS = {
  boy_backpack: { frames: 6, w: 84, h: 143, views: true },
  girl_basket: { frames: 6, w: 117, h: 172, views: true },
  oldman: { frames: 6, w: 102, h: 164, views: true },
  boy_cap: { frames: 6, w: 108, h: 172, views: true },
  boy_redcap: { frames: 6, w: 97, h: 165, views: true },
  girl_glasses: { frames: 6, w: 106, h: 160, views: true },
  girl_red: { frames: 6, w: 117, h: 148, views: true },
  grandma: { frames: 6, w: 111, h: 164, views: true },
  // staff: true = chef and waiter sheet: 0 stand, 1 stand carrying, 2-3 walk carrying (front), 4 back, 5 side (carrying)
  chef: { frames: 6, w: 92, h: 164, staff: true },
  waiter: { frames: 6, w: 92, h: 163, staff: true },
};

const SCALE = 0.9; // native sprite px -> design px (a street character ends up ~150 px tall; the cafe scales people up further, see PERSON_SCALE)

export const hasSprite = (id) => !!getImage(`char-${id}`);

/** Draws frame `floor(t*fps+phase)` of the sheet with the feet at (x, y). Returns false when the sheet is not loaded. */
export function drawSprite(ctx, id, x, y, t, { dir = 1, fps = 7, phase = 0, scale = 1, frame = null, bob = 0, sway = 0, shade = true, bounce = false, back = false, view = 'side', carry = true, bobRate = 2.2 } = {}) {
  const img = getImage(`char-${id}`), m = SHEETS[id];
  if (!img || !m) return false;
  const base = m.views && back ? 3 : 0;   // sheets with views: frames 3-5 show the character from behind
  const seq = m.views ? [1, 0, 2, 0].map((i) => base + i) : m.cycle ?? Array.from({ length: m.frames }, (_, i) => i);
  let staffMove = false, f0 = null;
  if (m.staff) {   // the staff sheet has a front walk (2-3), a back view (4) and a side view (5); an empty-handed waiter uses the plain standing frame
    const rest = carry ? 1 : 0;
    staffMove = frame === null;
    f0 = !staffMove ? (frame === 3 ? 1 : rest) : view === 'back' ? (carry ? 4 : 0) : view === 'side' ? (carry ? 5 : 0) : carry ? [2, 1, 3, 1][((Math.floor(t * fps + phase) % 4) + 4) % 4] : 0;
  }
  const f = m.staff ? f0 : m.frames === 1 ? 0 : m.views && frame !== null ? base : frame ?? seq[((Math.floor(t * fps + phase) % seq.length) + seq.length) % seq.length];   // `frame` freezes the pose (standing)
  const walking = (m.frames === 1 && frame === null) || bounce || (staffMove && view !== 'front') || (m.views && frame === null);   // views sheets have real steps, so only `bounce` (waiting in place) moves them          // one-picture characters: the walk is made by moving the picture (bounce, lean, squash)
  const s = SCALE * scale, dw = m.w * s, dh = m.h * s;
  if (shade) shadow(ctx, x, y + 1, dw * 0.3, 5.5, 0.34);
  ctx.save();
  ctx.translate(x, y);
  if (bob && frame !== null) ctx.scale(1, 1 + Math.sin(t * bobRate + phase * 1.7) * bob);   // standing pose breathes a little (bob = relative height change)
  if (sway) ctx.rotate(Math.sin(t * 3.1 + phase) * sway);     // a working lean: the standing pose rocks gently around the feet
  let lift = 0;
  if (walking) {
    const ph = t * fps * Math.PI + phase * 1.3, step = Math.abs(Math.sin(ph));            // two bounces per cycle, like footfalls
    const amp = m.views ? 0.6 : 1;                         // real step frames need less faking
    lift = step * 4.5 * s * amp;
    ctx.rotate(Math.sin(ph) * 0.045 * amp);                                                    // the body leans with each step
    ctx.scale(1 + (0.5 - step) * 0.035, 1 - (0.5 - step) * 0.05);                         // squash on contact, stretch in the air
  }
  ctx.scale(dir, 1);
  const sw = img.naturalWidth / m.frames, sh = img.naturalHeight;
  ctx.drawImage(img, f * sw, 0, sw, sh, -dw / 2, -dh + 2 - lift, dw, dh);
  ctx.restore();
  return true;
}
