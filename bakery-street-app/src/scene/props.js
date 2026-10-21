// Placed street props drawn from the supplied furniture art (assets/props/*.webp, keys 'prop-<name>').
import { getImage } from '../assets.js';
import { shadow } from '../util.js';

/** Draw prop `name` with its feet at (x, footY), scaled to `height` design px tall. Returns false when the art is missing. */
export function drawProp(ctx, name, x, footY, height, { flip = false, shade = true } = {}) {
  const img = getImage(`prop-${name}`);
  if (!img) return false;
  const h = height, w = (img.naturalWidth / img.naturalHeight) * h;
  if (shade) shadow(ctx, x, footY - 2, w * 0.46, Math.max(3, h * 0.045), 0.3);
  ctx.save();
  ctx.translate(x, footY);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();
  return true;
}

export const hasProps = () => !!getImage('prop-bench_iron');
