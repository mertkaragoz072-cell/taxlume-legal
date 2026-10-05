import { CONFIG } from '../core/config.js';
import { View } from '../core/view.js';
import { TAU, wrapAngle } from '../core/util.js';
import { state } from '../game/state.js';
import { onSurface, visible, outlined } from './draw.js';

export function drawSky(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, View.h);
  g.addColorStop(0, '#3ea8f0'); g.addColorStop(1, '#bfeaff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, View.w, View.h);
  // güneş
  ctx.beginPath(); ctx.arc(View.w * 0.82, View.h * 0.2, 34 * View.scale + 10, 0, TAU);
  ctx.fillStyle = '#fff3a8'; ctx.fill(); outlined(ctx, 3);
  // bulutlar (yavaşça kayar)
  const drift = state.time * 6 + state.player.a * 40;
  for (let i = 0; i < 4; i++) {
    const x = (((i * 190 - drift * (0.5 + i * 0.1)) % (View.w + 200)) + View.w + 200) % (View.w + 200) - 100;
    const y = View.h * (0.1 + (i % 3) * 0.09);
    cloud(ctx, x, y, (0.8 + (i % 2) * 0.4) * View.scale);
  }
}
function cloud(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath();
  ctx.arc(-24, 0, 16, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(-6, -12, 18, Math.PI, 0);
  ctx.arc(18, -4, 14, Math.PI * 1.2, Math.PI * 0.5, false); ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.fill(); outlined(ctx, 3);
  ctx.restore();
}

export function drawPlanet(ctx) {
  const { cx, cy, R } = View, c = CONFIG.planet.colors;
  // gölge/atmosfer
  ctx.beginPath(); ctx.arc(cx, cy, R + 10 * View.scale, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill();
  // gövde
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
  const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
  g.addColorStop(0, c.grassLight); g.addColorStop(0.55, c.grass); g.addColorStop(1, c.grassDark);
  ctx.fillStyle = g; ctx.fill(); outlined(ctx, 5 * View.scale + 1);
  // cel-shading: açık hilal (üst sol) + koyu kenar
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R - 3, 0, TAU); ctx.clip();
  ctx.beginPath(); ctx.arc(cx, cy, R - 3, 0, TAU); ctx.arc(cx + R * 0.12, cy + R * 0.12, R * 0.96, 0, TAU, true);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill('evenodd');
  ctx.restore();

  // Dekorlar (dünya açısına sabit)
  for (const d of DECOR) {
    if (!visible(d.a)) continue;
    onSurface(ctx, d.a, 0, 0, () => {
      if (d.kind === 'grass') drawGrass(ctx, d);
      else if (d.kind === 'rock') drawRock(ctx, d);
      else drawTree(ctx, d);
    });
  }
}

const DECOR = (() => {
  const list = []; let seed = 7;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 70; i++) list.push({ kind: 'grass', a: r() * TAU - Math.PI, s: 0.7 + r() * 0.7 });
  for (let i = 0; i < 9; i++) list.push({ kind: 'rock', a: r() * TAU - Math.PI, s: 0.8 + r() * 0.8 });
  for (let i = 0; i < 10; i++) list.push({ kind: 'tree', a: r() * TAU - Math.PI, s: 0.9 + r() * 0.5 });
  return list;
})();

function drawGrass(ctx, d) {
  ctx.save(); ctx.scale(d.s, d.s);
  ctx.beginPath(); ctx.moveTo(-6, 2); ctx.lineTo(-4, -9); ctx.lineTo(-1, 2); ctx.lineTo(1, -12); ctx.lineTo(4, 2); ctx.lineTo(7, -8); ctx.lineTo(8, 2);
  ctx.fillStyle = '#3fa646'; ctx.fill(); outlined(ctx, 2);
  ctx.restore();
}
function drawRock(ctx, d) {
  ctx.save(); ctx.scale(d.s, d.s);
  ctx.beginPath(); ctx.moveTo(-16, 4); ctx.lineTo(-12, -10); ctx.lineTo(-2, -16); ctx.lineTo(10, -11); ctx.lineTo(16, 4); ctx.closePath();
  ctx.fillStyle = '#a7aebf'; ctx.fill(); outlined(ctx, 3);
  ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(-2, -16); ctx.lineTo(-4, -4); ctx.lineTo(-13, 0); ctx.closePath();
  ctx.fillStyle = '#d3d8e6'; ctx.fill();
  ctx.restore();
}
function drawTree(ctx, d) {
  ctx.save(); ctx.scale(d.s, d.s);
  ctx.beginPath(); ctx.rect(-5, -30, 10, 34);
  ctx.fillStyle = '#9a6535'; ctx.fill(); outlined(ctx, 3);
  const blobs = [[0, -52, 24], [-16, -38, 17], [16, -38, 17]];
  for (const [x, y, rad] of blobs) {
    ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fillStyle = '#34b84a'; ctx.fill(); outlined(ctx, 3);
  }
  ctx.beginPath(); ctx.arc(-6, -58, 11, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fill();
  ctx.restore();
}
