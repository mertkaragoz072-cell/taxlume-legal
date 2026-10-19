// Runs every *.e2e.mjs spec against a throw-away static server. Usage: npm run test:e2e   (see tests/e2e/README.md)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer, launch } from './lib.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const only = process.argv[2];
const specs = fs.readdirSync(dir).filter((f) => f.endsWith('.e2e.mjs') && (!only || f.includes(only))).sort();
const { server, url } = await startServer();
const browser = await launch();
let failed = 0, total = 0;
try {
  for (const file of specs) {
    const spec = (await import(path.join(dir, file))).default;
    let result;
    try { result = await spec({ browser, url }); }
    catch (err) { console.log(`✗ ${file}: crashed — ${err.message}`); failed += 1; total += 1; continue; }
    for (const r of result.results) { total += 1; if (!r.pass) failed += 1; console.log(`${r.pass ? '✓' : '✗'} [${result.name}] ${r.label}${r.pass || !r.detail ? '' : `  → ${r.detail}`}`); }
  }
} finally { await browser.close(); server.close(); }
console.log(`\n${total - failed}/${total} e2e checks passed`);
process.exit(failed ? 1 : 0);
