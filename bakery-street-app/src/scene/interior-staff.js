// Staff, purely visual (no game logic, nothing saved):
//  - the baker works on the kitchen floor between the back wall and the counters (head and shoulders show above the counters). He walks to
//    whichever machine is busy, stands beside it facing it and works (the standing pose rocks and breathes faster); otherwise he strolls
//    between oven, counter, coffee machine and storage;
//  - the waiter has a post in front of the counters. When a seated guest has an open order he picks it up, carries it (the product is shown
//    in his hands) along the corridor and down the access gap beside the table, hands it over, and returns to the post. He only mimics
//    service: the sale itself is still made by tapping the guest, as before.
import { drawSprite } from '../characters/sprites.js';
import { drawIcon } from '../assets.js';
import { STAFF_LANE_Y, WAITER_LANE_Y, PERSON_SCALE, AREAS, chairSpot } from './interior-layout.js';

// where the baker stands for each job (beside the machine, never in front of its opening) and which way he faces there
const STOPS = { oven: { x: 272, dir: -1 }, counter: { x: 420, dir: 1 }, counter2: { x: 560, dir: 1 }, coffee: { x: 1042, dir: 1 }, storage: { x: 1190, dir: 1 } };
const TOUR = ['counter', 'oven', 'counter2', 'coffee', 'storage', 'counter2'];
const POST = { x: 655, y: WAITER_LANE_Y };                 // the waiter's post: the gap between the prep counter and the showcase, clear of the queue spot (855) and of the oven and coffee machine
const HAND_SEC = 1.1;                                       // time spent handing the order over

class Walker {
  constructor(x, y, speed) { this.x = x; this.y = y; this.speed = speed; this.dir = 1; this.moving = false; this.target = null; this.wait = 1.5; this.t = 0; }
  /** Moves toward the target point (one axis at a time is up to the route); returns true when it has just arrived. */
  step(dt, blocked = null) {
    this.t += dt;
    if (!this.target) return false;
    const dx = this.target.x - this.x, dy = this.target.y - this.y, d = Math.hypot(dx, dy);
    if (d < 3) { this.x = this.target.x; this.y = this.target.y; this.target = null; this.moving = false; return true; }
    if (Math.abs(dx) > 1) this.dir = dx > 0 ? 1 : -1;
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
    this.waiter = new Walker(POST.x, POST.y, 70);
    this.waiter.dir = 1;
    this.route = [];            // waypoints of the current service trip
    this.phase = 'post';        // post -> carry -> hand -> back
    this.carry = null;          // product id shown in the waiter's hands
    this.handT = 0;
    this.served = new Set();    // order ids the waiter has already brought (so each order is carried once)
    this.tour = 0;
    this.bakerWait = 0;
    this.show = 0;              // the waiter fades in only while the cafe has guests
    this.guests = () => [];     // set by the scene: where the guests stand (the waiter never walks into one)
  }

  /** The busy machine (oven or coffee) the baker should work at, or null. */
  busyStop() { return ['oven', 'coffee'].find((id) => this.game.jobsOf(id).length) ?? null; }

  update(dt) {
    this.updateBaker(dt);
    this.show = Math.max(0, Math.min(1, this.show + (this.game.cafe?.customers.length ? dt : -dt)));
    this.updateWaiter(dt);          // without the waiter sheet drawSprite simply draws nothing
  }

  updateBaker(dt) {
    const b = this.baker, busy = this.busyStop(), w = this.waiter;
    // walking behind the counters he waits while the waiter stands right in front of his path (no heads on top of each other), but never longer than 2 s
    const wBlock = (x, y, dirx) => this.show > 0 && this.bakerWait < 2 && dirx && w.y < 560 && (w.x - x) * dirx > -30 && (w.x - x) * dirx < 100;
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

  /** A seated guest whose open order has not been carried yet (oldest first). */
  nextOrder() {
    const cafe = this.game.cafe;
    for (const c of cafe?.customers ?? []) {
      if (c.state !== 'seated') continue;
      const o = cafe.orderOf(c);
      if (!o || o.status !== 'open' || this.served.has(o.id)) continue;
      const gx = chairSpot(c.table).via;
      if (gx < 380 && this.busyStop() === 'oven') continue;     // the baker works at the oven: don't walk through him, serve the others first
      return { c, o };
    }
    return null;
  }

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
        const gx = Math.max(-50, Math.min(1400, spot.via)), gy = a.y + 55;
        this.job = { order: job.o.id, product: job.o.product, side: spot.side, gx, table: a.id };
        this.route = [{ x: gx, y: WAITER_LANE_Y }, { x: gx, y: gy }];
        this.carry = job.o.product; this.phase = 'carry'; w.target = this.route.shift();
      } else if (Math.abs(w.x - POST.x) > 3 || Math.abs(w.y - POST.y) > 3) w.target = { ...POST };
      return;
    }
    if (this.phase === 'carry') {
      const gone = !cafe?.orders.some((o) => o.id === this.job.order && o.status === 'open');
      if (gone) { this.carry = null; this.phase = 'back'; this.route = [{ x: w.x, y: WAITER_LANE_Y }, { ...POST }]; w.target = this.route.shift(); return; }   // the guest left or was served by a tap
      if (w.step(dt, blocked)) { if (this.route.length) w.target = this.route.shift(); else { this.phase = 'hand'; this.handT = 0; w.dir = -this.job.side; } }
      return;
    }
    if (this.phase === 'hand') {                              // standing beside the guest, offering the order
      w.t += dt; this.handT += dt;
      if (this.handT >= HAND_SEC) {
        this.served.add(this.job.order); this.carry = null; this.phase = 'back';
        this.route = [{ x: this.job.gx, y: WAITER_LANE_Y }, { ...POST }]; w.target = this.route.shift();
      }
      return;
    }
    if (w.step(dt, blocked)) { if (this.route.length) w.target = this.route.shift(); else { this.phase = 'post'; w.dir = 1; } }   // back
    if (this.served.size > 40) this.served = new Set([...this.served].slice(-10));
  }

  /** Served orders rest on their table until the guest pays: the handover is visible and stays readable. The icon flies from the waiter's hands to the tabletop. */
  /** A small saucer on the tabletop under a served item, so it looks placed there. */
  plate(ctx, x, y) {
    ctx.fillStyle = 'rgba(70,48,32,.28)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 4, 30, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f6eddc'; ctx.beginPath(); ctx.ellipse(x, y, 29, 8.5, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(121,82,56,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, 29, 8.5, 0, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(121,82,56,.25)'; ctx.beginPath(); ctx.ellipse(x, y, 19, 5, 0, 0, 7); ctx.stroke();
  }

  drawServed(ctx) {
    const cafe = this.game.cafe;
    for (const c of cafe?.customers ?? []) {
      const o = c.state === 'seated' ? cafe.orderOf(c) : null;
      if (!o || o.status !== 'open' || !this.served.has(o.id)) continue;
      const a = AREAS.find((x) => x.id === `table${c.table + 1}`);
      this.plate(ctx, a.x + a.w / 2, a.y + a.h * 0.26);
      drawIcon(ctx, o.product, a.x + a.w / 2, a.y + a.h * 0.26 - 12, 34);
    }
    if (this.phase === 'hand' && this.carry) {                // the icon is carried from the hands toward the table while handing over
      const w = this.waiter, a = AREAS.find((x) => x.id === this.job.table), k = Math.min(1, this.handT / HAND_SEC);
      drawIcon(ctx, this.carry, w.x + w.dir * 40 + (a.x + a.w / 2 - (w.x + w.dir * 40)) * k, w.y - 108 + (a.y + a.h * 0.26 - 12 - (w.y - 108)) * k, 36);
    }
  }

  /** The baker is drawn between the back-wall furniture and the counters, so the counters hide his lower body. */
  drawBaker(ctx) {
    const b = this.baker, working = !b.moving && !b.target && !!this.busyStop();
    drawSprite(ctx, 'chef', b.x, STAFF_LANE_Y, b.t, { dir: b.dir, fps: 7, scale: PERSON_SCALE * 1.04, frame: b.moving ? null : 0, bob: working ? 0.03 : 0.014, sway: working ? 0.035 : 0 });
  }

  drawWaiter(ctx) {
    const w = this.waiter;
    if (this.show <= 0) return;
    ctx.globalAlpha = this.show;
    // carrying an order he holds the tray out (frame 3) and walks by bouncing; otherwise he walks the 4-frame cycle or stands
    const tray = !!this.carry && this.phase !== 'hand';
    drawSprite(ctx, 'waiter', w.x, w.y, w.t, { dir: w.dir, fps: 7, scale: PERSON_SCALE, frame: tray ? 3 : w.moving ? null : 0, bounce: tray && w.moving, bob: 0.012, sway: this.phase === 'hand' ? 0.03 : 0 });
    // (the tray frame already shows a cup and a cake, so no separate item icon is drawn while carrying)
    ctx.globalAlpha = 1;
  }
}
