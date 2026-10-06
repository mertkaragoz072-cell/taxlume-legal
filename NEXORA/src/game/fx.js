// fx: savaş parçacıkları (kıvılcım/slash çizgisi, toz, ölüm dumanı) + hit-stop. Veri state.particles'ta; çizim render/effects.js → drawParticles.
// Her parçacık: { a (dünya açısı), h (yükseklik), vx (zemin boyunca birim/sn), vh, g (yerçekimi), life, max, size, color, kind: 'streak' | 'dot' }
import { CONFIG } from '../core/config.js';
import { rand, TAU } from '../core/util.js';
import { state } from './state.js';

const MAX = 90;
const add = (p) => { if (state.particles.length >= MAX) state.particles.shift(); state.particles.push({ ...p, max: p.life }); };

// Vuruşta küçük slash/kıvılcım çizgileri (kritikte daha çok, altın)
export function hitSparks(a, h, dir, crit = false) {
  const n = crit ? 9 : 5, R = CONFIG.planet.radius;
  for (let i = 0; i < n; i++) {
    const sp = rand(140, crit ? 380 : 280), ang = rand(-0.9, 0.9);
    add({ a: a + dir * 6 / R, h, vx: dir * Math.cos(ang) * sp, vh: Math.sin(ang) * sp * 0.8 + 40, g: 500, life: rand(0.16, 0.3), size: crit ? rand(2.4, 3.6) : rand(1.6, 2.6), color: crit ? (i % 2 ? '#ffd23f' : '#fff6c0') : (i % 2 ? '#ffffff' : '#9fe8ff'), kind: 'streak' });
  }
}

// Ölüm dumanı/parçacıkları: normal küçük, boss büyük (renkli toz + altın kıvılcım)
export function deathBurst(a, h, big = false) {
  const n = big ? 34 : 11;
  for (let i = 0; i < n; i++) {
    const sp = rand(40, big ? 300 : 150), ang = rand(0, TAU);
    add({ a, h: h + rand(-8, 8), vx: Math.cos(ang) * sp, vh: Math.abs(Math.sin(ang)) * sp * 0.9 + 30, g: 380, life: rand(0.35, big ? 0.95 : 0.6), size: big ? rand(3, 7) : rand(2, 4.5), color: i % 3 === 0 ? '#ffe28a' : (i % 3 === 1 ? '#8fc45a' : '#d9d2b8'), kind: 'dot' });
  }
}

// Yer darbesi tozu (boss çekiç/ezme/hücum çarpması)
export function groundDust(a, n = 12, spread = 140) {
  for (let i = 0; i < n; i++) {
    const s = i % 2 ? 1 : -1;
    add({ a, h: rand(2, 8), vx: s * rand(30, spread), vh: rand(40, 150), g: 320, life: rand(0.3, 0.6), size: rand(2.5, 5), color: i % 3 ? '#cfc7a8' : '#a98f62', kind: 'dot' });
  }
}

// Oyuncu hasar alınca kırmızı kıvılcımlar
export function hurtSparks(a, h) {
  for (let i = 0; i < 7; i++) add({ a, h: h + rand(-14, 14), vx: rand(-160, 160), vh: rand(40, 190), g: 420, life: rand(0.2, 0.4), size: rand(2, 3.6), color: i % 2 ? '#ff5a4a' : '#ffb0a0', kind: 'dot' });
}

export function updateParticles(dt) {
  const R = CONFIG.planet.radius;
  for (const p of state.particles) { p.life -= dt; p.a += p.vx * dt / R; p.h = Math.max(0, p.h + p.vh * dt); p.vh -= p.g * dt; if (p.h === 0) p.vx *= 0.9; }
  state.particles = state.particles.filter((p) => p.life > 0);
}

// Hit-stop: saniye cinsinden kısa duraklama (en büyük değer geçerli). Savaş döngüsü bu sürede sadece efektleri/atış sayacını işletir.
export function hitStop(sec) { state.hitStop = Math.max(state.hitStop || 0, sec); }

// XP patlaması: boss ölümünde mavi/cam göbeği ışık parçacıkları yukarı süzülür
export function xpBurst(a, h) {
  for (let i = 0; i < 22; i++) {
    const ang = rand(0, TAU), sp = rand(60, 220);
    add({ a, h: h + rand(-10, 10), vx: Math.cos(ang) * sp, vh: Math.abs(Math.sin(ang)) * sp + 60, g: 120, life: rand(0.6, 1.1), size: rand(2.5, 4.5), color: i % 2 ? '#7ee7ff' : '#d8f6ff', kind: 'dot' });
  }
}
