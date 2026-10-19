// Top bar: avatar + level, currencies and the four quick-access buttons.
import { PLAYER, HUD_BUTTONS, HUD_SHOW } from '../config.js';
import { ICONS } from './icons.js';

const fmt = (n) => n.toLocaleString('tr-TR');

export function createHud(root, { onButton }) {
  root.innerHTML = `
    <div class="pill player">
      <div class="avatar">${ICONS.avatar}</div>
      <div class="level"><div class="lvrow"><b id="levelText">Lv. 1</b><small id="xpText"></small></div><div class="xp"><i id="xpFill" style="width:0%"></i></div></div>
    </div>
    ${res('coin', fmt(PLAYER.gold), 'gold', '', 'goldText')}
    ${HUD_SHOW.gems ? res('gem', fmt(PLAYER.gems), 'gems', '', 'gemsText') : ''}
    ${HUD_SHOW.energy ? res('bolt', `${PLAYER.energy}/${PLAYER.maxEnergy}`, 'energy', 'energy') : ''}
    <div class="spacer"></div>
    <div class="tiles">
      ${HUD_BUTTONS.filter((b) => !b.hidden).map((b) => `<button class="tile" data-id="${b.id}" aria-label="${b.label}">${ICONS[b.id]}<span>${b.label}</span>${b.id === 'quests' || b.id === 'events' ? `<i class="badge" data-badge="${b.id}" hidden></i>` : ''}</button>`).join('')}
    </div>`;
  root.addEventListener('click', (e) => {
    const tile = e.target.closest('.tile'); if (tile) onButton(tile.dataset.id);
  });
  const goldEl = root.querySelector('#goldText');
  return {
    setGold: (n) => { goldEl.textContent = fmt(n); },
    /** Level, XP bar and a small "xp / needed" caption (shows MAX at the top level). */
    setLevel: ({ level, xp, need, fraction, isMax }) => {
      root.querySelector('#levelText').textContent = `Lv. ${level}`;
      root.querySelector('#xpFill').style.width = `${Math.round(fraction * 100)}%`;
      root.querySelector('#xpText').textContent = isMax ? 'MAX' : `${fmt(xp)} / ${fmt(need)} XP`;
    },
    setGems: (n) => { const el = root.querySelector('#gemsText'); if (el) el.textContent = fmt(n); },
    /** Red dot on the Görevler button while a reward is waiting. */
    setQuestBadge: (n) => { const el = root.querySelector('[data-badge=quests]'); if (el) el.hidden = n < 1; },
    /** Red dot on the Günlük Ödül button while today's daily reward can be collected. */
    setDailyBadge: (on) => { const el = root.querySelector('[data-badge=events]'); if (el) el.hidden = !on; },
  };
}

function res(icon, value, id, cls = '', spanId = '') {
  return `<div class="pill res ${cls}${HUD_SHOW.plus ? '' : ' noplus'}">${ICONS[icon]}<span${spanId ? ` id="${spanId}"` : ''}>${value}</span>${HUD_SHOW.plus ? `<button class="plus" data-res="${id}" aria-label="Ekle">+</button>` : ''}</div>`;
}
