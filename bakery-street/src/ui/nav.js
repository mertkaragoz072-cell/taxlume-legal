// Bottom menu: exactly four buttons.
import { NAV } from '../config.js';
import { ICONS } from './icons.js';

const ICON_FOR = {
  cafe: ICONS.bread + ICONS.cup,
  town: ICONS.town,
  explore: ICONS.explore,
  shop: ICONS.shop,
};

export function createNav(root, { onSelect }) {
  root.innerHTML = NAV.map((n) => `
    <button class="nav-btn${n.active ? ' active' : ''}" data-id="${n.id}">
      <span class="icons">${ICON_FOR[n.id]}</span><span>${n.label}</span>
      ${n.locked ? `<i class="lock">${ICONS.lock}</i>` : ''}${n.badge ? '<i class="badge"></i>' : ''}
    </button>`).join('');
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-btn'); if (btn) onSelect(btn.dataset.id);
  });
}
