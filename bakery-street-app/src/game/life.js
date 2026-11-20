// Café life: the small daily things around the café that need no new pictures.
//  - dish of the day (the player picks one product a day; Cafe orders it more often and pays a little more for it)
//  - guest letters (an inbox of short notes; some carry a small gift)
//  - the food critic (at most once a day an ordinary-looking guest is a critic; Cafe decides on arrival, this pays the reward)
//  - the special order board (one optional bigger order at a time, delivered from stock)
//  - the Market's deal of the day (one ingredient cheaper; pure, worked out from the date)
// Pure logic, clock from the Game. All gold goes through Game.earn.
import { LIFE, ALBUM } from '../data/economy.js';
import { dateKey, dayNumber } from './daily.js';

const isInt = (n, max = 1e12) => Number.isInteger(n) && n >= 0 && n < max;
const HOUR = 3600_000, MIN = 60_000;

/** Short notes guests write. {name} is the guest's name, {product} their favourite (or what they had). */
export const LETTERS = [
  '{product} yağmurlu günümü güzelleştirdi. Teşekkürler!',
  'Kafenizin kokusu sokağın başından geliyor. Yine geleceğim.',
  'Bugün çok yorgundum, sıcak bir {product} iyi geldi.',
  'Garson kediniz çok nazikti. Selamlar!',
  'Torunuma da anlattım, hafta sonu birlikte geleceğiz.',
  'Masanızdaki çiçekler çok güzel, içim açıldı.',
  'Bu kasabanın en huzurlu köşesi sizin kafeniz.',
  '{product} tam istediğim gibiydi. Ellerinize sağlık.',
  'Pencere kenarında oturup kitap okumak harikaydı.',
  'Küçük bir hediye bıraktım, kendinize bir şey alın.',
];
/** What a guest writes when a new heart of their friendship fills. */
const HEART_LETTERS = [
  'Artık burası benim favori kafem. Hep böyle kalın!',
  'Sizi görmeden günüm başlamıyor gibi.',
  'Kafenize gelmek günün en güzel anı.',
  'Siz benim için bir dost gibisiniz.',
  'Bu kafe benim ikinci evim oldu. Kocaman teşekkürler!',
];

export class Life {
  /** @param {import('./game.js').Game} game */
  constructor(game, cfg = LIFE, rng = Math.random) {
    this.game = game;
    this.cfg = cfg;
    this.rng = rng;
    game.life = this;
    this.reset();
  }

  reset() {
    this.menu = { date: null, product: null };        // dish of the day
    this.letters = [];                                // newest first: { id, from, text, gift, read, claimed, t }
    this.nextLetter = 1;
    this.lettersToday = { date: null, n: 0 };
    this.criticToday = null;                          // date a critic already came (one a day)
    this.critics = 0;                                 // critics served (lifetime)
    this.order = null;                                // the special order: { id, items: {product: n}, reward, until }
    this.orderRest = 0;                               // ms timestamp before which no new special order appears
    this.ordersDone = 0;
    this.nextOrder = 1;
  }

  today() { return dateKey(this.game.clock()); }
  level() { return this.game.progression?.level ?? 1; }
  stage() { return this.game.shop?.stageId ?? 1; }
  unlocked() { return Object.keys(this.game.productsDef).filter((id) => this.game.isUnlocked(id)); }

  // ---- dish of the day ---------------------------------------------------------------------------------------------
  /** Today's dish, or null when none is picked yet today (yesterday's pick has run out). */
  dish() { return this.menu.date === this.today() && this.menu.product && this.game.isUnlocked(this.menu.product) ? this.menu.product : null; }
  /** Picks (or changes) today's dish. */
  setDish(id) {
    if (!this.game.productsDef[id] || !this.game.isUnlocked(id)) return { ok: false, message: 'Bu ürün henüz açılmadı.' };
    this.menu = { date: this.today(), product: id };
    this.game.emit('change', { type: 'menu', product: id });
    return { ok: true };
  }

  // ---- deal of the day ---------------------------------------------------------------------------------------------
  /** The Market ingredient that is cheaper today (changes every day, the same all day). */
  deal(items = this.game.marketDef.items) {
    if (!this.cfg.deals || !items.length) return null;
    const n = dayNumber(this.today());
    return items[((Number.isFinite(n) ? n : 0) % items.length + items.length) % items.length];
  }
  /** Price of one unit of an ingredient today (the deal is applied here only). */
  price(id) {
    const base = this.game.ingredientsDef[id].price;
    return id === this.deal() ? Math.max(1, Math.round(base * (1 - this.cfg.deals.off))) : base;
  }

  // ---- letters -----------------------------------------------------------------------------------------------------
  unread() { return this.letters.filter((l) => !l.read || (l.gift && !l.claimed)).length; }
  addLetter(from, text, gift = 0) {
    const l = { id: this.nextLetter++, from, text, gift: Math.max(0, Math.round(gift)), read: false, claimed: false, t: this.game.clock() };
    this.letters.unshift(l);
    // the inbox keeps `max` letters; an unclaimed gift is never dropped before older read letters
    while (this.letters.length > this.cfg.letters.max) {
      const i = this.letters.map((x) => !x.gift || x.claimed).lastIndexOf(true);
      this.letters.splice(i >= 0 ? i : this.letters.length - 1, 1);
    }
    this.game.emit('letter', l);
    this.game.emit('change', { type: 'letter' });
    return l;
  }
  /** Marks a letter read and pays its gift (once). */
  open(id) {
    const l = this.letters.find((x) => x.id === id);
    if (!l) return { ok: false, message: 'Mektup bulunamadı.' };
    l.read = true;
    let gold = 0;
    if (l.gift && !l.claimed) { l.claimed = true; gold = this.game.earn(l.gift, 'letter', `Mektup hediyesi: ${l.from}`); }
    this.game.emit('change', { type: 'letterRead' });
    return { ok: true, gold };
  }
  /** After a happy sale: maybe a short note from that guest (at most `perDay` a day). */
  maybeLetter(look, product) {
    const c = this.cfg.letters, d = this.today();
    if (this.lettersToday.date !== d) this.lettersToday = { date: d, n: 0 };
    if (this.lettersToday.n >= c.perDay || this.rng() >= c.chance) return null;
    this.lettersToday.n++;
    const text = LETTERS[Math.floor(this.rng() * LETTERS.length)].replace('{product}', this.game.productsDef[product]?.name ?? 'Kahveniz');
    const gift = this.rng() < c.giftChance ? c.gift[0] + Math.floor(this.rng() * (c.gift[1] - c.gift[0] + 1)) : 0;
    return this.addLetter(ALBUM.names[look] ?? 'Bir müşteri', text, gift);
  }
  /** A guest's friendship grew a heart: they write about it. */
  heartLetter(look, hearts) { return this.addLetter(ALBUM.names[look] ?? 'Bir müşteri', `${'♥'.repeat(hearts)}  ${HEART_LETTERS[Math.min(HEART_LETTERS.length, hearts) - 1]}`); }

  // ---- the food critic ---------------------------------------------------------------------------------------------
  /** Whether a guest arriving now should secretly be a critic (one random number, drawn only when one can come today). */
  rollCritic() {
    const c = this.cfg.critic;
    if (!c || this.level() < c.minLevel || this.criticToday === this.today()) return false;
    if (this.rng() >= c.chance) return false;
    this.criticToday = this.today();
    return true;
  }
  /** Reward of a critic served happily: gold (grows with the stage) and gems; a review arrives as a letter. */
  criticServed(look, fast) {
    const c = this.cfg.critic, gold = Math.round((c.gold + c.perStage * (this.stage() - 1)) * (fast ? 1.5 : 1));
    this.critics++;
    const paid = this.game.earn(gold, 'critic', 'Gizemli eleştirmen');
    if (c.gems) this.game.player.gems = (this.game.player.gems ?? 0) + c.gems;
    this.addLetter('Gizemli Eleştirmen', fast ? '★★★★★  Sıcacık, hızlı ve gülümseyerek servis. Kasabanın en iyi kafesi!' : '★★★★  Lezzetli ve huzurlu. Servis biraz daha hızlı olabilirdi ama yine geleceğim.');
    this.game.emit('critic', { look, gold: paid, gems: c.gems, fast });
    return { gold: paid, gems: c.gems };
  }

  // ---- special order board -----------------------------------------------------------------------------------------
  /** The current special order with its state, rolling a new one when it is time (null below the level or while resting). */
  special() {
    const c = this.cfg.orders, now = this.game.clock();
    if (!c || this.level() < c.minLevel) return null;
    if (this.order && now > this.order.until) { this.order = null; this.orderRest = now + c.restMin * MIN; }     // ran out: no penalty, a new one soon
    if (!this.order && now >= this.orderRest) this.order = this.makeOrder(now);
    if (!this.order) return { resting: true, left: Math.max(0, this.orderRest - now) };
    const items = Object.entries(this.order.items).map(([id, n]) => ({ id, need: n, have: Math.min(n, this.game.products[id] ?? 0) }));
    return { ...this.order, items, ready: items.every((i) => i.have >= i.need), left: Math.max(0, this.order.until - now) };
  }
  makeOrder(now) {
    const ids = this.unlocked();
    if (!ids.length) return null;
    const c = this.cfg.orders, pick = [];
    const first = Math.floor(this.rng() * ids.length);                        // two different products, without a retry loop
    pick.push(ids[first]);
    if (ids.length > 1) pick.push(ids[(first + 1 + Math.floor(this.rng() * (ids.length - 1))) % ids.length]);
    const items = {}, cap = Math.max(2, Math.min(8, this.game.showcaseLimit()));
    for (const id of pick) items[id] = Math.max(2, Math.min(cap, 2 + Math.floor(this.rng() * (2 + this.stage()))));
    const value = Object.entries(items).reduce((s, [id, n]) => s + this.game.unitEconomics(id).customer * n, 0);
    const who = ['Okul gezisi', 'Kitapçının kutlaması', 'Komşunun doğum günü', 'Kasaba şenliği', 'Çiçekçinin toplantısı', 'Pazar kahvaltısı'][Math.floor(this.rng() * 6)];
    return { id: this.nextOrder++, who, items, reward: Math.round(value * c.reward), until: now + c.hours * HOUR };
  }
  /** Delivers the special order from stock (one atomic step: stock, gold, XP, a new order after a short rest). */
  deliverSpecial() {
    const s = this.special();
    if (!s || s.resting) return { ok: false, message: 'Şu an özel sipariş yok.' };
    if (!s.ready) return { ok: false, message: `Eksik: ${s.items.filter((i) => i.have < i.need).map((i) => `${i.need - i.have} ${this.game.productsDef[i.id].name}`).join(', ')}.` };
    for (const i of s.items) this.game.products[i.id] -= i.need;
    for (const i of s.items) this.game.recordSold(i.id, i.need);
    const gold = this.game.earn(s.reward, 'order', `Özel sipariş: ${s.who}`);
    this.game.progression?.gain?.(this.cfg.orders.xp);
    this.ordersDone++;
    this.order = null;
    this.orderRest = this.game.clock() + this.cfg.orders.restMin * MIN;
    this.game.emit('change', { type: 'order', gold });
    return { ok: true, gold, who: s.who };
  }

  // ---- persistence -------------------------------------------------------------------------------------------------
  exportState() {
    return {
      menu: { ...this.menu }, letters: this.letters.map((l) => ({ ...l })), nextLetter: this.nextLetter, lettersToday: { ...this.lettersToday },
      criticToday: this.criticToday, critics: this.critics, order: this.order ? { ...this.order, items: { ...this.order.items } } : null, orderRest: this.orderRest, ordersDone: this.ordersDone, nextOrder: this.nextOrder,
    };
  }
  importState(s) {
    this.reset();
    if (!s) return;
    Object.assign(this, { menu: s.menu, letters: s.letters, nextLetter: s.nextLetter, lettersToday: s.lettersToday, criticToday: s.criticToday, critics: s.critics, order: s.order, orderRest: s.orderRest, ordersDone: s.ordersDone, nextOrder: s.nextOrder });
  }
}

/** Sanitizes saved café-life data; never throws (anything odd falls back to the default). */
export function validateLife(raw, game) {
  const date = (d) => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  const str = (t, n) => (typeof t === 'string' ? t.slice(0, n) : '');
  if (!raw || typeof raw !== 'object') return null;
  const letters = (Array.isArray(raw.letters) ? raw.letters : []).filter((l) => l && isInt(l.id) && typeof l.text === 'string').slice(0, LIFE.letters.max)
    .map((l) => ({ id: l.id, from: str(l.from, 40), text: str(l.text, 200), gift: isInt(l.gift, 1e6) ? l.gift : 0, read: l.read === true, claimed: l.claimed === true, t: isInt(l.t, 1e14) ? l.t : 0 }));
  let order = null;
  if (raw.order && typeof raw.order === 'object' && raw.order.items && typeof raw.order.items === 'object') {
    const items = Object.fromEntries(Object.entries(raw.order.items).filter(([id, n]) => game.productsDef[id] && isInt(n, 1000) && n > 0));
    if (Object.keys(items).length && isInt(raw.order.reward, 1e9) && isInt(raw.order.until, 1e14)) order = { id: isInt(raw.order.id) ? raw.order.id : 1, who: str(raw.order.who, 40) || 'Özel sipariş', items, reward: raw.order.reward, until: raw.order.until };
  }
  const maxId = Math.max(0, ...letters.map((l) => l.id));
  return {
    menu: { date: date(raw.menu?.date), product: game.productsDef[raw.menu?.product] ? raw.menu.product : null },
    letters, nextLetter: isInt(raw.nextLetter) && raw.nextLetter > maxId ? raw.nextLetter : maxId + 1,
    lettersToday: { date: date(raw.lettersToday?.date), n: isInt(raw.lettersToday?.n, 100) ? raw.lettersToday.n : 0 },
    criticToday: date(raw.criticToday), critics: isInt(raw.critics) ? raw.critics : 0,
    order, orderRest: isInt(raw.orderRest, 1e14) ? raw.orderRest : 0, ordersDone: isInt(raw.ordersDone) ? raw.ordersDone : 0, nextOrder: isInt(raw.nextOrder) && raw.nextOrder > 0 ? raw.nextOrder : (order ? order.id + 1 : 1),
  };
}
