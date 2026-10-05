import { loadData, CONFIG, HERO, HEROES, setHero, ANIMS } from './core/config.js';
import { Assets } from './core/assets.js';
import { Input } from './core/input.js';
import { View } from './core/view.js';
import { state, resetState } from './game/state.js';
import { update, events, spawnEnemy } from './game/systems.js';
import { render } from './render/renderer.js';
import { initHud, updateHud, showGameOver, hideGameOver, drawAvatar } from './ui/hud.js';

function restart() {
  resetState();
  hideGameOver();
  updateHud();
}

// Karakter seçim ekranı: kartlara dokununca o kahraman seçilir, oyun başlar. Seçim bir sonraki açılış için hatırlanır (vurgulanır).
const PORTRAITS = { male: () => ({ img: 'male_idle_01', crop: CONFIG.hud.avatar.crop }), heroine: () => ({ img: 'heroine_portrait', crop: null }) };
function chooseHero() {
  return new Promise((resolve) => {
    let last = null; try { last = localStorage.getItem('nexora_hero'); } catch (_) { /* yoksay */ }
    const box = document.getElementById('select'), cards = document.getElementById('sel-cards');
    cards.innerHTML = '';
    for (const h of HEROES) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'sel-card' + (h.id === last ? ' last' : '');
      const cv = document.createElement('canvas'); cv.width = cv.height = 160; b.appendChild(cv);
      const t = document.createElement('div'); t.textContent = h.name; b.appendChild(t);
      const { img, crop } = PORTRAITS[h.id](), im = Assets.get(img);
      if (im) { const g = cv.getContext('2d'); if (crop) { g.imageSmoothingEnabled = false; g.drawImage(im, crop[0], crop[1], crop[2], crop[3], 0, 0, 160, 160); } else { const s = Math.min(im.width, im.height); g.drawImage(im, 0, 0, s, s, 0, 0, 160, 160); } }
      b.addEventListener('click', () => { setHero(h.id); try { localStorage.setItem('nexora_hero', h.id); } catch (_) { /* yoksay */ } box.classList.add('hidden'); resolve(h.id); });
      cards.appendChild(b);
    }
    box.classList.remove('hidden');
  });
}

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

  if (!HERO.fromUrl) await chooseHero();      // URL'de ?hero= yoksa karakter seçim ekranı
  initHud();
  drawAvatar();
  Input.init();
  const onResize = () => View.resize(canvas);
  addEventListener('resize', onResize);
  addEventListener('orientationchange', onResize);
  onResize();

  events.onGameOver = showGameOver;
  document.getElementById('restart-btn').addEventListener('click', restart);
  addEventListener('keydown', (e) => { if (state.over && (e.code === 'Enter' || e.code === 'Space')) restart(); });
  restart();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); // sekme dönüşünde sıçramayı önle
    last = now;
    if (window.innerHeight > window.innerWidth) { requestAnimationFrame(frame); return; }   // dikeyde duraklat (yatay uyarısı gösterilir)
    Input.update();
    update(dt);
    updateHud();
    render(ctx);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__game = { state, spawnEnemy, CONFIG }; // hata ayıklama
}
boot();
