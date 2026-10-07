import { CONFIG, ANIMS, HERO } from '../core/config.js';
import { Assets } from '../core/assets.js';
import { Input } from '../core/input.js';
import { TAU, clamp } from '../core/util.js';
import { state } from '../game/state.js';
import { enemyMeta } from '../game/EnemySpawner.js';
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
    if (p.anim !== 'death') castShadow(ctx, img, 'p:' + anim.frames[i], -meta.pivot[0] * meta.scale, -meta.pivot[1] * meta.scale, img.width * meta.scale, img.height * meta.scale, p.dir);
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
    if (name !== 'death') castShadow(ctx, img, key, -px, -py, w, h, p.dir);
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

// Kadın savaşçı "kesme bebek" (cutout puppet) animasyonu: tek ana görsel üç katmana bölünür (arka bacak, ön bacak, gövde+saç/pelerin).
// Koşuda bacaklar kalça etrafında kat edilen mesafeyle senkron döner/kalkar, gövde kalçadan eğilir ve sekir; saç/pelerin/eşarp
// dalga bükmesiyle (dikey şeritler) savrulur; saldırıda ayaklar yere basık kalır, gövde kalçadan geri yaslanıp öne savrulur (hayalet izleriyle).
const HERO_CUT = { y: 365, ext: 26, back: [130, 290], front: [300, 425], hipBack: [215, 352], hipFront: [350, 352], hip: [280, 355], swordX: 385, grip: [385, 330] };
let heroLayers = null;
function getHeroLayers(img) {
  if (heroLayers && heroLayers.src === img) return heroLayers;
  const C = HERO_CUT, mk = () => { const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; return cv; };
  const torso = mk(), back = mk(), front = mk(), sword = mk(), tg = torso.getContext('2d');
  const sg = sword.getContext('2d'), SR = [[C.swordX, 268, 500 - C.swordX, C.y - 268], [500, 236, img.width - 500, C.y - 236]];      // kılıç (bıçak+kabza) ayrı katman; saç telleri dışarıda
  tg.drawImage(img, 0, 0);
  for (const [x, y, w, h] of SR) { sg.drawImage(img, x, y, w, h, x, y, w, h); tg.clearRect(x, y, w, h); } tg.clearRect(C.back[0], C.y, C.front[1] - C.back[0], img.height - C.y);          // bacaklar gövdeden ayrılır
  for (const [cv, r] of [[back, C.back], [front, C.front]]) {
    const g = cv.getContext('2d'), y0 = C.y - C.ext;
    g.drawImage(img, r[0], y0, r[1] - r[0], img.height - y0, r[0], y0, r[1] - r[0], img.height - y0);        // üst 26 px gövde altında gizlenen binme payı
  }
  return (heroLayers = { src: img, torso, back, front, sword });
}

// Saç/pelerin dalgası: sol (arka) taraftaki sütunlar dikey şeritler halinde sinüsle kaydırılır; gövde tarafı (x>270) sabit.
function drawWarped(ctx, cv, px, py, sc, t, amp, flow = 0) {
  const W = cv.width, H = cv.height, S = 8;
  for (let x = 0; x < W; x += S) {
    const wgt = Math.min(1, Math.max(0, (275 - (x + S / 2)) / 175)), off = wgt * amp * (Math.sin(t * 7.5 - x * 0.034) + 0.35 * Math.sin(t * 12.7 - x * 0.07));
    ctx.drawImage(cv, x, 0, S + 0.6, H, (x - px) * sc, (off - py - flow * wgt * (275 - x) * 0.05) * sc, (S + 0.6) * sc, H * sc);
  }
}

function drawProceduralHero(ctx, meta, anim) {
  const p = state.player, img = Assets.get(meta.image);
  if (!img) return false;
  const L = getHeroLayers(img), C = HERO_CUT;
  const sc = meta.scale, T = p.animT, dur = anim.frames.length / anim.fps, u = Math.min(1, T / dur), name = p.anim, time = state.time;
  let dx = 0, dy = 0, grot = 0, hipRot = 0, thB = 0, thF = 0, liftB = 0, liftF = 0, alpha = 1, amp = 3.2, ghost = 0, swordRot = 0;
  const hurtK = Math.max(0, p.hitFlash) / 0.2;
  const ease = (x) => x * x * (3 - 2 * x);
  if (name === 'idle') {
    const b = Math.sin(time * 2.6); hipRot = 0.012 + b * 0.012; dy = b * 0.9; thB = 0.03 + b * 0.01; thF = -0.02; amp = 2.6;
  } else if (name === 'run') {
    const ph = (p.stride / 62) * TAU, sn = Math.sin(ph), cs = Math.cos(ph);
    thF = 0.55 * sn; thB = -0.55 * sn; liftF = Math.max(0, cs) * 10; liftB = Math.max(0, -cs) * 10;
    dy = -Math.abs(sn) * 5; hipRot = 0.1 + Math.sin(ph * 2) * 0.03; amp = 6.5;
  } else if (name === 'attack') {
    const k = u < 0.3 ? -ease(u / 0.3) : (u < 0.55 ? -1 + ease((u - 0.3) / 0.25) * 2.35 : 1.35 - ease((u - 0.55) / 0.45) * 1.35);   // toparlan → savrulur → döner
    hipRot = k * 0.22; dx = k * 12; dy = -Math.max(0, k) * 5; thF = Math.max(0, k) * 0.28; liftB = Math.max(0, k) * 4; thB = -Math.max(0, k) * 0.08; amp = 4.4;
    if (u > 0.3 && u < 0.62) ghost = 1;
  } else if (name === 'hurt') {
    const k = 1 - u, hop = Math.sin(Math.min(1, T / 0.28) * Math.PI);                  // vuruşta geri savrulup küçük sıçrama + ezilme
    dx = -16 * (1 - Math.pow(1 - Math.min(1, T / 0.18), 2)) * (0.4 + 0.6 * k) + Math.sin(T * 70) * 1.6 * k; dy = -hop * 10;
    hipRot = -0.3 * k; thB = 0.45 * k; thF = -0.35 * k; liftB = hop * 6; liftF = hop * 5; amp = 7 * k + 2; ghost = 0;
  } else if (name === 'death') {
    // devrilme: geri fırlar (yay), havada döner, yere çarpıp iki kez seker, yatar; bacaklar havada çırpınır
    const t = T, A = 0.5, B = 0.74, C2 = 0.95, ez = (x) => x * x * (3 - 2 * x);
    if (t < A) { const q = t / A; dx = -58 * q; dy = -60 * Math.sin(q * Math.PI * 0.92); grot = -1.8 * (q * (2 - q)) - 0.25 * Math.sin(q * 9); hipRot = -0.2 * q; thB = 0.9 * Math.sin(q * 7); thF = -0.8 * Math.sin(q * 7 + 1); }
    else if (t < B) { const q = (t - A) / (B - A); dx = -58 - 12 * q; dy = -18 * Math.sin(q * Math.PI); grot = -1.8 - 0.1 * q; thB = 0.95 * ez(q); thF = 0.8 * ez(q); }
    else { const q = Math.min(1, (t - B) / (C2 - B)); dx = -70 - 5 * q; dy = -5 * Math.sin(q * Math.PI) - 10 * q; grot = -1.9 + 0.05 * q; thB = 0.95 + 0.05 * q; thF = 0.8 + 0.05 * q; }
    swordRot = Math.min(1, Math.max(0, (t - 0.12) / 0.55)) * 1.85;             // kılıç elinden savrulup yere yatar
    amp = t < A ? 8 : 1.5; alpha = 1 - Math.max(0, (T - 1.4) / 1.2) * 0.4;
  }
  if (p.invuln > 0 && Math.floor(time * 20) % 2 === 0 && !state.over) alpha *= 0.6;
  const px = meta.pivot[0], py = meta.pivot[1];
  const part = (cv, key, hx, hy, rot, lift) => {                               // bir katmanı (kalça pivotuyla) döndürerek çiz
    ctx.save(); ctx.translate((hx - px) * sc, (hy - py - lift / sc) * sc); ctx.rotate(rot);
    ctx.drawImage(cv, -hx * sc, -hy * sc, cv.width * sc, cv.height * sc);
    if (hurtK > 0 && name !== 'death') { ctx.globalAlpha = alpha * 0.5 * hurtK; ctx.drawImage(whiteSilhouette(cv, 'heroine' + key, '#ff5a4a'), -hx * sc, -hy * sc, cv.width * sc, cv.height * sc); ctx.globalAlpha = alpha; }
    ctx.restore();
  };
  onLane(ctx, p.a, 0, p.lean * 0.3, () => {
    groundShadow(ctx, 60 * (name === 'death' ? 1.6 : 1), 0.34);
    ctx.scale(p.dir, 1);
    if (name !== 'death') castShadow(ctx, img, 'heroine', -px * sc, -py * sc, img.width * sc, img.height * sc, p.dir);
    ctx.globalAlpha = alpha;
    ctx.translate(dx, dy); ctx.rotate(grot);                                   // grup hareketi (ayaklar orijinde)
    part(L.back, 'B', C.hipBack[0], C.hipBack[1], thB, liftB);
    part(L.front, 'F', C.hipFront[0], C.hipFront[1], thF, liftF);
    // gövde: kalçadan eğilir; saldırıda iki hayalet iz
    const body = (a, extraRot) => {
      ctx.save(); ctx.globalAlpha = alpha * a; ctx.translate((C.hip[0] - px) * sc, (C.hip[1] - py) * sc); ctx.rotate(hipRot + extraRot); ctx.translate(-(C.hip[0] - px) * sc, -(C.hip[1] - py) * sc);
      drawWarped(ctx, L.torso, px, py, sc, time, amp, name === 'run' ? 1 : 0);
      ctx.save(); const gx = (C.grip[0] - px) * sc, gy = (C.grip[1] - py) * sc; ctx.translate(gx, gy); ctx.rotate(swordRot); ctx.translate(-gx, -gy);
      ctx.drawImage(L.sword, -px * sc, -py * sc, L.sword.width * sc, L.sword.height * sc); ctx.restore();
      if (hurtK > 0 && name !== 'death') { ctx.globalAlpha = alpha * 0.5 * hurtK; ctx.drawImage(whiteSilhouette(L.torso, 'heroineT', '#ff5a4a'), -px * sc, -py * sc, L.torso.width * sc, L.torso.height * sc); }
      ctx.restore();
    };
    if (ghost) { body(0.12, -0.2); body(0.2, -0.1); }
    body(1, 0);
    if (name === 'attack' && u > 0.28 && u < 0.75) {                           // kılıç ucundan küçük mavi hilal
      const fx = Assets.get('fx_attack_1_slash'), a = 1 - (u - 0.28) / 0.47;
      if (fx) {
        const k = CONFIG.player.slashFxScale * 0.55, tx = (meta.swordTip[0]) * sc - px * sc, ty = meta.swordTip[1] * sc - py * sc;
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

// Güneşten düşen gölge: sprite silüeti ayaklardan yere yatırılır (dikey çevrilip 0.2'ye ezilir, güneş solda → sağa doğru uzar).
// Matris yerel koordinatta (ayak = orijin); sign = ekranda sağa uzama yönü düzeltmesi (yatay çevrili çizimlerde -1).
function castShadow(ctx, img, key, x, y, w, h, sign = 1, alpha = 0.42) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.transform(1, 0, -0.62 * sign, -0.2, 0, 0);
  ctx.drawImage(whiteSilhouette(img, key, '#0e1406'), x, y, w, h); ctx.restore();
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
  const def = en.def, meta = enemyMeta(en);
  if (!meta) return;
  const key = enemyFrame(en, meta), img = Assets.get(key);
  if (!img) return;
  const sc = meta.scale * (def.spriteMul || 1), w = img.width * sc, h = img.height * sc;
  const dp = en.dead ? clamp((en.deathT - 0.5) / 0.4, 0, 1) : 0;       // ölünce önce yatar, sonra solar
  onLane(ctx, en.a, 0, 0, () => {
    ctx.globalAlpha = (1 - dp) * Math.min(1, en.age / 0.3);       // doğarken kısa fade-in
    if (def.boss && !en.dead) {                                       // boss: ayaklarında kırmızı aura
      const pu = 0.5 + 0.5 * Math.sin(state.time * 4), g = ctx.createRadialGradient(0, 0, 0, 0, 0, def.width * 0.9);
      g.addColorStop(0, `rgba(255,70,50,${0.35 + pu * 0.15})`); g.addColorStop(1, 'rgba(255,70,50,0)');
      ctx.save(); ctx.scale(1, 0.22); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, def.width * 0.9, 0, TAU); ctx.fill(); ctx.restore();
    }
    groundShadow(ctx, def.width * (en.dead ? 1.2 : 0.85), 0.36);      // ayakların hemen altında
    ctx.save();
    const hitK = en.dead ? 0 : Math.max(0, en.stagger || 0) / 0.22, sq = en.dead ? 1 : 1 + (en.attackT >= 0 ? 0.03 : Math.sin(en.bob * 1.6) * 0.02) - hitK * 0.07;
    ctx.scale(meta.facing === 'right' ? en.face : -en.face, 1);       // kareler sağa bakar; oyuncuya dönük çizilir
    ctx.scale(1 / sq, sq);                                            // hafif squash/stretch + vuruş ezilmesi (ayak sabit)
    const sp = en.sp, wk = en.windT > 0 ? Math.min(1, en.windT / CONFIG.enemies.windupSec) : 0;
    if (wk > 0) { ctx.translate(-7 * (1 - wk * 0.4), -2 * wk); ctx.rotate(-0.1 * (1 - wk * 0.3)); }   // saldırı öncesi hazırlık: geri çekilip hafif yükselir
    if (sp && sp.phase === 'windup' && sp.atk === 'charge') ctx.rotate(-0.12);                          // hücum hazırlığı: geriye yaslanır
    else if (sp && sp.phase === 'dash') { ctx.rotate(0.16); ctx.translate(8, 0); }                       // hücum: öne eğik
    else if (sp && sp.phase === 'recover') ctx.translate(0, Math.sin(en.bob * 2) * 1.2);
    if (!en.dead) castShadow(ctx, img, key, -meta.pivot[0] * sc, -meta.pivot[1] * sc, w, h, meta.facing === 'right' ? en.face : -en.face, def.boss ? 0.3 : 0.34);
    ctx.drawImage(img, -meta.pivot[0] * sc, -meta.pivot[1] * sc, w, h);
    if (def.boss && !en.dead) { ctx.globalAlpha = (sp && sp.phase === 'windup' ? 0.32 + 0.22 * Math.sin(state.time * 22) : 0.16 + 0.08 * Math.sin(state.time * 5)) + (sp && sp.rage ? 0.1 * sp.rage : 0); ctx.drawImage(whiteSilhouette(img, key, '#ff3b2a'), -meta.pivot[0] * sc, -meta.pivot[1] * sc, w, h); ctx.globalAlpha = 1; }
    if (en.flash > 0) { ctx.globalAlpha = (1 - dp) * Math.min(1, en.flash / 0.14) * 0.5; ctx.drawImage(whiteSilhouette(img, key), -meta.pivot[0] * sc, -meta.pivot[1] * sc, w, h); }
    ctx.restore();
    ctx.globalAlpha = 1;
    if (!en.dead && !def.boss) {                      // temiz küçük HP bar (boss'un çubuğu ekranın üstünde)
      const bw = def.barWidth, bh = 6, y = -def.heightUnits - 14, f = Math.max(0, en.hp / en.maxHp);
      ctx.beginPath(); ctx.roundRect(-bw / 2 - 2, y - 2, bw + 4, bh + 4, 5); ctx.fillStyle = 'rgba(20,24,44,.85)'; ctx.fill();
      if (def.elite) { ctx.strokeStyle = '#f1c24b'; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.beginPath(); ctx.roundRect(-bw / 2, y, bw * f, bh, 3);
      const g = ctx.createLinearGradient(0, y, 0, y + bh); g.addColorStop(0, '#ff6b6b'); g.addColorStop(1, '#d92f3f');
      ctx.fillStyle = g; ctx.fill();
      if (def.boss) { ctx.font = '900 13px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = outline(); ctx.strokeText('BOSS', 0, y - 6); ctx.fillStyle = '#ff6b5a'; ctx.fillText('BOSS', 0, y - 6); }
    }
  });
}
