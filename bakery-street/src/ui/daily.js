// Daily reward panel: the 7-day cycle, today's claim button and a plain explanation of the missed-day rule.
const fmt = (n) => n.toLocaleString('tr-TR');

/** '💰 200 · 💎 5 · 🌾 ×6' */
export const formatReward = (game, r) => [
  r.gold ? `💰 ${fmt(r.gold)}` : '',
  r.gems ? `💎 ${r.gems}` : '',
  ...Object.entries(r.ingredients ?? {}).map(([id, n]) => `${game.ingredientsDef[id].icon} ×${n}`),
].filter(Boolean).join(' · ');

export function createDailyPanel(root, game, daily, { onClaimed, onWarn }) {
  let open = false;

  const rewardText = (r) => formatReward(game, r);

  function render() {
    if (!open) return;
    const prev = root.querySelector('.panel-body')?.scrollTop ?? 0;
    const s = daily.status(), n = daily.defs.length;
    // days before today's reward count as collected only while the streak continues
    const doneUpTo = s.claimedToday ? s.streak : s.nextDay > 1 ? s.nextDay - 1 : 0;
    const cards = daily.defs.map((r, i) => {
      const day = i + 1;
      const state = day <= doneUpTo ? 'done' : day === s.nextDay && !s.claimedToday ? 'today' : 'todo';
      return `<div class="card day ${state}"><div class="ci">${state === 'done' ? '✅' : '🎁'}</div>
        <div class="cm"><div class="ct"><b>Gün ${day}</b><span class="muted">${state === 'done' ? 'Alındı' : state === 'today' ? 'Bugün' : ''}</span></div><div class="meta reward">${rewardText(r)}</div></div></div>`;
    }).join('');
    const info = s.claimedToday ? `Bugünün ödülü alındı. Yarın: Gün ${s.nextDay}.`
      : s.streakBroken ? `Bir günü kaçırdın, seri Gün 1'den yeniden başlıyor.`
      : `Bugünün ödülü: Gün ${s.nextDay}/${n}.`;
    root.hidden = false;
    root.innerHTML = `<div class="panel-head"><b>Günlük Ödül</b><button class="x" aria-label="Kapat">✕</button></div>
      <p class="hint">${info}<br>Her gün gir, seri sürsün. Bir günü kaçırırsan seri 1. günden başlar.</p>
      <div class="panel-body">
        <button class="go claim-day" data-daily ${s.canClaim ? '' : 'disabled'}>${s.canClaim ? `Ödülü Al · Gün ${s.nextDay}` : 'Bugün alındı'}</button>
        ${cards}
      </div>`;
    root.querySelector('.panel-body').scrollTop = prev;
  }

  root.addEventListener('click', (e) => {
    if (e.target.closest('.x')) { api.close(); return; }
    if (!e.target.closest('[data-daily]')) return;
    const r = daily.claim();                       // refused on the same day, so a double tap gives one reward
    if (r.ok) onClaimed?.(r); else onWarn?.(r.message);
  });
  game.on('change', render);

  const api = {
    get isOpen() { return open; },
    open() { open = true; render(); },
    close() { open = false; root.hidden = true; root.innerHTML = ''; },
    toggle() { open ? api.close() : api.open(); },
    refresh: render,
  };
  return api;
}
