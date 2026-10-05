import { CONFIG, ANIMS } from '../core/config.js';
import { Assets } from '../core/assets.js';
import { Input } from '../core/input.js';
import { TAU, clamp } from '../core/util.js';
import { state } from '../game/state.js';
import { onSurface, onLane, groundShadow, outlined, outline } from './draw.js';

function eyes(ctx, x, y, dir, big) {
  const r = big ? 4 : 3;
  for (const ex of [x - 5, x + 5]) {
    ctx.beginPath(); ctx.arc(ex, y, r, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); outlined(ctx, 1.5);
    ctx.beginPath(); ctx.arc(ex + dir * 1.2, y + 0.5, 1.6, 0, TAU); ctx.fillStyle = outline(); ctx.fill();
  }
}

// Sprite varsa (data/male_animations.json + manifest) kare kare çizer; yoksa false döner.
function drawPlayerSprite(ctx) {
  const p = state.player, meta = ANIMS.male, anim = meta?.animations[p.anim];
  if (!anim) return false;
  const n = anim.frames.length;
  const i = anim.loop ? Math.floor(p.animT * anim.fps) % n : Math.min(n - 1, Math.floor(p.animT * anim.fps));
  const img = Assets.get('male_' + anim.frames[i]);
  if (!img) return false;
  if (p.invuln > 0 && Math.floor(state.time * 20) % 2 === 0 && !state.over) ctx.globalAlpha = 0.6;
  onLane(ctx, p.a, 0, p.lean * 0.5, () => {
    groundShadow(ctx, 70);
    ctx.scale(p.dir, 1);
    const sc = meta.scale;
    ctx.drawImage(img, -meta.pivot[0] * sc, -meta.pivot[1] * sc, img.width * sc, img.height * sc);
  });
  ctx.globalAlpha = 1;
  return true;
}

export function drawPlayer(ctx) {
  if (drawPlayerSprite(ctx)) return;
  const p = state.player;
  const step = Math.sin(p.walk) * (Math.abs(Input.axis) > 0 ? 1 : 0);
  const bob = Math.abs(Math.sin(p.walk)) * 2 * Math.abs(Input.axis);
  if (p.invuln > 0 && Math.floor(state.time * 20) % 2 === 0 && !state.over) ctx.globalAlpha = 0.55;
  onLane(ctx, p.a, 0, p.lean, () => {
    const d = p.dir; ctx.scale(d, 1);
    ctx.translate(0, -bob);
    // gölge
    ctx.beginPath(); ctx.ellipse(0, bob + 1, 16, 4, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fill();
    // bacaklar
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.roundRect(s * 6 - 4 + step * s * 2, -12, 8, 12, 3);
      ctx.fillStyle = '#5b4bd1'; ctx.fill(); outlined(ctx, 2.5);
    }
    // kılıç (arka, sallanır)
    ctx.save(); ctx.translate(14, -22); ctx.rotate(p.atkTimer > CONFIG.player.attackCooldown - 0.15 ? 0.9 : -0.5);
    ctx.beginPath(); ctx.rect(-2, -26, 4, 24); ctx.fillStyle = '#e6edf7'; ctx.fill(); outlined(ctx, 2.5);
    ctx.beginPath(); ctx.rect(-6, -3, 12, 4); ctx.fillStyle = '#ffd23f'; ctx.fill(); outlined(ctx, 2.5);
    ctx.restore();
    // gövde
    ctx.beginPath(); ctx.roundRect(-11, -30, 22, 22, 7);
    ctx.fillStyle = p.hitFlash > 0 ? '#ff9a9a' : '#4f8bff'; ctx.fill(); outlined(ctx, 3);
    ctx.beginPath(); ctx.roundRect(-9, -28, 6, 18, 3); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill();
    // kafa (chibi: büyük)
    ctx.beginPath(); ctx.arc(0, -44, 17, 0, TAU); ctx.fillStyle = '#ffd9b3'; ctx.fill(); outlined(ctx, 3);
    // saç / miğfer
    ctx.beginPath(); ctx.arc(0, -46, 17, Math.PI * 1.02, Math.PI * 1.98); ctx.lineTo(10, -50); ctx.lineTo(-10, -50); ctx.closePath();
    ctx.fillStyle = '#e8534a'; ctx.fill(); outlined(ctx, 3);
    eyes(ctx, 3, -42, 1, true);
  });
  ctx.globalAlpha = 1;
}

// Düşman sprite'ı: referans sanat setinden çıkarılmış tek statik poz. Canlandırma prosedürel:
// yürürken sekme/ezilme/sallanma, vuruşta beyaz parlama, ölümde yan yatıp solma.
const whiteCache = new Map();
function whiteSilhouette(img, key) {
  if (whiteCache.has(key)) return whiteCache.get(key);
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const g = cv.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
  whiteCache.set(key, cv); return cv;
}

// Düşman animasyonu: durum → kare. death > hurt > attack > walk. Kareler data/enemy_animations.json'dan (goblin sheet'i).
function enemyFrame(en, meta) {
  const A = meta.anims;
  let an, t;
  if (en.dead) { an = 'death'; t = en.deathT; }
  else if (en.stagger > 0 && A.hurt) { an = 'hurt'; t = 0.22 - en.stagger; }
  else if (en.attackT >= 0 && A.attack) { an = 'attack'; t = en.attackT; }
  else { an = 'walk'; t = en.bob / 8; }
  const L = A[an], n = L.frames.length;
  const idx = L.loop ? Math.floor(t * L.fps) % n : Math.min(n - 1, Math.floor(t * L.fps));
  return L.frames[idx];
}

export function drawEnemy(ctx, en) {
  const def = en.def, meta = ANIMS.enemies?.[en.type];
  if (!meta) return;
  const key = enemyFrame(en, meta), img = Assets.get(key);
  if (!img) return;
  const sc = meta.scale, w = img.width * sc, h = img.height * sc;
  const dp = en.dead ? clamp((en.deathT - 0.5) / 0.4, 0, 1) : 0;       // ölünce önce yatar, sonra solar
  onLane(ctx, en.a, 0, 0, () => {
    ctx.globalAlpha = 1 - dp;
    groundShadow(ctx, def.width * (en.dead ? 1.2 : 0.85), 0.36);      // ayakların hemen altında
    ctx.save();
    ctx.scale(meta.facing === 'right' ? en.face : -en.face, 1);       // kareler sağa bakar; oyuncuya dönük çizilir
    ctx.drawImage(img, -meta.pivot[0] * sc, -meta.pivot[1] * sc, w, h);
    if (en.flash > 0) { ctx.globalAlpha = (1 - dp) * Math.min(1, en.flash / 0.14) * 0.8; ctx.drawImage(whiteSilhouette(img, key), -meta.pivot[0] * sc, -meta.pivot[1] * sc, w, h); }
    ctx.restore();
    ctx.globalAlpha = 1;
    if (!en.dead) {                                   // temiz küçük HP bar
      const bw = def.barWidth, bh = 6, y = -def.heightUnits - 14, f = Math.max(0, en.hp / en.maxHp);
      ctx.beginPath(); ctx.roundRect(-bw / 2 - 2, y - 2, bw + 4, bh + 4, 5); ctx.fillStyle = 'rgba(20,24,44,.85)'; ctx.fill();
      if (def.elite) { ctx.strokeStyle = '#f1c24b'; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.beginPath(); ctx.roundRect(-bw / 2, y, bw * f, bh, 3);
      const g = ctx.createLinearGradient(0, y, 0, y + bh); g.addColorStop(0, '#ff6b6b'); g.addColorStop(1, '#d92f3f');
      ctx.fillStyle = g; ctx.fill();
    }
  });
}
