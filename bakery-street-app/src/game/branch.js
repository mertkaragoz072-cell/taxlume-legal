// A new branch: once the café has reached its last stage and the player the top level, they may open a second (third, ...) café.
// The economy starts again (gold, stock, machines, upgrades, recipes, town, research, level), but what the player built with love stays:
// the decoration (with its levels) and the expansions it stands on, the guests' friendship and stories, letters, memories, achievements,
// statistics and the café's name. Every branch adds a permanent share to every sale. Pure logic; the reset goes through the save code.
import { LIFE } from '../data/economy.js';

export class Branch {
  /** @param {import('./game.js').Game} game */
  constructor(game, cfg = LIFE.branch) {
    this.game = game;
    this.cfg = cfg;
    this.count = 0;              // branches opened so far
    this.carry = {};             // the statistics of the earlier branches added together (achievements count the whole story)
    game.branch = this;
  }

  /** A lifetime counter: this branch's statistic plus the earlier branches' (`path` like 'soldTotal' or 'sold.bread'). */
  total(path) {
    const get = (o) => path.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o) ?? 0;
    return get(this.game.stats) + get(this.carry);
  }

  /** Extra share of every sale from the branches opened (applied once, in Game.saleIncome). */
  bonus() { return Math.min(this.count, this.cfg.max) * this.cfg.share; }

  /** What is still missing for a new branch ([] = it can be opened). */
  missing() {
    const g = this.game, out = [];
    if (this.count >= this.cfg.max) return ['En çok şube sayısına ulaştın'];
    const last = g.shop ? Math.max(...g.shop.stages.map((s) => s.id)) : 1;
    if ((g.shop?.stageId ?? 1) < last) out.push(`Son aşama (Aşama ${last})`);
    if ((g.progression?.level ?? 1) < this.cfg.minLevel) out.push(`Seviye ${this.cfg.minLevel}`);
    return out;
  }

  /** The state of the new branch, built from the current one (see the file comment for what stays). */
  nextState() {
    const g = this.game, cur = g.exportState(), fresh = g.defaultState(), shop = g.shop;
    const keep = new Set();
    if (shop) {
      for (const d of shop.items) if (cur.shop.owned.includes(d.id) && (d.kind === 'decor' || d.kind === 'area')) keep.add(d.id);
      for (const id of [...keep]) { const d = shop.items.find((x) => x.id === id); if ((d.requires ?? []).some((r) => r.item && !keep.has(r.item))) keep.delete(id); }   // decoration whose expansion is not kept goes too
    }
    const pick = (o) => Object.fromEntries(Object.entries(o ?? {}).filter(([id]) => keep.has(id)));
    return {
      ...fresh,
      gems: cur.gems,
      profile: cur.profile,
      stats: fresh.stats,                                    // a new café counts from zero (stages and quests read these); the old numbers go to `carry`
      album: cur.album,
      achievements: cur.achievements,
      life: cur.life ? { ...cur.life, order: null, orderRest: 0, menu: { date: null, product: null }, day: null, summary: null, theme: { week: null, base: 0, claimed: false } } : null,   // the day and week counters start again with the stats
      shop: { ...fresh.shop, owned: cur.shop.owned.filter((id) => keep.has(id)), placed: pick(cur.shop.placed), stored: (cur.shop.stored ?? []).filter((id) => keep.has(id)), introduced: cur.shop.introduced, levels: pick(cur.shop.levels), parts: pick(cur.shop.parts), collections: cur.shop.collections ?? [] },
      quests: fresh.quests,
      branch: { count: this.count + 1, carry: addStats(this.carry, cur.stats) },
    };
  }

  exportState() { return { count: this.count, carry: JSON.parse(JSON.stringify(this.carry)) }; }
  importState(state) { this.count = state?.count ?? 0; this.carry = JSON.parse(JSON.stringify(state?.carry ?? {})); }
}

/** a + b for statistics objects (numbers and one level of per-product numbers). */
function addStats(a, b) {
  const out = JSON.parse(JSON.stringify(a ?? {}));
  for (const [k, v] of Object.entries(b ?? {})) {
    if (typeof v === 'number') out[k] = (out[k] ?? 0) + v;
    else if (v && typeof v === 'object') { out[k] ??= {}; for (const [id, n] of Object.entries(v)) if (typeof n === 'number') out[k][id] = (out[k][id] ?? 0) + n; }
  }
  return out;
}

/** Saved branch data: a small whole number, never throws. */
export function validateBranch(raw, cfg = LIFE.branch) {
  const n = raw?.count, ok = (v) => Number.isFinite(v) && v >= 0 && v < 1e13;
  const carry = {};
  for (const [k, v] of Object.entries(raw?.carry && typeof raw.carry === 'object' ? raw.carry : {})) {
    if (typeof v === 'number') { if (ok(v)) carry[k] = Math.floor(v); }
    else if (v && typeof v === 'object') carry[k] = Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x === 'number' && ok(x)));
  }
  return { count: Number.isInteger(n) && n >= 0 ? Math.min(n, cfg.max) : 0, carry };
}
