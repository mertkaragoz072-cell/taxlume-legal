import { CONFIG } from '../core/config.js';
import { View } from '../core/view.js';
import { wrapAngle } from '../core/util.js';
import { state } from '../game/state.js';

export const outline = () => CONFIG.planet.colors.outline;

// Yüzeydeki bir noktaya (dünya açısı a, yükseklik h) yerel koordinat sistemi kurar.
// Yerel: y yukarı = -y, ayaklar y=0.
export function onSurface(ctx, a, h, extraRot, fn) {
  const sa = a - state.player.a + View.heroAngle;
  ctx.save();
  ctx.translate(View.cx, View.cy);
  ctx.rotate(sa);
  ctx.translate(0, -(View.R + h * View.scale));
  if (extraRot) ctx.rotate(extraRot);
  ctx.scale(View.scale, View.scale);
  fn();
  ctx.restore();
}
export const visible = (a) => {
  const d = wrapAngle(a - state.player.a);
  return d > -View.spanLeft && d < View.spanRight;
};

export function outlined(ctx, lw = 3) { ctx.lineWidth = lw; ctx.strokeStyle = outline(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
