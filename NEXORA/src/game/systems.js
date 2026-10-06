// Ana oyun döngüsü (update). Parçalar: combat.js (hasar/ödül), EnemySpawner.js + WaveManager.js (dalgalar), boss.js, skills.js,
// PlayerStats.js (güçlendirme statları). Burada: otomatik ilerleme, düşman hareketi, otomatik saldırı, pickup'lar, efekt zamanlayıcıları.
import { CONFIG, ANIMS } from '../core/config.js';
import { Input } from '../core/input.js';
import { clamp, wrapAngle } from '../core/util.js';
import { state } from './state.js';
import { events } from './events.js';
import { updateSkills } from './skills.js';
import { updateWaves } from './WaveManager.js';
import { updateBoss } from './boss.js';
import { enemyMeta } from './EnemySpawner.js';
import { derived } from './PlayerStats.js';
import { hitEnemy, hurtPlayer, collectCoin, collectGem, tickStatus, slowMul } from './combat.js';

export { events };
export { spawnEnemy } from './EnemySpawner.js';
export { damageEnemy, applyKnock } from './combat.js';

const R = () => CONFIG.planet.radius;
const surfaceDist = (a, b) => Math.abs(wrapAngle(a - b)) * R();

// Animasyon durum makinesi: ölüm > hasar > saldırı (bitene kadar) > koşu/bekleme. Saldırı animasyonu saldırı hızıyla hızlanır.
function updatePlayerAnim(p, dt, atkMul) {
  const set = ANIMS.hero?.animations;
  p.animT += dt * (p.anim.startsWith('attack') ? atkMul : 1);
  if (!set || p.anim === 'death') return;
  const cur = set[p.anim];
  const done = cur && !cur.loop && p.animT >= cur.frames.length / cur.fps;
  if (p.anim === 'hurt' || p.anim.startsWith('attack')) { if (!done) return; }
  const next = Math.abs(p.moveAxis) > 0 ? 'run' : 'idle';
  if (p.anim !== next) { p.anim = next; p.animT = 0; }
}

export function update(dt) {
  if (state.paused) { Input.skillQueue.length = 0; Input.attackQueued = false; return; }   // güç seçimi ekranı: oyun tamamen durur (bekleyen tuşlar da atılır)
  state.time += dt;
  const p = state.player, C = CONFIG, r = R(), S = derived(p);

  // Hareket: tamamen OTOMATİK. Kahraman sürekli sağa koşar; önünde (engageRange içinde) canlı düşman varsa durup savaşır,
  // düşman ölünce yeniden ilerler. Zemin eğimini lane/onSurface zaten takip eder. Hız: autoSpeed × hareket hızı güçlendirmesi.
  const live = state.enemies.filter((x) => !x.dead);
  let ax = 0;
  if (!state.over) {
    const ahead = live.some((en) => { const d = wrapAngle(en.a - p.a) * r; return d > -20 && d < C.player.engageRange * S.rangeMul; });
    if (!ahead) ax = 1;
    p.dir = 1;
    const speed = C.player.autoSpeed * S.moveMul;
    p.a += ax * speed / r * dt;
    if (ax !== 0) { p.walk += dt * 10 * S.moveMul; p.stride += speed * dt; }
    p.lean += (ax * 0.12 - p.lean) * Math.min(1, dt * 10);
    if (S.regen > 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + S.regen * dt);     // can yenileme
  }
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
    en.age += dt;
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
    if (en.attackT >= 0) {                                       // saldırı animasyonu: dururken savurur, hasar etki anında
      en.attackT += dt;
      if (!en.hitDone && en.attackT >= adur * (A?.impact ?? 0.5)) {
        en.hitDone = true;
        if (dist <= en.def.contactRange * 1.25) hurtPlayer(en.damage);
      }
      if (en.attackT >= adur) { en.attackT = -1; en.atkTimer = en.def.attackCooldown; }
      return;
    }
    if (en.stagger > 0 && en.knock > 0) { en.a -= en.face * en.knock * 40 / r * dt * 6; en.knock = Math.max(0, en.knock - dt * 6); return; }
    const holding = en.def.hold && !en.def.boss && order.some((o) => !o.def.elite) && dist < C.enemies.eliteHoldRange + 40 && dist > C.enemies.eliteHoldRange - 40;
    if (en.knock > 0) { en.a -= en.face * en.knock * 40 / r * dt * 6; en.knock = Math.max(0, en.knock - dt * 6); }
    else if (holding) { /* elite: normaller bitene kadar geride bekler */ }
    else if (dist > en.def.contactRange * 0.8 && free > 0) en.a += en.face * Math.min(en.def.speed * en.speedMul * slowMul(en) * dt, Math.max(free, 0)) / r;
    else if (free < -4) en.a -= en.face * Math.min(40 * dt, -free) / r;          // iç içe girdiyse hafifçe geri it
    if (dist < en.def.contactRange * 0.55) en.a -= en.face * Math.min(60 * dt, en.def.contactRange * 0.55 - dist) / r;   // oyuncunun içine girmesin
    if (dist <= en.def.contactRange && en.atkTimer <= 0 && en.stagger <= 0) { en.attackT = 0; en.hitDone = false; }
  });
  for (const en of state.enemies) if (en.dead) en.deathT += dt;

  // Saldırı: menzilde düşman varsa OTOMATİK (ya da saldırı düğmesi/Space ile elle). Yön her zaman sağ. Hız: saldırı hızı güçlendirmesi.
  updateSkills(dt);
  const manual = Input.consumeAttack();
  const cur = ANIMS.hero?.animations[p.anim];
  const attackAnimBusy = p.anim.startsWith('attack') && cur && p.animT < cur.frames.length / cur.fps * 0.9;
  if (!state.over && p.atkTimer <= 0 && !attackAnimBusy) {
    let best = null, bd = C.player.attackRange * S.rangeMul;
    for (const en of live) { const d = surfaceDist(en.a, p.a); if (d <= bd) { bd = d; best = en; } }
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
        if (Math.sign(diff) === p.hitDir && d <= C.player.attackRange * S.rangeMul + en.def.width * 0.35) hitEnemy(en, p.damage);
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

  for (const s of state.slashes) s.life -= dt;
  for (const f of state.hitFx) f.life -= dt;
  for (const g of state.rings) g.t += dt;
  for (const t of state.telegraphs) t.t += dt;
  state.rings = state.rings.filter((g) => g.t < g.life);
  state.telegraphs = state.telegraphs.filter((t) => t.t < t.life + 0.05 && !(t.boss && t.boss.dead));
  state.hitFx = state.hitFx.filter((f) => f.life > 0);
  state.slashes = state.slashes.filter((s) => s.life > 0);
  for (const t of state.texts) { t.life -= dt; t.h += 50 * dt; }
  state.texts = state.texts.filter((t) => t.life > 0);
  state.shake = Math.max(0, state.shake - dt * 30);
}
