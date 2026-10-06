import { CONFIG } from '../core/config.js';

// Tek paylaşılan oyun durumu. Yeniden başlatırken Object.assign ile sıfırlanır (referans korunur).
export const state = {
  time: 0, over: false, paused: false, kills: 0, shake: 0, hitStop: 0, hurtFlash: 0, slowT: 0, particles: [],
  wave: { stage: 1, n: 1, boss: false, phase: 'intro', t: 0, queue: [], total: 0, spawnT: 0, epicNext: false },
  player: null, enemies: [], coins: [], slashes: [], texts: [], hitFx: [], rings: [], telegraphs: [], skillFx: [], skillCd: { skill1: 0, skill2: 0 },
};

export function xpForLevel(level) {
  return Math.round(CONFIG.leveling.baseXpToNext * Math.pow(CONFIG.leveling.xpGrowth, level - 1));
}

export function createPlayer() {
  const c = CONFIG.player;
  return {
    a: 0, dir: 1, lean: 0, walk: 0, stride: 0,   // a: gezegen açısı (radyan); stride: kat edilen mesafe (kare tabanlı run bununla senkron)
    hp: c.maxHp, maxHp: c.maxHp, damage: c.attackDamage,
    level: 1, xp: 0, xpNext: xpForLevel(1), coins: 0, gems: 0, upgrades: {}, retreat: 0, cards: { owned: {}, equipped: [] },   // upgrades: { güçId: seviye } (PlayerStats/UpgradeManager)
    atkTimer: 0, invuln: 0, hitFlash: 0, hitT: 0, hitDir: 1,
    anim: 'idle', animT: 0, combo: 0,         // animasyon: ad, geçen süre, saldırı kombosu (0..2)
  };
}

export function resetState() {
  Object.assign(state, {
    time: 0, over: false, paused: false, kills: 0, shake: 0, hitStop: 0, hurtFlash: 0, slowT: 0, particles: [], player: createPlayer(),
    wave: { stage: 1, n: 1, boss: false, phase: 'intro', t: 0, queue: [], total: 0, spawnT: 0, epicNext: false },
    enemies: [], coins: [], slashes: [], texts: [], hitFx: [], rings: [], telegraphs: [], skillFx: [], skillCd: { skill1: 0, skill2: 0 },
  });
}
