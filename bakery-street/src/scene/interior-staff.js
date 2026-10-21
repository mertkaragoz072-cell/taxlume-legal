// Staff, purely visual (no game logic, nothing saved):
//  - the baker works on the kitchen floor between the back wall and the counters (head and shoulders show above the counters) and
//    goes to whichever machine is busy, otherwise strolls between oven, counter, coffee machine and storage;
//  - the waiter walks the dining area only (never leaves the room). It needs its own sprite sheet ('waiter', see characters/sprites.js);
//    until that art exists nothing is drawn, so no customer sprite is passed off as staff.
import { drawSprite, hasSprite } from '../characters/sprites.js';
import { STAFF_LANE_Y, WAITER_LANE_Y, PERSON_SCALE } from './interior-layout.js';

const STOPS = { oven: 140, counter: 420, counter2: 560, coffee: 1135, storage: 1278 };
const TOUR = ['counter', 'oven', 'counter2', 'coffee', 'storage', 'counter2'];

class Walker {
  constructor(x, speed) { this.x = x; this.speed = speed; this.dir = 1; this.moving = false; this.target = null; this.wait = 1.5; this.t = 0; }
  /** Moves toward the target; returns true when it has just arrived. */
  step(dt) {
    this.t += dt;
    if (!this.target) return false;
    const dx = this.target - this.x;
    if (Math.abs(dx) < 3) { this.x = this.target; this.target = null; this.moving = false; return true; }
    this.moving = true; this.dir = dx > 0 ? 1 : -1;
    this.x += this.dir * Math.min(Math.abs(dx), this.speed * dt);
    return false;
  }
}

export class StaffLayer {
  constructor(game) {
    this.game = game;
    this.baker = new Walker(STOPS.counter, 70);
    this.waiter = new Walker(380, 62);
    this.tour = 0;
    this.show = 0;              // the waiter fades in only while the cafe has guests
  }

  /** Where the baker should be: next to a busy machine first, otherwise the next stop of the tour. */
  bakerStop() {
    const busy = ['oven', 'coffee'].filter((id) => this.game.jobsOf(id).length);
    if (busy.length) { const id = busy[0]; return STOPS[id]; }
    this.tour = (this.tour + 1) % TOUR.length;
    return STOPS[TOUR[this.tour]];
  }

  update(dt) {
    const b = this.baker;
    if (b.step(dt)) b.wait = 2 + Math.random() * 2.5;
    else if (!b.target) {
      b.wait -= dt;
      if (b.wait <= 0) { const x = this.bakerStop(); if (Math.abs(x - b.x) < 3) b.wait = 1.5; else b.target = x; }
    }
    this.show = Math.max(0, Math.min(1, this.show + (this.game.cafe?.customers.length ? dt : -dt)));
    if (!hasSprite('waiter')) return;
    const w = this.waiter;
    if (w.step(dt)) w.wait = 2 + Math.random() * 3;
    else if (!w.target) {
      w.wait -= dt;
      if (w.wait <= 0) w.target = 330 + Math.random() * 340;       // the left part of the dining area: away from the queue and the entrance, never beyond the room
    }
  }

  /** The baker is drawn between the back-wall furniture and the counters, so the counters hide his lower body. */
  drawBaker(ctx) {
    const b = this.baker;
    drawSprite(ctx, 'chef', b.x, STAFF_LANE_Y, b.t, { dir: b.dir, fps: 7, scale: PERSON_SCALE * 1.04, frame: b.moving ? null : 0, bob: 0.014 });
  }

  drawWaiter(ctx) {
    const w = this.waiter;
    if (this.show <= 0) return;
    ctx.globalAlpha = this.show;
    drawSprite(ctx, 'waiter', w.x, WAITER_LANE_Y, w.t, { dir: w.dir, fps: 7, scale: PERSON_SCALE, frame: w.moving ? null : 0, bob: 0.012 });
    ctx.globalAlpha = 1;
  }
}
