// Çevrimdışı/PWA testi: SW kaydı → önbellek → ağı kes → sayfa yeniden açılıp oyun başlıyor mu. Kullanım: node tools/tests/offline_sw.js  (localhost sunucu gerekir: NEXORA_URL)
const { chromium } = require('playwright'); const BASE = process.env.NEXORA_URL || 'http://localhost:8123';
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const ctx = await b.newContext({ viewport: { width: 844, height: 390 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto(`${BASE}/index.html?hero=male`); await pg.evaluate(() => navigator.serviceWorker.ready.then(() => 1)); await pg.waitForTimeout(800);
  await pg.reload(); await pg.waitForFunction(() => window.__game && window.__game.state.player, null, { timeout: 60000 }); await pg.waitForTimeout(1500);
  const info = await pg.evaluate(async () => { const ks = await caches.keys(); return { controlled: !!navigator.serviceWorker.controller, caches: ks, entries: ks.length ? (await (await caches.open(ks[0])).keys()).length : 0 }; });
  await ctx.setOffline(true); await pg.reload();
  const boot = await pg.waitForFunction(() => window.__game && window.__game.state.player, null, { timeout: 30000 }).then(() => true).catch(() => false);
  console.log(JSON.stringify({ ...info, offlineBoot: boot, errors: errs })); await b.close(); process.exit(boot && info.controlled ? 0 : 1);
})();
