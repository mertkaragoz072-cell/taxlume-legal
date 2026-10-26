// Prints the shop catalogue with prices, gates and rough payback times, so the balance can be reviewed (and the docs table regenerated):
//   node scripts/balance-shop.mjs            -> markdown table on stdout
// The numbers come only from src/data/economy.js. The income model is deliberately simple and stated below.
import { SHOP_ITEMS, PRODUCTS, RECIPES, INGREDIENTS, CAFE, APPEAL, UPGRADES } from '../src/data/economy.js';

const cost = (p) => Object.entries(p.ingredients).reduce((s, [i, n]) => s + n * INGREDIENTS[i].price, 0);
const net = (p) => p.price - cost(p);
const all = { ...PRODUCTS, ...RECIPES };
const weights = CAFE.orderWeights;
const base = Object.keys(PRODUCTS);
const aov = (ids) => ids.reduce((s, id) => s + weights[id] * all[id].price, 0) / ids.reduce((s, id) => s + weights[id], 0);
const aovNet = (ids) => ids.reduce((s, id) => s + weights[id] * net(all[id]), 0) / ids.reduce((s, id) => s + weights[id], 0);

const gap = (CAFE.spawnEverySec[0] + CAFE.spawnEverySec[1]) / 2;         // seconds between arrivals with the base tables
const guestsPerMin = (tables, appealPts = 0) => (60 / (gap * Math.min(1, CAFE.baseTables / tables) * (1 - Math.min(APPEAL.arrivalMax, appealPts * APPEAL.arrivalPerPoint))));
const AOV = aov(base), NET = aovNet(base);

// scenario for the payback column: a mid-game player with 3 tables, the oven making 3 jobs at once, the coffee machine 1, everything kept busy
const SCEN = { tables: 3, ovenCap: 3, coffeeCap: 1 };
const stationNetPerMin = (station, cap) => {
  const ids = base.filter((id) => PRODUCTS[id].station === station);
  const perSec = ids.reduce((s, id) => s + net(PRODUCTS[id]) / PRODUCTS[id].time, 0) / ids.length;          // net gold per second of one slot
  return perSec * cap * 60;
};
const refundBase = (station, cap) => base.filter((id) => PRODUCTS[id].station === station).reduce((s, id) => s + cost(PRODUCTS[id]) / PRODUCTS[id].time, 0) / base.filter((id) => PRODUCTS[id].station === station).length * cap * 60;

const hours = (price, perMin) => (perMin > 0 ? (price / perMin / 60).toFixed(1) : '—');
const rows = SHOP_ITEMS.map((d) => {
  const price = d.kind === 'upgrade' ? UPGRADES[d.upgrade].costs[d.level - 1] : d.price;
  let pay = '—', note = '';
  const e = d.effect ?? {};
  if (e.speed) for (const [st, f] of Object.entries(e.speed)) { const cap = st === 'oven' ? SCEN.ovenCap : SCEN.coffeeCap; pay = hours(price, stationNetPerMin(st, cap) * f / (1 - f)); note = `${st} ${Math.round(f * 100)}% faster`; }
  if (e.capacity) for (const [st, n] of Object.entries(e.capacity)) { pay = hours(price, stationNetPerMin(st, 1) * n * 0.6); note = `+${n} parallel ${st} job (60% utilised)`; }
  if (e.refund) { pay = hours(price, refundBase('oven', SCEN.ovenCap) * e.refund); note = `${Math.round(e.refund * 100)}% of oven ingredient spend back`; }
  if (d.appeal) { const dg = guestsPerMin(SCEN.tables, d.appeal) - guestsPerMin(SCEN.tables, 0); pay = hours(price, dg * NET + guestsPerMin(SCEN.tables) * AOV * Math.min(APPEAL.tipMax, d.appeal * APPEAL.tipPerPoint) * APPEAL.tipShare); note = `appeal +${d.appeal}`; }
  if (d.kind === 'upgrade') { const dg = guestsPerMin(d.level + 2) - guestsPerMin(d.level + 1); pay = hours(price, dg * NET); note = `${d.level + 2}. table`; }
  if (d.line === 'waiting') note = `+${e.queue} waiting place (no income of its own)`;
  if (d.kind === 'recipe') { const r = RECIPES[d.recipe]; note = `net ${(net(r) / r.time).toFixed(2)} gold/s, ${net(r)} per sale`; }
  return `| ${d.id} | ${d.category} | ${price.toLocaleString('tr-TR')} | ${d.kind === 'upgrade' ? UPGRADES[d.upgrade].minLevels?.[d.level - 1] ?? 1 : d.minLevel ?? 1} | ${d.stage ?? 1} | ${(price / AOV).toFixed(0)} | ${pay} | ${note} |`;
});
console.log(`Average order (base 4 products): ${AOV.toFixed(1)} gold gross, ${NET.toFixed(1)} net. Guests/min with 2 tables: ${guestsPerMin(2).toFixed(2)}, 3: ${guestsPerMin(3).toFixed(2)}, 4: ${guestsPerMin(4).toFixed(2)}.`);
console.log(`Customer net income with 2 / 3 / 4 tables: ${(guestsPerMin(2) * NET).toFixed(0)} / ${(guestsPerMin(3) * NET).toFixed(0)} / ${(guestsPerMin(4) * NET).toFixed(0)} gold per minute.\n`);
console.log('| item | category | price | level | stage | orders to afford | payback (h) | note |\n|---|---|---|---|---|---|---|---|');
console.log(rows.join('\n'));
console.log(`\nCatalogue total: ${SHOP_ITEMS.reduce((s, d) => s + (d.kind === 'upgrade' ? UPGRADES[d.upgrade].costs[d.level - 1] : d.price), 0).toLocaleString('tr-TR')} gold`);
