// Bookshop research centre: permanent bonuses bought with gold. This module only owns levels, prices and gating; the bonuses
// themselves are read by the systems they affect through game.bonus(effect) (see the RESEARCH table in data/economy.js).
// A purchase is one atomic step (checks -> gold -> level -> XP -> one 'change' event); the effect exists only once it succeeds.
import { RESEARCH } from '../data/economy.js';

const fmt = (n) => n.toLocaleString('tr-TR');

export class Research {
  /** @param {import('./game.js').Game} game */
  constructor(game, defs = RESEARCH) {
    this.game = game;
    this.defs = defs;
    this.levels = Object.fromEntries(Object.keys(defs).map((id) => [id, 0]));
    game.research = this;
  }

  ids() { return Object.keys(this.defs); }
  level(id) { return this.levels[id] ?? 0; }
  maxLevel(id) { return this.defs[id].costs.length; }
  /** Bonus fraction of research `id` at its current level. */
  value(id) { return this.defs[id].values[this.level(id)]; }
  /** Combined bonus of an effect. Each effect belongs to one research, so a bonus can never be counted twice. */
  bonus(effect) {
    let total = 0;
    for (const [id, d] of Object.entries(this.defs)) if (d.effect === effect) total += this.value(id);
    return total;
  }
  nextCost(id) { const l = this.level(id); return l >= this.maxLevel(id) ? null : this.defs[id].costs[l]; }

  /** 'closed' (Bookshop not open) | 'locked' (Bookshop not developed enough) | 'max' | 'ready'. */
  status(id) {
    const town = this.game.town;
    if (town && !town.isOpen('bookshop')) return 'closed';
    if (town && town.level('bookshop') < this.defs[id].bookshopLevel) return 'locked';
    return this.level(id) >= this.maxLevel(id) ? 'max' : 'ready';
  }

  /** Why a purchase is refused right now, or null. */
  blockReason(id) {
    const d = this.defs[id];
    if (!d) return { reason: 'unknown', message: 'Bilinmeyen araştırma.' };
    const s = this.status(id);
    if (s === 'closed') return { reason: 'closed', message: 'Önce Kitapçı\'yı aç.' };
    if (s === 'locked') return { reason: 'locked', message: `${d.name} için Kitapçı gelişimi ${d.bookshopLevel}. seviye olmalı (Kasaba'dan Kitapçı'yı geliştir).` };
    if (s === 'max') return { reason: 'max', message: `${d.name} en yüksek seviyede.` };
    const cost = this.nextCost(id);
    if (this.game.player.gold < cost) return { reason: 'gold', message: `Yetersiz altın: ${fmt(cost)} gerekli, ${fmt(this.game.player.gold)} var.` };
    return null;
  }

  /** Buys the next level. `expectedLevel` is the level shown on the button, so a replayed tap cannot buy a second level. */
  buy(id, expectedLevel = null) {
    const block = this.blockReason(id);
    if (block && block.reason !== 'gold' && block.reason !== 'max') return { ok: false, ...block };
    const level = this.level(id);
    if (expectedLevel != null && expectedLevel !== level) return { ok: false, reason: 'stale', message: `${this.defs[id].name} zaten seviye ${level}. Satın alma tekrarlanmadı.` };
    if (block) return { ok: false, ...block };
    const cost = this.nextCost(id);
    this.game.spend(cost, this.defs[id].name);
    this.levels[id] = level + 1;
    this.game.stats.researchBought += 1;
    this.game.progression?.award('research', level + 1);
    this.game.emit('change', { type: 'research', research: id, level: level + 1 });
    return { ok: true, level: level + 1, cost, def: this.defs[id] };
  }

  exportState() { return { levels: { ...this.levels } }; }
  importState(state) { this.levels = { ...validateResearch(state, this).levels }; }
}

/** Sanitizes saved research data (never throws): unknown ids are dropped, levels outside 0..max become 0 / max. */
export function validateResearch(raw, research) {
  const levels = {};
  for (const id of research.ids()) {
    const v = raw?.levels?.[id];
    levels[id] = Number.isInteger(v) && v > 0 ? Math.min(v, research.maxLevel(id)) : 0;
  }
  return { levels };
}
