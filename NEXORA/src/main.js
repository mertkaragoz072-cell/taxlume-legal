import { loadData } from './core/config.js';
import { Assets } from './core/assets.js';
import { Input } from './core/input.js';
import { View } from './core/view.js';
import { state, resetState } from './game/state.js';
import { update, events } from './game/systems.js';
import { render } from './render/renderer.js';
import { initHud, updateHud, showGameOver, hideGameOver } from './ui/hud.js';

function restart() {
  resetState();
  hideGameOver();
  updateHud();
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

  initHud();
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
    Input.update();
    update(dt);
    updateHud();
    render(ctx);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__game = { state }; // hata ayıklama
}
boot();
