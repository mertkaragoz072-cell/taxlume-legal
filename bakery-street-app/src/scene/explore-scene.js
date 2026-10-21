// Exploration map: a warm, hand-painted-style parchment map drawn with canvas shapes (no image assets).
// Each region is a marker on the left half; the details and buttons are a DOM panel (ui/explore.js) on the right.
import { createCanvas } from '../engine/ctx2d';
import { rng, vgrad, shadow, glowAt, paint, poly, fontCss, textFloor, gradeScreen } from '../util.js';
import { PAL } from '../palette.js';
import { drawIcon, getImage } from '../assets.js';
import { DESIGN } from '../config.js';

const R = 62;                                              // tap radius of a marker (design px)

export class ExploreScene {
  /** @param {import('../game/exploration.js').Exploration} exploration */
  constructor(exploration) { this.id = 'explore'; this.ex = exploration; this.t = 0; this.view = null; this.selected = null; this.pressedId = null; this.bg = null; this.bgKey = ''; }
  resize(view) { this.view = view; this.bgKey = ''; }
  update(dt) { this.t += dt; }
  hitTest(x, y) {
    for (const r of this.ex.regions) if (Math.hypot(x - r.map.x, y - r.map.y) <= R) return r.id;
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

  render(ctx) {
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
    gradeScreen(ctx, { warm: 0.25, vignette: 0.3, floorFade: 0 });
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
