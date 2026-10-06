// UpgradeCard: "GÜÇLEN!" ekranı — 3 kart, yalnız biri seçilir. Seçilen büyür/parlar, diğerleri kaybolur (~0.55 sn), sonra onPick çağrılır.
// Kısayol: 1/2/3 tuşları. Kart: kategori, ikon, ad, bonus (+10%), seviye satırı ("YENİ - LV.1" / "LV.2 → LV.3").
import { UPGRADES } from '../core/config.js';
let cleanup = null;
export function showUpgrade(cards, epic, onPick) {
  const root = document.getElementById('upgrade'), list = document.getElementById('up-cards'), title = document.getElementById('up-title'), sub = document.getElementById('up-sub');
  title.textContent = 'SEVİYE ATLADIN!'; title.className = epic ? 'epic' : '';
  sub.textContent = epic ? 'Boss ödülü — daha değerli geliştirmeler! Bir geliştirme seç' : 'Bir geliştirme seç';
  list.innerHTML = ''; list.className = 'up-cards';
  let chosen = false;
  const pick = (i) => {
    if (chosen) return; chosen = true;
    const btn = list.children[i]; btn.classList.add('picked'); list.classList.add('chosen');
    setTimeout(() => { root.classList.add('hidden'); cleanup?.(); onPick(cards[i]); }, 600);
  };
  cards.forEach((c, i) => {
    const RR = UPGRADES.rarities[c.rarity] || {};
    const b = document.createElement('button'); b.type = 'button'; b.className = `up-card r-${c.rarity}`;
    b.style.setProperty('--cat', UPGRADES.categories[c.category]?.color || '#888'); b.style.setProperty('--rar', RR.color || '#888');
    b.innerHTML = `<div class="rib">${RR.name || ''}</div><div class="ic"><span>${c.icon}</span></div><div class="nm">${c.title || c.name}</div><div class="ds">${c.desc || c.name}</div><div class="tx">${c.bonus}</div>${c.level ? `<div class="tt">Toplam ${c.total}</div>` : ''}<div class="lv">${c.levelText}</div><i class="shine"></i>`;
    b.addEventListener('click', () => pick(i)); list.appendChild(b);
  });
  const key = (e) => { const n = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code); if (n >= 0 && n < cards.length) pick(n); };
  addEventListener('keydown', key); cleanup = () => removeEventListener('keydown', key);
  root.classList.remove('hidden');
}
