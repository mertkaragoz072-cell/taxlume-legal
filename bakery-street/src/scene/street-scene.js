// The main street scene: owns the cached layers, per-frame animation and input hit-testing.
import { DESIGN, TEXT } from '../config.js';
import { glowAt, clamp, INK, applyGrain } from '../util.js';
import { drawSky, makeClouds, drawCloud, drawBackdrop } from './backdrop.js';
import { drawPavement } from './pavement.js';
import { drawSides } from './sides.js';
import { drawMidground, drawLamps } from './midground.js';
import { drawForeground } from './foreground.js';
import { bakery } from '../buildings/bakery.js';
import { bookshop } from '../buildings/bookshop.js';
import { market } from '../buildings/market.js';
import { WALKERS, CAFE_SETS, updateWalkers, drawWalker, drawWaitress, drawCafeSet } from '../characters/crowd.js';

const BUILDINGS = [bookshop, market, bakery];

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
  }

  /** Rebuild cached layers when the screen size changes. */
  resize(view) {
    this.view = view;
    const k = view.scale * view.dpr;
    const make = (fn) => {
      const c = document.createElement('canvas');
      c.width = Math.ceil(view.W * view.dpr);
      c.height = Math.ceil(view.H * view.dpr);
      const g = c.getContext('2d');
      g.setTransform(k, 0, 0, k, view.ox * k, view.oy * k);
      fn(g);
      applyGrain(g, c.width, c.height, 0.022);
      return c;
    };
    this.layers = {
      sky: make((g) => drawSky(g, view)),
      back: make((g) => {
        drawBackdrop(g, view);
        drawSides(g, view);
        bookshop.draw(g);
        market.draw(g);
        drawPavement(g, view);
        if (bakery.usesAsset) this.lampGlows = drawLamps(g);
      }),
      mid: make((g) => { const l = drawMidground(g, view); if (l.length) this.lampGlows = l; }),
      front: make((g) => drawForeground(g, view)),
    };
    // bakery gets its own sprite so it can squash / glow on tap
    const b = bakery.bounds, pad = 30;
    this.bakerySprite = (() => {
      const c = document.createElement('canvas');
      c.width = Math.ceil((b.w + pad * 2) * k); c.height = Math.ceil((b.h + pad * 2) * k);
      const g = c.getContext('2d');
      g.setTransform(k, 0, 0, k, (pad - b.x) * k, (pad - b.y) * k);
      bakery.draw(g);
      return { canvas: c, pad };
    })();
    this.clouds = this.clouds ?? makeClouds(view);
    this.xmin = -view.ox; this.xmax = DESIGN.w + view.ox;
  }

  hitTest(x, y) {
    const b = bakery.bounds;
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h ? 'bakery' : null;
  }

  press(on) { this.pressed = on; }

  /** Visual feedback for a building tap. A cafe-interior scene can be hooked in via the `onEnter` callback. */
  tapBuilding(id, x, y) {
    if (id !== 'bakery') return;
    this.pulse = 1; this.flash = 1; this.rings.push({ x, y, life: 1 });
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 110;
      this.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 1, size: 5 + Math.random() * 6, hue: Math.random() < 0.5 ? '#ffd34d' : '#fff6c0' });
    }
  }

  update(dt) {
    this.t += dt;
    updateWalkers(this.walkers, dt, this.xmin - 40, this.xmax + 40);
    for (const c of this.clouds) { c.x += c.v * dt; if (c.x > this.xmax + 120) c.x = this.xmin - 120; }
    this.pulse = Math.max(0, this.pulse - dt * 2.2);
    this.flash = Math.max(0, this.flash - dt * 2.6);
    for (const s of this.sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 220 * dt; s.life -= dt * 1.6; }
    this.sparks = this.sparks.filter((s) => s.life > 0);
    for (const g of this.rings) g.life -= dt * 1.7;
    this.rings = this.rings.filter((g) => g.life > 0);
  }

  render(ctx) {
    const v = this.view, t = this.t, k = v.scale * v.dpr;
    const blit = (c) => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(c, 0, 0); };
    const design = () => ctx.setTransform(k, 0, 0, k, v.ox * k, v.oy * k);

    blit(this.layers.sky);
    design();
    for (const c of this.clouds) drawCloud(ctx, c);
    blit(this.layers.back);

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

    blit(this.layers.mid);
    design();
    if (!bakery.usesAsset) for (const s of CAFE_SETS) drawCafeSet(ctx, s, t);
    drawWaitress(ctx, t);
    for (const w of this.walkers) drawWalker(ctx, w, t);
    blit(this.layers.front);

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

    // soft vignette
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const g = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.45, W / 2, H * 0.55, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(40,15,0,0)'); g.addColorStop(1, 'rgba(40,15,0,.28)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
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
