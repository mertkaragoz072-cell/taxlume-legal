// UpgradeCard: "GÜÇLEN!" ekranı — 3 kart, yalnız biri seçilir. Seçilen büyür/parlar, diğerleri kaybolur (~0.55 sn), sonra onPick çağrılır.
// Kısayol: 1/2/3 tuşları. Kart: kategori, ikon, ad, bonus (+10%), seviye satırı ("YENİ - LV.1" / "LV.2 → LV.3").
import { UPGRADES } from '../core/config.js';
let cleanup = null;
export function showUpgrade(cards, epic, onPick) {
  const root = document.getElementById('upgrade'), list = document.getElementById('up-cards'), title = document.getElementById('up-title'), sub = document.getElementById('up-sub');
  title.textContent = epic ? 'EFSANE GÜÇ!' : 'GÜÇLEN!'; title.className = epic ? 'epic' : '';
  sub.textContent = epic ? 'Boss ödülü: seçtiğin güç İKİ KAT etkili' : 'Bir güç seç — kalıcı olarak uygulanır';
  list.innerHTML = ''; list.className = 'up-cards';
  let chosen = false;
  const pick = (i) => {
    if (chosen) return; chosen = true;
    const btn = list.children[i]; btn.classList.add('picked'); list.classList.add('chosen');
    setTimeout(() => { root.classList.add('hidden'); cleanup?.(); onPick(cards[i]); }, 600);
  };
  cards.forEach((c, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'up-card' + (c.epic ? ' epic' : '');
    b.style.setProperty('--cat', UPGRADES.categories[c.category]?.color || '#888');
    b.innerHTML = `<div class="cat">${UPGRADES.categories[c.category]?.name || ''}</div><div class="ic">${c.icon}</div><div class="nm">${c.name}</div><div class="tx">${c.bonus}</div><div class="lv">${c.levelText}</div>`;
    b.addEventListener('click', () => pick(i)); list.appendChild(b);
  });
  const key = (e) => { const n = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code); if (n >= 0 && n < cards.length) pick(n); };
  addEventListener('keydown', key); cleanup = () => removeEventListener('keydown', key);
  root.classList.remove('hidden');
}
