import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSimulation } from '../scripts/sim-core.mjs';

// The robot player plays real game rules for a few days. These bands are wide on purpose: they catch a balance change that breaks the economy
// (nothing earned, or money exploding), not small tuning. Run `node scripts/simulate-economy.mjs` to read the actual numbers.
test('simulation: 3 days of play earn a sane amount, sales stay the main steady income, nothing goes negative', () => {
  const days = runSimulation({ days: 3, minutes: 30, seed: 1 });
  assert.equal(days.length, 3);
  for (const d of days) {
    assert.ok(d.sold >= 30 && d.sold <= 400, `day ${d.day} sold ${d.sold}`);
    assert.ok(d.total >= 3000 && d.total <= 60000, `day ${d.day} earned ${d.total}`);
    assert.ok(d.gold >= 0);
    for (const [k, v] of Object.entries(d.income)) assert.ok(v >= 0, `${k} is negative`);
  }
  const sales = days.reduce((s, d) => s + (d.income.sale ?? 0), 0), all = days.reduce((s, d) => s + d.total, 0);
  assert.ok(sales / all > 0.3 && sales / all < 0.95, `sales share ${sales / all}`);
  assert.ok(days[2].stage >= 2 && days[2].level > days[0].level - 1);
});

test('simulation: the service bonuses change income only moderately (they are a bonus, not a new economy)', () => {
  const on = runSimulation({ days: 4, minutes: 30, seed: 2, bonuses: true }).reduce((s, d) => s + d.total, 0);
  const off = runSimulation({ days: 4, minutes: 30, seed: 2, bonuses: false }).reduce((s, d) => s + d.total, 0);
  assert.ok(on / off > 0.85 && on / off < 1.3, `on/off ${(on / off).toFixed(2)}`);
});

test('simulation: the same seed gives the same result', () => {
  const a = runSimulation({ days: 2, minutes: 20, seed: 4 }), b = runSimulation({ days: 2, minutes: 20, seed: 4 });
  assert.deepEqual(a, b);
});
