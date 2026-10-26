// Home/travel end-to-end check (sleep, cook, eat, shower, TV, study, tap-select, gym trip, reload). Same setup as verify-e2e.cjs.
// Usage: node scripts/home-e2e.cjs <width> <height> <outDir>
const { chromium } = require('playwright');
const W = +process.argv[2] || 390, H = +process.argv[3] || 844, OUT = process.argv[4];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:4173/?fx=low&debug=1'); await p.waitForTimeout(2500);
  const st = () => p.evaluate(() => { const s = window.game.state, c = s.character; return { loc: s.location, room: s.room, t: s.time, e: Math.round(c.energy), hu: Math.round(c.hunger), hy: Math.round(c.hydration), sl: Math.round(c.sleepiness), hp: Math.round(c.happiness), wb: Math.round(c.wellbeing), inv: { ...s.inventory }, office: s.skills.office, busy: window.game.busy }; });
  const idle = () => p.waitForFunction(() => !window.game.busy && !window.game.actor.busy, null, { timeout: 120000 });
  const act = async (label) => { await p.click(`.opt:has-text("${label}")`); await p.waitForTimeout(300); await idle(); await p.waitForTimeout(200); };
  const R = {};
  R.start = await st();
  // --- bedroom: sleep 8 h
  await p.click('.opt:has-text("Sleep 8 h")'); await p.waitForTimeout(3500);
  await p.screenshot({ path: `${OUT}/h-${W}-sleeping.png` });
  R.sleepingPose = await p.evaluate(() => ({ torso: +window.game.rig.currentPose.torso.toFixed(2), kind: window.game.actor.activeKind }));
  await idle(); R.afterSleep = await st();
  // --- kitchen
  await p.click('[data-act=room][data-arg=kitchen]'); await p.waitForTimeout(800);
  await p.click('[data-act=obj][data-arg=sink]'); await act('Drink water'); R.afterDrink = await st();
  await p.click('[data-act=obj][data-arg=table]'); await act('Bread'); R.afterBread = await st();
  await p.click('[data-act=obj][data-arg=stove]'); await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/h-${W}-kitchen-menu.png` });
  await act('Chicken & rice'); R.afterCook = await st();
  await p.click('[data-act=obj][data-arg=table]');
  R.tableOptions = await p.$$eval('.opt', els => els.map(e => e.innerText.replace(/\n/g, ' | ') + (e.disabled ? ' [disabled]' : '')));
  // --- bathroom
  await p.click('[data-act=room][data-arg=bathroom]'); await p.waitForTimeout(800);
  await p.click('[data-act=obj][data-arg=shower]'); await p.click('.opt:has-text("shower")'); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/h-${W}-shower.png` }); await idle(); R.afterShower = await st();
  await p.click('.opt:has-text("shower")'); await idle(); R.afterShower2 = await st(); // diminishing
  // --- living room
  await p.click('[data-act=room][data-arg=living]'); await p.waitForTimeout(800);
  await p.click('.opt:has-text("Watch TV")'); await p.waitForTimeout(3000);
  await p.screenshot({ path: `${OUT}/h-${W}-tv.png` }); await idle(); R.afterTv = await st();
  // --- study
  await p.click('[data-act=room][data-arg=study]'); await p.waitForTimeout(800);
  await p.click('.opt:has-text("Study")'); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/h-${W}-study.png` }); await idle(); R.afterStudy = await st();
  // --- wrong place is rejected by the rules (UI would not offer it), and tap-to-select works
  R.pickWorks = await p.evaluate(async () => {
    const g = window.game, T = window.__three, cam = window.__camera;
    const hit = g.roomScene?.hits?.[0]; if (!hit) return 'no-hit-volume';
    const v = hit.getWorldPosition(new T.Vector3()).project(cam);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  });
  // real click on the 3D object selects it
  if (R.pickWorks && R.pickWorks.x) {
    await p.click('[data-act=room][data-arg=kitchen]'); await p.waitForTimeout(900);
    const pt = await p.evaluate(() => { const g = window.game, T = window.__three, cam = window.__camera; const hit = g.roomScene.hits.find(h => h.userData.interactable === 'table'); const v = hit.getWorldPosition(new T.Vector3()).project(cam); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, sel: g.selected }; });
    await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(300);
    R.tapSelect = { before: pt.sel, after: await p.evaluate(() => window.game.selected) };
  }
  // --- travel to the gym
  await p.click('[data-act=tab][data-arg=map]'); await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/h-${W}-map.png` });
  await p.click('[data-act=go][data-arg=gym]'); await p.click('[data-act=yes]');
  await p.waitForFunction(() => window.game.state.location === 'gym' && !window.game.busy, null, { timeout: 60000 }); await p.waitForTimeout(1500);
  R.atGym = await st();
  await p.click('[data-act=tab][data-arg=here]');
  await p.click('[data-act=buy][data-arg=dayPass]'); await p.click('[data-act=yes]');
  await p.click('[data-act=start]');
  await p.click('[data-act=reps][data-arg="-1"]'); await p.click('[data-act=reps][data-arg="-1"]'); await p.click('[data-act=reps][data-arg="-1"]'); await p.click('[data-act=reps][data-arg="-1"]'); await p.click('[data-act=reps][data-arg="-1"]');
  await p.click('[data-act=set]');
  await p.waitForSelector('[data-act=rest]:not([disabled])', { timeout: 200000 });
  R.workoutReps = await p.evaluate(() => window.game.state.workout?.totalReps);
  // leaving with an active workout ends + banks it
  await p.click('[data-act=tab][data-arg=map]'); await p.click('[data-act=go][data-arg=home]'); await p.click('[data-act=yes]');
  await p.waitForFunction(() => window.game.state.location === 'home' && !window.game.busy, null, { timeout: 90000 }); await p.waitForTimeout(1500);
  R.backHome = await st();
  R.afterLeave = await p.evaluate(() => ({ session: !!window.game.state.workout, lifts: window.game.state.gym.lifts.bench, summary: window.game.workout.lastSummary && window.game.workout.lastSummary.reps }));
  await p.screenshot({ path: `${OUT}/h-${W}-backhome.png` });
  // --- reload persistence
  await p.evaluate(() => window.game.save()); await p.waitForTimeout(300);
  await p.reload(); await p.waitForTimeout(3000);
  R.afterReload = await st();
  R.errors = errs;
  console.log(JSON.stringify(R, null, 1));
  await b.close();
})();
