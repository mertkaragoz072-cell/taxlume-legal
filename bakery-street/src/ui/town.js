// Town screen: every business and building plot with its state (open / available / locked), its conditions and cost.
// Opened by the "Kasaba" menu button or by tapping the Bookshop on the street. Purely DOM; all rules live in game/town.js.
const fmt = (n) => n.toLocaleString('tr-TR');
const LABEL = { open: 'Açık', available: 'Açılabilir', locked: 'Kilitli' };

export function createTownPanel(root, game, town, { onVisit, onOpened, onDeveloped, onWarn, onClose }) {
  let isOpen = false;

  const req = (ok, text) => `<div class="req ${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${text}</div>`;

  function reqs(n) {
    return req(!n.missingLevel, `Seviye ${n.minLevel} (şu an ${town.playerLevel})`) + req(!n.missingGold, `${fmt(n.gold)} altın`);
  }

  function card(s) {
    const d = s.def, id = d.id;
    let body = '', btn = '';
    if (s.status === 'open') {
      body = `<div class="meta">${d.note}</div>`;
      if (d.starter) btn = `<button class="go" data-visit="${d.scene}">Git</button>`;
      else {
        const lv = s.level, max = s.maxLevel;
        const stepName = lv ? d.levels[lv - 1] : 'Yeni açıldı';
        body += `<div class="meta">Gelişim: <b>${lv}/${max}</b> · ${stepName}</div>`;
        if (s.next) {
          const lack = s.next.missingGold || s.next.missingLevel;
          body += `<div class="reqs">${reqs(s.next)}</div>`;
          btn = `<button class="go buy${lack ? ' lack' : ' alt'}" data-develop="${id}" data-lv="${lv}">Geliştir<small>${d.levels[lv]}</small></button>`;
        } else btn = '<button class="go" disabled>✓ Tamamlandı</button>';
        btn = `<div class="btns col"><button class="go" data-visit="${d.scene ?? id}">Git</button>${btn}</div>`;
      }
    } else if (d.comingSoon) {
      body = `<div class="meta">${d.note}</div>`;
      btn = '<button class="go" disabled>Yakında</button>';
    } else {
      const n = s.unlock;
      body = `<div class="meta">${d.note}</div><div class="reqs">${reqs(n)}</div>`;
      const reward = town.rewards[id]?.open?.xp;
      if (reward) body += `<div class="meta reward">Açılış ödülü: ✨ ${reward} XP</div>`;
      btn = s.status === 'locked'
        ? `<button class="go lack" data-open="${id}">🔒 Kilitli</button>`
        : `<button class="go buy${n.missingGold ? ' lack' : ' alt'}" data-open="${id}">Aç<small>💰 ${fmt(n.gold)}</small></button>`;
      if (id === 'bookshop') btn = `<div class="btns col"><button class="go" data-visit="bookshop">Görüntüle</button>${btn}</div>`;
    }
    return `<div class="card town ${s.status}" data-b="${id}">
      <div class="ci">${d.icon}</div>
      <div class="cm"><div class="ct"><b>${d.name}</b><span class="tag ${s.status}">${LABEL[s.status]}</span></div>${body}</div>${btn}
    </div>`;
  }

  function render() {
    if (!isOpen) return;
    const prev = root.querySelector('.panel-body')?.scrollTop ?? 0;
    const list = town.list();
    const open = list.filter((s) => s.status === 'open').length;
    root.hidden = false;
    root.innerHTML = `<div class="panel-head"><b>Kasaba</b><button class="x" aria-label="Kapat">✕</button></div>
      <p class="hint">${open}/${list.length} bina açık · Seviye ${town.playerLevel} · 💰 ${fmt(game.gold)}</p>
      <div class="panel-body">${list.map(card).join('')}</div>`;
    root.querySelector('.panel-body').scrollTop = prev;
  }

  root.addEventListener('click', (e) => {
    if (e.target.closest('.x')) { api.close(); return; }
    const visit = e.target.closest('[data-visit]');
    if (visit) { api.close(); onVisit?.(visit.dataset.visit); return; }
    const o = e.target.closest('[data-open]');
    if (o) { const r = town.open(o.dataset.open); if (r.ok) onOpened?.(r); else onWarn?.(r.message); return; }
    const dv = e.target.closest('[data-develop]');
    if (dv) { const r = town.develop(dv.dataset.develop, +dv.dataset.lv); if (r.ok) onDeveloped?.(r); else onWarn?.(r.message); }
  });
  game.on('change', render);
  game.on('levelUp', render);

  const api = {
    get isOpen() { return isOpen; },
    open() { isOpen = true; render(); },
    close() { const was = isOpen; isOpen = false; root.hidden = true; root.innerHTML = ''; if (was) onClose?.(); },
  };
  return api;
}
