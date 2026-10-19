// Pure game logic for production, stock and gold. No DOM or canvas here, so it can be unit-tested in Node.
import { INGREDIENTS, PRODUCTS, STATIONS, MARKET } from '../data/economy.js';

const fmtGold = (n) => n.toLocaleString('tr-TR');

export class Game {
  /**
   * @param {{gold:number}} player   shared player object (its `gold` is read and written here)
   * @param {{ingredients?:object, products?:object, stations?:object}} [data]  override tables (used by tests)
   * @param {() => number} [clock]   wall-clock milliseconds (Date.now) so progress survives reloads and time away; inject a fake one in tests
   */
  constructor(player, data = {}, clock = () => Date.now()) {
    this.player = player;
    this.ingredientsDef = data.ingredients ?? INGREDIENTS;
    this.productsDef = data.products ?? PRODUCTS;
    this.stationsDef = data.stations ?? STATIONS;
    this.marketDef = data.market ?? MARKET;
    this.handledRequests = new Set();   // purchase request ids already applied (guards against a replayed click)
    this.clock = clock;
    this.ingredients = Object.fromEntries(Object.entries(this.ingredientsDef).map(([id, d]) => [id, d.start ?? 0]));
    this.products = Object.fromEntries(Object.entries(this.productsDef).map(([id, d]) => [id, d.start ?? 0]));
    /** station id -> { product, startedAt, duration } while a job is running */
    this.jobs = {};
    this.listeners = {};
  }

  // ---- events ---------------------------------------------------------------------------------
  on(event, fn) { (this.listeners[event] ??= []).push(fn); return () => { this.listeners[event] = this.listeners[event].filter((f) => f !== fn); }; }
  emit(event, payload) { for (const fn of this.listeners[event] ?? []) fn(payload); }

  get gold() { return this.player.gold; }

  // ---- production -----------------------------------------------------------------------------
  /** Ingredients still missing for one unit of `id`: [{ id, need, have }] (empty when producible). */
  missingFor(id) {
    const def = this.productsDef[id];
    return Object.entries(def.ingredients)
      .filter(([ing, need]) => this.ingredients[ing] < need)
      .map(([ing, need]) => ({ id: ing, need, have: this.ingredients[ing] }));
  }

  /** Seconds left on the job at `station`, or 0 when idle. */
  remaining(station) {
    const job = this.jobs[station];
    if (!job) return 0;
    const elapsed = Math.max(0, (this.clock() - job.startedAt) / 1000);   // a clock set backwards never adds time
    return Math.max(0, job.duration - elapsed);
  }

  /** 0..1 progress of the job at `station` (0 when idle). */
  progress(station) {
    const job = this.jobs[station];
    return job ? 1 - this.remaining(station) / job.duration : 0;
  }

  /** Why `id` cannot start right now, or null when it can. */
  blockReason(id) {
    const def = this.productsDef[id];
    if (!def) return { reason: 'unknown', message: 'Bilinmeyen ürün.' };
    const job = this.jobs[def.station];
    if (job) {
      const busy = this.productsDef[job.product].name, st = this.stationsDef[def.station].name;
      return { reason: 'busy', message: `${st} meşgul: ${busy} hazırlanıyor (${formatTime(this.remaining(def.station))}).` };
    }
    const missing = this.missingFor(id);
    if (missing.length) {
      const list = missing.map((m) => `${m.need - m.have} ${this.ingredientsDef[m.id].name}`).join(', ');
      return { reason: 'ingredients', missing, message: `Yetersiz malzeme: ${list} eksik.` };
    }
    return null;
  }

  /** Starts production of one unit. Ingredients are consumed immediately; the product arrives in stock when the timer ends. */
  startProduction(id) {
    const block = this.blockReason(id);
    if (block) return { ok: false, ...block };
    const def = this.productsDef[id];
    for (const [ing, need] of Object.entries(def.ingredients)) this.ingredients[ing] -= need;
    this.jobs[def.station] = { product: id, startedAt: this.clock(), duration: def.time };
    this.emit('change', { type: 'start', product: id });
    return { ok: true };
  }

  /** Completes every finished job. Call regularly (each frame); also catches up after a long pause. */
  tick() {
    this.cafe?.tick();
    const now = this.clock();
    for (const [station, job] of Object.entries(this.jobs)) {
      if (job.startedAt > now) job.startedAt = now;   // device clock moved backwards: restart the countdown from now, never stall
      if (this.remaining(station) > 0) continue;
      delete this.jobs[station];   // removed in the same step as the stock is added, so a job can only complete once
      this.products[job.product] += 1;
      this.emit('complete', { station, product: job.product });
      this.emit('change', { type: 'complete', product: job.product });
    }
  }

  // ---- persistence ----------------------------------------------------------------------------
  /** Plain snapshot of everything that must survive a reload. */
  exportState() {
    return {
      ...(this.cafe ? { cafe: this.cafe.exportState() } : {}),
      gold: this.player.gold,
      ingredients: { ...this.ingredients },
      products: { ...this.products },
      jobs: Object.fromEntries(Object.entries(this.jobs).map(([st, j]) => [st, { product: j.product, startedAt: j.startedAt }])),
    };
  }

  /** Replaces the current state with an already-validated snapshot (see save.js). */
  importState(state) {
    this.player.gold = state.gold;
    this.ingredients = { ...state.ingredients };
    this.products = { ...state.products };
    this.jobs = Object.fromEntries(Object.entries(state.jobs).map(([st, j]) => [st, { product: j.product, startedAt: j.startedAt, duration: this.productsDef[j.product].time }]));
    this.cafe?.importState(state.cafe);
    this.emit('change', { type: 'load' });
  }

  // ---- economy --------------------------------------------------------------------------------
  /** Buys `qty` units of an ingredient with gold. */
  buyIngredient(id, qty = 1) {
    const def = this.ingredientsDef[id];
    if (!def || qty < 1) return { ok: false, reason: 'unknown', message: 'Geçersiz satın alma.' };
    const cost = def.price * qty;
    if (this.player.gold < cost) {
      return { ok: false, reason: 'gold', message: `Yetersiz altın: ${fmtGold(cost)} gerekli, ${fmtGold(this.player.gold)} var.` };
    }
    this.player.gold -= cost;
    this.ingredients[id] += qty;
    this.emit('change', { type: 'buy', ingredient: id, qty });
    return { ok: true, cost };
  }

  /** How many units of an ingredient the player can afford right now. */
  maxAffordable(id) {
    const def = this.ingredientsDef[id];
    return def ? Math.floor(this.player.gold / def.price) : 0;
  }

  /**
   * Market purchase: validates, then applies gold -cost and stock +qty in one step on the single shared inventory
   * (`this.ingredients`, the same object production consumes from). `requestId` makes a replayed request a no-op.
   */
  purchase(id, qty, requestId = null) {
    const bad = (reason, message) => ({ ok: false, reason, message });
    if (!this.ingredientsDef[id] || !this.marketDef.items.includes(id)) return bad('notsold', 'Bu ürün Market\'te satılmıyor.');
    if (!Number.isInteger(qty) || qty < 1 || qty > this.marketDef.maxPerPurchase) return bad('qty', `Miktar 1 ile ${this.marketDef.maxPerPurchase} arasında olmalı.`);
    if (requestId != null) {
      if (this.handledRequests.has(requestId)) return bad('duplicate', 'Bu satın alma zaten uygulandı.');
      if (this.handledRequests.size > 200) this.handledRequests.clear();
    }
    const r = this.buyIngredient(id, qty);
    if (r.ok && requestId != null) this.handledRequests.add(requestId);
    return r;
  }

  /** Sells `qty` units of a product from the showcase for its sale price. */
  sellProduct(id, qty = 1) {
    const def = this.productsDef[id];
    if (!def || qty < 1) return { ok: false, reason: 'unknown', message: 'Geçersiz satış.' };
    if (this.products[id] < qty) return { ok: false, reason: 'stock', message: `Stokta yeterli ${def.name} yok.` };
    const income = def.price * qty;
    this.products[id] -= qty;
    this.player.gold += income;
    this.emit('change', { type: 'sell', product: id, qty });
    return { ok: true, income };
  }
}

/** 75 -> "1:15" */
export function formatTime(seconds) {
  const s = Math.ceil(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
