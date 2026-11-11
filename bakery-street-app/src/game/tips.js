// First-steps hints for a new player: one short hint at a time, each one gone as soon as the player has done it. Pure (reads the game only),
// so nothing is stored: a player who already did a step never sees its hint. They can be switched off in the settings (tips).

export const TIPS = [
  { id: 'produce', area: 'oven', text: 'Fırına dokun ve bir ekmek üret.', done: (g) => g.stats.producedTotal > 0 || Object.keys(g.jobs).length > 0 },
  { id: 'serve', area: null, text: 'Müşteri oturunca garson siparişi götürür. Acelen varsa müşteriye dokunup kendin de servis edebilirsin.', done: (g) => g.stats.soldTotal > 0 },
  { id: 'quest', area: null, text: 'Bir görev tamamlandı! Sağ üstteki menüden Görevler\'e gir ve ödülünü al.', show: (g) => (g.quests?.claimable().length ?? 0) > 0, done: (g) => (g.quests?.claimed.size ?? 1) > 0 },
  { id: 'shop', area: null, text: 'Kafeni büyüt: alttaki Mağaza\'dan ilk eşyanı al.', done: (g) => (g.stats.shopBought ?? 0) > 0 },
];

/** The hint to show now, or null (every step done, or the next one cannot be done yet). */
export function currentTip(game, tips = TIPS) {
  for (const t of tips) {
    if (t.done(game)) continue;
    if (t.show && !t.show(game)) continue;
    return t;
  }
  return null;
}
