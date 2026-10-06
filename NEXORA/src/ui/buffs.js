// HUD güç çipleri: edinilen güçler küçük çipler halinde ("⚔ +30%"), aktif build'ler altın çip, fazlası "+N" olarak toplanır.
import { UPGRADES } from '../core/config.js';
import { state } from '../game/state.js';
import { buildLevels, upgradeValue } from '../game/PlayerStats.js';

const MAX_CHIPS = 6;
let el, last = '';
export function initBuffs() { el = document.getElementById('buffs'); }

export function updateBuffs(force = false) {
  const p = state.player, items = [];
  for (const u of UPGRADES.list) {
    const lv = p.upgrades[u.id] || 0; if (!lv) continue;
    const v = Math.abs(upgradeValue(u, lv)), num = u.fmt === 'pct' ? Math.round(v * 100) : Math.round(v * 10) / 10;
    items.push({ icon: u.icon, text: u.bonus.replace('{v}', num).replace('+', ''), name: u.name, lv, color: UPGRADES.categories[u.category]?.color, sign: u.bonus.startsWith('-') ? '' : '+' });
  }
  items.sort((a, b) => b.lv - a.lv);
  const builds = Object.values(buildLevels(p)).filter((b) => b.lv > 0);
  const key = JSON.stringify([items.map((i) => i.name + i.lv), builds.map((b) => b.id + b.lv)]);
  if (key === last && !force) return; last = key;
  const bs = builds.slice(0, 1);                                            // en çok 6 çip: (1 build) + güçler + "+N"
  const room = MAX_CHIPS - bs.length, fits = items.length <= room;
  const shown = items.slice(0, fits ? room : room - 1);
  let html = bs.map((b) => `<span class="chip build" title="${b.desc || ''}">${b.icon} ${b.name}${b.lv > 1 ? ' II' : ''}</span>`).join('');
  html += shown.map((i) => `<span class="chip" style="--cat:${i.color}" title="${i.name} LV.${i.lv}">${i.icon} ${i.sign}${i.text}</span>`).join('');
  if (items.length > shown.length) html += `<span class="chip more">+${items.length - shown.length}</span>`;
  el.innerHTML = html;
}
export function popBuffs() { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
