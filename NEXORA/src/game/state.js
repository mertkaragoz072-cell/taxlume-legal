import { CONFIG } from '../core/config.js';

// Tek paylaşılan oyun durumu. Yeniden başlatırken Object.assign ile sıfırlanır (referans korunur).
export const state = {
  time: 0, over: false, kills: 0, shake: 0, spawnTimer: 0,
  player: null, enemies: [], coins: [], slashes: [], texts: [], hitFx: [], rings: [], skillFx: [], skillCd: { skill1: 0, skill2: 0 }, eliteTimer: 0,
};

export function xpForLevel(level) {
  return Math.round(CONFIG.leveling.baseXpToNext * Math.pow(CONFIG.leveling.xpGrowth, level - 1));
}

export function createPlayer() {
  const c = CONFIG.player;
  return {
    a: 0, dir: 1, lean: 0, walk: 0, stride: 0,   // a: gezegen açısı (radyan); stride: kat edilen mesafe (kare tabanlı run bununla senkron)
    hp: c.maxHp, maxHp: c.maxHp, damage: c.attackDamage,
    level: 1, xp: 0, xpNext: xpForLevel(1), coins: 0, gems: 0,   // gems: yer tutucu (henüz kazanılmıyor)
    atkTimer: 0, invuln: 0, hitFlash: 0, hitT: 0, hitDir: 1,
    anim: 'idle', animT: 0, combo: 0,         // animasyon: ad, geçen süre, saldırı kombosu (0..2)
  };
}

export function resetState() {
  Object.assign(state, {
    time: 0, over: false, kills: 0, shake: 0, spawnTimer: 1, player: createPlayer(),
    enemies: [], coins: [], slashes: [], texts: [], hitFx: [], rings: [], skillFx: [], skillCd: { skill1: 0, skill2: 0 }, eliteTimer: CONFIG.enemies.elite.firstAfter,
  });
}
