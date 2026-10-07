// Bilgi paneli (HUD yan butonları): 🎒 = Karakter (statlar + edinilen güçler), 📜 = Görev (bölüm/dalga hedefi + ilerleme). Açıkken oyun durur (state.userPause).
import { UPGRADES } from '../core/config.js';
import { state } from '../game/state.js';
import { derived, buildLevels, upgradeValue } from '../game/PlayerStats.js';
import { chapterInfo } from '../game/chapters.js';
import { isBossWave } from '../game/WaveManager.js';

const $ = (id) => document.getElementById(id);
const pct = (v) => Math.round(v * 100) + '%';
const row = (k, v) => `<div class="ip-row"><span>${k}</span><b>${v}</b></div>`;

function statsHtml() {
  const p = state.player, s = derived(p);
  const owned = UPGRADES.list.filter((u) => (p.upgrades[u.id] || 0) > 0).map((u) => {
    const lv = p.upgrades[u.id], v = Math.abs(upgradeValue(u, lv)), num = u.fmt === 'pct' ? Math.round(v * 100) : Math.round(v * 10) / 10;
    return `<div class="ip-pow" style="--cat:${UPGRADES.categories[u.category]?.color || '#888'}"><i>${u.icon}</i><span>${u.name}</span><em>SEV.${lv}</em><b>${u.bonus.replace('{v}', num)}</b></div>`;
  }).join('') || '<div class="ip-empty">Henüz güç seçilmedi. Her 5 dalgada bir yeni güç seçersin.</div>';
  const builds = Object.values(buildLevels(p)).filter((b) => b.lv > 0).map((b) => `<span class="chip build">${b.icon} ${b.name}${b.lv > 1 ? ' II' : ''}</span>`).join(' ');
  return `<div class="ip-cols"><div class="ip-col">${row('Seviye', p.level)}${row('Can', Math.round(p.hp) + ' / ' + p.maxHp)}${row('Hasar', '×' + s.damageMul.toFixed(2))}${row('Saldırı hızı', '×' + s.attackSpeedMul.toFixed(2))}${row('Kritik şans', pct(s.critChance))}${row('Kritik hasar', '×' + s.critDamage.toFixed(2))}${row('Hareket hızı', '×' + s.moveMul.toFixed(2))}${s.defense ? row('Savunma', pct(s.defense)) : ''}${s.regen ? row('Yenileme', s.regen + ' HP/sn') : ''}</div><div class="ip-col"><div class="ip-sub">GÜÇLER ${builds}</div>${owned}</div></div>`;
}

function questHtml() {
  const w = state.wave, info = chapterInfo(w.stage), boss = isBossWave(), p = state.player;
  const goal = boss ? 'Goblin Lordu\'nu yen!' : `Dalgayı temizle (${Math.min(w.n, 5)} / 5)`;
  return `<div class="ip-quest"><div class="ip-sub">${info.name} · Bölüm ${w.stage}</div>`
    + `<div class="ip-goal">🎯 ${goal}</div>`
    + `<div class="ip-steps">${[1, 2, 3, 4, 5].map((i) => `<span class="${i < w.n ? 'done' : i === w.n && !boss ? 'cur' : ''}">${i}</span>`).join('')}<span class="${boss ? 'cur boss' : ''}">☠</span></div>`
    + `${row('Öldürülen', state.kills)}${row('Altın', p.coins)}${row('Kristal', p.gems)}`
    + `<div class="ip-hint">Boss'u yenince bölüm tamamlanır: +altın, +kristal, +XP ve bir sonraki zorluk seviyesi (★).</div></div>`;
}

let el, body, title;
function close() { el.classList.add('hidden'); state.userPause = false; }
function open(kind) {
  if (state.paused || state.over) return;
  if (!el.classList.contains('hidden')) { close(); return; }
  title.textContent = kind === 'stats' ? 'KARAKTER' : 'GÖREV';
  body.innerHTML = kind === 'stats' ? statsHtml() : questHtml();
  el.classList.remove('hidden'); state.userPause = true;
}

export function initInfoPanel() {
  el = $('info-panel'); body = $('ip-body'); title = $('ip-title');
  $('btn-bag').addEventListener('pointerdown', (e) => { e.stopPropagation(); open('stats'); });
  $('btn-quest').addEventListener('pointerdown', (e) => { e.stopPropagation(); open('quest'); });
  $('ip-close').addEventListener('click', close);
  el.addEventListener('pointerdown', (e) => { if (e.target === el) close(); });
  addEventListener('keydown', (e) => { if (e.code === 'Escape' && !el.classList.contains('hidden')) close(); else if (e.code === 'KeyI' && !e.repeat) open('stats'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && el.classList.contains('hidden') && !state.paused && !state.over) { /* sekme gizlenince oyun zaten durur (rAF) */ } });
}
