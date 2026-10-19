// Bookshop screen panel: the research list (levels, prices, current and next bonus). When the Bookshop is not open yet it
// shows the opening conditions instead. Rules live in game/research.js and game/town.js.
const fmt = (n) => n.toLocaleString('tr-TR');

export function createResearchPanel(root, game, research, town, { onBought, onOpened, onWarn }) {
  let open = false;
  const bonusText = (id, level) => research.defs[id].describe(research.defs[id].values[level]);

  function pips(level, max) {
    return `<span class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('')}</span>`;
  }

  function card(id) {
    const d = research.defs[id], lv = research.level(id), max = research.maxLevel(id), st = research.status(id);
    const cost = research.nextCost(id);
    let extra = '', btn;
    if (st === 'max') btn = '<button class="go" disabled>Maksimum</button>';
    else if (st === 'locked') {
      extra = `<div class="meta req no">🔒 Kitapçı gelişimi ${d.bookshopLevel}. seviye gerekli (şu an ${town.level('bookshop')})</div>`;
      btn = '<button class="go lack" disabled>Kilitli</button>';
    } else {
      extra = `<div class="meta next">Sonraki: ${bonusText(id, lv + 1)}</div>`;
      const lack = game.gold < cost;
      btn = `<button class="go buy ${lack ? 'lack' : 'alt'}" data-research="${id}" data-lv="${lv}"><span>Araştır</span><small>💰 ${fmt(cost)}</small></button>`;
    }
    return `<div class="card research ${st}" data-r="${id}">
      <div class="ci">${d.icon}</div>
      <div class="cm">
        <div class="ct"><b>${d.name}</b><span class="muted">Seviye ${lv}/${max}</span></div>
        ${pips(lv, max)}
        <div class="meta bonus">${bonusText(id, lv)}</div>${extra}
      </div>${btn}
    </div>`;
  }

  function closedView() {
    const n = town.need(town.unlocks.bookshop);
    const mark = (ok, t) => `<div class="req ${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${t}</div>`;
    const lack = n.missingGold || n.missingLevel;
    return `<div class="panel-body"><div class="card closed">
      <div class="ci">📚</div>
      <div class="cm"><div class="ct"><b>Kitapçı henüz kapalı</b></div>
        <div class="meta">Açıldığında kalıcı araştırma bonusları sunar.</div>
        <div class="reqs">${mark(!n.missingLevel, `Seviye ${n.minLevel} (şu an ${town.playerLevel})`)}${mark(!n.missingGold, `${fmt(n.gold)} altın`)}</div></div>
      <button class="go buy ${lack ? 'lack' : 'alt'}" data-open-shop><span>Kitapçı'yı Aç</span><small>💰 ${fmt(n.gold)}</small></button>
    </div></div>`;
  }

  function render() {
    if (!open) return;
    const prev = root.querySelector('.panel-body')?.scrollTop ?? 0;
    const isOpen = town.isOpen('bookshop');
    root.hidden = false;
    root.innerHTML = `<div class="panel-head"><b>📚 Araştırma Merkezi</b></div>
      <p class="hint">💰 ${fmt(game.gold)} · Bonuslar kalıcıdır${isOpen ? ` · Kitapçı gelişimi ${town.level('bookshop')}/${town.maxLevel('bookshop')}` : ''}</p>
      ${isOpen ? `<div class="panel-body">${research.ids().map(card).join('')}</div>` : closedView()}`;
    const body = root.querySelector('.panel-body'); if (body) body.scrollTop = prev;
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-research]');
    if (b) { const r = research.buy(b.dataset.research, +b.dataset.lv); if (r.ok) onBought?.(r); else onWarn?.(r.message); return; }
    if (e.target.closest('[data-open-shop]')) { const r = town.open('bookshop'); if (r.ok) onOpened?.(r); else onWarn?.(r.message); }
  });
  game.on('change', render);
  game.on('levelUp', render);

  return {
    show() { open = true; render(); },
    hide() { open = false; root.hidden = true; root.innerHTML = ''; },
  };
}
