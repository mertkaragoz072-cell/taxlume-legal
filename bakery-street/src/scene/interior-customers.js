// Visual side of the customers: walking in, queueing, standing at a table, order bubbles and leaving.
// Logic lives in game/customers.js; this layer only follows it (placeholder characters = the walk-cycle sprites).
import { chairSpot, QUEUE_SPOTS, SERVICE_LINE_Y, PERSON_SCALE, PERSON_H } from './interior-layout.js';
import { drawSprite } from '../characters/sprites.js';
import { INK, rrect, poly, paint, label, clamp } from '../util.js';

const ENTRY = { x: 1520, y: SERVICE_LINE_Y };          // customers come in from the right along the service line
const SPEED = 210;                 // design px per second
const BODY_H = PERSON_H;           // approximate sprite height at the interior scale (for bubbles and hit-testing)

export class CustomerLayer {
  constructor(game, cafe) {
    this.game = game;
    this.cafe = cafe;
    this.v = new Map();            // customer id -> visual { x, y, dir, moving, leaving, look }
    this.pops = [];
    game.on('customer', (e) => {
      if (e.type === 'leave' && e.income) {
        const v = this.v.get(e.id);
        this.pops.push({ x: v?.x ?? 700, y: (v?.y ?? 700) - BODY_H - 30, text: `+${e.income} 💰`, life: 1 });
      }
    });
  }

  targetFor(c) {
    if (c.state === 'seated') return chairSpot(c.table);
    const i = this.cafe.queued().findIndex((q) => q.id === c.id);
    return QUEUE_SPOTS[Math.min(i, QUEUE_SPOTS.length - 1)];
  }

  /** Put everyone straight at their spot (used when the interior opens, since it is not updated while hidden). */
  snap() {
    this.v.clear();
    for (const c of this.cafe.customers) {
      const t = this.targetFor(c);
      this.v.set(c.id, { x: t.x, y: t.y, dir: c.state === 'seated' ? 1 : -1, moving: false, leaving: false, look: c.look });
    }
  }

  update(dt) {
    const live = new Set();
    for (const c of this.cafe.customers) {
      live.add(c.id);
      let v = this.v.get(c.id);
      if (!v) { v = { x: ENTRY.x, y: ENTRY.y, dir: -1, moving: true, leaving: false, look: c.look }; this.v.set(c.id, v); }
      this.step(v, this.targetFor(c), dt);
      if (!v.moving && c.state === 'seated') v.dir = 1;   // once at the table, face it
    }
    for (const [id, v] of this.v) {
      if (live.has(id)) continue;
      v.leaving = true;                                          // logic removed them: walk out through the entrance
      this.step(v, { x: ENTRY.x + 40, y: ENTRY.y }, dt);
      if (v.x >= ENTRY.x + 30) this.v.delete(id);
    }
    for (const p of this.pops) p.life -= dt * 0.8;
    this.pops = this.pops.filter((p) => p.life > 0);
  }

  step(v, to, dt) {
    const dx = to.x - v.x, dy = to.y - v.y, d = Math.hypot(dx, dy);
    if (d < 2) { v.x = to.x; v.y = to.y; v.moving = false; return; }
    const s = Math.min(d, SPEED * dt);
    v.x += (dx / d) * s; v.y += (dy / d) * s; v.moving = true;
    if (Math.abs(dx) > 1) v.dir = dx > 0 ? 1 : -1;
  }

  /** 'customer:<id>' when the point is on a seated customer or their order bubble. */
  hitTest(x, y) {
    for (const c of this.cafe.customers) {
      if (c.state !== 'seated') continue;
      const v = this.v.get(c.id);
      if (!v || v.moving) continue;
      if (Math.abs(x - v.x) < 66 && y > v.y - BODY_H - 70 && y < v.y + 6) return `customer:${c.id}`;
    }
    return null;
  }

  draw(ctx, t) {
    const list = [...this.v.entries()].sort((a, b) => a[1].y - b[1].y);
    for (const [id, v] of list) {
      drawSprite(ctx, v.look, v.x, v.y, t, { dir: v.dir, fps: 8, phase: id, frame: v.moving ? null : 0, bob: 0.012, scale: PERSON_SCALE });
    }
    for (const [id, v] of list) {
      const c = this.cafe.customers.find((x) => x.id === id);
      if (!c || v.moving || v.leaving) continue;
      if (c.state === 'seated') this.orderBubble(ctx, v, c, t);
      else this.waitBubble(ctx, v, c, t);
    }
    for (const p of this.pops) {
      ctx.globalAlpha = clamp(p.life * 1.6, 0, 1);
      label(ctx, p.text, p.x, p.y - (1 - p.life) * 70, { font: '700 36px sans-serif', fill: '#fff3a0', lw: 6 });
    }
    ctx.globalAlpha = 1;
  }

  orderBubble(ctx, v, c, t) {
    const order = this.cafe.orderOf(c);
    if (!order) return;
    const def = this.game.productsDef[order.product], inStock = this.game.products[order.product] >= 1;
    const w = 112, h = 64, x = v.x - w / 2, y = v.y - BODY_H - h - 18, pulse = inStock ? 1 + Math.sin(t * 5) * 0.03 : 1;
    ctx.save(); ctx.translate(v.x, y + h); ctx.scale(pulse, pulse); ctx.translate(-v.x, -(y + h));
    poly(ctx, [[v.x - 9, y + h - 1], [v.x + 9, y + h - 1], [v.x, y + h + 13]]); paint(ctx, '#fffaf0', 3, inStock ? '#3fa63a' : '#d9665a');
    rrect(ctx, x, y, w, h, 16); paint(ctx, '#fffaf0', 4, inStock ? '#3fa63a' : '#d9665a');
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(v.x - 8, y + h - 5, 16, 6);
    ctx.font = '36px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000'; ctx.fillText(def.icon, x + 30, y + 30);
    label(ctx, `${order.price}`, x + 80, y + 28, { font: '700 24px "Trebuchet MS", sans-serif', fill: '#6a3a14', lw: 0 });
    // patience bar
    const f = this.cafe.patienceFraction(c);
    rrect(ctx, x + 12, y + h - 16, w - 24, 8, 4); paint(ctx, '#d8cbb0', 1.5, '#8a6a4a');
    ctx.save(); rrect(ctx, x + 13, y + h - 15, w - 26, 6, 3); ctx.clip();
    ctx.fillStyle = f > 0.5 ? '#5cc03a' : f > 0.25 ? '#f2b21b' : '#e8473d'; ctx.fillRect(x + 13, y + h - 15, (w - 26) * f, 6);
    ctx.restore();
    if (!inStock) label(ctx, 'stok yok', v.x, y - 10, { font: '700 17px sans-serif', fill: '#ffd0c8', lw: 4 });
    ctx.restore();
  }

  waitBubble(ctx, v, c, t) {
    const y = v.y - BODY_H - 16, f = this.cafe.patienceFraction(c);
    label(ctx, '⏳', v.x, y, { font: '28px "Segoe UI Emoji","Apple Color Emoji",sans-serif', fill: '#000', lw: 0 });
    rrect(ctx, v.x - 26, y + 16, 52, 7, 3.5); paint(ctx, '#d8cbb0', 1.5, '#8a6a4a');
    ctx.fillStyle = f > 0.5 ? '#5cc03a' : f > 0.25 ? '#f2b21b' : '#e8473d'; ctx.fillRect(v.x - 25, y + 17, 50 * f, 5);
  }
}
