// Top bar: avatar + level, currencies and the four quick-access buttons.
import { PLAYER, HUD_BUTTONS } from '../config.js';
import { ICONS } from './icons.js';

const fmt = (n) => n.toLocaleString('tr-TR');

export function createHud(root, { onButton, onAdd }) {
  root.innerHTML = `
    <div class="pill player">
      <div class="avatar">${ICONS.avatar}</div>
      <div class="level"><b>Lv. ${PLAYER.level}</b><div class="xp"><i style="width:${PLAYER.xp * 100}%"></i></div></div>
    </div>
    ${res('coin', fmt(PLAYER.gold), 'gold')}
    ${res('gem', fmt(PLAYER.gems), 'gems')}
    ${res('bolt', `${PLAYER.energy}/${PLAYER.maxEnergy}`, 'energy', 'energy')}
    <div class="spacer"></div>
    <div class="tiles">
      ${HUD_BUTTONS.map((b) => `<button class="tile" data-id="${b.id}" aria-label="${b.label}">${ICONS[b.id === 'events' ? 'events' : b.id]}<span>${b.label}</span>${b.badge ? '<i class="badge"></i>' : ''}</button>`).join('')}
    </div>`;
  root.addEventListener('click', (e) => {
    const tile = e.target.closest('.tile'); if (tile) onButton(tile.dataset.id);
    const plus = e.target.closest('.plus'); if (plus) onAdd(plus.dataset.res);
  });
}

function res(icon, value, id, cls = '') {
  return `<div class="pill res ${cls}">${ICONS[icon]}<span>${value}</span><button class="plus" data-res="${id}" aria-label="Ekle">+</button></div>`;
}
