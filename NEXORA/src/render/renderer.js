import { View } from '../core/view.js';
import { rand } from '../core/util.js';
import { state } from '../game/state.js';
import { visible, groundBounce } from './draw.js';
import { drawSky, drawPlanet, drawForeground, drawGrade } from './world.js';
import { drawPlayer, drawEnemy } from './characters.js';
import { drawCoin, drawSlash, drawText, drawHitFx, drawSkillFx, drawRing, drawTelegraph, drawParticles, drawHurtFlash } from './effects.js';

// Aktörler (düşman+oyuncu) ayrı katmana çizilir; ayaklarına zemin tonu işlenip ana tuvale bindirilir (zemine oturma hissi).
let layer = null;
function actorsLayer() {
  const w = Math.round(View.w * View.dpr), h = Math.round(View.h * View.dpr);
  if (!layer || layer.width !== w || layer.height !== h) { layer = document.createElement('canvas'); layer.width = w; layer.height = h; layer.g = layer.getContext('2d'); }
  return layer;
}

// Çizim sırası: gökyüzü/parallax → gezegen+arka dekor → coin → düşman → oyuncu → slash → ön plan dekoru → yazılar
export function render(ctx) {
  ctx.setTransform(View.dpr, 0, 0, View.dpr, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';    // resize sonrası canvas durumu sıfırlanır; her karede garanti et
  ctx.save();
  const sh = state.shake > 0 ? [rand(-state.shake, state.shake) * 0.5, rand(-state.shake, state.shake) * 0.5] : [0, 0];
  ctx.translate(sh[0], sh[1]);
  drawSky(ctx);
  drawPlanet(ctx);
  for (const t of state.telegraphs) if (visible(t.a)) drawTelegraph(ctx, t);
  for (const c of state.coins) if (visible(c.a)) drawCoin(ctx, c);
  // aynı şeritte: sağdakiler (uzak) önce, yakındakiler üstüne çizilir
  const lc = actorsLayer(), lg = lc.g;
  const by0 = Math.max(0, Math.floor(View.heroY - 340 * View.scale)), bh = Math.min(View.h, Math.ceil(View.heroY + 140 * View.scale)) - by0;   // yalnız aktörlerin bulunduğu yatay bant temizlenir/bindirilir (performans)
  lg.setTransform(View.dpr, 0, 0, View.dpr, 0, 0); lg.clearRect(0, by0 - 8, View.w, bh + 16);
  lg.imageSmoothingEnabled = true; lg.imageSmoothingQuality = 'high';
  for (const en of state.enemies.slice().sort((p, q) => q.a - p.a)) if (visible(en.a)) { drawEnemy(lg, en); if (!en.dead) groundBounce(lg, en.a, (en.def.width || 80) * 0.8, en.def.boss ? 120 : 70); }
  drawPlayer(lg); groundBounce(lg, state.player.a, 70, 80);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); { const d = View.dpr, y = Math.max(0, Math.round((by0 - 8) * d)), hh = Math.min(lc.height - y, Math.round((bh + 16) * d)); ctx.drawImage(lc, 0, y, lc.width, hh, sh[0] * d, y + sh[1] * d, lc.width, hh); } ctx.restore();
  for (const s of state.slashes) drawSlash(ctx, s);
  for (const g of state.rings) drawRing(ctx, g);
  for (const f of state.skillFx) if (visible(f.a + (f.type === 'wave' ? f.dir * f.x / 2000 : 0))) drawSkillFx(ctx, f);
  for (const f of state.hitFx) if (visible(f.a)) drawHitFx(ctx, f);
  for (const pt of state.particles) if (visible(pt.a)) drawParticles(ctx, pt);
  drawForeground(ctx);
  drawGrade(ctx);
  for (const t of state.texts) if (visible(t.a)) drawText(ctx, t);
  ctx.restore();
  if (state.hurtFlash > 0) drawHurtFlash(ctx, View.w, View.h, state.hurtFlash / 0.28);
}
