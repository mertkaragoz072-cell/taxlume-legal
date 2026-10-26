// Pure game logic for production, stock and gold. No DOM or canvas here, so it can be unit-tested in Node.
import { INGREDIENTS, PRODUCTS, STATIONS, MARKET, UPGRADES, SALES } from '../data/economy.js';

const fmtGold = (n) => n.toLocaleString('tr-TR');

/** Lifetime counters that quests read. Persisted with the rest of the game state. */
export function blankStats(productsDef) {
  const per = () => Object.fromEntries(Object.keys(productsDef).map((id) => [id, 0]));
  return { produced: per(), sold: per(), producedTotal: 0, soldTotal: 0, marketPurchases: 0, upgradesBought: 0, researchBought: 0, explorationsDone: 0, buildingsOpened: 0, buildingUpgrades: 0, goldSpent: 0, goldEarned: 0, shopBought: 0 };
}

export class Game {
  /**
   * @param {{gold:number}} player   shared player object (its `gold` is read and written here)
   * @param {{ingredients?:object, products?:object, stations?:object}} [data]  override tables (used by tests)
   * @param {() => number} [clock]   wall-clock milliseconds (Date.now) so progress survives reloads and time away; inject a fake one in tests
   */
  constructor(player, data = {}, clock = () => Date.now()) {
    this.player = player;
    this.initial = { gold: player.gold, gems: player.gems ?? 0 };   // starting values, used by resetState()
    this.ingredientsDef = data.ingredients ?? INGREDIENTS;
    this.productsDef = data.products ?? PRODUCTS;
    this.stationsDef = data.stations ?? STATIONS;
    this.marketDef = data.market ?? MARKET;
    this.upgradesDef = data.upgrades ?? UPGRADES;
    this.sales = data.sales ?? SALES;
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

  /**
   * The ONE place gold is paid out (café upgrades, ingredients, town, research, shop all call it): refuses what the player cannot afford and
   * counts the lifetime gold spent (stage conditions read it). Returns true when the gold was taken.
   */
  spend(amount, label = '') {
    if (!Number.isFinite(amount) || amount < 0 || this.player.gold < amount) return false;
    this.player.gold -= amount;
    this.stats.goldSpent += amount;
    if (amount > 0) this.record(-amount, 'spend', label);
    return true;
  }

  /**
   * The ONE place gold is paid in: sales, tips, showcase sales, ingredient refunds, quest / daily / exploration / level / stage rewards.
   * Whole, finite, positive amounts only (anything else is ignored), counted in stats.goldEarned and written to the ledger. Returns what was paid.
   */
  earn(amount, source = 'other', label = '') {
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1e9) return 0;
    amount = Math.floor(amount);
    this.player.gold += amount;
    this.stats.goldEarned += amount;
    this.record(amount, source, label);
    return amount;
  }

  /** The last gold movements (newest first, memory only): { t, delta, source, label }. */
  record(delta, source, label) {
    (this.ledger ??= []).unshift({ t: this.clock(), delta, source, label });
    if (this.ledger.length > 40) this.ledger.length = 40;
  }

  /** Adds a product after construction (the Shop registers its recipes this way): stock, statistics and the product table follow. */
  registerProduct(id, def) {
    if (this.productsDef[id]) return;
    this.productsDef = { ...this.productsDef, [id]: def };            // a copy: the shared table of the module is never touched
    this.products[id] = def.start ?? 0;
    this.stats.produced[id] ??= 0;
    this.stats.sold[id] ??= 0;
  }

  /** False for a shop recipe the player has not bought yet (every product is unlocked when there is no shop). */
  isUnlocked(id) { return !this.shop || this.shop.recipeUnlocked(id); }

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
    return (up ? this.effect(up) : 1) + (this.shop?.capacityBonus(station) ?? 0);    // + the better coffee machines
  }
  /** The most jobs a station could ever run (a save is checked against it). */
  maxCapacity(station) {
    const up = this.stationsDef[station]?.capacityUpgrade;
    return (up ? Math.max(...this.upgradesDef[up].values) : 1) + (this.shop?.maxCapacityBonus(station) ?? 0);
  }
  /** Production time of a product with the current speed upgrade (seconds). */
  duration(id) { return Math.max(1, Math.round(this.productsDef[id].time * this.effect('productionSpeed') * (1 - this.bonus('productionTime')) * (1 - (this.shop?.speedBonus(this.productsDef[id].station) ?? 0)) * 10) / 10); }   // upgrade x research x equipment: three separate sources, each applied once

  // ---- research bonuses (src/game/research.js): each one is applied in exactly one place below -------------------
  /** Current bonus fraction of a research effect (0 when there is no research system or nothing bought). */
  bonus(effect) { return this.research?.bonus(effect) ?? 0; }
  /** Gold earned by one customer order whose base price is `base` (Usta Satıcı). */
  saleIncome(base) { return Math.round(base * (1 + this.bonus('saleIncome'))); }
  /** Gold value of the ingredients one unit of `id` consumes (from the single INGREDIENTS price list). */
  ingredientCost(id) {
    return Object.entries(this.productsDef[id].ingredients).reduce((sum, [ing, n]) => sum + n * this.ingredientsDef[ing].price, 0);
  }
  /**
   * The one place where price, ingredient cost and research bonuses meet for a product. Every number is a whole gold amount.
   *  customer / showcase : gold from one sale (the Usta Satıcı bonus is applied once, inside saleIncome)
   *  cost                : ingredient value after the Verimli Üretim refund (what one unit really costs)
   *  customerNet / showcaseNet : income minus that cost; the showcase keeps SALES.showcaseNetShare of the customer's net
   * `basePrice` lets a customer order keep the price it was created with.
   */
  unitEconomics(id, basePrice = this.productsDef[id].price) {
    const cost = this.ingredientCost(id) - this.ingredientRebate(id);
    const customer = this.saleIncome(basePrice), customerNet = customer - cost;
    const showcase = customer - Math.max(0, Math.round(customerNet * (1 - this.sales.showcaseNetShare)));
    return { cost, customer, customerNet, showcase, showcaseNet: showcase - cost };
  }
  /** Gold earned by selling one unit of `id` straight from the showcase. */
  showcaseIncome(id) { return this.unitEconomics(id).showcase; }

  /** Gold refunded when starting `id`: the Verimli Üretim share of the ingredient value, rounded to the nearest gold (never above the cost). */
  ingredientRebate(id) {
    const b = this.bonus('ingredientCost') + (this.shop?.refundBonus() ?? 0), value = this.ingredientCost(id);     // research + the prep counter: one sum, applied here only
    return b ? Math.min(value, Math.round(value * b)) : 0;
  }
  /** How many finished units of each product the showcase can hold. */
  showcaseLimit() { return this.effect('showcaseCapacity') + (this.shop?.showcaseBonus() ?? 0); }
  /** Units of each ingredient the storeroom can hold (unlimited until the Shop exists). */
  ingredientCap() { return this.shop ? this.shop.ingredientCap() : Infinity; }
  /** Units of `id` in stock plus units still being made (these will land in the showcase). */
  committed(id) {
    return this.products[id] + (this.jobs[this.productsDef[id].station] ?? []).filter((j) => j.product === id).length;
  }

  /** Why `id` cannot start right now, or null when it can. */
  blockReason(id) {
    const def = this.productsDef[id];
    if (!def) return { reason: 'unknown', message: 'Bilinmeyen ürün.' };
    if (!this.isUnlocked(id)) return { reason: 'locked', message: `${def.name} tarifi henüz açılmadı. Mağazadan satın al.` };
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
    const rebate = this.ingredientRebate(id);
    if (rebate) this.earn(rebate, 'rebate', `${def.name}: malzeme iadesi`);
    (this.jobs[def.station] ??= []).push({ product: id, startedAt: this.clock(), duration: this.duration(id) });
    this.emit('change', { type: 'start', product: id, rebate });
    return rebate ? { ok: true, rebate } : { ok: true };
  }

  /** Completes every finished job. Call regularly (each frame); also catches up after a long pause. */
  tick() {
    this.cafe?.tick();
    this.exploration?.tick();
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
        this.progression?.award('produce', job.product);
        this.emit('complete', { station, product: job.product });
        this.emit('change', { type: 'complete', product: job.product });
      }
    }
  }

  // ---- upgrades: buying -------------------------------------------------------------------------
  /** Gold price of the next level, or null at the maximum level. */
  nextCost(id) {
    const l = this.upgrades[id];
    return l >= this.maxLevel(id) ? null : Math.round(this.upgradesDef[id].costs[l] * (1 - this.bonus('upgradeCost')));   // Usta Ekipmanları
  }

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
    const needLevel = def.minLevels?.[level];
    if (needLevel && this.progression && this.progression.level < needLevel) return bad('level', `${def.name} için Seviye ${needLevel} gerekli (şu an ${this.progression.level}).`);
    const cost = this.nextCost(id);
    if (this.player.gold < cost) return bad('gold', `Yetersiz altın: ${fmtGold(cost)} gerekli, ${fmtGold(this.player.gold)} var.`);
    this.spend(cost, def.name);
    this.upgrades[id] = level + 1;
    this.stats.upgradesBought += 1;
    this.progression?.award('upgrade', level + 1);   // XP grows with the upgrade level bought
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
      gems: this.player.gems ?? 0,
      ingredients: { ...this.ingredients },
      products: { ...this.products },
      jobs: Object.fromEntries(Object.entries(this.jobs).map(([st, list]) => [st, list.map((j) => ({ product: j.product, startedAt: j.startedAt, duration: j.duration }))])),
      upgrades: { ...this.upgrades },
      stats: JSON.parse(JSON.stringify(this.stats)),
      ...(this.quests ? { quests: this.quests.exportState() } : {}),
      ...(this.daily ? { daily: this.daily.exportState() } : {}),
      ...(this.progression ? { progression: this.progression.exportState() } : {}),
      ...(this.town ? { town: this.town.exportState() } : {}),
      ...(this.research ? { research: this.research.exportState() } : {}),
      ...(this.exploration ? { exploration: this.exploration.exportState() } : {}),
      ...(this.shop ? { shop: this.shop.exportState() } : {}),
    };
  }

  /** Replaces the current state with an already-validated snapshot (see save.js). */
  importState(state) {
    this.player.gold = state.gold;
    this.player.gems = state.gems ?? this.initial.gems;
    this.ingredients = { ...state.ingredients };
    this.products = { ...state.products };
    this.jobs = Object.fromEntries(Object.entries(state.jobs).map(([st, list]) => [st, list.map((j) => ({ ...j }))]));
    this.upgrades = { ...state.upgrades };
    this.stats = JSON.parse(JSON.stringify(state.stats));
    this.quests?.importState(state.quests);
    this.daily?.importState(state.daily);
    this.progression?.importState(state.progression);
    this.town?.importState(state.town);
    this.research?.importState(state.research);
    this.exploration?.importState(state.exploration);
    this.shop?.importState(state.shop);
    this.cafe?.importState(state.cafe);
    this.emit('change', { type: 'load' });
  }

  /** A brand-new game state (same shape as a validated save). Used by the confirmed progress reset. */
  defaultState() {
    return {
      gold: this.initial.gold,
      gems: this.initial.gems,
      ingredients: Object.fromEntries(Object.entries(this.ingredientsDef).map(([id, d]) => [id, d.start ?? 0])),
      products: Object.fromEntries(Object.entries(this.productsDef).map(([id, d]) => [id, d.start ?? 0])),
      jobs: {},
      upgrades: Object.fromEntries(Object.keys(this.upgradesDef).map((id) => [id, 0])),
      stats: blankStats(this.productsDef),
      quests: { claimed: [] },
      daily: { lastDate: null, day: 0 },
      progression: { level: 1, xp: 0, rewardedLevel: 1 },
      town: { opened: [], levels: {} },
      research: { levels: {} },
      exploration: { active: null, done: {} },
      shop: { owned: [], placed: {}, stored: [], introduced: [], stage: 1 },
    };
  }

  // ---- economy --------------------------------------------------------------------------------
  /** Buys `qty` units of an ingredient with gold. */
  buyIngredient(id, qty = 1, fromMarket = false) {
    const def = this.ingredientsDef[id];
    if (!def || !Number.isSafeInteger(qty) || qty < 1) return { ok: false, reason: 'unknown', message: 'Geçersiz satın alma.' };
    const cost = def.price * qty;
    const room = this.ingredientCap() - this.ingredients[id];
    if (qty > room) return { ok: false, reason: 'storage', message: room > 0 ? `Depoda ${def.name} için ${room} adetlik yer var. Depoyu genişlet.` : `Depo dolu: ${def.name} ${this.ingredients[id]}/${this.ingredientCap()}. Depoyu genişlet.` };
    if (!this.spend(cost, `${def.name} ×${qty}`)) {
      return { ok: false, reason: 'gold', message: `Yetersiz altın: ${fmtGold(cost)} gerekli, ${fmtGold(this.player.gold)} var.` };
    }
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
    this.progression?.award('sale', id, qty);
  }

  /** Sells `qty` units of a product from the showcase for its sale price. */
  sellProduct(id, qty = 1) {
    const def = this.productsDef[id];
    if (!def || !Number.isSafeInteger(qty) || qty < 1) return { ok: false, reason: 'unknown', message: 'Geçersiz satış.' };
    if (this.products[id] < qty) return { ok: false, reason: 'stock', message: `Stokta yeterli ${def.name} yok.` };
    const income = this.showcaseIncome(id) * qty;
    this.products[id] -= qty;
    this.earn(income, 'showcase', `${def.name} ×${qty} vitrinden satıldı`);
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
