// Kasaba: the town square, a living scene on one painted backdrop (assets/town-square.webp, 1024 x 1267). On top of it, in their own layers:
//   - tap areas for the buildings, the notice board, the map sign, the fountain, the bench, the flower beds and the paw circle,
//   - live bubbles over the trees (daily reward, quests) with real badges, and a plate on a building that is not open yet,
//   - cats strolling across the plaza (they gather at the paw circle when it is tapped), water glitter on the fountain, petals in the air,
//     the lamps glowing in the evening.
// What a tap does is decided by the app (App.tsx, onPress): this scene only says what was hit.
import { getImage, drawIcon } from '../assets.js';
import { drawSprite } from '../characters/sprites.js';
import { LOOKS } from '../game/customers.js';
import { PAL } from '../palette.js';
import { rrect, paint, glowAt, gradeScreen, clamp } from '../util.js';
import { applyDaylight } from './daylight.js';

export const IMG_W = 1024, IMG_H = 1267;
const TOP = 105;                     // the backdrop was cut from a 1536-tall picture at this row: coordinates below are written in that picture and shifted
const R = (x0, y0, x1, y1) => [x0, y0 - TOP, x1, y1 - TOP];
const P = (x, y) => [x, y - TOP];
/** Tap areas (rectangles, or circles with r) in backdrop pixels; listed front to back, the first hit wins. */
export const TOWN_SPOTS = [
  { id: 'daily', circle: [...P(97, 245), 62], kind: 'bubble', icon: 'gift' },
  { id: 'quests', circle: [...P(928, 255), 58], kind: 'bubble', icon: 'hud-quests' },
  { id: 'board', box: R(0, 800, 160, 990) },                  // notice board -> quests
  { id: 'map', box: R(875, 745, 1015, 950) },                 // map sign -> Keşif
  { id: 'fountain', box: R(790, 940, 1024, 1185) },
  { id: 'bench', box: R(0, 1025, 205, 1210) },
  { id: 'paw', circle: [...P(512, 892), 105] },
  { id: 'flowers', box: R(0, 700, 150, 800) }, { id: 'flowers', box: R(0, 1215, 240, 1290) }, { id: 'flowers', box: R(880, 1195, 1024, 1290) },   // (the flower beds' lower parts are under the bottom bar)
  { id: 'market', box: R(55, 300, 305, 705), plate: P(185, 600) },
  { id: 'bakery', box: R(305, 150, 740, 705), plate: P(520, 640) },
  { id: 'bookshop', box: R(740, 280, 975, 705), plate: P(850, 600) },
];
const PLAZA = { x0: 200, x1: 820, y0: 760 - TOP, y1: 1180 - TOP };     // where the cats stroll (clear of the bench, the board and the fountain)
const PAW = P(512, 892);
const LAMPS = [P(36, 360), P(995, 470), P(707, 535)];
const SIDE_CROP = 36, BOTTOM_HIDE = 50, BOTTOM_BAR = 200;    // portrait: backdrop px left out at each side / under the bar's top edge; the bottom bar's height in world units (it scales with the width, plus the home indicator)
const CLOUDS = [[0.1, 0.25, 1.1, 6], [0.55, 0.12, 0.8, 4], [0.8, 0.45, 1.3, 7], [0.3, 0.62, 0.9, 5], [0.68, 0.82, 0.7, 3]];

export class TownScene {
  /** @param {{ town: any, game: any, daily?: any, quests?: any, goals?: any, exploration?: any }} world */
  constructor(world) {
    this.id = 'town';
    this.w = world;
    this.town = world.town;
    this.t = 0;
    this.view = null;
    this.pressedId = null;
    this.flash = {};                     // spot id -> seconds since tapped (a soft glow)
    this.ripples = [];                   // fountain taps: rings on the water
    this.petals = Array.from({ length: 10 }, (_, i) => ({ x: (i * 97) % IMG_W, y: (i * 131) % 700, s: 0.6 + (i % 3) * 0.3, p: i }));
    this.walkers = [0, 1, 2, 3].map((i) => this.newWalker(i));
    this.notes = [];                     // little speech bubbles: { x, y, text, life }
  }

  newWalker(i) {
    const x = PLAZA.x0 + Math.random() * (PLAZA.x1 - PLAZA.x0), y = PLAZA.y0 + Math.random() * (PLAZA.y1 - PLAZA.y0);
    return { look: LOOKS[(i * 2 + Math.floor(Math.random() * 2)) % LOOKS.length], x, y, tx: x, ty: y, wait: 1 + Math.random() * 3, dir: 1, moving: false, view: 'side', phase: i * 1.7 };
  }

  resize(view) { this.view = view; }
  setLook() {}

  /** Backdrop -> screen-world transform: fills the width (a little cropped at the sides), the plaza's front edge under the bottom bar, sky above. */
  fit() {
    const v = this.view;
    if (v.portrait) { const s = v.vw / (IMG_W - 2 * SIDE_CROP); return { s, ox: -SIDE_CROP * s, oy: v.vh - BOTTOM_BAR - (IMG_H - BOTTOM_HIDE) * s }; }   // the plaza ends where the bottom bar begins
    const s = Math.max(v.vw / IMG_W, v.vh / IMG_H); return { s, ox: -v.ox + (v.vw - IMG_W * s) / 2, oy: -v.oy + (v.vh - IMG_H * s) / 2 };
  }
  toPic(x, y) { const f = this.fit(); return { x: (x - f.ox) / f.s, y: (y - f.oy) / f.s }; }

  /** Screen-world point in the middle of a tap area (used by the tests and the scripted play test). */
  spotCentre(id) {
    const sp = TOWN_SPOTS.find((s) => s.id === id), f = this.fit();
    const [cx, cy] = sp.circle ? sp.circle : [(sp.box[0] + sp.box[2]) / 2, (sp.box[1] + sp.box[3]) / 2];
    return { x: cx * f.s + f.ox, y: cy * f.s + f.oy };
  }

  hitTest(x, y) {
    const p = this.toPic(x, y);
    for (const sp of TOWN_SPOTS) {
      if (sp.circle) { const [cx, cy, r] = sp.circle; if (Math.hypot(p.x - cx, p.y - cy) <= r) return sp.id; continue; }
      const [x0, y0, x1, y1] = sp.box; if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) return sp.id;
    }
    return null;
  }
  press(on, x, y) { this.pressedId = on ? this.hitTest(x, y) : null; }

  /** The scene's own answer to a tap (the app opens screens): a glow, and for the plaza pieces a small calm reaction. */
  tapBuilding(id) {
    this.flash[id] = 0;
    if (id === 'fountain') { this.ripples.push({ t: 0 }, { t: -0.25 }); this.say(P(905, 930), ['Bir dilek tuttum', 'Şırıl şırıl…', 'Ne serin!'][Math.floor(Math.random() * 3)]); }
    else if (id === 'bench') this.say(P(100, 1010), ['Biraz dinlenelim', 'Güneş çok güzel', 'Burası çok huzurlu'][Math.floor(Math.random() * 3)]);
    else if (id === 'paw') {                                   // the cats come over to the paw circle
      this.walkers.forEach((w, i) => { const a = (i / this.walkers.length) * Math.PI * 2; w.tx = PAW[0] + Math.cos(a) * 120; w.ty = PAW[1] + Math.sin(a) * 50; w.moving = true; w.gather = true; });
      this.say([PAW[0], PAW[1] - 150], 'Miyav!');
    }
  }

  say(at, text) { if (this.notes.length < 2) this.notes.push({ x: at[0], y: at[1], text, life: 2.4 }); }

  update(dt) {
    this.t += dt;
    for (const k of Object.keys(this.flash)) { this.flash[k] += dt; if (this.flash[k] > 0.6) delete this.flash[k]; }
    for (const r of this.ripples) r.t += dt;
    this.ripples = this.ripples.filter((r) => r.t < 1.4);
    for (const n of this.notes) n.life -= dt;
    this.notes = this.notes.filter((n) => n.life > 0);
    for (const p of this.petals) { p.y += 18 * p.s * dt; p.x += Math.sin(this.t * 0.8 + p.p) * 12 * dt + 6 * dt; if (p.y > 900) { p.y = -20; p.x = Math.random() * IMG_W; } if (p.x > IMG_W + 20) p.x = -20; }
    for (const w of this.walkers) {
      if (!w.moving) {
        w.wait -= dt;
        if (w.wait <= 0) { w.tx = PLAZA.x0 + Math.random() * (PLAZA.x1 - PLAZA.x0); w.ty = PLAZA.y0 + Math.random() * (PLAZA.y1 - PLAZA.y0); w.moving = true; }
        continue;
      }
      const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy), step = 70 * dt;
      if (d <= step) { w.x = w.tx; w.y = w.ty; w.moving = false; w.wait = w.gather ? 8 + Math.random() * 3 : 2 + Math.random() * 5; w.gather = false; continue; }   // gathered cats linger a while
      w.x += (dx / d) * step; w.y += (dy / d) * step;
      if (Math.abs(dx) > 2) w.dir = dx > 0 ? 1 : -1;
      w.view = Math.abs(dy) > Math.abs(dx) * 1.2 ? (dy < 0 ? 'back' : 'front') : 'side';
    }
  }

  /** What a building's plate says: nothing for an open building, else what it still needs. */
  plateFor(id) {
    if (this.town.isOpen(id)) return null;
    const n = this.town.need(this.town.unlocks[id]);
    if (this.town.status(id) === 'available') return { text: n.missingGold ? `${n.gold.toLocaleString('tr-TR')} altın` : 'Açılabilir', tone: n.missingGold ? 'locked' : 'ready' };
    return { text: `Seviye ${n.minLevel}`, tone: 'locked' };
  }

  /** Badges of the live bubbles: something to collect there now. */
  badges() {
    const w = this.w;
    return {
      daily: !!w.daily?.status().canClaim,
      quests: (w.quests?.claimable().length ?? 0) > 0 || (w.goals?.claimable().length ?? 0) > 0,
      map: !!w.exploration?.isReady(),
    };
  }

  render(ctx) {
    const v = this.view, k = v.scale * v.dpr, f = this.fit(), img = getImage('town-square'), t = this.t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(k, 0, 0, k, (v.portrait ? 0 : v.ox) * k, (v.portrait ? 0 : v.oy) * k);
    // sky above the backdrop on tall phones, with slow clouds
    const g = ctx.createLinearGradient(0, 0, 0, Math.max(10, f.oy + 40)); g.addColorStop(0, '#A9D8FB'); g.addColorStop(1, '#86C6F6');
    ctx.fillStyle = g; ctx.fillRect(-10, -10, v.vw + 20, Math.max(0, f.oy) + 60);
    for (const [cx, cy, size, speed] of CLOUDS) { const span = v.vw + 300, x = ((cx * span + t * speed) % span) - 150; this.cloud(ctx, x, 80 + cy * Math.max(0, f.oy - 40), size); }
    if (img) ctx.drawImage(img, f.ox, f.oy, IMG_W * f.s, IMG_H * f.s);
    else { ctx.fillStyle = PAL.vanilla; ctx.fillRect(0, Math.max(0, f.oy), v.vw, v.vh); }
    if (f.oy > 0) {                                            // the backdrop's top edge melts into the sky (its trees were cut there)
      const e = ctx.createLinearGradient(0, f.oy, 0, f.oy + 70 * f.s); e.addColorStop(0, '#86C6F6'); e.addColorStop(1, 'rgba(134,198,246,0)');
      ctx.fillStyle = e; ctx.fillRect(-10, f.oy - 1, v.vw + 20, 70 * f.s + 1);
    }
    ctx.save(); ctx.translate(f.ox, f.oy); ctx.scale(f.s, f.s);
    this.drawGlows(ctx);
    this.drawFountain(ctx);
    for (const w of [...this.walkers].sort((a, b) => a.y - b.y)) {
      const sc = 1.15 + (w.y - PLAZA.y0) / (PLAZA.y1 - PLAZA.y0) * 0.25;
      drawSprite(ctx, w.look, w.x, w.y, w.moving ? t : 0, { dir: w.dir, back: w.view === 'back', side: w.view === 'side', fps: 8, phase: w.phase, frame: w.moving ? null : 0, bob: 0.012, scale: sc });
    }
    for (const p of this.petals) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(t + p.p) * 0.8); ctx.fillStyle = 'rgba(246,190,205,0.85)'; ctx.beginPath(); ctx.ellipse(0, 0, 6 * p.s, 3.5 * p.s, 0, 0, 7); ctx.fill(); ctx.restore(); }
    for (const sp of TOWN_SPOTS) { if (!sp.plate) continue; const p = this.plateFor(sp.id); if (p) this.plate(ctx, sp.plate[0], sp.plate[1], p); }
    const b = this.badges();
    for (const sp of TOWN_SPOTS) if (sp.kind === 'bubble') this.bubble(ctx, sp, b[sp.id]);
    if (b.map) this.dot(ctx, 985, 760 - TOP);
    for (const n of this.notes) this.note(ctx, n);
    ctx.restore();
    gradeScreen(ctx, { warm: 0.08, vignette: 0.08, floorFade: 0 });
    applyDaylight(ctx, this.w.game.clock());
  }

  drawGlows(ctx) {
    for (const sp of TOWN_SPOTS) {
      const on = this.pressedId === sp.id || this.flash[sp.id] !== undefined;
      if (!on || sp.kind === 'bubble') continue;
      const a = this.pressedId === sp.id ? 0.18 : 0.18 * (1 - (this.flash[sp.id] ?? 0) / 0.6);
      ctx.fillStyle = `rgba(255,240,200,${a})`;
      if (sp.circle) { ctx.beginPath(); ctx.arc(sp.circle[0], sp.circle[1], sp.circle[2], 0, 7); ctx.fill(); }
      else { const [x0, y0, x1, y1] = sp.box; rrect(ctx, x0 + 6, y0 + 6, x1 - x0 - 12, y1 - y0 - 12, 24); ctx.fill(); }
    }
    const hour = new Date(this.w.game.clock()).getHours();
    if (hour >= 18 || hour < 7) { ctx.globalCompositeOperation = 'lighter'; for (const [x, y] of LAMPS) glowAt(ctx, x, y, 90, '255,200,110', 0.32 + 0.04 * Math.sin(this.t * 2 + x)); ctx.globalCompositeOperation = 'source-over'; }
  }

  /** Glitter on the basin, and rings when the fountain is tapped. */
  drawFountain(ctx) {
    const [cx, cy] = P(935, 1060), t = this.t;
    for (let i = 0; i < 5; i++) { const a = t * 1.3 + i * 1.26, x = cx + Math.cos(a) * 52, y = cy + Math.sin(a * 0.9) * 10; ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.35 * Math.sin(t * 3 + i)})`; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill(); }
    for (const r of this.ripples) { if (r.t < 0) continue; const k = r.t / 1.4; ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - k)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, 20 + 70 * k, 6 + 16 * k, 0, 0, 7); ctx.stroke(); }
  }

  /** A round cream bubble with its icon (daily reward, quests) and a red dot when there is something to collect. */
  bubble(ctx, sp, badge) {
    const [cx, cy, r] = sp.circle, press = this.pressedId === sp.id ? 0.94 : 1, bob = Math.sin(this.t * 1.6 + cx) * 4;
    ctx.save(); ctx.translate(cx, cy + bob); ctx.scale(press, press);
    ctx.beginPath(); ctx.arc(3, 6, r * 0.9, 0, 7); ctx.fillStyle = 'rgba(70,48,32,0.18)'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, 7); paint(ctx, '#FFF7EA', 5, PAL.brown);
    ctx.beginPath(); ctx.moveTo(-14, r * 0.82); ctx.lineTo(-30, r * 1.12); ctx.lineTo(6, r * 0.86); ctx.closePath(); paint(ctx, '#FFF7EA', 5, PAL.brown);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.84, 0, 7); ctx.fillStyle = '#FFF7EA'; ctx.fill();
    drawIcon(ctx, sp.icon, 0, 0, r * 1.15);
    ctx.restore();
    if (badge) this.dot(ctx, cx + r * 0.62, cy - r * 0.62 + bob);
  }

  dot(ctx, x, y) {
    const k = 1 + Math.sin(this.t * 2.2) * 0.05;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); paint(ctx, '#D2453A', 4, PAL.cream);
    ctx.fillStyle = PAL.cream; ctx.fillRect(-3.5, -12, 7, 15); ctx.beginPath(); ctx.arc(0, 9, 4, 0, 7); ctx.fill();
    ctx.restore();
  }

  note(ctx, n) {
    const a = clamp(Math.min((2.4 - n.life) / 0.25, n.life / 0.5), 0, 1);
    ctx.font = '700 30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(n.text).width + 44, h = 50, x = clamp(n.x, SIDE_CROP + w / 2 + 8, IMG_W - SIDE_CROP - w / 2 - 8);   // kept on screen
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, n.y - (2.4 - n.life) * 6);
    rrect(ctx, -w / 2, -h / 2, w, h, h / 2); paint(ctx, '#FFF7EA', 3, '#E3C08E');
    ctx.fillStyle = PAL.brownDark; ctx.fillText(n.text, 0, 2);
    ctx.restore();
  }

  cloud(ctx, x, y, k) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath();
    for (const [dx, dy, r] of [[-60, 0, 30], [-25, -18, 38], [20, -22, 42], [60, -4, 30], [0, 6, 34]]) { ctx.moveTo(dx + r, dy); ctx.arc(dx, dy, r, 0, Math.PI * 2); }
    ctx.fill(); ctx.restore();
  }

  plate(ctx, x, y, p) {
    ctx.save(); ctx.translate(x, y);
    ctx.font = '700 30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(p.text).width + 40, h = 52;
    rrect(ctx, -w / 2 + 3, -h / 2 + 5, w, h, h / 2); ctx.fillStyle = 'rgba(70,48,32,0.18)'; ctx.fill();
    rrect(ctx, -w / 2, -h / 2, w, h, h / 2); paint(ctx, p.tone === 'ready' ? '#E5F0D6' : '#FFF7EA', 3, p.tone === 'ready' ? PAL.green : PAL.honeyDark);
    ctx.fillStyle = PAL.brownDark; ctx.fillText(p.text, 0, 2);
    ctx.restore();
  }
}
