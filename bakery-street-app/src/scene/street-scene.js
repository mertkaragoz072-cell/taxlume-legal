// The main street scene: owns the cached layers, per-frame animation and input hit-testing.
import { DESIGN, TEXT } from '../config.js';
import { getImage } from '../assets.js';
import { glowAt, clamp, INK, applyGrain, gradeScreen, createCanvas } from '../util.js';
import { drawSky, makeClouds, drawCloud, drawBackdrop } from './backdrop.js';
import { drawPavement } from './pavement.js';
import { drawSides } from './sides.js';
import { drawMidground, drawLamps } from './midground.js';
import { drawForeground } from './foreground.js';
import { bakery } from '../buildings/bakery.js';
import { bookshop } from '../buildings/bookshop.js';
import { market } from '../buildings/market.js';
import { WALKERS, CAFE_SETS, updateWalkers, updateChef, drawWalker, drawWaitress, drawCafeSet } from '../characters/crowd.js';

const BUILDINGS = [bookshop, market, bakery];
const MARGIN = 60;                 // design px of spare layer on each side (parallax headroom)
const PAR = { far: 0.35, shops: 1, front: 1.8 };   // how far each depth plane moves with the camera
const MOTES = Array.from({ length: 34 }, (_, i) => ({ x: Math.random(), y: Math.random(), z: Math.random(), s: 0.6 + Math.random() * 1.6, p: i }));

export class StreetScene {
  constructor() {
    this.id = 'street';
    this.walkers = WALKERS();
    this.pulse = 0;       // 0..1 tap animation
    this.flash = 0;
    this.pressed = false;
    this.sparks = [];
    this.rings = [];
    this.t = 0;
    this.lampGlows = [];
    this.view = null;
    this.look = 0;        // -1..1 from pointer / tilt
    this.cam = 0;         // smoothed camera offset in design px
  }

  /** Steer the parallax camera (pointer position or device tilt), -1..1. */
  setLook(n) { this.look = clamp(n, -1, 1); }

  /** Rebuild cached layers when the screen size changes. Layers carry a margin so parallax shifts never expose an edge. */
  resize(view) {
    this.view = view;
    const k = view.scale * view.dpr, MG = MARGIN;
    const v2 = { ...view, ox: view.ox + MG };
    const make = (fn, grain = 0.022) => {
      const c = createCanvas(Math.ceil((view.W + 2 * MG * view.scale) * view.dpr), Math.ceil(view.H * view.dpr));
      const g = c.getContext('2d');
      g.setTransform(k, 0, 0, k, v2.ox * k, view.oy * k);
      fn(g);
      applyGrain(g, c.width, c.height, grain);
      return c;
    };
    this.layers = {
      far: make((g) => { drawSky(g, v2); drawBackdrop(g, v2); if (!getImage('town-backdrop')) drawSides(g, v2); }),
      back: make((g) => {
        drawPavement(g, v2);
        contactShadows(g);
        bookshop.draw(g);
        market.draw(g);
        if (bakery.usesAsset) this.lampGlows = drawLamps(g);
      }),
      mid: make((g) => { const l = drawMidground(g, v2); if (l.length) this.lampGlows = l; }),
      front: make((g) => drawForeground(g, v2)),
    };
    // bakery gets its own sprite so it can squash / glow on tap
    const b = bakery.bounds, pad = 30;
    this.bakerySprite = (() => {
      const c = createCanvas(Math.ceil((b.w + pad * 2) * k), Math.ceil((b.h + pad * 2) * k));
      const g = c.getContext('2d');
      g.setTransform(k, 0, 0, k, (pad - b.x) * k, (pad - b.y) * k);
      bakery.draw(g);
      return { canvas: c, pad };
    })();
    this.clouds = this.clouds ?? makeClouds(view);
    this.xmin = -view.ox; this.xmax = DESIGN.w + view.ox;
  }

  /** Slanted, slowly breathing sunbeams across the far plane. */
  lightShafts(ctx, k, v) {
    const t = this.t, W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const cx = W * (0.15 + i * 0.24) + Math.sin(t * 0.12 + i) * W * 0.02 - this.cam * 0.6 * k;
      const a = 0.05 + 0.025 * Math.sin(t * 0.4 + i * 1.9);
      const g = ctx.createLinearGradient(cx, 0, cx - W * 0.16, H * 0.8);
      g.addColorStop(0, `rgba(255,236,170,${a * 1.6})`); g.addColorStop(1, 'rgba(255,236,170,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx - W * 0.05, 0); ctx.lineTo(cx + W * 0.05, 0);
      ctx.lineTo(cx - W * 0.16 + W * 0.08, H * 0.8); ctx.lineTo(cx - W * 0.16 - W * 0.08, H * 0.8);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  /** Floating pollen / dust: small bright motes drift slowly behind the shops, big soft bokeh drifts fast in front. */
  motes(ctx, k, v, t) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const m of MOTES) {
      const near = m.z > 0.82, f = near ? PAR.front : 0.6 + m.z * 0.5;
      const sp = (near ? 0.012 : 0.006) * m.s;
      const x = (((m.x + t * sp + Math.sin(t * 0.3 + m.p) * 0.01) % 1) + 1) % 1;
      const y = (((m.y - t * 0.004 * m.s + Math.sin(t * 0.5 + m.p * 2) * 0.012) % 1) + 1) % 1;
      const px = x * W - this.cam * f * k * 0.4, py = y * H;
      const r = (near ? 16 + m.s * 9 : 1.6 + m.s * 1.4) * k;
      const a = near ? 0.07 : 0.38 * (0.5 + 0.5 * Math.sin(t * 1.3 + m.p));
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(255,240,190,${a})`); g.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = g; ctx.fillRect(px - r, py - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  /** 'bakery' | 'market' | 'bookshop' | null. Where the two buildings overlap, the nearer centre wins. */
  hitTest(x, y) {
    x += this.cam;   // the shop plane moves with the camera
    const hits = [['bakery', bakery.bounds], ['market', market.bounds], ['bookshop', bookshop.bounds]].filter(([, b]) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (!hits.length) return null;
    hits.sort((a, b) => Math.abs(x - (a[1].x + a[1].w / 2)) - Math.abs(x - (b[1].x + b[1].w / 2)));
    return hits[0][0];
  }

  press(on, x, y) { this.pressed = on && this.hitTest(x, y) === 'bakery'; }

  /** Visual feedback for a building tap. A cafe-interior scene can be hooked in via the `onEnter` callback. */
  tapBuilding(id, x, y) {
    if (id !== 'bakery' && id !== 'market' && id !== 'bookshop') return;
    if (id === 'bakery') { this.pulse = 1; this.flash = 1; }   // the bakery sprite squashes and glows; the market (static art) gets the ring and sparks
    this.rings.push({ x, y, life: 1 });
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 110;
      this.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 1, size: 5 + Math.random() * 6, hue: Math.random() < 0.5 ? '#ffd34d' : '#fff6c0' });
    }
  }

  update(dt) {
    this.t += dt;
    const target = Math.sin(this.t * 0.23) * 6 + this.look * 16;
    this.cam += (target - this.cam) * Math.min(1, dt * 2.5);
    updateWalkers(this.walkers, dt, this.xmin - 40, this.xmax + 40);
    updateChef(dt);
    for (const c of this.clouds) { c.x += c.v * dt; if (c.x > this.xmax + 120) c.x = this.xmin - 120; }
    this.pulse = Math.max(0, this.pulse - dt * 2.2);
    this.flash = Math.max(0, this.flash - dt * 2.6);
    for (const s of this.sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 220 * dt; s.life -= dt * 1.6; }
    this.sparks = this.sparks.filter((s) => s.life > 0);
    for (const g of this.rings) g.life -= dt * 1.7;
    this.rings = this.rings.filter((g) => g.life > 0);
  }

  render(ctx) {
    const v = this.view, t = this.t, k = v.scale * v.dpr, cam = this.cam;
    const shift = (f) => -cam * f;
    // pre-rendered layer, shifted by its parallax factor (layers include a MARGIN on each side)
    const blit = (c, f) => { ctx.setTransform(1, 0, 0, 1, (shift(f) - MARGIN) * v.scale * v.dpr, 0); ctx.drawImage(c, 0, 0); };
    const design = (f = PAR.shops) => ctx.setTransform(k, 0, 0, k, (v.ox + shift(f)) * k, v.oy * k);

    blit(this.layers.far, PAR.far);
    // (sun shafts removed: they read as a camera effect)
    blit(this.layers.back, PAR.shops);

    // bakery sprite with press / tap squash
    design();
    const b = bakery.bounds, { canvas, pad } = this.bakerySprite;
    const spring = this.pulse > 0 ? Math.sin((1 - this.pulse) * Math.PI * 2.4) * this.pulse * 0.035 : 0;
    const sc = 1 + spring - (this.pressed ? 0.012 : 0);
    ctx.save();
    ctx.translate(bakery.pivot.x, bakery.pivot.y);
    ctx.scale(sc, sc * (1 + spring * 0.6));
    ctx.translate(-bakery.pivot.x, -bakery.pivot.y);
    ctx.drawImage(canvas, b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2);
    if (this.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.flash * 0.35;
      ctx.drawImage(canvas, b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2);
    }
    ctx.restore();

    blit(this.layers.mid, PAR.shops);
    design();
    if (!bakery.usesAsset) for (const s of CAFE_SETS) drawCafeSet(ctx, s, t);
    drawWaitress(ctx, t);
    for (const w of this.walkers) drawWalker(ctx, w, t);
    blit(this.layers.front, PAR.front);

    // warm light: lamps, lanterns, windows
    design();
    ctx.globalCompositeOperation = 'lighter';
    const flick = (i) => 0.85 + 0.15 * Math.sin(t * 2.3 + i * 1.7);
    this.lampGlows.forEach((l, i) => glowAt(ctx, l.x, l.y, 78, '255,200,90', 0.5 * flick(i)));
    let i = 0;
    for (const bld of BUILDINGS) for (const [lx, ly, r] of bld.lights) glowAt(ctx, lx, ly, r, '255,190,80', 0.28 * flick(i++));
    ctx.globalCompositeOperation = 'source-over';

    // steam from the cups
    if (!bakery.usesAsset) for (const s of CAFE_SETS) for (const dx of [-15, 13]) steam(ctx, s.x + dx, 610 - 60, t, dx);

    // tap ripple + warm halo around the bakery
    for (const g of this.rings) {
      const p = 1 - g.life;
      ctx.strokeStyle = `rgba(255,226,140,${g.life})`; ctx.lineWidth = 11 * g.life + 2;
      ctx.beginPath(); ctx.arc(g.x, g.y, 20 + p * 120, 0, 7); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${g.life * 0.6})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(g.x, g.y, 10 + p * 80, 0, 7); ctx.stroke();
    }
    // sparkles
    for (const s of this.sparks) {
      ctx.globalAlpha = clamp(s.life, 0, 1);
      star(ctx, s.x, s.y, s.size * s.life + 2, s.hue);
    }
    ctx.globalAlpha = 1;


    gradeScreen(ctx, { warm: 0.1, vignette: 0.1, floorFade: 0.04 });
  }
}

function steam(ctx, x, y, t, seed) {
  for (let i = 0; i < 3; i++) {
    const p = (((t * 0.45 + i / 3 + seed * 0.13) % 1) + 1) % 1;
    ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - p)})`;
    ctx.beginPath(); ctx.arc(x + Math.sin(p * 6 + seed) * 4, y - p * 26, 2.2 + p * 3, 0, 7); ctx.fill();
  }
}

function star(ctx, x, y, r, c) {
  ctx.fillStyle = c; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.38 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}

/** Soft ground shadows under every shop so they sit on the street rather than float. */
function contactShadows(ctx) {
  for (const b of [bookshop, market, bakery]) {
    const { x, w } = b.bounds, y = DESIGN.groundY;
    const g = ctx.createRadialGradient(x + w / 2, y, 4, x + w / 2, y, w * 0.58);
    g.addColorStop(0, 'rgba(30,14,4,0.45)'); g.addColorStop(1, 'rgba(30,14,4,0)');
    ctx.save(); ctx.translate(0, y); ctx.scale(1, 0.14); ctx.translate(0, -y);
    ctx.fillStyle = g; ctx.fillRect(x - w * 0.2, y - w * 0.6, w * 1.4, w * 1.2);
    ctx.restore();
  }
}
