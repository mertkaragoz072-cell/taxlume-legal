// Bootstrap: canvas sizing, main loop, pointer input and UI wiring.
import { DESIGN } from './config.js';
import { loadAssets } from './assets.js';
import { StreetScene } from './scene/street-scene.js';
import { bakery } from './buildings/bakery.js';
import { bookshop } from './buildings/bookshop.js';
import { market } from './buildings/market.js';
import { createHud } from './ui/hud.js';
import { createNav } from './ui/nav.js';
import { showToast } from './ui/toast.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const toast = document.getElementById('toast');

let scene = null;                 // active scene; a future CafeScene can replace it via enterScene()
const street = new StreetScene();
const view = { W: 0, H: 0, dpr: 1, scale: 1, vw: 0, vh: 0, ox: 0, oy: 0 };

/** Scene switch hook: the cafe interior will plug in here later. */
function enterScene(id) {
  if (id === 'cafe') showToast(toast, 'Kafe iç mekânı yakında!');
  // scene = cafeScene; scene.resize(view);   <- next stage
}

function layout() {
  const W = window.innerWidth, H = window.innerHeight;
  // Cap the pixel budget so large phones stay smooth.
  const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2.6e6 / (W * H)) || 1);
  view.W = W; view.H = H; view.dpr = Math.max(1, dpr);
  view.scale = Math.min(W / DESIGN.w, H / DESIGN.h);
  view.vw = W / view.scale; view.vh = H / view.scale;
  view.ox = (view.vw - DESIGN.w) / 2;
  view.oy = view.vh - DESIGN.h;
  canvas.width = Math.ceil(W * view.dpr);
  canvas.height = Math.ceil(H * view.dpr);
  scene.resize(view);
}

let resizeTimer = 0;
function scheduleLayout() { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 80); }

function toDesign(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / view.scale - view.ox, y: (e.clientY - r.top) / view.scale - view.oy };
}

canvas.addEventListener('pointerdown', (e) => {
  const p = toDesign(e);
  if (scene.hitTest(p.x, p.y) === 'bakery') scene.press(true);
});
canvas.addEventListener('pointerup', (e) => {
  const p = toDesign(e);
  scene.press(false);
  const hit = scene.hitTest(p.x, p.y);
  if (hit === 'bakery') { scene.tapBuilding(hit, p.x, p.y); enterScene('cafe'); }
});
canvas.addEventListener('pointercancel', () => scene.press(false));
canvas.addEventListener('pointermove', (e) => scene.setLook(((e.clientX / view.W) - 0.5) * 2));
window.addEventListener('deviceorientation', (e) => { if (e.gamma != null) scene.setLook(e.gamma / 25); });
// iOS asks for tilt permission once, on the first touch
canvas.addEventListener('pointerdown', () => {
  try { window.DeviceOrientationEvent?.requestPermission?.().catch(() => {}); } catch { /* not required elsewhere */ }
}, { once: true });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

createHud(document.getElementById('hud'), {
  onButton: (id) => showToast(toast, 'Yakında'),
  onAdd: () => showToast(toast, 'Yakında'),
});
createNav(document.getElementById('nav'), {
  onSelect: (id) => {
    if (id === 'cafe') { street.tapBuilding('bakery', DESIGN.w / 2, 400); enterScene('cafe'); }
    else showToast(toast, 'Yakında');
  },
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  scene.update(dt);
  scene.render(ctx);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', scheduleLayout);
window.addEventListener('orientationchange', scheduleLayout);
try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch { /* only works in fullscreen / installed mode */ }

loadAssets().then(() => {
  bakery.configure();
  bookshop.configure();
  market.configure();
  scene = street;
  layout();
  requestAnimationFrame(frame);
  window.__street = { scene, view }; // handy for debugging / tests
});
