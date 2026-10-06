// UpgradeManager: güçlendirme havuzundan 3 rastgele kart seçer ve seçileni kalıcı uygular. Veri: data/upgrades.json.
// Aynı güç tekrar çıkabilir (seviye artar: "Lv. 2 → 3"). Epik seçimde (boss ödülü) değer ve seviye atlaması epicMultiplier kadar.
import { UPGRADES } from '../core/config.js';
import { state } from './state.js';
import { recalcMaxHp } from './PlayerStats.js';

const fmt = (u, lv) => {
  const v = u.per * lv; const num = u.fmt === 'pct' ? Math.round(v * 100) : (Math.round(v * 10) / 10);
  return u.text.replace('{v}', num);
};

// n adet FARKLI kart (ağırlıklı rastgele). cap'e ulaşmış güçler çıkmaz.
export function rollCards(n = 3, epic = false) {
  const p = state.player, mult = epic ? UPGRADES.epicMultiplier : 1;
  const pool = UPGRADES.list.filter((u) => {
    if (u.cap == null) return true;
    const cur = UPGRADES.base[u.stat] + u.per * (p.upgrades[u.id] || 0);
    return cur < u.cap - 1e-9;
  });
  const cards = [];
  while (cards.length < n && pool.length) {
    const sum = pool.reduce((s, u) => s + u.weight, 0); let r = Math.random() * sum, i = 0;
    for (; i < pool.length - 1; i++) { if ((r -= pool[i].weight) <= 0) break; }
    const u = pool.splice(i, 1)[0], lv = p.upgrades[u.id] || 0;
    cards.push({ id: u.id, icon: u.icon, name: u.name, category: u.category, level: lv, next: lv + mult, text: fmt(u, mult), epic });
  }
  return cards;
}

export function applyUpgrade(id, epic = false) {
  const p = state.player, mult = epic ? UPGRADES.epicMultiplier : 1;
  p.upgrades[id] = (p.upgrades[id] || 0) + mult;
  if (id === 'maxHp') recalcMaxHp(p, true);
  return p.upgrades[id];
}
