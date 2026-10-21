// Visual side of the customers: walking in, queueing, standing at a table, order bubbles and leaving.
// Logic lives in game/customers.js; this layer only follows it (placeholder characters = the walk-cycle sprites).
import { chairSpot, QUEUE_SPOTS, SERVICE_LINE_Y, PERSON_SCALE, PERSON_H, SEAT_CUT, AREAS, depthOf } from './interior-layout.js';
import { drawSprite } from '../characters/sprites.js';
import { INK, rrect, poly, paint, label, clamp } from '../util.js';
import { PAL } from '../palette.js';
import { drawIcon } from '../assets.js';

const ENTRY = { x: 1470, y: 440 };                      // the green door at the right end of the back wall (see InteriorScene.wallDecor): guests step out of it and leave through it
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
        this.pops.push({ x: v?.x ?? 700, y: (v?.y ?? 700) - BODY_H - 30, text: `+${e.income}`, life: 1 });
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
      this.v.set(c.id, { x: t.x, y: t.y, dir: c.state === 'seated' ? 1 : -1, moving: false, leaving: false, look: c.look, via: t.via ?? null });
    }
  }

  update(dt) {
    const live = new Set();
    for (const c of this.cafe.customers) {
      live.add(c.id);
      let v = this.v.get(c.id);
      if (!v) { v = { x: ENTRY.x, y: ENTRY.y, dir: -1, moving: true, leaving: false, look: c.look }; this.v.set(c.id, v); }
      const goal = this.targetFor(c);
      v.via = goal.via ?? null;
      this.step(v, goal, dt);
      if (!v.moving && c.state === 'seated') v.dir = 1;   // once in the chair, face the table
    }
    for (const [id, v] of this.v) {
      if (live.has(id)) continue;
      v.leaving = true;                                          // logic removed them: walk out through the entrance
      this.step(v, ENTRY, dt);
      if (!v.moving) this.v.delete(id);
    }
    for (const p of this.pops) p.life -= dt * 0.8;
    this.pops = this.pops.filter((p) => p.life > 0);
  }

  /**
   * Guests walk along the open service line and only turn into a table gap once they are level with it, so they never cut across
   * tables, counters or each other (leaving works the same way in reverse).
   */
  step(v, goal, dt) {
    let to = goal;
    const lane = Math.abs(v.y - SERVICE_LINE_Y) <= 4;
    if (goal.via != null) {                                       // going to a chair: lane -> table gap -> down the gap -> slide into the chair
      const inGap = Math.abs(v.x - goal.via) <= 8, atRow = Math.abs(v.y - goal.y) <= 4;
      if (atRow) to = { x: goal.x, y: goal.y };
      else if (inGap) to = { x: goal.via, y: goal.y };
      else to = lane ? { x: goal.via, y: v.y } : { x: v.x, y: SERVICE_LINE_Y };
    } else if (v.via != null && v.y > SERVICE_LINE_Y + 30 && Math.abs(v.x - v.via) > 8) {
      to = { x: v.via, y: v.y };                                  // leaving a chair: slide back out into the gap first
    } else if (Math.abs(goal.x - v.x) > 8) {
      to = lane ? { x: goal.x, y: v.y } : { x: v.x, y: SERVICE_LINE_Y };
    }
    const dx = to.x - v.x, dy = to.y - v.y, d = Math.hypot(dx, dy);
    if (d < 2) { v.x = to.x; v.y = to.y; v.moving = Math.hypot(goal.x - v.x, goal.y - v.y) > 2; if (!v.moving) v.via = goal.via ?? null; return; }
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

  /** True while the guest sits in the chair (not walking, not yet leaving): drawn from the waist up, behind the table's front edge. */
  isSitting(v, c) { return !!c && c.state === 'seated' && !v.moving && !v.leaving; }

  /** Depth-sorted pieces for the scene: one { y, draw } per guest (the scene sorts them with the furniture). */
  items(t) {
    const out = [];
    for (const [id, v] of this.v) {
      const c = this.cafe.customers.find((x) => x.id === id), sit = this.isSitting(v, c);
      const table = sit ? AREAS.find((a) => a.id === `table${c.table + 1}`) : null;
      out.push({
        y: table ? depthOf(table) + 1 : v.y,
        draw: (ctx) => {
          ctx.globalAlpha = clamp((v.y - ENTRY.y) / 45, 0, 1);       // fades in and out at the door
          if (sit) { ctx.save(); ctx.beginPath(); ctx.rect(v.x - 150, v.y - 400, 300, 400 - SEAT_CUT); ctx.clip(); }
          drawSprite(ctx, v.look, v.x, v.y, t, { dir: v.dir, fps: 8, phase: id, frame: v.moving ? null : 0, bob: 0.012, scale: PERSON_SCALE });
          if (sit) ctx.restore();
          ctx.globalAlpha = 1;
        },
      });
    }
    return out;
  }

  /** Order / waiting bubbles and the "+N" pops: drawn last so nothing covers them. */
  drawBubbles(ctx, t) {
    const list = [...this.v.entries()];
    for (const [id, v] of list) {
      const c = this.cafe.customers.find((x) => x.id === id);
      if (!c || v.moving || v.leaving) continue;
      if (c.state === 'seated') this.orderBubble(ctx, v, c, t);
      else this.waitBubble(ctx, v, c, t);
    }
    for (const p of this.pops) {
      ctx.globalAlpha = clamp(p.life * 1.6, 0, 1);
      const py = p.y - (1 - p.life) * 70;
      label(ctx, p.text, p.x - 14, py, { font: '700 36px sans-serif', fill: PAL.vanilla, lw: 6 });
      ctx.font = '700 36px sans-serif';
      drawIcon(ctx, 'coin', p.x - 14 + ctx.measureText(p.text).width / 2 + 24, py, 36);
    }
    ctx.globalAlpha = 1;
  }

  orderBubble(ctx, v, c, t) {
    const order = this.cafe.orderOf(c);
    if (!order) return;
    const def = this.game.productsDef[order.product], inStock = this.game.products[order.product] >= 1;
    const w = 112, h = 64, x = v.x - w / 2, y = v.y - BODY_H - h - 18, pulse = inStock ? 1 + Math.sin(t * 5) * 0.03 : 1;
    ctx.save(); ctx.translate(v.x, y + h); ctx.scale(pulse, pulse); ctx.translate(-v.x, -(y + h));
    poly(ctx, [[v.x - 9, y + h - 1], [v.x + 9, y + h - 1], [v.x, y + h + 13]]); paint(ctx, PAL.paper, 3, inStock ? PAL.green : PAL.terracottaLight);
    rrect(ctx, x, y, w, h, 16); paint(ctx, PAL.paper, 4, inStock ? PAL.green : PAL.terracottaLight);
    ctx.fillStyle = PAL.paper; ctx.fillRect(v.x - 8, y + h - 5, 16, 6);
    ctx.font = '36px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (!drawIcon(ctx, order.product, x + 30, y + 30, 46)) { ctx.fillStyle = PAL.brownDark; ctx.fillText(def.icon, x + 30, y + 30); }
    label(ctx, `${order.price}`, x + 80, y + 28, { font: '700 24px "Trebuchet MS", sans-serif', fill: PAL.brownDark, lw: 0 });
    // patience bar
    const f = this.cafe.patienceFraction(c);
    rrect(ctx, x + 12, y + h - 16, w - 24, 8, 4); paint(ctx, PAL.vanilla, 1.5, PAL.honeyDark);
    ctx.save(); rrect(ctx, x + 13, y + h - 15, w - 26, 6, 3); ctx.clip();
    ctx.fillStyle = f > 0.5 ? PAL.green : f > 0.25 ? PAL.honey : PAL.terracottaLight; ctx.fillRect(x + 13, y + h - 15, (w - 26) * f, 6);
    ctx.restore();
    if (!inStock) label(ctx, 'stok yok', v.x, y - 10, { font: '700 17px sans-serif', fill: PAL.terracottaPale, lw: 4 });
    ctx.restore();
  }

  waitBubble(ctx, v, c, t) {
    const y = v.y - BODY_H - 16, f = this.cafe.patienceFraction(c);
    label(ctx, '⏳', v.x, y, { font: '28px "Segoe UI Emoji","Apple Color Emoji",sans-serif', fill: PAL.brownDark, lw: 0 });
    rrect(ctx, v.x - 26, y + 16, 52, 7, 3.5); paint(ctx, PAL.vanilla, 1.5, PAL.honeyDark);
    ctx.fillStyle = f > 0.5 ? PAL.green : f > 0.25 ? PAL.honey : PAL.terracottaLight; ctx.fillRect(v.x - 25, y + 17, 50 * f, 5);
  }
}
