import { CONFIG, ANIMS, HERO, SKILLS } from '../core/config.js';
import { Assets } from '../core/assets.js';
import { clamp } from '../core/util.js';
import { TAU } from '../core/util.js';
import { state } from '../game/state.js';
import { onLane, outline, outlined } from './draw.js';

export function drawCoin(ctx, c) {
  onLane(ctx, c.a, c.h, 0, () => {
    const w = Math.abs(Math.cos(c.spin)) * 7 + 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, w, 7, 0, 0, TAU); ctx.fillStyle = '#ffd23f'; ctx.fill(); outlined(ctx, 2);
    ctx.beginPath(); ctx.ellipse(-w * 0.25, -2, w * 0.3, 2.5, 0, 0, TAU); ctx.fillStyle = '#fff6a8'; ctx.fill();
  });
}

export function drawSlash(ctx, s) {
  if (Assets.get(HERO.id + '_' + (ANIMS.hero?.animations.attack_1?.frames[0] || ANIMS.hero?.animations.attack?.frames[0] || ''))) return; // sprite karelerinde efekt zaten var

  const t = 1 - s.life / s.max;
  onLane(ctx, state.player.a, 0, state.player.lean, () => {
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
  onLane(ctx, t.a, t.h, 0, () => {
    ctx.globalAlpha = clamp(t.life / t.max * 1.5, 0, 1);
    const big = t.text === 'LEVEL UP!';
    ctx.font = `900 ${Math.round((big ? 28 : 24) * (t.scale || 1))}px "Trebuchet MS", sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = outline(); ctx.lineJoin = 'round';
    ctx.strokeText(t.text, t.ox, 0); ctx.fillStyle = t.color; ctx.fillText(t.text, t.ox, 0);
    ctx.globalAlpha = 1;
  });
}

// Vuruş kıvılcımı: düşmanın gövdesinde, düşmanın boyutuna göre ölçeklenir (sprite varsa mavi yıldız patlaması)
export function drawHitFx(ctx, f) {
  const t = 1 - f.life / f.max, img = Assets.get('fx_effect_weapon_starburst');
  onLane(ctx, f.a, f.h, 0, () => {
    ctx.globalAlpha = 1 - t * t;
    const k = f.k * (0.55 + t * 0.5);
    if (img) ctx.drawImage(img, -img.width * k / 2, -img.height * k / 2, img.width * k, img.height * k);
    else { ctx.beginPath(); ctx.arc(0, 0, 14 * k, 0, TAU); ctx.fillStyle = '#9fe0ff'; ctx.fill(); }
    ctx.globalAlpha = 1;
  });
}

// Yetenek efektleri: wave = ileri giden mavi hilal (dünya açısında ilerler), burst = yerde patlama kareleri
export function drawSkillFx(ctx, f) {
  const sk = SKILLS[f.id], R = CONFIG.planet.radius;
  if (f.type === 'wave') {
    const img = Assets.get(sk.fx); if (!img) return;
    const a = f.a + f.dir * f.x / R, k = sk.fxHeight / img.height, fade = 1 - Math.pow(Math.min(1, f.t / f.life), 3);
    onLane(ctx, a, 38, 0, () => {
      ctx.scale(f.dir, 1); ctx.globalAlpha = fade;
      for (let i = 3; i >= 0; i--) { ctx.globalAlpha = fade * (i === 0 ? 1 : 0.18 * (4 - i)); ctx.drawImage(img, -img.width * k * 0.5 - i * 14, -img.height * k * 0.5, img.width * k, img.height * k); }
      ctx.globalAlpha = 1;
    });
  } else {
    const n = sk.fxFrames.length, i = Math.min(n - 1, Math.floor(f.t / f.life * n)), img = Assets.get(sk.fxFrames[i]); if (!img) return;
    const k = (sk.radius * 1.9) / img.width;
    onLane(ctx, f.a, 0, 0, () => { ctx.globalAlpha = 1 - Math.pow(f.t / f.life, 6); ctx.drawImage(img, -img.width * k / 2, -img.height * k + 8, img.width * k, img.height * k); ctx.globalAlpha = 1; });
  }
}
