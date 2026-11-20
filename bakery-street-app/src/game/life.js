// Café life: the small daily things around the café that need no new pictures.
//  - dish of the day (the player picks one product a day; Cafe orders it more often and pays a little more for it)
//  - guest letters (an inbox of short notes; some carry a small gift)
//  - the food critic (at most once a day an ordinary-looking guest is a critic; Cafe decides on arrival, this pays the reward)
//  - the special order board (one optional bigger order at a time, delivered from stock)
//  - the Market's deal of the day (one ingredient cheaper; pure, worked out from the date)
// Pure logic, clock from the Game. All gold goes through Game.earn.
import { LIFE, ALBUM } from '../data/economy.js';
import { dateKey, dayNumber } from './daily.js';
import { weekOf, weeklyProduct } from './events.js';

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

/** Guest stories: a title per look; the steps are the same for everyone (visits, favourite, hearts). */
export const STORIES = {
  boy_backpack: 'Okul Yolundaki Mola', girl_basket: 'Piknik Sepeti', oldman: 'Emekli Amcanın Sabahları', boy_cap: 'Şapkalı Çocuğun Sırrı',
  girl_glasses: 'Kitap Kurdunun Köşesi', girl_red: 'Kırmızı Şemsiye', grandma: 'Nine\'nin Tarif Defteri', boy_redcap: 'Küçük Futbolcu',
};
const STORY_END = 'Seninle tanışmak bu kasabadaki en güzel şeydi. Kafen artık benim de evim.';
const THEME_NAMES = { bread: 'Ekmek Şenliği', croissant: 'Kruvasan Haftası', cake: 'Pasta Bayramı', coffee: 'Kahve Haftası', simit: 'Simit Günleri', latte: 'Latte Haftası', cookie: 'Kurabiye Haftası', mocha: 'Mocha Haftası', muffin: 'Muffin Haftası' };

export class Life {
  /** @param {import('./game.js').Game} game */
  constructor(game, cfg = LIFE, rng = Math.random) {
    this.game = game;
    this.cfg = cfg;
    this.rng = rng;
    game.life = this;
    this.reset();
    game.on('stage', ({ stage }) => this.remember('🏆', `Kafe büyüdü: Aşama ${stage.id} — ${stage.name}`));
    game.on('levelUp', ({ level }) => { if (level % 5 === 0) this.remember('⭐', `Seviye ${level}'e ulaştın`); });
    game.on('critic', ({ fast }) => this.remember('🎩', fast ? 'Gizemli eleştirmen geldi ve 5 yıldız verdi' : 'Gizemli eleştirmen geldi ve 4 yıldız verdi'));
    game.on('friend', ({ look, hearts }) => { if (hearts === 1 || hearts === 5) this.remember(hearts === 5 ? '💖' : '💛', hearts === 5 ? `${ALBUM.names[look] ?? 'Bir müşteri'} ile can dostu oldun` : `${ALBUM.names[look] ?? 'Bir müşteri'} ile dostluk başladı`); });
    game.on('album', ({ look, first, completed }) => { if (completed) this.remember('📖', 'Bütün müşterilerle tanıştın'); else if (first && this.memories.length < 3) this.remember('🐱', `İlk kez ${ALBUM.names[look] ?? 'bir müşteri'} geldi`); });
    game.on('change', (e) => { if (e?.type !== 'load') this.rollDay(); if (e?.type === 'sale' && game.stats.soldTotal === 1) this.remember('☕', 'İlk satışını yaptın, kafe açıldı!'); });
  }

  // ---- memories ----------------------------------------------------------------------------------------------------
  /** Adds a line to the memory book (the café's own story; at most 60 kept). */
  remember(icon, text) {
    this.memories.unshift({ t: this.game.clock(), icon, text: String(text).slice(0, 120) });
    if (this.memories.length > 60) this.memories.length = 60;
  }

  // ---- the end of the day ------------------------------------------------------------------------------------------
  counters() {
    const st = this.game.stats, al = this.game.album;
    return { sold: st.soldTotal, earned: st.goldEarned, made: st.producedTotal, per: { ...st.sold }, hearts: al ? al.looks.reduce((n, l) => n + al.heartsOf(l), 0) : 0, critics: this.critics };
  }
  /** On the first change of a new calendar day: the finished day becomes the summary (shown once) and today's counters start. */
  rollDay() {
    const d = this.today();
    if (this.day?.date === d) return false;
    const prev = this.day, now = this.counters();
    if (prev && prev.date < d) {
      const per = Object.entries(now.per).map(([id, n]) => [id, n - (prev.per?.[id] ?? 0)]).sort((a, b) => b[1] - a[1]);
      const sum = { date: prev.date, sold: now.sold - prev.sold, earned: now.earned - prev.earned, made: now.made - prev.made, best: per[0]?.[1] > 0 ? per[0][0] : null, hearts: now.hearts - prev.hearts, critics: now.critics - prev.critics, seen: false };
      if (sum.sold > 0 || sum.made > 0) this.summary = sum;
    }
    this.day = { date: d, ...now };
    return true;
  }
  /** The summary of the last day played, once (null when there is none or it was shown). */
  takeSummary() { const s = this.summary; if (!s || s.seen) return null; s.seen = true; this.game.emit('change', { type: 'summary' }); return s; }

  // ---- petting -----------------------------------------------------------------------------------------------------
  /** The player petted a cat: hearts on screen, and the first few pets of a day pay a little. */
  pet() {
    const c = this.cfg.pet, d = this.today();
    if (this.pets.date !== d) this.pets = { date: d, n: 0 };
    this.pets.n++; this.petsTotal++;
    const gold = c && this.pets.n <= c.paid ? this.game.earn(c.gold, 'pet', 'Kedi sevgisi') : 0;
    if (this.petsTotal === 1) this.remember('🐾', 'İlk kez bir kediyi sevdin');
    this.game.emit('change', { type: 'pet', gold });
    return { gold, left: c ? Math.max(0, c.paid - this.pets.n) : 0 };
  }

  // ---- weekend market ----------------------------------------------------------------------------------------------
  /** True on Saturdays and Sundays. */
  weekendOpen() { const g = new Date(this.game.clock()).getDay(); return g === 0 || g === 6; }
  weekendLeft() { const d = this.today(); return this.cfg.weekend.perDay - (this.weekend.date === d ? this.weekend.n : 0); }
  /** Sells `n` units of `id` at the weekend market (the guest price, no bonuses). */
  sellWeekend(id, n = 1) {
    const def = this.game.productsDef[id];
    if (!this.weekendOpen()) return { ok: false, message: 'Pazar tezgâhı sadece cumartesi ve pazar kurulur.' };
    if (!def || !Number.isSafeInteger(n) || n < 1) return { ok: false, message: 'Geçersiz satış.' };
    const left = this.weekendLeft();
    if (left < 1) return { ok: false, message: 'Bugünkü pazar satışı doldu, yarın yine gel.' };
    n = Math.min(n, left, this.game.products[id]);
    if (n < 1) return { ok: false, message: `Stokta ${def.name} yok.` };
    const d = this.today();
    if (this.weekend.date !== d) this.weekend = { date: d, n: 0 };
    this.weekend.n += n;
    this.game.products[id] -= n;
    const gold = this.game.earn(this.game.unitEconomics(id).customer * n, 'weekend', `Pazar tezgâhı: ${def.name} ×${n}`);
    this.game.recordSold(id, n);
    this.game.emit('change', { type: 'sell', product: id, qty: n });
    return { ok: true, gold, n };
  }

  // ---- guest stories -----------------------------------------------------------------------------------------------
  /** A guest's story with its three steps: { title, steps: [{ text, done, claimed, gold }], next, finished }. */
  story(look) {
    const al = this.game.album, c = this.cfg.stories, e = al?.entry(look), fav = this.game.cafe?.favoriteOf(look), favName = fav ? this.game.productsDef[fav]?.name : 'favorisi';
    const got = this.stories[look] ?? 0;
    const steps = [
      { text: `${c.visits} kez servis et`, done: (e?.served ?? 0) >= c.visits, have: Math.min(c.visits, e?.served ?? 0), need: c.visits },
      { text: `Favorisini sun (${e?.fav ? favName : '?'})`, done: !!e?.fav, have: e?.fav ? 1 : 0, need: 1 },
      { text: `${c.hearts} dostluk kalbine ulaş`, done: (al?.heartsOf(look) ?? 0) >= c.hearts, have: Math.min(c.hearts, al?.heartsOf(look) ?? 0), need: c.hearts },
    ].map((s, i) => ({ ...s, claimed: i < got, gold: c.gold[i] }));
    return { look, title: STORIES[look] ?? 'Müşterinin Hikâyesi', steps, next: got < 3 ? got : null, finished: got >= 3 };
  }
  storiesReady() { return (this.game.album?.looks ?? []).filter((l) => { const s = this.story(l); return s.next != null && s.steps[s.next].done; }).length; }
  /** Collects the next step of a guest's story (in order, once each); the last step brings a letter. */
  claimStory(look) {
    const s = this.story(look);
    if (s.next == null) return { ok: false, message: 'Bu hikâye tamamlandı.' };
    const step = s.steps[s.next];
    if (!step.done) return { ok: false, message: `${s.title}: ${step.text} (${step.have}/${step.need}).` };
    this.stories[look] = s.next + 1;
    const gold = this.game.earn(step.gold, 'story', `${s.title}: ${s.next + 1}. bölüm`);
    if (this.stories[look] === 3) { this.addLetter(ALBUM.names[look] ?? 'Bir müşteri', STORY_END); this.remember('📗', `"${s.title}" hikâyesi tamamlandı`); }
    this.game.emit('change', { type: 'story', look });
    return { ok: true, gold, finished: this.stories[look] === 3 };
  }

  // ---- weekly theme ------------------------------------------------------------------------------------------------
  /** This week's theme: { name, product, target, progress, complete, claimed, gold } (null before any product is unlocked). */
  weekTheme() {
    const c = this.cfg.theme, w = weekOf(this.game.clock()), product = weeklyProduct(this.game);
    if (!c || !product) return null;
    if (this.theme.week !== w || this.theme.product !== product) this.theme = { week: w, product, base: this.game.stats.sold[product] ?? 0, claimed: false };
    const m = this.stage(), target = c.target * m, progress = Math.min(target, Math.max(0, (this.game.stats.sold[product] ?? 0) - this.theme.base));
    return { name: THEME_NAMES[product] ?? `${this.game.productsDef[product].name} Haftası`, product, target, progress, complete: progress >= target, claimed: this.theme.claimed, gold: c.gold * m };
  }
  claimTheme() {
    const t = this.weekTheme();
    if (!t) return { ok: false, message: 'Bu hafta tema yok.' };
    if (t.claimed) return { ok: false, message: 'Bu haftanın ödülü alındı.' };
    if (!t.complete) return { ok: false, message: `${t.name}: ${t.progress}/${t.target}.` };
    this.theme.claimed = true;
    const gold = this.game.earn(t.gold, 'theme', t.name);
    this.remember('🎉', `${t.name} tamamlandı`);
    this.game.emit('change', { type: 'theme' });
    return { ok: true, gold };
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
    this.pets = { date: null, n: 0 };                  // cats petted today
    this.petsTotal = 0;
    this.day = null;                                  // today's starting counters: { date, sold, earned, made, per: {product: sold}, hearts, critics }
    this.summary = null;                              // the last finished day, shown once: { date, sold, earned, made, best, hearts, critics, seen }
    this.memories = [];                               // newest first: { t, icon, text } (the café's story)
    this.weekend = { date: null, n: 0 };              // units sold at the weekend market today
    this.stories = {};                                // look -> steps collected (0..3)
    this.theme = { week: null, base: 0, claimed: false };
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
      pets: { ...this.pets }, petsTotal: this.petsTotal, day: this.day ? { ...this.day, per: { ...this.day.per } } : null, summary: this.summary ? { ...this.summary } : null,
      memories: this.memories.map((m) => ({ ...m })), weekend: { ...this.weekend }, stories: { ...this.stories }, theme: { ...this.theme },
    };
  }
  importState(s) {
    this.reset();
    if (!s) return;
    Object.assign(this, { menu: s.menu, letters: s.letters, nextLetter: s.nextLetter, lettersToday: s.lettersToday, criticToday: s.criticToday, critics: s.critics, order: s.order, orderRest: s.orderRest, ordersDone: s.ordersDone, nextOrder: s.nextOrder });
    for (const k of ['pets', 'petsTotal', 'day', 'summary', 'memories', 'weekend', 'stories', 'theme']) if (s[k] !== undefined) this[k] = s[k];
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
    pets: { date: date(raw.pets?.date), n: isInt(raw.pets?.n, 1e6) ? raw.pets.n : 0 }, petsTotal: isInt(raw.petsTotal) ? raw.petsTotal : 0,
    day: counters(raw.day, true), summary: counters(raw.summary, false),
    memories: (Array.isArray(raw.memories) ? raw.memories : []).filter((m) => m && typeof m.text === 'string').slice(0, 60).map((m) => ({ t: isInt(m.t, 1e14) ? m.t : 0, icon: str(m.icon, 4) || '•', text: str(m.text, 120) })),
    weekend: { date: date(raw.weekend?.date), n: isInt(raw.weekend?.n, 1e4) ? raw.weekend.n : 0 },
    stories: Object.fromEntries(Object.entries(raw.stories && typeof raw.stories === 'object' ? raw.stories : {}).filter(([l, n]) => ALBUM.names[l] && isInt(n, 4))),
    theme: { week: Number.isInteger(raw.theme?.week) ? raw.theme.week : null, product: game.productsDef[raw.theme?.product] ? raw.theme.product : undefined, base: isInt(raw.theme?.base) ? raw.theme.base : 0, claimed: raw.theme?.claimed === true },
  };
  function counters(c, isDay) {
    if (!c || typeof c !== 'object' || !date(c.date)) return null;
    const n = (k) => (Number.isInteger(c[k]) && Math.abs(c[k]) < 1e12 ? c[k] : 0);
    const out = { date: c.date, sold: n('sold'), earned: n('earned'), made: n('made'), hearts: n('hearts'), critics: n('critics') };
    if (isDay) out.per = Object.fromEntries(Object.entries(c.per && typeof c.per === 'object' ? c.per : {}).filter(([id, v]) => game.productsDef[id] && isInt(v)));
    else { out.best = game.productsDef[c.best] ? c.best : null; out.seen = c.seen === true; }
    return out;
  }
}
