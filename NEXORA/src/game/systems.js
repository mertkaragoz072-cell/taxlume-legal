// Ana oyun döngüsü (update). Parçalar: combat.js (hasar/ödül), EnemySpawner.js + WaveManager.js (dalgalar), boss.js, skills.js,
// PlayerStats.js (güçlendirme statları). Burada: otomatik ilerleme, düşman hareketi, otomatik saldırı, pickup'lar, efekt zamanlayıcıları.
import { CONFIG, ANIMS, WAVES, HERO } from '../core/config.js';
import { Input } from '../core/input.js';
import { clamp, wrapAngle, frameAt } from '../core/util.js';
import { state } from './state.js';
import { events } from './events.js';
import { updateSkills } from './skills.js';
import { updateWaves } from './WaveManager.js';
import { updateBoss } from './boss.js';
import { enemyMeta } from './EnemySpawner.js';
import { derived } from './PlayerStats.js';
import { stepDust, groundDust } from './fx.js';
import { updateChests } from './Chests.js';
import { HULL, startRagdoll, stepRagdoll } from './ragdoll.js';
import { updateParticles } from './fx.js';
import { hitEnemy, hurtPlayer, collectCoin, collectGem, tickStatus, slowMul } from './combat.js';

export { events };
export { spawnEnemy } from './EnemySpawner.js';
export { damageEnemy, applyKnock } from './combat.js';

const R = () => CONFIG.planet.radius;
const surfaceDist = (a, b) => Math.abs(wrapAngle(a - b)) * R();

// Animasyon durum makinesi: ölüm > hasar > saldırı (bitene kadar) > koşu/bekleme. Saldırı animasyonu saldırı hızıyla hızlanır.
function updatePlayerAnim(p, dt, atkMul) {
  const set = ANIMS.hero?.animations;
  const prevT = p.animT;
  p.animT += dt * (p.anim.startsWith('attack') ? atkMul : 1);
  const dth = set?.death;
  if (p.anim === 'death' && ANIMS.hero?.static && dth?.procedural) {   // kare yoksa: fizik ragdoll (ragdoll.js)
    if (!p.rag && HULL) startRagdoll(p, HULL);
    stepRagdoll(p, dt, CONFIG.planet.radius);
  } else if (p.anim === 'death' && ANIMS.hero?.static && dth) {         // kare tabanlı ölüm: dizlerin/gövdenin yere çarptığı karelerde toz
    const i0 = dth.durations ? frameAt(dth.durations, prevT).i : Math.floor(prevT * dth.fps), i1 = dth.durations ? frameAt(dth.durations, p.animT).i : Math.floor(p.animT * dth.fps), R = CONFIG.planet.radius;
    for (let i = i0 + 1; i <= i1; i++) {
      const dx = (dth.dx?.[Math.min(i, dth.dx.length - 1)] || 0) / R;
      for (const [fr, n, spread] of dth.dust || []) if (fr === i) groundDust(p.a + dx - 0.002, n, spread);
      if (dth.shake === i) state.shake = Math.max(state.shake, 5);
    }
  }
  if (!set || p.anim === 'death') return;
  const cur = set[p.anim];
  const done = cur && !cur.loop && p.animT >= cur.frames.length / cur.fps;
  if (p.anim === 'hurt' || p.anim.startsWith('attack')) { if (!done) return; }
  const next = Math.abs(p.moveAxis) > 0 ? 'run' : 'idle';
  if (p.anim !== next) { p.anim = next; p.animT = 0; }
}

export function update(dt) {
  if (state.paused || state.userPause) { Input.skillQueue.length = 0; Input.attackQueued = false; Input.dodgeQueued = false; return; }   // güç seçimi ekranı: oyun tamamen durur (bekleyen tuşlar da atılır)
  if (state.hitStop > 0) {                                  // hit-stop: oyun mantığı kısa donar; saldırı sayacı akar (saldırı hızı bozulmaz), efektler yaşar
    state.hitStop -= dt; state.player.atkTimer = Math.max(0, state.player.atkTimer - dt);
    for (const t of state.texts) { t.life -= dt; t.h = Math.min(t.h + (t.rise ?? 50) * dt, 185); }
    state.shake = Math.max(0, state.shake - dt * 30);
    return;
  }
  state.time += dt;
  const p = state.player, C = CONFIG, r = R(), S = derived(p);
  // HP bütünlüğü: maks can her zaman seviye + güçlendirme formülünden gelir (hatalı/eski değer kendiliğinden düzelir), can maks'ı aşmaz
  const expMax = Math.round((C.player.maxHp + C.leveling.maxHpPerLevel * (p.level - 1)) * S.maxHpMul);
  if (p.maxHp !== expMax) p.maxHp = expMax;
  if (p.hp > p.maxHp) p.hp = p.maxHp;

  // Hareket: tamamen OTOMATİK. Kahraman sürekli sağa koşar; önünde (engageRange içinde) canlı düşman varsa durup savaşır,
  // düşman ölünce yeniden ilerler. Zemin eğimini lane/onSurface zaten takip eder. Hız: autoSpeed × hareket hızı güçlendirmesi.
  const live = state.enemies.filter((x) => !x.dead);
  let ax = 0;
  if (!state.over) {
    const retreating = p.retreat > 0;
    const ahead = live.some((en) => { const d = wrapAngle(en.a - p.a) * r; return d > -20 && d < Math.max(C.player.engageRange * S.rangeMul, en.def.engage ?? 0); });
    if (retreating) { ax = -1; p.retreat -= dt; }
    else if (p.dodgeT > 0) ax = 0;                              // kaçınma sıçraması sürerken otomatik ilerleme durur              // boss saldırısını okuyup geri çekilme (boss.js tetikler)
    else if (!ahead && !live.some((e) => e.sp && e.sp.phase !== 'idle')) ax = 1;   // boss özel saldırıdayken kahraman yerinde bekler (boss'u geçip kaçmaz)
    p.dir = 1;
    const speed = retreating ? WAVES.boss.dodge.speed : C.player.autoSpeed * S.moveMul;
    p.a += ax * speed / r * dt;                                // ax=-1 → geri
    if (ax !== 0) {
      p.walk += dt * 10 * S.moveMul; p.stride += speed * dt;
      const step = Math.floor(p.stride / 46); if (ax > 0 && step !== p.lastStep) stepDust(p.a, p.dir); p.lastStep = step;     // ayak vuruşu tozu
    }
    p.lean += (ax * 0.12 - p.lean) * Math.min(1, dt * 10);
    if (S.regen > 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + S.regen * dt);     // can yenileme
  }
  if (state.combo.n > 0 && (state.combo.t -= dt) <= 0) state.combo.n = 0;
  updateChests(dt);
  // Manuel kaçınma (Input.dodgeQueued): kısa geri sıçrama, süresince dokunulmaz (combat.hurtPlayer → mükemmel kaçınma)
  const D = C.dodge;
  p.dodgeCd = Math.max(0, p.dodgeCd - dt);
  if (Input.dodgeQueued && !state.over && p.dodgeCd <= 0 && p.dodgeT <= 0) { p.dodgeT = D.duration; p.dodgeCd = D.cooldown; p.perfectDone = false; groundDust(p.a, 8, 110); events.onDodge?.(false); }
  Input.dodgeQueued = false;
  if (p.dodgeT > 0) {
    const q = 1 - p.dodgeT / D.duration; p.hopH = Math.sin(Math.PI * q) * D.height;
    p.a -= (D.distance / D.duration) * Math.sin(Math.PI * q) * (Math.PI / 2) * dt / r;     // geri kayış: yarım sinüs hız profili (toplam ≈ distance)
    p.dodgeT -= dt; if (p.dodgeT <= 0) { p.dodgeT = 0; p.hopH = 0; groundDust(p.a, 6, 90); }
  } else p.hopH = 0;
  p.moveAxis = ax;
  p.invuln = Math.max(0, p.invuln - dt);
  p.hitFlash = Math.max(0, p.hitFlash - dt);
  p.atkTimer = Math.max(0, p.atkTimer - dt);
  updatePlayerAnim(p, dt, S.attackSpeedMul);

  updateWaves(dt);

  // Düşmanlar: oyuncuya yürür, birbirinin içine girmez, temasta saldırı animasyonu oynar, hasar etki anında uygulanır
  const order = live.slice().sort((x, y) => Math.abs(wrapAngle(x.a - p.a)) - Math.abs(wrapAngle(y.a - p.a)));
  order.forEach((en, i) => {
    en.bob += dt * (5 + en.def.speed * 0.05); en.flash = Math.max(0, en.flash - dt); en.stagger = Math.max(0, (en.stagger || 0) - dt);
    en.atkTimer = Math.max(0, en.atkTimer - dt);
    en.age += dt; if (en.noInterrupt > 0) en.noInterrupt -= dt;
    tickStatus(en, dt);
    if (en.dead) return;
    const diff = wrapAngle(p.a - en.a);
    en.face = diff >= 0 ? 1 : -1;
    const dist = Math.abs(diff) * r;
    if (state.over) return;
    if (en.def.boss && updateBoss(en, dt)) return;              // boss yer darbesine hazırlanıyor
    const front = i > 0 ? order[i - 1] : null;                   // oyuncuya daha yakın komşu
    let free = Infinity;
    if (front && Math.sign(wrapAngle(front.a - en.a)) === en.face) {
      const gap = Math.abs(wrapAngle(front.a - en.a)) * r;
      free = gap - (en.def.width + front.def.width) * 0.5 * C.enemies.separation;
    }
    const A = enemyMeta(en)?.anims.attack, adur = A ? A.frames.length / A.fps : 0.4;
    if (en.windT > 0) {                                          // saldırı öncesi hazırlık: kısa süre geri çekilir (çizim: characters.js)
      en.windT -= dt;
      if (en.windT <= 0) { en.windT = -1; en.attackT = 0; en.hitDone = false; }
      return;
    }
    if (en.attackT >= 0) {                                       // saldırı animasyonu: dururken savurur, hasar etki anında
      en.attackT += dt;
      if (!en.hitDone && en.attackT >= adur * (A?.impact ?? 0.5)) {
        en.hitDone = true;
        if (dist <= (en.def.hitRange ?? en.def.contactRange * 1.25)) hurtPlayer(en.damage);   // boss'un gerçek erişimi hitRange (sprite'tan bağımsız)
      }
      if (en.attackT >= adur) { en.attackT = -1; en.atkTimer = en.attackCd ?? en.def.attackCooldown; }
      return;
    }
    if (en.stagger > 0 && en.knock > 0) { en.a -= en.face * en.knock * 40 / r * dt * 6; en.knock = Math.max(0, en.knock - dt * 6); return; }
    const holding = en.def.hold && !en.def.boss && order.some((o) => !o.def.elite) && dist < C.enemies.eliteHoldRange + 40 && dist > C.enemies.eliteHoldRange - 40;
    if (en.knock > 0) { en.a -= en.face * en.knock * 40 / r * dt * 6; en.knock = Math.max(0, en.knock - dt * 6); }
    else if (holding) { /* elite: normaller bitene kadar geride bekler */ }
    else if (dist > en.def.contactRange * 0.8 && free > 0) en.a += en.face * Math.min(en.def.speed * en.speedMul * slowMul(en) * dt, Math.max(free, 0)) / r;
    else if (free < -4) en.a -= en.face * Math.min(40 * dt, -free) / r;          // iç içe girdiyse hafifçe geri it
    if (dist < en.def.contactRange * 0.55) en.a -= en.face * Math.min(60 * dt, en.def.contactRange * 0.55 - dist) / r;   // oyuncunun içine girmesin
    if (dist <= (en.def.hitRange ? en.def.hitRange * 0.95 : en.def.contactRange) && en.atkTimer <= 0 && en.stagger <= 0
        && live.reduce((n, o) => n + (o !== en && !o.dead && (o.windT > 0 || o.attackT >= 0) ? 1 : 0), 0) < C.enemies.maxAttackers) en.windT = C.enemies.windupSec;   // önce hazırlık, sonra saldırı
  });
  // Çarpışma: düşman oyuncunun içine girmez ve arkasına geçmez — kendi tarafında (doğduğu sağ taraf) en az minGap uzakta kalır
  for (const en of live) {
    if (en.dead) continue;
    const minGap = en.def.minGap ?? (en.def.width * 0.5 + (en.def.boss ? WAVES.boss.minGapExtra : 26));
    const gap = wrapAngle(en.a - p.a) * r * en.side;
    if (gap < minGap) en.a = p.a + en.side * minGap / r;
  }
  // Düşmanlar birbirinin içine girmez (boss dahil): oyuncuya yakından uzağa sıralı, her biri öncekinin arkasında en az genişlik payı bırakır
  const lined = live.filter((e) => !e.dead).sort((x, y) => (x.a - p.a) * x.side - (y.a - p.a) * y.side);
  for (let i = 1; i < lined.length; i++) {
    const a = lined[i - 1], b = lined[i], need = ((a.def.width + b.def.width) * 0.5) * 0.85;
    const gapAB = (b.a - a.a) * r * b.side;
    if (gapAB < need) b.a = a.a + b.side * need / r;
  }
  for (const en of state.enemies) if (en.dead) en.deathT += dt;

  // Saldırı: menzilde düşman varsa OTOMATİK (ya da saldırı düğmesi/Space ile elle). Yön her zaman sağ. Hız: saldırı hızı güçlendirmesi.
  updateSkills(dt);
  const manual = Input.consumeAttack();
  const cur = ANIMS.hero?.animations[p.anim];
  const attackAnimBusy = p.anim.startsWith('attack') && cur && p.animT < cur.frames.length / cur.fps * 0.9;
  if (!state.over && p.atkTimer <= 0 && !attackAnimBusy) {
    let best = null, bd = C.player.attackRange * S.rangeMul;
    for (const en of live) { const d = surfaceDist(en.a, p.a) - (en.def.hitPad ?? 0); if (d <= bd) { bd = d; best = en; } }   // hitPad: büyük boss'a daha uzaktan vurulabilir
    if (best || manual) {
      p.dir = 1;
      p.atkTimer = C.player.attackCooldown / S.attackSpeedMul;
      const an = `attack_${p.combo + 1}`; p.anim = ANIMS.hero.animations[an] ? an : 'attack'; p.animT = 0; p.combo = (p.combo + 1) % 3;   // kadın karakterde tek 'attack' var
      state.slashes.push({ life: C.player.slashDuration, max: C.player.slashDuration, dir: p.dir, a: p.a });
      events.onSlash?.();
      p.hitT = C.player.hitDelay / S.attackSpeedMul; p.hitDir = p.dir;           // hasar savurmanın etki anında, güncel konumlara göre uygulanır
    }
  }
  if (p.hitT > 0 && !state.over) {
    p.hitT -= dt;
    if (p.hitT <= 0) {
      for (const en of state.enemies) {
        if (en.dead) continue;
        const diff = wrapAngle(en.a - p.a), d = Math.abs(diff) * r;
        // vuruş kutusu: kahramanın baktığı yönde, menzil + düşmanın yarım genişliği
        if (Math.sign(diff) === p.hitDir && d <= C.player.attackRange * S.rangeMul + (en.def.hitPad ?? en.def.width * 0.35)) hitEnemy(en, p.damage);
      }
    }
  }
  state.enemies = state.enemies.filter((e) => !e.dead || e.deathT < 0.95);

  for (const c of state.coins) {
    c.spin += dt * 8;
    if (c.grounded && surfaceDist(c.a, p.a) < C.player.coinMagnetRange) c.magnet = true;
    if (c.magnet) {
      const sp = C.player.coinMagnetSpeed * dt;
      const diff = wrapAngle(p.a - c.a);
      c.a += clamp(diff, -sp / r, sp / r);
      c.h += clamp(24 - c.h, -sp, sp);
      c.grounded = false;
      if (Math.abs(diff) * r < 14 && Math.abs(c.h - 24) < 14) { if (c.kind === 'gem') collectGem(c.value); else collectCoin(c.value); c.collected = true; }
    } else if (!c.grounded) {
      c.vh -= C.loot.coinGravity * dt; c.h += c.vh * dt; c.a += c.va * dt / r * 60;
      if (c.h <= 6) { c.h = 6; c.grounded = true; }
    }
  }
  state.coins = state.coins.filter((c) => !c.collected);

  updateParticles(dt); state.hurtFlash = Math.max(0, state.hurtFlash - dt);
  for (const s of state.slashes) s.life -= dt;
  for (const f of state.hitFx) f.life -= dt;
  for (const g of state.rings) g.t += dt;
  for (const t of state.telegraphs) t.t += dt;
  state.rings = state.rings.filter((g) => g.t < g.life);
  state.telegraphs = state.telegraphs.filter((t) => t.t < t.life + 0.05 && !(t.boss && t.boss.dead));
  state.hitFx = state.hitFx.filter((f) => f.life > 0);
  state.slashes = state.slashes.filter((s) => s.life > 0);
  for (const t of state.texts) { t.life -= dt; t.h = Math.min(t.h + (t.rise ?? 50) * dt, 185); }
  state.texts = state.texts.filter((t) => t.life > 0);
  state.shake = Math.max(0, state.shake - dt * 30);
}
