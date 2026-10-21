// Signboards and the little emblems on them.
import { INK, rng, rrect, poly, vgrad, hgrad, paint, lighten, darken, softBand } from '../util.js';

export function signBoard(ctx, x, y, w, h, text, { plate = ['#fff4d4', '#efd392'], color = '#6a3a14', size = 34, left, right, gold = false } = {}) {
  softBand(ctx, x + 4, y + h - 2, w - 8, 18, 0.4);
  // iron hangers
  ctx.strokeStyle = '#26211d'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (const sx of [x + 22, x + w - 22]) { ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx, y - 12); ctx.stroke(); }
  rrect(ctx, x, y, w, h, 10);
  paint(ctx, vgrad(ctx, y, y + h, [[0, '#a96d38'], [0.5, '#7d4c26'], [1, '#4e2c12']]), 3.2);
  // wood grain on the frame
  ctx.save(); rrect(ctx, x, y, w, h, 10); ctx.clip();
  const r = rng(Math.floor(x + y));
  ctx.strokeStyle = 'rgba(30,12,2,.3)'; ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) { const gy = y + r() * h, gx = x + r() * w; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 30 + r() * 60, gy + (r() - 0.5) * 3); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,225,170,.4)'; ctx.fillRect(x + 8, y + 2, w - 16, 2);
  ctx.restore();
  // inner plate with double border
  rrect(ctx, x + 8, y + 8, w - 16, h - 16, 6);
  paint(ctx, vgrad(ctx, y, y + h, [[0, plate[0]], [1, plate[1]]]), 1.8, 'rgba(40,18,6,.85)');
  rrect(ctx, x + 13, y + 13, w - 26, h - 26, 4); paint(ctx, null, 1, gold ? 'rgba(240,200,110,.6)' : 'rgba(120,70,20,.35)');
  ctx.save(); rrect(ctx, x + 8, y + 8, w - 16, h - 16, 6); ctx.clip();
  softBand(ctx, x + 8, y + 8, w - 16, 12, 0.22); // inner shadow
  ctx.restore();
  for (const [rx, ry] of [[x + 5, y + 5], [x + w - 5, y + 5], [x + 5, y + h - 5], [x + w - 5, y + h - 5]]) {
    ctx.beginPath(); ctx.arc(rx, ry, 2.6, 0, 7); paint(ctx, '#e0b05a', 1, '#4a2a08');
  }
  const cx = x + w / 2, cy = y + h / 2 + 1;
  ctx.font = `italic 700 ${size}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (gold) {
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(text, cx + 1.6, cy + 2.4);
    ctx.fillStyle = vgrad(ctx, cy - size / 2, cy + size / 2, [[0, '#fff0b0'], [0.5, '#f2c75a'], [1, '#c8902a']]); ctx.fillText(text, cx, cy);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText(text, cx, cy + 1.6);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillText(text, cx + 1.2, cy + 1.6);
    ctx.fillStyle = vgrad(ctx, cy - size / 2, cy + size / 2, [[0, lighten(color, 0.12)], [1, darken(color, 0.25)]]); ctx.fillText(text, cx, cy);
  }
  const tw = ctx.measureText(text).width;
  if (left) left(ctx, cx - tw / 2 - h * 0.55, cy, h * 0.64);
  if (right) right(ctx, cx + tw / 2 + h * 0.55, cy, h * 0.64);
}

export function iconBread(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.3); const k = s / 40; ctx.scale(k, k);
  ctx.beginPath(); ctx.ellipse(0, 0, 23, 12.5, 0, 0, 7);
  paint(ctx, vgrad(ctx, -12, 12, [[0, '#f8c66a'], [0.55, '#dc8a2e'], [1, '#a45a1c']]), 2.4, '#5a2f0e');
  ctx.strokeStyle = '#fbe0a0'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  for (const dx of [-11, 0, 11]) { ctx.beginPath(); ctx.moveTo(dx - 3, -6); ctx.lineTo(dx + 3, 5); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-8, -8, 8, 2.2, -0.2, 0, 7); ctx.fill();
  ctx.restore();
}
export function iconCup(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); const k = s / 40; ctx.scale(k, k);
  ctx.beginPath(); ctx.ellipse(0, 14, 20, 5.5, 0, 0, 7); paint(ctx, vgrad(ctx, 9, 20, [[0, '#fff'], [1, '#d8d2c8']]), 2);
  ctx.beginPath(); ctx.moveTo(-13, -6); ctx.lineTo(13, -6); ctx.quadraticCurveTo(12, 14, 0, 14); ctx.quadraticCurveTo(-12, 14, -13, -6);
  paint(ctx, hgrad(ctx, -13, 13, [[0, '#ffffff'], [1, '#d8d2c8']]), 2.2);
  ctx.beginPath(); ctx.ellipse(0, -6, 13, 4, 0, 0, 7); paint(ctx, '#7a4320', 1.8);
  ctx.beginPath(); ctx.ellipse(-3, -6.4, 5, 1.4, 0, 0, 7); ctx.fillStyle = '#b5784a'; ctx.fill();
  ctx.beginPath(); ctx.arc(14, 1, 6, -1.4, 1.6); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  ctx.strokeStyle = 'rgba(120,90,70,.75)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (const dx of [-5, 3]) { ctx.beginPath(); ctx.moveTo(dx, -12); ctx.quadraticCurveTo(dx - 5, -18, dx, -24); ctx.stroke(); }
  ctx.restore();
}
export function iconBook(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); const k = s / 40; ctx.scale(k, k);
  for (const d of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(d * 12, -18, d * 24, -12); ctx.lineTo(d * 24, 14); ctx.quadraticCurveTo(d * 12, 8, 0, 14); ctx.closePath();
    paint(ctx, hgrad(ctx, 0, d * 24, [[0, '#f2e4c0'], [1, '#fff8e4']]), 2.2);
    ctx.strokeStyle = 'rgba(90,60,30,.5)'; ctx.lineWidth = 1.4;
    for (const yy of [-5, 1, 7]) { ctx.beginPath(); ctx.moveTo(d * 4, yy); ctx.lineTo(d * 20, yy - 1); ctx.stroke(); }
  }
  ctx.restore();
}
export function iconBasket(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); const k = s / 40; ctx.scale(k, k);
  ctx.beginPath(); ctx.arc(0, -4, 15, Math.PI, 0); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.arc(-7, -4, 6.5, 0, 7); paint(ctx, vgrad(ctx, -10, 2, [[0, '#a6e070'], [1, '#4aa030']]), 1.6);
  ctx.beginPath(); ctx.arc(6, -5, 6.5, 0, 7); paint(ctx, vgrad(ctx, -11, 2, [[0, '#ff7a6a'], [1, '#c8281f']]), 1.6);
  ctx.beginPath(); ctx.moveTo(-22, -4); ctx.lineTo(22, -4); ctx.lineTo(16, 16); ctx.lineTo(-16, 16); ctx.closePath();
  paint(ctx, vgrad(ctx, -4, 16, [[0, '#e04a3a'], [1, '#a32218']]), 2.2);
  ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.6;
  for (const dx of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(dx, -3); ctx.lineTo(dx * 0.8, 15); ctx.stroke(); }
  ctx.restore();
}
