import { CONFIG, ENEMY_TYPES, ANIMS } from '../core/config.js';
import { Input } from '../core/input.js';
import { View } from '../core/view.js';
import { rand, clamp, wrapAngle, TAU } from '../core/util.js';
import { state, xpForLevel } from './state.js';

const R = () => CONFIG.planet.radius;
const surfaceDist = (a, b) => Math.abs(wrapAngle(a - b)) * R();

// Olay kancası: UI/ses/save gibi sistemler buraya bağlanabilir (ör. events.onGameOver).
export const events = { onGameOver: null };

export function spawnEnemy(typeKey, offsetUnits = 0) {
  const t = ENEMY_TYPES[typeKey], p = state.player, e = CONFIG.enemies;
  const lv = p.level - 1;
  const hp = t.hp * (1 + e.hpScalePerLevel * lv);
  state.enemies.push({
    type: typeKey, def: t,
    a: p.a + (View.visibleRightUnits + e.spawnOffscreen + offsetUnits) / CONFIG.planet.radius,   // sağ ekran kenarının hemen dışı
    hp, maxHp: hp, damage: t.damage * (1 + e.damageScalePerLevel * lv),
    atkTimer: 0.3, flash: 0, bob: rand(0, TAU), face: -1, knock: 0, dead: false, deathT: 0,
  });
}

// Düşman grubu: 2-4 düşman, aralarında boşluk bırakarak sağdan gelir; ekranda en fazla maxAlive düşman.
function spawnWave() {
  const e = CONFIG.enemies, p = state.player;
  const room = e.maxAlive - state.enemies.filter((x) => !x.dead).length;
  const n = Math.min(room, Math.floor(rand(e.waveMin, e.waveMax + 1)));
  if (n <= 0) return false;
  const pool = Object.entries(ENEMY_TYPES).filter(([, t]) => p.level >= t.minLevel);
  const total = pool.reduce((s, [, t]) => s + t.weight, 0);
  let offset = 0;
  for (let i = 0; i < n; i++) {
    let r = rand(0, total), pick = pool[0][0];
    for (const [k, t] of pool) { if ((r -= t.weight) <= 0) { pick = k; break; } }
    spawnEnemy(pick, offset);
    offset += rand(e.waveGapUnits[0], e.waveGapUnits[1]) + ENEMY_TYPES[pick].width * 0.5;
  }
  return true;
}

function addText(a, h, text, color) {
  const life = CONFIG.hud.damageNumberLife;
  state.texts.push({ a, h, text, color, life, max: life, ox: rand(-8, 8) });
}

function damageEnemy(en, dmg) {
  en.hp -= dmg; en.flash = 0.12; en.knock = 1 - en.def.knockResist;
  addText(en.a, en.def.heightUnits + 14, '-' + Math.round(dmg), '#ff4a4a');
  if (en.hp <= 0 && !en.dead) killEnemy(en);
}

function killEnemy(en) {
  en.dead = true; en.deathT = 0; state.kills++;
  const n = Math.round(rand(en.def.coins[0], en.def.coins[1]));
  for (let i = 0; i < n; i++) {
    state.coins.push({
      a: en.a, h: 14, vh: rand(0.6, 1.2) * CONFIG.loot.coinPopSpeed, va: rand(-1, 1) * 0.25,
      value: en.def.coinValue, magnet: false, grounded: false, spin: rand(0, TAU),
    });
  }
  gainXp(en.def.xp);
}

function gainXp(amount) {
  const p = state.player, L = CONFIG.leveling;
  p.xp += amount;
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext; p.level++; p.xpNext = xpForLevel(p.level);
    p.damage += L.damagePerLevel; p.maxHp += L.maxHpPerLevel;
    p.hp = Math.min(p.maxHp, p.hp + (p.maxHp - p.hp) * L.healOnLevelUp + L.maxHpPerLevel);
    addText(p.a, 150, 'LEVEL UP!', '#ffd23f');
  }
}

function hurtPlayer(dmg) {
  const p = state.player;
  if (p.invuln > 0 || state.over) return;
  p.hp = Math.max(0, p.hp - dmg);
  p.invuln = CONFIG.player.invulnTime; p.hitFlash = 0.2; state.shake = 6;
  p.anim = 'hurt'; p.animT = 0;
  addText(p.a, 125, '-' + Math.round(dmg), '#ff9a3a');
  if (p.hp <= 0) { state.over = true; p.anim = 'death'; p.animT = 0; events.onGameOver?.(state); }
}

// Animasyon durum makinesi: ölüm > hasar > saldırı (bitene kadar) > koşu/bekleme
function updatePlayerAnim(p, dt) {
  const set = ANIMS.male?.animations;
  p.animT += dt;
  if (!set || p.anim === 'death') return;
  const cur = set[p.anim];
  const done = cur && !cur.loop && p.animT >= cur.frames.length / cur.fps;
  if (p.anim === 'hurt' || p.anim.startsWith('attack_')) {
    if (!done) return;
  }
  const next = Math.abs(p.moveAxis) > 0 ? 'run' : 'idle';
  if (p.anim !== next) { p.anim = next; p.animT = 0; }
}

export function update(dt) {
  state.time += dt;
  const p = state.player, C = CONFIG, r = R();

  // Hareket: joystick/klavye elle sürer; girdi yoksa kahraman sağa otomatik koşar, önünde düşman varsa durup savaşır.
  const live = state.enemies.filter((x) => !x.dead);
  let ax = 0, speed = C.player.speed;
  if (!state.over) {
    ax = Input.axis;
    if (ax === 0 && C.player.autoRun) {
      const ahead = live.some((en) => { const d = wrapAngle(en.a - p.a) * r; return d > 0 && d < C.player.engageRange; });
      if (!ahead) { ax = 1; speed = C.player.autoSpeed; }
    }
    p.a += ax * speed / r * dt;
    if (ax !== 0) { p.dir = Math.sign(ax); p.walk += dt * 10 * Math.abs(ax); }
    p.lean += (ax * 0.12 - p.lean) * Math.min(1, dt * 10);
  }
  p.moveAxis = ax;
  p.invuln = Math.max(0, p.invuln - dt);
  p.hitFlash = Math.max(0, p.hitFlash - dt);
  p.atkTimer = Math.max(0, p.atkTimer - dt);
  updatePlayerAnim(p, dt);

  if (!state.over) {
    state.spawnTimer -= dt;
    const alive = live.length;
    if ((state.spawnTimer <= 0 && alive < C.enemies.maxAlive) || (alive <= C.enemies.refillWhenAtMost && state.spawnTimer <= C.enemies.waveInterval - 1.2)) {
      if (spawnWave()) state.spawnTimer = Math.max(C.enemies.waveIntervalMin, C.enemies.waveInterval - C.enemies.waveIntervalDecayPerLevel * (p.level - 1));
      else state.spawnTimer = 1;
    }
  }

  // Düşmanlar: oyuncuya yürür, birbirinin içine girmez (önlerindeki düşmanla en az sep mesafe), temasta hasar verir
  const order = live.slice().sort((x, y) => Math.abs(wrapAngle(x.a - p.a)) - Math.abs(wrapAngle(y.a - p.a)));
  order.forEach((en, i) => {
    en.bob += dt * (5 + en.def.speed * 0.05); en.flash = Math.max(0, en.flash - dt);
    en.atkTimer = Math.max(0, en.atkTimer - dt);
    const diff = wrapAngle(p.a - en.a);
    en.face = diff >= 0 ? 1 : -1;
    const dist = Math.abs(diff) * r;
    if (state.over) return;
    const front = i > 0 ? order[i - 1] : null;                   // oyuncuya daha yakın komşu
    let free = Infinity;
    if (front && Math.sign(wrapAngle(front.a - en.a)) === en.face) {
      const gap = Math.abs(wrapAngle(front.a - en.a)) * r;
      free = gap - (en.def.width + front.def.width) * 0.5 * C.enemies.separation;
    }
    if (en.knock > 0) { en.a -= en.face * en.knock * 40 / r * dt * 6; en.knock = Math.max(0, en.knock - dt * 6); }
    else if (dist > en.def.contactRange * 0.8 && free > 0) en.a += en.face * Math.min(en.def.speed * dt, Math.max(free, 0)) / r;
    else if (free < -4) en.a -= en.face * Math.min(40 * dt, -free) / r;          // iç içe girdiyse hafifçe geri it
    if (dist <= en.def.contactRange && en.atkTimer <= 0) { hurtPlayer(en.damage); en.atkTimer = en.def.attackCooldown; }
  });
  for (const en of state.enemies) if (en.dead) en.deathT += dt;

  // Saldırı: menzilde düşman varsa otomatik, ya da saldırı düğmesi/Space ile elle. Saldırı yönü kahramanın baktığı yön.
  const manual = Input.consumeAttack();
  if (!state.over && p.atkTimer <= 0) {
    let best = null, bd = C.player.attackRange;
    for (const en of live) {
      const d = surfaceDist(en.a, p.a);
      if (d <= bd) { bd = d; best = en; }
    }
    if (best || manual) {
      if (best) p.dir = wrapAngle(best.a - p.a) >= 0 ? 1 : -1;
      p.atkTimer = C.player.attackCooldown;
      p.anim = `attack_${p.combo + 1}`; p.animT = 0; p.combo = (p.combo + 1) % 3;
      state.slashes.push({ life: C.player.slashDuration, max: C.player.slashDuration, dir: p.dir, a: p.a });
      for (const en of live) {
        const diff = wrapAngle(en.a - p.a);
        if (Math.abs(diff) * r <= C.player.attackRange + en.def.width * 0.3 && Math.sign(diff) === p.dir) damageEnemy(en, p.damage);
      }
    }
  }
  state.enemies = state.enemies.filter((e) => !e.dead || e.deathT < 0.45);

  for (const c of state.coins) {
    c.spin += dt * 8;
    if (c.grounded && surfaceDist(c.a, p.a) < C.player.coinMagnetRange) c.magnet = true;
    if (c.magnet) {
      const sp = C.player.coinMagnetSpeed * dt;
      const diff = wrapAngle(p.a - c.a);
      c.a += clamp(diff, -sp / r, sp / r);
      c.h += clamp(24 - c.h, -sp, sp);
      c.grounded = false;
      if (Math.abs(diff) * r < 14 && Math.abs(c.h - 24) < 14) { p.coins += c.value; c.collected = true; }
    } else if (!c.grounded) {
      c.vh -= C.loot.coinGravity * dt; c.h += c.vh * dt; c.a += c.va * dt / r * 60;
      if (c.h <= 6) { c.h = 6; c.grounded = true; }
    }
  }
  state.coins = state.coins.filter((c) => !c.collected);

  for (const s of state.slashes) s.life -= dt;
  state.slashes = state.slashes.filter((s) => s.life > 0);
  for (const t of state.texts) { t.life -= dt; t.h += 50 * dt; }
  state.texts = state.texts.filter((t) => t.life > 0);
  state.shake = Math.max(0, state.shake - dt * 30);
}
