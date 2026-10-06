// UpgradeManager: güçlendirme havuzundan 3 rastgele kart seçer ve seçileni kalıcı uygular. Veri: data/upgrades.json.
// Maks seviyeye ulaşan güç havuzdan çıkar. Oyuncunun baskın build'ine ait güçler daha sık çıkar (buildAffinityWeight).
// Epik seçimde (boss ödülü) değer ve seviye atlaması epicMultiplier kadar. Kart: ad / bonus ("+10%") / seviye satırı.
import { UPGRADES } from '../core/config.js';
import { state } from './state.js';
import { recalcMaxHp } from './PlayerStats.js';

const bonusText = (u, lv) => {
  const v = u.per * lv; const num = u.fmt === 'pct' ? Math.round(v * 100) : (Math.round(v * 10) / 10);
  return u.bonus.replace('{v}', num);
};
export const upgradeById = (id) => UPGRADES.list.find((u) => u.id === id);
export const levelOf = (id) => state.player.upgrades[id] || 0;

function affinity(p) {            // üyelerinin toplam seviyesi en yüksek build (en az 1 seviye)
  let best = null, bs = 0;
  for (const b of UPGRADES.builds || []) {
    const sum = b.members.reduce((t, m) => t + (p.upgrades[m] || 0), 0);
    if (sum > bs) { bs = sum; best = b; }
  }
  return best;
}

// n adet FARKLI kart (ağırlıklı rastgele). Maks seviyedeki güçler çıkmaz.
export function rollCards(n = 3, epic = false) {
  const p = state.player, mult = epic ? UPGRADES.epicMultiplier : 1, fav = affinity(p);
  const pool = UPGRADES.list.filter((u) => {
    const lv = p.upgrades[u.id] || 0;
    if (lv >= u.max) return false;
    if (u.cap != null) return UPGRADES.base[u.stat] + u.per * lv < u.cap - 1e-9;
    return true;
  });
  const cards = [];
  while (cards.length < n && pool.length) {
    const w = (u) => u.weight * (fav && fav.members.includes(u.id) ? UPGRADES.buildAffinityWeight : 1);
    const sum = pool.reduce((s, u) => s + w(u), 0); let r = Math.random() * sum, i = 0;
    for (; i < pool.length - 1; i++) { if ((r -= w(pool[i])) <= 0) break; }
    const u = pool.splice(i, 1)[0], lv = p.upgrades[u.id] || 0, gain = Math.min(mult, u.max - lv);
    cards.push({
      id: u.id, icon: u.icon, name: u.name, category: u.category, level: lv, next: lv + gain, gain,
      bonus: bonusText(u, gain), levelText: lv ? `LV.${lv} → LV.${lv + gain}` : `YENİ - LV.${gain}`, epic,
    });
  }
  return cards;
}

export function applyUpgrade(id, epic = false) {
  const p = state.player, u = upgradeById(id); if (!u) return 0;
  const mult = epic ? UPGRADES.epicMultiplier : 1;
  p.upgrades[id] = Math.min(u.max, (p.upgrades[id] || 0) + mult);
  if (id === 'maxHp') recalcMaxHp(p, true);
  return p.upgrades[id];
}
