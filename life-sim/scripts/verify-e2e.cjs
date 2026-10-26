// Gym end-to-end check of the production build in headless Chromium (needs: npm run build && npm run preview -- --port 4173, and Playwright).
// Usage: node scripts/verify-e2e.cjs <width> <height> <outDir> — prints a JSON report; screenshots go to <outDir>.
const { chromium } = require('playwright');
const W = +process.argv[2] || 390, H = +process.argv[3] || 844, OUT = process.argv[4];
const launch = () => chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

// ---- in-page helpers -------------------------------------------------------
const PAGE_HELPERS = () => {
  const T = window.__three, g = window.game;
  const world = (x, y, z) => g.station.localToWorld(new T.Vector3(x, y, z));
  window.__probe = () => {
    const j = g.rig.joints(), cam = window.__camera, scene = window.__scene;
    const pts = { head: world(j.head[0], j.head[1], 0), shoulder: world(j.shoulder[0], j.shoulder[1], 0), pelvis: world(j.pelvis[0], j.pelvis[1], 0),
      handNear: world(j.handNear[0], j.handNear[1], 0.22), handFar: world(j.handFar[0], j.handFar[1], -0.22),
      elbowNear: world(j.elbowNear[0], j.elbowNear[1], 0.22), elbowFar: world(j.elbowFar[0], j.elbowFar[1], -0.22), foot: world(j.footNear[0], j.footNear[1], 0.1) };
    const rc = new T.Raycaster(); const blockers = {};
    const isRig = (o) => { for (let p = o; p; p = p.parent) if (p === g.rig.root) return true; return false; };
    for (const [name, p] of Object.entries(pts)) {
      const d = p.clone().sub(cam.position); const dist = d.length(); rc.set(cam.position, d.normalize());
      for (const h of rc.intersectObjects(scene.children, true)) {
        if (h.distance > dist - 0.04) break;
        if (isRig(h.object)) continue;               // own body parts are fine
        if (h.object.userData.rack) { blockers[name] = 'RACK'; break; }
      }
    }
    const c = cam.clone(); const proj = (p) => { const v = p.clone().project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
    const scr = {}; for (const [k, p] of Object.entries(pts)) scr[k] = proj(p);
    const bar = g.station.children.find(o => o.userData.bar);
    const barEnds = bar ? [bar.localToWorld(new T.Vector3(0, 0, -0.82)), bar.localToWorld(new T.Vector3(0, 0, 0.82))].map(proj) : [];
    return { blockers, scr, barEnds, torso: g.rig.currentPose.torso };
  };
  window.__floor = () => { const bad = []; scene = window.__scene; scene.traverse(o => { if (o.isMesh && o.geometry) { const b = new T.Box3().setFromObject(o); if (b.min.y < -0.004 && isFinite(b.min.y)) bad.push((o.parent && o.parent.type) + ':' + b.min.y.toFixed(3)); } }); return bad; };
};

(async () => {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4173/?fx=low&debug=1'); await p.waitForTimeout(2500);
  // new games start at home: walk to the gym first
  await p.click('[data-act=tab][data-arg=map]'); await p.click('[data-act=go][data-arg=gym]'); await p.click('[data-act=yes]');
  await p.waitForFunction(() => window.game.state.location === 'gym' && !window.game.busy, null, { timeout: 60000 }); await p.waitForTimeout(1200);
  await p.click('[data-act=tab][data-arg=here]');
  await p.evaluate(PAGE_HELPERS);
  const res = { viewport: `${W}x${H}` };

  // --- membership scenarios -------------------------------------------------
  // insufficient funds
  await p.evaluate(() => { window.game.state.money = 3; window.game.passTime(0); });
  await p.click('[data-act=buy][data-arg=dayPass]'); await p.click('[data-act=yes]');
  res.insufficient = await p.evaluate(() => ({ money: window.game.state.money, member: window.game.state.gym.membershipUntil > window.game.state.time, tx: window.game.state.transactions.length, startDisabled: document.querySelector('[data-act=start]').disabled }));
  await p.evaluate(() => { window.game.state.money = 500; window.game.passTime(0); });
  // double tap on confirm
  await p.click('[data-act=buy][data-arg=dayPass]');
  await p.evaluate(() => { const y = document.querySelector('[data-act=yes]'); y.click(); y.click(); y.click(); });
  res.afterDoubleTap = await p.evaluate(() => ({ money: window.game.state.money, tx: window.game.state.transactions.length }));
  await p.screenshot({ path: `${OUT}/v-${W}-purchased.png` });

  // --- full workout, sampling every frame ------------------------------------
  await p.click('[data-act=start]');
  for (let i = 0; i < 5; i++) await p.click('[data-act=reps][data-arg="-1"]'); // 3 reps
  const SAMPLER = () => { if (window.__sampling) return; window.__sampling = true; window.__samples = []; window.__fit = []; const f = () => { const s = window.__probe(); window.__samples.push({ t: Math.round(performance.now()), torso: +s.torso.toFixed(3), mode: window.game.workout.phase, blockers: s.blockers }); window.__fit.push({ scr: s.scr, barEnds: s.barEnds }); requestAnimationFrame(f); }; f(); };
  const drain = async () => ({ s: await p.evaluate(() => window.__samples), f: await p.evaluate(() => window.__fit) });
  await p.evaluate(SAMPLER);
  await p.click('[data-act=set]');
  await p.waitForSelector('[data-act=rest]:not([disabled])', { timeout: 240000 });
  await p.screenshot({ path: `${OUT}/v-${W}-rest-lying.png` });
  await p.click('[data-act=set]');
  await p.waitForTimeout(9000);
  await p.screenshot({ path: `${OUT}/v-${W}-set2-mid.png` });
  await p.waitForSelector('[data-act=rest]:not([disabled])', { timeout: 240000 });
  const pre = await drain();
  // refresh mid-workout => valid restored state
  await p.evaluate(() => window.game.save());
  await p.waitForTimeout(300);
  await p.reload(); await p.waitForTimeout(3000); await p.evaluate(PAGE_HELPERS); await p.evaluate(SAMPLER);
  res.afterReload = await p.evaluate(() => ({ session: !!window.game.state.workout, phase: window.game.workout.phase, torso: +window.game.rig.currentPose.torso.toFixed(3), canTrain: window.game.workout.canTrain, panelShown: !!document.querySelector('[data-act=set]') }));
  await p.screenshot({ path: `${OUT}/v-${W}-reloaded.png` });
  // stop: End workout -> stable seated pose
  await p.click('[data-act=end]');
  await p.waitForFunction(() => window.game.workout.phase === 'none' && window.game.rig.currentPose.torso < 0.2 && !window.game.workout.busy, null, { timeout: 60000 });
  res.afterEnd = await p.evaluate(() => ({ session: !!window.game.state.workout, torso: +window.game.rig.currentPose.torso.toFixed(3), summary: window.game.workout.lastSummary }));
  await p.screenshot({ path: `${OUT}/v-${W}-ended.png` });

  // --- expiry makes the workout panel disappear ------------------------------
  await p.evaluate(() => { window.game.state.gym.membershipUntil = window.game.state.time + 1; });
  await p.evaluate(() => window.game.passTime(5)); // membership expires
  res.expired = await p.evaluate(() => ({ member: window.game.workout.canTrain, panel: !!document.querySelector('[data-act=set]'), startDisabled: document.querySelector('[data-act=start]')?.disabled }));
  await p.screenshot({ path: `${OUT}/v-${W}-expired.png` });

  // expiry while a workout is active (new pass bought, session started, then time jumps)
  await p.evaluate(() => { window.game.state.money = 100; });
  await p.click('[data-act=buy][data-arg=dayPass]'); await p.click('[data-act=yes]');
  await p.click('[data-act=start]');
  await p.evaluate(() => window.game.state.gym.membershipUntil = window.game.state.time + 1);
  await p.evaluate(() => window.game.passTime(30));
  await p.waitForTimeout(500);
  res.expiredWhileActive = await p.evaluate(() => ({ session: !!window.game.state.workout, panel: !!document.querySelector('[data-act=set]'), startDisabled: document.querySelector('[data-act=start]')?.disabled }));

  // --- aggregate the per-frame samples ---------------------------------------
  const post = await drain(); const samples = [...pre.s, ...post.s], fit = [...pre.f, ...post.f];
  const classify = t => t > 1.5 ? 'LYING' : t < 0.2 ? 'SEATED' : 'TRANSITION';
  const seq = []; samples.forEach(s => { const c = classify(s.torso); if (seq.at(-1) !== c) seq.push(c); });
  res.poseSequence = seq;
  res.rackBlockedFrames = samples.filter(s => Object.keys(s.blockers).length).length + '/' + samples.length;
  res.rackBlockedParts = [...new Set(samples.flatMap(s => Object.keys(s.blockers)))];
  res.floorClips = await p.evaluate(() => window.__floor());
  // screen fit: character + bar must stay inside the free area between HUD and dock
  const area = await p.evaluate(() => ({ top: document.querySelector('.hud').getBoundingClientRect().bottom, bottom: document.querySelector('.sheet').getBoundingClientRect().top, w: innerWidth }));
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const f of fit) for (const v of [...Object.values(f.scr), ...f.barEnds]) { minX = Math.min(minX, v[0]); maxX = Math.max(maxX, v[0]); minY = Math.min(minY, v[1]); maxY = Math.max(maxY, v[1]); }
  res.fit = { area, character_and_bar_bbox: { minX: Math.round(minX), maxX: Math.round(maxX), minY: Math.round(minY), maxY: Math.round(maxY) }, insideFreeArea: minX >= 0 && maxX <= area.w && minY >= area.top - 4 && maxY <= area.bottom + 4 };
  res.errors = errs;
  console.log(JSON.stringify(res, null, 1));
  await b.close();
})();
