// Guest album: which guest looks the player has served, how often, and whether their favourite is known. A new look pays a small one-time reward,
// and having served every look pays a bigger one-time reward. All gold goes through Game.earn.
import { ALBUM } from '../data/economy.js';

export class Album {
  /** @param {import('./game.js').Game} game @param {string[]} looks every look that can come to the cafe */
  constructor(game, looks, cfg = ALBUM) {
    this.game = game;
    this.looks = looks;
    this.cfg = cfg;
    this.seen = {};            // look -> { served, fav } (fav: this guest has been served their favourite)
    this.completed = false;    // the completion reward was paid
    game.album = this;
  }

  nameOf(look) { return this.cfg.names[look] ?? look; }
  entry(look) { return this.seen[look] ?? null; }
  count() { return this.looks.filter((l) => this.seen[l]).length; }

  /** Called for every happy sale. Returns { first, completed, gold } when something new happened. */
  record(look, favoriteServed) {
    if (!this.looks.includes(look)) return null;
    const e = (this.seen[look] ??= { served: 0, fav: false });
    const first = e.served === 0;
    e.served = Math.min(e.served + 1, 1e9);
    if (favoriteServed) e.fav = true;
    let gold = 0, completed = false;
    if (first) gold += this.game.earn(this.cfg.newLook, 'album', `Albüm: ${this.nameOf(look)}`);
    if (!this.completed && this.count() === this.looks.length) { this.completed = true; completed = true; gold += this.game.earn(this.cfg.complete, 'album', 'Albüm tamamlandı'); }
    if (first || completed) this.game.emit('album', { look, first, completed, gold });
    return { first, completed, gold };
  }

  exportState() { return { seen: JSON.parse(JSON.stringify(this.seen)), completed: this.completed }; }

  importState(state) {
    this.seen = JSON.parse(JSON.stringify(state?.seen ?? {}));
    this.completed = !!state?.completed;
  }
}

/** Sanitizes saved album data: unknown looks and bad numbers are dropped, never throws. */
export function validateAlbum(raw, looks) {
  const seen = {};
  for (const look of looks) {
    const e = raw?.seen?.[look];
    if (e && Number.isInteger(e.served) && e.served >= 1 && e.served < 1e9) seen[look] = { served: e.served, fav: e.fav === true };
  }
  return { seen, completed: raw?.completed === true && Object.keys(seen).length === looks.length };
}
