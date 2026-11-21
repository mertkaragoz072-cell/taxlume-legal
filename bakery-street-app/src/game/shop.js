// The shop: equipment tiers, furniture and decoration, recipes, café expansion and special content, all bought with gold.
// This module owns what the player has bought and where it is placed, checks every purchase and applies its effects to the rules through a few
// small queries (speedBonus, capacityBonus, showcaseBonus, refundBonus, ingredientCap, queueBonus, vip, appeal ...) that Game / Cafe call.
// A purchase is one atomic step: checks -> gold (Game.spend) -> owned + placed -> XP -> one 'change' event; if anything in it throws, gold and
// state are restored. Prices, gates and effects come only from data/economy.js.
import { CAFE } from '../data/economy.js';
import { SHOP_ITEMS, SHOP_CATEGORIES, SHARED_SLOTS, DECOR_SLOT_TYPES, STAGES, STORAGE, RECIPES, APPEAL, ITEM_LEVELS, RECIPE_LEVELS, COLLECTIONS } from '../data/economy.js';

const fmt = (n) => n.toLocaleString('tr-TR');

export class Shop {
  /** @param {import('./game.js').Game} game */
  constructor(game, { items = SHOP_ITEMS, stages = STAGES, recipes = RECIPES, storage = STORAGE, appeal = APPEAL } = {}) {
    this.game = game;
    this.items = items;
    this.stages = stages;
    this.recipes = recipes;
    this.storage = storage;
    this.appealDef = appeal;
    this.owned = new Set();        // item ids bought
    this.placed = {};              // slot -> item id (decoration that is standing in the café)
    this.stored = new Set();       // decoration bought but not standing anywhere (taken down, or no free slot): gives no appeal until it is placed
    this.parts = {};               // table sets: how many tables are already one level above the set's level (they are raised one table at a time)
    this.levels = {};              // decoration id -> its level (2..5); an owned piece without an entry is level 1
    this.recipeLevels = {};        // product id -> its recipe level (2..5); a product without an entry is level 1
    this.collections = new Set();  // collection rewards already paid: '<group>:owned' / '<group>:max'
    this.introduced = new Set();   // equipment items whose first-use introduction has played
    this.stageId = 1;              // highest stage reached (its reward is paid when it is reached, never again)
    this.stats = { lastGoal: null };
    game.shop = this;
    for (const [id, def] of Object.entries(recipes)) game.registerProduct(id, def);
    game.on('change', (e) => {
      if (!e || e.type === 'load' || e.type === 'shopIntro') return;
      this.checkStage();
      if (e.type === 'shop') this.checkCollections();
      if (e.type === 'start') { this.introduce(game.productsDef[e.product]?.station); this.introduce('counter'); }   // first use of a better oven / machine / prep counter
      else if (e.type === 'sale' || e.type === 'sell') this.introduce('showcase');
      else if (e.type === 'buy') this.introduce('storage');
    });
  }

  // ---- catalogue ------------------------------------------------------------------------------
  def(id) { return this.items.find((i) => i.id === id) ?? null; }
  categories() { return SHOP_CATEGORIES.filter((c) => c.id !== 'ingredients'); }
  get playerLevel() { return this.game.progression?.level ?? 1; }
  has(id) {
    const d = this.def(id);
    if (!d) return false;
    return d.kind === 'upgrade' ? (this.game.upgrades[d.upgrade] ?? 0) >= d.level : this.owned.has(id);
  }
  /** Gold price now (café upgrade items follow the upgrade price, which includes the Usta Ekipmanları discount). */
  priceOf(id) {
    const d = this.def(id);
    if (!d) return null;
    if (d.kind === 'upgrade') return this.game.upgrades[d.upgrade] + 1 === d.level ? this.game.nextCost(d.upgrade) : this.game.upgradesDef[d.upgrade].costs[d.level - 1];
    return d.price;
  }
  ownedCount() { return this.items.filter((d) => d.kind !== 'upgrade' && this.owned.has(d.id)).length; }

  // ---- gates ----------------------------------------------------------------------------------
  /** Minimum player level of an item (café upgrade items use the upgrade's own gate). */
  minLevelOf(d) { return d.kind === 'upgrade' ? this.game.upgradesDef[d.upgrade].minLevels?.[d.level - 1] ?? 1 : d.minLevel ?? 1; }

  /** Everything between the player and this item: [{ kind, ok, text }]. Empty `missing` = buyable (except gold). */
  conditions(id) {
    const d = this.def(id), out = [];
    const lv = this.minLevelOf(d);
    if (lv > 1) out.push({ kind: 'level', ok: this.playerLevel >= lv, text: `Seviye ${lv}` });
    if (d.stage && d.stage > 1) out.push({ kind: 'stage', ok: this.stageId >= d.stage, text: `Aşama ${d.stage}: ${this.stages[d.stage - 1]?.name ?? ''}` });
    for (const r of d.requires ?? []) {
      if (r.item) out.push({ kind: 'item', ok: this.has(r.item), text: this.def(r.item)?.name ?? r.item });
      else if (r.upgrade) out.push({ kind: 'upgrade', ok: (this.game.upgrades[r.upgrade] ?? 0) >= r.level, text: `${this.game.upgradesDef[r.upgrade].name} ${r.level}. seviye` });
    }
    if (d.kind === 'upgrade' && (this.game.upgrades[d.upgrade] ?? 0) < d.level - 1) out.push({ kind: 'item', ok: false, text: `${this.def(this.previousUpgradeItem(d))?.name ?? 'Önceki masa'}` });
    return out;
  }
  previousUpgradeItem(d) { return this.items.find((i) => i.kind === 'upgrade' && i.upgrade === d.upgrade && i.level === d.level - 1)?.id; }

  /** 'owned' | 'ready' (can be bought with enough gold) | 'locked' (a condition is missing). */
  status(id) {
    if (this.has(id)) return 'owned';
    return this.conditions(id).every((c) => c.ok) ? 'ready' : 'locked';
  }

  /** What the UI needs for one card. */
  view(id) {
    const d = this.def(id), status = this.status(id), price = this.priceOf(id), gold = this.game.player.gold;
    const conds = this.conditions(id);
    return { def: d, status, price, missingGold: status === 'ready' || status === 'locked' ? Math.max(0, price - gold) : 0, conditions: conds, missing: conds.filter((c) => !c.ok), effectText: describeEffect(d, this.game), placed: this.isPlaced(id), slot: this.slotOf(id) };
  }
  list(category) { return this.items.filter((d) => d.category === category).map((d) => this.view(d.id)); }

  /** Human text of why an item cannot be bought now, or null. */
  blockReason(id) {
    const d = this.def(id);
    if (!d) return { reason: 'unknown', message: 'Ürün bulunamadı.' };
    if (this.has(id)) return { reason: 'owned', message: `${d.name} zaten alındı.` };
    const miss = this.conditions(id).filter((c) => !c.ok);
    if (miss.length) return { reason: miss[0].kind === 'level' ? 'level' : 'locked', message: `${d.name} için gerekli: ${miss.map((m) => m.text).join(' · ')}.` };
    const price = this.priceOf(id), gold = this.game.player.gold;
    if (gold < price) return { reason: 'gold', message: `${fmt(price - gold)} altın eksik (${fmt(price)} gerekli, ${fmt(gold)} var).` };
    return null;
  }

  // ---- buying ---------------------------------------------------------------------------------
  /**
   * Buys an item. The checks and the money are decided here at the moment of the purchase (not when the card was drawn), and a purchase that
   * is replayed (same requestId) or already owned is refused, so one tap can never charge twice.
   */
  buy(id, requestId = null) {
    const g = this.game, d = this.def(id);
    const fail = (reason, message) => ({ ok: false, reason, message });
    if (!d) return fail('unknown', 'Ürün bulunamadı.');
    if (requestId != null && g.handledRequests.has(requestId)) return fail('duplicate', 'Bu satın alma zaten uygulandı.');
    if (d.kind === 'upgrade') return this.buyUpgradeItem(d, requestId);
    const block = this.blockReason(id);
    if (block) return fail(block.reason, block.message);
    const price = d.price;
    const snap = { gold: g.player.gold, spent: g.stats.goldSpent, bought: g.stats.shopBought, ledger: [...(g.ledger ?? [])], owned: new Set(this.owned), placed: { ...this.placed }, stored: new Set(this.stored) };
    try {
      if (!g.spend(price, d.name)) return fail('gold', `${fmt(price - g.player.gold)} altın eksik (${fmt(price)} gerekli, ${fmt(g.player.gold)} var).`);
      this.owned.add(id);
      if (d.type) this.autoPlace(d);
      g.stats.shopBought += 1;
      g.progression?.gain(this.xpFor(d));
    } catch (err) {                                              // nothing half-done: the gold comes back and the item is not owned
      g.player.gold = snap.gold; g.stats.goldSpent = snap.spent; g.stats.shopBought = snap.bought; g.ledger = snap.ledger;
      this.owned = snap.owned; this.placed = snap.placed; this.stored = snap.stored;
      return fail('error', 'Satın alma tamamlanamadı; altın düşülmedi.');
    }
    if (requestId != null) { if (g.handledRequests.size > 200) g.handledRequests.clear(); g.handledRequests.add(requestId); }
    g.emit('shop', { item: d });
    g.emit('change', { type: 'shop', item: id });
    return { ok: true, cost: price, item: d, xp: this.xpFor(d) };
  }

  /** Café upgrade items are bought through the upgrade itself (one price list, one gate, one save). */
  buyUpgradeItem(d, requestId) {
    const g = this.game;
    const level = g.upgrades[d.upgrade];
    if (level >= d.level) return { ok: false, reason: 'owned', message: `${d.name} zaten alındı.` };
    if (level < d.level - 1) return { ok: false, reason: 'locked', message: `Önce ${this.def(this.previousUpgradeItem(d))?.name ?? 'önceki seviyeyi'} al.` };
    const r = g.buyUpgrade(d.upgrade, level, requestId);
    if (!r.ok) return r;
    g.emit('shop', { item: d });
    return { ok: true, cost: r.cost, item: d, xp: g.progression?.xpFor('upgrade', r.level) ?? 0 };
  }

  // ---- decoration levels (ITEM_LEVELS) ------------------------------------------------------------
  /** True for pieces that level up (furniture and decoration of the Dekorasyon tab). */
  levelable(d) { return !!d && d.category === 'decor' && d.kind === 'decor'; }
  /** The level of an owned piece (1..5), 0 when not owned. */
  itemLevel(id) { return this.owned.has(id) ? this.levels[id] ?? 1 : 0; }
  /** Appeal of a piece at a level. */
  appealAt(d, level) { return Math.round((d.appeal ?? 0) * (ITEM_LEVELS.appeal[Math.max(1, level) - 1] ?? 1)); }
  /**
   * The next level of an owned piece: { level, cost, needLevel, appeal, ok, missingGold, reason } or null at the top / when it does not level.
   */
  /** How many steps one level takes: a table set is raised one table at a time (every table of the café), anything else in one step. */
  stepsOf(d) { return d?.type === 'tabletop' ? CAFE.tables : 1; }
  /** Tables of a set already at the next level (0 when the whole set is at one level). */
  partOf(id) { return this.parts[id] ?? 0; }
  /** The level table `i` (0-based) of a set shows: the raised tables come first. */
  tableLevel(id, i) { const lv = this.itemLevel(id); return lv && i < this.partOf(id) ? lv + 1 : lv; }
  /** Appeal of a piece as it stands now (a half-raised table set counts its raised tables). */
  appealNow(d) {
    const lv = this.itemLevel(d.id), steps = this.stepsOf(d), part = this.partOf(d.id);
    if (!part || lv >= ITEM_LEVELS.max) return this.appealAt(d, lv);
    return Math.round(this.appealAt(d, lv) + (this.appealAt(d, lv + 1) - this.appealAt(d, lv)) * part / steps);
  }

  nextLevel(id) {
    const d = this.def(id);
    if (!this.levelable(d) || !this.owned.has(id)) return null;
    const cur = this.itemLevel(id);
    if (cur >= ITEM_LEVELS.max) return null;
    const steps = this.stepsOf(d), step = this.partOf(id) + 1;
    const level = cur + 1, cost = Math.round(d.price * ITEM_LEVELS.price[level - 1] / steps / 10) * 10, needLevel = (d.minLevel ?? 1) + ITEM_LEVELS.levelStep * (level - 1);
    const missingGold = Math.max(0, cost - this.game.player.gold), lvOk = this.playerLevel >= needLevel;
    const reason = !lvOk ? `Seviye ${needLevel} gerekli (şu an ${this.playerLevel}).` : missingGold ? `${fmt(missingGold)} altın eksik (${fmt(cost)} gerekli).` : null;
    return { level, cost, needLevel, appeal: this.appealAt(d, level), ok: !reason, missingGold, levelOk: lvOk, reason, step, steps };
  }
  /** Raises an owned piece one level: one atomic step (gold, level, XP, one 'change' event). */
  upgradeItem(id, requestId = null) {
    const g = this.game, d = this.def(id), n = this.nextLevel(id);
    if (!n) return { ok: false, reason: 'max', message: this.owned.has(id) ? `${d?.name ?? 'Eşya'} en üst seviyede.` : 'Önce eşyayı satın al.' };
    if (requestId != null && g.handledRequests.has(requestId)) return { ok: false, reason: 'duplicate', message: 'Bu yükseltme zaten uygulandı.' };
    if (!n.ok) return { ok: false, reason: n.levelOk ? 'gold' : 'level', message: n.reason };
    if (!g.spend(n.cost, `${d.name} · Seviye ${n.level}${n.steps > 1 ? ` (${n.step}. masa)` : ''}`)) return { ok: false, reason: 'gold', message: n.reason ?? 'Altın yetmiyor.' };
    if (n.step < n.steps) this.parts[id] = n.step;               // one more table of the set at the next level
    else { this.levels[id] = n.level; delete this.parts[id]; }   // the last table: the whole set is at the new level
    const xp = Math.max(10, Math.min(300, Math.round(n.cost / 40)));
    g.progression?.gain(xp);
    if (requestId != null) { if (g.handledRequests.size > 200) g.handledRequests.clear(); g.handledRequests.add(requestId); }
    g.emit('shop', { item: d, level: n.level });
    g.emit('change', { type: 'shop', item: id, level: n.level });
    return { ok: true, cost: n.cost, level: n.level, item: d, xp, step: n.step, steps: n.steps, done: n.step === n.steps };
  }

  // ---- recipe levels (RECIPE_LEVELS) ---------------------------------------------------------------
  /** The shop item that unlocks a product, or null for a starting product. */
  recipeItem(pid) { return this.items.find((d) => d.kind === 'recipe' && d.recipe === pid) ?? null; }
  /** Level of a product's recipe: 0 while it is locked, else 1..5. */
  recipeLevel(pid) { return this.game.productsDef[pid] && this.game.isUnlocked(pid) ? this.recipeLevels[pid] ?? 1 : 0; }
  /** Factor on a product's sale price from its recipe level (read once, in Game.unitEconomics). */
  priceFactor(pid) { const n = this.recipeLevels[pid] ?? 1; return RECIPE_LEVELS.sale[n - 1] ?? 1; }
  /** The next recipe level: { level, cost, needLevel, price, ok, levelOk, missingGold, reason } or null at the top / while locked. */
  nextRecipeLevel(pid) {
    const cur = this.recipeLevel(pid), def = this.game.productsDef[pid];
    if (!cur || cur >= RECIPE_LEVELS.max) return null;
    const item = this.recipeItem(pid), level = cur + 1;
    const base = item ? item.price : def.price * RECIPE_LEVELS.baseFactor;
    const cost = Math.round(base * RECIPE_LEVELS.cost[level - 1] / 10) * 10, needLevel = (item?.minLevel ?? 1) + RECIPE_LEVELS.levelStep * (level - 1);
    const missingGold = Math.max(0, cost - this.game.player.gold), levelOk = this.playerLevel >= needLevel;
    const reason = !levelOk ? `Seviye ${needLevel} gerekli (şu an ${this.playerLevel}).` : missingGold ? `${fmt(missingGold)} altın eksik (${fmt(cost)} gerekli).` : null;
    return { level, cost, needLevel, price: Math.round(def.price * RECIPE_LEVELS.sale[level - 1]), ok: !reason, levelOk, missingGold, reason };
  }
  /** Raises a recipe one level: gold, level, XP and one 'change' event in one step. */
  upgradeRecipe(pid, requestId = null) {
    const g = this.game, def = g.productsDef[pid], n = this.nextRecipeLevel(pid);
    if (!n) return { ok: false, reason: 'max', message: this.recipeLevel(pid) ? `${def?.name ?? 'Tarif'} en üst seviyede.` : 'Önce tarifi aç.' };
    if (requestId != null && g.handledRequests.has(requestId)) return { ok: false, reason: 'duplicate', message: 'Bu yükseltme zaten uygulandı.' };
    if (!n.ok) return { ok: false, reason: n.levelOk ? 'gold' : 'level', message: n.reason };
    if (!g.spend(n.cost, `${def.name} tarifi · Seviye ${n.level}`)) return { ok: false, reason: 'gold', message: n.reason ?? 'Altın yetmiyor.' };
    this.recipeLevels[pid] = n.level;
    const xp = Math.max(10, Math.min(300, Math.round(n.cost / 40)));
    g.progression?.gain(xp);
    if (requestId != null) { if (g.handledRequests.size > 200) g.handledRequests.clear(); g.handledRequests.add(requestId); }
    g.emit('change', { type: 'shop', recipe: pid, level: n.level });
    return { ok: true, cost: n.cost, level: n.level, xp, price: n.price };
  }

  // ---- collections (COLLECTIONS) ----------------------------------------------------------------------
  /** The decoration groups with their progress: [{ group, items, owned, maxed, ownedPaid, maxPaid, ownedReward, maxReward }]. */
  collectionList() {
    const groups = [];
    for (const d of this.items) if (this.levelable(d) && d.group && !groups.includes(d.group)) groups.push(d.group);
    return groups.map((group) => {
      const items = this.items.filter((d) => this.levelable(d) && d.group === group), total = items.reduce((s, d) => s + d.price, 0);
      const reward = (c) => ({ gold: Math.max(c.min, Math.round(total * c.share / 10) * 10), xp: c.xp });
      return { group, items, owned: items.filter((d) => this.owned.has(d.id)).length, maxed: items.filter((d) => this.itemLevel(d.id) >= ITEM_LEVELS.max).length,
        ownedPaid: this.collections.has(`${group}:owned`), maxPaid: this.collections.has(`${group}:max`), ownedReward: reward(COLLECTIONS.owned), maxReward: reward(COLLECTIONS.max) };
    });
  }
  /** Pays every collection reward that has just been earned (once each); emits 'collection' for each. */
  checkCollections() {
    for (const c of this.collectionList()) {
      for (const [kind, done, reward] of [['owned', c.owned === c.items.length, c.ownedReward], ['max', c.maxed === c.items.length, c.maxReward]]) {
        const key = `${c.group}:${kind}`;
        if (!done || this.collections.has(key)) continue;
        this.collections.add(key);
        this.game.earn(reward.gold, 'collection', `Koleksiyon: ${c.group}${kind === 'max' ? ' (en üst seviye)' : ''}`);
        this.game.progression?.gain(reward.xp);
        this.game.emit('collection', { group: c.group, kind, reward });
      }
    }
  }

  /** XP for a purchase grows with its price (about 1 XP per 40 gold, at least 10, at most 300). */
  xpFor(d) { return Math.max(10, Math.min(300, Math.round((d.price ?? 0) / 40))); }

  // ---- placement ------------------------------------------------------------------------------
  /** The place a decoration stands in: its own slot (`slot` on the item), or for an item without one every slot of its type. */
  slotsOf(id) { const d = this.def(id); if (d?.slot && DECOR_SLOT_TYPES[d.slot]) return [d.slot]; return d?.type ? Object.keys(DECOR_SLOT_TYPES).filter((sl) => DECOR_SLOT_TYPES[sl].type === d.type) : []; }
  /** The slot an item stands in now, or null. */
  slotOf(id) { return Object.keys(this.placed).find((sl) => this.placed[sl] === id) ?? null; }
  isPlaced(id) { return this.owned.has(id) && this.slotOf(id) !== null; }
  /** For the picker: every slot of the item's type with its label and what stands there. */
  slotChoices(id) { return this.slotsOf(id).map((slot) => ({ slot, label: DECOR_SLOT_TYPES[slot].label, here: this.placed[slot] === id, occupant: this.placed[slot] && this.placed[slot] !== id ? this.def(this.placed[slot])?.name : null })); }

  /** A newly bought piece goes straight into its own place; the shared theme slot takes the new theme and stores the old one. */
  autoPlace(d) {
    const slots = this.slotsOf(d.id), free = slots.find((sl) => !this.placed[sl]);
    if (free) { this.placed[free] = d.id; this.stored.delete(d.id); return free; }
    if (slots.length === 1 && SHARED_SLOTS.includes(slots[0])) { const old = this.placed[slots[0]]; if (old) this.stored.add(old); this.placed[slots[0]] = d.id; this.stored.delete(d.id); return slots[0]; }
    this.stored.add(d.id);
    return null;
  }

  /** Puts an owned decoration into a slot of its type. A piece already there is swapped into this piece's old slot when it fits, otherwise it is stored. */
  place(slot, id) {
    const d = this.def(id);
    if (!d || !this.owned.has(id) || !this.slotsOf(id).includes(slot)) return { ok: false, message: 'Bu eşya oraya yerleştirilemez.' };
    if (this.placed[slot] === id) return { ok: true };
    const from = this.slotOf(id), other = this.placed[slot];
    if (from) delete this.placed[from];
    if (other) { if (from && this.slotsOf(other).includes(from)) this.placed[from] = other; else this.stored.add(other); }
    this.placed[slot] = id; this.stored.delete(id);
    this.game.emit('change', { type: 'shopPlace', item: id });
    return { ok: true, slot };
  }
  /** Takes a theme down (decoration has fixed places and always stays where it belongs). */
  unplace(id) {
    if (this.def(id)?.type !== 'theme') return { ok: false, message: 'Dekorasyonun yeri sabit; kaldırılamaz.' };
    const from = this.slotOf(id);
    if (!from || !this.owned.has(id)) return { ok: false, message: 'Bu eşya zaten yerleştirilmemiş.' };
    delete this.placed[from]; this.stored.add(id);
    this.game.emit('change', { type: 'shopPlace', item: id });
    return { ok: true };
  }
  /** Is a decoration item standing in the café (owned and placed)? */
  active(id) { return this.isPlaced(id); }
  /** Items standing in the café, in catalogue order. */
  placedItems() { return this.items.filter((d) => d.type && this.isPlaced(d.id)); }
  /** What stands where: [{ slot, d }] (the scene draws these). */
  placements() { return Object.entries(this.placed).map(([slot, id]) => ({ slot, d: this.def(id) })).filter((p) => p.d && this.owned.has(p.d.id)); }
  /** The value of a shared slot's effect, e.g. tableTop -> 'cake' or null. */
  slotEffect(slot, key) { const id = this.placed[slot]; const d = id && this.isPlaced(id) ? this.def(id) : null; return d?.effect?.[key] ?? null; }

  // ---- effects: each is read by exactly one place in the rules ----------------------------------
  /** The owned tier of an equipment line (1 = the starting equipment). */
  tier(line) {
    let t = 1;
    for (const d of this.items) if (d.line === line && d.kind === 'equipment' && this.owned.has(d.id)) t = Math.max(t, d.tier);
    return t;
  }
  /** The item whose effect is in force for a line (the highest owned tier), or null. */
  tierItem(line) {
    let best = null;
    for (const d of this.items) if (d.line === line && this.owned.has(d.id) && (!best || d.tier > best.tier)) best = d;
    return best;
  }
  /** Effect value of a line from its best owned tier, so tiers replace each other and never add up. */
  lineEffect(line, key) { return this.tierItem(line)?.effect?.[key]; }

  /** Production time fraction removed at a station (oven / coffee machine tiers). */
  speedBonus(station) { return this.lineEffect(station, 'speed')?.[station] ?? 0; }
  /** Extra simultaneous jobs at a station. */
  capacityBonus(station) { return this.lineEffect(station, 'capacity')?.[station] ?? 0; }
  maxCapacityBonus(station) { return Math.max(0, ...this.items.filter((d) => d.line === station && d.effect?.capacity?.[station]).map((d) => d.effect.capacity[station])); }
  /** Extra units per product the showcase holds. */
  showcaseBonus() { return this.lineEffect('showcase', 'showcase') ?? 0; }
  /** Share of the ingredients' value refunded by the prep counter (added to the research refund in Game.ingredientRebate). */
  refundBonus() { return this.lineEffect('counter', 'refund') ?? 0; }
  /** Units of each ingredient the storeroom holds. */
  ingredientCap() { return this.lineEffect('storage', 'storage') ?? this.storage.base; }
  /** Extra waiting places in front of the showcase. */
  queueBonus() { return this.lineEffect('waiting', 'queue') ?? 0; }
  /** The same for a set of owned ids that is not (yet) the live state: used to check a save before it is applied. */
  queueBonusFor(owned) {
    let best = null;
    for (const d of this.items) if (d.line === 'waiting' && owned.includes(d.id) && (!best || d.tier > best.tier)) best = d;
    return best?.effect?.queue ?? 0;
  }
  /** VIP guests: { chance, mult } from the best owned tier, or null. */
  vip() { return this.lineEffect('vip', 'vip') ?? null; }
  /**
   * What stands on table `i` when it is free: 'cake' | 'cup' (the cake and cup sets share the tables, every other table), 'plain' (the plain set:
   * an empty top) or null (the starting vase).
   */
  tableTopAt(i) {
    const cake = this.slotEffect('tables-cake', 'tableTop'), cup = this.slotEffect('tables-cup', 'tableTop');
    if (cake && cup) return i % 2 === 0 ? cake : cup;
    return cake ?? cup ?? this.slotEffect('tables', 'tableTop');
  }
  /** The table set pieces standing in the café (their levels raise the tables' picture). */
  tableSets() { return ['tables', 'tables-cake', 'tables-cup'].map((sl) => this.placed[sl]).filter((id) => id && this.isPlaced(id)); }
  theme() { return this.slotEffect('theme', 'theme'); }

  /** Appeal points of everything standing in the café. */
  appeal() { return this.placedItems().reduce((s, d) => s + (this.levelable(d) ? this.appealNow(d) : this.appealAt(d, 1)), 0); }
  /** Factor on the gap between arriving guests (< 1 = guests come more often). */
  arrivalFactor() { const a = this.appealDef; return 1 - Math.min(a.arrivalMax, this.appeal() * a.arrivalPerPoint); }
  tipChance() { const a = this.appealDef; return Math.min(a.tipMax, this.appeal() * a.tipPerPoint); }
  tipShare() { return this.appealDef.tipShare; }

  recipeUnlocked(id) {
    if (!this.recipes[id]) return true;
    return this.items.some((d) => d.recipe === id && this.owned.has(d.id));
  }
  recipeCount() { return this.items.filter((d) => d.kind === 'recipe' && this.owned.has(d.id)).length; }

  // ---- first use of new equipment ---------------------------------------------------------------
  /** Equipment bought above tier 1 whose first-use introduction has not played yet, for `line` (or null). */
  pendingIntro(line) {
    const d = this.tierItem(line);
    return d && d.tier > 1 && !this.introduced.has(d.id) ? d : null;
  }
  /** Marks the introduction as played (the scene calls it when the equipment is used for the first time) and announces it. */
  introduce(line) {
    const d = this.pendingIntro(line);
    if (!d) return null;
    this.introduced.add(d.id);
    this.game.emit('shopIntro', { item: d, line });
    this.game.emit('change', { type: 'shopIntro', item: d.id });
    return d;
  }

  // ---- stages and goals -------------------------------------------------------------------------
  stage() { return this.stages.find((s) => s.id === this.stageId) ?? this.stages[0]; }
  /** Current value of a stage condition. */
  measure(key) {
    const g = this.game;
    switch (key) {
      case 'level': return this.playerLevel;
      case 'spent': return g.stats.goldSpent;
      case 'items': return this.ownedCount();
      case 'sold': return g.stats.soldTotal;
      case 'equipment': return this.items.filter((d) => d.kind === 'equipment' && ['oven', 'coffee', 'counter', 'showcase', 'storage'].includes(d.line) && this.owned.has(d.id)).length;
      case 'upgrades': return g.stats.upgradesBought;
      case 'tables': return g.cafe ? g.cafe.tableCount() : g.effect('cafeTables');
      case 'recipes': return this.recipeCount();
      case 'research': return g.stats.researchBought;
      default: return 0;
    }
  }
  /** Progress towards a stage: [{ key, have, need, ok }]. */
  stageProgress(stage) {
    return Object.entries(stage.need ?? {}).map(([key, need]) => { const have = this.measure(key); return { key, have: Math.min(have, need), need, ok: have >= need }; });
  }
  /** The stage after the current one, or null at the last. */
  nextStage() { return this.stages.find((s) => s.id === this.stageId + 1) ?? null; }

  /** Moves up when the next stage's conditions all hold (one stage per check; the reward is paid once). Returns the stage reached or null. */
  checkStage() {
    const next = this.nextStage();
    if (!next || !this.stageProgress(next).every((c) => c.ok)) return null;
    this.stageId = next.id;
    const r = next.reward ?? {};
    if (r.gold) this.game.earn(r.gold, 'stage', `Aşama ödülü: ${next.name}`);
    this.game.progression?.gain(r.xp ?? 0);
    this.game.emit('stage', { stage: next });
    this.game.emit('change', { type: 'stage', stage: next.id });
    this.checkStage();                                          // (several at once, e.g. after a big purchase)
    return next;
  }

  /**
   * The next thing worth saving for: the cheapest item whose gates are all open but not yet affordable (progress = gold / price);
   * if everything open is affordable, the cheapest of those ("ready"); if nothing is open, the nearest level gate.
   * Returns { kind: 'save' | 'ready' | 'level' | 'done', item, missingGold, progress, text }.
   */
  nextGoal() {
    const gold = this.game.player.gold;
    const open = [], gated = [];
    for (const d of this.items) {
      if (d.category === 'ingredients' || this.has(d.id)) continue;
      const conds = this.conditions(d.id);
      const price = this.priceOf(d.id);
      if (conds.every((c) => c.ok)) open.push({ d, price });
      else if (conds.every((c) => c.ok || c.kind === 'level' || c.kind === 'stage')) gated.push({ d, price, lv: this.minLevelOf(d) });
    }
    const unaffordable = open.filter((o) => o.price > gold).sort((a, b) => a.price - b.price);
    if (unaffordable.length) { const o = unaffordable[0]; return { kind: 'save', item: o.d, price: o.price, missingGold: o.price - gold, progress: Math.min(1, gold / o.price), text: `${o.d.name}: ${fmt(o.price - gold)} altın kaldı` }; }
    const affordable = open.sort((a, b) => a.price - b.price);
    if (affordable.length) { const o = affordable[0]; return { kind: 'ready', item: o.d, price: o.price, missingGold: 0, progress: 1, text: `${o.d.name} alınabilir (${fmt(o.price)})` }; }
    gated.sort((a, b) => a.lv - b.lv || a.price - b.price);
    if (gated.length) { const o = gated[0]; const need = o.d.stage && o.d.stage > this.stageId ? `Aşama ${o.d.stage}` : `Seviye ${o.lv}`; return { kind: 'level', item: o.d, price: o.price, missingGold: Math.max(0, o.price - gold), progress: 0, text: `${o.d.name}: ${need} gerekli` }; }
    return { kind: 'done', item: null, price: 0, missingGold: 0, progress: 1, text: 'Tüm ürünler alındı' };
  }

  // ---- persistence ------------------------------------------------------------------------------
  exportState() { return { owned: [...this.owned], placed: { ...this.placed }, stored: [...this.stored], introduced: [...this.introduced], stage: this.stageId, levels: { ...this.levels }, parts: { ...this.parts }, recipeLevels: { ...this.recipeLevels }, collections: [...this.collections] }; }

  importState(state) {
    const v = validateShop(state, this);
    this.owned = new Set(v.owned);
    this.placed = { ...v.placed };
    this.stored = new Set(v.stored);
    this.introduced = new Set(v.introduced);
    this.stageId = v.stage;
    this.levels = { ...v.levels };
    this.parts = { ...v.parts };
    this.recipeLevels = { ...v.recipeLevels };
    this.collections = new Set(v.collections);
  }
}

/**
 * Sanitizes saved shop data (never throws): unknown ids are dropped; a decoration stands only in a slot of its type and only once; a piece that is
 * neither placed nor stored (an older save, or a slot that was removed) is placed in the first free slot, or stored, so a bought piece can never be
 * missing; the stage is clamped. An old save without a shop simply owns nothing and moves up stages by itself when its conditions hold.
 */
export function validateShop(raw, shop) {
  const known = new Set(shop.items.filter((d) => d.kind !== 'upgrade').map((d) => d.id));
  const owned = [...new Set(Array.isArray(raw?.owned) ? raw.owned.filter((id) => known.has(id)) : [])];
  const placed = {}, used = new Set();
  for (const [slot, id] of Object.entries(raw?.placed && typeof raw.placed === 'object' ? raw.placed : {})) {
    const d = shop.def(id);
    if (d && owned.includes(id) && !used.has(id) && DECOR_SLOT_TYPES[slot]?.type === d.type) { placed[slot] = id; used.add(id); }
  }
  // fixed places: every owned piece stands in its own slot (an older save that moved or stored pieces gets them back where they belong);
  // only the shared theme slot keeps the saved choice
  for (const sl of Object.keys(placed)) if (!SHARED_SLOTS.includes(sl)) { used.delete(placed[sl]); delete placed[sl]; }
  const stored = new Set();
  for (const id of owned) {
    const d = shop.def(id);
    if (!d?.type || used.has(id)) continue;
    const own = shop.slotsOf(id), free = own.find((sl) => !placed[sl]);
    if (free) { placed[free] = id; used.add(id); } else stored.add(id);
  }
  const introduced = [...new Set(Array.isArray(raw?.introduced) ? raw.introduced.filter((id) => owned.includes(id)) : [])];
  const maxStage = Math.max(...shop.stages.map((s) => s.id));
  const stage = Number.isInteger(raw?.stage) && raw.stage >= 1 ? Math.min(raw.stage, maxStage) : 1;
  const levels = {};                                          // decoration levels: only owned pieces that level, 2..max (level 1 is not stored)
  for (const [id, n] of Object.entries(raw?.levels ?? {})) if (owned.includes(id) && shop.levelable(shop.def(id)) && Number.isInteger(n) && n >= 2 && n <= ITEM_LEVELS.max) levels[id] = n;
  const parts = {};                                           // half-raised table sets: 1..steps-1, and only below the top level
  for (const [id, n] of Object.entries(raw?.parts ?? {})) { const d = shop.def(id); if (owned.includes(id) && shop.levelable(d) && Number.isInteger(n) && n >= 1 && n < shop.stepsOf(d) && (levels[id] ?? 1) < ITEM_LEVELS.max) parts[id] = n; }
  const recipeLevels = {};                                    // recipe levels: known products only, 2..max
  for (const [id, n] of Object.entries(raw?.recipeLevels ?? {})) if (shop.game.productsDef[id] && Number.isInteger(n) && n >= 2 && n <= RECIPE_LEVELS.max) recipeLevels[id] = n;
  const groups = new Set(shop.items.filter((d) => shop.levelable(d) && d.group).map((d) => d.group));
  const collections = [...new Set(Array.isArray(raw?.collections) ? raw.collections.filter((k) => typeof k === 'string' && /:(owned|max)$/.test(k) && groups.has(k.replace(/:(owned|max)$/, ''))) : [])];
  return { owned, placed, stored: [...stored], introduced, stage, levels, parts, recipeLevels, collections };
}

/** One line of what an item does, built from its effect so the text can never disagree with the numbers. */
export function describeEffect(d, game) {
  if (d.kind === 'upgrade') return game?.upgradesDef[d.upgrade]?.describe(game.upgradesDef[d.upgrade].values[d.level]) ?? '';
  const e = d.effect ?? {}, parts = [];
  const names = { oven: 'Fırın', coffee: 'Kahve makinesi' };
  if (e.speed) for (const [st, f] of Object.entries(e.speed)) parts.push(`${names[st] ?? st} tarifleri %${Math.round(f * 100)} daha hızlı`);
  if (e.capacity) for (const [st, n] of Object.entries(e.capacity)) parts.push(`${names[st] ?? st} aynı anda ${n + 1} ürün hazırlar`);
  if (e.showcase) parts.push(`Vitrin her üründen +${e.showcase} adet tutar`);
  if (e.storage) parts.push(`Depo her malzemeden ${e.storage} adet tutar`);
  if (e.refund) parts.push(`Üretimde malzemenin %${Math.round(e.refund * 100)}'i geri döner`);
  if (e.queue) parts.push(`+${e.queue} bekleme yeri`);
  if (e.vip) parts.push(`Misafirlerin %${Math.round(e.vip.chance * 100)}'i VIP, %${Math.round((e.vip.mult - 1) * 100)} fazla öder`);
  if (e.area) parts.push(e.area === 'aisle' ? 'Koridora halı, lamba ve bitki yerleştirilebilir' : 'Duvara raf yerleştirilebilir');
  if (d.kind === 'recipe') parts.push('Yeni ürün: üretilir, siparişte istenir');
  if (d.appeal) parts.push(`Çekicilik +${d.appeal}`);
  return parts.join(' · ');
}
