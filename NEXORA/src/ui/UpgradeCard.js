// UpgradeCard: "GÜÇLEN!" ekranı — 3 kart, yalnız biri seçilir. Seçilen büyür/parlar, diğerleri kaybolur (~0.55 sn), sonra onPick çağrılır.
// Kısayol: 1/2/3 tuşları. Kart: kategori, ikon, ad, bonus (+10%), seviye satırı ("YENİ - LV.1" / "LV.2 → LV.3").
import { UPGRADES } from '../core/config.js';
import { View } from '../core/view.js';
let cleanup = null;
// Seçilen karttan karaktere giden küçük enerji küresi (Web Animations; ~0.55 sn)
function flyOrb(btn, color = '#ffd23f') {
  const r = btn.getBoundingClientRect(), o = document.createElement('div');
  o.style.cssText = `position:fixed;z-index:60;left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,#fff 0%,${color} 55%,transparent 72%);box-shadow:0 0 18px 8px ${color};`;
  document.body.appendChild(o);
  const dx = View.heroX - (r.left + r.width / 2), dy = View.heroY - 50 - (r.top + r.height / 2);
  const an = o.animate([{ transform: 'translate(0,0) scale(1.3)', opacity: 1 }, { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 40}px) scale(1)`, opacity: 1, offset: 0.55 }, { transform: `translate(${dx}px,${dy}px) scale(.35)`, opacity: 0.2 }], { duration: 560, delay: 120, easing: 'ease-in', fill: 'both' });
  an.onfinish = () => o.remove();
}
export function showUpgrade(cards, epic, onPick) {
  const root = document.getElementById('upgrade'), list = document.getElementById('up-cards'), title = document.getElementById('up-title'), sub = document.getElementById('up-sub');
  title.textContent = 'SEVİYE ATLADIN!'; title.className = epic ? 'epic' : '';
  sub.textContent = epic ? 'Boss ödülü — daha değerli geliştirmeler! Bir geliştirme seç' : 'Bir geliştirme seç';
  list.innerHTML = ''; list.className = 'up-cards';
  let chosen = false;
  const pick = (i) => {
    if (chosen) return; chosen = true;
    const btn = list.children[i]; btn.classList.add('picked'); list.classList.add('chosen');
    flyOrb(btn, UPGRADES.categories[cards[i].category]?.color);
    setTimeout(() => { root.classList.add('hidden'); cleanup?.(); onPick(cards[i]); }, 600);
  };
  cards.forEach((c, i) => {
    const RR = UPGRADES.rarities[c.rarity] || {};
    const b = document.createElement('button'); b.type = 'button'; b.className = `up-card r-${c.rarity}`;
    b.style.setProperty('--cat', UPGRADES.categories[c.category]?.color || '#888'); b.style.setProperty('--rar', RR.color || '#888');
    if (c.art) {                                           // hazır kart görseli: başlık/ikon görselde, bonus ve seviye üstüne yazılır
      b.classList.add('art'); b.style.backgroundImage = `url(${c.art})`;
      if (c.artText) { b.style.setProperty('--txf', c.artText[0]); b.style.setProperty('--txs', c.artText[1]); }
      b.innerHTML = `<div class="tx">${c.bonus}</div><div class="lv">${c.levelText}</div>`;
    } else b.innerHTML = `<div class="rib">${RR.name || ''}</div><div class="ic"><span>${c.icon}</span></div><div class="nm">${c.title || c.name}</div><div class="ds">${c.desc || c.name}</div><div class="tx">${c.bonus}</div>${c.level ? `<div class="tt">Şu an ${c.current}</div>` : ''}<div class="lv">${c.levelText}</div><i class="shine"></i>`;
    b.addEventListener('click', () => pick(i)); list.appendChild(b);
  });
  const key = (e) => { const n = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code); if (n >= 0 && n < cards.length) pick(n); };
  addEventListener('keydown', key); cleanup = () => removeEventListener('keydown', key);
  root.classList.remove('hidden');
}
