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
// Karakter/düşman/coin şeridi: yüzeyin (outline çizgisinin) biraz önünde, çimin üzerinde. Ayaklar çime basar.
export function onLane(ctx, a, h, extraRot, fn) { onSurface(ctx, a, h - CONFIG.camera.laneDepth, extraRot, fn); }

// Yumuşak zemin gölgesi (ayakların altında)
export function groundShadow(ctx, w, alpha = 0.28) {
  ctx.save(); ctx.scale(1, 0.22);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2);
  g.addColorStop(0, `rgba(20,40,20,${alpha})`); g.addColorStop(1, 'rgba(20,40,20,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

export const visible = (a) => {
  const d = wrapAngle(a - state.player.a);
  return d > -View.spanLeft && d < View.spanRight;
};

export function outlined(ctx, lw = 3) { ctx.lineWidth = lw; ctx.strokeStyle = outline(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
