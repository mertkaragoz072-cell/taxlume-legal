// Panel (HUD 🎒): sekmeler — KARAKTER (statlar + güçler), GÖREVLER (günlük görevler + başarımlar), MAĞAZA (kalıcı güçlendirmeler). Açıkken oyun durur (state.userPause).
import { UPGRADES, META } from '../core/config.js';
import { Save } from '../core/save.js';
import { state } from '../game/state.js';
import { derived, buildLevels, upgradeValue } from '../game/PlayerStats.js';
import { progressOf, claimDaily, shopLevel, shopBuy } from '../game/Meta.js';

const $ = (id) => document.getElementById(id);
const pct = (v) => Math.round(v * 100) + '%';
const row = (k, v) => `<div class="ip-row"><span>${k}</span><b>${v}</b></div>`;
const rw = (r) => [r.coins ? `🪙${r.coins}` : '', r.gems ? `💎${r.gems}` : ''].filter(Boolean).join(' ');

function statsHtml() {
  const p = state.player, s = derived(p);
  const owned = UPGRADES.list.filter((u) => (p.upgrades[u.id] || 0) > 0).map((u) => {
    const lv = p.upgrades[u.id], v = Math.abs(upgradeValue(u, lv)), num = u.fmt === 'pct' ? Math.round(v * 100) : Math.round(v * 10) / 10;
    return `<div class="ip-pow" style="--cat:${UPGRADES.categories[u.category]?.color || '#888'}"><i>${u.icon}</i><span>${u.name}</span><em>SEV.${lv}</em><b>${u.bonus.replace('{v}', num)}</b></div>`;
  }).join('') || '<div class="ip-empty">Henüz güç seçilmedi. Her 5 dalgada bir yeni güç seçersin.</div>';
  const builds = Object.values(buildLevels(p)).filter((b) => b.lv > 0).map((b) => `<span class="chip build">${b.icon} ${b.name}${b.lv > 1 ? ' II' : ''}</span>`).join(' ');
  return `<div class="ip-cols"><div class="ip-col">${row('Seviye', p.level)}${row('Can', Math.round(p.hp) + ' / ' + p.maxHp)}${row('Hasar', '×' + s.damageMul.toFixed(2))}${row('Saldırı hızı', '×' + s.attackSpeedMul.toFixed(2))}${row('Kritik şans', pct(s.critChance))}${row('Kritik hasar', '×' + s.critDamage.toFixed(2))}${row('Hareket hızı', '×' + s.moveMul.toFixed(2))}${s.defense ? row('Savunma', pct(s.defense)) : ''}${s.regen ? row('Yenileme', s.regen.toFixed(1) + ' HP/sn') : ''}</div><div class="ip-col"><div class="ip-sub">GÜÇLER ${builds}</div>${owned}</div></div>`;
}

function questsHtml() {
  const m = Save.meta(), daily = m.daily.goals.map((g) => {
    const pr = progressOf(g), done = pr >= g.target, claimed = m.daily.claimed.includes(g.id);
    return `<div class="ip-item ${done ? 'done' : ''}"><div class="t">${g.text}<small>${pr} / ${g.target} · ödül ${rw(g.reward)}</small><div class="ip-bar"><i style="width:${pr / g.target * 100}%"></i></div></div>${claimed ? '✅' : `<button class="ip-btn" data-claim="${g.id}" ${done ? '' : 'disabled'}>AL</button>`}</div>`;
  }).join('');
  const ach = META.achievements.map((a) => {
    const done = !!m.ach[a.id], v = Math.min(a.target, m.stats[a.stat] || 0);
    return `<div class="ip-item ${done ? 'done' : ''}"><i>${a.icon}</i><div class="t"><b>${a.name}</b><small>${a.desc} · ${done ? 'tamamlandı' : `${v} / ${a.target}`} · ${rw(a.reward)}</small></div>${done ? '✅' : ''}</div>`;
  }).join('');
  return `<div class="ip-cols"><div class="ip-col"><h4>📅 GÜNLÜK GÖREVLER</h4>${daily}</div><div class="ip-col"><h4>🏅 BAŞARIMLAR (${Object.keys(m.ach).length}/${META.achievements.length})</h4>${ach}</div></div>`;
}

function shopHtml() {
  const p = state.player, items = META.shop.map((it) => {
    const lv = shopLevel(it.id), maxed = lv >= it.max, cost = it.cost[lv], cur = it.currency === 'gems' ? '💎' : '🪙', can = !maxed && (p[it.currency] || 0) >= cost;
    return `<div class="ip-item ${maxed ? 'done' : ''}"><i>${it.icon}</i><div class="t"><b>${it.name}</b> <em>SEV.${lv}/${it.max}</em><small>${it.desc}</small></div>${maxed ? 'MAKS' : `<button class="ip-btn" data-buy="${it.id}" ${can ? '' : 'disabled'}>${cur}${cost}</button>`}</div>`;
  }).join('');
  return `<div class="ip-sub">Cüzdan: 🪙 ${p.coins} &nbsp; 💎 ${p.gems} — satın alınanlar kalıcıdır ve tüm kahramanlarda geçerlidir.</div>${items}`;
}

let el, body, tab = 'stats', tabsEl;
const render = () => { body.innerHTML = tab === 'stats' ? statsHtml() : tab === 'quests' ? questsHtml() : shopHtml(); for (const b of tabsEl.children) b.classList.toggle('on', b.dataset.tab === tab); };
function close() { el.classList.add('hidden'); state.userPause = false; }
function open() {
  if (state.paused || state.over) return;
  if (!el.classList.contains('hidden')) { close(); return; }
  render(); el.classList.remove('hidden'); state.userPause = true;
}

export function initInfoPanel() {
  el = $('info-panel'); body = $('ip-body'); tabsEl = $('ip-tabs');
  $('btn-bag').addEventListener('pointerdown', (e) => { e.stopPropagation(); open(); });
  $('ip-close').addEventListener('click', close);
  tabsEl.addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (b) { tab = b.dataset.tab; render(); } });
  body.addEventListener('click', (e) => {
    const c = e.target.closest('[data-claim]'), b = e.target.closest('[data-buy]');
    if (c && claimDaily(c.dataset.claim)) render(); else if (b && shopBuy(b.dataset.buy).ok) render();
  });
  el.addEventListener('pointerdown', (e) => { if (e.target === el) close(); });
  addEventListener('keydown', (e) => { if (e.code === 'Escape' && !el.classList.contains('hidden')) close(); else if (e.code === 'KeyI' && !e.repeat) open(); });
}
