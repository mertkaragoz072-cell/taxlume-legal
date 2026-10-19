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
    ${res('coin', fmt(PLAYER.gold), 'gold', '', 'goldText')}
    ${res('gem', fmt(PLAYER.gems), 'gems')}
    ${res('bolt', `${PLAYER.energy}/${PLAYER.maxEnergy}`, 'energy', 'energy')}
    <div class="spacer"></div>
    <div class="tiles">
      ${HUD_BUTTONS.map((b) => `<button class="tile" data-id="${b.id}" aria-label="${b.label}">${ICONS[b.id === 'events' ? 'events' : b.id]}<span>${b.label}</span>${b.id === 'quests' ? '<i class="badge" data-badge="quests" hidden></i>' : b.badge ? '<i class="badge"></i>' : ''}</button>`).join('')}
    </div>`;
  root.addEventListener('click', (e) => {
    const tile = e.target.closest('.tile'); if (tile) onButton(tile.dataset.id);
    const plus = e.target.closest('.plus'); if (plus) onAdd(plus.dataset.res);
  });
  const goldEl = root.querySelector('#goldText');
  return {
    setGold: (n) => { goldEl.textContent = fmt(n); },
    /** Red dot on the Görevler button while a reward is waiting. */
    setQuestBadge: (n) => { const el = root.querySelector('[data-badge=quests]'); if (el) el.hidden = n < 1; },
  };
}

function res(icon, value, id, cls = '', spanId = '') {
  return `<div class="pill res ${cls}">${ICONS[icon]}<span${spanId ? ` id="${spanId}"` : ''}>${value}</span><button class="plus" data-res="${id}" aria-label="Ekle">+</button></div>`;
}
