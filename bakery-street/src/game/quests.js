// Quests: progress is derived from the game's persisted lifetime counters (Game.stats), so every relevant action
// (production, sales from showcase or customers, Market purchases, upgrades) updates quests with no extra wiring.
// Only the "claimed" flags are stored separately. Claiming is one atomic step: flag + gold + ingredients.
import { QUESTS } from '../data/economy.js';

export class Quests {
  /** @param {import('./game.js').Game} game */
  constructor(game, defs = QUESTS) {
    this.game = game;
    this.defs = defs;
    this.claimed = new Set();
    this.seenComplete = new Set();     // completions already announced (not saved: nothing is announced after a reload)
    game.quests = this;
    game.on('change', () => this.announce());
  }

  def(id) { return this.defs.find((q) => q.id === id) ?? null; }

  /** Value of a dotted stat path such as 'produced.bread' or 'soldTotal'. */
  value(path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), this.game.stats) ?? 0;
  }

  progress(q) { return Math.min(q.target, this.value(q.stat)); }
  isComplete(q) { return this.value(q.stat) >= q.target; }
  isClaimed(q) { return this.claimed.has(q.id); }

  /** All quests with their current state, in definition order. */
  list() {
    return this.defs.map((q) => ({ def: q, progress: this.progress(q), complete: this.isComplete(q), claimed: this.isClaimed(q) }));
  }

  /** Completed quests whose reward has not been collected. */
  claimable() { return this.list().filter((s) => s.complete && !s.claimed); }

  /** Collects the reward: gold and ingredients go into the shared player gold and inventory. */
  claim(id) {
    const q = this.def(id);
    const fail = (reason, message) => ({ ok: false, reason, message });
    if (!q) return fail('unknown', 'Görev bulunamadı.');
    if (this.claimed.has(id)) return fail('claimed', 'Bu görevin ödülü zaten alındı.');
    if (!this.isComplete(q)) return fail('incomplete', `Görev henüz tamamlanmadı (${this.progress(q)}/${q.target}).`);
    const r = q.reward ?? {};
    this.claimed.add(id);
    if (r.gold) this.game.player.gold += r.gold;
    for (const [ing, n] of Object.entries(r.ingredients ?? {})) this.game.ingredients[ing] += n;
    this.game.emit('change', { type: 'quest', quest: id });
    return { ok: true, reward: r, quest: q };
  }

  /** Fires 'questComplete' once for each quest that just reached its target. */
  announce() {
    for (const q of this.defs) {
      if (this.seenComplete.has(q.id) || !this.isComplete(q)) continue;
      this.seenComplete.add(q.id);
      this.game.emit('questComplete', { quest: q });
    }
  }

  exportState() { return { claimed: [...this.claimed] }; }

  importState(state) {
    this.claimed = new Set(state?.claimed ?? []);
    this.seenComplete = new Set(this.defs.filter((q) => this.isComplete(q)).map((q) => q.id));   // do not announce old completions again
  }
}

/** Sanitizes saved quest data: unknown or duplicate ids are dropped, never throws. */
export function validateQuests(raw, defs = QUESTS) {
  const ids = new Set(defs.map((q) => q.id));
  const claimed = [...new Set(Array.isArray(raw?.claimed) ? raw.claimed.filter((id) => ids.has(id)) : [])];
  return { claimed };
}
