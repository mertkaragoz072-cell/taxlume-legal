// Denge simülasyonu (headless, tarayıcıda hızlı update döngüsü): iki bot — 'passive' (hiç kaçınmaz) ve 'skilled' (boss/düşman uyarısında kaçınır).
// Çıktı: bölüm başına ölüm, bölüm süresi (sn), boss süresi (sn), boss'ta kalan can %. Kullanım: node tools/tests/balance_sim.js [hero] [chunks]
const { chromium } = require('playwright');
const BASE = process.env.CLASHBORN_URL || 'http://localhost:8123';
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const hero = process.argv[2] || 'male', maxChunks = +process.argv[3] || 500, res = {};
  for (const mode of ['passive', 'skilled']) {
    const pg = await b.newPage({ viewport: { width: 844, height: 390 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.goto(`${BASE}/index.html?hq=1&hero=${hero}`); await pg.waitForFunction(() => window.__game && window.__game.state.player, null, { timeout: 30000 });
    await pg.evaluate(async (mode) => {
      localStorage.clear(); const g = window.__game, st = g.state, { Input } = await import('/src/core/input.js'); window.requestAnimationFrame = () => 0;
      window.__M = { deaths: {}, stageT: {}, bossT: {}, bossHpLeft: {}, t0: 0, bossStart: null, last: 1, dmgTaken: 0 };
      window.__chunk = (n) => { const M = window.__M, P = st.player;
        for (let i = 0; i < n; i++) {
          if (st.paused || st.over) return 'blocked';
          if (mode === 'skilled' && !st.over) {                                    // uyarı dairesi yakınında (≈ 0.25 sn kala) kaçın
            for (const t of st.telegraphs) { const left = t.life - t.t, d = Math.abs(t.a - P.a) * 3000; if (left < 0.3 && left > 0.08 && d < (t.radius || 80) + 60) Input.dodgeQueued = true; }
            const near = st.enemies.some((e) => !e.dead && e.attackT >= 0 && e.windT > 0 && Math.abs(e.a - P.a) * 3000 < 90); if (near && Math.random() < 0.05) Input.dodgeQueued = true;
          }
          const hp0 = P.hp; g.update(1 / 60); if (P.hp < hp0) M.dmgTaken += hp0 - P.hp; M.t0 += 1 / 60;
          const s = st.wave.stage; M.stageT[s] = (M.stageT[s] || 0) + 1 / 60;
          const bo = st.enemies.find((e) => e.def.boss && !e.dead);
          if (bo) { M.bossT[s] = (M.bossT[s] || 0) + 1 / 60; M.bossHp = bo.hp / bo.maxHp; } else if (M.bossHp != null) { M.bossHpLeft[s] = M.bossHp; M.bossHp = null; }
        } return 'ok'; };
    }, mode);
    for (let c = 0; c < maxChunks; c++) {
      await pg.evaluate(() => window.__chunk(300));
      const s = await pg.evaluate(() => { const w = window.__game.state.wave; return { over: window.__game.state.over, paused: window.__game.state.paused, stage: w.stage, up: !document.getElementById('upgrade').classList.contains('hidden'), cc: !document.getElementById('chapter-clear').classList.contains('hidden') }; });
      if (s.over) { await pg.evaluate(() => { const M = window.__M, k = window.__game.state.wave.stage; M.deaths[k] = (M.deaths[k] || 0) + 1; }); await pg.click('#restart-btn'); continue; }
      if (s.paused && s.up) { await pg.waitForTimeout(650); await pg.click('.up-card >> nth=0'); await pg.waitForTimeout(750); } else if (s.paused && s.cc) { await pg.waitForTimeout(100); await pg.click('#cc-continue'); }
      if (s.stage >= 5 && (await pg.evaluate(() => window.__game.state.wave.n)) >= 3) break;
    }
    const M = await pg.evaluate(() => window.__M); res[mode] = { deaths: M.deaths, stageSec: Object.fromEntries(Object.entries(M.stageT).map(([k, v]) => [k, Math.round(v)])), bossSec: Object.fromEntries(Object.entries(M.bossT).map(([k, v]) => [k, Math.round(v)])), bossHpLeftPct: Object.fromEntries(Object.entries(M.bossHpLeft).map(([k, v]) => [k, Math.round(v * 100)])), errors: errs }; await pg.close();
  }
  console.log(JSON.stringify(res, null, 1)); await b.close();
})();
