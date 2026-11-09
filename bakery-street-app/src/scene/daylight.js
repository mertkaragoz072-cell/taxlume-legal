// Time of day for the cafe: the real local hour tints the whole picture. Pure, so it can be tested. Stages (hour -> tint):
// night (21-5) cool blue and darker, sunrise (6-7) soft peach, day (9-16) no tint, golden hour (17-19) orange, dusk (20) back toward night.
const KEYS = [
  [0, [128, 140, 196], 0.34], [5, [128, 140, 196], 0.34], [7, [255, 214, 178], 0.16], [9, [255, 255, 255], 0],
  [16, [255, 255, 255], 0], [18, [255, 190, 130], 0.22], [20, [200, 170, 190], 0.28], [22, [128, 140, 196], 0.34], [24, [128, 140, 196], 0.34],
];

/** The multiply tint for a (fractional) local hour: { rgb:[r,g,b], alpha }. Smooth between the key hours; alpha 0 means no tint. */
export function daylightTint(hour) {
  const h = ((Number.isFinite(hour) ? hour : 12) % 24 + 24) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) i++;
  const [h0, c0, a0] = KEYS[i], [h1, c1, a1] = KEYS[i + 1];
  const k = h1 === h0 ? 0 : (h - h0) / (h1 - h0);
  return { rgb: c0.map((v, n) => Math.round(v + (c1[n] - v) * k)), alpha: +(a0 + (a1 - a0) * k).toFixed(3) };
}

/** Local hour (with minutes) of a millisecond timestamp. */
export const hourOf = (ms) => { const d = new Date(ms); return d.getHours() + d.getMinutes() / 60; };

/** Paints the tint over the finished picture (screen space; call after the other grading). */
export function applyDaylight(ctx, ms) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  for (const { rgb, alpha } of [daylightTint(hourOf(ms)), seasonTint(new Date(ms).getMonth())]) {
    if (alpha <= 0) continue;
    ctx.globalAlpha = alpha; ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

/** A faint seasonal tone by calendar month (0 = January): cool in winter, fresh in spring, warm in autumn, none in summer. */
export function seasonTint(month) {
  const m = ((Number.isFinite(month) ? month : 6) % 12 + 12) % 12;
  if (m === 11 || m <= 1) return { rgb: [205, 222, 255], alpha: 0.09 };
  if (m >= 2 && m <= 4) return { rgb: [235, 255, 230], alpha: 0.05 };
  if (m >= 8 && m <= 10) return { rgb: [255, 205, 150], alpha: 0.09 };
  return { rgb: [255, 255, 255], alpha: 0 };
}

/** Rain over the picture: slanted streaks falling with time `t` (seconds), plus a slight grey-blue dimming. */
export function drawRain(ctx, t) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.1; ctx.fillStyle = 'rgb(170,185,215)'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.5; ctx.strokeStyle = 'rgba(225,235,250,0.9)'; ctx.lineWidth = Math.max(1, W / 400); ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 46; i++) {
    const sx = ((i * 97.13) % 1) * W, speed = 0.9 + ((i * 31.7) % 1) * 0.6;
    const y = ((t * speed * 0.9 + (i * 0.137) % 1) % 1) * (H + 60) - 30, x = ((sx + (i * 53.3) % W) % W) - y * 0.12;
    ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 22 * (W / 400));
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}
