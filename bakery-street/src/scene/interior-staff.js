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
const POST = { x: 610, y: WAITER_LANE_Y };                 // the waiter's post, at the end of the counters
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
    if (blocked?.(this.x, this.y, Math.sign(dx))) { this.moving = false; return false; }     // someone is in the way: wait
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
    const b = this.baker, busy = this.busyStop();
    if (b.step(dt)) { b.wait = 2 + Math.random() * 2.5; b.dir = STOPS[b.stop].dir; return; }
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
      if (o && o.status === 'open' && !this.served.has(o.id)) return { c, o };
    }
    return null;
  }

  updateWaiter(dt) {
    const w = this.waiter, cafe = this.game.cafe;
    const blocked = (x, y, dir) => [...this.guests()].some((g) => Math.abs(g.y - y) < 40 && (g.x - x) * dir > 0 && (g.x - x) * dir < 110);
    if (this.phase === 'post') {
      if (w.step(dt, blocked)) { w.dir = 1; return; }
      if (w.target) return;
      const job = this.show >= 1 ? this.nextOrder() : null;
      if (job) {
        const a = AREAS.find((x) => x.id === `table${job.c.table + 1}`), spot = chairSpot(job.c.table);
        const gx = Math.max(-50, Math.min(1400, spot.via)), gy = a.y + 55;
        this.job = { order: job.o.id, product: job.o.product, side: spot.side, gx };
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

  /** The baker is drawn between the back-wall furniture and the counters, so the counters hide his lower body. */
  drawBaker(ctx) {
    const b = this.baker, working = !b.moving && !b.target && !!this.busyStop();
    drawSprite(ctx, 'chef', b.x, STAFF_LANE_Y, b.t, { dir: b.dir, fps: 7, scale: PERSON_SCALE * 1.04, frame: b.moving ? null : 0, bob: working ? 0.03 : 0.014, sway: working ? 0.035 : 0 });
  }

  drawWaiter(ctx) {
    const w = this.waiter;
    if (this.show <= 0) return;
    ctx.globalAlpha = this.show;
    drawSprite(ctx, 'waiter', w.x, w.y, w.t, { dir: w.dir, fps: 7, scale: PERSON_SCALE, frame: w.moving ? null : 0, bob: 0.012, sway: this.phase === 'hand' ? 0.03 : 0 });
    if (this.carry) {                                         // the order, held out in front at tray height
      const lift = this.phase === 'hand' ? Math.sin(this.handT * 5) * 3 : 0;
      drawIcon(ctx, this.carry, w.x + w.dir * 40, w.y - 108 + lift, 36);
    }
    ctx.globalAlpha = 1;
  }
}
