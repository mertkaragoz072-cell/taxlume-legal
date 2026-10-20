// Exploration map: a warm, hand-painted-style parchment map drawn with canvas shapes (no image assets).
// Each region is a marker on the left half; the details and buttons are a DOM panel (ui/explore.js) on the right.
import { rng, vgrad, shadow, glowAt, paint, poly, fontCss, textFloor, gradeScreen } from '../util.js';
import { drawIcon } from '../assets.js';

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
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), rand = rng(7);
    g.fillStyle = vgrad(g, 0, h, [[0, '#f3dfae'], [1, '#e6c88a']]); g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(160,110,50,${0.03 + rand() * 0.04})`; g.beginPath(); g.ellipse(rand() * w, rand() * h, 40 + rand() * 120, 14 + rand() * 40, rand() * 3, 0, 7); g.fill(); }
    // rolling green hills across the map
    const hills = [['#9cc96b', 560, 90], ['#82b85a', 640, 120], ['#6fa84e', 720, 90]];
    for (const [col, y, amp] of hills) {
      g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 20) g.lineTo(x, y + Math.sin(x / 170 + amp) * amp * 0.35 + Math.sin(x / 60) * 6);
      g.lineTo(w, h); g.closePath(); paint(g, col, 2.5, '#4d7a35');
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
    // dotted trail linking the regions in order
    ctx.strokeStyle = 'rgba(120,70,25,.7)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.setLineDash([2, 16]);
    ctx.beginPath(); rs.forEach((r, i) => (i ? ctx.lineTo(r.map.x, r.map.y) : ctx.moveTo(r.map.x, r.map.y))); ctx.stroke(); ctx.setLineDash([]);
    for (const r of rs) this.drawRegion(ctx, r, t);
    gradeScreen(ctx, { warm: 0.25, vignette: 0.3, floorFade: 0 });
  }

  drawRegion(ctx, r, t) {
    const { x, y } = r.map, st = this.ex.status(r.id), locked = st === 'locked';
    const sel = this.selected === r.id, press = this.pressedId === r.id;
    const bob = st === 'ready' ? Math.sin(t * 5) * 4 : 0, s = (press ? 0.94 : 1) * (sel ? 1.06 : 1);
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(s, s);
    shadow(ctx, 0, 52, 78, 16, 0.3);
    // island base
    ctx.beginPath(); ctx.ellipse(0, 20, 84, 52, 0, 0, Math.PI * 2);
    paint(ctx, locked ? '#b7ad94' : '#a6d46f', 3.5, locked ? '#6c6552' : '#4d7a35');
    if (sel || st === 'ready') { ctx.globalCompositeOperation = 'lighter'; glowAt(ctx, 0, 10, 110, st === 'ready' ? '255,230,90' : '255,210,120', 0.35 + 0.1 * Math.sin(t * 4)); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = locked ? 0.6 : 1;
    if (r.id === 'meadow') this.meadow(ctx);
    else if (r.id === 'forest') this.forest(ctx);
    else this.ruins(ctx);
    ctx.globalAlpha = 1;
    this.badge(ctx, r, st, t);
    ctx.restore();
    // name plate
    ctx.font = fontCss('700 22px "Trebuchet MS", system-ui, sans-serif'); ctx.textAlign = 'center';
    const tw = ctx.measureText(r.name).width + 26, th = Math.max(34, textFloor.px * 1.5);
    ctx.beginPath(); ctx.roundRect(x - tw / 2, y + 74, tw, th, 12);
    paint(ctx, '#fff3d0', 3, '#7a4a1c');
    ctx.fillStyle = locked ? '#7a6a52' : '#4a2a10'; ctx.textBaseline = 'middle'; ctx.fillText(r.name, x, y + 74 + th / 2 + 1);
  }

  badge(ctx, r, st, t) {
    let label = null, icon = null, col = '#e0951f';
    if (st === 'locked') { label = '🔒'; icon = 'lock'; col = '#8a8068'; }
    else if (st === 'ready') { label = '🎁'; icon = 'gift'; col = '#3fa63a'; }
    else if (st === 'active') { label = formatShort(this.ex.remaining()); col = '#3a7bd5'; }
    if (!label) return;
    ctx.font = fontCss('700 22px "Trebuchet MS", system-ui, sans-serif'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = icon ? 44 : Math.max(44, ctx.measureText(label).width + 22), h = Math.max(36, textFloor.px * 1.5);
    ctx.beginPath(); ctx.roundRect(-w / 2, -92, w, h, h / 2); paint(ctx, col, 3, '#3a2213');
    if (icon && drawIcon(ctx, icon, 0, -92 + h / 2, h * 0.9)) return;
    ctx.fillStyle = '#fff'; ctx.fillText(label, 0, -92 + h / 2 + 1);
  }

  meadow(ctx) {
    const rand = rng(3);
    for (let i = 0; i < 14; i++) {
      const fx = -56 + rand() * 112, fy = -4 + rand() * 44;
      ctx.strokeStyle = '#4d7a35'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 12); ctx.stroke();
      ctx.beginPath(); ctx.arc(fx, fy - 14, 5, 0, 7); paint(ctx, ['#ff8fb3', '#ffd34d', '#fff', '#c08ae8'][i % 4], 1.5);
    }
    ctx.beginPath(); ctx.ellipse(-8, -10, 30, 22, 0, Math.PI, 0); paint(ctx, '#8fc85a', 3, '#4d7a35');
  }
  forest(ctx) {
    for (const [tx, ty, sc] of [[-40, 18, 0.9], [38, 20, 0.95], [-6, 2, 1.15], [-60, 34, 0.7], [60, 38, 0.7]]) {
      ctx.fillStyle = '#6a4423'; ctx.fillRect(tx - 5 * sc, ty, 10 * sc, 26 * sc);
      for (const [dy, w] of [[-4, 30], [-26, 24], [-46, 17]]) { poly(ctx, [[tx - w * sc, ty + dy], [tx, ty + dy - 34 * sc], [tx + w * sc, ty + dy]]); paint(ctx, '#3f8f45', 2.5, '#245a2c'); }
    }
  }
  ruins(ctx) {
    ctx.beginPath(); ctx.ellipse(0, 36, 70, 14, 0, 0, 7); paint(ctx, '#c9c0a8', 2.5, '#7a7058');
    for (const [cx, h] of [[-44, 62], [-14, 84], [20, 70], [50, 46]]) {
      ctx.fillStyle = '#ddd4ba'; ctx.fillRect(cx - 9, 34 - h, 18, h); ctx.strokeStyle = '#7a7058'; ctx.lineWidth = 2.5; ctx.strokeRect(cx - 9, 34 - h, 18, h);
      ctx.fillStyle = '#c9c0a8'; ctx.fillRect(cx - 13, 30 - h, 26, 8); ctx.strokeRect(cx - 13, 30 - h, 26, 8);
    }
    ctx.beginPath(); ctx.arc(-14, -50, 22, Math.PI, 0); ctx.lineWidth = 8; ctx.strokeStyle = '#ddd4ba'; ctx.stroke();
    ctx.fillStyle = '#7fbf5a'; for (const px of [-52, -22, 12, 44]) { ctx.beginPath(); ctx.arc(px, 36, 7, 0, 7); ctx.fill(); }
  }
}

function formatShort(sec) {
  const s = Math.ceil(sec);
  return s >= 3600 ? `${Math.floor(s / 3600)}sa ${Math.floor((s % 3600) / 60)}dk` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
