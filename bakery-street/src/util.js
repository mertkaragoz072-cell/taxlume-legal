// Small canvas + math helpers shared by every drawing module.
export const INK = '#3a2213';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/** Deterministic PRNG so cached art looks identical on every resize. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

export function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

export function vgrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
export function hgrad(ctx, x0, x1, stops) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/** Fill (optional) + consistent dark contour on the current path. */
export function paint(ctx, fill, lw = 2.5, stroke = INK) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.stroke(); }
}

export function shadow(ctx, x, y, rx, ry, a = 0.28) {
  ctx.fillStyle = `rgba(40,22,10,${a})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function glowAt(ctx, x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Smallest canvas font size (in design pixels) that still renders at ~12 screen pixels. main.js updates it on every layout. */
export const textFloor = { px: 0 };
/** Raises the first `NNpx` size in a CSS font string to the readable floor. */
export const fontCss = (font) => font.replace(/(\d+(?:\.\d+)?)px/, (_, n) => `${Math.max(+n, textFloor.px).toFixed(1)}px`);

export function label(ctx, str, x, y, { font, fill = '#fff', stroke = INK, lw = 4, align = 'center' } = {}) {
  ctx.font = fontCss(font);
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
  ctx.fillStyle = fill;
  ctx.fillText(str, x, y);
}

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
/** Blend two #rrggbb colours (used for atmospheric haze on the far town). */
export function mix(a, b, f) {
  const [r1, g1, b1] = hex(a), [r2, g2, b2] = hex(b);
  const h = (v) => Math.round(v).toString(16).padStart(2, '0');
  return `#${h(lerp(r1, r2, f))}${h(lerp(g1, g2, f))}${h(lerp(b1, b2, f))}`;
}

export const lighten = (c, f) => mix(c, '#ffffff', f);
export const darken = (c, f) => mix(c, '#000000', f);

/** Soft vertical shadow strip (used under eaves, awnings and signs). */
export function softBand(ctx, x, y, w, h, a = 0.3, up = false) {
  const g = ctx.createLinearGradient(0, up ? y + h : y, 0, up ? y : y + h);
  g.addColorStop(0, `rgba(45,20,5,${a})`);
  g.addColorStop(1, 'rgba(45,20,5,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

let grainTile = null;
/** Fine paper-like noise, applied only over painted pixels so the art feels hand-painted rather than flat vector. */
export function applyGrain(ctx, w, h, alpha = 0.07) {
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = grainTile.height = 128;
    const g = grainTile.getContext('2d');
    const img = g.createImageData(128, 128), r = rng(77);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r() < 0.5 ? 0 : 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 18 + r() * 40;
    }
    g.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = alpha / 0.07;
  ctx.fillStyle = ctx.createPattern(grainTile, 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/**
 * Final colour grade for a whole screen (call last, in canvas pixels): a warm multiply tint that pulls every piece of art toward
 * one lighting colour, a vignette, and a slightly darker bottom edge for depth. Keeps differently drawn pieces feeling like one scene.
 */
export function gradeScreen(ctx, { warm = 0.35, vignette = 0.34, floorFade = 0.12 } = {}) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = warm; ctx.fillStyle = 'rgb(255,226,190)'; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  const g = ctx.createRadialGradient(W / 2, H * 0.52, H * 0.42, W / 2, H * 0.52, Math.max(W, H) * 0.78);
  g.addColorStop(0, 'rgba(40,15,0,0)'); g.addColorStop(1, `rgba(40,15,0,${vignette})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (floorFade) { const f = ctx.createLinearGradient(0, H * 0.72, 0, H); f.addColorStop(0, 'rgba(30,10,0,0)'); f.addColorStop(1, `rgba(30,10,0,${floorFade})`); ctx.fillStyle = f; ctx.fillRect(0, H * 0.72, W, H * 0.28); }
}
