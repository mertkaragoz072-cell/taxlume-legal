// Staff. The baker is purely visual (nothing saved):
//  - the baker works on the kitchen floor between the back wall and the counters (head and shoulders show above the counters). He walks to
//    whichever machine is busy, stands beside it facing it and works (kneading, putting bread in the oven, making a coffee); otherwise he
//    strolls between oven, counter, coffee machine and storage.
// The waiter runs the service. When a seated guest has an open order AND the product is in stock, he picks it up at his post, carries it down the
// corridor and the access gap beside the table and hands it over: at that moment the order is really delivered (Cafe.deliver: stock -1, gold,
// XP, order paid), the product lands on the table and the guest eats. Tapping a guest still serves at once, unless the waiter is already bringing
// that order (see claims()). No stock = the waiter does not go, the order stays open and the guest keeps waiting.
import { drawSprite, hasHandFrames, hasOvenFrames, hasCoffeeFrames } from '../characters/sprites.js';
import { drawIcon } from '../assets.js';
import { STAFF_LANE_Y, WAITER_LANE_Y, PERSON_SCALE, AREAS, chairSpot, depthScale } from './interior-layout.js';

// where the baker stands for each job (beside the machine, never in front of its opening) and which way he faces there
const STOPS = { oven: { x: 262, dir: -1 }, counter: { x: 150, dir: 1 }, counter2: { x: 422, dir: 1 }, coffee: { x: 728, dir: 1 }, storage: { x: 385, dir: 1 } };
const TOUR = ['counter', 'oven', 'counter2', 'coffee', 'storage', 'counter2'];
const POST = { x: 190, y: WAITER_LANE_Y };                 // the waiter's post: the gap between the prep counter and the showcase, in front of the prep counter, clear of the queue spots (352..652)
const CHEF_SCALE = 1.2;                                     // the baker is drawn a little larger than a guest at his depth: he is the star behind the counter
const POSE_FADE_SEC = 0.14;   // a change of pose (walking -> handing over, kneading -> oven ...) dissolves over this long instead of popping
const OVEN_SEC = 1.8;                                       // the baker's put-it-in-the-oven animation (30 frames)
const COFFEE_SEC = 2.2;                                     // the baker's make-a-coffee animation (24 frames: reach, take the cup, sip)
const HAND_SEC = 1.3;                                       // time spent handing the order over

class Walker {
  constructor(x, y, speed) { this.x = x; this.y = y; this.speed = speed; this.dir = 1; this.moving = false; this.target = null; this.wait = 1.5; this.t = 0; this.view = 'side'; }
  /** Moves toward the target point (one axis at a time is up to the route); returns true when it has just arrived. */
  step(dt, blocked = null) {
    this.t += dt;
    if (!this.target) return false;
    const dx = this.target.x - this.x, dy = this.target.y - this.y, d = Math.hypot(dx, dy);
    if (d < 3) { this.x = this.target.x; this.y = this.target.y; this.target = null; this.moving = false; return true; }
    if (Math.abs(dx) > 1) this.dir = dx > 0 ? 1 : -1;
    this.view = Math.abs(dy) > Math.abs(dx) * 0.6 ? (dy < 0 ? 'back' : 'front') : 'side';   // which side of the walker the camera sees
    if (blocked?.(this.x, this.y, Math.abs(dx) > 1 ? Math.sign(dx) : 0, Math.sign(dy))) { this.moving = false; return false; }     // someone is in the way: wait
    this.moving = true;
    const s = Math.min(d, this.speed * dt);
    this.x += (dx / d) * s; this.y += (dy / d) * s;
    return false;
  }
}

export class StaffLayer {
  constructor(game) {
    this.game = game;
    this.baker = new Walker(STOPS.counter.x, STAFF_LANE_Y, 70);
    this.baker.stop = 'counter';
    this.waiter = new Walker(POST.x, POST.y, 95);
    this.waiter.dir = 1;
    this.route = [];            // waypoints of the current service trip
    this.phase = 'post';        // post -> carry -> hand -> back
    this.carry = null;          // product id shown in the waiter's hands
    this.handT = 0;
    this.job = null;            // the order the waiter is bringing: { order, product, side, gx, table, paid }
    this.plates = new Map();    // table index -> the served product on the table { product, t, eat, hold } (eaten, then cleared when the table is free again)
    this.seated = () => true;   // set by the scene: (customerId) -> the guest sits in the chair
    this.tour = 0;
    this.bakerWait = 0;
    this.show = 0;              // the waiter fades in only while the cafe has guests
    this.warp = (y) => 0;       // set by the scene (see InteriorScene.warpAt)
    this.cheer = 0;             // seconds left of the baker's little hop after a product comes out
    this.onServed = null;       // set by the scene: called with the table area when the waiter puts an order down
    game.on('complete', () => { this.cheer = 0.55; });
    game.on('customer', (e) => {   // the sale was made at the table: the product stands there while the guest eats, the table is cleared when the logic frees it
      if (e.type === 'leave' && e.income && e.table != null && e.eatSec > 0) this.plates.set(e.table, { product: e.product, t: 0, eat: e.eatSec, hold: e.holdSec || e.eatSec });
      else if (e.type === 'tableFree') this.plates.delete(e.table);
    });
    this.ovenT = -1;            // seconds into the put-it-in-the-oven animation, -1 = not playing
    this.pendingOven = false;   // an oven job has started: the animation plays as soon as the baker stands at the oven
    this.coffeeT = -1; this.pendingCoffee = false;   // the same for the coffee machine
    game.on('change', (e) => { if (e?.type === 'start') { const st = game.productsDef[e.product]?.station; if (st === 'oven') this.pendingOven = true; else if (st === 'coffee') this.pendingCoffee = true; } });
    this.guests = () => [];     // set by the scene: where the guests stand (the waiter never walks into one)
    this.poses = {};            // who -> { key, last, prev, t }: the pose being drawn and the one it replaces while the two cross-fade (see pose())
  }

  /** The busy machine (oven or coffee) the baker should work at, or null. */
  busyStop() { return ['oven', 'coffee'].find((id) => this.game.jobsOf(id).length) ?? null; }

  update(dt) {
    this.updateBaker(dt);
    this.cheer = Math.max(0, this.cheer - dt);
    const bk = this.baker;
    if (this.pendingOven && this.busyStop() !== 'oven') this.pendingOven = false;                      // the job is already over
    if (this.pendingOven && bk.stop === 'oven' && !bk.moving && !bk.target) { this.pendingOven = false; this.ovenT = 0; }
    if (this.ovenT >= 0) { this.ovenT += dt; if (this.ovenT >= OVEN_SEC || this.cheer > 0) this.ovenT = -1; }
    if (this.pendingCoffee && this.busyStop() !== 'coffee') this.pendingCoffee = false;
    if (this.pendingCoffee && bk.stop === 'coffee' && !bk.moving && !bk.target) { this.pendingCoffee = false; this.coffeeT = 0; }
    if (this.coffeeT >= 0) { this.coffeeT += dt; if (this.coffeeT >= COFFEE_SEC || this.cheer > 0) this.coffeeT = -1; }
    for (const pl of this.plates.values()) pl.t += dt;
    for (const ps of Object.values(this.poses)) if (ps.t < 1) ps.t = Math.min(1, ps.t + dt / POSE_FADE_SEC);
    this.show = Math.max(0, Math.min(1, this.show + (this.game.cafe?.customers.length || this.plates.size || this.phase !== 'post' ? dt : -dt)));
    this.updateWaiter(dt);          // without the waiter sheet drawSprite simply draws nothing
  }

  updateBaker(dt) {
    const b = this.baker, busy = this.busyStop(), w = this.waiter;
    // walking behind the counters he waits while the waiter stands right in front of his path (no heads on top of each other), but never longer than 2 s
    const wBlock = (x, y, dirx) => this.show > 0 && this.bakerWait < 2 && dirx && w.y < STAFF_LANE_Y + 70 && (w.x - x) * dirx > -30 && (w.x - x) * dirx < 100;
    const arrived = b.step(dt, (x, y, dirx) => { const hit = wBlock(x, y, dirx); if (hit) this.bakerWait += dt; return hit; });
    if (arrived) this.bakerWait = 0;
    if (arrived) { b.wait = 2 + Math.random() * 2.5; b.dir = STOPS[b.stop].dir; return; }
    if (b.target) return;
    if (busy && b.stop !== busy) { b.stop = busy; b.target = { x: STOPS[busy].x, y: STAFF_LANE_Y }; return; }      // production started: go to the machine now
    if (busy) { b.dir = STOPS[busy].dir; return; }                                                                     // working: stay put
    b.wait -= dt;
    if (b.wait <= 0) {
      this.tour = (this.tour + 1) % TOUR.length;
      const id = TOUR[this.tour];
      if (id === b.stop) b.wait = 1.5; else { b.stop = id; b.target = { x: STOPS[id].x, y: STAFF_LANE_Y }; }
    }
  }

  /** A seated guest whose open order can be served now: the product is in stock (oldest first). Without stock the waiter does not go. */
  nextOrder() {
    const cafe = this.game.cafe;
    for (const c of cafe?.customers ?? []) {
      if (c.state !== 'seated' || !this.seated(c.id)) continue;
      const o = cafe.orderOf(c);
      if (!o || o.status !== 'open' || !(this.game.products[o.product] >= 1)) continue;
      return { c, o };
    }
    return null;
  }

  /** True while the waiter is bringing this order (a tap on the guest must not serve it a second time). */
  claims(orderId) { return !!this.job && this.job.order === orderId && ['pick', 'carry', 'hand'].includes(this.phase); }

  updateWaiter(dt) {
    const w = this.waiter, cafe = this.game.cafe;
    // blocked: a guest right ahead (along the row, or below/above when walking down/up a gap)
    const blocked = (x, y, dirx, diry) => [...this.guests()].some((g) => (dirx ? Math.abs(g.y - y) < 40 && (g.x - x) * dirx > 0 && (g.x - x) * dirx < 110 : Math.abs(g.x - x) < 55 && (g.y - y) * diry > 0 && (g.y - y) * diry < 95));
    if (this.phase === 'post') {
      if (w.step(dt, blocked)) { w.dir = 1; return; }
      if (w.target) return;
      const job = this.show >= 1 ? this.nextOrder() : null;
      if (job) {
        const a = AREAS.find((x) => x.id === `table${job.c.table + 1}`), spot = chairSpot(job.c.table);
        const gx = Math.max(-50, Math.min(950, spot.via)), gy = a.y + 55;
        this.job = { order: job.o.id, product: job.o.product, side: spot.side, gx, table: a.id, paid: false };
        this.route = [{ x: gx, y: WAITER_LANE_Y }, { x: gx, y: gy }];
        this.carry = job.o.product; this.phase = 'pick'; this.pickT = 0; w.dir = 1;       // takes the order from the counter first (a short beat), then sets off
      } else if (Math.abs(w.x - POST.x) > 3 || Math.abs(w.y - POST.y) > 3) w.target = { ...POST };
      return;
    }
    if (this.phase === 'pick') {
      w.t += dt; this.pickT += dt;
      if (this.pickT >= 0.45) {
        const open = this.game.cafe?.orders.some((o) => o.id === this.job.order && o.status === 'open');
        if (!open || !(this.game.products[this.job.product] >= 1)) { this.carry = null; this.job = null; this.phase = 'post'; return; }     // sold or gone meanwhile: nothing to bring
        this.phase = 'carry'; w.target = this.route.shift();
      }
      return;
    }
    if (this.phase === 'carry') {
      const gone = !cafe?.orders.some((o) => o.id === this.job.order && o.status === 'open');
      if (gone) { this.carry = null; this.job = null; this.phase = 'back'; this.route = [{ x: w.x, y: WAITER_LANE_Y }, { ...POST }]; w.target = this.route.shift(); return; }   // the guest gave up while he was on the way
      if (w.step(dt, blocked)) { if (this.route.length) w.target = this.route.shift(); else { this.phase = 'hand'; this.handT = 0; w.dir = -this.job.side; } }
      return;
    }
    if (this.phase === 'hand') {                              // standing beside the guest, putting the order down
      w.t += dt; this.handT += dt;
      if (!this.job.paid && this.handT >= HAND_SEC * 0.5) {   // the tray touches the table: now the order is really delivered
        this.job.paid = true;
        const r = cafe?.deliver(this.job.order);
        this.job.ok = !!r?.ok;
        if (this.job.ok) { this.carry = null; this.onServed?.(AREAS.find((x) => x.id === this.job.table)); }
      }
      if (this.handT >= HAND_SEC) {
        this.phase = 'back';                                  // a refused delivery (the stock went meanwhile) sends him back with the tray
        this.route = [{ x: this.job.gx, y: WAITER_LANE_Y }, { ...POST }]; w.target = this.route.shift();
      }
      return;
    }
    if (w.step(dt, blocked)) { if (this.route.length) w.target = this.route.shift(); else { this.phase = 'post'; w.dir = 1; this.carry = null; this.job = null; } }   // back
  }

  /** A small saucer on the tabletop under a served item, so it looks placed there. */
  plate(ctx, x, y) {
    ctx.fillStyle = 'rgba(70,48,32,.28)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 4, 30, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f6eddc'; ctx.beginPath(); ctx.ellipse(x, y, 29, 8.5, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(121,82,56,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, 29, 8.5, 0, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(121,82,56,.25)'; ctx.beginPath(); ctx.ellipse(x, y, 19, 5, 0, 0, 7); ctx.stroke();
  }

  /** What is on the tables: the served product shrinks while the guest eats it, then the empty plate fades out as the guest gets up and the table is cleared. */
  drawServed(ctx) {
    for (const [ti, pl] of this.plates) {
      const a = AREAS.find((x) => x.id === `table${ti + 1}`); if (!a) continue;
      const eaten = pl.eat > 0 ? Math.min(1, pl.t / pl.eat) : 1, fade = pl.eat > 0 ? Math.min(1, Math.max(0, 1 - (pl.t - pl.eat) / 0.7)) : Math.min(1, Math.max(0, (pl.hold - pl.t) / 0.35)), cx = a.x + a.w / 2, cy = a.y + a.h * 0.26;
      ctx.save(); ctx.translate(0, this.warp(a.y + a.h - 35)); ctx.globalAlpha = fade;
      this.plate(ctx, cx, cy);
      if (eaten < 1) { const k = 1 - 0.7 * eaten; ctx.save(); ctx.translate(cx, cy - 4); ctx.scale(k, k); drawIcon(ctx, pl.product, 0, -8 / k, 34); ctx.restore(); }
      else { ctx.fillStyle = 'rgba(121,82,56,.5)'; for (const [dx, dy] of [[-9, 0], [4, 2], [11, -1]]) { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 1.8, 0, 7); ctx.fill(); } }     // crumbs
      ctx.restore();
    }
    if (this.phase === 'hand' && this.carry && !hasHandFrames()) {                // the icon is carried from the hands toward the table while handing over
      const w = this.waiter, a = AREAS.find((x) => x.id === this.job.table), k = Math.min(1, this.handT / HAND_SEC);
      const wy = this.warp(w.y), ty = this.warp(a.y + a.h - 35);
      drawIcon(ctx, this.carry, w.x + w.dir * 40 + (a.x + a.w / 2 - (w.x + w.dir * 40)) * k, wy + w.y - 108 + (ty + a.y + a.h * 0.26 - 12 - (wy + w.y - 108)) * k, 36);
    }
  }

  /** The baker is drawn between the back-wall furniture and the counters, so the counters hide his lower body. */
  /** Draws one pose of an actor; when `key` differs from the previous frame's, the old pose fades out while the new one fades in. */
  pose(ctx, who, key, draw) {
    const ps = this.poses[who] ??= { key, last: draw, prev: null, t: 1 };
    if (ps.key !== key) { ps.prev = ps.last; ps.key = key; ps.t = 0; }
    ps.last = draw;
    if (ps.prev && ps.t < 1) {
      const k = ps.t, keep = ctx.globalAlpha;
      ctx.globalAlpha = keep * (1 - k); ps.prev(ctx);
      ctx.globalAlpha = keep * Math.min(1, k * 1.6); draw(ctx);
      ctx.globalAlpha = keep;
      return;
    }
    ps.prev = null;
    draw(ctx);
  }

  drawBaker(ctx) {
    const b = this.baker, working = !b.moving && !b.target && !!this.busyStop();
    const knead = !b.moving && !b.target && this.cheer <= 0 && (working || b.stop === 'counter' || b.stop === 'counter2');   // standing at the prep counter (or waiting for a machine): kneads dough
    const sc = PERSON_SCALE * CHEF_SCALE * depthScale(STAFF_LANE_Y), x = b.x, dir = b.dir, t = b.t;
    if (this.ovenT >= 0 && hasOvenFrames()) { const hand = Math.min(0.999, this.ovenT / OVEN_SEC); return this.pose(ctx, 'baker', 'oven', (c) => drawSprite(c, 'chef_oven', x, STAFF_LANE_Y, t, { dir, scale: sc, hand })); }
    if (this.coffeeT >= 0 && hasCoffeeFrames()) { const hand = Math.min(0.999, this.coffeeT / COFFEE_SEC); return this.pose(ctx, 'baker', 'coffee', (c) => drawSprite(c, 'chef_coffee', x, STAFF_LANE_Y, t, { dir, scale: sc, hand })); }
    const hop = this.cheer > 0 ? Math.sin((1 - this.cheer / 0.55) * Math.PI) * 14 : 0;   // a hop of joy when something is done
    const joy = this.cheer > 0, moving = b.moving, view = b.view;
    this.pose(ctx, 'baker', joy ? 'joy' : knead ? 'knead' : 'plain', (c) => drawSprite(c, 'chef', x, STAFF_LANE_Y - hop, t, { dir: knead ? 1 : dir, fps: 7, scale: sc, frame: moving ? null : 0, joy, work: knead ? 'knead' : null, view, bob: knead ? 0 : working ? 0.045 : 0.014, bobRate: working ? 7 : 2.2, sway: knead ? 0 : working ? 0.05 : 0 }));   // working: a quick kneading/stirring rhythm and a lean toward the machine
  }

  drawWaiter(ctx) {
    const w = this.waiter;
    if (this.show <= 0) return;
    ctx.globalAlpha = this.show;
    // carrying an order he holds the tray out (frame 3) and walks by bouncing; otherwise he walks the 4-frame cycle or stands
    const tray = !!this.carry && this.phase !== 'hand';
    const o = { dir: w.dir, fps: 7, scale: PERSON_SCALE * depthScale(w.y), frame: w.moving ? null : 0, carry: tray, view: w.view, bob: 0.012, sway: this.phase === 'hand' ? 0.03 : 0 };
    const x = w.x, y = w.y, t = w.t;
    // handing over: the one-shot hand-over frames (tray with cup and cake) when they exist, else the standing frame with the item icon flying to the table
    if (this.phase === 'hand' && !w.moving && hasHandFrames()) {
      const hand = Math.min(0.999, this.handT / HAND_SEC);
      this.pose(ctx, 'waiter', 'hand', (c) => drawSprite(c, 'waiter_hand', x, y, t, { ...o, hand, shade: true, sway: 0, bob: 0 }));
    } else this.pose(ctx, 'waiter', tray ? 'tray' : 'plain', (c) => drawSprite(c, 'waiter', x, y, t, o));
    // the tray picture always shows a cup and a cake, so what he really carries is shown as a small marker over his head (a stand-in for per-product tray pictures)
    if (this.carry && (this.phase === 'pick' || this.phase === 'carry' || (this.phase === 'hand' && !this.job?.paid))) {
      const my = y - 250 * depthScale(y) - 20 + Math.sin(t * 7) * 3;
      ctx.beginPath(); ctx.arc(x, my, 26, 0, 7); ctx.fillStyle = '#FFF8EA'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#795238'; ctx.stroke();
      drawIcon(ctx, this.carry, x, my, 34);
    }
    ctx.globalAlpha = 1;
  }
}
