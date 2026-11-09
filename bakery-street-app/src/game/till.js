// Till box: money that piles up while the app is closed, collected with one tap. Pure logic; time comes from the Game clock.
//
// The save stores `lastAt` (the last time the game was written, i.e. the last time it was played) and what is waiting. When a save is loaded, the
// time since `lastAt` (capped, and never negative) turns into money at the stage's rate. While the app runs nothing accrues, so the box
// only ever rewards time away. All gold is paid through Game.earn.
import { TILL } from '../data/economy.js';

export class Till {
  /** @param {import('./game.js').Game} game */
  constructor(game, cfg = TILL) {
    this.game = game;
    this.cfg = cfg;
    this.stored = 0;
    this.lastAt = null;
    game.till = this;
  }

  /** Gold per minute at the current cafe stage. */
  rate() { return this.cfg.base + this.cfg.perStage * Math.max(0, (this.game.shop?.stageId ?? 1) - 1); }
  /** Most the box can hold. */
  cap() { return this.rate() * this.cfg.capMinutes; }

  /** Adds the money earned between `lastAt` and now (called when a save is loaded). Returns the gold added. */
  settle() {
    const now = this.game.clock();
    let added = 0;
    if (this.lastAt != null && Number.isFinite(this.lastAt)) {
      const minutes = Math.min(this.cfg.capMinutes, Math.max(0, (now - this.lastAt) / 60_000));   // a clock set back adds nothing; a huge jump is capped
      if (minutes >= this.cfg.minMinutes) added = Math.min(Math.floor(minutes * this.rate()), Math.max(0, this.cap() - this.stored));
    }
    this.stored += added;
    this.lastAt = now;
    return added;
  }

  /** Takes everything out of the box. */
  collect() {
    if (this.stored <= 0) return { ok: false, reason: 'empty', message: 'Kasada bekleyen para yok.' };
    const gold = this.game.earn(this.stored, 'till', 'Kasada biriken para');
    this.stored = 0;
    this.game.emit('change', { type: 'till', gold });
    return { ok: true, gold };
  }

  exportState() { return { stored: this.stored, lastAt: this.game.clock() }; }

  importState(state) {
    this.stored = state?.stored ?? 0;
    this.lastAt = state?.lastAt ?? null;
    this.settle();
  }
}

/** Sanitizes saved till data: never throws. A missing or broken value means an empty box that starts counting now. */
export function validateTill(raw) {
  const ok = raw && typeof raw === 'object';
  const stored = ok && Number.isInteger(raw.stored) && raw.stored >= 0 && raw.stored < 1e9 ? raw.stored : 0;
  const lastAt = ok && Number.isFinite(raw.lastAt) && raw.lastAt > 0 ? raw.lastAt : null;
  return { stored, lastAt };
}
