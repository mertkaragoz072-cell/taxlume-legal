import { CONFIG, ENEMY_TYPES } from '../core/config.js';
import { Input } from '../core/input.js';
import { rand, clamp, wrapAngle, TAU } from '../core/util.js';
import { state, xpForLevel } from './state.js';

const R = () => CONFIG.planet.radius;
const surfaceDist = (a, b) => Math.abs(wrapAngle(a - b)) * R();

// Olay kancası: UI/ses/save gibi sistemler buraya bağlanabilir (ör. events.onGameOver).
export const events = { onGameOver: null };

export function spawnEnemy(typeKey = 'goblin') {
  const t = ENEMY_TYPES[typeKey], p = state.player, e = CONFIG.enemies;
  const lv = p.level - 1;
  const hp = t.hp * (1 + e.hpScalePerLevel * lv);
  state.enemies.push({
    type: typeKey, def: t,
    a: p.a + e.spawnArc + rand(0, e.spawnArcJitter),
    hp, maxHp: hp, damage: t.damage * (1 + e.damageScalePerLevel * lv),
    atkTimer: 0.3, flash: 0, bob: rand(0, TAU), face: -1, knock: 0, dead: false,
  });
}

function addText(a, h, text, color) {
  const life = CONFIG.hud.damageNumberLife;
  state.texts.push({ a, h, text, color, life, max: life, ox: rand(-8, 8) });
}

function damageEnemy(en, dmg) {
  en.hp -= dmg; en.flash = 0.12; en.knock = 1;
  addText(en.a, 40, String(Math.round(dmg)), '#fff');
  if (en.hp <= 0 && !en.dead) killEnemy(en);
}

function killEnemy(en) {
  en.dead = true; state.kills++;
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
    addText(p.a, 90, 'LEVEL UP!', '#ffd23f');
  }
}

function hurtPlayer(dmg) {
  const p = state.player;
  if (p.invuln > 0 || state.over) return;
  p.hp = Math.max(0, p.hp - dmg);
  p.invuln = CONFIG.player.invulnTime; p.hitFlash = 0.2; state.shake = 6;
  addText(p.a, 70, '-' + Math.round(dmg), '#ff5a5a');
  if (p.hp <= 0) { state.over = true; events.onGameOver?.(state); }
}

export function update(dt) {
  state.time += dt;
  const p = state.player, C = CONFIG, r = R();

  if (!state.over) {
    const ax = Input.axis;
    p.a += ax * C.player.speed / r * dt;
    if (ax !== 0) { p.dir = Math.sign(ax); p.walk += dt * 10 * Math.abs(ax); }
    p.lean += (ax * 0.18 - p.lean) * Math.min(1, dt * 10);
  }
  p.invuln = Math.max(0, p.invuln - dt);
  p.hitFlash = Math.max(0, p.hitFlash - dt);
  p.atkTimer = Math.max(0, p.atkTimer - dt);

  if (!state.over) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.enemies.length < C.enemies.maxAlive) {
      spawnEnemy('goblin');
      state.spawnTimer = Math.max(C.enemies.spawnIntervalMin,
        C.enemies.spawnInterval - C.enemies.spawnIntervalDecayPerLevel * (p.level - 1));
    }
  }

  for (const en of state.enemies) {
    en.bob += dt * 8; en.flash = Math.max(0, en.flash - dt);
    en.atkTimer = Math.max(0, en.atkTimer - dt);
    const diff = wrapAngle(p.a - en.a);
    en.face = diff >= 0 ? 1 : -1;
    const dist = Math.abs(diff) * r;
    if (state.over) continue;
    if (en.knock > 0) { en.a -= en.face * en.knock * 40 / r * dt * 6; en.knock = Math.max(0, en.knock - dt * 6); }
    else if (dist > en.def.contactRange * 0.8) en.a += en.face * en.def.speed / r * dt;
    if (dist <= en.def.contactRange && en.atkTimer <= 0) { hurtPlayer(en.damage); en.atkTimer = en.def.attackCooldown; }
  }

  // Otomatik saldırı: menzilde düşman varsa o yöne vurur, o yöndeki menzildeki herkese hasar verir
  if (!state.over && p.atkTimer <= 0) {
    let best = null, bd = C.player.attackRange;
    for (const en of state.enemies) {
      const d = surfaceDist(en.a, p.a);
      if (d <= bd) { bd = d; best = en; }
    }
    if (best) {
      p.dir = wrapAngle(best.a - p.a) >= 0 ? 1 : -1;
      p.atkTimer = C.player.attackCooldown;
      state.slashes.push({ life: C.player.slashDuration, max: C.player.slashDuration, dir: p.dir, a: p.a });
      for (const en of state.enemies) {
        const diff = wrapAngle(en.a - p.a);
        if (Math.abs(diff) * r <= C.player.attackRange && Math.sign(diff) === p.dir) damageEnemy(en, p.damage);
      }
    }
  }
  state.enemies = state.enemies.filter((e) => !e.dead);

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
