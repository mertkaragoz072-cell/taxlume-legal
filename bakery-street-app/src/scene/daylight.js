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
  const { rgb, alpha } = daylightTint(hourOf(ms));
  if (alpha <= 0) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = alpha; ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
