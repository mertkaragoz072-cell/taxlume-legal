import { test } from 'node:test';
import assert from 'node:assert/strict';

/** Minimal Image stand-in: paths containing "missing" fail, paths containing "slow" never answer. */
class FakeImage {
  set src(v) {
    if (v.includes('slow')) return;
    setTimeout(() => (v.includes('missing') ? this.onerror?.() : this.onload?.()), 1);
  }
}
globalThis.Image = FakeImage;
const { loadAssets, MANIFEST, getImage } = await import('../src/assets.js');

test('all images load: progress reaches the total and nothing failed', async () => {
  const seen = [];
  const r = await loadAssets({ onProgress: (d, t) => seen.push([d, t]), timeoutMs: 2000 });
  assert.deepEqual(r, { failed: 0, timedOut: false });
  const total = Object.values(MANIFEST).filter(Boolean).length;
  assert.deepEqual(seen.at(-1), [total, total]);
  assert.ok(getImage('bakery'));
});

test('a missing image is counted but never blocks the game', async () => {
  MANIFEST.extra = 'assets/missing.webp';
  const r = await loadAssets({ timeoutMs: 2000 });
  assert.equal(r.failed, 1);
  assert.equal(r.timedOut, false);
  assert.equal(getImage('extra'), null);
  delete MANIFEST.extra;
});

test('a slow image times out: the game starts anyway', async () => {
  MANIFEST.extra = 'assets/slow.webp';
  const t0 = Date.now();
  const r = await loadAssets({ timeoutMs: 50 });
  assert.equal(r.timedOut, true);
  assert.ok(Date.now() - t0 < 1000);
  delete MANIFEST.extra;
});
