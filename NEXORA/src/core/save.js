// Kayıt/yükleme: yalnızca tarayıcı localStorage (yerel, sunucu yok). Kahraman başına ilerleme:
// (v2: data.meta = { ach, stats, daily, shop } hesap geneli)
//   { level, xp, coins, gems, hp, totalKills, bestLevel, wave, stage, boss, upgrades:{id:seviye}, cards }  + son seçilen kahraman.
// Ölünce seviye/coin/gem KALIR (yeni deneme aynı seviyeden başlar); düşmanlar ve konum sıfırlanır.
// Bozuk/eski kayıt sessizce yok sayılır. Şema değişirse KEY'deki sürümü artır.
import { CONFIG, UPGRADES } from './config.js';
import { xpForLevel } from '../game/state.js';
import { recalcMaxHp } from '../game/PlayerStats.js';
import { restoreCards, serializeCards } from '../game/CardSystem.js';

// Şema sürümleri: v1 (heroes + lastHero) → v2 (+ meta: başarımlar, günlük görevler, mağaza; hesap geneli). Anahtar sabit (nexora_save_v1), sürüm veri içindeki `v` alanıdır;
// eski sürüm yükleyince migrate() ile yükseltilir, bozuk kayıt yedeklenip (nexora_save_corrupt) temiz başlanır.
const KEY = 'nexora_save_v1', BACKUP_KEY = 'nexora_save_corrupt', VERSION = 2;
const fresh = () => ({ v: VERSION, lastHero: null, heroes: {}, meta: freshMeta() });
export const freshMeta = () => ({ runs: [], ach: {}, stats: { kills: 0, bosses: 0, deaths: 0, coins: 0, crits: 0, chapters: 0 }, daily: { day: '', goals: [], claimed: [] }, shop: { owned: {}, spent: 0 } });
const MIGRATIONS = {                                   // from → to (sırayla uygulanır)
  1: (d) => { d.meta = freshMeta(); d.v = 2; return d; },
};
export function migrate(d) {
  if (!d || typeof d !== 'object' || !d.heroes || typeof d.heroes !== 'object') return null;
  let v = Number.isInteger(d.v) ? d.v : 1; if (v > VERSION) return null;              // gelecekteki sürüm: dokunma (geri sarma yok)
  while (v < VERSION) { if (!MIGRATIONS[v]) return null; d = MIGRATIONS[v](d); v = d.v; }
  const m = d.meta = { ...freshMeta(), ...(d.meta || {}) };                            // eksik meta alanlarını tamamla
  m.stats = { ...freshMeta().stats, ...(m.stats || {}) }; m.daily = { ...freshMeta().daily, ...(m.daily || {}) }; m.shop = { ...freshMeta().shop, ...(m.shop || {}) };
  return d;
}
let data = fresh();
let kills0 = 0, lastMeta = '';

export const Save = {
  load() {
    try {
      const raw = localStorage.getItem(KEY); if (!raw) return data;
      let d = null; try { d = migrate(JSON.parse(raw)); } catch (_) { d = null; }
      if (d) data = d;
      else { try { localStorage.setItem(BACKUP_KEY, raw); } catch (_) { /* yoksay */ } }     // okunamayan/yeni sürüm kayıt: yedeklenir, temiz başlanır (üzerine yazılmadan önce)
    } catch (_) { /* localStorage erişilemez */ }
    return data;
  },
  lastHero: () => data.lastHero,
  meta: () => data.meta,
  saveMeta() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) { /* yoksay */ } },
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
    p.upgrades = {};            // bilinmeyen/eski id'ler atlanır, seviyeler maks'a kırpılır
    if (s.upgrades && typeof s.upgrades === 'object') for (const u of UPGRADES.list) { const lv = Math.floor(+s.upgrades[u.id]); if (lv > 0) p.upgrades[u.id] = Math.min(lv, u.max); }
    p.lvShown = lv;                                                  // yüklenen seviye için LEVEL UP yazısı çıkmaz
    restoreCards(p, s.cards);                                        // kart envanteri + kuşanılanlar (CardSystem)
    recalcMaxHp(p, false); p.hp = p.maxHp;                           // can = seviye tabanı × can güçlendirmesi
    if (s.hp > 0) p.hp = Math.max(1, Math.min(p.maxHp, Math.round(s.hp)));   // kayıtlı can geri yüklenir (ölüm kaydı hp:null → tam can)
    const wv = Math.max(1, s.wave | 0 || 1);                     // eski kayıt: tek sayı (küresel dalga) → bölüm + dalga
    if (s.stage) { state.wave.stage = Math.max(1, s.stage | 0); state.wave.n = Math.min(5, wv); state.wave.boss = !!s.boss; }
    else { state.wave.stage = Math.floor((wv - 1) / 5) + 1; state.wave.n = ((wv - 1) % 5) + 1; state.wave.boss = false; }
    return true;
  },
  // Anlık durumu yaz. force=false ise yalnızca değişiklik varsa yazar.
  write(heroId, p, state) {
    if (!heroId || !p) return;
    const prev = data.heroes[heroId] || {};
    const cur = { level: p.level, xp: p.xp, coins: p.coins, gems: p.gems, totalKills: kills0 + state.kills, bestLevel: Math.max(prev.bestLevel || 1, p.level), wave: state.wave.n, stage: state.wave.stage, boss: state.wave.boss, upgrades: { ...p.upgrades }, cards: serializeCards(p), hp: state.over ? null : Math.max(1, Math.round(p.hp)) };
    const mj = JSON.stringify(data.meta); if (JSON.stringify(prev) === JSON.stringify(cur) && data.lastHero === heroId && mj === lastMeta) return; lastMeta = mj;
    data.heroes[heroId] = cur; data.lastHero = heroId;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) { /* dolu/yasak → oyun yine çalışır */ }
  },
  setLast(id) { data.lastHero = id; try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) { /* yoksay */ } },
  clear() { data = fresh(); kills0 = 0; try { localStorage.removeItem(KEY); } catch (_) { /* yoksay */ } },
};
