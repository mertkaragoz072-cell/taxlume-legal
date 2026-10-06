// CombatManager: hasar (kritik dahil), geri tepme, ölüm/ödül, XP/seviye, oyuncu hasarı. Kullanıcı verisi: PlayerStats.
import { CONFIG, WAVES } from '../core/config.js';
import { rand, TAU } from '../core/util.js';
import { state, xpForLevel } from './state.js';
import { events } from './events.js';
import { derived, recalcMaxHp, probRound } from './PlayerStats.js';

export function addText(a, h, text, color, scale = 1) {
  const life = CONFIG.hud.damageNumberLife;
  if (state.texts.length > 8) state.texts.shift();                 // ekranı yazıyla doldurma
  state.texts.push({ a, h, text, color, life, max: life, ox: rand(-8, 8), scale });
}

// Oyuncu hasarı: taban × hasar çarpanı, kritik şansıyla × kritik hasar. {dmg, crit}
export function rollDamage(base) {
  const s = derived(state.player), crit = Math.random() < s.critChance;
  return { dmg: base * s.damageMul * (crit ? s.critDamage : 1), crit };
}
export function hitEnemy(en, base) { const r = rollDamage(base); damageEnemy(en, r.dmg, r.crit); }

export function applyKnock(en, k) { en.knock = Math.max(en.knock, k * (1 - en.def.knockResist)); en.stagger = Math.max(en.stagger, 0.3); }

export function damageEnemy(en, dmg, crit = false) {
  en.hp -= dmg; en.flash = 0.14; en.knock = 1 - en.def.knockResist; en.stagger = en.def.boss ? 0 : 0.22;
  if (en.def.knockResist < 0.5 && en.attackT >= 0) { en.attackT = -1; en.atkTimer = 0.5; }   // hafif düşmanın saldırısı vuruşla bölünür; elite/boss bölünmez
  events.onHit?.(en, dmg);
  addText(en.a, en.def.heightUnits + 10, (crit ? '' : '-') + Math.round(dmg) + (crit ? '!' : ''), crit ? '#ffd23f' : '#ff4a4a', (0.75 + en.def.heightUnits / 300) * (crit ? 1.35 : 1));
  if (state.hitFx.length < 4) state.hitFx.push({ a: en.a, h: en.def.heightUnits * 0.55, life: 0.2, max: 0.2, k: en.def.heightUnits / 190, dir: -en.face });
  if (en.hp <= 0 && !en.dead) killEnemy(en);
}

function spawnPickup(a, kind, h, spreadV) {
  state.coins.push({ a, h, vh: rand(0.6, 1.2) * CONFIG.loot.coinPopSpeed * spreadV, va: rand(-1, 1) * 0.3, value: 1, magnet: false, grounded: false, spin: rand(0, TAU), kind });
}

export function killEnemy(en) {
  en.dead = true; en.deathT = 0; state.kills++;
  const n = Math.round(rand(en.def.coins[0], en.def.coins[1]));
  for (let i = 0; i < n; i++) spawnPickup(en.a, 'coin', 14, 1);
  const gems = en.def.gems ? Math.round(rand(en.def.gems[0], en.def.gems[1])) : (Math.random() < (en.def.gemChance || 0) ? 1 : 0);
  for (let i = 0; i < gems; i++) spawnPickup(en.a, 'gem', 18, 1.1);
  const xp = gainXp(en.def.xp);
  addText(en.a, en.def.heightUnits + 34, '+' + xp + ' XP', '#7ee7ff', 0.7);
  events.onKill?.(en);
  if (en.def.boss) bossReward(en);
}

// Boss ödülü: bol coin/gem, tam iyileşme ve sonraki güç seçiminin "EFSANE" (çift güç) olması (data/waves.json → boss.reward)
function bossReward() {
  const R = WAVES.boss.reward, p = state.player;
  for (let i = 0; i < R.coins; i++) spawnPickup(p.a + 0.01 + i * 0.0006, 'coin', 30, 1.4);
  for (let i = 0; i < R.gems; i++) spawnPickup(p.a + 0.012 + i * 0.0007, 'gem', 34, 1.5);
  if (R.healFull) p.hp = p.maxHp;
  if (R.epicUpgrade) state.wave.epicNext = true;
  addText(p.a, 175, 'BOSS ÖLDÜ!', '#ff9a3a', 1.3);
  events.onBoss?.('dead');
}

// XP: XP çarpanı uygulanır; döndürülen = eklenen XP
export function gainXp(amount) {
  const p = state.player, L = CONFIG.leveling;
  amount = probRound(amount * derived(p).xpMul);
  p.xp += amount;
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext; p.level++; p.xpNext = xpForLevel(p.level);
    p.damage += L.damagePerLevel;
    const before = p.maxHp; recalcMaxHp(p, true);
    p.hp = Math.min(p.maxHp, p.hp + (p.maxHp - p.hp) * L.healOnLevelUp);
    addText(p.a, 150, 'LEVEL UP!', '#ffd23f');
    state.rings.push({ a: p.a, t: 0, life: 0.9 });
    events.onLevelUp?.(p.level);
  }
  return amount;
}

export function collectCoin(value) { const p = state.player; p.coins += probRound(value * derived(p).coinMul); events.onCoin?.(); }
export function collectGem(value) { state.player.gems += value; events.onGem?.(); }

// Oyuncuya hasar: savunma hasarı 1/(1+savunma) kadar azaltır
export function hurtPlayer(dmg) {
  const p = state.player;
  if (p.invuln > 0 || state.over) return;
  dmg = Math.max(1, dmg / (1 + derived(p).defense));
  p.hp = Math.max(0, p.hp - dmg);
  p.invuln = CONFIG.player.invulnTime; p.hitFlash = 0.2; state.shake = 6;
  p.anim = 'hurt'; p.animT = 0;
  addText(p.a, 125, '-' + Math.round(dmg), '#ff9a3a');
  events.onHurt?.();
  if (p.hp <= 0) { state.over = true; p.anim = 'death'; p.animT = 0; events.onGameOver?.(state); }
}
