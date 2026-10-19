// Bottom-left strip in the cafe: crowd counters + one chip per open order. Tapping a chip delivers that order.
// It sits beside the back button, outside the side panels, so production panels never hide customer interaction.
import { formatTime } from '../game/game.js';

export function createOrderBar(root, game, cafe, { onWarn, onSale }) {
  let acc = 0;

  function render() {
    const n = cafe.counts();
    const chips = cafe.customers.filter((c) => c.state === 'seated').map((c) => {
      const o = cafe.orderOf(c), d = game.productsDef[o.product];
      return `<button class="ochip" data-order="${o.id}" data-p="${o.product}" title="${d.name} · ${game.saleIncome(o.price)} altın"><span class="oi">${d.icon}</span><b>${game.saleIncome(o.price)}</b><i class="pb"><u></u></i></button>`;
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
