import { CONFIG } from '../core/config.js';
import { Assets } from '../core/assets.js';
import { Input } from '../core/input.js';
import { TAU } from '../core/util.js';
import { state } from '../game/state.js';
import { onSurface, outlined, outline } from './draw.js';

function eyes(ctx, x, y, dir, big) {
  const r = big ? 4 : 3;
  for (const ex of [x - 5, x + 5]) {
    ctx.beginPath(); ctx.arc(ex, y, r, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); outlined(ctx, 1.5);
    ctx.beginPath(); ctx.arc(ex + dir * 1.2, y + 0.5, 1.6, 0, TAU); ctx.fillStyle = outline(); ctx.fill();
  }
}

export function drawPlayer(ctx) {
  const p = state.player;
  const step = Math.sin(p.walk) * (Math.abs(Input.axis) > 0 ? 1 : 0);
  const bob = Math.abs(Math.sin(p.walk)) * 2 * Math.abs(Input.axis);
  if (p.invuln > 0 && Math.floor(state.time * 20) % 2 === 0 && !state.over) ctx.globalAlpha = 0.55;
  onSurface(ctx, p.a, 0, p.lean, () => {
    const d = p.dir; ctx.scale(d, 1);
    ctx.translate(0, -bob);
    // gölge
    ctx.beginPath(); ctx.ellipse(0, bob + 1, 16, 4, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fill();
    // bacaklar
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.roundRect(s * 6 - 4 + step * s * 2, -12, 8, 12, 3);
      ctx.fillStyle = '#5b4bd1'; ctx.fill(); outlined(ctx, 2.5);
    }
    // kılıç (arka, sallanır)
    ctx.save(); ctx.translate(14, -22); ctx.rotate(p.atkTimer > CONFIG.player.attackCooldown - 0.15 ? 0.9 : -0.5);
    ctx.beginPath(); ctx.rect(-2, -26, 4, 24); ctx.fillStyle = '#e6edf7'; ctx.fill(); outlined(ctx, 2.5);
    ctx.beginPath(); ctx.rect(-6, -3, 12, 4); ctx.fillStyle = '#ffd23f'; ctx.fill(); outlined(ctx, 2.5);
    ctx.restore();
    // gövde
    ctx.beginPath(); ctx.roundRect(-11, -30, 22, 22, 7);
    ctx.fillStyle = p.hitFlash > 0 ? '#ff9a9a' : '#4f8bff'; ctx.fill(); outlined(ctx, 3);
    ctx.beginPath(); ctx.roundRect(-9, -28, 6, 18, 3); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill();
    // kafa (chibi: büyük)
    ctx.beginPath(); ctx.arc(0, -44, 17, 0, TAU); ctx.fillStyle = '#ffd9b3'; ctx.fill(); outlined(ctx, 3);
    // saç / miğfer
    ctx.beginPath(); ctx.arc(0, -46, 17, Math.PI * 1.02, Math.PI * 1.98); ctx.lineTo(10, -50); ctx.lineTo(-10, -50); ctx.closePath();
    ctx.fillStyle = '#e8534a'; ctx.fill(); outlined(ctx, 3);
    eyes(ctx, 3, -42, 1, true);
  });
  ctx.globalAlpha = 1;
}

function drawGoblin(ctx, en) {
  const c = en.def.colors, bob = Math.abs(Math.sin(en.bob)) * 2;
  onSurface(ctx, en.a, 0, 0, () => {
    ctx.scale(-en.face, 1);
    ctx.translate(0, -bob);
    ctx.beginPath(); ctx.ellipse(0, bob + 1, 14, 3.5, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fill();
    const fl = en.flash > 0;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.roundRect(s * 5 - 3.5, -10, 7, 10, 3); ctx.fillStyle = fl ? '#fff' : c.skinDark; ctx.fill(); outlined(ctx, 2.5);
    }
    ctx.beginPath(); ctx.roundRect(-9, -26, 18, 18, 6); ctx.fillStyle = fl ? '#fff' : c.cloth; ctx.fill(); outlined(ctx, 3);
    // club
    ctx.save(); ctx.translate(-14, -20); ctx.rotate(-0.4);
    ctx.beginPath(); ctx.roundRect(-3, -18, 7, 22, 3); ctx.fillStyle = '#8a5a2b'; ctx.fill(); outlined(ctx, 2.5);
    ctx.restore();
    // kulaklar
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 12, -42); ctx.lineTo(s * 25, -48); ctx.lineTo(s * 13, -33); ctx.closePath();
      ctx.fillStyle = fl ? '#fff' : c.skin; ctx.fill(); outlined(ctx, 2.5);
    }
    ctx.beginPath(); ctx.arc(0, -38, 15, 0, TAU); ctx.fillStyle = fl ? '#fff' : c.skin; ctx.fill(); outlined(ctx, 3);
    // kaşlar + göz + diş
    ctx.beginPath(); ctx.moveTo(-9, -46); ctx.lineTo(-2, -42); ctx.moveTo(9, -46); ctx.lineTo(2, -42); outlined(ctx, 2.5);
    eyes(ctx, 0, -38, 1, false);
    ctx.beginPath(); ctx.moveTo(-5, -30); ctx.lineTo(5, -30); outlined(ctx, 2.5);
    ctx.beginPath(); ctx.moveTo(-3, -30); ctx.lineTo(-2, -26.5); ctx.lineTo(0, -30); ctx.fillStyle = '#fff'; ctx.fill();
  });
  // Sağlık barı (ekranda dikey kalır: yerel döndürmeyle birlikte)
  onSurface(ctx, en.a, 0, 0, () => {
    const w = 34, h = 6, y = -62;
    ctx.beginPath(); ctx.roundRect(-w / 2, y, w, h, 3); ctx.fillStyle = '#3a1a22'; ctx.fill();
    ctx.beginPath(); ctx.roundRect(-w / 2, y, Math.max(0, w * en.hp / en.maxHp), h, 3); ctx.fillStyle = '#ff3b4a'; ctx.fill();
    ctx.beginPath(); ctx.roundRect(-w / 2, y, w, h, 3); outlined(ctx, 2);
  });
}

export function drawEnemy(ctx, en) {
  const spr = Assets.get(en.type);
  if (spr) { // gerçek sprite varsa (ileride): ayak noktası alt-orta
    onSurface(ctx, en.a, 0, 0, () => { ctx.scale(-en.face, 1); ctx.drawImage(spr, -spr.width / 2, -spr.height); });
    return;
  }
  drawGoblin(ctx, en);
}
