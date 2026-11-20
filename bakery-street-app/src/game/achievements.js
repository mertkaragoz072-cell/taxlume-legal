// Achievements: long-term milestones read from what the game already counts (stats, album, shop, life). Each one is collected once by hand,
// for gold and sometimes gems. Pure logic; the progress is never stored, only which ones were collected.

const s = (k) => (g) => (g.branch ? g.branch.total(k) : g.stats[k] ?? 0);              // lifetime: every branch counts
const sold = (id) => (g) => (g.branch ? g.branch.total(`sold.${id}`) : g.stats.sold?.[id] ?? 0);
const hearts = (g) => (g.album ? g.album.looks.reduce((n, l) => n + g.album.heartsOf(l), 0) : 0);
const fullFriends = (g) => (g.album ? g.album.looks.filter((l) => g.album.heartsOf(l) >= 5).length : 0);
const maxedDecor = (g) => (g.shop ? g.shop.items.filter((d) => d.kind === 'decor' && g.shop.owned.has(d.id) && g.shop.levelable?.(d) && g.shop.itemLevel(d.id) >= 5).length : 0);

/** id, name, icon, how far (value), target, reward. Grouped into tiers so there is always a next one in sight. */
export const ACHIEVEMENTS = [
  { id: 'sold50', name: 'İlk Müdavimler', icon: '🧾', text: 'ürün sat', value: s('soldTotal'), target: 50, gold: 150 },
  { id: 'sold500', name: 'Mahallenin Kafesi', icon: '🧾', text: 'ürün sat', value: s('soldTotal'), target: 500, gold: 750, gems: 3 },
  { id: 'sold3000', name: 'Kasabanın Gururu', icon: '🏆', text: 'ürün sat', value: s('soldTotal'), target: 3000, gold: 3000, gems: 10 },
  { id: 'bread100', name: 'Ekmek Ustası', icon: '🍞', text: 'ekmek sat', value: sold('bread'), target: 100, gold: 300 },
  { id: 'croissant100', name: 'Kruvasan Sanatçısı', icon: '🥐', text: 'kruvasan sat', value: sold('croissant'), target: 100, gold: 450 },
  { id: 'coffee100', name: 'Kahve Sever', icon: '☕', text: 'kahve sat', value: sold('coffee'), target: 100, gold: 350 },
  { id: 'cake50', name: 'Pasta Şefi', icon: '🍰', text: 'pasta sat', value: sold('cake'), target: 50, gold: 600 },
  { id: 'made1000', name: 'Fırın Hiç Sönmez', icon: '🔥', text: 'ürün üret', value: s('producedTotal'), target: 1000, gold: 1000, gems: 3 },
  { id: 'combo8', name: 'Seri Servis', icon: '⚡', text: 'satışlık seri yap', value: s('bestCombo'), target: 8, gold: 250 },
  { id: 'fav50', name: 'Gönül Avcısı', icon: '♥', text: 'kez favori sun', value: s('favoritesServed'), target: 50, gold: 450 },
  { id: 'hearts10', name: 'Dost Kafe', icon: '💛', text: 'dostluk kalbi doldur', value: hearts, target: 10, gold: 400 },
  { id: 'friend1', name: 'Can Dostu', icon: '💖', text: 'müşteriyle tam dost ol (5 kalp)', value: fullFriends, target: 1, gold: 500, gems: 3 },
  { id: 'friendAll', name: 'Herkesin Dostu', icon: '💞', text: 'müşteriyle tam dost ol', value: fullFriends, target: 8, gold: 2500, gems: 10 },
  { id: 'earn50k', name: 'Dolu Kasa', icon: '💰', text: 'altın kazan', value: s('goldEarned'), target: 50000, gold: 1250, gems: 5 },
  { id: 'shop10', name: 'Tatlı Yuva', icon: '🪴', text: 'mağaza eşyası al', value: s('shopBought'), target: 10, gold: 400 },
  { id: 'decor5', name: 'Göz Alıcı', icon: '✨', text: 'dekorasyonu 5. seviyeye çıkar', value: maxedDecor, target: 1, gold: 600, gems: 3 },
  { id: 'explore10', name: 'Gezgin Kedi', icon: '🗺', text: 'keşif tamamla', value: s('explorationsDone'), target: 10, gold: 450 },
  { id: 'critic1', name: 'Eleştirmen Onayı', icon: '🎩', text: 'gizemli eleştirmeni ağırla', value: (g) => g.life?.critics ?? 0, target: 1, gold: 300, gems: 2 },
  { id: 'orders5', name: 'Güvenilir Fırın', icon: '📦', text: 'özel sipariş teslim et', value: (g) => g.life?.ordersDone ?? 0, target: 5, gold: 750, gems: 3 },
  { id: 'pets50', name: 'Sevgi Dolu', icon: '🐾', text: 'kez kedi sev', value: (g) => g.life?.petsTotal ?? 0, target: 50, gold: 300 },
  { id: 'stories3', name: 'Hikâye Anlatıcısı', icon: '📗', text: 'müşteri hikâyesi tamamla', value: (g) => Object.values(g.life?.stories ?? {}).filter((n) => n >= 3).length, target: 3, gold: 800, gems: 3 },
  { id: 'branch1', name: 'Kafeler Zinciri', icon: '🏡', text: 'yeni şube aç', value: (g) => g.branch?.count ?? 0, target: 1, gold: 2000, gems: 10 },
  { id: 'play60', name: 'Huzur Köşesi', icon: '🍵', text: 'dakika kafede vakit geçir', value: (g) => Math.floor(s('playSec')(g) / 60), target: 60, gold: 350 },
];

export class Achievements {
  /** @param {import('./game.js').Game} game */
  constructor(game, defs = ACHIEVEMENTS) {
    this.game = game;
    this.defs = defs.filter((d) => !d.id.match(/^(bread|croissant|coffee|cake)/) || game.productsDef[d.id.replace(/\d+$/, '')]);   // only products this game has
    this.claimed = new Set();
    this.announced = null;             // ids already reported finished (memory only; filled on the first check so a loaded game does not announce old ones)
    game.achievements = this;
    game.on('change', () => this.announce());
  }

  /** Tells the game (event 'achievementComplete') about each achievement that has just been finished. */
  announce() {
    const done = this.list().filter((a) => a.complete && !a.claimed).map((a) => a.def);
    if (!this.announced) { this.announced = new Set(done.map((d) => d.id)); return; }
    for (const d of done) if (!this.announced.has(d.id)) { this.announced.add(d.id); this.game.emit('achievementComplete', { achievement: d }); }
  }

  /** Every achievement with its state: { def, progress (capped), complete, claimed }. */
  list() {
    return this.defs.map((def) => {
      const v = Math.max(0, Math.floor(def.value(this.game) || 0));
      return { def, progress: Math.min(v, def.target), complete: v >= def.target, claimed: this.claimed.has(def.id) };
    });
  }
  claimable() { return this.list().filter((a) => a.complete && !a.claimed); }

  /** Collects one finished achievement (once). */
  claim(id) {
    const a = this.list().find((x) => x.def.id === id);
    if (!a) return { ok: false, message: 'Başarım bulunamadı.' };
    if (a.claimed) return { ok: false, message: 'Bu başarımın ödülü zaten alındı.' };
    if (!a.complete) return { ok: false, message: `${a.def.name}: ${a.progress}/${a.def.target}.` };
    this.claimed.add(id);
    const gold = this.game.earn(a.def.gold ?? 0, 'achievement', `Başarım: ${a.def.name}`);
    if (a.def.gems) this.game.player.gems = (this.game.player.gems ?? 0) + a.def.gems;
    this.game.emit('change', { type: 'achievement', id });
    return { ok: true, gold, gems: a.def.gems ?? 0 };
  }

  exportState() { return { claimed: [...this.claimed] }; }
  importState(state) { this.claimed = new Set(state?.claimed ?? []); this.announced = null; }
}

/** Keeps only known, unique ids; never throws. */
export function validateAchievements(raw, ach) {
  const ids = new Set(ach.defs.map((d) => d.id));
  return { claimed: [...new Set(Array.isArray(raw?.claimed) ? raw.claimed.filter((id) => ids.has(id)) : [])] };
}
