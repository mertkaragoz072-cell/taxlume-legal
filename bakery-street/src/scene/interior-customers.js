// Visual side of the customers: walking in, queueing, standing at a table, order bubbles and leaving.
// Logic lives in game/customers.js; this layer only follows it (placeholder characters = the walk-cycle sprites).
import { chairSpot, QUEUE_SPOTS, SERVICE_LINE_Y, LEAVE_LINE_Y, PERSON_SCALE, PERSON_H, AREAS, depthOf, sitFeetY, sitCutY } from './interior-layout.js';
import { drawSprite } from '../characters/sprites.js';
import { INK, rrect, poly, paint, label, clamp } from '../util.js';
import { PAL } from '../palette.js';
import { drawIcon } from '../assets.js';

const ENTRY = { x: 1415, y: 440 };        // the way in
const EXIT = { x: 1545, y: 440 };         // the way out (the door is wide enough for two columns)
const SPEED = 210;                 // design px per second
const BODY_H = PERSON_H;           // approximate sprite height at the interior scale (for bubbles and hit-testing)

export class CustomerLayer {
  constructor(game, cafe) {
    this.game = game;
    this.cafe = cafe;
    this.v = new Map();            // customer id -> visual { x, y, dir, moving, leaving, look }
    this.pops = [];
    this.extra = null;             // other walkers to avoid (the waiter), set by the scene
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
      this.v.set(c.id, { x: t.x, y: t.y, dir: c.state === 'seated' ? -(t.side ?? -1) : -1, moving: false, leaving: false, look: c.look, via: t.via ?? null, pause: false, sit: c.state === 'seated' ? 1 : 0 });
    }
  }

  update(dt) {
    const live = new Set();
    for (const c of this.cafe.customers) {
      live.add(c.id);
      let v = this.v.get(c.id);
      if (!v) { v = { x: ENTRY.x, y: ENTRY.y, dir: -1, moving: true, leaving: false, look: c.look, via: null, pause: false, sit: 0 }; this.v.set(c.id, v); }
      const goal = this.targetFor(c);
      v.via = goal.via ?? null;
      this.step(v, goal, dt, c.id);
      if (!v.moving && c.state === 'seated') v.dir = -(goal.side ?? -1);   // once in the chair, face the table
    }
    for (const [id, v] of this.v) {
      if (live.has(id)) continue;
      v.leaving = true;                                          // logic removed them: walk out through the entrance
      this.step(v, EXIT, dt, id);
      if (!v.moving) this.v.delete(id);
    }
    for (const p of this.pops) p.life -= dt * 0.8;
    this.pops = this.pops.filter((p) => p.life > 0);
    for (const [id, v] of this.v) {                                 // lower into / rise out of the chair
      const c = this.cafe.customers.find((x) => x.id === id);
      v.sit = clamp((v.sit ?? 0) + (this.isSitting(v, c) ? dt * 3.5 : -dt * 3.5), 0, 1);
    }
  }

  /**
   * Guests walk along the open service line and only turn into a table gap once they are level with it, so they never cut across
   * tables, counters or each other (leaving works the same way in reverse).
   */
  step(v, goal, dt, id = 0) {
    const tx = goal.via ?? goal.x;
    const LANE = Math.abs(tx - v.x) <= 8 ? (v.y > (SERVICE_LINE_Y + LEAVE_LINE_Y) / 2 ? LEAVE_LINE_Y : SERVICE_LINE_Y) : tx > v.x ? LEAVE_LINE_Y : SERVICE_LINE_Y;   // two lanes, one per walking direction: left-going 575, right-going 592
    let to = goal;
    const onLane = Math.abs(v.y - LANE) <= 4;
    if (goal.via != null) {                                       // going to a chair: lane -> table gap -> down the gap -> slide into the chair
      const inGap = Math.abs(v.x - goal.via) <= 8, atRow = Math.abs(v.y - goal.y) <= 4;
      if (atRow) to = { x: goal.x, y: goal.y };
      else if (inGap) to = { x: goal.via, y: goal.y };
      else to = onLane ? { x: goal.via, y: v.y } : { x: v.x, y: LANE };
    } else if (v.via != null && v.y > LANE + 30 && Math.abs(v.x - v.via) > 8) {
      to = { x: v.via, y: v.y };                                  // leaving a chair: slide back out into the gap first
    } else if (Math.abs(goal.x - v.x) > 8) {
      to = onLane ? { x: goal.x, y: v.y } : { x: v.x, y: LANE };  // up/down to the lane, then along it
    }
    const dx = to.x - v.x, dy = to.y - v.y, d = Math.hypot(dx, dy);
    if (d < 2) { v.x = to.x; v.y = to.y; v.moving = Math.hypot(goal.x - v.x, goal.y - v.y) > 2; v.pause = false; if (!v.moving) v.via = goal.via ?? null; return; }
    // nobody walks into another guest: wait while someone is where we are about to step. If two wait for each other, the one that has
    // waited longest (over 1.2 s) goes first, so the lanes can never lock up.
    v.pause = false;
    const k = Math.min(d, 40) / d, nx = v.x + dx * k, ny = v.y + dy * k;         // a short look ahead along the path
    if ((v.waited ?? 0) < 1.2) {
      for (const o of [...this.v.values(), ...(this.extra?.() ?? [])]) {
        if (o === v) continue;
        if (Math.abs(o.x - nx) < 56 && Math.abs(o.y - ny) < 22 && Math.hypot(o.x - nx, o.y - ny) <= Math.hypot(o.x - v.x, o.y - v.y)) { v.pause = true; break; }
      }
    }
    v.waited = v.pause ? (v.waited ?? 0) + dt : (v.waited > 0 && v.waited < 1.2 ? 0 : (v.waited ?? 0) > 1.2 ? Math.max(0, (v.waited ?? 0) - dt * 2) : 0);
    if (v.pause) { v.moving = true; return; }
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
      const vy = this.drawY(v, c); if (Math.abs(x - v.x) < 66 && y > vy - BODY_H - 70 && y < vy + 6) return `customer:${c.id}`;
    }
    return null;
  }

  /** True while the guest sits in the chair (not walking, not yet leaving): drawn from the waist up, behind the table's front edge. */
  isSitting(v, c) { return !!c && c.state === 'seated' && !v.moving && !v.leaving; }

  /** Where the guest's feet are drawn: lowered onto the chair while seated (eased), otherwise where they walk. */
  drawY(v, c) { return c && c.table != null && v.sit > 0 ? v.y + (sitFeetY(c.table) - v.y) * v.sit : v.y; }

  /** Depth-sorted pieces for the scene: one { y, draw } per guest (the scene sorts them with the furniture). */
  items(t) {
    const out = [];
    for (const [id, v] of this.v) {
      const c = this.cafe.customers.find((x) => x.id === id);
      const table = c && c.state === 'seated' && v.sit > 0 ? AREAS.find((a) => a.id === `table${c.table + 1}`) : null;
      out.push({
        y: table ? depthOf(table) + 1 : v.y,
        draw: (ctx) => {
          ctx.globalAlpha = clamp((v.y - EXIT.y) / 45, 0, 1);       // fades in and out at the door
          const y = this.drawY(v, c), seated = table && v.sit >= 0.999;
          if (seated) { ctx.save(); ctx.beginPath(); ctx.rect(v.x - 160, y - 420, 320, sitCutY(c.table) - (y - 420)); ctx.clip(); }
          const hold = v.moving && !v.pause;
          drawSprite(ctx, v.look, v.x, y, t, { dir: v.dir, fps: 8, phase: id, frame: hold ? null : 0, bob: seated ? 0.006 : 0.012, scale: PERSON_SCALE, shade: !seated });
          if (seated) ctx.restore();
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
    const w = 92, h = 52, x = v.x - w / 2, top = this.drawY(v, c) - BODY_H, y = top - h - 10, pulse = inStock ? 1 + Math.sin(t * 5) * 0.03 : 1;
    const edge = inStock ? PAL.green : PAL.terracottaLight;
    ctx.save(); ctx.translate(v.x, y + h); ctx.scale(pulse, pulse); ctx.translate(-v.x, -(y + h));
    poly(ctx, [[v.x - 7, y + h - 1], [v.x + 7, y + h - 1], [v.x, y + h + 10]]); paint(ctx, PAL.paper, 3, edge);
    rrect(ctx, x, y, w, h, 14); paint(ctx, PAL.paper, 3.5, edge);
    ctx.fillStyle = PAL.paper; ctx.fillRect(v.x - 6, y + h - 4, 12, 5);
    ctx.font = '30px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha *= inStock ? 1 : 0.45;                                   // out of stock: the same bubble, faded, with a small red mark instead of the price
    if (!drawIcon(ctx, order.product, x + 27, y + 24, 38)) { ctx.fillStyle = PAL.brownDark; ctx.fillText(def.icon, x + 27, y + 24); }
    ctx.globalAlpha = Math.min(1, ctx.globalAlpha / (inStock ? 1 : 0.45));
    if (inStock) label(ctx, `${order.price}`, x + 66, y + 23, { font: '700 21px "Trebuchet MS", sans-serif', fill: PAL.brownDark, lw: 0 });
    else { ctx.beginPath(); ctx.arc(x + 66, y + 23, 11, 0, 7); paint(ctx, PAL.terracotta, 2, PAL.terracottaDark); label(ctx, '!', x + 66, y + 24, { font: '800 17px "Trebuchet MS", sans-serif', fill: PAL.paper, lw: 0 }); }
    const f = this.cafe.patienceFraction(c);                                  // patience bar
    rrect(ctx, x + 10, y + h - 13, w - 20, 7, 3.5); paint(ctx, PAL.vanilla, 1.2, PAL.honeyDark);
    ctx.save(); rrect(ctx, x + 11, y + h - 12, w - 22, 5, 2.5); ctx.clip();
    ctx.fillStyle = f > 0.5 ? PAL.green : f > 0.25 ? PAL.honey : PAL.terracottaLight; ctx.fillRect(x + 11, y + h - 12, (w - 22) * f, 5);
    ctx.restore();
    ctx.restore();
  }

  waitBubble(ctx, v, c, t) {
    const y = v.y - BODY_H - 16, f = this.cafe.patienceFraction(c);
    label(ctx, '⏳', v.x, y, { font: '28px "Segoe UI Emoji","Apple Color Emoji",sans-serif', fill: PAL.brownDark, lw: 0 });
    rrect(ctx, v.x - 26, y + 16, 52, 7, 3.5); paint(ctx, PAL.vanilla, 1.5, PAL.honeyDark);
    ctx.fillStyle = f > 0.5 ? PAL.green : f > 0.25 ? PAL.honey : PAL.terracottaLight; ctx.fillRect(v.x - 25, y + 17, 50 * f, 5);
  }
}
