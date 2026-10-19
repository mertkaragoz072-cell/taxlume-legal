// Bootstrap: canvas sizing, main loop, pointer input and UI wiring.
import { DESIGN, PLAYER } from './config.js';
import { Game } from './game/game.js';
import { Cafe } from './game/customers.js';
import { createOrderBar } from './ui/orders.js';
import { SaveManager, safeStorage } from './game/save.js';
import { InteriorScene } from './scene/interior-scene.js';
import { createPanels } from './ui/panels.js';
import { MarketScene } from './scene/market-scene.js';
import { createMarketPanel } from './ui/market.js';
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
const cafe = new Cafe(game);                       // customers, tables and orders (src/game/customers.js)
const street = new StreetScene();
const interior = new InteriorScene(game);
const marketScene = new MarketScene();
const saveWarn = document.getElementById('saveWarn');
const saves = new SaveManager(game, safeStorage(window), {
  onProblem: ({ kind, message }) => {
    saveWarn.textContent = `⚠ ${message}`; saveWarn.hidden = false;
    showToast(toast, message, 5000);
    console.warn('[save]', kind, message);
  },
  onRecover: () => { saveWarn.hidden = true; showToast(toast, 'Kayıt yeniden çalışıyor.', 2000); },
});
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
  onUpgraded: (id, r) => showToast(toast, `${game.upgradesDef[id].icon} ${game.upgradesDef[id].name} seviye ${r.level} · −${r.cost} altın`, 2200),
});

const marketPanel = createMarketPanel(document.getElementById('marketPanel'), game, {
  onWarn: (msg) => showToast(toast, msg, 2600),
  onBought: (id, qty, cost) => showToast(toast, `${game.ingredientsDef[id].icon} ${game.ingredientsDef[id].name} ×${qty} alındı · −${cost} altın`, 1600),
});
const backBtn = document.getElementById('back');

/** Scene switch with a short fade. `id` is 'street', 'interior' or 'market'. */
let switching = false;
function go(id) {
  const target = { street, interior, market: marketScene }[id];
  if (switching || scene === target) return;
  switching = true;
  fade.classList.add('on');
  setTimeout(() => {
    panels.close();
    scene = target;
    cafe.setActive(id === 'interior');          // customers only run while the cafe is open
    stage.classList.toggle('in-interior', id === 'interior');
    stage.classList.toggle('in-market', id === 'market');
    backBtn.textContent = id === 'market' ? '◀ Marketten Çık' : '◀ Sokak';
    if (id === 'market') marketPanel.show(); else marketPanel.hide();
    scene.resize(view);
    if (id === 'interior') interior.snap();   // the interior is not updated while hidden: place customers where they should be
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
    else if (hit === 'market') { street.tapBuilding(hit, p.x, p.y); setTimeout(() => go('market'), 260); }
  } else if (scene === marketScene) {
    // nothing to tap on the Market backdrop; the shopping list is a DOM panel
  } else if (!hit) {
    panels.close();
  } else if (hit.startsWith('customer:')) {
    const r = cafe.deliverToCustomer(+hit.slice(9));
    if (r.ok) showToast(toast, `${game.productsDef[r.product].icon} satıldı · +${r.income} altın`, 1400);
    else showToast(toast, r.message, 2400);
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
backBtn.addEventListener('click', () => go('street'));
const orderBar = createOrderBar(document.getElementById('orderBar'), game, cafe, {
  onWarn: (msg) => showToast(toast, msg, 2400),
  onSale: (r) => showToast(toast, `${game.productsDef[r.product].icon} satıldı · +${r.income} altın`, 1400),
});
game.on('change', () => hud.setGold(game.gold));
saves.attach(window);
saveWarn.addEventListener('click', () => { saveWarn.hidden = true; });   // tap to dismiss; it returns if a save fails again
game.on('complete', ({ product }) => showToast(toast, `${game.productsDef[product].icon} ${game.productsDef[product].name} hazır!`, 1600));

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  game.tick();
  scene.update(dt);
  panels.tick(dt);
  orderBar.tick(dt);
  scene.render(ctx);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', scheduleLayout);
window.addEventListener('orientationchange', scheduleLayout);
try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch { /* only works in fullscreen / installed mode */ }

loadAssets().then(() => {
  // restore the save, then credit production that finished while the app was closed
  const loaded = saves.load();
  hud.setGold(game.gold);
  const finished = {};
  const off = game.on('complete', ({ product }) => { finished[product] = (finished[product] ?? 0) + 1; });
  game.tick();
  off();
  const summary = Object.entries(finished).map(([id, n]) => `${game.productsDef[id].icon} ×${n}`).join('  ');
  if (summary && loaded.status === 'loaded') showToast(toast, `Sen yokken hazırlananlar: ${summary}`, 4200);

  bakery.configure();
  bookshop.configure();
  market.configure();
  scene = street;
  layout();
  requestAnimationFrame(frame);
  window.__street = { scene, view, street, interior, market: marketScene, game, cafe, go }; // handy for debugging / tests
});
