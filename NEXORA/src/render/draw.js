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

// Zemin gölgesi (ayakların altında): geniş yumuşak gölge + ayakların hemen altında koyu temas gölgesi (ambient occlusion).
// Sol-üstteki güneşe göre gölge hafif sağa kayar. Renk zemin tonunda koyu yeşil-kahve (siyah değil).
export function groundShadow(ctx, w, alpha = 0.28) {
  alpha = Math.min(0.9, alpha * 2.1);
  const oval = (rw, a0, a1, dx) => {
    ctx.save(); ctx.translate(dx, -3); ctx.scale(1, 0.3);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rw / 2);
    g.addColorStop(0, `rgba(22,26,6,${a0})`); g.addColorStop(0.65, `rgba(22,26,6,${a1})`); g.addColorStop(1, 'rgba(22,26,6,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rw / 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  };
  oval(w * 1.25, alpha * 0.55, alpha * 0.28, w * 0.1);          // geniş, hafif sağa kayan gölge
  oval(w * 0.62, alpha, alpha * 0.55, 0);                        // sıkı temas gölgesi
}

// Zemin yansıması: karakterin alt kısmına zeminin yeşil/toprak tonunu "source-atop" ile karıştırır (karakter zemine ait görünür).
// Yalnızca ayrı katmana (renderer.js actors layer) çizilmiş aktörlerin piksellerine işler.
export function groundBounce(ctx, a, halfW = 80, rise = 70) {
  onLane(ctx, a, 0, 0, () => {
    ctx.globalCompositeOperation = 'source-atop';
    const g = ctx.createLinearGradient(0, -rise, 0, 6);
    g.addColorStop(0, 'rgba(120,150,50,0)'); g.addColorStop(0.55, 'rgba(120,150,50,.10)'); g.addColorStop(1, 'rgba(96,112,36,.34)');
    ctx.fillStyle = g; ctx.fillRect(-halfW, -rise, halfW * 2, rise + 6);
    ctx.globalCompositeOperation = 'source-over';
  });
}

export const visible = (a) => {
  const d = wrapAngle(a - state.player.a);
  return d > -View.spanLeft && d < View.spanRight;
};

export function outlined(ctx, lw = 3) { ctx.lineWidth = lw; ctx.strokeStyle = outline(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
