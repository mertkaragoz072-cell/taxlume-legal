// Renders the gym at the art's own aspect (470x836 @2x ≈ 940x1672) with UI hidden and saves a screenshot for comparison with the source.
const { chromium } = require('playwright');
const out = process.argv[2], fx = process.argv[3] || 'auto';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 470, height: 836 }, deviceScaleFactor: 2 });
  await p.goto(`http://localhost:4173/?fx=${fx}&debug=1`); await p.waitForTimeout(2500);
  await p.click('[data-act=tab][data-arg=map]'); await p.click('[data-act=go][data-arg=gym]'); await p.click('[data-act=yes]');
  await p.waitForFunction(() => window.game.state.location === 'gym' && !window.game.busy, null, { timeout: 60000 }); await p.waitForTimeout(3000);
  await p.addStyleTag({ content: '#ui{display:none!important}.fade{display:none!important}' });
  // hide the 3D station so only the backdrop is compared
  await p.evaluate(() => { window.game.station.visible = false; window.__scene.traverse(o => { if (o.renderOrder === -1 || o.renderOrder === -3) o.visible = false; }); });
  await p.waitForTimeout(600);
  await p.screenshot({ path: out });
  await b.close();
})();
