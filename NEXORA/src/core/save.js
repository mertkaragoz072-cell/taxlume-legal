// Kayıt/yükleme: yalnızca tarayıcı localStorage (yerel, sunucu yok). Kahraman başına ilerleme:
//   { level, xp, coins, gems, totalKills, bestLevel }  + son seçilen kahraman.
// Ölünce seviye/coin/gem KALIR (yeni deneme aynı seviyeden başlar); düşmanlar ve konum sıfırlanır.
// Bozuk/eski kayıt sessizce yok sayılır. Şema değişirse KEY'deki sürümü artır.
import { CONFIG } from './config.js';
import { xpForLevel } from '../game/state.js';

const KEY = 'nexora_save_v1';
let data = { v: 1, lastHero: null, heroes: {} };
let kills0 = 0, dirty = false;

export const Save = {
  load() {
    try {
      const raw = localStorage.getItem(KEY); if (!raw) return data;
      const d = JSON.parse(raw);
      if (d && d.v === 1 && d.heroes && typeof d.heroes === 'object') data = d;
    } catch (_) { /* bozuk kayıt → yok say */ }
    return data;
  },
  lastHero: () => data.lastHero,
  of: (id) => data.heroes[id] || null,
  // Kayıtlı ilerlemeyi oyuncuya uygula (can/hasar seviyeye göre türetilir; gainXp ile aynı formül)
  apply(p, heroId, state) {
    const s = data.heroes[heroId]; kills0 = s ? s.totalKills || 0 : 0; state.kills = 0;
    if (!s) return false;
    const L = CONFIG.leveling, lv = Math.max(1, Math.min(999, s.level | 0));
    p.level = lv; p.xpNext = xpForLevel(lv); p.xp = Math.max(0, Math.min(p.xpNext - 1, s.xp | 0));
    p.damage = CONFIG.player.attackDamage + L.damagePerLevel * (lv - 1);
    p.maxHp = CONFIG.player.maxHp + L.maxHpPerLevel * (lv - 1); p.hp = p.maxHp;
    p.coins = Math.max(0, s.coins | 0); p.gems = Math.max(0, s.gems | 0);
    return true;
  },
  // Anlık durumu yaz. force=false ise yalnızca değişiklik varsa yazar.
  write(heroId, p, state) {
    if (!heroId || !p) return;
    const prev = data.heroes[heroId] || {};
    const cur = { level: p.level, xp: p.xp, coins: p.coins, gems: p.gems, totalKills: kills0 + state.kills, bestLevel: Math.max(prev.bestLevel || 1, p.level) };
    if (prev.level === cur.level && prev.xp === cur.xp && prev.coins === cur.coins && prev.gems === cur.gems && prev.totalKills === cur.totalKills && data.lastHero === heroId) return;
    data.heroes[heroId] = cur; data.lastHero = heroId;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) { /* dolu/yasak → oyun yine çalışır */ }
  },
  setLast(id) { data.lastHero = id; try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) { /* yoksay */ } },
  clear() { data = { v: 1, lastHero: null, heroes: {} }; kills0 = 0; try { localStorage.removeItem(KEY); } catch (_) { /* yoksay */ } },
};
