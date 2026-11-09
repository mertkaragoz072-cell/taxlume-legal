// The robot player used by scripts/simulate-economy.mjs and tests/simulation.test.js: plays the real game rules (no UI) for several days.
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
import { CAFE } from '../src/data/economy.js';


/** Plays `days` days of `minutes` minutes each and returns one row per day: { day, sold, gold, stage, level, income:{source:gold}, total }. */
export function runSimulation({ days = 7, minutes = 30, seed: seedArg = 1, bonuses = true } = {}) {
let seed = seedArg;
const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const clock = { now: new Date(2025, 2, 10, 12, 0).getTime() };

const player = { gold: 54320, gems: 0 };
const game = new Game(player, {}, () => clock.now);
new Progression(game); new Town(game); new Exploration(game, { rng }); new Research(game);
const shop = new Shop(game), quests = new Quests(game), daily = new DailyReward(game), till = new Till(game), goals = new DailyGoals(game);
const cafe = new Cafe(game, { rng, config: bonuses ? CAFE : { ...CAFE, bonuses: null } });
new Album(game, cafe.looks);

const earned = {};                                           // gold by source
const realEarn = game.earn.bind(game);
game.earn = (amount, source, label) => { const paid = realEarn(amount, source, label); earned[source] = (earned[source] ?? 0) + paid; return paid; };

const seenAt = new Map();                                    // order id -> when the robot first saw it
const WALK = 7;                                              // seconds the waiter needs from seeing an order to delivering it
function serve() {
  for (const o of cafe.openOrders()) {
    if (!seenAt.has(o.id)) seenAt.set(o.id, clock.now);
    const c = cafe.customers.find((x) => x.orderId === o.id);
    if (c && c.state === 'seated' && game.products[o.product] > 0 && clock.now - seenAt.get(o.id) >= WALK * 1000) cafe.deliver(o.id);
  }
}
function produce() {
  const wanted = new Set(cafe.openOrders().map((o) => o.product));
  const ids = Object.keys(game.productsDef).filter((id) => game.isUnlocked(id));
  for (const station of Object.keys(game.stationsDef)) {
    for (let guard = 0; guard < 6 && (game.jobs[station]?.length ?? 0) < game.maxCapacity(station); guard++) {
      const mine = ids.filter((id) => game.productsDef[id].station === station);
      mine.sort((a, b) => (wanted.has(b) - wanted.has(a)) || game.products[a] - game.products[b] || game.productsDef[b].price - game.productsDef[a].price);
      const pick = mine.find((id) => game.products[id] < 4) ?? null;
      if (!pick) break;
      let r = game.startProduction(pick);
      if (!r.ok) {                                          // short of ingredients: buy what is missing, once
        for (const [ing, n] of Object.entries(game.productsDef[pick].ingredients)) { const need = n - game.ingredients[ing]; if (need > 0) game.buyIngredient(ing, need + 4); }
        r = game.startProduction(pick);
      }
      if (!r.ok) break;
    }
  }
}
function shopping() {
  for (let i = 0; i < 4; i++) {
    const g = shop.nextGoal();
    if (g.kind !== 'ready' || !g.item) break;
    if (!shop.buy(g.item.id).ok) break;
  }
  for (const q of quests.claimable()) quests.claim(q.def.id);
  for (const g of goals.claimable()) goals.claim(g.id);
}
const stats = [];
for (let day = 1; day <= days; day++) {
  const before = { ...earned }, goldBefore = player.gold, soldBefore = game.stats.soldTotal;
  if (daily.status().canClaim) daily.claim();
  till.collect();
  cafe.setActive(true); game.tick();
  for (let s = 0; s < minutes * 60; s++) {
    clock.now += 1000; game.tick(); serve();
    if (s % 5 === 0) produce();
    if (s % 60 === 0) shopping();
  }
  cafe.setActive(false);
  const row = { day, sold: game.stats.soldTotal - soldBefore, gold: Math.round(player.gold), stage: shop.stageId, level: game.progression.level, income: {} };
  for (const [k, v] of Object.entries(earned)) row.income[k] = v - (before[k] ?? 0);
  row.total = Object.values(row.income).reduce((a, b) => a + b, 0);
  stats.push(row);
  clock.now += 24 * 3600 * 1000 - minutes * 60 * 1000;      // the rest of the day away (the till collects)
  game.tick();
}
return stats;
}
