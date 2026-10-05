'use strict';
/* ==========================================================================
   PLANET WARRIOR - prototype
   Bölümler (ileride ayrı modüllere bölünebilir):
     1. CONFIG        - tüm ayarlanabilir değerler
     2. Assets        - sprite yükleme sistemi (şimdilik boş manifest)
     3. Input         - klavye + sanal joystick
     4. Util / View   - yardımcılar, ekran dönüşümü
     5. Registries    - düşman tipleri (yeni tip = yeni kayıt)
     6. Game state    - oyuncu, düşman, coin, efektler
     7. Systems       - update mantığı
     8. Render        - Canvas çizimleri (placeholder)
     9. Loop / boot
   Dünya modeli: her şey gezegen üzerinde "açı" (radyan) ile konumlanır.
   Kamera oyuncunun açısını takip eder; oyuncu hep ekranın üst-ortasında durur,
   gezegen altında döner.
   ========================================================================== */

/* ---------------------------------------------------------------- 1. CONFIG */
const CONFIG = {
  planet: {
    radius: 300,                 // dünya birimi
    colors: { grass: '#6fd35a', grassDark: '#3fa646', grassLight: '#a4ec7c', outline: '#1f2a44' },
  },
  player: {
    speed: 150,                  // yüzeyde px/sn
    maxHp: 100,
    attackDamage: 10,
    attackRange: 70,             // yüzey mesafesi (px)
    attackCooldown: 0.6,         // sn
    slashDuration: 0.18,
    invulnTime: 0.5,             // hasar sonrası dokunulmazlık
    coinMagnetRange: 110,
    coinMagnetSpeed: 420,
  },
  leveling: {
    baseXpToNext: 30,
    xpGrowth: 1.35,
    damagePerLevel: 3,
    maxHpPerLevel: 15,
    healOnLevelUp: 0.5,          // eksik canın oranı
  },
  enemies: {
    spawnInterval: 2.2,          // sn
    spawnIntervalMin: 0.8,
    spawnIntervalDecayPerLevel: 0.12,
    maxAlive: 14,
    spawnArc: 1.0,               // oyuncunun sağında kaç radyan ötede doğar
    spawnArcJitter: 0.25,
    hpScalePerLevel: 0.2,        // her level +%20 hp/hasar
    damageScalePerLevel: 0.1,
  },
  loot: {
    coinPopSpeed: 160,
    coinGravity: 700,
  },
  hud: { damageNumberLife: 0.7 },
};

/* ---------------------------------------------------------------- 2. Assets */
// Gerçek sprite eklemek için: manifest'e { anahtar: 'assets/dosya.png' } yaz.
// Çizim kodu Assets.get('anahtar') ile bakar; yoksa placeholder şekil çizer.
const Assets = {
  manifest: {
    // player: 'assets/player.png',
    // goblin: 'assets/goblin.png',
  },
  images: {},
  load(manifest = this.manifest) {
    const jobs = Object.entries(manifest).map(([key, src]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.images[key] = img; resolve(); };
      img.onerror = () => { console.warn('Asset yüklenemedi:', src); resolve(); };
      img.src = src;
    }));
    return Promise.all(jobs);
  },
  get(key) { return this.images[key] || null; },
};

/* ----------------------------------------------------------------- 3. Input */
const Input = {
  keys: {},
  axis: 0,           // -1..1
  joy: { id: null, ox: 0, oy: 0, x: 0 },
  init(canvas) {
    const map = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
    addEventListener('keydown', (e) => { if (map[e.code]) { this.keys[map[e.code]] = true; e.preventDefault(); } });
    addEventListener('keyup', (e) => { if (map[e.code]) this.keys[map[e.code]] = false; });
    addEventListener('blur', () => { this.keys = {}; });

    const base = document.getElementById('joystick');
    const stick = document.getElementById('stick');
    const maxR = 40;
    const gameEl = document.getElementById('game');
    const setStick = (dx, dy) => { stick.style.transform = `translate(${dx}px, ${dy}px)`; };

    gameEl.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || this.joy.id !== null) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.joy.id = e.pointerId; this.joy.ox = e.clientX; this.joy.oy = e.clientY; this.joy.x = 0;
      base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px';
      base.classList.add('active'); setStick(0, 0);
      try { gameEl.setPointerCapture(e.pointerId); } catch (_) { /* yoksay */ }
    });
    gameEl.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joy.id) return;
      let dx = e.clientX - this.joy.ox, dy = e.clientY - this.joy.oy;
      const d = Math.hypot(dx, dy);
      if (d > maxR) { dx *= maxR / d; dy *= maxR / d; }
      this.joy.x = dx / maxR;
      setStick(dx, dy);
    });
    const end = (e) => {
      if (e.pointerId !== this.joy.id) return;
      this.joy.id = null; this.joy.x = 0; base.classList.remove('active');
    };
    gameEl.addEventListener('pointerup', end);
    gameEl.addEventListener('pointercancel', end);
  },
  update() {
    let k = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    const j = Math.abs(this.joy.x) > 0.15 ? this.joy.x : 0;
    this.axis = Math.max(-1, Math.min(1, k + j));
  },
};

/* ------------------------------------------------------------ 4. Util / View */
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrapAngle = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

const View = {
  w: 0, h: 0, dpr: 1, scale: 1, cx: 0, cy: 0, R: 0,
  resize(canvas) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth; this.h = window.innerHeight;
    canvas.width = Math.round(this.w * this.dpr);
    canvas.height = Math.round(this.h * this.dpr);
    this.scale = Math.min(this.w / 520, this.h / 640);
    this.R = CONFIG.planet.radius * this.scale;
    const top = this.h * 0.42;               // oyuncunun durduğu yüzey noktası
    this.cx = this.w / 2;
    this.cy = top + this.R;
  },
};

/* ------------------------------------------------------------ 5. Registries */
// Yeni düşman/boss eklemek için buraya yeni kayıt ekle (draw alanı ile kendi çizimi olabilir).
const ENEMY_TYPES = {
  goblin: {
    name: 'Goblin', hp: 30, damage: 8, speed: 55, xp: 12, coins: [2, 4], coinValue: 1,
    contactRange: 26, attackCooldown: 0.9, size: 1,
    colors: { skin: '#7ed957', skinDark: '#4fae3c', cloth: '#a9702f' },
  },
};

/* ------------------------------------------------------------ 6. Game state */
const state = {
  time: 0, over: false, kills: 0,
  player: null, enemies: [], coins: [], slashes: [], texts: [], spawnTimer: 0,
  shake: 0,
};

function xpForLevel(level) {
  return Math.round(CONFIG.leveling.baseXpToNext * Math.pow(CONFIG.leveling.xpGrowth, level - 1));
}

function createPlayer() {
  const c = CONFIG.player;
  return {
    a: 0, dir: 1, lean: 0, walk: 0,
    hp: c.maxHp, maxHp: c.maxHp, damage: c.attackDamage,
    level: 1, xp: 0, xpNext: xpForLevel(1), coins: 0,
    atkTimer: 0, invuln: 0, hitFlash: 0,
  };
}

function resetGame() {
  Object.assign(state, {
    time: 0, over: false, kills: 0, player: createPlayer(),
    enemies: [], coins: [], slashes: [], texts: [], spawnTimer: 1, shake: 0,
  });
  document.getElementById('gameover').classList.add('hidden');
  updateHud();
}

/* --------------------------------------------------------------- 7. Systems */
const surfaceDist = (a, b) => Math.abs(wrapAngle(a - b)) * CONFIG.planet.radius;

function spawnEnemy(typeKey = 'goblin') {
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
  state.texts.push({ a, h, text, color, life: CONFIG.hud.damageNumberLife, max: CONFIG.hud.damageNumberLife, ox: rand(-8, 8) });
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
  if (p.hp <= 0) gameOver();
}

function gameOver() {
  state.over = true;
  const p = state.player;
  document.getElementById('go-level').textContent = p.level;
  document.getElementById('go-kills').textContent = state.kills;
  document.getElementById('go-coins').textContent = p.coins;
  document.getElementById('gameover').classList.remove('hidden');
}

function update(dt) {
  state.time += dt;
  const p = state.player, C = CONFIG, R = C.planet.radius;

  // Oyuncu hareketi
  if (!state.over) {
    const ax = Input.axis;
    p.a += ax * C.player.speed / R * dt;
    if (ax !== 0) { p.dir = Math.sign(ax); p.walk += dt * 10 * Math.abs(ax); }
    p.lean += (ax * 0.18 - p.lean) * Math.min(1, dt * 10);
  }
  p.invuln = Math.max(0, p.invuln - dt);
  p.hitFlash = Math.max(0, p.hitFlash - dt);
  p.atkTimer = Math.max(0, p.atkTimer - dt);

  // Spawn
  if (!state.over) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.enemies.length < C.enemies.maxAlive) {
      spawnEnemy('goblin');
      state.spawnTimer = Math.max(C.enemies.spawnIntervalMin,
        C.enemies.spawnInterval - C.enemies.spawnIntervalDecayPerLevel * (p.level - 1));
    }
  }

  // Düşmanlar
  for (const en of state.enemies) {
    en.bob += dt * 8; en.flash = Math.max(0, en.flash - dt);
    en.atkTimer = Math.max(0, en.atkTimer - dt);
    const diff = wrapAngle(p.a - en.a);
    en.face = diff >= 0 ? 1 : -1;
    const dist = Math.abs(diff) * R;
    if (state.over) continue;
    if (en.knock > 0) { en.a -= en.face * en.knock * 40 / R * dt * 6; en.knock = Math.max(0, en.knock - dt * 6); }
    else if (dist > en.def.contactRange * 0.8) en.a += en.face * en.def.speed / R * dt;
    if (dist <= en.def.contactRange && en.atkTimer <= 0) { hurtPlayer(en.damage); en.atkTimer = en.def.attackCooldown; }
  }

  // Otomatik saldırı
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
      // Slash menzildeki tüm düşmanlara (yöne bakanlara) vurur
      for (const en of state.enemies) {
        const diff = wrapAngle(en.a - p.a);
        if (Math.abs(diff) * R <= C.player.attackRange && Math.sign(diff) === p.dir) damageEnemy(en, p.damage);
      }
    }
  }
  state.enemies = state.enemies.filter((e) => !e.dead);

  // Coinler
  for (const c of state.coins) {
    c.spin += dt * 8;
    const pd = surfaceDist(c.a, p.a);
    if (c.grounded && pd < C.player.coinMagnetRange) c.magnet = true;
    if (c.magnet) {
      const sp = C.player.coinMagnetSpeed * dt;
      const diff = wrapAngle(p.a - c.a);
      c.a += clamp(diff, -sp / R, sp / R);
      c.h += clamp(24 - c.h, -sp, sp);
      c.grounded = false;
      if (Math.abs(diff) * R < 14 && Math.abs(c.h - 24) < 14) { p.coins += c.value; c.collected = true; }
    } else if (!c.grounded) {
      c.vh -= C.loot.coinGravity * dt; c.h += c.vh * dt; c.a += c.va * dt / R * 60;
      if (c.h <= 6) { c.h = 6; c.grounded = true; }
    }
  }
  state.coins = state.coins.filter((c) => !c.collected);

  // Efektler
  for (const s of state.slashes) s.life -= dt;
  state.slashes = state.slashes.filter((s) => s.life > 0);
  for (const t of state.texts) { t.life -= dt; t.h += 50 * dt; }
  state.texts = state.texts.filter((t) => t.life > 0);
  state.shake = Math.max(0, state.shake - dt * 30);

  updateHud();
}

/* HUD (DOM) */
const hudEl = {};
function initHud() {
  for (const id of ['hud-level', 'hp-fill', 'hp-text', 'xp-fill', 'xp-text', 'hud-coins']) hudEl[id] = document.getElementById(id);
}
function updateHud() {
  const p = state.player;
  hudEl['hud-level'].textContent = p.level;
  hudEl['hp-fill'].style.width = (p.hp / p.maxHp * 100) + '%';
  hudEl['hp-text'].textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
  hudEl['xp-fill'].style.width = (p.xp / p.xpNext * 100) + '%';
  hudEl['xp-text'].textContent = `XP ${p.xp}/${p.xpNext}`;
  hudEl['hud-coins'].textContent = p.coins;
}

/* ---------------------------------------------------------------- 8. Render */
const OUT = CONFIG.planet.colors.outline;

// Yüzeydeki bir noktaya (dünya açısı a, yükseklik h) yerel koordinat sistemi kurar.
// Yerel: y yukarı = -y, ayaklar y=0.
function onSurface(ctx, a, h, extraRot, fn) {
  const sa = a - state.player.a;
  ctx.save();
  ctx.translate(View.cx, View.cy);
  ctx.rotate(sa);
  ctx.translate(0, -(View.R + h * View.scale));
  if (extraRot) ctx.rotate(extraRot);
  ctx.scale(View.scale, View.scale);
  fn();
  ctx.restore();
}
const visible = (a) => Math.abs(wrapAngle(a - state.player.a)) < 1.5;

function outlined(ctx, lw = 3) { ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }

function drawSky(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, View.h);
  g.addColorStop(0, '#3ea8f0'); g.addColorStop(1, '#bfeaff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, View.w, View.h);
  // güneş
  ctx.beginPath(); ctx.arc(View.w * 0.82, View.h * 0.2, 34 * View.scale + 10, 0, TAU);
  ctx.fillStyle = '#fff3a8'; ctx.fill(); outlined(ctx, 3);
  // bulutlar (yavaşça kayar)
  const drift = state.time * 6 + state.player.a * 40;
  for (let i = 0; i < 4; i++) {
    const x = (((i * 190 - drift * (0.5 + i * 0.1)) % (View.w + 200)) + View.w + 200) % (View.w + 200) - 100;
    const y = View.h * (0.1 + (i % 3) * 0.09);
    cloud(ctx, x, y, (0.8 + (i % 2) * 0.4) * View.scale);
  }
}
function cloud(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath();
  ctx.arc(-24, 0, 16, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(-6, -12, 18, Math.PI, 0);
  ctx.arc(18, -4, 14, Math.PI * 1.2, Math.PI * 0.5, false); ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.fill(); outlined(ctx, 3);
  ctx.restore();
}

function drawPlanet(ctx) {
  const { cx, cy, R } = View, c = CONFIG.planet.colors;
  // gölge/atmosfer
  ctx.beginPath(); ctx.arc(cx, cy, R + 10 * View.scale, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill();
  // gövde
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
  const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
  g.addColorStop(0, c.grassLight); g.addColorStop(0.55, c.grass); g.addColorStop(1, c.grassDark);
  ctx.fillStyle = g; ctx.fill(); outlined(ctx, 5 * View.scale + 1);
  // cel-shading: açık hilal (üst sol) + koyu kenar
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R - 3, 0, TAU); ctx.clip();
  ctx.beginPath(); ctx.arc(cx, cy, R - 3, 0, TAU); ctx.arc(cx + R * 0.12, cy + R * 0.12, R * 0.96, 0, TAU, true);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill('evenodd');
  ctx.restore();

  // Dekorlar (dünya açısına sabit)
  for (const d of DECOR) {
    if (!visible(d.a)) continue;
    onSurface(ctx, d.a, 0, 0, () => {
      if (d.kind === 'grass') drawGrass(ctx, d);
      else if (d.kind === 'rock') drawRock(ctx, d);
      else drawTree(ctx, d);
    });
  }
}

const DECOR = (() => {
  const list = []; let seed = 7;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 70; i++) list.push({ kind: 'grass', a: r() * TAU - Math.PI, s: 0.7 + r() * 0.7 });
  for (let i = 0; i < 9; i++) list.push({ kind: 'rock', a: r() * TAU - Math.PI, s: 0.8 + r() * 0.8 });
  for (let i = 0; i < 10; i++) list.push({ kind: 'tree', a: r() * TAU - Math.PI, s: 0.9 + r() * 0.5 });
  return list;
})();

function drawGrass(ctx, d) {
  ctx.save(); ctx.scale(d.s, d.s);
  ctx.beginPath(); ctx.moveTo(-6, 2); ctx.lineTo(-4, -9); ctx.lineTo(-1, 2); ctx.lineTo(1, -12); ctx.lineTo(4, 2); ctx.lineTo(7, -8); ctx.lineTo(8, 2);
  ctx.fillStyle = '#3fa646'; ctx.fill(); outlined(ctx, 2);
  ctx.restore();
}
function drawRock(ctx, d) {
  ctx.save(); ctx.scale(d.s, d.s);
  ctx.beginPath(); ctx.moveTo(-16, 4); ctx.lineTo(-12, -10); ctx.lineTo(-2, -16); ctx.lineTo(10, -11); ctx.lineTo(16, 4); ctx.closePath();
  ctx.fillStyle = '#a7aebf'; ctx.fill(); outlined(ctx, 3);
  ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(-2, -16); ctx.lineTo(-4, -4); ctx.lineTo(-13, 0); ctx.closePath();
  ctx.fillStyle = '#d3d8e6'; ctx.fill();
  ctx.restore();
}
function drawTree(ctx, d) {
  ctx.save(); ctx.scale(d.s, d.s);
  ctx.beginPath(); ctx.rect(-5, -30, 10, 34);
  ctx.fillStyle = '#9a6535'; ctx.fill(); outlined(ctx, 3);
  const blobs = [[0, -52, 24], [-16, -38, 17], [16, -38, 17]];
  for (const [x, y, rad] of blobs) {
    ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fillStyle = '#34b84a'; ctx.fill(); outlined(ctx, 3);
  }
  ctx.beginPath(); ctx.arc(-6, -58, 11, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fill();
  ctx.restore();
}

function eyes(ctx, x, y, dir, big) {
  const r = big ? 4 : 3;
  for (const ex of [x - 5, x + 5]) {
    ctx.beginPath(); ctx.arc(ex, y, r, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); outlined(ctx, 1.5);
    ctx.beginPath(); ctx.arc(ex + dir * 1.2, y + 0.5, 1.6, 0, TAU); ctx.fillStyle = OUT; ctx.fill();
  }
}

function drawPlayer(ctx) {
  const p = state.player;
  const step = Math.sin(p.walk) * (Math.abs(Input.axis) > 0 ? 1 : 0);
  const bob = Math.abs(Math.sin(p.walk)) * 2 * Math.abs(Input.axis);
  if (p.invuln > 0 && Math.floor(state.time * 20) % 2 === 0 && !state.over) ctx.globalAlpha = 0.55;
  onSurface(ctx, p.a, 0, p.lean, () => {
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

function drawGoblin(ctx, en) {
  const c = en.def.colors, bob = Math.abs(Math.sin(en.bob)) * 2;
  onSurface(ctx, en.a, 0, 0, () => {
    ctx.scale(-en.face, 1);
    ctx.translate(0, -bob);
    ctx.beginPath(); ctx.ellipse(0, bob + 1, 14, 3.5, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fill();
    const fl = en.flash > 0;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.roundRect(s * 5 - 3.5, -10, 7, 10, 3); ctx.fillStyle = fl ? '#fff' : c.skinDark; ctx.fill(); outlined(ctx, 2.5);
    }
    ctx.beginPath(); ctx.roundRect(-9, -26, 18, 18, 6); ctx.fillStyle = fl ? '#fff' : c.cloth; ctx.fill(); outlined(ctx, 3);
    // club
    ctx.save(); ctx.translate(-14, -20); ctx.rotate(-0.4);
    ctx.beginPath(); ctx.roundRect(-3, -18, 7, 22, 3); ctx.fillStyle = '#8a5a2b'; ctx.fill(); outlined(ctx, 2.5);
    ctx.restore();
    // kulaklar
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 12, -42); ctx.lineTo(s * 25, -48); ctx.lineTo(s * 13, -33); ctx.closePath();
      ctx.fillStyle = fl ? '#fff' : c.skin; ctx.fill(); outlined(ctx, 2.5);
    }
    ctx.beginPath(); ctx.arc(0, -38, 15, 0, TAU); ctx.fillStyle = fl ? '#fff' : c.skin; ctx.fill(); outlined(ctx, 3);
    // kaşlar + göz + diş
    ctx.beginPath(); ctx.moveTo(-9, -46); ctx.lineTo(-2, -42); ctx.moveTo(9, -46); ctx.lineTo(2, -42); outlined(ctx, 2.5);
    eyes(ctx, 0, -38, 1, false);
    ctx.beginPath(); ctx.moveTo(-5, -30); ctx.lineTo(5, -30); outlined(ctx, 2.5);
    ctx.beginPath(); ctx.moveTo(-3, -30); ctx.lineTo(-2, -26.5); ctx.lineTo(0, -30); ctx.fillStyle = '#fff'; ctx.fill();
  });
  // Sağlık barı (ekranda dikey kalır: yerel döndürmeyle birlikte)
  onSurface(ctx, en.a, 0, 0, () => {
    const w = 34, h = 6, y = -62;
    ctx.beginPath(); ctx.roundRect(-w / 2, y, w, h, 3); ctx.fillStyle = '#3a1a22'; ctx.fill();
    ctx.beginPath(); ctx.roundRect(-w / 2, y, Math.max(0, w * en.hp / en.maxHp), h, 3); ctx.fillStyle = '#ff3b4a'; ctx.fill();
    ctx.beginPath(); ctx.roundRect(-w / 2, y, w, h, 3); outlined(ctx, 2);
  });
}

function drawEnemy(ctx, en) {
  const spr = Assets.get(en.type);
  if (spr) { // gerçek sprite varsa (ileride): ayak noktası alt-orta
    onSurface(ctx, en.a, 0, 0, () => { ctx.scale(-en.face, 1); ctx.drawImage(spr, -spr.width / 2, -spr.height); });
    return;
  }
  drawGoblin(ctx, en);
}

function drawCoin(ctx, c) {
  onSurface(ctx, c.a, c.h, 0, () => {
    const w = Math.abs(Math.cos(c.spin)) * 7 + 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, w, 7, 0, 0, TAU); ctx.fillStyle = '#ffd23f'; ctx.fill(); outlined(ctx, 2);
    ctx.beginPath(); ctx.ellipse(-w * 0.25, -2, w * 0.3, 2.5, 0, 0, TAU); ctx.fillStyle = '#fff6a8'; ctx.fill();
  });
}

function drawSlash(ctx, s) {
  const t = 1 - s.life / s.max;
  onSurface(ctx, state.player.a, 0, state.player.lean, () => {
    ctx.scale(s.dir, 1); ctx.translate(18, -30);
    const r = CONFIG.player.attackRange * 0.9;
    ctx.globalAlpha = 1 - t * t;
    ctx.beginPath(); ctx.arc(0, 0, r, -1.1 + t * 1.4, -0.1 + t * 1.4);
    ctx.arc(0, 0, r * 0.7, -0.1 + t * 1.4, -1.1 + t * 1.4, true); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#7ee7ff'; ctx.stroke();
    ctx.globalAlpha = 1;
  });
}

function drawText(ctx, t) {
  onSurface(ctx, t.a, t.h, 0, () => {
    ctx.globalAlpha = clamp(t.life / t.max * 1.5, 0, 1);
    const big = t.text === 'LEVEL UP!';
    ctx.font = `900 ${big ? 22 : 18}px "Trebuchet MS", sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
    ctx.strokeText(t.text, t.ox, 0); ctx.fillStyle = t.color; ctx.fillText(t.text, t.ox, 0);
    ctx.globalAlpha = 1;
  });
}

function render(ctx) {
  ctx.setTransform(View.dpr, 0, 0, View.dpr, 0, 0);
  ctx.save();
  if (state.shake > 0) ctx.translate(rand(-state.shake, state.shake) * 0.5, rand(-state.shake, state.shake) * 0.5);
  drawSky(ctx);
  drawPlanet(ctx);
  for (const c of state.coins) if (visible(c.a)) drawCoin(ctx, c);
  for (const en of state.enemies) if (visible(en.a)) drawEnemy(ctx, en);
  drawPlayer(ctx);
  for (const s of state.slashes) drawSlash(ctx, s);
  for (const t of state.texts) if (visible(t.a)) drawText(ctx, t);
  ctx.restore();
}

/* ------------------------------------------------------------ 9. Loop / boot */
function boot() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  initHud();
  Input.init(canvas);
  const onResize = () => View.resize(canvas);
  addEventListener('resize', onResize);
  addEventListener('orientationchange', onResize);
  onResize();
  document.getElementById('restart-btn').addEventListener('click', resetGame);
  addEventListener('keydown', (e) => { if (state.over && (e.code === 'Enter' || e.code === 'Space')) resetGame(); });
  resetGame();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); // sekme dönüşlerinde sıçramayı önle
    last = now;
    Input.update();
    update(dt);
    render(ctx);
    requestAnimationFrame(frame);
  }
  Assets.load().then(() => requestAnimationFrame(frame));
  window.__game = { state, CONFIG }; // hata ayıklama
}
boot();
