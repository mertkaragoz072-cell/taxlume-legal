// Side panel for the cafe interior: production recipes, showcase (sell) and storeroom (buy ingredients).
// Structure is rebuilt when game state changes; timers and progress bars are updated in place every few frames,
// so buttons are never replaced under the player's finger.
import { BUY_AMOUNTS } from '../data/economy.js';
import { formatTime } from '../game/game.js';

const fmt = (n) => n.toLocaleString('tr-TR');

export function createPanels(root, game, { onWarn, onClose }) {
  let current = null;          // panel id currently shown
  let acc = 0;

  const title = { oven: 'Fırın', coffee: 'Kahve Makinesi', counter: 'Üretim Tezgâhı', showcase: 'Satış Vitrini', storage: 'Depo · Malzeme Al' };
  const hint = {
    oven: 'Hamur işlerini fırında pişir. Fırın aynı anda tek ürün hazırlar.',
    coffee: 'Kahve makinesi aynı anda tek kahve hazırlar.',
    counter: 'Tüm ürünlerin tarifleri. Üretim ilgili makinede başlar.',
    showcase: 'Hazır ürünlerini satarak altın kazan.',
    storage: 'Üretim için malzeme satın al.',
  };

  function productsFor(id) {
    const all = Object.entries(game.productsDef);
    return id === 'counter' ? all : all.filter(([, d]) => d.station === id);
  }

  function renderProducts(id) {
    return productsFor(id).map(([pid, d]) => {
      const chips = Object.entries(d.ingredients).map(([ing, need]) => {
        const def = game.ingredientsDef[ing], have = game.ingredients[ing];
        return `<span class="chip ${have >= need ? 'ok' : 'bad'}" data-ing="${ing}" data-need="${need}">${def.icon} ${def.name} ${need} <small>(${have})</small></span>`;
      }).join('');
      return `<div class="card" data-p="${pid}">
        <div class="ci">${d.icon}</div>
        <div class="cm">
          <div class="ct"><b>${d.name}</b><span class="muted">Stok: <i>${game.products[pid]}</i></span></div>
          <div class="ing">${chips}</div>
          <div class="meta">⏱ ${formatTime(d.time)} · 💰 ${fmt(d.price)} · <span class="muted">${game.stationsDef[d.station].name}</span></div>
          <div class="bar" data-bar="${pid}" hidden><i></i><em></em></div>
        </div>
        <button class="go" data-make="${pid}">Üret</button>
      </div>`;
    }).join('');
  }

  function renderShowcase() {
    const rows = Object.entries(game.productsDef).map(([pid, d]) => {
      const n = game.products[pid];
      return `<div class="card" data-p="${pid}">
        <div class="ci">${d.icon}</div>
        <div class="cm"><div class="ct"><b>${d.name}</b><span class="muted">Stok: <i>${n}</i></span></div><div class="meta">💰 ${fmt(d.price)} / adet</div></div>
        <div class="btns"><button class="go sm" data-sell="${pid}" data-qty="1">Sat</button><button class="go sm alt" data-sell="${pid}" data-qty="all">Hepsi</button></div>
      </div>`;
    }).join('');
    return rows;
  }

  function renderStorage() {
    return Object.entries(game.ingredientsDef).map(([id, d]) => `<div class="card" data-i="${id}">
      <div class="ci">${d.icon}</div>
      <div class="cm"><div class="ct"><b>${d.name}</b><span class="muted">Stok: <i>${game.ingredients[id]}</i></span></div><div class="meta">💰 ${fmt(d.price)} / adet</div></div>
      <div class="btns">${BUY_AMOUNTS.map((q) => `<button class="go sm" data-buy="${id}" data-qty="${q}">+${q}<small>${fmt(d.price * q)}</small></button>`).join('')}</div>
    </div>`).join('');
  }

  function render() {
    if (!current) { root.hidden = true; root.innerHTML = ''; return; }
    const body = current === 'showcase' ? renderShowcase() : current === 'storage' ? renderStorage() : renderProducts(current);
    root.hidden = false;
    root.innerHTML = `<div class="panel-head"><b>${title[current]}</b><button class="x" aria-label="Kapat">✕</button></div>
      <p class="hint">${hint[current]}</p><div class="panel-body">${body}</div>`;
    update(true);
  }

  /** Updates timers, bars and the "busy" button state without touching the DOM structure. */
  function update(force = false) {
    if (!current) return;
    for (const card of root.querySelectorAll('.card[data-p]')) {
      const pid = card.dataset.p, d = game.productsDef[pid];
      const bar = card.querySelector('.bar'), btn = card.querySelector('.go[data-make]');
      if (!bar || !btn) continue;
      const job = game.jobs[d.station], mine = job?.product === pid;
      bar.hidden = !mine;
      if (mine) { bar.firstElementChild.style.width = `${game.progress(d.station) * 100}%`; bar.lastElementChild.textContent = `Kalan: ${formatTime(game.remaining(d.station))}`; }
      btn.classList.toggle('busy', !!job);
      btn.classList.toggle('lack', !job && game.missingFor(pid).length > 0);
      btn.textContent = mine ? 'Hazırlanıyor' : job ? 'Meşgul' : 'Üret';
    }
  }

  root.addEventListener('click', (e) => {
    if (e.target.closest('.x')) { close(); return; }
    const make = e.target.closest('[data-make]');
    if (make) { const r = game.startProduction(make.dataset.make); if (!r.ok) onWarn(r.message); return; }
    const buy = e.target.closest('[data-buy]');
    if (buy) { const r = game.buyIngredient(buy.dataset.buy, +buy.dataset.qty); if (!r.ok) onWarn(r.message); return; }
    const sell = e.target.closest('[data-sell]');
    if (sell) {
      const pid = sell.dataset.sell, qty = sell.dataset.qty === 'all' ? game.products[pid] : +sell.dataset.qty;
      const r = game.sellProduct(pid, qty || 1); if (!r.ok) onWarn(r.message);
    }
  });
  game.on('change', () => { if (current) render(); });

  function open(id, side = 'right') { current = id; root.dataset.side = side; render(); }
  function close() { current = null; render(); onClose?.(); }

  return {
    open, close,
    get current() { return current; },
    /** Call each frame with dt in seconds; refreshes timers ~5x per second. */
    tick(dt) { acc += dt; if (acc > 0.2) { acc = 0; update(); } },
  };
}
