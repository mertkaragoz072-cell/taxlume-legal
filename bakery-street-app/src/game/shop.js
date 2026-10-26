// The shop: equipment tiers, furniture and decoration, recipes, café expansion and special content, all bought with gold.
// This module owns what the player has bought and where it is placed, checks every purchase and applies its effects to the rules through a few
// small queries (speedBonus, capacityBonus, showcaseBonus, refundBonus, ingredientCap, queueBonus, vip, appeal ...) that Game / Cafe call.
// A purchase is one atomic step: checks -> gold (Game.spend) -> owned + placed -> XP -> one 'change' event; if anything in it throws, gold and
// state are restored. Prices, gates and effects come only from data/economy.js.
import { SHOP_ITEMS, SHOP_CATEGORIES, SHARED_SLOTS, STAGES, STORAGE, RECIPES, APPEAL } from '../data/economy.js';

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
    this.introduced = new Set();   // equipment items whose first-use introduction has played
    this.stageId = 1;              // highest stage reached (its reward is paid when it is reached, never again)
    this.stats = { lastGoal: null };
    game.shop = this;
    for (const [id, def] of Object.entries(recipes)) game.registerProduct(id, def);
    game.on('change', (e) => { if (e?.type !== 'load') this.checkStage(); });
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
    return { def: d, status, price, missingGold: status === 'ready' || status === 'locked' ? Math.max(0, price - gold) : 0, conditions: conds, missing: conds.filter((c) => !c.ok), effectText: describeEffect(d, this.game), placed: this.isPlaced(id) };
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
    const snap = { gold: g.player.gold, spent: g.stats.goldSpent, bought: g.stats.shopBought, owned: new Set(this.owned), placed: { ...this.placed } };
    try {
      if (!g.spend(price)) return fail('gold', `${fmt(price - g.player.gold)} altın eksik (${fmt(price)} gerekli, ${fmt(g.player.gold)} var).`);
      this.owned.add(id);
      if (d.slot) this.place(d.slot, id, true);
      g.stats.shopBought += 1;
      g.progression?.gain(this.xpFor(d));
    } catch (err) {                                              // nothing half-done: the gold comes back and the item is not owned
      g.player.gold = snap.gold; g.stats.goldSpent = snap.spent; g.stats.shopBought = snap.bought;
      this.owned = snap.owned; this.placed = snap.placed;
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

  /** XP for a purchase grows with its price (about 1 XP per 40 gold, at least 10, at most 300). */
  xpFor(d) { return Math.max(10, Math.min(300, Math.round((d.price ?? 0) / 40))); }

  // ---- placement ------------------------------------------------------------------------------
  isPlaced(id) { const d = this.def(id); return !!d?.slot && this.owned.has(id) && this.placed[d.slot] === id; }
  /** Puts an owned decoration into its slot (a shared slot holds one item at a time). */
  place(slot, id, force = false) {
    const d = this.def(id);
    if (!d || d.slot !== slot || !this.owned.has(id)) return { ok: false, message: 'Bu eşya yerleştirilemez.' };
    if (this.placed[slot] === id && !force) return { ok: true };
    this.placed[slot] = id;
    if (!force) this.game.emit('change', { type: 'shopPlace', item: id });
    return { ok: true };
  }
  /** Is a decoration item standing in the café (owned and placed)? */
  active(id) { return this.isPlaced(id); }
  /** Items standing in the café, in catalogue order. */
  placedItems() { return this.items.filter((d) => d.slot && this.isPlaced(d.id)); }
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
  /** Which top the tables carry: 'cake' | 'cup' | null (default vase). */
  tableTop() { return this.slotEffect('tableTop', 'tableTop'); }
  theme() { return this.slotEffect('theme', 'theme'); }

  /** Appeal points of everything standing in the café. */
  appeal() { return this.placedItems().reduce((s, d) => s + (d.appeal ?? 0), 0); }
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
    if (r.gold) this.game.player.gold += r.gold;
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
  exportState() { return { owned: [...this.owned], placed: { ...this.placed }, introduced: [...this.introduced], stage: this.stageId }; }

  importState(state) {
    const v = validateShop(state, this);
    this.owned = new Set(v.owned);
    this.placed = { ...v.placed };
    this.introduced = new Set(v.introduced);
    this.stageId = v.stage;
  }
}

/**
 * Sanitizes saved shop data (never throws): unknown ids are dropped, a decoration without a valid slot is not placed, an owned decoration
 * whose slot is empty is placed again (so a bought piece can never be missing from the café), and the stage never goes below what the owned
 * state implies (an old save without a shop simply starts at stage 1 and moves up by itself when its conditions hold).
 */
export function validateShop(raw, shop) {
  const known = new Set(shop.items.filter((d) => d.kind !== 'upgrade').map((d) => d.id));
  const owned = [...new Set(Array.isArray(raw?.owned) ? raw.owned.filter((id) => known.has(id)) : [])];
  const placed = {};
  for (const [slot, id] of Object.entries(raw?.placed && typeof raw.placed === 'object' ? raw.placed : {})) {
    const d = shop.def(id);
    if (d && d.slot === slot && owned.includes(id)) placed[slot] = id;
  }
  for (const id of owned) {                                    // a bought piece must stand somewhere
    const d = shop.def(id);
    if (d?.slot && !placed[d.slot]) placed[d.slot] = id;
  }
  const introduced = [...new Set(Array.isArray(raw?.introduced) ? raw.introduced.filter((id) => owned.includes(id)) : [])];
  const maxStage = Math.max(...shop.stages.map((s) => s.id));
  const stage = Number.isInteger(raw?.stage) && raw.stage >= 1 ? Math.min(raw.stage, maxStage) : 1;
  return { owned, placed, introduced, stage };
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
  if (d.kind === 'recipe') parts.push('Yeni ürün: üretilir, siparişte istenir');
  if (d.appeal) parts.push(`Çekicilik +${d.appeal}`);
  return parts.join(' · ');
}
