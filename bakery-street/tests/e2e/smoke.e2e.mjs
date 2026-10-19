// Every screen and panel at several phone sizes: no console errors, nothing off screen, readable text and 40px touch targets.
import { openGame, Check } from './lib.mjs';

const VIEWPORTS = [[667, 375], [844, 390], [932, 430], [568, 320]];

async function audit(page) {
  return page.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'; };
    const W = innerWidth, H = innerHeight, out = [];
    for (const e of document.querySelectorAll('#hud .pill, #hud .tile, #nav .nav-btn, #back, aside:not([hidden])')) {
      if (!vis(e)) continue;
      const r = e.getBoundingClientRect();
      if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) out.push(`offscreen ${e.id || e.className}`);
    }
    const small = [...document.querySelectorAll('button')].filter(vis).filter((b) => { const r = b.getBoundingClientRect(); return r.width < 39.5 || r.height < 39.5; }).map((b) => `${b.className || b.id} ${Math.round(b.getBoundingClientRect().width)}x${Math.round(b.getBoundingClientRect().height)}`);
    const tiny = [...document.querySelectorAll('#hud *, aside:not([hidden]) *, #nav *, #back, #toast')].filter(vis)
      .filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11.5)
      .map((e) => `${e.tagName}.${e.className} ${getComputedStyle(e).fontSize}`);
    return { out, small: [...new Set(small)], tiny: [...new Set(tiny)], scrollX: document.documentElement.scrollWidth > W };
  });
}

export default async function run({ browser, url }) {
  const c = new Check('smoke');
  for (const [w, h] of VIEWPORTS) {
    const page = await openGame(browser, url, { w, h });
    const tag = `${w}x${h}`;
    const steps = [
      ['street', async () => {}],
      ['town', async () => { await page.click('.nav-btn[data-id=town]'); }],
      ['quests', async () => { await page.click('.tile[data-id=quests]'); }],
      ['daily', async () => { await page.click('.tile[data-id=events]'); }],
      ['settings', async () => { await page.click('.tile[data-id=settings]'); }],
    ];
    for (const [name, open] of steps) {
      await open(); await page.waitForTimeout(250);
      const a = await audit(page);
      c.ok(`${tag} ${name}: nothing off screen / no sideways scroll`, !a.out.length && !a.scrollX, a.out.join('; '));
      c.ok(`${tag} ${name}: buttons >= 40px`, !a.small.length, a.small.join('; '));
      c.ok(`${tag} ${name}: text >= 12px`, !a.tiny.length, a.tiny.join('; '));
      await page.evaluate(() => { for (const s of ['#townPanel', '#questPanel', '#settingsPanel', '#dailyPanel']) document.querySelector(`${s} .x`)?.click(); });
      await page.waitForTimeout(120);
    }
    for (const scene of ['interior', 'market', 'bookshop', 'explore']) {
      await page.evaluate((s) => window.__street.go(s), scene); await page.waitForTimeout(700);
      const a = await audit(page);
      c.ok(`${tag} ${scene}: nothing off screen`, !a.out.length && !a.scrollX, a.out.join('; '));
      c.ok(`${tag} ${scene}: buttons >= 40px`, !a.small.length, a.small.join('; '));
      await page.evaluate(() => window.__street.go('street')); await page.waitForTimeout(600);
    }
    c.ok(`${tag}: no console errors or failed requests`, !page.problems.length, page.problems.join('; '));
    await page.context().close();
  }
  return c;
}
