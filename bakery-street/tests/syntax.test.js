import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

// Scene and UI modules touch the DOM, so the other tests never import them: a typo there would only show in the browser.
// Every source file must at least parse.
const files = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : f.endsWith('.js') ? [join(dir, f)] : []));

test('every source file parses', () => {
  for (const f of files(new URL('../src', import.meta.url).pathname)) {
    const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});
