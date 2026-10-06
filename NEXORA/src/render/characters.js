import { CONFIG, ANIMS, HERO } from '../core/config.js';
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
  const p = state.player, meta = ANIMS.hero, anim = meta?.animations[p.anim];
  if (!anim) return false;
  if (meta.static) return drawHeroine(ctx, meta, anim);       // kadın savaşçı: kare tabanlı VEYA prosedürel (animasyon başına)
  const n = anim.frames.length;
  const i = anim.loop ? Math.floor(p.animT * anim.fps) % n : Math.min(n - 1, Math.floor(p.animT * anim.fps));
  const img = Assets.get(HERO.id + '_' + anim.frames[i]);
  if (!img) return false;
  if (p.invuln > 0 && Math.floor(state.time * 20) % 2 === 0 && !state.over) ctx.globalAlpha = 0.6;
  onLane(ctx, p.a, 0, p.lean * 0.5, () => {
    groundShadow(ctx, 56, 0.34);                                   // ayakların altında küçük yumuşak oval
    ctx.scale(p.dir, 1);
    const sc = meta.scale, hurt = Math.max(0, p.hitFlash) / 0.2, running = Math.abs(p.moveAxis) > 0 && p.anim === 'run';
    // squash/stretch: koşarken adım ritmi, saldırıda hafif uzama, hasarda ezilme (ayaklar sabit kalır)
    const sy = 1 + (running ? Math.sin(p.walk * 2) * 0.025 : 0) - hurt * 0.07 + (p.anim.startsWith('attack') ? 0.02 : 0);
    const sx = 1 / sy;
    ctx.scale(sx, sy);
    const fxMul = CONFIG.player.slashFxScale, body = Assets.get(HERO.id + 'body_' + anim.frames[i]), fx = Assets.get(HERO.id + 'fx_' + anim.frames[i]), anc = meta.fxAnchor?.[anim.frames[i]];
    if (body && fx && anc) {
      // gövde katmanı tam boy; mavi kılıç efekti kılıcın çıktığı noktaya (çapa) sabitlenip küçültülür
      ctx.drawImage(body, -meta.pivot[0] * sc, -meta.pivot[1] * sc, img.width * sc, img.height * sc);
      ctx.save(); ctx.globalAlpha *= CONFIG.player.slashFxAlpha;
      ctx.translate((anc[0] - meta.pivot[0]) * sc, (anc[1] - meta.pivot[1]) * sc); ctx.scale(fxMul, fxMul);
      ctx.drawImage(fx, -anc[0] * sc, -anc[1] * sc, img.width * sc, img.height * sc);
      ctx.restore();
    } else ctx.drawImage(img, -meta.pivot[0] * sc, -meta.pivot[1] * sc, img.width * sc, img.height * sc);
    if (hurt > 0) { ctx.globalAlpha = 0.55 * hurt; ctx.drawImage(whiteSilhouette(img, 'p:' + anim.frames[i], '#ff5a4a'), -meta.pivot[0] * sc, -meta.pivot[1] * sc, img.width * sc, img.height * sc); }
  });
  ctx.globalAlpha = 1;
  return true;
}

// Tek görselli kahraman (kadın savaşçı): hareketler prosedürel — nefes/koşu sekmesi, saldırıda ileri atılma + küçük hilal,
// hasarda geri savrulma + kırmızı parlama, ölümde arkaya devrilme. Gerçek animasyon assetleri gelince ayrı kare setiyle değişir.
function drawHeroine(ctx, meta, anim) {
  return anim.procedural ? drawProceduralHero(ctx, meta, anim) : drawHeroFrames(ctx, meta, anim);
}

// Kare tabanlı kahraman (assets/characters/female/<anim>/<anim>_NN.png): ölçek ve pivot TÜM animasyonlarda sabit → boyut değişmez,
// ayaklar pivotta (zemin). Dönüş/ezilme yok; sadece kare seçimi. Run karesi geçen zamana değil kat edilen mesafeye bağlı (ayak kaymaz).
function drawHeroFrames(ctx, meta, anim) {
  const p = state.player, F = meta.framed, name = p.anim, n = anim.frames.length;
  let i;
  if (name === 'run' && anim.strideUnits) i = Math.floor(p.stride / anim.strideUnits) % n;
  else i = anim.loop ? Math.floor(p.animT * anim.fps) % n : Math.min(n - 1, Math.floor(p.animT * anim.fps));
  const key = anim.frames[i], img = Assets.get(key);
  if (!img || !F) return false;
  const sc = F.scale, w = img.width * sc, h = img.height * sc, px = F.pivot[0] * sc, py = F.pivot[1] * sc, hurtK = Math.max(0, p.hitFlash) / 0.2;
  let alpha = 1;
  if (p.invuln > 0 && Math.floor(state.time * 20) % 2 === 0 && !state.over) alpha = 0.6;
  onLane(ctx, p.a, 0, p.lean * 0.3, () => {
    groundShadow(ctx, 56 * (name === 'death' ? 1.5 : 1), 0.34);
    ctx.scale(p.dir, 1);
    ctx.globalAlpha = alpha; ctx.drawImage(img, -px, -py, w, h);
    if (hurtK > 0 && name !== 'death') { ctx.globalAlpha = alpha * 0.45 * hurtK; ctx.drawImage(whiteSilhouette(img, key, '#ff5a4a'), -px, -py, w, h); }
    if (name === 'attack' && anim.fx === 'overlay') {                    // oyunun mavi hilali kılıç ucuna (kareye özel uç noktası varsa o)
      const tip = anim.swordTipFrames?.[key.replace('heroine_', '')] || anim.swordTip, u = Math.min(1, p.animT * anim.fps / n);
      const fx = Assets.get('fx_attack_1_slash');
      if (fx && tip && u > 0.3 && u < 0.85) {
        const k = CONFIG.player.slashFxScale * 0.55, a = 1 - (u - 0.3) / 0.55, tx = tip[0] * sc - px, ty = tip[1] * sc - py;
        ctx.globalAlpha = alpha * 0.9 * a; ctx.drawImage(fx, tx - fx.width * k * 0.75, ty - fx.height * k * 0.5, fx.width * k, fx.height * k);
      }
    }
    ctx.globalAlpha = 1;
  });
  return true;
}

function drawProceduralHero(ctx, meta, anim) {
  const p = state.player, img = Assets.get(meta.image);
  if (!img) return false;
  const sc = meta.scale, T = p.animT, dur = anim.frames.length / anim.fps, u = Math.min(1, T / dur), name = p.anim;
  let dx = 0, dy = 0, rot = 0, sx = 1, sy = 1, alpha = 1;
  const hurtK = Math.max(0, p.hitFlash) / 0.2;
  if (name === 'idle') { const b = Math.sin(state.time * 2.6); sy = 1 + b * 0.012; sx = 1 / sy; rot = Math.sin(state.time * 1.3) * 0.008; }
  else if (name === 'run') { const w = p.walk; dy = -Math.abs(Math.sin(w)) * 4; rot = 0.07 + Math.sin(w) * 0.025; sy = 1 + Math.sin(w * 2) * 0.035; sx = 1 / sy; }
  else if (name === 'attack') {
    const k = u < 0.3 ? -(u / 0.3) : (u < 0.55 ? -1 + ((u - 0.3) / 0.25) * 2.4 : 1.4 - ((u - 0.55) / 0.45) * 1.4);   // toparlan → atılır → döner
    dx = k * 7; rot = k * 0.11; sy = 1 + (u > 0.3 && u < 0.6 ? 0.025 : 0);
  } else if (name === 'hurt') { const k = 1 - u; dx = -9 * k; rot = -0.15 * k; sy = 1 - 0.06 * k; sx = 1 / sy; dx += Math.sin(T * 60) * 1.5 * k; }
  else if (name === 'death') { const e = 1 - Math.pow(1 - u, 2); rot = -e * 1.5; dx = -22 * e; dy = -16 * e; alpha = 1 - Math.max(0, (T - dur) / 1.2) * 0.4; }
  if (p.invuln > 0 && Math.floor(state.time * 20) % 2 === 0 && !state.over) alpha *= 0.6;
  const w = img.width * sc, h = img.height * sc, px = meta.pivot[0] * sc, py = meta.pivot[1] * sc;
  onLane(ctx, p.a, 0, p.lean * 0.4, () => {
    groundShadow(ctx, 60 * (name === 'death' ? 1.6 : 1), 0.34);
    ctx.scale(p.dir, 1);
    ctx.globalAlpha = alpha;
    ctx.translate(dx, dy); ctx.rotate(rot); ctx.scale(sx, sy);           // ayaklar (pivot) orijinde: dönüş/ezilme ayaklardan
    ctx.drawImage(img, -px, -py, w, h);
    if (hurtK > 0) { ctx.globalAlpha = alpha * 0.5 * hurtK; ctx.drawImage(whiteSilhouette(img, 'heroine', '#ff5a4a'), -px, -py, w, h); }
    if (name === 'attack' && u > 0.28 && u < 0.75) {                     // kılıç ucundan küçük mavi hilal
      const fx = Assets.get('fx_attack_1_slash'), a = 1 - (u - 0.28) / 0.47;
      if (fx) {
        const k = CONFIG.player.slashFxScale * 0.55, tx = (meta.swordTip[0]) * sc - px, ty = meta.swordTip[1] * sc - py;
        ctx.globalAlpha = alpha * 0.9 * a; ctx.drawImage(fx, tx - fx.width * k * 0.75, ty - fx.height * k * 0.5, fx.width * k, fx.height * k);
      }
    }
    ctx.globalAlpha = 1;
  });
  return true;
}

export function drawPlayer(ctx) {
  if (drawPlayerSprite(ctx)) return;
  const p = state.player;
  const step = Math.sin(p.walk) * (Math.abs(state.player.moveAxis) > 0 ? 1 : 0);
  const bob = Math.abs(Math.sin(p.walk)) * 2 * Math.abs(state.player.moveAxis);
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
function whiteSilhouette(img, key, color = '#fff') {
  const id = key + color;
  if (whiteCache.has(id)) return whiteCache.get(id);
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const g = cv.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, cv.width, cv.height);
  whiteCache.set(id, cv); return cv;
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
    const hitK = en.dead ? 0 : Math.max(0, en.stagger || 0) / 0.22, sq = en.dead ? 1 : 1 + (en.attackT >= 0 ? 0.03 : Math.sin(en.bob * 1.6) * 0.02) - hitK * 0.07;
    ctx.scale(meta.facing === 'right' ? en.face : -en.face, 1);       // kareler sağa bakar; oyuncuya dönük çizilir
    ctx.scale(1 / sq, sq);                                            // hafif squash/stretch + vuruş ezilmesi (ayak sabit)
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
