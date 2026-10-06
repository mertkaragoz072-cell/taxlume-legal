import { View } from '../core/view.js';
import { rand } from '../core/util.js';
import { state } from '../game/state.js';
import { visible } from './draw.js';
import { drawSky, drawPlanet, drawForeground } from './world.js';
import { drawPlayer, drawEnemy } from './characters.js';
import { drawCoin, drawSlash, drawText, drawHitFx, drawSkillFx, drawRing } from './effects.js';

// Çizim sırası: gökyüzü/parallax → gezegen+arka dekor → coin → düşman → oyuncu → slash → ön plan dekoru → yazılar
export function render(ctx) {
  ctx.setTransform(View.dpr, 0, 0, View.dpr, 0, 0);
  ctx.save();
  if (state.shake > 0) ctx.translate(rand(-state.shake, state.shake) * 0.5, rand(-state.shake, state.shake) * 0.5);
  drawSky(ctx);
  drawPlanet(ctx);
  for (const c of state.coins) if (visible(c.a)) drawCoin(ctx, c);
  // aynı şeritte: sağdakiler (uzak) önce, yakındakiler üstüne çizilir
  for (const en of state.enemies.slice().sort((p, q) => q.a - p.a)) if (visible(en.a)) drawEnemy(ctx, en);
  drawPlayer(ctx);
  for (const s of state.slashes) drawSlash(ctx, s);
  for (const g of state.rings) drawRing(ctx, g);
  for (const f of state.skillFx) if (visible(f.a + (f.type === 'wave' ? f.dir * f.x / 2000 : 0))) drawSkillFx(ctx, f);
  for (const f of state.hitFx) if (visible(f.a)) drawHitFx(ctx, f);
  drawForeground(ctx);
  for (const t of state.texts) if (visible(t.a)) drawText(ctx, t);
  ctx.restore();
}
