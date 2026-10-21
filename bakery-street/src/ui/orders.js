// Bottom-left strip in the cafe: crowd counters + one chip per product that guests are waiting for (icon, ×guests, real stock).
// It sits beside the back button, outside the side panels, so production panels never hide customer interaction.
import { formatTime } from '../game/game.js';

export function createOrderBar(root, game, cafe, { onWarn, onSale }) {
  let acc = 0;

  function render() {
    const n = cafe.counts();
    // one chip per product with open orders (not one per guest): icon, how many guests wait for it, and the real stock of that product.
    // Tapping delivers the most urgent order (least patience left) of that product.
    const groups = new Map();
    for (const c of cafe.customers.filter((x) => x.state === 'seated')) {
      const o = cafe.orderOf(c); if (!o || o.status !== 'open') continue;
      const g = groups.get(o.product) ?? { product: o.product, orders: [] };
      g.orders.push({ o, f: cafe.patienceFraction(c) }); groups.set(o.product, g);
    }
    const chips = [...groups.values()].map((g) => {
      const d = game.productsDef[g.product], urgent = g.orders.reduce((a, b) => (b.f < a.f ? b : a)), stock = game.products[g.product];
      const price = game.saleIncome(urgent.o.price).toLocaleString('tr-TR');
      return `<button class="ochip" data-order="${urgent.o.id}" data-p="${g.product}" title="${d.name} · ${price} altın · stokta ${stock}"><span class="oi">${d.icon}</span>${g.orders.length > 1 ? `<em>×${g.orders.length}</em>` : ''}<b>stok ${stock}</b><i class="pb"><u></u></i></button>`;
    }).join('');
    root.innerHTML = `<div class="ostat" title="Müşteri · bekleyen · açık sipariş" aria-label="${n.customers} müşteri, ${n.queued} bekleyen, ${n.openOrders} sipariş"><span>👥 ${n.customers}</span><span>⏳ ${n.queued}</span><span>🧾 ${n.openOrders}</span></div>${chips}`;
    update();
  }

  /** In-place refresh of patience bars and the "no stock" state (never replaces buttons). */
  function update() {
    for (const chip of root.querySelectorAll('.ochip')) {
      const o = cafe.orders.find((x) => x.id === +chip.dataset.order);
      const c = o && cafe.customers.find((x) => x.id === o.customerId);
      if (!c) continue;
      chip.classList.toggle('lack', game.products[o.product] < 1);
      chip.querySelector("b").textContent = `stok ${game.products[o.product]}`;
      chip.querySelector('u').style.width = `${cafe.patienceFraction(c) * 100}%`;
    }
  }

  root.addEventListener('click', (e) => {
    const chip = e.target.closest('.ochip'); if (!chip) return;
    const r = cafe.deliver(+chip.dataset.order);
    if (r.ok) onSale?.(r); else onWarn(r.message);
  });
  game.on('change', render);
  render();
  return { tick(dt) { acc += dt; if (acc > 0.2) { acc = 0; update(); } }, render };
}
