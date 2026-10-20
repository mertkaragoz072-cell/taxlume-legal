// Bootstrap: canvas sizing, main loop, pointer input and UI wiring.
import { DESIGN, PLAYER } from './config.js';
import { Game } from './game/game.js';
import { Cafe } from './game/customers.js';
import { Quests } from './game/quests.js';
import { createQuestPanel } from './ui/quests.js';
import { DailyReward } from './game/daily.js';
import { createDailyPanel, formatReward } from './ui/daily.js';
import { createSettingsPanel } from './ui/settings.js';
import { Settings } from './game/settings.js';
import { AudioManager } from './audio/audio.js';
import { vibrate } from './audio/haptics.js';
import { createOrderBar } from './ui/orders.js';
import { SaveManager, safeStorage } from './game/save.js';
import { TabGuard } from './game/tabguard.js';
import { InteriorScene } from './scene/interior-scene.js';
import { createPanels } from './ui/panels.js';
import { MarketScene } from './scene/market-scene.js';
import { MARKET_PROPS, BOOKSHOP_PROPS } from './scene/scene-props.js';
import { createMarketPanel } from './ui/market.js';
import { loadAssets } from './assets.js';
import { StreetScene } from './scene/street-scene.js';
import { bakery } from './buildings/bakery.js';
import { bookshop } from './buildings/bookshop.js';
import { market } from './buildings/market.js';
import { Exploration } from './game/exploration.js';
import { ExploreScene } from './scene/explore-scene.js';
import { createExplorePanel } from './ui/explore.js';
import { Research } from './game/research.js';
import { createResearchPanel } from './ui/research.js';
import { Town } from './game/town.js';
import { createTownPanel } from './ui/town.js';
import { Progression } from './game/progression.js';
import { createHud } from './ui/hud.js';
import { createNav } from './ui/nav.js';
import { AREAS } from './scene/interior-layout.js';
import { textFloor } from './util.js';
import { installIconSwap } from './ui/icon-swap.js';
import { showToast } from './ui/toast.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const toast = document.getElementById('toast');
const fmt = (n) => n.toLocaleString('tr-TR');
const DEBUG = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) || new URLSearchParams(window.location.search).has('debug');

// Settings are stored separately from the game save. Sound and vibration follow them everywhere.
const settings = new Settings(safeStorage(window), { onProblem: ({ message }) => showToast(toast, message, 4500) });
settings.load();
const audio = new AudioManager(settings);
const buzz = (pattern) => vibrate(settings, pattern);
/** Shows a warning toast with an error sound and a short buzz. */
const warn = (msg, ms = 2400) => { showToast(toast, msg, ms); audio.sfx('error'); buzz([40, 30, 40]); };
const unlockEvents = ['pointerdown', 'keydown', 'touchstart'];
const unlockAudio = () => { if (audio.unlock()) unlockEvents.forEach((ev) => window.removeEventListener(ev, unlockAudio)); };   // browsers allow audio only after a gesture
unlockEvents.forEach((ev) => window.addEventListener(ev, unlockAudio));

const game = new Game(PLAYER);              // production, stock and gold live here (src/game/game.js)
const progression = new Progression(game);        // player level and XP (src/game/progression.js)
const town = new Town(game);
const exploration = new Exploration(game);          // timed expeditions (src/game/exploration.js)
const research = new Research(game);              // Bookshop research bonuses (src/game/research.js)                       // building states (src/game/town.js)
const quests = new Quests(game);
const daily = new DailyReward(game);              // daily reward cycle (src/game/daily.js)                    // quest progress comes from game.stats (src/game/quests.js)
const cafe = new Cafe(game);                       // customers, tables and orders (src/game/customers.js)
const street = new StreetScene();
const interior = new InteriorScene(game);
const marketScene = new MarketScene('market', 'market', MARKET_PROPS);
const exploreScene = new ExploreScene(exploration);
const bookshopScene = new MarketScene('bookshop', 'bookshop', BOOKSHOP_PROPS);   // same landscape layout as the Market screen
const saveWarn = document.getElementById('saveWarn');
const tabLock = document.getElementById('tabLock');
const store = safeStorage(window);
const guard = new TabGuard(store, { onLost: () => { tabLock.hidden = false; } });   // another tab took over the game: this one stops saving
document.getElementById('tabTake').addEventListener('click', () => {
  saves.enabled = false;                           // this tab's old in-memory state must not be written on the way out (pagehide flush)
  guard.claim(); window.location.reload();         // the reload loads the owner's latest save
});
guard.attach(window);
const saves = new SaveManager(game, store, {
  guard,
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
  onButton: (id) => { const panel = { quests: questPanel, events: dailyPanel, settings: settingsPanel }[id]; if (panel) openOverlay(panel); },
});
const panels = createPanels(document.getElementById('panel'), game, {
  onWarn: (msg) => warn(msg, 2600),
  onClose: () => interior.select(null),
  onUpgraded: (id, r) => showToast(toast, `${game.upgradesDef[id].icon} ${game.upgradesDef[id].name} seviye ${r.level} · −${fmt(r.cost)} altın`, 2200),
});

const marketPanel = createMarketPanel(document.getElementById('marketPanel'), game, {
  onWarn: (msg) => warn(msg, 2600),
  onBought: (id, qty, cost) => showToast(toast, `${game.ingredientsDef[id].icon} ${game.ingredientsDef[id].name} ×${qty} alındı · −${fmt(cost)} altın`, 1600),
});
const backBtn = document.getElementById('back');
const fmtReward = (r) => [r.gold && `+${fmt(r.gold)} altın`, r.xp && `+${fmt(r.xp)} XP`, ...Object.entries(r.ingredients).map(([id, n]) => `${game.ingredientsDef[id].icon} ×${n}`), r.gems && `💎 ×${r.gems}`].filter(Boolean).join('  ');
const explorePanel = createExplorePanel(document.getElementById('explorePanel'), game, exploration, {
  onStarted: ({ region }) => { showToast(toast, `${region.icon} ${region.name} keşfi başladı`, 2200); audio.sfx('tap'); },
  onClaimed: ({ region, reward }) => { showToast(toast, `${region.icon} ${region.name}: ${fmtReward(reward)}`, 4200); audio.sfx('claim'); buzz([30, 40, 60]); },
  onWarn: (msg) => warn(msg, 3000),
  onSelect: (id) => { exploreScene.selected = id; },
});
game.on('exploreReady', ({ region }) => { showToast(toast, `🎁 ${region.name} keşfi tamamlandı — ödülünü al!`, 4000); audio.sfx('done'); buzz(40); refreshBadge(); });
const researchPanel = createResearchPanel(document.getElementById('researchPanel'), game, research, town, {
  onBought: ({ def, level, cost }) => { showToast(toast, `${def.icon} ${def.name} seviye ${level} · ${def.describe(def.values[level])} · −${fmt(cost)} altın`, 3200); audio.sfx('claim'); buzz([30, 40, 30]); },
  onOpened: ({ building, cost, xp }) => { showToast(toast, `${building.icon} ${building.name} açıldı! −${fmt(cost)} altın${xp ? ` · +${fmt(xp)} XP` : ''}`, 3200); audio.sfx('claim'); buzz([30, 40, 30]); },
  onWarn: (msg) => warn(msg, 3200),
});
const questPanel = createQuestPanel(document.getElementById('questPanel'), game, quests, {
  onClaimed: ({ quest, reward }) => showToast(toast, `🎁 ${quest.name}: ödül alındı${reward.gold ? ` · +${fmt(reward.gold)} altın` : ''}`, 2200),
  onWarn: (msg) => warn(msg, 2400),
});
const dailyPanel = createDailyPanel(document.getElementById('dailyPanel'), game, daily, {
  onClaimed: ({ day, reward, streakBroken }) => showToast(toast, `🎁 Günlük ödül · Gün ${day}: ${formatReward(game, reward)}${streakBroken ? ' (seri yeniden başladı)' : ''}`, 3200),
  onWarn: (msg) => warn(msg, 2400),
});
const setNavTown = (on) => {                          // the Kasaba button is highlighted while the town screen is open
  const nav = document.getElementById('nav');
  nav.querySelector('[data-id=cafe]')?.classList.toggle('active', !on);
  nav.querySelector('[data-id=town]')?.classList.toggle('active', on);
};
const townPanel = createTownPanel(document.getElementById('townPanel'), game, town, {
  onVisit: (scene) => go(scene),
  onOpened: ({ building, cost, xp }) => { showToast(toast, `${building.icon} ${building.name} açıldı! −${fmt(cost)} altın${xp ? ` · +${fmt(xp)} XP` : ''}`, 3200); audio.sfx('claim'); buzz([30, 40, 30]); },
  onDeveloped: ({ building, cost, level, xp }) => { showToast(toast, `${building.icon} ${building.name} gelişti: seviye ${level} · −${fmt(cost)} altın${xp ? ` · +${fmt(xp)} XP` : ''}`, 3000); audio.sfx('claim'); buzz([30, 40, 30]); },
  onWarn: (msg) => warn(msg, 3200),
  onClose: () => setNavTown(false),
});
function doReset() {                                 // reached only through the settings panel's confirmation button
  const r = saves.reset({ confirmed: true });
  if (!r.ok) { warn(r.message, 4500); return; }
  interior.snap();
  settingsPanel.close();
  showToast(toast, r.warning ? `İlerleme sıfırlandı. ${r.warning}` : 'İlerleme sıfırlandı. Eski kayıt yedeklendi.', 3800);
}
const settingsPanel = createSettingsPanel(document.getElementById('settingsPanel'), settings, {
  onChanged: () => { audio.unlock(); audio.sfx('tap'); },
  onReset: doReset,
});
/** Only one of the quest / daily / settings overlays is open at a time; pressing its button again closes it. */
function openOverlay(panel) {
  const wasOpen = panel.isOpen;
  for (const p of [townPanel, questPanel, dailyPanel, settingsPanel]) p.close();
  if (!wasOpen) { panel.open(); setNavTown(panel === townPanel); }
}
const refreshBadge = () => { hud.setQuestBadge(quests.claimable().length); hud.setDailyBadge(daily.status().canClaim); const eb = document.querySelector('[data-badge=explore]'); if (eb) eb.hidden = !exploration.isReady(); };
setInterval(() => { refreshBadge(); dailyPanel.refresh(); }, 20000);   // a new day can start while the game is open
document.addEventListener('visibilitychange', () => { if (!document.hidden) { refreshBadge(); dailyPanel.refresh(); } });
game.on('change', (e) => {                            // sounds and vibration for game events
  switch (e?.type) {
    case 'sell': case 'sale': audio.sfx('coin'); buzz(25); break;
    case 'buy': audio.sfx('buy'); break;
    case 'town': case 'townLevel': case 'research': case 'exploreStart': case 'explore': break;       // announced by the town panel's own toast and sound
    case 'upgrade': audio.sfx('claim'); buzz([30, 40, 30]); break;
    case 'quest': case 'daily': audio.sfx('claim'); buzz(40); break;
    case 'complete': audio.sfx('done'); buzz(20); break;
    case 'start': audio.sfx('tap'); break;
    default: break;
  }
});
game.on('change', refreshBadge);
game.on('questComplete', ({ quest }) => showToast(toast, `🎯 Görev tamamlandı: ${quest.name} — Görevler'den ödülünü al`, 3000));

/** Scene switch with a short fade. `id` is 'street', 'interior', 'market', 'bookshop' or 'explore'. */
let switching = false;
function go(id) {
  const target = { street, interior, market: marketScene, bookshop: bookshopScene, explore: exploreScene }[id];
  if (switching || scene === target) return;
  switching = true;
  fade.classList.add('on');
  setTimeout(() => {
    panels.close();
    scene = target;
    cafe.setActive(id === 'interior');          // customers only run while the cafe is open
    stage.classList.toggle('in-interior', id === 'interior');
    stage.classList.toggle('in-market', id === 'market');
    stage.classList.toggle('in-bookshop', id === 'bookshop');
    stage.classList.toggle('in-explore', id === 'explore');
    if (id === 'explore') explorePanel.show(); else explorePanel.hide();
    backBtn.innerHTML = `<img class="pic" alt="" draggable="false" src="assets/icons/hud-back.webp">${id === 'market' ? 'Marketten Çık' : id === 'bookshop' ? 'Kitapçıdan Çık' : 'Sokak'}`;
    if (id === 'bookshop') researchPanel.show(); else researchPanel.hide();
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
  textFloor.px = 12 / view.scale;                  // canvas labels never render below ~12 screen px
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
    else if (hit === 'bookshop') { street.tapBuilding(hit, p.x, p.y); setTimeout(() => go('bookshop'), 260); }   // closed: the screen shows the opening conditions
  } else if (scene === exploreScene) {
    if (hit) { exploreScene.selected = hit; explorePanel.select(hit); }
  } else if (scene === marketScene || scene === bookshopScene) {
    // nothing to tap on the Market backdrop; the shopping list is a DOM panel
  } else if (!hit) {
    panels.close();
  } else if (hit.startsWith('customer:')) {
    const r = cafe.deliverToCustomer(+hit.slice(9));
    if (r.ok) showToast(toast, `${game.productsDef[r.product].icon} satıldı · +${fmt(r.income)} altın`, 1400);
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
    if (id === 'cafe') { townPanel.close(); street.tapBuilding('bakery', DESIGN.w / 2, 400); setTimeout(() => go('interior'), 260); }
    else if (id === 'town') openOverlay(townPanel);
    else if (id === 'explore') { for (const p of [townPanel, questPanel, dailyPanel, settingsPanel]) p.close(); go('explore'); }
  },
});
backBtn.addEventListener('click', () => go('street'));
const orderBar = createOrderBar(document.getElementById('orderBar'), game, cafe, {
  onWarn: (msg) => warn(msg, 2400),
  onSale: (r) => showToast(toast, `${game.productsDef[r.product].icon} satıldı · +${fmt(r.income)} altın`, 1400),
});
const refreshLevel = () => hud.setLevel({ level: progression.level, xp: progression.xp, need: progression.xpToNext(progression.level), fraction: progression.fraction(), isMax: progression.isMax });
game.on('change', () => { hud.setGold(game.gold); hud.setGems(game.player.gems ?? 0); refreshLevel(); });
let levelUps = [];                                    // one action can pass several levels: show a single summary
game.on('levelUp', (e) => {
  refreshLevel();
  if (!levelUps.length) queueMicrotask(() => {
    const list = levelUps; levelUps = [];
    const reward = { gold: 0, ingredients: {} };
    for (const l of list) { reward.gold += l.reward.gold ?? 0; for (const [k, v] of Object.entries(l.reward.ingredients ?? {})) reward.ingredients[k] = (reward.ingredients[k] ?? 0) + v; }
    const parts = [];
    if (reward.gold) parts.push(`+${fmt(reward.gold)} altın`);
    for (const [k, v] of Object.entries(reward.ingredients)) parts.push(`${game.ingredientsDef[k]?.icon ?? ''} ×${v}`);
    const title = list.length > 1 ? `Seviye ${list[0].level}–${list[list.length - 1].level}` : `Seviye ${list[0].level}`;
    showToast(toast, `⭐ ${title}! Ödül: ${parts.join('  ')}`, 3800);
    audio.sfx('claim'); buzz([40, 40, 80]);
  });
  levelUps.push(e);
});
saves.attach(window);
saveWarn.addEventListener('click', () => { saveWarn.hidden = true; });   // tap to dismiss; it returns if a save fails again
game.on('complete', ({ product }) => showToast(toast, `${game.productsDef[product].icon} ${game.productsDef[product].name} hazır!`, 1600));

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (guard.lost) { requestAnimationFrame(frame); return; }   // paused while another tab owns the game
  game.tick();
  scene.update(dt);
  panels.tick(dt);
  explorePanel.tick();
  orderBar.tick(dt);
  scene.render(ctx);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', scheduleLayout);
window.addEventListener('orientationchange', scheduleLayout);
try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch { /* only works in fullscreen / installed mode */ }

installIconSwap(document.getElementById('stage'));    // product / ingredient emoji -> the supplied icon pictures
// ---- boot: loading screen, assets, save ----------------------------------------------------------
const loadingEl = document.getElementById('loading'), ldFill = document.getElementById('ldFill'), ldText = document.getElementById('ldText'), ldRetry = document.getElementById('ldRetry');
ldRetry.addEventListener('click', () => window.location.reload());
function fatal(message) {                          // boot failed: say so instead of leaving a blank screen; the save is untouched
  ldText.textContent = message; ldFill.style.width = '100%'; ldRetry.hidden = false;
  loadingEl.classList.remove('done'); loadingEl.hidden = false;
}
let lastErrorToast = 0;
const onUnexpected = (e) => {                      // a bug must not freeze the game silently: tell the player once in a while
  console.error('[game]', e.error ?? e.reason ?? e.message);
  const now = Date.now();
  if (now - lastErrorToast > 15000) { lastErrorToast = now; showToast(toast, 'Beklenmeyen bir hata oldu. İlerleme kayıtlı; sorun sürerse sayfayı yenile.', 4500); }
};
window.addEventListener('error', onUnexpected);
window.addEventListener('unhandledrejection', onUnexpected);

loadAssets({ onProgress: (done, total) => { ldFill.style.width = `${Math.round((done / total) * 100)}%`; } }).then(({ failed, timedOut }) => {
  guard.claim();                                   // this tab now owns the save; an older tab is told to stop
  // restore the save, then credit production that finished while the app was closed
  const loaded = saves.load();
  hud.setGold(game.gold);
  hud.setGems(game.player.gems ?? 0);
  refreshLevel();
  refreshBadge();
  if (daily.status().canClaim) openOverlay(dailyPanel);   // first visit of the day: offer the daily reward
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
  loadingEl.classList.add('done'); setTimeout(() => { loadingEl.hidden = true; }, 350);
  if (failed || timedOut) showToast(toast, 'Bazı görseller yüklenemedi; oyun yedek çizimlerle devam ediyor.', 4500);
  if (DEBUG) window.__street = { scene, view, street, interior, market: marketScene, game, cafe, progression, town, research, exploration, exploreScene, quests, daily, settings, audio, saves, go };   // debugging / tests hook, never exposed on the published site
}).catch((err) => { console.error('[boot]', err); fatal('Oyun başlatılamadı. İlerlemen silinmedi; yeniden yüklemeyi dene.'); });
