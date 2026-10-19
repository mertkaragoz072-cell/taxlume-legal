// Sky, mountains, the terraced European hill-town and the leafy mass behind the shops.
import { DESIGN } from '../config.js';
import { rng, vgrad, poly, mix, rrect } from '../util.js';
import { drawAsset, getImage } from '../assets.js';
import { tiledRoof } from './parts.js';

const HAZE = '#a9cdee';

export function drawSky(ctx, v) {
  const y0 = -v.oy - 10;
  ctx.fillStyle = vgrad(ctx, y0, 420, [[0, '#4fa8ee'], [0.55, '#8ccaf6'], [1, '#d4eefc']]);
  ctx.fillRect(-v.ox - 10, y0, v.vw + 20, 420 - y0 + 200);
}

export function makeClouds(v) {
  const r = rng(9);
  return Array.from({ length: 7 }, (_, i) => ({
    x: -v.ox + r() * v.vw, y: 50 + r() * 100 - Math.min(v.oy, 60) * 0 , s: 0.7 + r() * 0.8, v: 5 + r() * 7, k: i,
  }));
}

export function drawCloud(ctx, c) {
  ctx.save(); ctx.translate(c.x, c.y); ctx.scale(c.s, c.s);
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  for (const [dx, dy, rx, ry] of [[0, 0, 46, 22], [-34, 6, 30, 16], [38, 6, 34, 17], [10, -14, 28, 20], [-12, -8, 26, 18]]) {
    ctx.beginPath(); ctx.ellipse(dx, dy, rx, ry, 0, 0, 7); ctx.fill();
  }
  ctx.fillStyle = 'rgba(150,190,230,.35)';
  ctx.beginPath(); ctx.ellipse(2, 16, 52, 7, 0, 0, 7); ctx.fill();
  ctx.restore();
}

export function drawBackdrop(ctx, v) {
  const xmin = -v.ox - 20, xmax = DESIGN.w + v.ox + 20;
  const pano = getImage('town-backdrop');
  if (pano) { panorama(ctx, v, pano); return; }
  mountains(ctx, xmin, xmax);
  hillTown(ctx, xmin, xmax);
  treeMass(ctx, xmin, xmax);
}

function mountains(ctx, xmin, xmax) {
  for (const [base, amp, col, ph] of [[262, 70, '#9dbcd8', 1.2], [292, 52, '#86a9c9', 3.1]]) {
    ctx.beginPath(); ctx.moveTo(xmin, 420);
    for (let x = xmin; x <= xmax; x += 12) {
      const y = base - amp * (0.55 + 0.45 * Math.sin(x * 0.0043 + ph)) - 28 * Math.sin(x * 0.011 + ph * 2) - 10 * Math.sin(x * 0.03);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(xmax, 420); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }
}

function hillTown(ctx, xmin, xmax) {
  const rows = 6;
  ctx.fillStyle = vgrad(ctx, 150, 420, [[0, mix('#4f8a3a', HAZE, 0.6)], [1, '#2f6a2a']]);
  ctx.fillRect(xmin, 215, xmax - xmin, 260);
  for (let row = 0; row < rows; row++) {
    const f = row / (rows - 1);                 // 0 = far, 1 = near
    const r = rng(100 + row);
    const base = 238 + f * 100, sc = 0.55 + f * 0.6, haze = 0.62 * (1 - f) + 0.05;
    // pines first (behind houses of the same row)
    for (let x = xmin - 20 + r() * 30; x < xmax + 40; x += 22 * sc + r() * 18) pine(ctx, x, base + 6, 26 * sc, 52 * sc * (0.8 + r() * 0.5), haze);
    let x = xmin - 30 + r() * 40;
    while (x < xmax + 40) {
      const w = (34 + r() * 40) * sc, h = (30 + r() * 40) * sc;
      const k = r();
      if (k < 0.16) tower(ctx, x, base, w * 0.6, h * 1.9, r, haze);
      else house(ctx, x, base, w, h, r, haze);
      x += w + (r() < 0.45 ? 10 + r() * 30 : 2) * sc;
      if (r() < 0.25) { for (let q = 0; q < 2; q++) pine(ctx, x + q * 16 * sc, base + 6, 24 * sc, 50 * sc, haze); x += 36 * sc; }
    }
  }
}

const WALLS = ['#f4e3bd', '#ecd0a0', '#f8efd6', '#dcbb8a', '#f0d9b0'];
const ROOFS = ['#cf5a33', '#dd6e3a', '#b9472a', '#e0803f'];

function house(ctx, x, base, w, h, r, haze) {
  const wall = mix(WALLS[Math.floor(r() * WALLS.length)], HAZE, haze);
  const roof = mix(ROOFS[Math.floor(r() * ROOFS.length)], HAZE, haze);
  const line = mix('#5a3a22', HAZE, haze + 0.15);
  ctx.fillStyle = wall; ctx.fillRect(x, base - h, w, h);
  ctx.strokeStyle = line; ctx.lineWidth = 1.2; ctx.strokeRect(x, base - h, w, h);
  const rh = w * (0.32 + r() * 0.2);
  ctx.beginPath(); ctx.moveTo(x - 3, base - h); ctx.lineTo(x + w / 2, base - h - rh); ctx.lineTo(x + w + 3, base - h); ctx.closePath();
  ctx.fillStyle = roof; ctx.fill(); ctx.stroke();
  ctx.strokeStyle = mix('#7a2a14', HAZE, haze); ctx.lineWidth = 0.8;
  for (let i = 1; i < 3; i++) { const yy = base - h - rh * i / 3; const dx = (w / 2 + 3) * (1 - i / 3) ; ctx.beginPath(); ctx.moveTo(x + w / 2 - dx, yy + rh * (1 - i / 3) * 0 + (rh * i / 3)); ctx.lineTo(x + w / 2 + dx, yy + (rh * i / 3)); ctx.stroke(); }
  ctx.fillStyle = mix('#6a4a2a', HAZE, haze);
  const cols = Math.max(1, Math.floor(w / 16));
  for (let c = 0; c < cols; c++) ctx.fillRect(x + 4 + c * (w - 8) / cols + 1, base - h + 6, 4, 6), ctx.fillRect(x + 4 + c * (w - 8) / cols + 1, base - h * 0.5, 4, 6);
}
function tower(ctx, x, base, w, h, r, haze) {
  const wall = mix('#f1dfb8', HAZE, haze), roof = mix('#c24a2c', HAZE, haze), line = mix('#5a3a22', HAZE, haze + 0.15);
  ctx.fillStyle = wall; ctx.fillRect(x, base - h, w, h); ctx.strokeStyle = line; ctx.lineWidth = 1.2; ctx.strokeRect(x, base - h, w, h);
  ctx.beginPath(); ctx.moveTo(x - 4, base - h); ctx.lineTo(x + w / 2, base - h - w * 1.5); ctx.lineTo(x + w + 4, base - h); ctx.closePath();
  ctx.fillStyle = roof; ctx.fill(); ctx.stroke();
  ctx.fillStyle = mix('#6a4a2a', HAZE, haze); ctx.fillRect(x + w / 2 - 2, base - h + 8, 4, 9); ctx.fillRect(x + w / 2 - 2, base - h * 0.55, 4, 9);
}
function pine(ctx, x, base, w, h, haze) {
  ctx.fillStyle = mix('#2a6a30', HAZE, haze);
  for (let i = 0; i < 3; i++) {
    const t = base - h * (i / 3.2), ww = w * (1 - i * 0.22);
    ctx.beginPath(); ctx.moveTo(x - ww / 2, t); ctx.lineTo(x, t - h * 0.5); ctx.lineTo(x + ww / 2, t); ctx.closePath(); ctx.fill();
  }
}

function treeMass(ctx, xmin, xmax) {
  const r = rng(555);
  const layers = [['#1f5a28', 250, 520, 70], ['#2f7a30', 290, 540, 62], ['#46963a', 330, 560, 52]];
  for (const [col, y0, y1, rad] of layers) {
    for (let x = xmin; x < xmax + rad; x += rad * 0.7) {
      ctx.beginPath(); ctx.arc(x + r() * 20, y0 + r() * (y1 - y0) * 0.5, rad * (0.7 + r() * 0.5), 0, 7);
      ctx.fillStyle = col; ctx.fill();
    }
  }
  ctx.fillStyle = '#2f7a30'; ctx.fillRect(xmin, 380, xmax - xmin, 200);
  ctx.fillStyle = 'rgba(160,220,90,.5)';
  for (let i = 0; i < 160; i++) { ctx.beginPath(); ctx.arc(xmin + r() * (xmax - xmin), 280 + r() * 240, 3 + r() * 5, 0, 7); ctx.fill(); }
}

let topColors = null;
/** Average colour of the panorama's top edge, sampled left-to-right, used to extend the sky upward on tall screens. */
function sampleTop(img) {
  if (topColors) return topColors;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = 8;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const n = 8, step = Math.floor(c.width / n);
  topColors = Array.from({ length: n }, (_, i) => {
    const d = g.getImageData(i * step, 0, step, 4).data;
    let r = 0, gg = 0, b = 0;
    for (let k = 0; k < d.length; k += 4) { r += d[k]; gg += d[k + 1]; b += d[k + 2]; }
    const m = d.length / 4;
    return `${Math.round(r / m)},${Math.round(gg / m)},${Math.round(b / m)}`;
  });
  return topColors;
}

/** Painted panorama: bottom edge tucks under the pavement; its top fades into a matching flat sky. */
function panorama(ctx, v, img) {
  const W = Math.max(v.vw + 60, 1500), H = (W * img.naturalHeight) / img.naturalWidth;
  const x = DESIGN.w / 2 - W / 2, y = DESIGN.baseY + 8 - H;
  const cols = sampleTop(img);
  const grad = (a) => {
    const g = ctx.createLinearGradient(x, 0, x + W, 0);
    cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), `rgba(${c},${a})`));
    return g;
  };
  const top = -v.oy - 12;
  if (y > top) { ctx.fillStyle = grad(1); ctx.fillRect(x, top, W, y - top + 2); }
  ctx.drawImage(img, x, y, W, H);
  // blend the top edge into the extended sky colour via an offscreen strip with a vertical alpha ramp
  const strip = document.createElement('canvas');
  strip.width = 64; strip.height = 46;
  const sg = strip.getContext('2d');
  const gx = sg.createLinearGradient(0, 0, 64, 0);
  cols.forEach((c, i) => gx.addColorStop(i / (cols.length - 1), `rgb(${c})`));
  sg.fillStyle = gx; sg.fillRect(0, 0, 64, 46);
  sg.globalCompositeOperation = 'destination-in';
  const ga = sg.createLinearGradient(0, 0, 0, 46);
  ga.addColorStop(0, 'rgba(0,0,0,1)'); ga.addColorStop(1, 'rgba(0,0,0,0)');
  sg.fillStyle = ga; sg.fillRect(0, 0, 64, 46);
  ctx.drawImage(strip, x, y, W, 46);
}
