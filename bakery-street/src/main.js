// Bootstrap: canvas sizing, main loop, pointer input and UI wiring.
import { DESIGN, PLAYER } from './config.js';
import { Game } from './game/game.js';
import { InteriorScene } from './scene/interior-scene.js';
import { createPanels } from './ui/panels.js';
import { loadAssets } from './assets.js';
import { StreetScene } from './scene/street-scene.js';
import { bakery } from './buildings/bakery.js';
import { bookshop } from './buildings/bookshop.js';
import { market } from './buildings/market.js';
import { createHud } from './ui/hud.js';
import { createNav } from './ui/nav.js';
import { AREAS } from './scene/interior-layout.js';
import { showToast } from './ui/toast.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const toast = document.getElementById('toast');

const game = new Game(PLAYER);              // production, stock and gold live here (src/game/game.js)
const street = new StreetScene();
const interior = new InteriorScene(game);
let scene = null;                                  // active scene: street or interior
const view = { W: 0, H: 0, dpr: 1, scale: 1, vw: 0, vh: 0, ox: 0, oy: 0 };
const stage = document.getElementById('stage');
const fade = document.getElementById('fade');
const hud = createHud(document.getElementById('hud'), {
  onButton: () => showToast(toast, 'Yakında'),
  onAdd: () => showToast(toast, 'Yakında'),
});
const panels = createPanels(document.getElementById('panel'), game, {
  onWarn: (msg) => showToast(toast, msg, 2600),
  onClose: () => interior.select(null),
});

/** Scene switch with a short fade. `id` is 'street' or 'interior'. */
let switching = false;
function go(id) {
  const target = id === 'interior' ? interior : street;
  if (switching || scene === target) return;
  switching = true;
  fade.classList.add('on');
  setTimeout(() => {
    panels.close();
    scene = target;
    stage.classList.toggle('in-interior', id === 'interior');
    scene.resize(view);
    fade.classList.remove('on');
    switching = false;
  }, 240);
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
  scene.press(true, p.x, p.y);
});
canvas.addEventListener('pointerup', (e) => {
  if (switching) return;
  const p = toDesign(e);
  scene.press(false, p.x, p.y);
  const hit = scene.hitTest(p.x, p.y);
  if (scene === street) {
    if (hit === 'bakery') { street.tapBuilding(hit, p.x, p.y); setTimeout(() => go('interior'), 260); }
  } else if (!hit) {
    panels.close();
  } else {
    const area = AREAS.find((a) => a.id === hit);
    if (area.panel) { interior.select(area.id); panels.open(area.panel, area.x + area.w / 2 > 700 ? 'left' : 'right'); }
    else { panels.close(); showToast(toast, 'Müşteri masaları yakında!'); }
  }
});
canvas.addEventListener('pointercancel', () => scene.press(false));
canvas.addEventListener('pointermove', (e) => scene.setLook?.(((e.clientX / view.W) - 0.5) * 2));
window.addEventListener('deviceorientation', (e) => { if (e.gamma != null) scene.setLook?.(e.gamma / 25); });
// iOS asks for tilt permission once, on the first touch
canvas.addEventListener('pointerdown', () => {
  try { window.DeviceOrientationEvent?.requestPermission?.().catch(() => {}); } catch { /* not required elsewhere */ }
}, { once: true });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

createNav(document.getElementById('nav'), {
  onSelect: (id) => {
    if (id === 'cafe') { street.tapBuilding('bakery', DESIGN.w / 2, 400); setTimeout(() => go('interior'), 260); }
    else showToast(toast, 'Yakında');
  },
});
document.getElementById('back').addEventListener('click', () => go('street'));
game.on('change', () => hud.setGold(game.gold));
game.on('complete', ({ product }) => showToast(toast, `${game.productsDef[product].icon} ${game.productsDef[product].name} hazır!`, 1600));

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  game.tick();
  scene.update(dt);
  panels.tick(dt);
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
  window.__street = { scene, view, street, interior, game, go }; // handy for debugging / tests
});
