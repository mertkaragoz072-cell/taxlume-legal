// Shared helpers for the browser (end-to-end) tests. No dependency is added to the project: Playwright is looked up at run time
// (PLAYWRIGHT_MODULE, then the normal `playwright` import) and Chromium via CHROMIUM_PATH. See tests/e2e/README.md.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' };

export function startServer(port = 0) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const file = path.join(ROOT, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, url: `http://localhost:${server.address().port}` })));
}

export async function launch() {
  let pw;
  try { pw = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright'); }
  catch { throw new Error('Playwright bulunamadı. PLAYWRIGHT_MODULE=<playwright yolu> ayarla veya `npm i -D playwright` çalıştır (bkz. tests/e2e/README.md).'); }
  const chromium = pw.chromium ?? pw.default?.chromium;
  return chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
}

/** Opens the game in a fresh context. Collects console errors / failed requests in `page.problems`. */
export async function openGame(browser, url, { w = 844, h = 390, query = '', fresh = true, context } = {}) {
  const ctx = context ?? await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.problems = [];
  page.on('pageerror', (e) => page.problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') page.problems.push(`console: ${m.text().slice(0, 160)}`); });
  page.on('response', (r) => { if (r.status() >= 400) page.problems.push(`${r.status()} ${r.url()}`); });
  await page.goto(`${url}/index.html${query}`);
  await page.waitForFunction(() => window.__street && document.getElementById('loading').hidden, null, { timeout: 15000 });
  await closeDaily(page);
  return page;
}

export async function closeDaily(page) {
  await page.waitForTimeout(450);
  await page.evaluate(() => document.querySelector('#dailyPanel .x')?.click());
  await page.waitForTimeout(100);
}

export const game = (page, fn, arg) => page.evaluate(fn, arg);
/** Design-space point -> click on the canvas. Inside the cafe the point is a world coordinate (the interior camera is zoomed out). */
export async function tapDesign(page, x, y) {
  const p = await page.evaluate(([x, y]) => {
    const v = window.__street.view, r = document.getElementById('game').getBoundingClientRect();
    if (document.body.classList.contains('in-interior') || document.getElementById('stage')?.classList.contains('in-interior')) ({ x, y } = window.__street.interior.toScreen(x, y));
    return { x: r.left + (x + v.ox) * v.scale, y: r.top + (y + v.oy) * v.scale };
  }, [x, y]);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(350);
}
/** Moves the game clock forward (production, exploration and daily timers all read it). */
export const skip = (page, sec) => page.evaluate((s) => { const g = window.__street.game, c = g.clock; g.clock = () => c() + s * 1000; g.tick(); }, sec);

export class Check {
  constructor(name) { this.name = name; this.results = []; }
  ok(label, cond, detail = '') { this.results.push({ label, pass: !!cond, detail }); }
  get failed() { return this.results.filter((r) => !r.pass); }
}
