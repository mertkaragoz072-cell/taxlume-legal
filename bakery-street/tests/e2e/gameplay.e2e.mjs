// Core loop through the real UI: produce, sell, customers, Market, upgrades, quests, daily reward, settings reset, reload.
import { openGame, tapDesign, skip, Check } from './lib.mjs';

export default async function run({ browser, url }) {
  const c = new Check('gameplay');
  const page = await openGame(browser, url);
  const S = (fn, arg) => page.evaluate(fn, arg);

  // --- production on the oven (tap the oven, press "Üret", wait for the clock) ---
  await S(() => window.__street.go('interior')); await page.waitForTimeout(700);
  await tapDesign(page, 195, 330);
  c.ok('oven panel opens', await page.isVisible('#panel [data-make=bread]'));
  const flour0 = await S(() => window.__street.game.ingredients.flour);
  await page.click('[data-make=bread]'); await page.waitForTimeout(200);
  c.ok('ingredients are taken at start', (await S(() => window.__street.game.ingredients.flour)) === flour0 - 2);
  c.ok('a second tap does not start a second bread on a one-slot oven', await S(() => !window.__street.game.startProduction('bread').ok));
  await skip(page, 25); await page.waitForTimeout(250);
  c.ok('bread arrives only after the timer', (await S(() => window.__street.game.stats.produced.bread)) === 1);
  await page.click('#panel .x');

  // --- showcase sale pays the showcase price, customer delivery the (higher) customer price ---
  const eco = await S(() => window.__street.game.unitEconomics('bread'));
  await tapDesign(page, 890, 400);
  const g0 = await S(() => window.__street.game.player.gold);
  await page.click('[data-sell=bread][data-qty="1"]'); await page.waitForTimeout(250);
  c.ok('showcase sale pays unitEconomics.showcase', (await S(() => window.__street.game.player.gold)) - g0 === eco.showcase);
  await page.click('#panel .x');
  await S(() => { const s = window.__street; s.game.products.bread = 2; s.cafe.arrive(); s.cafe.seatQueued(); s.cafe.openOrders().forEach((o) => { o.product = 'bread'; o.price = s.game.productsDef.bread.price; }); }); await page.waitForTimeout(400);
  const chip = await page.$('.ochip');
  c.ok('a seated customer shows an order chip', !!chip);
  const g1 = await S(() => window.__street.game.player.gold);
  await page.click('.ochip'); await page.waitForTimeout(300);
  c.ok('delivering pays unitEconomics.customer exactly once', (await S(() => window.__street.game.player.gold)) - g1 === eco.customer);
  c.ok('showcase nets less than a customer', eco.showcaseNet < eco.customerNet);

  // --- Market ---
  await S(() => window.__street.go('market')); await page.waitForTimeout(700);
  const gm = await S(() => window.__street.game.player.gold), fl = await S(() => window.__street.game.ingredients.flour);
  await page.click('.card[data-i=flour] [data-act=inc]'); await page.click('.card[data-i=flour] [data-act=buy]'); await page.waitForTimeout(300);
  c.ok('market buy: gold down, stock up, once', (await S(() => window.__street.game.ingredients.flour)) === fl + 2 && gm - (await S(() => window.__street.game.player.gold)) === 16);
  await S(() => window.__street.game.player.gold = 0); await S(() => window.__street.game.emit('change', { type: 't' }));
  await page.click('.card[data-i=flour] [data-act=buy]'); await page.waitForTimeout(250);
  c.ok('no gold: purchase refused with a warning', (await S(() => window.__street.game.ingredients.flour)) === fl + 2 && /Yetersiz/.test(await page.textContent('#toast')));
  await S(() => { window.__street.game.player.gold = 100000; window.__street.game.emit('change', { type: 't' }); });

  // --- upgrades: a double click buys one level ---
  await S(() => window.__street.go('interior')); await page.waitForTimeout(700);
  await tapDesign(page, 1335, 210);
  const gu = await S(() => window.__street.game.player.gold);
  await page.evaluate(() => { const b = document.querySelector('[data-upgrade=ovenCapacity]'); b.click(); b.click(); b.click(); }); await page.waitForTimeout(300);
  c.ok('triple click buys one upgrade level only', (await S(() => window.__street.game.upgrades.ovenCapacity)) === 1 && gu - (await S(() => window.__street.game.player.gold)) === 800);
  await page.click('#panel .x'); await S(() => window.__street.go('street')); await page.waitForTimeout(600);

  // --- quests and daily reward ---
  await page.click('.tile[data-id=quests]'); await page.waitForTimeout(300);
  const claimable = await page.$$('#questPanel [data-claim]');
  c.ok('finished quests can be claimed', claimable.length >= 1);
  const gq = await S(() => window.__street.game.player.gold);
  await page.evaluate(() => { const b = document.querySelector('#questPanel [data-claim]'); b.click(); b.click(); }); await page.waitForTimeout(300);
  c.ok('a quest reward is paid once', (await S(() => window.__street.game.player.gold)) - gq > 0 && (await S(() => window.__street.quests.claimed.size)) === 1);
  await page.click('#questPanel .x');
  await page.click('.tile[data-id=events]'); await page.waitForTimeout(300);
  const gd = await S(() => window.__street.game.player.gold);
  await page.evaluate(() => { const b = document.querySelector('[data-daily]'); b.click(); b.click(); }); await page.waitForTimeout(300);
  c.ok('daily reward is paid once per day', (await S(() => window.__street.daily.day)) === 1 && (await S(() => window.__street.game.player.gold)) !== gd);
  await page.click('#dailyPanel .x');

  // --- reload keeps everything; reset needs a confirmation and keeps settings ---
  const before = await S(() => ({ gold: window.__street.game.player.gold, up: window.__street.game.upgrades.ovenCapacity, claimed: [...window.__street.quests.claimed] }));
  await page.waitForTimeout(400); await page.reload(); await page.waitForFunction(() => window.__street && document.getElementById('loading').hidden); await page.waitForTimeout(500);
  const after = await S(() => ({ gold: window.__street.game.player.gold, up: window.__street.game.upgrades.ovenCapacity, claimed: [...window.__street.quests.claimed] }));
  c.ok('reload restores gold, upgrades and claimed quests', JSON.stringify(before) === JSON.stringify(after));
  await page.evaluate(() => document.querySelector('#dailyPanel .x')?.click());
  await page.click('.tile[data-id=settings]'); await page.waitForTimeout(200);
  await page.click('[data-setting=sfx]');
  await page.click('[data-reset-ask]'); await page.click('[data-reset-cancel]');
  c.ok('cancelling the reset keeps progress', (await S(() => window.__street.game.upgrades.ovenCapacity)) === 1);
  await page.click('[data-reset-ask]'); await page.click('[data-reset-confirm]'); await page.waitForTimeout(400);
  c.ok('confirmed reset restores a fresh game (54.320 gold) and keeps the sound setting', (await S(() => window.__street.game.player.gold)) === 54320 && (await S(() => window.__street.settings.values.sfx)) === false);
  c.ok('no console errors', !page.problems.length, page.problems.join('; '));
  await page.context().close();
  return c;
}
