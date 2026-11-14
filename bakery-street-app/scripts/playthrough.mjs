// A whole playthrough, from a new game to the end of the content, by a robot that uses EVERY system the way a player would:
// production, service, the shop (equipment, decoration placed, recipes, expansion, specials), café upgrades, the town (Bookshop), research,
// exploration, quests, daily goals, the weekly goal, the daily reward and the till. It plays `minutes` a day and records when each milestone
// is reached and what is still out of reach at the end, so a dead end (something that can never be bought or reached) shows up.
//   node scripts/playthrough.mjs [days=30] [minutesPerDay=30] [seed=1]
import { Game } from '../src/game/game.js';
import { Progression } from '../src/game/progression.js';
import { Town } from '../src/game/town.js';
import { Exploration } from '../src/game/exploration.js';
import { Research } from '../src/game/research.js';
import { Shop } from '../src/game/shop.js';
import { Quests } from '../src/game/quests.js';
import { DailyReward } from '../src/game/daily.js';
import { Till } from '../src/game/till.js';
import { DailyGoals } from '../src/game/goals.js';
import { Cafe } from '../src/game/customers.js';
import { Album } from '../src/game/album.js';

export function playthrough({ days = 30, minutes = 30, seed: s0 = 1 } = {}) {
  let seed = s0 * 7919;
  const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const clock = { now: new Date(2025, 2, 10, 18, 0).getTime() };
  const game = new Game({ gold: 54320, gems: 0 }, {}, () => clock.now);
  const prog = new Progression(game), town = new Town(game), ex = new Exploration(game, { rng }), research = new Research(game);
  const shop = new Shop(game), quests = new Quests(game), daily = new DailyReward(game), till = new Till(game), goals = new DailyGoals(game);
  const cafe = new Cafe(game, { rng }); const album = new Album(game, cafe.looks);
  const log = [], seen = new Set();
  const mile = (key, text) => { if (!seen.has(key)) { seen.add(key); log.push({ day: curDay, min: Math.round(curMin), text }); } };
  let curDay = 0, curMin = 0;
  game.on('stage', ({ stage }) => mile(`stage${stage.id}`, `Aşama ${stage.id}: ${stage.name}`));
  game.on('levelUp', (e) => { if (e.level % 5 === 0 || e.level === prog.maxLevel) mile(`lv${e.level}`, `Seviye ${e.level}`); });
  const seenAt = new Map();
  const serve = () => {
    for (const o of cafe.openOrders()) {
      if (!seenAt.has(o.id)) seenAt.set(o.id, clock.now);
      if (game.products[o.product] > 0 && clock.now - seenAt.get(o.id) >= 7000) cafe.deliver(o.id);
    }
  };
  const produce = () => {
    const wanted = new Set(cafe.openOrders().map((o) => o.product));
    const ids = Object.keys(game.productsDef).filter((id) => game.isUnlocked(id));
    for (const st of Object.keys(game.stationsDef)) {
      for (let g = 0; g < 8 && (game.jobs[st]?.length ?? 0) < game.capacity(st); g++) {
        const mine = ids.filter((id) => game.productsDef[id].station === st).sort((a, b) => (wanted.has(b) - wanted.has(a)) || game.products[a] - game.products[b]);
        const pick = mine.find((id) => game.products[id] < 5); if (!pick) break;
        let r = game.startProduction(pick);
        if (!r.ok && r.reason === 'ingredients') { for (const [ing, n] of Object.entries(game.productsDef[pick].ingredients)) { const need = n - game.ingredients[ing]; if (need > 0) game.buyIngredient(ing, need + 6, true); } r = game.startProduction(pick); }
        if (!r.ok) break;
      }
    }
  };
  const spend = () => {                                     // a sensible player: keep a small reserve for ingredients, buy what opens next
    const reserve = 400;
    for (let i = 0; i < 6; i++) { const g = shop.nextGoal(); if (g.kind !== 'ready' || !g.item || game.gold - g.price < reserve) break; if (!shop.buy(g.item.id).ok) break; mile(`buy:${g.item.id}`, null); }
    for (const id of Object.keys(game.upgradesDef)) { const c = game.nextCost(id); if (c != null && game.gold - c > reserve * 3) game.buyUpgrade(id); }
    for (const b of town.list()) if (b.status === 'available' && game.gold > (b.need?.gold ?? 0) + reserve) { if (town.open(b.def.id).ok) mile(`open:${b.def.id}`, `${b.def.name} açıldı`); }
    if (town.isOpen('bookshop')) { town.develop('bookshop'); for (const id of research.ids()) { const c = research.nextCost(id); if (c != null && game.gold - c > reserve * 3) research.buy(id); } }
    for (const q of quests.claimable()) quests.claim(q.def.id);
    for (const g of goals.claimable()) (g.id.startsWith('w') ? goals.claimWeekly() : goals.claim(g.id));
    if (ex.isReady()) ex.claim();
    if (!ex.active) { const open = ex.list().filter((r) => r.status === 'available' || r.status === 'idle' || r.missing.length === 0); const r = open[open.length - 1]; if (r) ex.start(r.def.id); }
  };
  const days_ = [];
  for (let d = 1; d <= days; d++) {
    curDay = d;
    if (daily.status().canClaim) daily.claim();
    till.settle(); till.collect();
    cafe.setActive(true); game.tick();
    const sold0 = game.stats.soldTotal, earned0 = game.stats.goldEarned;
    for (let sec = 0; sec < minutes * 60; sec++) {
      curMin = sec / 60;
      clock.now += 1000; game.tick(); serve();
      if (sec % 5 === 0) produce();
      if (sec % 30 === 0) spend();
    }
    cafe.setActive(false);
    days_.push({ day: d, gold: Math.round(game.gold), earned: game.stats.goldEarned - earned0, sold: game.stats.soldTotal - sold0, level: prog.level, stage: shop.stageId, owned: shop.owned.size });
    clock.now += 24 * 3600_000 - minutes * 60_000; game.tick();
  }
  const total = shop.items.filter((x) => x.category !== 'ingredients' && x.kind !== 'upgrade').length;
  const left = shop.items.filter((x) => x.category !== 'ingredients' && !shop.has(x.id) && shop.status(x.id) !== 'owned').map((x) => ({ id: x.id, status: shop.status(x.id), why: shop.conditions(x.id).filter((c) => !c.ok).map((c) => c.text) }));
  const upgradesLeft = Object.keys(game.upgradesDef).filter((id) => game.nextCost(id) != null);
  const researchLeft = research.ids().filter((id) => research.nextCost(id) != null);
  const questsLeft = quests.list().filter((q) => !q.claimed).map((q) => `${q.def.id} ${q.progress}/${q.def.target}`);
  return { days: days_, log: log.filter((l) => l.text), end: { level: prog.level, stage: shop.stageId, owned: `${shop.owned.size}/${total}`, gold: Math.round(game.gold), album: `${album.count()}/${album.looks.length}`, bookshop: town.isOpen('bookshop') ? town.level('bookshop') : 'kapalı', explorations: Object.values(ex.done).reduce((a, b) => a + b, 0) }, left, upgradesLeft, researchLeft, questsLeft };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [days = 30, minutes = 30, seed = 1] = process.argv.slice(2).map(Number);
  const r = playthrough({ days, minutes, seed });
  console.log(`Oyun sonu (${days} gün × ${minutes} dk):`, JSON.stringify(r.end));
  console.log('\nKilometre taşları:'); for (const l of r.log) console.log(`  gün ${String(l.day).padStart(2)} (${String(l.min).padStart(2)}. dk)  ${l.text}`);
  console.log('\nGünlük:'); for (const d of r.days) console.log(`  gün ${String(d.day).padStart(2)}  kazanç ${String(d.earned).padStart(6)}  satış ${String(d.sold).padStart(3)}  altın ${String(d.gold).padStart(7)}  seviye ${d.level}  aşama ${d.stage}  eşya ${d.owned}`);
  console.log('\nAlınamayanlar:'); for (const x of r.left) console.log(`  ${x.id} (${x.status}): ${x.why.join(', ')}`);
  console.log('Geliştirme kalan:', r.upgradesLeft.join(', ') || '-'); console.log('Araştırma kalan:', r.researchLeft.join(', ') || '-'); console.log('Görev kalan:', r.questsLeft.join(', ') || '-');
}
