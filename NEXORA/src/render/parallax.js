import { CONFIG } from '../core/config.js';
import { View } from '../core/view.js';
import { state } from '../game/state.js';
import { TAU } from '../core/util.js';
import { outlined } from './draw.js';

// Katman sırası (uzaktan yakına): gökyüzü → ada → kale → dağ/ağaç → (zemin dekoru world.js'te) → oyun alanı.
// Her katman yatayda tekrarlanan bir şerittir; kaydırma = oyuncunun gittiği mesafe × katman hızı.
// Katman tanımları data/config.json → parallax. Hepsi placeholder Canvas çizimidir.
const LAYERS = { islands: drawIslands, castles: drawCastles, mountains: drawMountains, trees: drawTrees };

export function drawBackground(ctx) {
  drawSkyLayer(ctx);
  const travelled = state.player.a * CONFIG.planet.radius;      // dünya birimi
  const horizon = View.heroY - 18 * View.scale;
  for (const L of CONFIG.parallax) {
    const fn = LAYERS[L.id]; if (!fn) continue;
    const period = L.period * View.scale;
    const off = ((travelled * L.speed * View.scale) % period + period) % period;
    for (let x = -period - off; x < View.w + period; x += period) {
      ctx.save(); ctx.translate(x, 0); fn(ctx, period, horizon, L); ctx.restore();
    }
  }
}

function drawSkyLayer(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, View.heroY);
  g.addColorStop(0, '#2f86e6'); g.addColorStop(0.6, '#79c3f5'); g.addColorStop(1, '#cfeeff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, View.w, View.h);
  // büyük yumuşak ay/güneş parıltısı
  const sx = View.w * 0.42, sy = View.heroY * 0.42, sr = 90 * View.scale;
  const rg = ctx.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 1.8);
  rg.addColorStop(0, 'rgba(255,248,200,.95)'); rg.addColorStop(0.4, 'rgba(255,248,200,.5)'); rg.addColorStop(1, 'rgba(255,248,200,0)');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, View.w, View.h);
  // bulutlar (kendi hızıyla kayar)
  const drift = state.time * 8 * View.scale + state.player.a * CONFIG.planet.radius * 0.01 * View.scale;
  const span = View.w + 260 * View.scale;
  for (let i = 0; i < 5; i++) {
    const x = (((i * 0.23 * span - drift * (0.6 + i * 0.12)) % span) + span) % span - 130 * View.scale;
    cloud(ctx, x, View.heroY * (0.14 + (i % 3) * 0.13), (1.3 + (i % 2) * 0.6) * View.scale);
  }
}

function cloud(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath();
  ctx.arc(-24, 0, 16, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(-6, -12, 18, Math.PI, 0);
  ctx.arc(18, -4, 14, Math.PI * 1.2, Math.PI * 0.5, false); ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(31,42,68,.35)'; ctx.stroke();
  ctx.restore();
}

// Uzak yüzen adalar (mavi tonlu, düşük kontrast)
function drawIslands(ctx, period, hz) {
  const s = View.scale;
  const items = [[0.18, 0.30, 1.2], [0.55, 0.16, 0.8], [0.84, 0.36, 1.0]];
  for (const [fx, fy, k] of items) island(ctx, period * fx, hz * fy, 150 * k * s, 'rgba(90,130,200,.75)', 'rgba(70,100,170,.8)');
}
function island(ctx, x, y, w, top, rock) {
  ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w * 0.18, y + w * 0.5); ctx.lineTo(x, y + w * 0.62); ctx.lineTo(x - w * 0.22, y + w * 0.45); ctx.closePath();
  ctx.fillStyle = rock; ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y, w / 2, w * 0.1, 0, 0, TAU); ctx.fillStyle = top; ctx.fill();
}

// Orta arka plan: kale/şehir siluetleri
function drawCastles(ctx, period, hz) {
  const s = View.scale, base = hz - 6 * s;
  ctx.fillStyle = 'rgba(70,90,170,.7)';
  for (const [fx, w, h] of [[0.2, 90, 120], [0.62, 110, 95]]) {
    const x = period * fx;
    ctx.fillRect(x - w * s / 2, base - h * s, w * s, h * s);
    for (const dx of [-0.4, 0, 0.4]) ctx.fillRect(x + dx * w * s - 9 * s, base - (h + 34) * s, 18 * s, 34 * s);
    ctx.beginPath(); ctx.moveTo(x - 14 * s, base - (h + 34) * s); ctx.lineTo(x, base - (h + 70) * s); ctx.lineTo(x + 14 * s, base - (h + 34) * s); ctx.fill();
  }
}

// Dağ / kaya siluetleri
function drawMountains(ctx, period, hz) {
  const s = View.scale;
  ctx.beginPath(); ctx.moveTo(0, hz + 40 * s);
  const pts = [[0.0, 20], [0.12, 80], [0.25, 40], [0.4, 110], [0.55, 50], [0.72, 90], [0.88, 36], [1.0, 20]];
  for (const [fx, h] of pts) ctx.lineTo(period * fx, hz - h * s);
  ctx.lineTo(period, hz + 40 * s); ctx.closePath();
  ctx.fillStyle = 'rgba(52,100,150,.85)'; ctx.fill();
}

// Yakın siluet ağaçları + yeşil tepe
function drawTrees(ctx, period, hz) {
  const s = View.scale;
  ctx.beginPath(); ctx.moveTo(0, hz + 60 * s);
  for (let i = 0; i <= 8; i++) ctx.lineTo(period * i / 8, hz - (14 + 12 * Math.sin(i * 1.7)) * s);
  ctx.lineTo(period, hz + 60 * s); ctx.closePath(); ctx.fillStyle = '#4aa65a'; ctx.fill();
  for (const [fx, h] of [[0.15, 150], [0.4, 110], [0.78, 135]]) {
    const x = period * fx, hh = h * s;
    ctx.beginPath(); ctx.rect(x - 7 * s, hz - hh * 0.35, 14 * s, hh * 0.4); ctx.fillStyle = '#6b5a4a'; ctx.fill();
    for (let k = 0; k < 3; k++) {
      const w = (60 - k * 14) * s, y = hz - hh * 0.3 - k * hh * 0.28;
      ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x, y - hh * 0.4); ctx.lineTo(x + w, y); ctx.closePath();
      ctx.fillStyle = k % 2 ? '#2f8a4a' : '#3a9a52'; ctx.fill();
    }
  }
}
