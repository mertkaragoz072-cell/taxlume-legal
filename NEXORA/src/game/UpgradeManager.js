// UpgradeManager: güçlendirme havuzundan 3 FARKLI rastgele kart seçer ve seçileni kalıcı uygular. Veri: data/upgrades.json.
// Nadirlik (rarities): COMMON/RARE/EPIC/LEGENDARY — nadirlik kazanılan seviye sayısını belirler (ör. RARE = +2 seviye = iki kat bonus).
// Ağırlıklar normal ve boss seçimi için ayrı (boss ödülü daha değerli). EPIC/LEGENDARY altyapısı hazır, ağırlıkları şimdilik 0 / çok düşük.
// Maks seviyedeki güçler çıkmaz; baskın build'in güçleri daha sık çıkar (buildAffinityWeight).
import { UPGRADES } from '../core/config.js';
import { state } from './state.js';
import { recalcMaxHp } from './PlayerStats.js';

const bonusText = (u, lv) => {
  const v = Math.abs(u.per * lv); const num = u.fmt === 'pct' ? Math.round(v * 100) : (Math.round(v * 10) / 10);
  return u.bonus.replace('{v}', num);
};
export const upgradeById = (id) => UPGRADES.list.find((u) => u.id === id);
export const levelOf = (id) => state.player.upgrades[id] || 0;

function affinity(p) {            // üyelerinin toplam seviyesi en yüksek build
  let best = null, bs = 0;
  for (const b of UPGRADES.builds || []) {
    const sum = b.members.reduce((t, m) => t + (p.upgrades[m] || 0), 0);
    if (sum > bs) { bs = sum; best = b; }
  }
  return best;
}

function rollRarity(boss, maxGain) {
  const R = Object.entries(UPGRADES.rarities).filter(([, r]) => r.gain <= maxGain);
  const wOf = (r) => (boss ? r.bossWeight : r.weight) || 0;
  const sum = R.reduce((s, [, r]) => s + wOf(r), 0);
  if (sum <= 0) return 'common';
  let x = Math.random() * sum;
  for (const [id, r] of R) { if ((x -= wOf(r)) <= 0) return id; }
  return 'common';
}

// n adet FARKLI kart. boss=true → daha yüksek nadirlik şansı
export function rollCards(n = 3, boss = false) {
  const p = state.player, fav = affinity(p);
  const pool = UPGRADES.list.filter((u) => {
    const lv = p.upgrades[u.id] || 0;
    if (lv >= u.max) return false;
    if (u.cap != null) return UPGRADES.base[u.stat] + u.per * lv < u.cap - 1e-9;
    if (u.floor != null) return UPGRADES.base[u.stat] + u.per * lv > u.floor + 1e-9;
    return true;
  });
  const cards = [];
  while (cards.length < n && pool.length) {
    const w = (u) => u.weight * (fav && fav.members.includes(u.id) ? UPGRADES.buildAffinityWeight : 1);
    const sum = pool.reduce((s, u) => s + w(u), 0); let r = Math.random() * sum, i = 0;
    for (; i < pool.length - 1; i++) { if ((r -= w(pool[i])) <= 0) break; }
    const u = pool.splice(i, 1)[0], lv = p.upgrades[u.id] || 0;
    const rarity = rollRarity(boss, u.max - lv), gain = UPGRADES.rarities[rarity].gain;
    cards.push({
      id: u.id, icon: u.icon, name: u.name, title: u.title, desc: u.desc, category: u.category, rarity, level: lv, next: lv + gain, gain,
      bonus: bonusText(u, gain), total: bonusText(u, lv + gain),
      levelText: lv ? `SEVİYE ${lv} → ${lv + gain}` : `YENİ · SEVİYE ${gain}`,
    });
  }
  return cards;
}

// Seçilen kartı uygular (card.gain kadar seviye, maks'a kırpılır)
export function applyUpgrade(card) {
  const p = state.player, u = upgradeById(card.id); if (!u) return 0;
  p.upgrades[card.id] = Math.min(u.max, (p.upgrades[card.id] || 0) + (card.gain || 1));
  if (card.id === 'maxHp') recalcMaxHp(p, true);
  return p.upgrades[card.id];
}
