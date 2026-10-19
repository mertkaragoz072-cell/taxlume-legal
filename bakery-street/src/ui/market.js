// Market shopping list: price, current stock, quantity stepper and a buy button for each ingredient.
// Stock shown here is the same inventory production uses (game.ingredients); buying goes through game.purchase.
import { formatTime } from '../game/game.js';

const fmt = (n) => n.toLocaleString('tr-TR');

export function createMarketPanel(root, game, { onWarn, onBought }) {
  const qty = {};                         // chosen quantity per ingredient (kept across re-renders)
  let open = false, lockUntil = 0, seq = 0;
  const max = game.marketDef.maxPerPurchase;
  const getQty = (id) => qty[id] ?? 1;

  const usedBy = (id) => Object.entries(game.productsDef).filter(([, p]) => id in p.ingredients).map(([, p]) => `${p.icon}${p.ingredients[id]}`).join(' ');

  function card(id) {
    const d = game.ingredientsDef[id], q = getQty(id), total = d.price * q;
    return `<div class="card" data-i="${id}">
      <div class="ci">${d.icon}</div>
      <div class="cm">
        <div class="ct"><b>${d.name}</b><span class="muted">Stok: <i data-stock>${game.ingredients[id]}</i></span></div>
        <div class="meta">💰 ${fmt(d.price)} / adet</div>
        <div class="meta muted">Tarif: ${usedBy(id)}</div>
        <div class="qty">
          <button class="qb" data-act="dec" aria-label="Azalt">−</button>
          <span class="qv" data-qty>${q}</span>
          <button class="qb" data-act="inc" aria-label="Artır">+</button>
          ${game.marketDef.quantities.map((n) => `<button class="qb pre" data-act="set" data-n="${n}">${n}</button>`).join('')}
        </div>
      </div>
      <button class="go buy" data-act="buy"><span>Satın Al</span><small data-total>💰 ${fmt(total)}</small></button>
    </div>`;
  }

  function render() {
    if (!open) return;
    const prev = root.querySelector('.panel-body')?.scrollTop ?? 0;
    root.hidden = false;
    root.innerHTML = `<div class="panel-head"><b>Market</b><span class="muted gold">💰 <i data-gold>${fmt(game.gold)}</i></span></div>
      <p class="hint">Malzemeleri burada al; üretim aynı envanteri kullanır.</p>
      <div class="panel-body">${game.marketDef.items.map(card).join('')}</div>`;
    root.querySelector('.panel-body').scrollTop = prev;
    update();
  }

  /** Cheap in-place refresh: totals and the "not enough gold" colour. */
  function update() {
    for (const el of root.querySelectorAll('.card[data-i]')) {
      const id = el.dataset.i, total = game.ingredientsDef[id].price * getQty(id);
      el.querySelector('[data-qty]').textContent = getQty(id);
      el.querySelector('[data-total]').textContent = `💰 ${fmt(total)}`;
      el.querySelector('.buy').classList.toggle('lack', total > game.gold);
    }
  }

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const id = btn.closest('.card').dataset.i, act = btn.dataset.act;
    if (act === 'inc') { qty[id] = Math.min(max, getQty(id) + 1); update(); }
    else if (act === 'dec') { qty[id] = Math.max(1, getQty(id) - 1); update(); }
    else if (act === 'set') { qty[id] = +btn.dataset.n; update(); }
    else if (act === 'buy') {
      const now = Date.now();
      if (now < lockUntil) return;                     // ignore a double tap: one tap, one purchase
      lockUntil = now + 450;
      const r = game.purchase(id, getQty(id), `ui-${++seq}-${now}`);
      if (r.ok) onBought?.(id, getQty(id), r.cost); else onWarn(r.message);
    }
  });
  game.on('change', render);

  return {
    show() { open = true; render(); },
    hide() { open = false; root.hidden = true; root.innerHTML = ''; },
  };
}
