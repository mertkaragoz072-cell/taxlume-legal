// Loading screen, asset failures, one-tab ownership and the debug hook.
import { openGame, closeDaily, Check } from './lib.mjs';

export default async function run({ browser, url }) {
  const c = new Check('durability');
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true });

  const a = await openGame(browser, url, { context: ctx });
  c.ok('loading screen is gone after boot', await a.evaluate(() => document.getElementById('loading').hidden));
  await a.evaluate(() => { window.__street.game.player.gold = 11111; window.__street.game.emit('change', { type: 't' }); });
  const b = await openGame(browser, url, { context: ctx });
  await a.waitForTimeout(400);
  c.ok('the older tab is locked, the newer one plays', await a.evaluate(() => !document.getElementById('tabLock').hidden) && await b.evaluate(() => document.getElementById('tabLock').hidden));
  c.ok('the new tab loaded the latest progress', (await b.evaluate(() => window.__street.game.player.gold)) === 11111);
  await b.evaluate(() => { window.__street.game.player.gold = 22222; window.__street.game.emit('change', { type: 't' }); });
  await a.evaluate(() => { window.__street.game.player.gold = 1; window.__street.game.emit('change', { type: 't' }); window.dispatchEvent(new Event('pagehide')); });
  c.ok('the locked tab cannot overwrite the save', (await b.evaluate(() => JSON.parse(localStorage.getItem('bakery-street:save')).gold)) === 22222);
  await a.click('#tabTake'); await a.waitForFunction(() => window.__street && document.getElementById('loading').hidden); await closeDaily(a);
  c.ok('"continue here" reloads the owner\'s latest save (not the stale tab)', (await a.evaluate(() => window.__street.game.player.gold)) === 22222);
  c.ok('the other tab is now the locked one', await b.evaluate(() => !document.getElementById('tabLock').hidden));
  await ctx.close();

  // missing images: the game must still start, with a notice
  const ctx2 = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true });
  await ctx2.route('**/assets/**', (r) => r.abort());
  const p = await ctx2.newPage();
  await p.goto(`${url}/index.html`);
  await p.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 15000 });
  c.ok('failed images: game starts with a notice', /görseller/.test(await p.textContent('#toast')));
  await ctx2.close();

  // debug hook only on local hosts or with ?debug
  const ctx3 = await browser.newContext({ viewport: { width: 844, height: 390 } });
  await ctx3.route('http://game.example/**', async (route) => {
    const u = new URL(route.request().url());
    const res = await fetch(`${url}${u.pathname}${u.search}`);
    await route.fulfill({ status: res.status, headers: { 'content-type': res.headers.get('content-type') ?? 'text/plain' }, body: Buffer.from(await res.arrayBuffer()) });
  });
  const q = await ctx3.newPage();
  await q.goto('http://game.example/index.html'); await q.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 15000 });
  c.ok('no debug hook on a public host', await q.evaluate(() => !window.__street));
  await q.goto('http://game.example/index.html?debug'); await q.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 15000 });
  c.ok('?debug turns the hook on', await q.evaluate(() => !!window.__street));
  await ctx3.close();
  return c;
}
