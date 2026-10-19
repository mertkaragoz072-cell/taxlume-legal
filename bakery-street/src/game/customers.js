// Customers, tables and orders. Pure logic (no DOM); time comes from the Game clock so it is testable.
//
// Model: a customer is 'queued' (outside, waiting for a table) or 'seated' (at a table with exactly one open order).
// Table occupancy is derived from seated customers, so two customers can never share a table.
// Every sale is one synchronous commit (stock, gold, order status, customer removal), so an order can be paid only once.
import { CAFE } from '../data/economy.js';

export const LOOKS = ['boy_backpack', 'girl_basket', 'oldman', 'boy_cap', 'girl_hat', 'girl_red', 'grandma'];
const ms = (s) => Math.round(s * 1000);
const isId = (n) => Number.isInteger(n) && n > 0 && n < 1e12;

export class Cafe {
  /**
   * @param {import('./game.js').Game} game
   * @param {{rng?:()=>number, config?:object, looks?:string[]}} [opts]
   */
  constructor(game, { rng = Math.random, config = CAFE, looks = LOOKS } = {}) {
    this.game = game;
    this.cfg = config;
    this.rng = rng;
    this.looks = looks;
    this.last = null;
    this.active = false;        // the cafe only runs while the interior is open (see setActive)
    game.cafe = this;
    this.reset();
  }

  reset() {
    this.nextId = 1;
    this.customers = [];
    this.orders = [];
    this.spawnIn = ms(this.cfg.firstSpawnSec);
  }

  // ---- queries --------------------------------------------------------------------------------
  tableOwner(index) { return this.customers.find((c) => c.state === 'seated' && c.table === index) ?? null; }
  freeTables() { return Array.from({ length: this.cfg.tables }, (_, i) => i).filter((i) => !this.tableOwner(i)); }
  queued() { return this.customers.filter((c) => c.state === 'queued').sort((a, b) => a.id - b.id); }
  orderOf(c) { return c.orderId ? this.orders.find((o) => o.id === c.orderId) ?? null : null; }
  openOrders() { return this.orders.filter((o) => o.status === 'open'); }
  counts() {
    const seated = this.customers.filter((c) => c.state === 'seated').length;
    return { customers: this.customers.length, seated, queued: this.customers.length - seated, openOrders: this.openOrders().length };
  }
  /** 1 = just arrived, 0 = about to leave. */
  patienceFraction(c) {
    const max = ms(c.state === 'queued' ? this.cfg.queuePatienceSec : this.cfg.orderPatienceSec);
    return Math.max(0, Math.min(1, c.patience / max));
  }

  // ---- simulation -----------------------------------------------------------------------------
  /**
   * Customers only arrive, wait and lose patience while the player is inside the cafe. Pausing freezes every timer
   * (arrivals, order patience); resuming continues from exactly where it stopped, with no catch-up and no burst of customers.
   */
  setActive(on) {
    if (this.active === !!on) return;
    this.active = !!on;
    this.last = null;           // the next tick starts a fresh interval, so time spent away is never counted
  }

  /** Advance the cafe by real elapsed time (capped per step). Call every frame; cheap when nothing happens. */
  tick() {
    if (!this.active) { this.last = null; return; }
    const now = this.game.clock();
    const dt = this.last == null ? 0 : Math.min(Math.max(0, now - this.last), ms(this.cfg.maxStepSec));
    this.last = now;
    if (!dt) return;
    let changed = false;
    for (const c of [...this.customers]) {
      c.patience -= dt;
      if (c.patience <= 0) { this.leave(c, false); changed = true; }
    }
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.spawnIn = this.nextInterval();
      if (this.queued().length < this.cfg.queueMax) { this.arrive(); changed = true; }
    }
    if (this.seatQueued()) changed = true;
    if (changed) this.game.emit('change', { type: 'cafe' });
  }

  nextInterval() {
    const [a, b] = this.cfg.spawnEverySec;
    return ms(a + this.rng() * (b - a));
  }

  arrive() {
    const c = { id: this.nextId++, look: this.looks[Math.floor(this.rng() * this.looks.length)], state: 'queued', table: null, orderId: null, patience: ms(this.cfg.queuePatienceSec) };
    this.customers.push(c);
    this.game.emit('customer', { type: 'arrive', id: c.id });
    return c;
  }

  /** Seats waiting customers at free tables (first come, first served) and lets them order. Returns true if anyone sat. */
  seatQueued() {
    let seated = false;
    const free = this.freeTables();
    for (const c of this.queued()) {
      if (!free.length) break;
      c.state = 'seated';
      c.table = free.shift();
      c.orderId = this.makeOrder(c).id;
      c.patience = ms(this.cfg.orderPatienceSec);
      this.game.emit('customer', { type: 'seat', id: c.id, table: c.table });
      seated = true;
    }
    return seated;
  }

  makeOrder(c) {
    const ids = Object.keys(this.game.productsDef);
    const weights = ids.map((id) => Math.max(0, this.cfg.orderWeights?.[id] ?? 1));
    let r = this.rng() * weights.reduce((s, w) => s + w, 0), product = ids[ids.length - 1];
    for (let i = 0; i < ids.length; i++) { r -= weights[i]; if (r < 0) { product = ids[i]; break; } }
    const order = { id: this.nextId++, product, price: this.game.productsDef[product].price, status: 'open', customerId: c.id };
    this.orders.push(order);
    this.trimOrders();
    return order;
  }

  trimOrders() {
    const closed = this.orders.filter((o) => o.status !== 'open');
    const drop = closed.length - this.cfg.history;
    if (drop > 0) { const gone = new Set(closed.slice(0, drop)); this.orders = this.orders.filter((o) => !gone.has(o)); }
  }

  /** Customer walks out. Unhappy leavers (patience ran out) cancel their open order and pay nothing. */
  leave(c, happy) {
    const order = this.orderOf(c);
    if (order && order.status === 'open') order.status = 'cancelled';
    this.customers = this.customers.filter((x) => x !== c);
    this.game.emit('customer', { type: 'leave', id: c.id, happy, table: c.table });
  }

  // ---- sales ----------------------------------------------------------------------------------
  /** Delivers the product of `orderId`. One atomic step: stock -1, gold +price, order paid, customer leaves, table freed. */
  deliver(orderId) {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) return fail('unknown', 'Sipariş bulunamadı.');
    if (order.status !== 'open') return fail('closed', 'Bu sipariş zaten kapandı.');
    const c = this.customers.find((x) => x.id === order.customerId && x.orderId === order.id);
    if (!c) { order.status = 'cancelled'; return fail('closed', 'Müşteri ayrılmış.'); }
    const def = this.game.productsDef[order.product];
    if (this.game.products[order.product] < 1) return fail('stock', `Stokta ${def.name} yok. Önce üret.`);
    this.game.products[order.product] -= 1;
    this.game.player.gold += order.price;
    this.game.recordSold(order.product, 1);
    order.status = 'paid';
    this.customers = this.customers.filter((x) => x !== c);
    this.game.emit('customer', { type: 'leave', id: c.id, happy: true, table: c.table, income: order.price, product: order.product });
    this.seatQueued();
    this.game.emit('change', { type: 'sale', product: order.product, price: order.price });
    return { ok: true, income: order.price, product: order.product, orderId: order.id, customerId: c.id };
  }

  deliverToCustomer(customerId) {
    const c = this.customers.find((x) => x.id === customerId);
    if (!c || !c.orderId) return fail('unknown', 'Bu müşterinin siparişi yok.');
    return this.deliver(c.orderId);
  }

  // ---- persistence ----------------------------------------------------------------------------
  exportState() {
    return {
      nextId: this.nextId,
      customers: this.customers.map((c) => ({ id: c.id, look: c.look, state: c.state, table: c.table, orderId: c.orderId, patience: Math.round(c.patience) })),
      orders: this.orders.map((o) => ({ id: o.id, product: o.product, price: o.price, status: o.status, customerId: o.customerId })),
    };
  }

  /** Replaces cafe state with an already-sanitized snapshot (see validateCafe). Nothing runs while the app is closed. */
  importState(state) {
    if (!state) { this.reset(); return; }
    this.nextId = state.nextId;
    this.customers = state.customers.map((c) => ({ ...c }));
    this.orders = state.orders.map((o) => ({ ...o }));
    this.spawnIn = this.nextInterval();
    this.last = null;                // elapsed time while the app was closed is never counted as waiting time
  }
}

const fail = (reason, message) => ({ ok: false, reason, message });

/**
 * Turns saved cafe data into a consistent state. Never throws: problems are repaired and counted in `repaired`.
 * Rules: unknown products / bad numbers are dropped; every seated customer needs a unique valid table and exactly one
 * open order (otherwise they go back to the queue); open orders without a seated owner are cancelled; paid or cancelled
 * orders can no longer have a waiting customer; crowd size is capped.
 */
export function validateCafe(raw, game, cfg = CAFE, looks = LOOKS) {
  let repaired = 0;
  const empty = { state: { nextId: 1, customers: [], orders: [] }, repaired: 0 };
  if (raw == null) return empty;
  if (typeof raw !== 'object' || Array.isArray(raw)) return { ...empty, repaired: 1 };
  const statuses = ['open', 'paid', 'cancelled'];

  const orders = [], orderIds = new Set();
  for (const o of Array.isArray(raw.orders) ? raw.orders : []) {
    if (!o || !isId(o.id) || orderIds.has(o.id) || !game.productsDef[o.product] || !Number.isInteger(o.price) || o.price < 0 || !isId(o.customerId)) { repaired++; continue; }
    let status = o.status;
    if (!statuses.includes(status)) { status = 'cancelled'; repaired++; }
    orderIds.add(o.id);
    orders.push({ id: o.id, product: o.product, price: o.price, status, customerId: o.customerId });
  }

  const customers = [], custIds = new Set(), usedTables = new Set(), claimed = new Set();
  const maxCrowd = cfg.tables + cfg.queueMax;
  for (const c of Array.isArray(raw.customers) ? raw.customers : []) {
    if (!c || !isId(c.id) || custIds.has(c.id) || customers.length >= maxCrowd) { repaired++; continue; }
    const look = looks.includes(c.look) ? c.look : looks[0];
    if (look !== c.look) repaired++;
    const max = (state) => Math.round((state === 'queued' ? cfg.queuePatienceSec : cfg.orderPatienceSec) * 1000);
    let state = c.state === 'seated' ? 'seated' : 'queued';
    if (c.state !== 'seated' && c.state !== 'queued') repaired++;
    let table = null, orderId = null;
    if (state === 'seated') {
      const order = orders.find((o) => o.id === c.orderId);
      const tableOk = Number.isInteger(c.table) && c.table >= 0 && c.table < cfg.tables && !usedTables.has(c.table);
      if (tableOk && order && order.status === 'open' && order.customerId === c.id && !claimed.has(order.id)) {
        table = c.table; orderId = order.id; usedTables.add(table); claimed.add(order.id);
      } else { state = 'queued'; repaired++; }
    }
    const patience = Number.isFinite(c.patience) && c.patience > 0 ? Math.min(c.patience, max(state)) : max(state);
    custIds.add(c.id);
    customers.push({ id: c.id, look, state, table, orderId, patience });
  }
  // queue overflow is trimmed in arrival order
  const queued = customers.filter((c) => c.state === 'queued');
  for (const c of queued.slice(cfg.queueMax)) { customers.splice(customers.indexOf(c), 1); repaired++; }
  // open orders must belong to a seated customer that references them
  for (const o of orders) {
    if (o.status === 'open' && !customers.some((c) => c.state === 'seated' && c.orderId === o.id)) { o.status = 'cancelled'; repaired++; }
  }
  const maxId = Math.max(0, ...customers.map((c) => c.id), ...orders.map((o) => o.id));
  const nextId = isId(raw.nextId) && raw.nextId > maxId ? raw.nextId : maxId + 1;
  const history = orders.filter((o) => o.status !== 'open').slice(-cfg.history);
  return { state: { nextId, customers, orders: [...orders.filter((o) => o.status === 'open'), ...history].sort((a, b) => a.id - b.id) }, repaired };
}
