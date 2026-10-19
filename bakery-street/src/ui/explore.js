// Exploration panel (right half of the Keşif screen): one card per region with its description, level requirement,
// duration and possible rewards. The active region shows the remaining time and progress; a finished trip shows its reward
// summary and a collect button. Countdown text is refreshed from the system clock every frame, never from a stored counter.
import { formatDuration } from '../game/exploration.js';

const fmt = (n) => n.toLocaleString('tr-TR');
const range = ([a, b]) => (a === b ? fmt(a) : `${fmt(a)}–${fmt(b)}`);

export function createExplorePanel(root, game, ex, { onStarted, onClaimed, onWarn, onSelect }) {
  let open = false, selected = null;

  function possible(d) {
    const rw = d.rewards;
    const parts = [`💰 ${range(rw.gold)}`, `✨ ${range(rw.xp)} XP`];
    for (const i of rw.ingredients ?? []) parts.push(`${game.ingredientsDef[i.id].icon} ${range(i.amount)}${i.chance < 1 ? ` <small>(%${Math.round(i.chance * 100)})</small>` : ''}`);
    if (rw.gems) parts.push(`💎 ${range(rw.gems.amount)} <small>(nadir, %${Math.round(rw.gems.chance * 100)})</small>`);
    return parts.join(' · ');
  }
  function earned(r) {
    const parts = [];
    if (r.gold) parts.push(`💰 ${fmt(r.gold)}`);
    if (r.xp) parts.push(`✨ ${fmt(r.xp)} XP`);
    for (const [id, n] of Object.entries(r.ingredients)) parts.push(`${game.ingredientsDef[id].icon} ×${n}`);
    if (r.gems) parts.push(`💎 ${r.gems}`);
    return parts.join(' · ');
  }

  function card(s) {
    const d = s.def, st = s.status, a = ex.active;
    let body = `<div class="meta">${d.desc}</div>
      <div class="meta">⏱ ${formatDuration(d.duration)} · Seviye ${d.minLevel}${d.after ? ` · önce ${ex.region(d.after.region).name}` : ''}${s.done ? ` · ${s.done}× tamamlandı` : ''}</div>`;
    let btn;
    if (st === 'locked') {
      body += `<div class="reqs">${s.missing.map((m) => `<span class="req no">✗ ${m}</span>`).join('')}</div>`;
      btn = '<button class="go" disabled>🔒 Kilitli</button>';
    } else if (st === 'active') {
      body += `<div class="bar"><i data-xbar style="width:${ex.progress() * 100}%"></i></div><div class="meta"><b data-xleft>${formatDuration(ex.remaining())}</b> kaldı</div>`;
      btn = '<button class="go" disabled>Keşifte…</button>';
    } else if (st === 'ready') {
      body += `<div class="meta reward">🎁 Ödül: ${earned(a.reward)}</div>`;
      btn = `<button class="go alt" data-claim="${a.id}">Ödülü Al</button>`;
    } else {
      body += `<div class="meta reward">Olası ödüller: ${possible(d)}</div>`;
      btn = st === 'busy' ? '<button class="go" disabled>Başka keşif sürüyor</button>' : `<button class="go alt" data-start="${d.id}">Keşfe Çık</button>`;
    }
    return `<div class="card explore ${st}${selected === d.id ? ' sel' : ''}" data-r="${d.id}">
      <div class="ci">${d.icon}</div><div class="cm"><div class="ct"><b>${d.name}</b><span class="muted">${{ locked: 'Kilitli', available: 'Açık', busy: 'Açık', active: 'Keşifte', ready: 'Tamamlandı' }[st]}</span></div>${body}</div>${btn}
    </div>`;
  }

  function render() {
    if (!open) return;
    const prev = root.querySelector('.panel-body')?.scrollTop ?? 0;
    const list = ex.list();
    root.hidden = false;
    root.innerHTML = `<div class="panel-head"><b>🧭 Keşif</b></div>
      <p class="hint">Aynı anda bir keşif · süre gerçek zamanlı, oyun kapalıyken de ilerler</p>
      <div class="panel-body">${list.map(card).join('')}</div>`;
    root.querySelector('.panel-body').scrollTop = prev;
    if (selected) root.querySelector(`[data-r=${selected}]`)?.scrollIntoView({ block: 'nearest' });
  }

  root.addEventListener('click', (e) => {
    const s = e.target.closest('[data-start]');
    if (s) { const r = ex.start(s.dataset.start); if (r.ok) onStarted?.(r); else onWarn?.(r.message); return; }
    const c = e.target.closest('[data-claim]');
    if (c) { const r = ex.claim(+c.dataset.claim); if (r.ok) onClaimed?.(r); else onWarn?.(r.message); return; }
    const card = e.target.closest('.card[data-r]');
    if (card) onSelect?.(card.dataset.r);
  });
  game.on('change', render);
  game.on('exploreReady', render);
  game.on('levelUp', render);
  let lastStatus = '';

  return {
    show() { open = true; lastStatus = ''; render(); },
    hide() { open = false; root.hidden = true; root.innerHTML = ''; },
    select(id) { selected = id; render(); },
    /** Per-frame: live countdown from the system clock; re-render when the trip finishes. */
    tick() {
      if (!open) return;
      const st = ex.active ? (ex.isReady() ? 'ready' : 'active') : 'none';
      if (st !== lastStatus) { lastStatus = st; render(); return; }
      if (st === 'active') {
        const left = root.querySelector('[data-xleft]'), bar = root.querySelector('[data-xbar]');
        if (left) left.textContent = formatDuration(ex.remaining());
        if (bar) bar.style.width = `${ex.progress() * 100}%`;
      }
    },
  };
}
