// Panel (HUD 🎒): sekmeler — KARAKTER (statlar + güçler), GÖREVLER (günlük görevler + başarımlar), MAĞAZA (kalıcı güçlendirmeler). Açıkken oyun durur (state.userPause).
import { UPGRADES, META } from '../core/config.js';
import { Save } from '../core/save.js';
import { state } from '../game/state.js';
import { derived, buildLevels, upgradeValue } from '../game/PlayerStats.js';
import { progressOf, claimDaily, shopLevel, shopBuy, skillLevel, topRuns } from '../game/Meta.js';
import { Settings } from '../core/settings.js';
import { Audio } from '../core/audio.js';
import { errorCount, errorText, clearErrors } from '../core/errorlog.js';
import { restartTutorial } from './Tutorial.js';

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
  return `<div class="ip-cols"><div class="ip-col">${row('Seviye', p.level)}${row('Can', Math.round(p.hp) + ' / ' + p.maxHp)}${row('Hasar', '×' + s.damageMul.toFixed(2))}${row('Saldırı hızı', '×' + s.attackSpeedMul.toFixed(2))}${row('Kritik şans', pct(s.critChance))}${row('Kritik hasar', '×' + s.critDamage.toFixed(2))}${row('Hareket hızı', '×' + s.moveMul.toFixed(2))}${s.defense ? row('Savunma', pct(s.defense)) : ''}${s.regen ? row('Yenileme', s.regen.toFixed(1) + ' HP/sn') : ''}</div><div class="ip-col"><div class="ip-sub">GÜÇLER ${builds}</div>${owned}${runsHtml()}</div></div>`;
}
function runsHtml() {
  const r = topRuns(); if (!r.length) return '';
  return '<h4>🏆 REKORLAR</h4>' + r.map((x, i) => `<div class="ip-item"><b>#${i + 1}</b><div class="t">${x.score} puan<small>Bölüm ${x.stage}-${x.wave} · ${x.kills} düşman · ${x.bosses} boss · ${x.day}</small></div></div>`).join('');
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

const SK = [['skill1', '⭐ Yıldız Patlaması'], ['skill2', '⚡ Mavi Dalga']];
function skillsHtml() {
  const p = state.player;
  return `<div class="ip-sub">Yetenekleri kristalle geliştir (kalıcı, tüm kahramanlarda geçerli). Cüzdan: 💎 ${p.gems}</div><div class="ip-cols">` + SK.map(([id, name]) => `<div class="ip-col"><h4>${name}</h4>` + META.skills.filter((k) => k.skill === id).map((k) => {
    const lv = skillLevel(k.id), maxed = lv >= k.max, cost = k.cost[lv], can = !maxed && p.gems >= cost;
    return `<div class="ip-item ${maxed ? 'done' : ''}"><i>${k.icon}</i><div class="t"><b>${k.name.split(': ')[1]}</b> <em>${'●'.repeat(lv)}${'○'.repeat(k.max - lv)}</em><small>${k.desc}</small></div>${maxed ? 'MAKS' : `<button class="ip-btn" data-buy="${k.id}" ${can ? '' : 'disabled'}>💎${cost}</button>`}</div>`;
  }).join('') + '</div>').join('') + '</div>';
}

const sw = (k, label) => `<div class="ip-set"><span>${label}</span><button class="ip-switch ${Settings.get(k) ? 'on' : ''}" data-set="${k}">${Settings.get(k) ? 'AÇIK' : 'KAPALI'}</button></div>`;
function settingsHtml() {
  const sh = Settings.get('shake');
  return `<div class="ip-cols"><div class="ip-col">
    <div class="ip-set"><span>🔊 Ses (genel)</span><button class="ip-switch ${Audio.muted ? '' : 'on'}" data-act="mute">${Audio.muted ? 'KAPALI' : 'AÇIK'}</button></div>
    ${sw('music', '🎵 Müzik')}${sw('sfx', '🔔 Efektler')}${sw('vibration', '📳 Titreşim')}
    <div class="ip-set"><span>💢 Ekran sarsıntısı</span><div class="seg">${[[0, 'YOK'], [0.5, 'AZ'], [1, 'TAM']].map(([v, l]) => `<button class="${sh === v ? 'on' : ''}" data-seg="shake:${v}">${l}</button>`).join('')}</div></div>
  </div><div class="ip-col">
    ${sw('lefty', '🖐️ Sol el düzeni')}${sw('bigButtons', '🔘 Büyük düğmeler')}${sw('colorblind', '👁️ Renk körü modu')}${sw('lowFx', '🔋 Düşük efekt (yavaş cihaz)')}
    <div class="ip-set"><span>❓ Öğretici</span><button class="ip-btn" data-act="tutorial">YENİDEN GÖSTER</button></div>
    <div class="ip-set"><span>🐞 Hata günlüğü (${errorCount()})</span><span class="seg"><button class="ip-switch" data-act="copylog">KOPYALA</button><button class="ip-switch" data-act="clearlog">SİL</button></span></div>
  </div></div>`;
}

let el, body, tab = 'stats', tabsEl;
const render = () => { body.innerHTML = tab === 'stats' ? statsHtml() : tab === 'quests' ? questsHtml() : tab === 'shop' ? shopHtml() : tab === 'skills' ? skillsHtml() : settingsHtml(); for (const b of tabsEl.children) b.classList.toggle('on', b.dataset.tab === tab); };
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
    const c = e.target.closest('[data-claim]'), b = e.target.closest('[data-buy]'), t = e.target.closest('[data-set]'), g = e.target.closest('[data-seg]'), a = e.target.closest('[data-act]');
    if (c && claimDaily(c.dataset.claim)) render(); else if (b && shopBuy(b.dataset.buy).ok) render();
    else if (t) { Settings.set(t.dataset.set, !Settings.get(t.dataset.set)); render(); }
    else if (g) { const [k, v] = g.dataset.seg.split(':'); Settings.set(k, +v); render(); }
    else if (a) {
      const act = a.dataset.act;
      if (act === 'mute') { Audio.unlock(); Audio.toggle(); const sb = document.getElementById('btn-sound'); if (sb) sb.textContent = Audio.muted ? '\u{1F507}' : '\u{1F50A}'; render(); }
      else if (act === 'tutorial') { close(); restartTutorial(); }
      else if (act === 'clearlog') { clearErrors(); render(); }
      else if (act === 'copylog') { const txt = errorText(); (navigator.clipboard?.writeText(txt) || Promise.reject()).then(() => { a.textContent = 'KOPYALANDI'; }).catch(() => { prompt('Hata günlüğünü kopyala:', txt); }); }
    }
  });
  el.addEventListener('pointerdown', (e) => { if (e.target === el) close(); });
  addEventListener('keydown', (e) => { if (e.code === 'Escape' && !el.classList.contains('hidden')) close(); else if (e.code === 'KeyI' && !e.repeat) open(); });
}
