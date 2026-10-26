// The portrait cafe layout: everything fits the 900-unit-wide world, rows do not overlap, and walkers keep clear of each other's columns.
import test from 'node:test';
import assert from 'node:assert/strict';
import { AREAS, CAM, QUEUE_SPOTS, chairSpot, depthOf, STAFF_LANE_Y, WAITER_LANE_Y, SERVICE_LINE_Y, QUEUE_Y } from '../src/scene/interior-layout.js';

const area = (id) => AREAS.find((a) => a.id === id);

test('portrait world: every area lies inside the 900 x 1600 world', () => {
  assert.deepEqual([CAM.w, CAM.h], [900, 1600]);
  for (const a of AREAS) assert.ok(a.x >= 0 && a.x + a.w <= CAM.w && a.y >= 0 && a.y + a.h <= CAM.h - 140, `${a.id} is inside the world (the bottom 140 units belong to the navigation bar)`);
});

test('portrait world: the service line is one row of three, kitchen pieces sit against the wall, nothing overlaps', () => {
  const row = ['counter', 'showcase', 'coffee'].map(area);
  for (let i = 1; i < row.length; i++) assert.ok(row[i].x >= row[i - 1].x + row[i - 1].w, 'counter, showcase and coffee machine stand side by side');
  const wall = ['oven', 'storage'].map(area);
  assert.ok(wall[1].x >= wall[0].x + wall[0].w, 'oven and storage do not overlap');
  for (const a of [...wall, area('upgrades')]) assert.ok(depthOf(a) <= STAFF_LANE_Y, `${a.id} stands behind the baker`);
  for (const a of row) assert.ok(depthOf(a) > STAFF_LANE_Y && depthOf(a) < WAITER_LANE_Y, `${a.id} is in front of the baker and behind the waiter`);
});

test('portrait world: tables stand in two columns either side of an open aisle, each guest takes the chair facing the aisle', () => {
  const tables = AREAS.filter((a) => a.id.startsWith('table'));
  for (const t of tables) {
    const centre = t.x + t.w / 2;
    assert.equal(t.side, centre < CAM.w / 2 ? 1 : -1, `${t.id}: the guest sits on the aisle side`);
    assert.ok(t.y > SERVICE_LINE_Y + 40, `${t.id} is below the guest lanes`);
    const spot = chairSpot(tables.indexOf(t));
    assert.ok(spot.via > 280 && spot.via < 620, `${t.id}: the access gap lies in the aisle (${spot.via})`);
  }
  const left = tables.filter((t) => t.side === 1), right = tables.filter((t) => t.side === -1);
  assert.ok(Math.max(...left.map((t) => t.x + t.w)) + 20 < Math.min(...right.map((t) => t.x)), 'the two table columns do not touch');
});

test('portrait world: arriving and leaving guests use different columns (nobody walks head-on)', () => {
  const tables = AREAS.filter((a) => a.id.startsWith('table'));
  const arrive = [450, ...tables.map((t, i) => chairSpot(i).via)];
  const leave = [395, ...tables.map((t, i) => chairSpot(i).via + chairSpot(i).side * 60)];
  for (const a of arrive) for (const l of leave) assert.ok(Math.abs(a - l) >= 40, `an arrival column (${a}) and a leaving column (${l}) are at least 40 units apart`);
});

test('portrait world: the queue stands in front of the showcase, a body width apart', () => {
  const s = area('showcase');
  for (const q of QUEUE_SPOTS) { assert.ok(q.x > s.x - 160 && q.x < s.x + s.w + 160, 'queue spot in front of the showcase'); assert.equal(q.y, QUEUE_Y); }
  const xs = QUEUE_SPOTS.map((q) => q.x).sort((a, b) => a - b);
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= 140, 'queue spots are a body width apart');
});
