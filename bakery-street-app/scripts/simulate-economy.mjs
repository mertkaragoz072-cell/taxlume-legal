// A simple robot plays the real game rules (no UI) for several days and prints what it earned, so the balance can be checked with numbers:
//   node scripts/simulate-economy.mjs [days=7] [minutesPerDay=30] [seed=1] [bonuses=1]   (bonuses=0 switches the service bonuses off, to measure them)
// The robot (scripts/sim-core.mjs): keeps both stations busy with the products guests ask for, serves every open order after a short walking delay (like the waiter),
// buys ingredients when short, buys the cheapest affordable shop item once a minute and collects quests, goals, the daily reward and the till.
// It is deliberately average, not optimal: use it to compare before/after a balance change, not as a promise of what a player earns.
import { runSimulation } from './sim-core.mjs';

const [days = 7, minutes = 30, seedArg = 1, bonusArg = 1] = process.argv.slice(2).map(Number);
const stats = runSimulation({ days, minutes, seed: seedArg, bonuses: !!bonusArg });
const pad = (v, n) => String(v).padStart(n);
console.log(`Robot, ${minutes} min/day, ${days} days (seed ${seedArg}). Gold earned per day, by source:`);
console.log(`${pad('day', 3)} ${pad('sold', 5)} ${pad('earned', 8)} ${pad('stage', 5)} ${pad('lvl', 4)}   sources`);
for (const r of stats) console.log(`${pad(r.day, 3)} ${pad(r.sold, 5)} ${pad(r.total.toLocaleString('tr-TR'), 8)} ${pad(r.stage, 5)} ${pad(r.level, 4)}   ${Object.entries(r.income).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);
const sale = stats.reduce((s, r) => s + (r.income.sale ?? 0), 0), all = stats.reduce((s, r) => s + r.total, 0);
console.log(`Sales are ${(100 * sale / all).toFixed(0)}% of all income; everything else (quests, goals, till, daily, album, levels, stages) is ${(100 - 100 * sale / all).toFixed(0)}%.`);
