// Guest album: which guest looks the player has served, how often, and whether their favourite is known. A new look pays a small one-time reward,
// and having served every look pays a bigger one-time reward. All gold goes through Game.earn.
import { ALBUM, LIFE } from '../data/economy.js';

export class Album {
  /** @param {import('./game.js').Game} game @param {string[]} looks every look that can come to the cafe */
  constructor(game, looks, cfg = ALBUM, friend = LIFE.friend) {
    this.game = game;
    this.friend = friend;
    this.looks = looks;
    this.cfg = cfg;
    this.seen = {};            // look -> { served, fav } (fav: this guest has been served their favourite)
    this.completed = false;    // the completion reward was paid
    game.album = this;
  }

  nameOf(look) { return this.cfg.names[look] ?? look; }
  entry(look) { return this.seen[look] ?? null; }
  count() { return this.looks.filter((l) => this.seen[l]).length; }

  /** Friendship: how many of the 5 hearts a guest look has filled (from its served visits). */
  heartsOf(look) { const n = this.seen[look]?.served ?? 0; return this.friend ? this.friend.visits.filter((v) => n >= v).length : 0; }
  /** Visits still needed for the next heart (null at full hearts). */
  toNextHeart(look) { const n = this.seen[look]?.served ?? 0, next = this.friend?.visits.find((v) => n < v); return next == null ? null : next - n; }
  /** Extra share of a sale this guest's friendship adds (their tip grows with every heart). */
  friendShare(look) { return this.friend ? this.heartsOf(look) * this.friend.tipPerHeart : 0; }

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
    let heart = 0;
    const hearts = this.heartsOf(look);
    while (this.friend && (e.hearts ?? 0) < hearts) {                      // each new heart pays once (the paid count is stored)
      e.hearts = (e.hearts ?? 0) + 1;
      heart = e.hearts;
      gold += this.game.earn(this.friend.gold[e.hearts - 1] ?? 0, 'friend', `${this.nameOf(look)}: ${e.hearts}. kalp`);
    }
    if (heart) { this.game.life?.heartLetter(look, heart); this.game.emit('friend', { look, hearts: heart }); }
    if (first || completed) this.game.emit('album', { look, first, completed, gold });
    return { first, completed, gold, heart };
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
    if (e && Number.isInteger(e.served) && e.served >= 1 && e.served < 1e9) seen[look] = { served: e.served, fav: e.fav === true, ...(Number.isInteger(e.hearts) && e.hearts > 0 && e.hearts <= 5 ? { hearts: e.hearts } : {}) };
  }
  return { seen, completed: raw?.completed === true && Object.keys(seen).length === looks.length };
}
