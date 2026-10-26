// Visual side of the customers: walking in, queueing, standing at a table, order bubbles and leaving.
// Logic lives in game/customers.js; this layer only follows it (placeholder characters = the walk-cycle sprites).
import { chairSpot, QUEUE_SPOTS, SERVICE_LINE_Y, LEAVE_LINE_Y, PERSON_SCALE, PERSON_H, AREAS, depthOf, depthScale, sitFeetY, sitCutY, seatRect } from './interior-layout.js';
import { drawSprite, hasSitFrames } from '../characters/sprites.js';
import { getImage } from '../assets.js';
import { INK, rrect, poly, paint, label, clamp, glowAt } from '../util.js';
import { PAL } from '../palette.js';
import { drawIcon } from '../assets.js';

// guests come in from the bottom edge of the screen (the street side, behind the navigation bar) and leave the same way; `entryY` follows the screen height
const ENTRY = { x: 450, y: 1580 };
const EXIT = { x: 395, y: 1580, exit: true };    // arriving and leaving guests use different columns (arrivals x 450 / table gaps, leavers x 395 / 60 px further into the aisle), so nobody walks head-on
const SPEED = 210;                 // design px per second
const COIN_FLIGHT_SEC = 0.5;     // a coin's flight from the guest to the register
const BODY_H = PERSON_H;           // approximate sprite height at scale 1 (the first table row) for bubbles and hit-testing; `bodyH(y)` follows the perspective
const bodyH = (y) => BODY_H * depthScale(y);

/** Where guests appear and disappear: just below the bottom edge of what is visible (taller phones show more floor). */
export function setEntryY(y) { ENTRY.y = y; EXIT.y = y; }

export class CustomerLayer {
  constructor(game, cafe) {
    this.game = game;
    this.cafe = cafe;
    this.v = new Map();            // customer id -> visual { x, y, dir, moving, leaving, look }
    this.pops = [];
    this.warp = (y) => 0;           // set by the scene: how much lower things at logic y are drawn on tall screens
    this.settled = () => true;      // (id) -> true once the guest sits in the chair; the waiter only brings an order to a seated guest
    this.extra = null;             // other walkers to avoid (the waiter), set by the scene
    this.coins = [];               // coins flying from a paying guest to the register: { x0, y0, x1, y1, t, delay, income, last }
    this.register = { x: 422, y: 620 };   // set by the scene: where the coins land (the showcase's counter top)
    this.onRegister = null;        // set by the scene: called when a coin lands (the till bounces and glitters)
    this.bubbleScale = 1;          // set by the scene: bubbles grow a little on small screens (zoomed out) so the icon and price stay readable
    game.on('customer', (e) => {
      if (e.type === 'leave' && e.income) {
        const v = this.v.get(e.id);
        if (v && e.eatSec > 0 && e.table != null) { v.ghost = { id: e.id, state: 'seated', table: e.table, orderId: null }; v.linger = e.eatSec; v.payout = e.income; }   // paid: the guest stays in the chair and eats before leaving; the coins go to the register when they get up
        else if (v) this.pay(v, e.income);
        else this.pops.push({ x: 700, y: 640, text: `+${e.income}`, life: 1 });
      } else if (e.type === 'tableFree') {                         // the logic frees the table on the clock: a guest who is (on a slow device) still eating gets up now
        for (const v of this.v.values()) if (v.ghost && v.table === e.table && v.linger > 0) v.linger = 0;
      }
    });
  }

  /** Placeholder for a paying-at-the-register animation: three coins fly from the guest to the till, which bounces and shows the amount. */
  pay(v, income) {
    v.payout = 0;
    const ghost = v.ghost ?? { state: 'seated', table: v.table };
    const x0 = v.table != null ? this.bodyX(v, ghost) : v.x, y0 = (v.table != null ? this.drawY(v, ghost) : v.y) - bodyH(v.y) * 0.25 + this.warp(v.y);
    const r = this.register;
    for (let i = 0; i < 3; i++) this.coins.push({ x0, y0, x1: r.x + (i - 1) * 14, y1: r.y + this.warp(r.y), t: 0, delay: i * 0.13, income, last: i === 2 });
  }

  /** The guest drawn at a table: the logic's seated customer, or the one who has paid and is still finishing the meal (until they have stood up). */
  ownerAt(i) {
    const c = this.cafe.tableOwner(i); if (c) return c;
    for (const v of this.v.values()) if (v.ghost && v.table === i && v.sit > 0) return v.ghost;
    return null;
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
      if (c.state === 'seated') v.table = c.table;
      if (!v.moving && c.state === 'seated') v.dir = -(goal.side ?? -1);   // once in the chair, face the table
    }
    for (const [id, v] of this.v) {
      if (live.has(id)) continue;
      if (v.linger > 0 && v.ghost) { v.linger -= dt; v.moving = false; if (v.linger > 0) continue; }          // the logic has paid and removed them, they finish eating first
      if (v.payout) this.pay(v, v.payout);                       // done eating: the coins go to the register
      if (!v.ghost && v.sit > 0 && v.table != null) v.ghost = { id, state: 'seated', table: v.table, orderId: null };   // gave up while seated: still stands up out of the chair smoothly
      v.leaving = true;                                          // logic removed them: walk out through the entrance
      if (!v.ghost || v.sit < 1) this.step(v, EXIT, dt, id);       // (a guest who is still in the chair first stands up, then walks)
      if (v.ghost && v.sit <= 0) v.ghost = null;
      if (!v.moving && !v.ghost) this.v.delete(id);
    }
    for (const c of this.coins) {                                   // coins in flight; the last one to land shows the amount
      c.t += dt;
      if (c.t - c.delay >= COIN_FLIGHT_SEC) { c.landed = true; this.onRegister?.(c); if (c.last) this.pops.push({ x: c.x1, y: this.register.y - 30, text: `+${c.income}`, life: 1 }); }
    }
    this.coins = this.coins.filter((c) => !c.landed);
    for (const p of this.pops) p.life -= dt * 0.8;
    this.pops = this.pops.filter((p) => p.life > 0);
    for (const [id, v] of this.v) {                                 // lower into / rise out of the chair
      const c = this.cafe.customers.find((x) => x.id === id) ?? v.ghost;
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
    } else if (v.chairY != null && goal.exit && Math.abs(v.y - v.chairY) < 6 && v.via != null && Math.abs(v.x - (v.via + (v.side ?? 0) * 60)) > 8) {
      to = { x: v.via + (v.side ?? 0) * 60, y: v.y };             // leaving a chair: slide out into the gap, a little further into the aisle than arriving guests use (they walk the other way)
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
      const vy = this.drawY(v, c); if (Math.abs(x - this.bodyX(v, c)) < 66 && y > vy - bodyH(vy) - 70 && y < vy + 6) return `customer:${c.id}`;
    }
    return null;
  }

  /** True while the guest sits in the chair (not walking, not yet leaving): drawn from the waist up, behind the table's front edge. */
  isSitting(v, c) { return !!c && c.state === 'seated' && !v.moving && !v.leaving; }

  /** The x the guest is drawn at: a seated cat with sitting frames sits behind the middle of its table, not at the chair spot the logic walks it to. */
  bodyX(v, c) { return c && c.table != null && c.state === 'seated' && v.sit > 0.5 && !this.seatArt(v, c) && hasSitFrames(v.look) ? this.sitPos(v, c).x : v.x; }

  /** The y of the guest's head top, where the order bubble stands. */
  bubbleTop(v, c) {
    const art = this.seatArt(v, c), A = art ? AREAS.find((q) => q.id === `table${c.table + 1}`) : null;
    if (art && A && v.sit > 0.5) return seatRect(A, art).y - 2;
    if (hasSitFrames(v.look) && c && c.table != null) { const a = AREAS.find((q) => q.id === `table${c.table + 1}`); return this.drawY(v, c) - BODY_H * 0.45 * depthScale(a.y + a.h); }      // (a sitting cat is about 0.45 of a standing one's height here: the bubble sits just over its head, hat included)
    return this.drawY(v, c) - bodyH(v.y);
  }

  /** Where the guest's feet are drawn: lowered onto the chair while seated (eased), otherwise where they walk. */
  /** The picture of this guest seated at a table (chair + guest + table), when it exists. */
  seatArt(v, c) { return c && c.table != null ? getImage(`seat-${v.look}`) : null; }

  /** Cats with sitting frames sit behind the middle of their table (the table covers their lower body): where their seat is drawn. */
  sitPos(v, c) {
    const a = AREAS.find((q) => q.id === `table${c.table + 1}`), e = v.sit * v.sit * (3 - 2 * v.sit);
    const tx = a.x + a.w / 2, ty = a.y + a.h - 0.55 * a.w;
    return { x: v.x + (tx - v.x) * e, y: v.y + (ty - v.y) * e };
  }

  drawY(v, c) { return c && c.table != null && v.sit > 0 && !this.seatArt(v, c) && hasSitFrames(v.look) ? this.sitPos(v, c).y : c && c.table != null && v.sit > 0 && !this.seatArt(v, c) ? v.y + (sitFeetY(c.table) - 62 - v.y) * v.sit : v.y; }     // a cat sits whole: feet just below the cushion, nothing is cut off

  /** Stand-in for an impatient face: a guest whose patience is nearly gone trembles (sideways, faster the less is left). */
  shake(v, c, t) {
    if (!c || v.ghost || v.moving || v.leaving) return 0;
    const f = this.cafe.patienceFraction(c);
    return f >= 0.3 ? 0 : Math.sin(t * 32 + v.id * 2) * (1.2 + 2.2 * (1 - f / 0.3));
  }

  shaken(ctx, dx, fn) { if (!dx) return fn(ctx); ctx.save(); ctx.translate(dx, 0); fn(ctx); ctx.restore(); }

  /** Depth-sorted pieces for the scene: one { y, draw } per guest (the scene sorts them with the furniture). */
  items(t) {
    const out = [];
    for (const [id, v] of this.v) {
      const c = this.cafe.customers.find((x) => x.id === id) ?? v.ghost;
      const table = c && c.state === 'seated' && v.sit > 0 ? AREAS.find((a) => a.id === `table${c.table + 1}`) : null;
      out.push({
        y: table ? depthOf(table) + (hasSitFrames(v.look) ? -2 : 1) : v.y,
        draw: (ctx0) => this.shaken(ctx0, this.shake(v, c, t), (ctx) => {
          if (c?.vip && !v.leaving) {                                // a VIP guest stands in a soft golden light
            const gx = this.bodyX(v, c), gy = this.drawY(v, c);
            ctx.globalCompositeOperation = 'lighter'; glowAt(ctx, gx, gy - bodyH(gy) * 0.4, 120, '255,212,96', 0.26 + 0.06 * Math.sin(t * 3 + v.id)); ctx.globalCompositeOperation = 'source-over';
          }
          ctx.globalAlpha = clamp((EXIT.y - v.y) / 60, 0, 1);       // fades in and out at the bottom edge
          const y = this.drawY(v, c), art = table && this.seatArt(v, c), seated = table && v.sit >= 0.999 && !art;
          if (art) { if (v.sit >= 0.999) { ctx.globalAlpha = 1; return; } ctx.globalAlpha *= 1 - v.sit; }       // the seated picture (drawn with the table) takes over
          const hold = v.moving && !v.pause;
          if (table && hasSitFrames(v.look)) {                      // sitting behind the table: eats once the order is on the table (paid), otherwise waits
            const p = this.sitPos(v, c), settled = v.sit >= 0.999, e = v.sit * v.sit * (3 - 2 * v.sit), sc = PERSON_SCALE * 0.72 * depthScale(table.y + table.h), keep = ctx.globalAlpha;
            if (!settled) {                                         // sitting down / standing up: the walking pose and the seated pose cross-fade (no pop between poses)
              ctx.globalAlpha = keep * (1 - e);
              drawSprite(ctx, v.look, p.x, p.y, t, { dir: v.dir, back: false, side: !!v.horiz, fps: 8, phase: id, frame: null, scale: sc, shade: false });
            }
            ctx.globalAlpha = keep * (settled ? 1 : e);
            drawSprite(ctx, v.look, p.x, p.y, t, { dir: 1, sit: v.ghost && !v.leaving ? 'eat' : 'wait', frame: 0, back: false, fps: 8, phase: id, scale: sc, shade: false });
            ctx.globalAlpha = 1; return;
          }
          drawSprite(ctx, v.look, v.x, y, t, { dir: seated ? 1 : v.dir, back: !!v.back && hold, side: !!v.horiz && hold, fps: 8, phase: id, frame: hold ? null : 0, bob: seated ? 0.006 : 0.012, scale: PERSON_SCALE * depthScale(y), shade: !seated });
          ctx.globalAlpha = 1;
        }),
      });
    }
    return out;
  }

  /** Order / waiting bubbles and the "+N" pops: drawn last so nothing covers them. */
  drawBubbles(ctx, t) {
    const list = [...this.v.entries()];
    for (const [id, v] of list) {
      const c = this.cafe.customers.find((x) => x.id === id);
      if (!c || v.ghost || v.moving || v.leaving) continue;
      const table = c.state === 'seated' && c.table != null ? AREAS.find((a) => a.id === `table${c.table + 1}`) : null;
      ctx.save(); ctx.translate(0, this.warp(table ? depthOf(table) + 1 : v.y));
      const bx = this.bodyX(v, c), w = bx === v.x ? v : { ...v, x: bx };                                      // a cat sitting behind its table: the bubble stands over the cat, not over the chair spot
      const k = this.bubbleScale, ay = c.state === 'seated' ? this.bubbleTop(w, c) : v.y - bodyH(v.y);      // grown about the point on the guest's head, so it still points at them
      if (k !== 1) { ctx.translate(w.x, ay); ctx.scale(k, k); ctx.translate(-w.x, -ay); }
      if (c.state === 'seated') this.orderBubble(ctx, w, c, t);
      else this.waitBubble(ctx, v, c, t);
      if (c.vip) this.crown(ctx, w.x + (c.state === 'seated' ? 38 : 22), ay - (c.state === 'seated' ? 66 : 50), t);
      ctx.restore();
    }
    for (const c of this.coins) {
      const k = (c.t - c.delay) / COIN_FLIGHT_SEC; if (k <= 0) continue;
      const e = k * k * (3 - 2 * k);
      ctx.globalAlpha = 1;
      drawIcon(ctx, 'coin', c.x0 + (c.x1 - c.x0) * e, c.y0 + (c.y1 - c.y0) * e - Math.sin(k * Math.PI) * 110, 40 - 10 * k);      // an arc over the floor
    }
    for (const p of this.pops) {
      ctx.globalAlpha = clamp(p.life * 1.6, 0, 1);
      const py = p.y - (1 - p.life) * 70 + this.warp(p.y + bodyH(p.y));
      label(ctx, p.text, p.x - 14, py, { font: '700 36px sans-serif', fill: PAL.vanilla, lw: 6 });
      ctx.font = '700 36px sans-serif';
      drawIcon(ctx, 'coin', p.x - 14 + ctx.measureText(p.text).width / 2 + 24, py, 36);
    }
    ctx.globalAlpha = 1;
  }

  /** A little gold crown marking a VIP guest. */
  crown(ctx, x, y, t) {
    const b = Math.sin(t * 4) * 1.5;
    ctx.save(); ctx.translate(x, y + b); ctx.rotate(0.15);
    ctx.beginPath(); ctx.moveTo(-14, 10); ctx.lineTo(-16, -8); ctx.lineTo(-7, 0); ctx.lineTo(0, -12); ctx.lineTo(7, 0); ctx.lineTo(16, -8); ctx.lineTo(14, 10); ctx.closePath();
    ctx.fillStyle = '#F4C542'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = PAL.brownDark; ctx.stroke();
    for (const [dx, dy] of [[-16, -8], [0, -12], [16, -8]]) { ctx.beginPath(); ctx.arc(dx, dy, 3, 0, 7); ctx.fillStyle = '#FFF3B0'; ctx.fill(); }
    ctx.restore();
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
    const y = v.y - bodyH(v.y) - 16, f = this.cafe.patienceFraction(c);
    drawIcon(ctx, 'o-waiting', v.x, y, 30);
    rrect(ctx, v.x - 26, y + 16, 52, 7, 3.5); paint(ctx, PAL.vanilla, 1.5, PAL.honeyDark);
    ctx.fillStyle = f > 0.5 ? PAL.green : f > 0.25 ? PAL.honey : PAL.terracottaLight; ctx.fillRect(v.x - 25, y + 17, 50 * f, 5);
  }
}
