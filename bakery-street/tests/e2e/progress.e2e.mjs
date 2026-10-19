// XP and level-up, Town, Bookshop research and Exploration through the real UI.
import { openGame, tapDesign, skip, Check } from './lib.mjs';

export default async function run({ browser, url }) {
  const c = new Check('progress');
  const page = await openGame(browser, url);
  const S = (fn, arg) => page.evaluate(fn, arg);

  // --- level and XP in the HUD ---
  c.ok('HUD starts at Lv. 1', (await page.textContent('#levelText')) === 'Lv. 1');
  await S(() => { const s = window.__street; s.progression.gain(150); });
  await page.waitForTimeout(300);
  c.ok('150 XP -> level 2 shown in the HUD with a toast', (await page.textContent('#levelText')) === 'Lv. 2' && /Seviye 2/.test(await page.textContent('#toast')));

  // --- Town: Bookshop is locked until level 3, then opens once ---
  await page.click('.nav-btn[data-id=town]'); await page.waitForTimeout(300);
  c.ok('Town lists three buildings (the empty plot is hidden)', (await page.$$('#townPanel .card')).length === 3);
  await page.click('[data-open=bookshop]'); await page.waitForTimeout(250);
  c.ok('opening the Bookshop below level 3 is refused', !(await S(() => window.__street.town.isOpen('bookshop'))) && /Seviye 3/.test(await page.textContent('#toast')));
  await S(() => window.__street.progression.gain(200)); await page.waitForTimeout(250);
  const g0 = await S(() => window.__street.game.player.gold);
  await page.evaluate(() => { const b = document.querySelector('[data-open=bookshop]'); b.click(); b.click(); }); await page.waitForTimeout(300);
  c.ok('Bookshop opens, gold is spent once', (await S(() => window.__street.town.isOpen('bookshop'))) && g0 - (await S(() => window.__street.game.player.gold)) >= 5000 - 1000);
  await page.click('[data-b=bookshop] [data-visit]'); await page.waitForTimeout(900);

  // --- research: buying applies the bonus, a replayed tap does not buy twice ---
  c.ok('Bookshop screen shows five researches', (await page.$$('#researchPanel .card.research')).length === 5);
  const dur0 = await S(() => window.__street.game.duration('bread'));
  await page.evaluate(() => { const b = document.querySelector('[data-research=bakingKnowledge]'); b.click(); b.click(); }); await page.waitForTimeout(300);
  c.ok('Fırıncılık Bilgisi: one level, production time really shorter', (await S(() => window.__street.research.level('bakingKnowledge'))) === 1 && (await S(() => window.__street.game.duration('bread'))) < dur0);
  c.ok('locked research shows its condition', /Kitapçı gelişimi/.test(await page.textContent('#researchPanel .card.research.locked')));
  await page.click('#back'); await page.waitForTimeout(700);

  // --- exploration: only one trip, timer from the clock, claim pays once, survives a reload ---
  await page.click('.nav-btn[data-id=explore]'); await page.waitForTimeout(800);
  c.ok('Keşif shows three regions, only the first open', (await S(() => window.__street.exploration.list().map((r) => r.status).join())) === 'available,locked,locked');
  await page.click('[data-start=meadow]'); await page.waitForTimeout(300);
  c.ok('trip is running with a countdown', /\d+:\d\d/.test(await page.textContent('#explorePanel [data-xleft]')));
  c.ok('a second trip cannot start meanwhile', await S(() => !window.__street.exploration.start('meadow').ok));
  await page.waitForTimeout(500); await page.reload(); await page.waitForFunction(() => window.__street && document.getElementById('loading').hidden); await page.waitForTimeout(400);
  c.ok('the running trip survives a reload', (await S(() => window.__street.exploration.status('meadow'))) === 'active');
  await skip(page, 120); await page.waitForTimeout(300);
  c.ok('after the time the trip is ready', (await S(() => window.__street.exploration.status('meadow'))) === 'ready');
  const gold = await S(() => window.__street.game.player.gold), flour = await S(() => window.__street.game.ingredients.flour);
  await page.evaluate(() => { window.__street.go('explore'); }); await page.waitForTimeout(800);
  await page.evaluate(() => { const b = document.querySelector('[data-claim]'); b.click(); b.click(); }); await page.waitForTimeout(300);
  c.ok('reward is added to the real inventory once', (await S(() => window.__street.game.player.gold)) > gold && (await S(() => window.__street.game.ingredients.flour)) > flour && (await S(() => window.__street.exploration.timesDone('meadow'))) === 1);
  c.ok('no console errors', !page.problems.length, page.problems.join('; '));
  await page.context().close();
  return c;
}
