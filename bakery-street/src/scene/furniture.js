// Street furniture: lamps, benches, bollards, chalkboards.
import { INK, rng, rrect, poly, vgrad, hgrad, paint, shadow, lighten, darken } from '../util.js';

const IRON = '#26211d';

function iron(ctx, x0, x1) { return hgrad(ctx, x0, x1, [[0, '#5a534b'], [0.4, '#2a2623'], [1, '#121010']]); }

export function lampPost(ctx, x, baseY, h) {
  shadow(ctx, x + 8, baseY + 1, 26, 5, 0.32);
  // stepped, fluted base
  rrect(ctx, x - 14, baseY - 14, 28, 14, 3); paint(ctx, iron(ctx, x - 14, x + 14), 2);
  rrect(ctx, x - 10, baseY - 34, 20, 22, 4); paint(ctx, iron(ctx, x - 10, x + 10), 2);
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1.4;
  for (const dx of [-5, 0, 5]) { ctx.beginPath(); ctx.moveTo(x + dx, baseY - 32); ctx.lineTo(x + dx, baseY - 14); ctx.stroke(); }
  // shaft with collars
  rrect(ctx, x - 4.5, baseY - h + 44, 9, h - 76, 2); paint(ctx, iron(ctx, x - 4.5, x + 4.5), 2);
  for (const cy of [baseY - 46, baseY - h * 0.55, baseY - h + 52]) { rrect(ctx, x - 8, cy, 16, 7, 3); paint(ctx, iron(ctx, x - 8, x + 8), 1.6); }
  ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(x - 3, baseY - h + 48, 1.6, h - 90);
  // scroll brackets
  ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (const d of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(x, baseY - h + 70); ctx.bezierCurveTo(x + d * 22, baseY - h + 66, x + d * 24, baseY - h + 88, x + d * 12, baseY - h + 90); ctx.stroke();
  }
  ctx.strokeStyle = IRON; ctx.lineWidth = 3;
  for (const d of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(x, baseY - h + 70); ctx.bezierCurveTo(x + d * 22, baseY - h + 66, x + d * 24, baseY - h + 88, x + d * 12, baseY - h + 90); ctx.stroke();
  }
  // lantern
  const ly = baseY - h + 24;
  rrect(ctx, x - 14, ly + 20, 28, 8, 3); paint(ctx, iron(ctx, x - 14, x + 14), 1.8);
  ctx.beginPath(); ctx.moveTo(x - 16, ly - 22); ctx.lineTo(x + 16, ly - 22); ctx.lineTo(x + 12, ly + 20); ctx.lineTo(x - 12, ly + 20); ctx.closePath();
  paint(ctx, vgrad(ctx, ly - 22, ly + 20, [[0, '#fffbd2'], [0.45, '#ffd868'], [1, '#f2a22a']]), 2.4);
  const rg = ctx.createRadialGradient(x, ly, 2, x, ly, 22);
  rg.addColorStop(0, 'rgba(255,255,230,.9)'); rg.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.save(); ctx.clip(); ctx.fillStyle = rg; ctx.fillRect(x - 20, ly - 24, 40, 46); ctx.restore();
  ctx.strokeStyle = IRON; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(x, ly - 22); ctx.lineTo(x, ly + 20); ctx.moveTo(x - 14, ly - 22); ctx.lineTo(x - 10, ly + 20); ctx.moveTo(x + 14, ly - 22); ctx.lineTo(x + 10, ly + 20); ctx.stroke();
  poly(ctx, [[x - 21, ly - 22], [x + 21, ly - 22], [x + 6, ly - 40], [x - 6, ly - 40]]); paint(ctx, iron(ctx, x - 21, x + 21), 2.2);
  rrect(ctx, x - 8, ly - 46, 16, 7, 3); paint(ctx, iron(ctx, x - 8, x + 8), 1.6);
  ctx.beginPath(); ctx.arc(x, ly - 50, 4.2, 0, 7); paint(ctx, iron(ctx, x - 4, x + 4), 1.6);
  return { x, y: ly };
}

export function bench(ctx, cx, y, w = 190) {
  shadow(ctx, cx + 6, y + 2, w * 0.56, 6, 0.3);
  const x = cx - w / 2;
  for (const lx of [x + 14, x + w - 14]) {
    // cast-iron side frame with scroll
    ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(lx, y - 82); ctx.lineTo(lx, y - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx, y - 36); ctx.bezierCurveTo(lx + 20, y - 36, lx + 22, y - 14, lx + 6, y - 14); ctx.stroke();
    ctx.strokeStyle = '#3a3430'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(lx, y - 82); ctx.lineTo(lx, y - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx, y - 36); ctx.bezierCurveTo(lx + 20, y - 36, lx + 22, y - 14, lx + 6, y - 14); ctx.stroke();
    rrect(ctx, lx - 10, y - 6, 20, 6, 2); paint(ctx, iron(ctx, lx - 10, lx + 10), 1.5);
    rrect(ctx, lx - 8, y - 58, 16, 6, 3); paint(ctx, iron(ctx, lx - 8, lx + 8), 1.5); // armrest
  }
  const slat = (yy, hh) => {
    rrect(ctx, x, yy, w, hh, 3);
    paint(ctx, vgrad(ctx, yy, yy + hh, [[0, '#c08648'], [0.5, '#a06a34'], [1, '#6e4624']]), 2);
    ctx.fillStyle = 'rgba(255,230,170,.35)'; ctx.fillRect(x + 4, yy + 1.5, w - 8, 1.4);
    ctx.strokeStyle = 'rgba(40,16,4,.3)'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) { const gx = x + 16 + ((i * 53 + yy * 3) % (w - 40)); ctx.beginPath(); ctx.moveTo(gx, yy + hh / 2); ctx.lineTo(gx + 26, yy + hh / 2 + 1); ctx.stroke(); }
    ctx.fillStyle = '#1c1816';
    for (const bx of [x + 14, x + w - 14]) { ctx.beginPath(); ctx.arc(bx, yy + hh / 2, 1.6, 0, 7); ctx.fill(); }
  };
  slat(y - 82, 11); slat(y - 67, 11); slat(y - 52, 11);
  slat(y - 36, 13);
}

export function bollard(ctx, x, y) {
  shadow(ctx, x + 5, y + 1, 15, 4, 0.32);
  rrect(ctx, x - 10, y - 8, 20, 8, 3); paint(ctx, iron(ctx, x - 10, x + 10), 1.8);
  rrect(ctx, x - 8, y - 56, 16, 50, 4); paint(ctx, iron(ctx, x - 8, x + 8), 2);
  rrect(ctx, x - 11, y - 50, 22, 6, 3); paint(ctx, iron(ctx, x - 11, x + 11), 1.5);
  ctx.beginPath(); ctx.arc(x, y - 63, 9.5, 0, 7); paint(ctx, iron(ctx, x - 9, x + 9), 2);
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(x - 3, y - 67, 3, 2, -0.5, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x - 5, y - 44, 2, 34);
}

export function chalkboard(ctx, x, y, w, h, kind) {
  shadow(ctx, x + 3, y + 1, w * 0.62, 5, 0.28);
  ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - w * 0.34, y - h * 0.15); ctx.lineTo(x - w * 0.46, y); ctx.moveTo(x + w * 0.34, y - h * 0.15); ctx.lineTo(x + w * 0.46, y); ctx.stroke();
  ctx.strokeStyle = '#7d4c26'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - w * 0.34, y - h * 0.15); ctx.lineTo(x - w * 0.46, y); ctx.moveTo(x + w * 0.34, y - h * 0.15); ctx.lineTo(x + w * 0.46, y); ctx.stroke();
  rrect(ctx, x - w / 2, y - h, w, h * 0.86, 5); paint(ctx, vgrad(ctx, y - h, y, [[0, '#a8703a'], [1, '#6a4020']]), 2.6);
  rrect(ctx, x - w / 2 + 6, y - h + 6, w - 12, h * 0.86 - 12, 3); paint(ctx, vgrad(ctx, y - h, y, [[0, '#3d4a45'], [1, '#26302d']]), 1.5);
  ctx.fillStyle = 'rgba(255,255,255,.07)'; poly(ctx, [[x - w / 2 + 8, y - h + 8], [x - w * 0.05, y - h + 8], [x - w / 2 + 8, y - h * 0.4]]); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.88)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  const cx = x, cy = y - h * 0.62;
  if (kind === 'cup') {
    ctx.beginPath(); ctx.moveTo(cx - 12, cy - 6); ctx.lineTo(cx + 10, cy - 6); ctx.quadraticCurveTo(cx + 9, cy + 12, cx - 1, cy + 12); ctx.quadraticCurveTo(cx - 11, cy + 12, cx - 12, cy - 6); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 12, cy, 5, -1.4, 1.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 5, cy - 12); ctx.quadraticCurveTo(cx - 9, cy - 17, cx - 5, cy - 22); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.ellipse(cx, cy, 18, 8, -0.3, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 8, cy - 5); ctx.lineTo(cx - 3, cy + 3); ctx.moveTo(cx + 2, cy - 7); ctx.lineTo(cx + 7, cy + 1); ctx.stroke();
  }
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.7)';
  for (const yy of [y - h * 0.3, y - h * 0.22]) { ctx.beginPath(); ctx.moveTo(x - w * 0.3, yy); ctx.lineTo(x + w * 0.3, yy); ctx.stroke(); }
}
