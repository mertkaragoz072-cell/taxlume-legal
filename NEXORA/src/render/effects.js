import { CONFIG, ANIMS } from '../core/config.js';
import { Assets } from '../core/assets.js';
import { clamp } from '../core/util.js';
import { TAU } from '../core/util.js';
import { state } from '../game/state.js';
import { onSurface, outline, outlined } from './draw.js';

export function drawCoin(ctx, c) {
  onSurface(ctx, c.a, c.h, 0, () => {
    const w = Math.abs(Math.cos(c.spin)) * 7 + 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, w, 7, 0, 0, TAU); ctx.fillStyle = '#ffd23f'; ctx.fill(); outlined(ctx, 2);
    ctx.beginPath(); ctx.ellipse(-w * 0.25, -2, w * 0.3, 2.5, 0, 0, TAU); ctx.fillStyle = '#fff6a8'; ctx.fill();
  });
}

export function drawSlash(ctx, s) {
  if (Assets.get('male_' + (ANIMS.male?.animations.attack_1?.frames[0] || ''))) return; // sprite karelerinde efekt zaten var

  const t = 1 - s.life / s.max;
  onSurface(ctx, state.player.a, 0, state.player.lean, () => {
    ctx.scale(s.dir, 1); ctx.translate(18, -30);
    const r = CONFIG.player.attackRange * 0.9;
    ctx.globalAlpha = 1 - t * t;
    ctx.beginPath(); ctx.arc(0, 0, r, -1.1 + t * 1.4, -0.1 + t * 1.4);
    ctx.arc(0, 0, r * 0.7, -0.1 + t * 1.4, -1.1 + t * 1.4, true); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#7ee7ff'; ctx.stroke();
    ctx.globalAlpha = 1;
  });
}

export function drawText(ctx, t) {
  onSurface(ctx, t.a, t.h, 0, () => {
    ctx.globalAlpha = clamp(t.life / t.max * 1.5, 0, 1);
    const big = t.text === 'LEVEL UP!';
    ctx.font = `900 ${big ? 28 : 26}px "Trebuchet MS", sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = outline(); ctx.lineJoin = 'round';
    ctx.strokeText(t.text, t.ox, 0); ctx.fillStyle = t.color; ctx.fillText(t.text, t.ox, 0);
    ctx.globalAlpha = 1;
  });
}
