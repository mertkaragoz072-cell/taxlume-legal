// Exploration map: a warm, hand-painted-style parchment map drawn with canvas shapes (no image assets).
// Each region is a marker on the left half; the details and buttons are a DOM panel (ui/explore.js) on the right.
import { rng, vgrad, shadow, glowAt, paint, poly, fontCss, textFloor, gradeScreen, createCanvas } from '../util.js';
import { PAL } from '../palette.js';
import { drawIcon, getImage } from '../assets.js';
import { DESIGN } from '../config.js';

const R = 62;
const BOARD_W = 1024, BOARD_H = 853;                                              // tap radius of a marker (design px)

export class ExploreScene {
  /** @param {import('../game/exploration.js').Exploration} exploration */
  constructor(exploration) { this.id = 'explore'; this.ex = exploration; this.t = 0; this.view = null; this.selected = null; this.pressedId = null; this.bg = null; this.bgKey = ''; this.topPx = 0; }   // topPx: set by the app, where the board starts on screen (below the top bar)
  resize(view) { this.view = view; this.bgKey = ''; this.panX = null; }
  update(dt) {
    this.t += dt;
    if (this.usesBoard()) return;
    if (this.view?.portrait) {                                    // the map slides so the selected (or first) region stays in view
      const { s } = this.xform(), want = this.panTarget(s);
      this.panX = this.panX == null ? want : this.panX + (want - this.panX) * Math.min(1, dt * 6);
    }
  }
  /** Portrait: the map is shown at a scale that fills the upper half of the screen and is panned sideways; landscape draws it 1:1. */
  xform() {
    const v = this.view;
    if (!v?.portrait) return { s: 1, ox: 0, oy: 0 };
    const s = Math.max(v.vw / DESIGN.w, (v.vh * 0.46) / DESIGN.h);
    return { s, ox: this.panX ?? this.panTarget(s), oy: 70 };
  }
  panTarget(s) {
    const v = this.view, r = this.ex.regions.find((q) => q.id === this.selected) ?? this.ex.regions[0], fx = r ? r.map.x : DESIGN.w / 2;
    return Math.max(v.vw - DESIGN.w * s, Math.min(0, v.vw / 2 - fx * s));
  }
  /** Portrait with the painted board (assets/explore-board.webp): the board fills the width right under the top bar. */
  usesBoard() { return !!this.view?.portrait && !!getImage('explore-board'); }
  board() { const v = this.view, s = v.vw / BOARD_W; return { s, ox: 0, oy: this.topPx / v.scale }; }

  hitTest(x, y) {
    if (this.usesBoard()) {
      const { s, ox, oy } = this.board(), bx = (x - ox) / s, by = (y - oy) / s;
      for (const r of this.ex.regions) if (r.board && Math.hypot(bx - r.board.x, by - r.board.y) <= 70) return r.id;
      return null;
    }
    const { s, ox, oy } = this.xform(), mx = (x - ox) / s, my = (y - oy) / s;
    for (const r of this.ex.regions) if (Math.hypot(mx - r.map.x, my - r.map.y) <= R) return r.id;
    return null;
  }
  press(on, x, y) { this.pressedId = on ? this.hitTest(x, y) : null; }

  /** Static parchment, hills and paths, cached per viewport. */
  paintBackdrop(w, h) {
    const c = createCanvas(w, h);
    const g = c.getContext('2d'), rand = rng(7);
    const map = getImage('explore-map');
    if (map) {                                                    // supplied map: sharp in the design rectangle, soft parchment beyond it
      const v = this.view, k = v.scale * v.dpr, cover = Math.max(w / map.naturalWidth, h / map.naturalHeight);
      if ('filter' in g) g.filter = 'blur(10px)';
      g.drawImage(map, (w - map.naturalWidth * cover) / 2, (h - map.naturalHeight * cover) / 2, map.naturalWidth * cover, map.naturalHeight * cover);
      g.filter = 'none';
      g.drawImage(map, v.ox * k, v.oy * k, DESIGN.w * k, DESIGN.h * k);
      return c;
    }
    g.fillStyle = vgrad(g, 0, h, [[0, PAL.vanilla], [1, PAL.honeyLight]]); g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(160,110,50,${0.03 + rand() * 0.04})`; g.beginPath(); g.ellipse(rand() * w, rand() * h, 40 + rand() * 120, 14 + rand() * 40, rand() * 3, 0, 7); g.fill(); }
    // rolling green hills across the map
    const hills = [[PAL.greenLight, 560, 90], [PAL.green, 640, 120], [PAL.green, 720, 90]];
    for (const [col, y, amp] of hills) {
      g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 20) g.lineTo(x, y + Math.sin(x / 170 + amp) * amp * 0.35 + Math.sin(x / 60) * 6);
      g.lineTo(w, h); g.closePath(); paint(g, col, 2.5, PAL.greenDark);
    }
    // map border
    g.strokeStyle = 'rgba(110,70,30,.55)'; g.lineWidth = 6; g.setLineDash([16, 10]); g.strokeRect(14, 14, w - 28, h - 28); g.setLineDash([]);
    return c;
  }

  renderPortrait(ctx) {
    if (this.usesBoard()) return this.renderBoard(ctx);
    const v = this.view, k = v.scale * v.dpr, t = this.t, { s, ox, oy } = this.xform(), map = getImage('explore-map');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.fillStyle = vgrad(ctx, 0, v.vh, [[0, PAL.vanilla], [1, PAL.honeyLight]]); ctx.fillRect(0, 0, v.vw, v.vh);
    if (map) ctx.drawImage(map, ox, oy, DESIGN.w * s, DESIGN.h * s);
    ctx.setTransform(k * s, 0, 0, k * s, ox * k, oy * k);
    for (const r of this.ex.regions) this.drawRegion(ctx, r, t);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    gradeScreen(ctx, { warm: 0.12, vignette: 0.1, floorFade: 0 });
  }

  render(ctx) {
    if (this.view.portrait) return this.renderPortrait(ctx);
    const v = this.view, k = v.scale * v.dpr, t = this.t;
    const key = `${ctx.canvas.width}x${ctx.canvas.height}`;
    if (this.bgKey !== key) { this.bg = this.paintBackdrop(ctx.canvas.width, ctx.canvas.height); this.bgKey = key; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(this.bg, 0, 0);
    ctx.setTransform(k, 0, 0, k, v.ox * k, v.oy * k);
    const rs = this.ex.regions;
    // dotted trail linking the regions in order (the supplied map already has its own paths)
    if (!getImage('explore-map')) {
    ctx.strokeStyle = 'rgba(120,70,25,.7)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.setLineDash([2, 16]);
    ctx.beginPath(); rs.forEach((r, i) => (i ? ctx.lineTo(r.map.x, r.map.y) : ctx.moveTo(r.map.x, r.map.y))); ctx.stroke(); ctx.setLineDash([]);
    }
    for (const r of rs) this.drawRegion(ctx, r, t);
    gradeScreen(ctx, { warm: 0.12, vignette: 0.1, floorFade: 0 });
  }

  /** The painted board, its title, and one marker per region: lock, open, on an expedition (timer), reward waiting, done (tick); the selected one gets the paw pin. */
  renderBoard(ctx) {
    const v = this.view, k = v.scale * v.dpr, t = this.t, { s, oy } = this.board(), img = getImage('explore-board');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, oy + 40); sky.addColorStop(0, '#A9D8FB'); sky.addColorStop(1, '#8CC8F4');
    ctx.fillStyle = sky; ctx.fillRect(-10, -10, v.vw + 20, oy + 60);
    const wood = ctx.createLinearGradient(0, oy + BOARD_H * s - 20, 0, v.vh); wood.addColorStop(0, '#8A5A36'); wood.addColorStop(1, '#6E4529');
    ctx.fillStyle = wood; ctx.fillRect(-10, oy + BOARD_H * s - 20, v.vw + 20, v.vh);
    ctx.strokeStyle = 'rgba(60,36,20,0.35)'; ctx.lineWidth = 3;                      // wooden planks under the board
    for (let py = oy + BOARD_H * s + 40; py < v.vh; py += 70) { ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(v.vw, py); ctx.stroke(); }
    ctx.drawImage(img, 0, oy, BOARD_W * s, BOARD_H * s);
    ctx.save(); ctx.translate(0, oy); ctx.scale(s, s);
    ctx.font = fontCss('800 54px "Trebuchet MS", system-ui, sans-serif'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = PAL.brownDark; ctx.fillText('Keşif', 540, 78);
    const sel = this.selected ?? this.defaultSelection();
    for (const r of this.ex.regions) if (r.board && r.id !== sel) this.marker(ctx, r, t, false);
    const sr = this.ex.region(sel); if (sr?.board) this.marker(ctx, sr, t, true);
    ctx.restore();
    gradeScreen(ctx, { warm: 0.08, vignette: 0.06, floorFade: 0 });
  }

  /** What the panel shows when nothing was tapped: the expedition under way, else the newest open region. */
  defaultSelection() {
    if (this.ex.active) return this.ex.active.id;
    const open = this.ex.regions.filter((r) => this.ex.status(r.id) !== 'locked');
    return (open[open.length - 1] ?? this.ex.regions[0]).id;
  }

  marker(ctx, r, t, selected) {
    const { x, y } = r.board, st = this.ex.status(r.id), done = this.ex.timesDone(r.id) > 0, press = this.pressedId === r.id ? 0.92 : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(press, press);
    if (selected) {                                            // soft glow and the paw pin
      ctx.globalCompositeOperation = 'lighter'; glowAt(ctx, 0, 10, 120, '255,220,120', 0.28 + 0.06 * Math.sin(t * 2)); ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath(); ctx.ellipse(0, 32, 34, 16, 0, 0, 7); paint(ctx, '#F2D9A6', 3, PAL.honeyDark);
      const bob = Math.sin(t * 2.2) * 5;
      ctx.translate(0, bob - 6);
      ctx.beginPath(); ctx.moveTo(0, 30); ctx.bezierCurveTo(-12, 8, -40, -12, -40, -42); ctx.arc(0, -42, 40, Math.PI, 0); ctx.bezierCurveTo(40, -12, 12, 8, 0, 30); ctx.closePath();
      paint(ctx, '#F08A24', 4, '#B85F3B');
      ctx.beginPath(); ctx.arc(0, -42, 28, 0, 7); ctx.fillStyle = '#FFF4DE'; ctx.fill();
      this.paw(ctx, 0, -42, 20, '#F08A24');
      ctx.restore();
      if (st !== 'locked' && st !== 'available' && st !== 'busy') this.stateChip(ctx, r, st, x, y - 120);
      return;
    }
    ctx.beginPath(); ctx.arc(2, 5, 34, 0, 7); ctx.fillStyle = 'rgba(70,48,32,0.25)'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 34, 0, 7);
    if (st === 'locked') { paint(ctx, '#EADFC8', 4, PAL.brown); this.lock(ctx); }
    else if (st === 'ready') { paint(ctx, '#FFE7A8', 4, PAL.honeyDark); drawIcon(ctx, 'gift', 0, 0, 46); }
    else if (st === 'active') { paint(ctx, '#FFF4DE', 4, PAL.honeyDark); drawIcon(ctx, 'timer', 0, 0, 42); }
    else if (done) { paint(ctx, '#F4F0E2', 4, PAL.brown); this.tick(ctx); }
    else { paint(ctx, '#FFF4DE', 4, PAL.honeyDark); this.paw(ctx, 0, 0, 18, '#F08A24'); }
    ctx.restore();
    if (st === 'ready' || st === 'active') this.stateChip(ctx, r, st, x, y - 58);
  }

  stateChip(ctx, r, st, x, y) {
    const text = st === 'ready' ? 'Ödül hazır!' : formatShort(this.ex.remaining());
    ctx.font = fontCss('700 26px "Trebuchet MS", system-ui, sans-serif'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 30, h = 40;
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); paint(ctx, st === 'ready' ? '#E5F0D6' : '#FFF7EA', 3, st === 'ready' ? PAL.green : PAL.honeyDark);
    ctx.fillStyle = PAL.brownDark; ctx.fillText(text, x, y + 1);
  }

  lock(ctx) {
    ctx.lineWidth = 5; ctx.strokeStyle = PAL.brown; ctx.beginPath(); ctx.arc(0, -6, 11, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-16, -6, 32, 24, 5); paint(ctx, '#D8C3A0', 3, PAL.brown);
    ctx.beginPath(); ctx.arc(0, 4, 4, 0, 7); ctx.fillStyle = PAL.brown; ctx.fill(); ctx.fillRect(-2, 4, 4, 8);
  }

  tick(ctx) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#3F6E2A'; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(-15, 1); ctx.lineTo(-4, 13); ctx.lineTo(18, -13); ctx.stroke();
    ctx.strokeStyle = '#8CC152'; ctx.lineWidth = 7; ctx.stroke();
  }

  paw(ctx, x, y, r, col) {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.25, r * 0.55, r * 0.45, 0, 0, 7); ctx.fill();
    for (const [dx, dy] of [[-0.62, -0.32], [-0.22, -0.68], [0.22, -0.68], [0.62, -0.32]]) { ctx.beginPath(); ctx.ellipse(x + dx * r, y + dy * r, r * 0.18, r * 0.23, 0, 0, 7); ctx.fill(); }
  }

  drawRegion(ctx, r, t) {
    const { x, y } = r.map, st = this.ex.status(r.id), locked = st === 'locked';
    const sel = this.selected === r.id, press = this.pressedId === r.id;
    const bob = st === 'ready' ? Math.sin(t * 5) * 4 : 0, s = (press ? 0.94 : 1) * (sel ? 1.06 : 1);
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(s, s);
    shadow(ctx, 0, 52, 78, 16, 0.3);
    const glow = () => { if (sel || st === 'ready') { ctx.globalCompositeOperation = 'lighter'; glowAt(ctx, 0, 10, 110, st === 'ready' ? '255,230,90' : '255,210,120', 0.35 + 0.1 * Math.sin(t * 4)); ctx.globalCompositeOperation = 'source-over'; } };
    glow();
    ctx.globalAlpha = locked ? 0.6 : 1;
    if (locked && 'filter' in ctx) ctx.filter = 'grayscale(.7)';
    if (!drawIcon(ctx, `r-${r.id}`, 0, 12, 170)) {              // fallback: the island drawn in code
      ctx.beginPath(); ctx.ellipse(0, 20, 84, 52, 0, 0, Math.PI * 2);
      paint(ctx, locked ? PAL.honeyLight : PAL.greenLight, 3.5, locked ? PAL.brown : PAL.greenDark);
      if (r.id === 'meadow') this.meadow(ctx);
      else if (r.id === 'forest') this.forest(ctx);
      else this.ruins(ctx);
    }
    if ('filter' in ctx) ctx.filter = 'none';
    ctx.globalAlpha = 1;
    this.badge(ctx, r, st, t);
    ctx.restore();
    // name plate
    ctx.font = fontCss('700 22px "Trebuchet MS", system-ui, sans-serif'); ctx.textAlign = 'center';
    const tw = ctx.measureText(r.name).width + 26, th = Math.max(34, textFloor.px * 1.5);
    ctx.beginPath(); ctx.roundRect(x - tw / 2, y + 74, tw, th, 12);
    paint(ctx, PAL.creamLight, 3, PAL.brown);
    ctx.fillStyle = locked ? PAL.brown : PAL.brownDark; ctx.textBaseline = 'middle'; ctx.fillText(r.name, x, y + 74 + th / 2 + 1);
  }

  badge(ctx, r, st, t) {
    let label = null, icon = null, col = PAL.honeyDark;
    if (st === 'locked') { label = '🔒'; icon = 'lock'; col = PAL.honeyDark; }
    else if (st === 'ready') { label = '🎁'; icon = 'gift'; col = PAL.green; }
    else if (st === 'active') { label = formatShort(this.ex.remaining()); col = PAL.honey; }
    if (!label) return;
    ctx.font = fontCss('700 22px "Trebuchet MS", system-ui, sans-serif'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = icon ? 44 : Math.max(44, ctx.measureText(label).width + 22), h = Math.max(36, textFloor.px * 1.5);
    ctx.beginPath(); ctx.roundRect(-w / 2, -92, w, h, h / 2); paint(ctx, col, 3, PAL.brownDark);
    if (icon && drawIcon(ctx, icon, 0, -92 + h / 2, h * 0.9)) return;
    ctx.fillStyle = PAL.paper; ctx.fillText(label, 0, -92 + h / 2 + 1);
  }

  meadow(ctx) {
    const rand = rng(3);
    for (let i = 0; i < 14; i++) {
      const fx = -56 + rand() * 112, fy = -4 + rand() * 44;
      ctx.strokeStyle = PAL.greenDark; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 12); ctx.stroke();
      ctx.beginPath(); ctx.arc(fx, fy - 14, 5, 0, 7); paint(ctx, [PAL.terracottaPale, PAL.honeyLight, PAL.paper, PAL.honeyLight][i % 4], 1.5);
    }
    ctx.beginPath(); ctx.ellipse(-8, -10, 30, 22, 0, Math.PI, 0); paint(ctx, PAL.greenLight, 3, PAL.greenDark);
  }
  forest(ctx) {
    for (const [tx, ty, sc] of [[-40, 18, 0.9], [38, 20, 0.95], [-6, 2, 1.15], [-60, 34, 0.7], [60, 38, 0.7]]) {
      ctx.fillStyle = PAL.brown; ctx.fillRect(tx - 5 * sc, ty, 10 * sc, 26 * sc);
      for (const [dy, w] of [[-4, 30], [-26, 24], [-46, 17]]) { poly(ctx, [[tx - w * sc, ty + dy], [tx, ty + dy - 34 * sc], [tx + w * sc, ty + dy]]); paint(ctx, PAL.green, 2.5, PAL.greenDark); }
    }
  }
  ruins(ctx) {
    ctx.beginPath(); ctx.ellipse(0, 36, 70, 14, 0, 0, 7); paint(ctx, PAL.honeyLight, 2.5, PAL.honeyDark);
    for (const [cx, h] of [[-44, 62], [-14, 84], [20, 70], [50, 46]]) {
      ctx.fillStyle = PAL.vanilla; ctx.fillRect(cx - 9, 34 - h, 18, h); ctx.strokeStyle = PAL.honeyDark; ctx.lineWidth = 2.5; ctx.strokeRect(cx - 9, 34 - h, 18, h);
      ctx.fillStyle = PAL.honeyLight; ctx.fillRect(cx - 13, 30 - h, 26, 8); ctx.strokeRect(cx - 13, 30 - h, 26, 8);
    }
    ctx.beginPath(); ctx.arc(-14, -50, 22, Math.PI, 0); ctx.lineWidth = 8; ctx.strokeStyle = PAL.vanilla; ctx.stroke();
    ctx.fillStyle = PAL.greenLight; for (const px of [-52, -22, 12, 44]) { ctx.beginPath(); ctx.arc(px, 36, 7, 0, 7); ctx.fill(); }
  }
}

function formatShort(sec) {
  const s = Math.ceil(sec);
  return s >= 3600 ? `${Math.floor(s / 3600)}sa ${Math.floor((s % 3600) / 60)}dk` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
