// Quest panel: opened from the HUD "Görevler" button on any screen. Claimable quests come first, claimed ones last.
const fmt = (n) => n.toLocaleString('tr-TR');

export function createQuestPanel(root, game, quests, { onClaimed, onWarn }) {
  let open = false;

  const rewardText = (r) => [
    r.gold ? `💰 ${fmt(r.gold)}` : '',
    ...Object.entries(r.ingredients ?? {}).map(([id, n]) => `${game.ingredientsDef[id].icon} ${game.ingredientsDef[id].name} ×${n}`),
  ].filter(Boolean).join(' · ');

  function card(s) {
    const q = s.def, pct = (s.progress / q.target) * 100;
    const state = s.claimed ? 'claimed' : s.complete ? 'ready' : 'todo';
    const btn = s.claimed ? '<button class="go" disabled>✓ Alındı</button>'
      : s.complete ? `<button class="go" data-claim="${q.id}">Ödülü Al</button>`
      : '<button class="go" disabled>Devam ediyor</button>';
    return `<div class="card quest ${state}" data-q="${q.id}">
      <div class="ci">${q.icon}</div>
      <div class="cm">
        <div class="ct"><b>${q.name}</b><span class="muted">${s.progress}/${q.target}</span></div>
        <div class="meta">${q.condition}</div>
        <div class="bar"><i style="width:${pct}%"></i><em>${s.progress}/${q.target}</em></div>
        <div class="meta reward">Ödül: ${rewardText(q.reward)}</div>
      </div>${btn}
    </div>`;
  }

  function render() {
    if (!open) return;
    const prev = root.querySelector('.panel-body')?.scrollTop ?? 0;
    const rank = (s) => (s.claimed ? 2 : s.complete ? 0 : 1);
    const list = quests.list().sort((a, b) => rank(a) - rank(b));
    const done = list.filter((s) => s.claimed).length;
    root.hidden = false;
    root.innerHTML = `<div class="panel-head"><b>Görevler</b><button class="x" aria-label="Kapat">✕</button></div>
      <p class="hint">${done}/${list.length} görev tamamlandı ve ödülü alındı.</p>
      <div class="panel-body">${list.map(card).join('')}</div>`;
    root.querySelector('.panel-body').scrollTop = prev;
  }

  root.addEventListener('click', (e) => {
    if (e.target.closest('.x')) { api.close(); return; }
    const btn = e.target.closest('[data-claim]');
    if (!btn) return;
    const r = quests.claim(btn.dataset.claim);          // a second tap finds the quest already claimed and is refused
    if (r.ok) onClaimed?.(r); else onWarn?.(r.message);
  });
  game.on('change', render);

  const api = {
    get isOpen() { return open; },
    open() { open = true; render(); },
    close() { open = false; root.hidden = true; root.innerHTML = ''; },
    toggle() { open ? api.close() : api.open(); },
  };
  return api;
}
