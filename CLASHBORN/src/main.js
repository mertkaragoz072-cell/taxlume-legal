import { loadData, ENEMY_TYPES, CHAPTERS, WAVES, CONFIG, HERO, HEROES, setHero } from './core/config.js';
import { Assets } from './core/assets.js';
import { Audio } from './core/audio.js';
import { Save } from './core/save.js';
import { Input } from './core/input.js';
import { View } from './core/view.js';
import { state, resetState } from './game/state.js';
import { update, spawnEnemy } from './game/systems.js';
import { render } from './render/renderer.js';
import { prewarmTints } from './render/characters.js';
import { initHud, updateHud, showGameOver, hideGameOver, drawAvatar, pulse } from './ui/hud.js';
import { initBuffs, updateBuffs, popBuffs } from './ui/buffs.js';
import { initWaveHud, updateWaveHud, showBanner } from './ui/waveHud.js';
import { showUpgrade } from './ui/UpgradeCard.js';
import { showChapterClear } from './ui/ChapterClear.js';
import { initInfoPanel } from './ui/InfoPanel.js';
import { initMeta, add as metaAdd, setMax as metaMax, recordRun } from './game/Meta.js';
import { Settings, haptic } from './core/settings.js';
import { initErrorLog } from './core/errorlog.js';
import { startTutorial, tutorialDodgeUsed } from './ui/Tutorial.js';
import { maybeSpawnChest } from './game/Chests.js';
import { chapterInfo, bossFor } from './game/chapters.js';
import { startWave, resumeAfterUpgrade, continueChapter } from './game/WaveManager.js';
import { applyUpgrade } from './game/UpgradeManager.js';
import { addText, gainXp } from './game/combat.js';
import { events } from './game/events.js';
import { CardSystem, debugGrantAll } from './game/CardSystem.js';

function restart() {
  resetState();
  Save.apply(state.player, HERO.id, state);          // kayıtlı seviye/coin/gem/güçlendirme/dalga geri yüklenir
  const cq = new URLSearchParams(location.search).get('cards'); if (cq) debugGrantAll(Math.max(1, +cq || 1));   // test: ?cards=1..5
  const sq = new URLSearchParams(location.search).get('stage'); if (sq) { Object.assign(state.wave, { stage: Math.max(1, +sq | 0), n: 1, boss: false }); }   // önizleme: ?stage=6 → 2. evrenin 1. bölümü
  startWave();
  hideGameOver();
  updateHud(); updateBuffs(true);
}

// Karakter seçim ekranı: kartlara dokununca o kahraman seçilir, oyun başlar. Seçim bir sonraki açılış için hatırlanır (vurgulanır).
const PORTRAITS = { male: () => ({ img: 'male_portrait', crop: null }), heroine: () => ({ img: 'heroine_portrait', crop: null }) };
function chooseHero() {
  return new Promise((resolve) => {
    const last = Save.lastHero();
    const box = document.getElementById('select'), cards = document.getElementById('sel-cards');
    cards.innerHTML = '';
    for (const h of HEROES) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'sel-card' + (h.id === last ? ' last' : '');
      const cv = document.createElement('canvas'); cv.width = cv.height = 160; b.appendChild(cv);
      const t = document.createElement('div'); t.textContent = h.name; b.appendChild(t);
      const sv = Save.of(h.id), info = document.createElement('div'); info.className = 'sel-info'; info.textContent = sv ? `Lv. ${sv.level} · ${chapterInfo(sv.stage || Math.floor(((sv.wave || 1) - 1) / 5) + 1).short}` : 'Yeni oyun'; b.appendChild(info);
      const { img, crop } = PORTRAITS[h.id](), im = Assets.get(img);
      if (im) { const g = cv.getContext('2d'); if (crop) { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(im, crop[0], crop[1], crop[2], crop[3], 0, 0, 160, 160); } else { const s = Math.min(im.width, im.height); g.drawImage(im, 0, 0, s, s, 0, 0, 160, 160); } }
      b.addEventListener('click', () => { setHero(h.id); Save.setLast(h.id); box.classList.add('hidden'); resolve(h.id); });
      cards.appendChild(b);
    }
    const wipe = document.getElementById('sel-wipe'); let armed = false;
    if (wipe) { wipe.onclick = () => { if (!armed) { armed = true; wipe.textContent = 'Emin misin? Tekrar dokun'; setTimeout(() => { armed = false; wipe.textContent = 'Kaydı Sil'; }, 3000); return; } Save.clear(); chooseHero().then(resolve); }; }
    box.classList.remove('hidden');
  });
}

let saveNowRef = null;
async function boot() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  let manifest;
  try {
    manifest = await loadData('data/');
  } catch (err) {
    const box = document.getElementById('loaderror');
    box.textContent = 'Oyun verisi yüklenemedi. Dosyayı bir yerel sunucu üzerinden aç (ör. python3 -m http.server). ' + err.message;
    box.classList.remove('hidden');
    throw err;
  }
  await Assets.load(manifest.images, manifest.trim);
  Save.load();
  initMeta(); Settings.apply();

  if (!HERO.fromUrl) await chooseHero();      // URL'de ?hero= yoksa karakter seçim ekranı
  Assets.release(HERO.id === 'male' ? ['heroine_', 'female_'] : ['male_', 'female_'], ['heroine_portrait', 'female_portrait']);        // seçilmeyen kahramanın kareleri bellekten atılır
  {                                                           // kare setlerini oyun başlamadan çöz (ilk çizimde takılma olmasın): önce kahraman + temel düşmanlar, bosslar arka planda
    const mine = HERO.id === 'male' ? 'male_' : 'heroine_', base = /^enemy_goblin_(scout|warrior|brute)_/;
    await Assets.warm((k) => k.startsWith(mine) || base.test(k));
    setTimeout(() => Assets.warm((k) => /^enemy_goblin_(boss|warlord|king)_/.test(k), 2), 1500);
  }
  initHud();
  initWaveHud();
  initBuffs();
  initInfoPanel();
  drawAvatar();
  Input.init();
  const onResize = () => View.resize(canvas);
  addEventListener('resize', onResize);
  addEventListener('orientationchange', onResize);
  onResize();

  // Ses: ilk dokunuş/tuşta kilit açılır; olay kancaları ses çalar; gear düğmesi / M ses aç-kapat
  const unlock = () => Audio.unlock();
  for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, unlock, { once: false, passive: true });
  const soundBtn = document.getElementById('btn-sound');
  const syncSound = () => { soundBtn.textContent = Audio.muted ? '\u{1F507}' : '\u{1F50A}'; };
  soundBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); Audio.unlock(); Audio.toggle(); syncSound(); });
  addEventListener('keydown', (e) => { if (e.code === 'KeyM' && !e.repeat) { Audio.toggle(); syncSound(); } });
  syncSound();
  events.onSlash = () => Audio.play('slash');
  events.onHit = () => Audio.play('hit');
  events.onKill = (en) => { Audio.play('kill'); if (en?.def?.boss) haptic([80, 40, 80]); };
  events.onHurt = () => { Audio.play('hurt'); haptic(45); };
  events.onSkill = (id) => Audio.play(id);
  events.onDodge = (perfect) => { Audio.play(perfect ? 'levelup' : 'click'); haptic(perfect ? [25, 30, 25] : 12); tutorialDodgeUsed(); };
  events.onCrit = () => haptic(10);
  events.onChest = () => { Audio.play('gem'); haptic(30); };
  const showOver = showGameOver;
  let bossIntroTimer = 0;
  events.onWaveStart = (n, info) => {
    state.hitsWave = 0; maybeSpawnChest(info.boss); if (n === 1 && info.stage === 1) startTutorial();
    const bi = document.getElementById('boss-intro');
    if (info.boss) {                                                  // boss girişi: ekran kararır, ortada BOSS WAVE / <BOSS ADI> GELİYOR!
      bi.querySelector('p').textContent = `${ENEMY_TYPES[bossFor(info.stage, WAVES.bossType)]?.title || 'BOSS'} GELİYOR!`;
      bi.classList.remove('hidden', 'show'); void bi.offsetWidth; bi.classList.add('show'); clearTimeout(bossIntroTimer);
      bossIntroTimer = setTimeout(() => bi.classList.add('hidden'), WAVES.bossIntroSec * 1000 + 100); Audio.play('skill2');
    } else { bi.classList.add('hidden'); showBanner(`WAVE ${n} / 5`, '', n === 1 ? (chapterInfo(info.stage).isWorldStart ? `✦ EVREN ${chapterInfo(info.stage).universeNo} · ${chapterInfo(info.stage).name} ✦` : chapterInfo(info.stage).label) : ''); Audio.play('click'); }
  };
  events.onWaveComplete = (n, i) => {
    if (!i?.boss) { showBanner('WAVE CLEARED!', 'complete'); Audio.play('levelup'); }
    if (state.hitsWave === 0 && !state.over) {                                  // KUSURSUZ: dalga boyunca hiç hasar alınmadı
      const F = CONFIG.flawless, p = state.player, coins = (i?.boss ? F.bossBase : F.base) + F.perStage * i.stage, gems = i?.boss ? F.bossGems : 0;
      p.coins += coins; p.gems += gems; metaAdd('flawless'); events.onCoin?.(); if (gems) events.onGem?.();
      addText(p.a, 165, `KUSURSUZ! +${coins} COIN${gems ? ` +${gems} 💎` : ''}`, '#7dffb0', 1.1, false, { life: 1.6, rise: 24, key: 'flawless' });
    }
  };
  events.onChapterClear = (cleared) => {
    const p = state.player, R = CHAPTERS.reward; let xp = gainXp(R.xp * cleared); metaAdd('chapters'); const ci = chapterInfo(cleared), WR = CHAPTERS.worldReward; if (ci.isWorldEnd) { metaAdd('worlds'); p.coins += WR.coins; p.gems += WR.gems; xp += gainXp(WR.xp); }
    p.coins += R.coins; p.gems += R.gems; events.onCoin?.(); events.onGem?.();
    saveNowRef?.();                                                   // ilerleme (yeni bölüm, dalga 1) + ödüller hemen kaydedilir
    Audio.play('levelup');
    const nx = chapterInfo(cleared + 1), cr = ci.isWorldEnd ? { coins: R.coins + WR.coins, gems: R.gems + WR.gems, xp } : { coins: R.coins, gems: R.gems, xp };
    showChapterClear({ name: ci.isWorldEnd ? `Evren ${ci.universeNo} · ${ci.name}` : ci.label, rewards: cr, world: ci.isWorldEnd, next: ci.isWorldEnd ? `Yeni evren: Evren ${nx.universeNo} · ${nx.name}` : `Sıradaki bölüm: ${nx.label}` }, () => { continueChapter(); saveNowRef?.(); });
  };
  events.onBoss = (k, amount, xp) => { if (k === 'slam' || k === 'charge') Audio.play('skill2'); else if (k === 'telegraph') Audio.play('click'); else if (k === 'dead') { showBanner('BOSS YENİLDİ!', 'bossdead', `+${amount} COIN · +${xp} XP`); Audio.play('levelup'); } };
  events.onUpgrade = (cards, boss) => {
    Audio.play('gem');
    showUpgrade(cards, boss, (card) => {
      applyUpgrade(card);
      const p = state.player;
      addText(p.a, 150, `${card.icon} ${card.bonus} ${card.desc}`, '#ffd23f', 1.1); addText(p.a, 125, 'GÜÇ UYGULANDI!', '#ffffff', 0.8);
      state.rings.push({ a: p.a, t: 0, life: 0.9 }); state.rings.push({ a: p.a, t: 0, life: 1.3, color: '#ffd23f' });
      updateBuffs(); popBuffs(); Audio.play('levelup'); pulse('avatar-ring'); resumeAfterUpgrade(); saveNowRef?.();
    });
  };
  events.onGameOver = (st) => { Audio.play('gameover'); haptic([120, 60, 120]); const rr = recordRun({ kills: state.kills, bosses: state.runBosses, stage: state.wave.stage, wave: state.wave.n }); const gs = document.getElementById('go-score'); if (gs && rr) gs.textContent = `Skor ${rr.score}  ·  ${rr.isBest ? '🏆 YENİ REKOR!' : 'En iyi ' + rr.best}`; setTimeout(() => { if (state.over) showOver(st); }, 1400); };   // düşme animasyonu görünsün diye panel gecikmeli
  events.onCoin = () => { pulse('pill-coin'); Audio.play('coin'); };
  events.onGem = () => { pulse('pill-gem'); Audio.play('gem'); };
  events.onLevelUp = () => { pulse('avatar-ring'); pulse('level-pulse'); Audio.play('levelup'); haptic([40, 30, 40]); };
  document.getElementById('restart-btn').addEventListener('click', restart);
  addEventListener('keydown', (e) => { if (state.over && (e.code === 'Enter' || e.code === 'Space')) restart(); });
  restart();
  metaMax('level', state.player.level);
  const toastEl = document.getElementById('toast'); let toastQ = [], toastBusy = false;
  events.onToast = (html) => { toastQ.push(html); if (!toastBusy) nextToast(); };
  function nextToast() { const h = toastQ.shift(); if (!h) { toastBusy = false; return; } toastBusy = true; toastEl.innerHTML = h; toastEl.classList.add('show'); Audio.play('levelup'); setTimeout(() => { toastEl.classList.remove('show'); setTimeout(nextToast, 350); }, 2600); }
  // Otomatik kayıt: 5 sn'de bir, seviye atlayınca, ölünce, sekme gizlenince/kapanınca
  const saveNow = () => Save.write(HERO.id, state.player, state); saveNowRef = saveNow;
  setInterval(saveNow, 5000);
  addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
  addEventListener('pagehide', saveNow);
  const lvl = events.onLevelUp; events.onLevelUp = (l) => { lvl?.(l); saveNow(); };
  const over = events.onGameOver; events.onGameOver = (st) => { over?.(st); saveNow(); };

  // Uyarlanabilir çözünürlük: kare süresi sürekli >26 ms ise (yavaş cihaz) canvas çözünürlüğü kademeli düşürülür (3 → 2.5 → … → 1.25); geri artmaz.
  // ?hq=1 ile kapatılır (ekran görüntüsü/test).
  let slowSum = 0, slowN = 0; const hq = new URLSearchParams(location.search).has('hq');
  function adaptResolution(raw) {
    if (hq || raw > 200 || document.hidden) return;                 // sekme dönüşü/duraklama sayılmaz
    slowSum += raw; if (++slowN < 90) return;
    const avg = slowSum / slowN; slowSum = 0; slowN = 0;
    if (avg > 22 && View.dprCap > 1.25 && View.dpr > 1.25) { View.dprCap = Math.max(1.25, View.dprCap - 0.5); View.resize(canvas); }
  }
  let fAcc = 0, fN = 0, fWorst = 0; const fpsEl = document.getElementById('fps');            // ayarlardan açılan FPS göstergesi (gerçek cihaz ölçümü için)
  function fpsTick(raw) { if (!fpsEl || fpsEl.classList.contains('hidden') || raw > 200) return; fAcc += raw; fN++; fWorst = Math.max(fWorst, raw); if (fAcc >= 500) { fpsEl.textContent = `${Math.round(fN * 1000 / fAcc)} FPS · ${(fAcc / fN).toFixed(1)} ms (en kötü ${Math.round(fWorst)}) · çöz. ${View.dpr}×`; fAcc = fN = fWorst = 0; } }
  let lowT = 0;
  function lowHpTick(dt) {                                         // can düşük: kalp atışı sesi + hafif titreşim
    const p = state.player; if (state.over || state.paused || p.hp / p.maxHp > CONFIG.lowHp.frac) { lowT = 0; return; }
    if ((lowT -= dt) <= 0) { lowT = 0.95; Audio.play('heartbeat'); haptic(20); }
  }
  let last = performance.now();
  function frame(now) {
    const raw = now - last; let dt = Math.min(raw / 1000, 0.05); // sekme dönüşünde sıçramayı önle
    if (state.slowT > 0) { state.slowT -= dt; dt *= 0.3; }          // boss ölümü: kısa slow motion (gerçek süreyle ~1 sn)
    adaptResolution(raw); fpsTick(raw);
    last = now;
    if (window.innerHeight > window.innerWidth) { requestAnimationFrame(frame); return; }   // dikeyde duraklat (yatay uyarısı gösterilir)
    Input.update();
    update(dt);
    lowHpTick(dt);
    updateHud();
    updateWaveHud();
    updateBuffs();
    prewarmTints(state.wave.stage, 3);
    render(ctx);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__game = { state, spawnEnemy, CONFIG, Audio, update, startWave, render: () => render(ctx) }; window.__cards = CardSystem; // hata ayıklama
}
// Çevrimdışı/PWA: service worker (CSP satır içi scripti engellediği için burada; test için ?hq=1 veya ?nosw ile kapalı)
if ('serviceWorker' in navigator && !/[?&](hq|nosw)\b/.test(location.search) && (location.protocol === 'https:' || location.hostname === 'localhost')) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
initErrorLog();
boot();
