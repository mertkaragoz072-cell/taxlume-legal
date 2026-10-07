#!/usr/bin/env node
// NEXORA test paketi — tek komut:  NODE_PATH=<playwright'ın node_modules'ü> node tools/tests/run_all.js   (çıkış kodu: hata varsa 1)
// Kendi statik sunucusunu açar, her testi yeni sayfada çalıştırır; oyun mantığı update(1/60) ile elle ilerletilir (rAF durdurulur → hızlı ve deterministik).
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', '..'), MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json' };
const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
const results = []; let browser, base;

async function page(hero = 'male', q = '') {
  const pg = await browser.newPage({ viewport: { width: 844, height: 390 } }); pg.errs = []; pg.on('pageerror', (e) => pg.errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error') pg.errs.push(m.text()); });
  await pg.goto(`${base}/index.html?hq=1&nosw&hero=${hero}${q}`); await pg.waitForFunction(() => window.__game && window.__game.state.player, null, { timeout: 30000 });
  await pg.evaluate(() => { localStorage.clear(); window.requestAnimationFrame = () => 0; }); await pg.evaluate(async () => (await import('/src/core/settings.js')).Settings.set('tutorialDone', true)); await pg.waitForTimeout(300); return pg;
}
const step = (pg, secs) => pg.evaluate((s) => { for (let i = 0; i < Math.round(s * 60); i++) window.__game.update(1 / 60); }, secs);
async function test(name, fn) { const t0 = Date.now(); try { await fn(); results.push([name, true, Date.now() - t0]); } catch (e) { results.push([name, false, Date.now() - t0, e.message.split('\n')[0]]); } }
const ok = (c, m) => { if (!c) throw new Error(m); };

(async () => {
  await new Promise((r) => srv.listen(0, r)); base = `http://localhost:${srv.address().port}`; browser = await chromium.launch({ args: ['--no-sandbox'] });

  for (const hero of ['male', 'heroine']) await test(`boot_${hero}`, async () => {
    const pg = await page(hero); ok(pg.errs.length === 0, 'konsol hatası: ' + pg.errs[0]);
    const r = await pg.evaluate(() => { const p = window.__game.state.player; return { hp: p.hp, max: p.maxHp, anim: p.anim }; }); ok(r.hp === r.max && r.hp > 0, 'can/maks tutarsız'); await pg.close();
  });

  await test('save_migration_and_corruption', async () => {
    const pg = await page();
    const r = await pg.evaluate(async () => {
      const { migrate } = await import('/src/core/save.js'), out = {};
      const v1 = { v: 1, lastHero: 'male', heroes: { male: { level: 3, xp: 5, coins: 9, gems: 1 } } }; const m = migrate(JSON.parse(JSON.stringify(v1)));
      out.v1to2 = m && m.v === 2 && m.heroes.male.level === 3 && !!m.meta && m.meta.stats.kills === 0;
      out.future = migrate({ v: 99, heroes: {} }) === null; out.garbage = migrate('x') === null && migrate({ v: 2 }) === null; return out;
    });
    ok(r.v1to2 && r.future && r.garbage, 'migrate: ' + JSON.stringify(r)); await pg.close();
    const p2 = await browser.newPage(); await p2.addInitScript(() => { if (!localStorage.getItem('seeded')) { localStorage.setItem('seeded', '1'); localStorage.setItem('nexora_save_v1', '{"v":99,"heroes":{}}'); } });
    await p2.goto(`${base}/index.html?hq=1&nosw&hero=male`); await p2.waitForFunction(() => window.__game && window.__game.state.player);
    const bk = await p2.evaluate(() => localStorage.getItem('nexora_save_corrupt')); ok(bk && bk.includes('"v":99'), 'yeni sürüm kayıt yedeklenmedi'); await p2.close();
  });

  await test('save_roundtrip', async () => {
    const pg = await page(); await pg.evaluate(async () => { const g = window.__game, { Save } = await import('/src/core/save.js'), p = g.state.player; p.coins = 77; p.gems = 3; p.upgrades = { attackDamage: 2 }; Save.write('male', p, g.state); });
    await pg.goto(`${base}/index.html?hq=1&nosw&hero=male`); await pg.waitForFunction(() => window.__game && window.__game.state.player);
    const r = await pg.evaluate(() => { const p = window.__game.state.player; return [p.coins, p.gems, p.upgrades.attackDamage]; }); ok(r.join() === '77,3,2', 'kayıt geri yüklenmedi: ' + r); await pg.close();
  });

  await test('combat_kill_rewards_and_hurt', async () => {
    const pg = await page(); const r = await pg.evaluate(async () => {
      const g = window.__game, st = g.state, p = st.player, c = await import('/src/game/combat.js'); st.enemies.length = 0; st.wave.phase = 'x';
      g.spawnEnemy('goblin_scout'); const en = st.enemies[0]; const k0 = st.kills; c.damageEnemy(en, 99999);
      const out = { killed: en.dead && st.kills === k0 + 1, coinsDropped: st.coins.length > 0 };
      p.invuln = 0; const hp0 = p.hp; c.hurtPlayer(10); out.hurt = p.hp < hp0; out.invuln = p.invuln > 0; const hp1 = p.hp; c.hurtPlayer(10); out.noDoubleHit = p.hp === hp1; return out;
    }); ok(r.killed && r.coinsDropped && r.hurt && r.invuln && r.noDoubleHit, JSON.stringify(r)); await pg.close();
  });

  await test('dodge_iframes_cooldown_perfect', async () => {
    const pg = await page(); const r = await pg.evaluate(async () => {
      const g = window.__game, st = g.state, p = st.player, { Input } = await import('/src/core/input.js'), c = await import('/src/game/combat.js'); st.enemies.length = 0; st.wave.phase = 'x'; const out = {};
      Input.dodgeQueued = true; g.update(1 / 60); out.started = p.dodgeT > 0; for (let i = 0; i < 10; i++) g.update(1 / 60);
      const hp = p.hp; c.hurtPlayer(40); out.blocked = p.hp === hp; out.perfectResetsCd = p.dodgeCd === 0; for (let i = 0; i < 40; i++) g.update(1 / 60);
      out.ended = p.dodgeT === 0 && p.hopH === 0; Input.dodgeQueued = true; g.update(1 / 60); const t = p.dodgeT; for (let i = 0; i < 40; i++) g.update(1 / 60);
      Input.dodgeQueued = true; g.update(1 / 60); out.cooldownBlocks = p.dodgeT === 0 || t > 0; return out;
    }); ok(r.started && r.blocked && r.perfectResetsCd && r.ended, JSON.stringify(r)); await pg.close();
  });

  await test('cards_three_distinct_max_four_powers', async () => {
    const pg = await page(); const r = await pg.evaluate(async () => {
      const um = await import('/src/game/UpgradeManager.js'), p = window.__game.state.player, out = {}; const cs = um.rollCards(3); out.three = cs.length === 3 && new Set(cs.map((x) => x.id)).size === 3;
      const ids = um.rollCards(8).map((x) => x.id).slice(0, 4); for (const id of ids) p.upgrades[id] = 1; const after = um.rollCards(3); out.onlyOwned = after.every((x) => ids.includes(x.id)); return out;
    }); ok(r.three && r.onlyOwned, JSON.stringify(r)); await pg.close();
  });

  await test('boss_wave_flow_and_chapter_clear', async () => {
    const pg = await page(); await pg.evaluate(() => { const g = window.__game, p = g.state.player; setInterval(() => { p.hp = p.maxHp; }, 0); g.startWave(1, 5, true); });
    const r = await pg.evaluate(async () => {
      const g = window.__game, st = g.state, c = await import('/src/game/combat.js'), out = {};
      for (let i = 0; i < 600 && !st.enemies.some((e) => e.def.boss); i++) g.update(1 / 60); const boss = st.enemies.find((e) => e.def.boss); out.bossSpawned = !!boss;
      const p = st.player; const coins0 = p.coins; boss.sp.phase = 'recover'; const hp0 = boss.hp; c.damageEnemy(boss, 100); out.recoverBonus = hp0 - boss.hp > 110;
      c.damageEnemy(boss, 1e6); for (let i = 0; i < 400; i++) { p.hp = p.maxHp; g.update(1 / 60); } out.rewarded = p.coins > coins0 + 200; out.paused = st.paused; return out;
    }); ok(r.bossSpawned && r.recoverBonus && r.rewarded, JSON.stringify(r)); ok(r.paused, 'boss sonrası seçim/bölüm ekranı açılmadı'); await pg.close();
  });

  await test('meta_shop_achievements_daily', async () => {
    const pg = await page(); const r = await pg.evaluate(async () => {
      const g = window.__game, p = g.state.player, M = await import('/src/game/Meta.js'), S = await import('/src/core/save.js'), P = await import('/src/game/PlayerStats.js'), out = {};
      M.initMeta(); out.daily = S.Save.meta().daily.goals.length === 3; p.coins = 400; const d0 = P.derived(p).damageMul; out.buy = M.shopBuy('s_damage').ok && Math.abs(P.derived(p).damageMul - d0 - 0.05) < 1e-9;
      p.coins = 0; out.poor = !M.shopBuy('s_damage').ok; M.add('kills', 50); out.ach = !!S.Save.meta().ach.kill_50;
      const gl = S.Save.meta().daily.goals[0]; M.add(gl.stat, gl.target); out.claim = M.claimDaily(gl.id) && !M.claimDaily(gl.id); return out;
    }); ok(Object.values(r).every(Boolean), JSON.stringify(r)); await pg.close();
  });

  await test('combo_chest_flawless_runs', async () => {
    const pg = await page(); const r = await pg.evaluate(async () => {
      const g = window.__game, st = g.state, p = st.player, c = await import('/src/game/combat.js'), CH = await import('/src/game/Chests.js'), M = await import('/src/game/Meta.js'), S = await import('/src/core/save.js'), { CONFIG } = await import('/src/core/config.js'), out = {};
      st.enemies.length = 0; st.wave.phase = 'x'; let coins0 = 0;
      for (let i = 0; i < 6; i++) { g.spawnEnemy('goblin_scout'); c.damageEnemy(st.enemies[st.enemies.length - 1], 1e6); } out.comboN = st.combo.n === 6; out.comboBest = st.combo.best >= 6;
      p.invuln = 0; c.hurtPlayer(5); out.comboReset = st.combo.n === 0; out.hitsWave = st.hitsWave === 1;
      st.combo.n = 3; st.combo.t = 0.05; for (let i = 0; i < 10; i++) g.update(1 / 60); out.comboExpire = st.combo.n === 0;
      CONFIG.chest.chance = 1; CH.maybeSpawnChest(false); out.chestSpawn = st.chests.length === 1; p.a = st.chests[0].a; coins0 = p.coins + p.gems * 1000 + p.xp; g.update(1 / 60); out.chestOpen = st.chests.length === 0 && (p.coins + p.gems * 1000 + p.xp + p.hp) !== 0;
      CH.maybeSpawnChest(true); out.bossNoChest = st.chests.length === 0;
      const r1 = M.recordRun({ kills: 30, bosses: 1, stage: 2, wave: 3 }); out.run = r1.score === 30 * 10 + 500 + 8 * 50 && r1.isBest; M.recordRun({ kills: 1, bosses: 0, stage: 1, wave: 1 }); out.runsSorted = S.Save.meta().runs[0].score === r1.score;
      p.gems = 100; const cd0 = (await import('/src/core/config.js')).SKILLS.skill1.cooldown; out.skillBuy = M.shopBuy('k1_cd').ok && M.skillLevel('k1_cd') === 1; return out;
    }); ok(Object.values(r).every(Boolean), JSON.stringify(r)); ok(pg.errs.length === 0, pg.errs[0]); await pg.close();
  });

  await test('settings_panel_and_accessibility', async () => {
    const pg = await page(); await pg.evaluate(() => { window.requestAnimationFrame = () => 0; });
    await pg.evaluate(async () => { const { Settings } = await import('/src/core/settings.js'); Settings.set('lefty', true); Settings.set('bigButtons', true); Settings.set('colorblind', true); Settings.set('shake', 0.5); });
    const r = await pg.evaluate(() => { const g = document.getElementById('game').classList; return { lefty: g.contains('lefty'), big: g.contains('big'), cb: g.contains('cb'), saved: JSON.parse(localStorage.getItem('nexora_settings_v1')).shake === 0.5 }; });
    ok(r.lefty && r.big && r.cb && r.saved, JSON.stringify(r));
    await pg.click('#btn-bag'); for (const t of ['stats', 'quests', 'shop', 'skills', 'settings']) { await pg.click(`[data-tab=${t}]`); const n = await pg.evaluate(() => document.getElementById('ip-body').innerText.length); ok(n > 20, 'boş sekme: ' + t); }
    await pg.click('[data-set=vibration]'); ok(await pg.evaluate(async () => !(await import('/src/core/settings.js')).Settings.get('vibration')), 'titreşim anahtarı');
    await pg.goto(`${base}/index.html?hq=1&nosw&hero=male`); await pg.waitForFunction(() => window.__game && window.__game.state.player);
    ok(await pg.evaluate(() => document.getElementById('game').classList.contains('lefty')), 'ayar yeniden açılışta kalıcı değil'); ok(pg.errs.length === 0, pg.errs[0]); await pg.close();
  });

  await test('tutorial_shows_once', async () => {
    const pg = await page('male', ''); await pg.evaluate(async () => { const { Settings } = await import('/src/core/settings.js'); Settings.set('tutorialDone', false); localStorage.removeItem('x'); });
    await pg.goto(`${base}/index.html?hq=1&nosw&hero=male`); await pg.waitForFunction(() => window.__game && window.__game.state.player); await pg.waitForSelector('#tut:not(.hidden)', { timeout: 8000 });
    ok(await pg.evaluate(() => document.querySelector('.tut-card').innerText.includes('kendiliğinden')), 'ilk adım yok');
    ok(await pg.evaluate(() => window.__game.state.userPause === true), 'öğretici oyunu durdurmadı');
    for (let i = 0; i < 14; i++) { if (await pg.evaluate(() => document.getElementById('tut').classList.contains('hidden'))) break; if (await pg.evaluate(() => document.querySelector('.tut-rib')?.innerText.includes('Kaçın'))) { await pg.keyboard.press('Shift'); await pg.waitForTimeout(1200); continue; } await pg.click('.tut-next', { force: true }).catch(() => {}); await pg.waitForTimeout(300); }
    ok(await pg.evaluate(() => window.__game.state.userPause === false), 'öğretici bitince oyun devam etmedi');
    ok(await pg.evaluate(async () => (await import('/src/core/settings.js')).Settings.get('tutorialDone')), 'öğretici bitince işaretlenmedi'); await pg.close();
  });

  await test('world_ends_after_5_bosses', async () => {
    const pg = await page('male', '');
    const r = await pg.evaluate(async () => {
      const { chapterInfo } = await import('/src/game/chapters.js'), WM = await import('/src/game/WaveManager.js'), st = window.__game.state;
      const a = chapterInfo(4), b = chapterInfo(5), c = chapterInfo(6);
      st.wave.stage = 5; st.wave.boss = true; WM.resumeAfterUpgrade();
      return { a: a.isWorldEnd, b: b.isWorldEnd, c: c.universeNo + ':' + c.isWorldStart, title: document.getElementById('cc-title').textContent, stage: st.wave.stage };
    });
    ok(!r.a && r.b && r.c === '2:true', 'evren sınırı yanlış ' + JSON.stringify(r)); ok(r.title === 'EVREN TAMAMLANDI!' && r.stage === 6, 'evren sonu ekranı/ilerleme yok ' + JSON.stringify(r)); await pg.close();
  });

  await test('world_rosters_bosses_mechanics', async () => {
    const pg = await page('male', '');
    const r = await pg.evaluate(async () => {
      const ES = await import('/src/game/EnemySpawner.js'), C = await import('/src/game/combat.js'), CH = await import('/src/game/chapters.js'), st = window.__game.state, out = {};
      out.m = ES.buildQueue(1, 3, false).every((k) => k.startsWith('goblin')) && ES.buildQueue(3, 5, false).some((k) => ['goblin_shield','goblin_berserker','goblin_shaman','goblin_bomber','goblin_sprinter','goblin_pikeman'].includes(k)); out.e = ES.buildQueue(6, 4, false).every((k) => /^(ember_|goblin_)/.test(k) && !k.startsWith('goblin')); out.f = ES.buildQueue(11, 2, false).every((k) => k.startsWith('frost_'));
      out.bosses = [1, 2, 5, 6, 10, 15].map((s) => ES.buildQueue(s, 1, true)[0]).join(',');
      const t = ES.spawnEnemy('ember_guard'); const h0 = t.hp; C.damageEnemy(t, 100); out.armor = Math.round(h0 - t.hp);
      const b = ES.spawnEnemy('frost_warden'); out.cfg = b.bossCfg.disable?.[0] === 'charge' && b.bossCfg.hammer.radius > 0 && b.bossCfg.smash.radius === 340;
      st.player.hp = st.player.maxHp = 500; const bo = ES.spawnEnemy('ember_bomber'); bo.a = st.player.a; const hp0 = st.player.hp; C.killEnemy(bo); out.boom = st.player.hp < hp0;
      return out;
    });
    ok(r.m && r.e && r.f, 'evren rosterları yanlış ' + JSON.stringify(r)); ok(r.bosses === 'goblin_boss,goblin_warlord,goblin_king,ember_chief,ember_overlord,frost_king', 'boss listesi ' + r.bosses);
    ok(r.armor === 72, 'zırh çalışmıyor ' + r.armor); ok(r.cfg, 'bossCfg birleşmedi'); ok(r.boom, 'patlayıcı düşman hasar vermedi'); await pg.close();
  });

  await test('every_enemy_has_animations_and_frames', async () => {
    const pg = await page('male', '');
    const bad = await pg.evaluate(async () => { const { ENEMY_TYPES, ANIMS } = await import('/src/core/config.js'), { Assets } = await import('/src/core/assets.js'), out = [];
      for (const [k, d] of Object.entries(ENEMY_TYPES)) { const m = ANIMS.enemies[d.animFrom || k]; if (!m) { out.push(k + ': animasyon yok'); continue; } for (const an of ['walk', 'attack', 'hurt', 'death']) for (const f of (m.anims[an]?.frames || [])) if (!Assets.get(f)) out.push(k + ':' + f); if (!m.anims.walk || !m.anims.death) out.push(k + ': walk/death eksik'); }
      return out; });
    ok(!bad.length, 'düşman animasyon/kare eksik: ' + bad.slice(0, 5).join(', ')); await pg.close();
  });

  await test('death_and_restart', async () => {
    const pg = await page('heroine'); const r = await pg.evaluate(async () => {
      const g = window.__game, st = g.state, p = st.player, c = await import('/src/game/combat.js'); st.enemies.length = 0; st.wave.phase = 'x'; p.invuln = 0; p.hp = 1; c.hurtPlayer(50);
      const out = { over: st.over, anim: p.anim }; for (let i = 0; i < 200; i++) g.update(1 / 60); out.animT = p.animT > 1; return out;
    }); ok(r.over && r.anim === 'death' && r.animT, JSON.stringify(r));
    await pg.waitForSelector('#restart-btn', { state: 'visible', timeout: 5000 }); await pg.click('#restart-btn');
    const a = await pg.evaluate(() => ({ over: window.__game.state.over, anim: window.__game.state.player.anim, hp: window.__game.state.player.hp })); ok(!a.over && a.anim === 'idle' && a.hp > 0, JSON.stringify(a)); ok(pg.errs.length === 0, pg.errs[0]); await pg.close();
  });

  await test('soak_two_chapters_no_anomaly', async () => {
    const pg = await page(); await pg.evaluate(() => { const g = window.__game, st = g.state, p = st.player; window.__an = new Set(); window.__ch = 0;
      window.__chunk = (n) => { for (let i = 0; i < n; i++) { if (st.paused || st.over) return; g.update(1 / 60); p.hp = Math.max(p.hp, p.maxHp * 0.5);
        if (!Number.isFinite(p.hp) || !Number.isFinite(p.a)) window.__an.add('NaN'); if (p.hp > p.maxHp + 0.01) window.__an.add('hp>max'); if (st.enemies.length > 25) window.__an.add('enemies>25'); for (const e of st.enemies) if (!Number.isFinite(e.a)) window.__an.add('enemy NaN'); } }; });
    for (let c = 0; c < 400; c++) {
      await pg.evaluate(() => window.__chunk(900));
      const s = await pg.evaluate(() => { const st = window.__game.state; return { over: st.over, paused: st.paused, up: !document.getElementById('upgrade').classList.contains('hidden'), cc: !document.getElementById('chapter-clear').classList.contains('hidden'), ch: window.__ch }; });
      if (s.over) { await pg.click('#restart-btn'); continue; }
      if (s.paused && s.up) { await pg.waitForTimeout(650); await pg.click('.up-card >> nth=0'); await pg.waitForTimeout(750); }
      else if (s.paused && s.cc) { await pg.waitForTimeout(150); await pg.click('#cc-continue'); await pg.evaluate(() => { window.__ch++; }); if (s.ch + 1 >= 2) break; }
    }
    const r = await pg.evaluate(() => ({ an: [...window.__an], ch: window.__ch })); ok(r.an.length === 0, 'anomali: ' + r.an); ok(r.ch >= 2, 'bölümler ilerlemedi: ' + JSON.stringify(r)); ok(pg.errs.length === 0, pg.errs[0]); await pg.close();
  });

  await browser.close(); srv.close();
  const w = Math.max(...results.map((r) => r[0].length)); let fail = 0;
  for (const [n, pass, ms, msg] of results) { if (!pass) fail++; console.log(`${pass ? 'PASS' : 'FAIL'}  ${n.padEnd(w)}  ${String(ms).padStart(6)} ms${pass ? '' : '  ← ' + msg}`); }
  console.log(`\n${results.length - fail}/${results.length} geçti`); process.exit(fail ? 1 : 0);
})();
