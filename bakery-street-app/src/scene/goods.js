// Market goods.
import { INK, rng, rrect, poly, vgrad, hgrad, paint, shadow, lighten, darken } from '../util.js';

const WOOD = [['#c8915a', '#a06a38'], ['#b98250', '#8a5a30']];

export function crate(ctx, x, y, w, h, fill = 'apples', seed = 1) {
  const r = rng(seed);
  const col = { apples: ['#e0372e', '#ff8a6a'], oranges: ['#f58a1f', '#ffc868'], greens: ['#4caf3a', '#a8e878'], lemons: ['#f4d63a', '#fff6a0'], tomato: ['#d6281f', '#ff7a5a'], pears: ['#a9c93a', '#e8f58a'] }[fill];
  if (col) {
    const n = Math.floor(w / 9) + 2;
    for (let row = 0; row < 2; row++) for (let i = 0; i < n; i++) {
      const px = x - w / 2 + 6 + i * (w - 12) / (n - 1) + (row ? 4 : 0) * (r() - 0.5), py = y - h - 6 - row * 9 + r() * 3, s = 8 + r() * 2;
      if (fill === 'greens') {
        ctx.beginPath(); ctx.arc(px, py - 2, s + 1, 0, 7); paint(ctx, vgrad(ctx, py - 10, py + 8, [[0, col[1]], [1, col[0]]]), 1.3, '#1f5a1f');
        ctx.strokeStyle = 'rgba(255,255,220,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(px, py - 2, s - 3, 3.6, 5.4); ctx.stroke();
      } else {
        const g = ctx.createRadialGradient(px - s * 0.35, py - s * 0.4, 1, px, py, s);
        g.addColorStop(0, col[1]); g.addColorStop(0.45, col[0]); g.addColorStop(1, darken(col[0], 0.35));
        ctx.beginPath(); ctx.arc(px, py, s, 0, 7); paint(ctx, g, 1.2, 'rgba(60,15,10,.8)');
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(px - s * 0.38, py - s * 0.42, s * 0.28, s * 0.16, -0.6, 0, 7); ctx.fill();
        if (fill === 'apples' || fill === 'pears') { ctx.strokeStyle = '#4a2a10'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px, py - s * 0.8); ctx.lineTo(px + 1, py - s * 1.15); ctx.stroke(); }
      }
    }
  }
  rrect(ctx, x - w / 2, y - h, w, h, 3);
  paint(ctx, vgrad(ctx, y - h, y, [[0, '#c8915a'], [1, '#8a5a30']]), 2.4);
  ctx.strokeStyle = 'rgba(40,18,5,.6)'; ctx.lineWidth = 1.6;
  for (const f of [0.34, 0.67]) { ctx.beginPath(); ctx.moveTo(x - w / 2, y - h * f); ctx.lineTo(x + w / 2, y - h * f); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,230,180,.4)'; ctx.fillRect(x - w / 2 + 3, y - h + 2, w - 6, 1.5);
  ctx.fillStyle = '#2f2a26'; for (const nx of [x - w / 2 + 5, x + w / 2 - 5]) for (const f of [0.17, 0.5, 0.83]) { ctx.beginPath(); ctx.arc(nx, y - h * f, 1.3, 0, 7); ctx.fill(); }
}

export function sack(ctx, x, y, w, h) {
  shadow(ctx, x + 4, y + 1, w * 0.58, 5, 0.28);
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, y); ctx.quadraticCurveTo(x - w * 0.64, y - h * 0.55, x - w * 0.34, y - h * 0.86);
  ctx.lineTo(x - w * 0.2, y - h); ctx.lineTo(x + w * 0.2, y - h); ctx.lineTo(x + w * 0.34, y - h * 0.86);
  ctx.quadraticCurveTo(x + w * 0.64, y - h * 0.55, x + w * 0.5, y); ctx.closePath();
  paint(ctx, hgrad(ctx, x - w / 2, x + w / 2, [[0, '#fbf1d8'], [0.5, '#ead6aa'], [1, '#bf9f68']]), 2.4);
  ctx.strokeStyle = 'rgba(120,85,35,.35)'; ctx.lineWidth = 1.2;
  for (const f of [0.35, 0.55, 0.75]) { ctx.beginPath(); ctx.moveTo(x - w * 0.42, y - h * f); ctx.quadraticCurveTo(x, y - h * f + 5, x + w * 0.42, y - h * f); ctx.stroke(); }
  rrect(ctx, x - w * 0.3, y - h * 1.02, w * 0.6, 10, 4); paint(ctx, vgrad(ctx, y - h * 1.02, y - h * 1.02 + 10, [[0, '#e8c888'], [1, '#b8924e']]), 2);
  ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - w * 0.3, y - h * 0.94); ctx.lineTo(x + w * 0.3, y - h * 0.94); ctx.stroke();
  ctx.strokeStyle = '#a9761e'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y - h * 0.18); ctx.lineTo(x, y - h * 0.62); ctx.stroke();
  for (let i = 0; i < 4; i++) for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + d * 5, y - h * (0.32 + i * 0.1), 3.4, 1.8, d * -0.7, 0, 7); ctx.fillStyle = '#d9a032'; ctx.fill(); }
}

export function milkBottle(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(-5, -24); ctx.lineTo(-5, -32); ctx.lineTo(5, -32); ctx.lineTo(5, -24);
  ctx.quadraticCurveTo(10, -20, 10, -12); ctx.lineTo(10, -2); ctx.quadraticCurveTo(10, 0, 8, 0); ctx.lineTo(-8, 0); ctx.quadraticCurveTo(-10, 0, -10, -2); ctx.lineTo(-10, -12); ctx.quadraticCurveTo(-10, -20, -5, -24);
  paint(ctx, hgrad(ctx, -10, 10, [[0, '#ffffff'], [0.6, '#f0f4f8'], [1, '#c4d2de']]), 2);
  ctx.fillStyle = '#e8473d'; rrect(ctx, -5.6, -35, 11.2, 5, 2); ctx.fill();
  ctx.fillStyle = '#5a9ee0'; ctx.fillRect(-9, -17, 18, 9);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -12.5, 2.4, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(-7.5, -22, 2, 17);
  ctx.restore();
}

export function eggCrate(ctx, x, y, w, h, seed = 1) {
  const r = rng(seed);
  const n = Math.floor(w / 11);
  for (let row = 0; row < 2; row++) for (let i = 0; i < n; i++) {
    const ex = x - w / 2 + 8 + i * (w - 16) / (n - 1), ey = y - h - 2 + row * -6;
    const g = ctx.createRadialGradient(ex - 1.5, ey - 2, 0.5, ex, ey, 6);
    const c = r() < 0.3 ? '#e8c9a0' : '#fff3df';
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, darken(c, 0.12));
    ctx.beginPath(); ctx.ellipse(ex, ey, 5, 6.2, 0, 0, 7); paint(ctx, g, 1.2, 'rgba(80,50,20,.7)');
  }
  rrect(ctx, x - w / 2, y - h, w, h, 3); paint(ctx, vgrad(ctx, y - h, y, [[0, '#d8ab72'], [1, '#a37a44']]), 2.2);
  ctx.fillStyle = 'rgba(255,240,200,.45)'; ctx.fillRect(x - w / 2 + 3, y - h + 2, w - 6, 1.5);
}

export function barrel(ctx, x, y, w, h) {
  shadow(ctx, x + 4, y + 1, w * 0.62, 5, 0.28);
  ctx.beginPath(); ctx.moveTo(x - w * 0.42, y); ctx.quadraticCurveTo(x - w * 0.64, y - h * 0.5, x - w * 0.42, y - h);
  ctx.lineTo(x + w * 0.42, y - h); ctx.quadraticCurveTo(x + w * 0.64, y - h * 0.5, x + w * 0.42, y); ctx.closePath();
  paint(ctx, hgrad(ctx, x - w / 2, x + w / 2, [[0, '#c48a4e'], [0.4, '#9a6a38'], [1, '#5a371a']]), 2.4);
  ctx.strokeStyle = 'rgba(40,16,4,.45)'; ctx.lineWidth = 1.2;
  for (const f of [-0.22, 0, 0.22]) { ctx.beginPath(); ctx.moveTo(x + w * f, y); ctx.quadraticCurveTo(x + w * f * 1.3, y - h * 0.5, x + w * f, y - h); ctx.stroke(); }
  for (const f of [0.18, 0.82]) {
    ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - w * 0.5, y - h * f); ctx.lineTo(x + w * 0.5, y - h * f); ctx.stroke();
    ctx.strokeStyle = '#6a625a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - w * 0.5, y - h * f); ctx.lineTo(x + w * 0.5, y - h * f); ctx.stroke();
  }
  ctx.beginPath(); ctx.ellipse(x, y - h, w * 0.42, 5, 0, 0, 7); paint(ctx, '#7a4a24', 2);
}
