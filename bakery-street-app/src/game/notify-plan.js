// Which phone reminders to schedule when the player leaves the app: the machines finishing their work, the exploration coming back, the till
// filling up, the special order running out. Pure (reads the game only), so it is unit-tested; src/runtime/notify.ts schedules what this returns.
// Quiet by design: at most one reminder of each kind, nothing sooner than a minute, nothing at night (it moves to 9:00).

const MIN_SEC = 60;

/** Seconds until every job (running and waiting) at `station` is done, or 0 when the machine is idle. */
export function stationDoneIn(game, station) {
  const jobs = game.jobsOf(station), q = game.queueOf?.(station) ?? [];
  if (!jobs.length && !q.length) return 0;
  const cap = Math.max(1, game.capacity(station));
  const ends = jobs.map((j) => game.remainingOf(j)).sort((a, b) => a - b);
  while (ends.length < cap) ends.push(0);
  for (const id of q) { ends.sort((a, b) => a - b); ends[0] += game.duration(id); }       // a waiting job starts in the first slot to come free
  return Math.max(...ends);
}

/** Moves a reminder that would ring between 22:00 and 9:00 to 9:00 (the player is resting). */
export function quietHours(atMs) {
  const d = new Date(atMs), h = d.getHours();
  if (h >= 9 && h < 22) return atMs;
  const m = new Date(atMs); if (h >= 22) m.setDate(m.getDate() + 1);
  m.setHours(9, 0, 0, 0);
  return m.getTime();
}

/** [{ id, seconds, title, body }] to schedule now. */
export function planNotifications(game, now = game.clock()) {
  const out = [];
  const add = (id, sec, title, body) => {
    if (!(sec >= MIN_SEC)) return;
    const at = quietHours(now + sec * 1000);
    out.push({ id, seconds: Math.round((at - now) / 1000), title, body });
  };
  const names = { oven: 'Fırındakiler hazır', coffee: 'Kahveler hazır', counter: 'Tezgâhtakiler hazır' };
  for (const st of Object.keys(game.stationsDef)) add(`station-${st}`, stationDoneIn(game, st), `${names[st] ?? 'Üretim bitti'} 🥐`, 'Vitrin dolu, müşteriler seni bekliyor.');
  const ex = game.exploration;
  if (ex?.active) add('explore', ex.remaining(), 'Keşif döndü 🗺', `${ex.active.region?.name ?? 'Keşif'} dönüşü: ödülün seni bekliyor.`);
  const till = game.till;
  if (till) add('till', till.cfg.capMinutes * 60, 'Kasa doldu 💰', 'Sen yokken kasada para birikti, toplamaya gel.');
  const o = game.life?.order;
  if (o && o.until - now > 45 * 60_000) add('order', (o.until - now) / 1000 - 30 * 60, 'Özel sipariş bitmek üzere 📦', `${o.who} siparişi için yarım saat kaldı.`);
  return out;
}
