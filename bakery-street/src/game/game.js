// Pure game logic for production, stock and gold. No DOM or canvas here, so it can be unit-tested in Node.
import { INGREDIENTS, PRODUCTS, STATIONS, MARKET, UPGRADES } from '../data/economy.js';

const fmtGold = (n) => n.toLocaleString('tr-TR');

/** Lifetime counters that quests read. Persisted with the rest of the game state. */
export function blankStats(productsDef) {
  const per = () => Object.fromEntries(Object.keys(productsDef).map((id) => [id, 0]));
  return { produced: per(), sold: per(), producedTotal: 0, soldTotal: 0, marketPurchases: 0, upgradesBought: 0 };
}

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
    this.upgradesDef = data.upgrades ?? UPGRADES;
    this.stats = blankStats(this.productsDef);
    this.upgrades = Object.fromEntries(Object.keys(this.upgradesDef).map((id) => [id, 0]));   // current level of each upgrade
    this.handledRequests = new Set();   // purchase request ids already applied (guards against a replayed click)
    this.clock = clock;
    this.ingredients = Object.fromEntries(Object.entries(this.ingredientsDef).map(([id, d]) => [id, d.start ?? 0]));
    this.products = Object.fromEntries(Object.entries(this.productsDef).map(([id, d]) => [id, d.start ?? 0]));
    /** station id -> [{ product, startedAt, duration }] while jobs are running (key absent when the station is idle) */
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

  /** Running jobs at a station (oldest first). */
  jobsOf(station) { return this.jobs[station] ?? []; }

  /** Seconds left on one job. */
  remainingOf(job) {
    const elapsed = Math.max(0, (this.clock() - job.startedAt) / 1000);   // a clock set backwards never adds time
    return Math.max(0, job.duration - elapsed);
  }

  /** The job at `station` that finishes first, or null when idle. */
  nextJob(station) {
    let best = null;
    for (const j of this.jobsOf(station)) if (!best || this.remainingOf(j) < this.remainingOf(best)) best = j;
    return best;
  }

  /** Seconds until the next job at `station` finishes (0 when idle). */
  remaining(station) { const j = this.nextJob(station); return j ? this.remainingOf(j) : 0; }

  /** 0..1 progress of the job that finishes first at `station` (0 when idle). */
  progress(station) { const j = this.nextJob(station); return j ? 1 - this.remainingOf(j) / j.duration : 0; }

  // ---- upgrades: effects used by the production rules ------------------------------------------
  maxLevel(id) { return this.upgradesDef[id].costs.length; }
  /** Effect value of an upgrade at its current level (capacity, time multiplier, ...). */
  effect(id) { return this.upgradesDef[id].values[this.upgrades[id]]; }
  /** How many jobs a station can run at the same time. */
  capacity(station) {
    const up = this.stationsDef[station]?.capacityUpgrade;
    return up ? this.effect(up) : 1;
  }
  /** Production time of a product with the current speed upgrade (seconds). */
  duration(id) { return Math.max(1, Math.round(this.productsDef[id].time * this.effect('productionSpeed') * 10) / 10); }
  /** How many finished units of each product the showcase can hold. */
  showcaseLimit() { return this.effect('showcaseCapacity'); }
  /** Units of `id` in stock plus units still being made (these will land in the showcase). */
  committed(id) {
    return this.products[id] + (this.jobs[this.productsDef[id].station] ?? []).filter((j) => j.product === id).length;
  }

  /** Why `id` cannot start right now, or null when it can. */
  blockReason(id) {
    const def = this.productsDef[id];
    if (!def) return { reason: 'unknown', message: 'Bilinmeyen ürün.' };
    const running = this.jobsOf(def.station), cap = this.capacity(def.station), st = this.stationsDef[def.station].name;
    if (running.length >= cap) {
      const next = this.nextJob(def.station), name = this.productsDef[next.product].name;
      return { reason: 'busy', message: cap === 1 ? `${st} meşgul: ${name} hazırlanıyor (${formatTime(this.remainingOf(next))}).` : `${st} dolu (${running.length}/${cap}): sıradaki ${name} ${formatTime(this.remainingOf(next))} sonra biter.` };
    }
    const limit = this.showcaseLimit();
    if (this.committed(id) >= limit) {
      return { reason: 'showcase', message: `Vitrin dolu: ${def.name} ${this.committed(id)}/${limit}. Sat ya da vitrini geliştir.` };
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
    (this.jobs[def.station] ??= []).push({ product: id, startedAt: this.clock(), duration: this.duration(id) });
    this.emit('change', { type: 'start', product: id });
    return { ok: true };
  }

  /** Completes every finished job. Call regularly (each frame); also catches up after a long pause. */
  tick() {
    this.cafe?.tick();
    const now = this.clock();
    for (const station of Object.keys(this.jobs)) {
      const done = [];
      for (const job of this.jobs[station]) {
        if (job.startedAt > now) job.startedAt = now;   // device clock moved backwards: restart the countdown from now, never stall
        if (this.remainingOf(job) <= 0) done.push(job);
      }
      if (!done.length) continue;
      // jobs are removed in the same step their stock is added, so a job can only complete once
      this.jobs[station] = this.jobs[station].filter((j) => !done.includes(j));
      if (!this.jobs[station].length) delete this.jobs[station];
      for (const job of done) {
        this.products[job.product] += 1;
        this.stats.produced[job.product] += 1;
        this.stats.producedTotal += 1;
        this.emit('complete', { station, product: job.product });
        this.emit('change', { type: 'complete', product: job.product });
      }
    }
  }

  // ---- upgrades: buying -------------------------------------------------------------------------
  /** Gold price of the next level, or null at the maximum level. */
  nextCost(id) { const l = this.upgrades[id]; return l >= this.maxLevel(id) ? null : this.upgradesDef[id].costs[l]; }

  /**
   * Buys the next level of an upgrade. `expectedLevel` is the level the player saw when pressing the button: if the level
   * has changed meanwhile (double tap, replayed click) the purchase is refused, so one tap can never buy two levels.
   * Gold is only spent when the purchase succeeds.
   */
  buyUpgrade(id, expectedLevel = null, requestId = null) {
    const bad = (reason, message) => ({ ok: false, reason, message });
    const def = this.upgradesDef[id];
    if (!def) return bad('unknown', 'Bilinmeyen geliştirme.');
    const level = this.upgrades[id];
    if (requestId != null && this.handledRequests.has(requestId)) return bad('duplicate', 'Bu satın alma zaten uygulandı.');
    if (expectedLevel != null && expectedLevel !== level) return bad('stale', `${def.name} zaten seviye ${level}. Satın alma tekrarlanmadı.`);
    if (level >= this.maxLevel(id)) return bad('max', `${def.name} en yüksek seviyede.`);
    const cost = def.costs[level];
    if (this.player.gold < cost) return bad('gold', `Yetersiz altın: ${fmtGold(cost)} gerekli, ${fmtGold(this.player.gold)} var.`);
    this.player.gold -= cost;
    this.upgrades[id] = level + 1;
    this.stats.upgradesBought += 1;
    if (requestId != null) this.handledRequests.add(requestId);
    this.emit('change', { type: 'upgrade', upgrade: id, level: level + 1 });
    return { ok: true, level: level + 1, cost };
  }

  // ---- persistence ----------------------------------------------------------------------------
  /** Plain snapshot of everything that must survive a reload. */
  exportState() {
    return {
      ...(this.cafe ? { cafe: this.cafe.exportState() } : {}),
      gold: this.player.gold,
      ingredients: { ...this.ingredients },
      products: { ...this.products },
      jobs: Object.fromEntries(Object.entries(this.jobs).map(([st, list]) => [st, list.map((j) => ({ product: j.product, startedAt: j.startedAt, duration: j.duration }))])),
      upgrades: { ...this.upgrades },
      stats: JSON.parse(JSON.stringify(this.stats)),
      ...(this.quests ? { quests: this.quests.exportState() } : {}),
    };
  }

  /** Replaces the current state with an already-validated snapshot (see save.js). */
  importState(state) {
    this.player.gold = state.gold;
    this.ingredients = { ...state.ingredients };
    this.products = { ...state.products };
    this.jobs = Object.fromEntries(Object.entries(state.jobs).map(([st, list]) => [st, list.map((j) => ({ ...j }))]));
    this.upgrades = { ...state.upgrades };
    this.stats = JSON.parse(JSON.stringify(state.stats));
    this.quests?.importState(state.quests);
    this.cafe?.importState(state.cafe);
    this.emit('change', { type: 'load' });
  }

  // ---- economy --------------------------------------------------------------------------------
  /** Buys `qty` units of an ingredient with gold. */
  buyIngredient(id, qty = 1, fromMarket = false) {
    const def = this.ingredientsDef[id];
    if (!def || qty < 1) return { ok: false, reason: 'unknown', message: 'Geçersiz satın alma.' };
    const cost = def.price * qty;
    if (this.player.gold < cost) {
      return { ok: false, reason: 'gold', message: `Yetersiz altın: ${fmtGold(cost)} gerekli, ${fmtGold(this.player.gold)} var.` };
    }
    this.player.gold -= cost;
    this.ingredients[id] += qty;
    if (fromMarket) this.stats.marketPurchases += 1;   // counted before the change event, so the autosave includes it
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
    const r = this.buyIngredient(id, qty, true);
    if (r.ok && requestId != null) this.handledRequests.add(requestId);
    return r;
  }

  /** Counts units sold (showcase sales and customer deliveries both call this before their change event). */
  recordSold(id, qty) {
    this.stats.sold[id] += qty;
    this.stats.soldTotal += qty;
  }

  /** Sells `qty` units of a product from the showcase for its sale price. */
  sellProduct(id, qty = 1) {
    const def = this.productsDef[id];
    if (!def || qty < 1) return { ok: false, reason: 'unknown', message: 'Geçersiz satış.' };
    if (this.products[id] < qty) return { ok: false, reason: 'stock', message: `Stokta yeterli ${def.name} yok.` };
    const income = def.price * qty;
    this.products[id] -= qty;
    this.player.gold += income;
    this.recordSold(id, qty);
    this.emit('change', { type: 'sell', product: id, qty });
    return { ok: true, income };
  }
}

/** 75 -> "1:15" */
export function formatTime(seconds) {
  const s = Math.ceil(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
