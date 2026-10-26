// Town: which buildings are open and how far each is developed. Opening and developing are atomic steps
// (check -> gold -> state -> XP -> one 'change' event) so autosave sees one consistent snapshot, and an opened building
// can never be bought again. Conditions and rewards come from separate tables in data/economy.js.
import { TOWN, TOWN_UNLOCKS, TOWN_REWARDS } from '../data/economy.js';

const fmt = (n) => n.toLocaleString('tr-TR');

export class Town {
  /** @param {import('./game.js').Game} game */
  constructor(game, { buildings = TOWN, unlocks = TOWN_UNLOCKS, rewards = TOWN_REWARDS } = {}) {
    this.game = game;
    this.defs = buildings;
    this.unlocks = unlocks;
    this.rewards = rewards;
    this.opened = new Set();     // opened non-starter buildings
    this.levels = {};            // building id -> development level (0 = none)
    game.town = this;
  }

  def(id) { return this.defs.find((b) => b.id === id) ?? null; }
  get playerLevel() { return this.game.progression?.level ?? 1; }
  isOpen(id) { const d = this.def(id); return !!d && (!!d.starter || this.opened.has(id)); }
  level(id) { return this.levels[id] ?? 0; }
  maxLevel(id) { return this.def(id)?.levels?.length ?? 0; }

  /** What a step costs: { gold, minLevel } plus which of the two are still missing. */
  need(cond) {
    const gold = cond?.gold ?? 0, minLevel = cond?.minLevel ?? 1;
    const missingGold = Math.max(0, gold - this.game.player.gold);
    const missingLevel = Math.max(0, minLevel - this.playerLevel);
    return { gold, minLevel, missingGold, missingLevel, ok: !missingGold && !missingLevel };
  }

  /** 'open' | 'available' (player level reached) | 'locked' (level too low or not purchasable yet). */
  status(id) {
    const d = this.def(id);
    if (!d) return null;
    if (this.isOpen(id)) return 'open';
    if (d.comingSoon) return 'locked';
    return this.need(this.unlocks[id]).missingLevel ? 'locked' : 'available';
  }

  /** Human readable list of what is still missing, e.g. "Seviye 3 gerekli (şu an 1) · 1.200 altın eksik". */
  missingText(n) {
    const parts = [];
    if (n.missingLevel) parts.push(`Seviye ${n.minLevel} gerekli (şu an ${this.playerLevel})`);
    if (n.missingGold) parts.push(`${fmt(n.missingGold)} altın eksik`);
    return parts.join(' · ');
  }

  list() {
    return this.defs.map((d) => {
      const status = this.status(d.id), level = this.level(d.id), max = this.maxLevel(d.id);
      const next = status === 'open' && level < max ? this.need(this.unlocks[d.id]?.levels?.[level]) : null;
      return { def: d, status, level, maxLevel: max, unlock: d.starter || !this.unlocks[d.id] ? null : this.need(this.unlocks[d.id]), next };
    });
  }

  /** Opens a building: gold is spent once, the state becomes permanently "open". */
  open(id) {
    const d = this.def(id);
    const fail = (reason, message) => ({ ok: false, reason, message });
    if (!d) return fail('unknown', 'Bina bulunamadı.');
    if (this.isOpen(id)) return fail('owned', `${d.name} zaten açık.`);
    if (d.comingSoon) return fail('soon', `${d.name} henüz açılamıyor.`);
    const n = this.need(this.unlocks[id]);
    if (!n.ok) return fail(n.missingLevel ? 'level' : 'gold', `${d.name} açılamadı: ${this.missingText(n)}.`);
    this.game.spend(n.gold);
    this.opened.add(id);
    this.game.stats.buildingsOpened += 1;
    const xp = this.rewards[id]?.open?.xp ?? 0;
    this.game.progression?.gain(xp);
    this.game.emit('change', { type: 'town', building: id });
    return { ok: true, cost: n.gold, xp, building: d };
  }

  /** Develops an open building by one level. `expectedLevel` protects against a replayed tap. */
  develop(id, expectedLevel = this.level(id)) {
    const d = this.def(id);
    const fail = (reason, message) => ({ ok: false, reason, message });
    if (!d) return fail('unknown', 'Bina bulunamadı.');
    if (!this.isOpen(id)) return fail('closed', `${d.name} henüz açık değil.`);
    const level = this.level(id);
    if (expectedLevel !== level) return fail('stale', 'Bu geliştirme zaten alındı.');
    if (level >= this.maxLevel(id)) return fail('max', `${d.name} en yüksek seviyede.`);
    const n = this.need(this.unlocks[id]?.levels?.[level]);
    if (!n.ok) return fail(n.missingLevel ? 'level' : 'gold', `${d.name} geliştirilemedi: ${this.missingText(n)}.`);
    this.game.spend(n.gold);
    this.levels[id] = level + 1;
    this.game.stats.buildingUpgrades += 1;
    const xp = this.rewards[id]?.levels?.[level]?.xp ?? 0;
    this.game.progression?.gain(xp);
    this.game.emit('change', { type: 'townLevel', building: id });
    return { ok: true, cost: n.gold, xp, level: level + 1, building: d };
  }

  exportState() { return { opened: [...this.opened], levels: { ...this.levels } }; }

  importState(state) {
    const v = validateTown(state, this);
    this.opened = new Set(v.opened);
    this.levels = { ...v.levels };
  }
}

/** Sanitizes saved town data (never throws): unknown / starter ids are dropped, levels are clamped, a developed building counts as open. */
export function validateTown(raw, town) {
  const known = town.defs.filter((d) => !d.starter && !d.comingSoon);
  const opened = new Set(), levels = {};
  const list = Array.isArray(raw?.opened) ? raw.opened : [];
  for (const d of known) if (list.includes(d.id)) opened.add(d.id);
  for (const d of known) {
    const v = raw?.levels?.[d.id];
    if (Number.isInteger(v) && v > 0) { levels[d.id] = Math.min(v, d.levels?.length ?? 0); if (levels[d.id]) opened.add(d.id); }
  }
  return { opened: [...opened], levels };
}
