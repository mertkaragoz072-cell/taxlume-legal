// Visual side of the customers: walking in, queueing, standing at a table, order bubbles and leaving.
// Logic lives in game/customers.js; this layer only follows it (placeholder characters = the walk-cycle sprites).
import { chairSpot, QUEUE_SPOTS, SERVICE_LINE_Y, LEAVE_LINE_Y, PERSON_SCALE, PERSON_H, AREAS, depthOf, depthScale, sitFeetY, sitCutY, seatRect } from './interior-layout.js';
import { drawSprite } from '../characters/sprites.js';
import { getImage } from '../assets.js';
import { INK, rrect, poly, paint, label, clamp } from '../util.js';
import { PAL } from '../palette.js';
import { drawIcon } from '../assets.js';

// guests come in from the bottom edge of the screen (the street side, behind the navigation bar) and leave the same way; `entryY` follows the screen height
const ENTRY = { x: 450, y: 1580 };
const EXIT = { x: 395, y: 1580, exit: true };    // arriving and leaving guests use different columns (arrivals x 450 / table gaps, leavers x 395 / 62 px further into the aisle), so nobody walks head-on
const SPEED = 210;                 // design px per second
const BODY_H = PERSON_H;           // approximate sprite height at the interior scale (for bubbles and hit-testing)

/** Where guests appear and disappear: just below the bottom edge of what is visible (taller phones show more floor). */
export function setEntryY(y) { ENTRY.y = y; EXIT.y = y; }

export class CustomerLayer {
  constructor(game, cafe) {
    this.game = game;
    this.cafe = cafe;
    this.v = new Map();            // customer id -> visual { x, y, dir, moving, leaving, look }
    this.pops = [];
    this.warp = (y) => 0;           // set by the scene: how much lower things at logic y are drawn on tall screens
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
      this.v.set(c.id, { id: c.id, x: t.x, y: t.y, dir: c.state === 'seated' ? -(t.side ?? -1) : -1, moving: false, leaving: false, look: c.look, via: t.via ?? null, chairY: t.via != null ? t.y : null, side: t.side ?? null, pause: false, sit: c.state === 'seated' ? 1 : 0 });
    }
  }

  update(dt) {
    const live = new Set();
    for (const c of this.cafe.customers) {
      live.add(c.id);
      let v = this.v.get(c.id);
      if (!v) { v = { id: c.id, x: ENTRY.x, y: ENTRY.y, dir: -1, moving: true, leaving: false, look: c.look, via: null, pause: false, sit: 0 }; this.v.set(c.id, v); }
      const goal = this.targetFor(c);
      v.via = goal.via ?? null;
      this.step(v, goal, dt, c.id);
      if (!v.moving) v.back = false;
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
    if (goal.via != null) {                                       // going to a chair: from the entrance sideways to the gap, up the gap, slide into the chair
      const inGap = Math.abs(v.x - goal.via) <= 8, atRow = Math.abs(v.y - goal.y) <= 4;
      if (atRow) to = { x: goal.x, y: goal.y };
      else if (inGap) to = { x: goal.via, y: goal.y };
      else if (v.y > goal.y + 4 && v.y > LEAVE_LINE_Y + 40) to = { x: goal.via, y: v.y };     // still below the dining area: across to the gap first
      else to = onLane ? { x: goal.via, y: v.y } : { x: v.x, y: LANE };
    } else if (v.chairY != null && goal.exit && Math.abs(v.y - v.chairY) < 6 && v.via != null && Math.abs(v.x - (v.via + (v.side ?? 0) * 62)) > 8) {
      to = { x: v.via + (v.side ?? 0) * 62, y: v.y };             // leaving a chair: slide out into the gap, a little further into the aisle than arriving guests use (they walk the other way)
    } else if (goal.exit && v.y > LEAVE_LINE_Y + 30) {
      to = Math.abs(v.y - goal.y) > 4 ? { x: v.x, y: goal.y } : goal;      // down the gap to the bottom edge, then along it to the exit
    } else if (Math.abs(goal.x - v.x) > 8) {
      to = onLane ? { x: goal.x, y: v.y } : { x: v.x, y: LANE };  // up/down to the lane, then along it
    }
    const dx = to.x - v.x, dy = to.y - v.y, d = Math.hypot(dx, dy);
    if (d < 2) { v.x = to.x; v.y = to.y; v.moving = Math.hypot(goal.x - v.x, goal.y - v.y) > 2; v.pause = false; if (!v.moving) { v.via = goal.via ?? null; v.chairY = goal.via != null ? goal.y : null; v.side = goal.side ?? null; } return; }
    // nobody walks into another guest: wait while someone is where we are about to step. If two wait for each other, the one that has
    // waited longest (over 1.2 s) goes first, so the lanes can never lock up.
    v.pause = false;
    const k = Math.min(d, 40) / d, nx = v.x + dx * k, ny = v.y + dy * k;         // a short look ahead along the path
    if ((v.waited ?? 0) < 1.2) {
      const staff = this.extra?.() ?? [];
      for (const o of [...this.v.values(), ...staff]) {
        if (o === v) continue;
        if (Math.abs(o.x - nx) < 56 && Math.abs(o.y - ny) < (staff.includes(o) ? 40 : 30)) {
          const after = Math.hypot(o.x - nx, o.y - ny), now = Math.hypot(o.x - v.x, o.y - v.y);
          if (after < now - 1e-6 || (Math.abs(after - now) < 1e-6 && id > (o.id ?? -1))) { v.pause = true; break; }     // closing in (or side by side: the higher id waits)
        }
      }
    }
    v.waited = v.pause ? (v.waited ?? 0) + dt : (v.waited > 0 && v.waited < 1.2 ? 0 : (v.waited ?? 0) > 1.2 ? Math.max(0, (v.waited ?? 0) - dt * 2) : 0);
    if (v.pause) { v.moving = true; return; }
    const s = Math.min(d, SPEED * dt);
    v.x += (dx / d) * s; v.y += (dy / d) * s; v.moving = true;
    if (Math.abs(dx) > 1) v.dir = dx > 0 ? 1 : -1;
    v.back = dy < 0 && Math.abs(dy) > Math.abs(dx) * 0.6;
    v.horiz = Math.abs(dx) >= Math.abs(dy) * 0.6;   // mostly sideways: the side-walk frames (when the cat has them)
  }

  /** 'customer:<id>' when the point is on a seated customer or their order bubble. */
  hitTest(x, y) {
    for (const c of this.cafe.customers) {
      if (c.state !== 'seated') continue;
      const v = this.v.get(c.id);
      if (!v || v.moving) continue;
      const art = this.seatArt(v, c), A = art ? AREAS.find((q) => q.id === `table${c.table + 1}`) : null;
      if (art && A) { const r = seatRect(A, art); if (x > r.x && x < r.x + r.w && y > r.y - 50 && y < r.y + r.h) return `customer:${c.id}`; continue; }
      const vy = this.drawY(v, c); if (Math.abs(x - v.x) < 66 && y > vy - BODY_H - 70 && y < vy + 6) return `customer:${c.id}`;
    }
    return null;
  }

  /** True while the guest sits in the chair (not walking, not yet leaving): drawn from the waist up, behind the table's front edge. */
  isSitting(v, c) { return !!c && c.state === 'seated' && !v.moving && !v.leaving; }

  /** The y of the guest's head top, where the order bubble stands. */
  bubbleTop(v, c) {
    const art = this.seatArt(v, c), A = art ? AREAS.find((q) => q.id === `table${c.table + 1}`) : null;
    if (art && A && v.sit > 0.5) return seatRect(A, art).y - 2;
    return this.drawY(v, c) - BODY_H;
  }

  /** Where the guest's feet are drawn: lowered onto the chair while seated (eased), otherwise where they walk. */
  /** The picture of this guest seated at a table (chair + guest + table), when it exists. */
  seatArt(v, c) { return c && c.table != null ? getImage(`seat-${v.look}`) : null; }

  drawY(v, c) { return c && c.table != null && v.sit > 0 && !this.seatArt(v, c) ? v.y + (sitFeetY(c.table) - v.y) * v.sit : v.y; }

  /** Depth-sorted pieces for the scene: one { y, draw } per guest (the scene sorts them with the furniture). */
  items(t) {
    const out = [];
    for (const [id, v] of this.v) {
      const c = this.cafe.customers.find((x) => x.id === id);
      const table = c && c.state === 'seated' && v.sit > 0 ? AREAS.find((a) => a.id === `table${c.table + 1}`) : null;
      out.push({
        y: table ? depthOf(table) + 1 : v.y,
        draw: (ctx) => {
          ctx.globalAlpha = clamp((EXIT.y - v.y) / 60, 0, 1);       // fades in and out at the bottom edge
          const y = this.drawY(v, c), art = table && this.seatArt(v, c), seated = table && v.sit >= 0.999 && !art;
          if (art) { if (v.sit >= 0.999) { ctx.globalAlpha = 1; return; } ctx.globalAlpha *= 1 - v.sit; }       // the seated picture (drawn with the table) takes over
          if (seated) { ctx.save(); ctx.beginPath(); ctx.rect(v.x - 160, y - 420, 320, sitCutY(c.table) - (y - 420)); ctx.clip(); }
          const hold = v.moving && !v.pause;
          drawSprite(ctx, v.look, v.x, y, t, { dir: v.dir, back: !!v.back && hold, side: !!v.horiz && hold, fps: 8, phase: id, frame: hold ? null : 0, bob: seated ? 0.006 : 0.012, scale: PERSON_SCALE * depthScale(y), shade: !seated });
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
      const table = c.state === 'seated' && c.table != null ? AREAS.find((a) => a.id === `table${c.table + 1}`) : null;
      ctx.save(); ctx.translate(0, this.warp(table ? depthOf(table) + 1 : v.y));
      if (c.state === 'seated') this.orderBubble(ctx, v, c, t);
      else this.waitBubble(ctx, v, c, t);
      ctx.restore();
    }
    for (const p of this.pops) {
      ctx.globalAlpha = clamp(p.life * 1.6, 0, 1);
      const py = p.y - (1 - p.life) * 70 + this.warp(p.y + BODY_H);
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
    const w = 92, h = 52, x = v.x - w / 2, top = this.bubbleTop(v, c), y = top - h - 10, pulse = inStock ? 1 + Math.sin(t * 5) * 0.03 : 1;
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
    drawIcon(ctx, 'o-waiting', v.x, y, 30);
    rrect(ctx, v.x - 26, y + 16, 52, 7, 3.5); paint(ctx, PAL.vanilla, 1.5, PAL.honeyDark);
    ctx.fillStyle = f > 0.5 ? PAL.green : f > 0.25 ? PAL.honey : PAL.terracottaLight; ctx.fillRect(v.x - 25, y + 17, 50 * f, 5);
  }
}
