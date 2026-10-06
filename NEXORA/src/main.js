import { loadData, CONFIG, HERO, HEROES, setHero, ANIMS } from './core/config.js';
import { Assets } from './core/assets.js';
import { Audio } from './core/audio.js';
import { Save } from './core/save.js';
import { Input } from './core/input.js';
import { View } from './core/view.js';
import { state, resetState } from './game/state.js';
import { update, spawnEnemy } from './game/systems.js';
import { render } from './render/renderer.js';
import { initHud, updateHud, showGameOver, hideGameOver, drawAvatar, pulse } from './ui/hud.js';
import { initBuffs, updateBuffs, popBuffs } from './ui/buffs.js';
import { initWaveHud, updateWaveHud, showBanner } from './ui/waveHud.js';
import { showUpgrade } from './ui/UpgradeCard.js';
import { startWave, resumeAfterUpgrade, isBossWave } from './game/WaveManager.js';
import { applyUpgrade, upgradeById } from './game/UpgradeManager.js';
import { addText } from './game/combat.js';
import { events } from './game/events.js';

function restart() {
  resetState();
  Save.apply(state.player, HERO.id, state);          // kayıtlı seviye/coin/gem/güçlendirme/dalga geri yüklenir
  startWave(state.wave.n);
  hideGameOver();
  updateHud(); updateBuffs(true);
}

// Karakter seçim ekranı: kartlara dokununca o kahraman seçilir, oyun başlar. Seçim bir sonraki açılış için hatırlanır (vurgulanır).
const PORTRAITS = { male: () => ({ img: 'male_idle_01', crop: CONFIG.hud.avatar.crop }), heroine: () => ({ img: 'heroine_portrait', crop: null }) };
function chooseHero() {
  return new Promise((resolve) => {
    const last = Save.lastHero();
    const box = document.getElementById('select'), cards = document.getElementById('sel-cards');
    cards.innerHTML = '';
    for (const h of HEROES) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'sel-card' + (h.id === last ? ' last' : '');
      const cv = document.createElement('canvas'); cv.width = cv.height = 160; b.appendChild(cv);
      const t = document.createElement('div'); t.textContent = h.name; b.appendChild(t);
      const sv = Save.of(h.id), info = document.createElement('div'); info.className = 'sel-info'; info.textContent = sv ? `Lv. ${sv.level} · Dalga ${sv.wave || 1}` : 'Yeni oyun'; b.appendChild(info);
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
  await Assets.load(manifest.images);
  Save.load();

  if (!HERO.fromUrl) await chooseHero();      // URL'de ?hero= yoksa karakter seçim ekranı
  initHud();
  initWaveHud();
  initBuffs();
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
  events.onKill = () => Audio.play('kill');
  events.onHurt = () => Audio.play('hurt');
  events.onSkill = (id) => Audio.play(id);
  const showOver = showGameOver;
  events.onWaveStart = (n, info) => { showBanner(info.boss ? `BOSS DALGASI ${n}` : `WAVE ${n}`, info.boss ? 'boss' : '', info.boss ? 'Goblin Lordu geliyor!' : ''); Audio.play(info.boss ? 'skill2' : 'click'); };
  events.onWaveComplete = (n) => { if (!isBossWave(n)) { showBanner('WAVE COMPLETE', 'complete'); Audio.play('levelup'); } };
  events.onBoss = (k, amount) => { if (k === 'slam') Audio.play('skill2'); else if (k === 'dead') { showBanner('BOSS YENİLDİ!', 'bossdead', `+${amount} COIN`); Audio.play('levelup'); } };
  events.onUpgrade = (cards, epic) => {
    Audio.play('gem');
    showUpgrade(cards, epic, (card) => {
      applyUpgrade(card.id, epic);
      const u = upgradeById(card.id), p = state.player;
      addText(p.a, 150, `${card.icon} ${card.bonus} ${card.name}`, '#ffd23f', 1.1); addText(p.a, 125, 'GÜÇ UYGULANDI!', '#ffffff', 0.8);
      state.rings.push({ a: p.a, t: 0, life: 0.9 }); state.rings.push({ a: p.a, t: 0, life: 1.3, color: '#ffd23f' });
      updateBuffs(); popBuffs(); Audio.play('levelup'); pulse('avatar-ring'); saveNowRef?.(); resumeAfterUpgrade();
    });
  };
  events.onGameOver = (st) => { Audio.play('gameover'); showOver(st); };
  events.onCoin = () => { pulse('pill-coin'); Audio.play('coin'); };
  events.onGem = () => { pulse('pill-gem'); Audio.play('gem'); };
  events.onLevelUp = () => { pulse('avatar-ring'); pulse('level-pulse'); Audio.play('levelup'); };
  document.getElementById('restart-btn').addEventListener('click', restart);
  addEventListener('keydown', (e) => { if (state.over && (e.code === 'Enter' || e.code === 'Space')) restart(); });
  restart();
  // Otomatik kayıt: 5 sn'de bir, seviye atlayınca, ölünce, sekme gizlenince/kapanınca
  const saveNow = () => Save.write(HERO.id, state.player, state); saveNowRef = saveNow;
  setInterval(saveNow, 5000);
  addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
  addEventListener('pagehide', saveNow);
  const lvl = events.onLevelUp; events.onLevelUp = (l) => { lvl?.(l); saveNow(); };
  const over = events.onGameOver; events.onGameOver = (st) => { over?.(st); saveNow(); };

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); // sekme dönüşünde sıçramayı önle
    last = now;
    if (window.innerHeight > window.innerWidth) { requestAnimationFrame(frame); return; }   // dikeyde duraklat (yatay uyarısı gösterilir)
    Input.update();
    update(dt);
    updateHud();
    updateWaveHud();
    updateBuffs();
    render(ctx);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__game = { state, spawnEnemy, CONFIG, Audio, update, startWave }; // hata ayıklama
}
boot();
