// Plays the web build like a player, by clicking (daily reward, production, shop purchase, every menu entry, cafe name, reset) and checks
// the game state after each step and that the page threw no error. Needs Playwright with Chromium and the web build served:
//   npx expo export --platform web --output-dir /tmp/web && cp public/canvaskit.wasm /tmp/web/
//   (cd /tmp/web && python3 -m http.server 8766) &
//   node scripts/ui-smoke.cjs [http://localhost:8766/]
// Exit code 1 (and the failed step) when something is wrong. Screenshots of each step go to /tmp/ui-smoke/.
const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.argv[2] ?? 'http://localhost:8766/';
const OUT = '/tmp/ui-smoke';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
  const errors = [];
  p.on('pageerror', (e) => { if (!/play\(\)/.test(e.message)) errors.push(e.message); });
  p.on('console', (m) => { if (m.type() === 'error' && !/play\(\)|vibrate|net::ERR|Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  let n = 0;
  const step = async (name, fn, check) => {
    await fn(); await p.waitForTimeout(500);
    const st = await p.evaluate(() => { const w = window.__world, g = w.game; return { gold: g.gold, owned: w.shop.owned.size, jobs: Object.values(g.jobs).flat().length, name: g.profile.name, daily: w.daily.status().canClaim, quests: w.quests.claimable().length, sold: g.stats.soldTotal }; });
    await p.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-${name.replace(/\W+/g, '_')}.png` });
    if (check && !check(st)) throw new Error(`step "${name}": unexpected state ${JSON.stringify(st)}`);
    if (errors.length) throw new Error(`step "${name}": page error ${errors[0]}`);
    console.log(`ok  ${name}`);
    return st;
  };
  const click = (text, exact = true) => p.getByText(text, { exact }).first().click();
  try {
    await p.goto(URL); await p.waitForFunction(() => !!window.__world && !!window.__shell, null, { timeout: 30000 }); await p.waitForTimeout(1500);
    const s0 = await step('start', async () => {}, (s) => s.gold === 54320 && s.daily);
    await step('daily reward', () => click('Ödülü Al · Gün 1', false), (s) => s.gold > s0.gold && !s.daily);
    await step('close panel', () => p.getByLabel('Kapat').first().click());
    await step('open the oven', () => p.evaluate(() => window.__shell.setPanel({ id: 'oven', side: 'right' })));
    await step('produce bread', () => click('Üret'), (s) => s.jobs >= 1);
    await step('close the oven', () => p.evaluate(() => window.__shell.setPanel(null)));
    await step('shop', () => click('Mağaza'));
    const before = await p.evaluate(() => window.__world.game.gold);
    await step('decoration tab', () => click('Dekorasyon'));
    await step('buy the first decoration', () => click('Satın Al', false), (s) => s.owned === 1 && s.gold < before);
    await step('close the shop', () => p.getByLabel('Kapat').first().click());
    for (const item of ['Görevler', 'Müşteri Albümü', 'İstatistikler', 'Günlük Ödül']) {
      await step(`menu: ${item}`, async () => { await p.getByLabel('Menü').click(); await p.waitForTimeout(300); await click(item); });
      await step(`close ${item}`, () => p.getByLabel('Kapat').first().click());
    }
    await step('settings', async () => { await p.getByLabel('Menü').click(); await p.waitForTimeout(300); await click('Ayarlar'); });
    await step('cafe name', async () => { const i = p.getByLabel('Kafenin adı'); await i.fill('Pati Fırın'); await i.press('Enter'); await i.blur(); }, (s) => s.name === 'Pati Fırın');
    await step('reset: cancel', async () => { await click('Sıfırla…'); await click('Vazgeç'); }, (s) => s.owned === 1);
    await step('reset: confirm', async () => { await click('Sıfırla…'); await click('Evet, sıfırla'); }, (s) => s.owned === 0 && s.gold === 54320 && s.name === '' && s.daily);
    await step('photo mode', async () => { await p.getByLabel('Menü').click(); await p.waitForTimeout(300); await click('Fotoğraf Modu'); });
    await step('leave photo mode', () => p.getByLabel('Fotoğraf modundan çık').click());
    for (const nav of ['Kasaba', 'Keşif', 'Fırın & Kafe']) await step(`nav: ${nav}`, () => click(nav));
    await p.evaluate(() => { const g = window.__world.game; for (const id of Object.keys(g.productsDef)) if (g.isUnlocked(id)) g.products[id] = 5; });   // stock for whatever the first guests order
    await p.waitForTimeout(30000);
    await step('30 s of play: the waiter served guests', async () => {}, (s) => s.sold >= 1);
    console.log(`\nALL OK (${n} steps, screenshots in ${OUT})`);
    await b.close();
  } catch (e) {
    console.log(`FAIL ${e.message}`);
    await p.screenshot({ path: `${OUT}/FAIL.png` }).catch(() => {});
    await b.close(); process.exit(1);
  }
})();
