import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playthrough } from '../scripts/playthrough.mjs';

// The whole game, start to finish, by a robot using every system. Catches dead ends: content that can never be bought or reached.
test('playthrough: 30 days of 30 minutes reach the last stage, the top level and every shop item, upgrade, research and quest', () => {
  for (const seed of [1, 2]) {
    const r = playthrough({ days: 30, minutes: 30, seed });
    assert.equal(r.end.stage, 4, `seed ${seed}`);
    assert.equal(r.end.level, 30, `seed ${seed}`);
    assert.deepEqual(r.left, [], `seed ${seed}: shop items left`);
    assert.deepEqual(r.upgradesLeft, []);
    assert.deepEqual(r.researchLeft, []);
    assert.deepEqual(r.questsLeft, []);
    assert.equal(r.end.album, '8/8');
    for (const d of r.days) assert.ok(d.gold >= 0 && d.sold > 30, `day ${d.day}`);
  }
});

test('playthrough: the pace is a curve, not a sprint: stage 2 on day 1, stage 3 within the first ten days, stage 4 after day 10', () => {
  const r = playthrough({ days: 30, minutes: 30, seed: 1 });
  const day = (t) => r.log.find((l) => l.text.startsWith(t))?.day;
  assert.ok(day('Aşama 2') <= 2);
  assert.ok(day('Aşama 3') >= 3 && day('Aşama 3') <= 12, `stage 3 on day ${day('Aşama 3')}`);
  assert.ok(day('Aşama 4') >= 10 && day('Aşama 4') <= 28, `stage 4 on day ${day('Aşama 4')}`);
});
