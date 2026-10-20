// The baker: a decorative staff member who walks along the service line (the lane just in front of the machines) and works at
// whichever station is busy, otherwise strolls between oven, counter and coffee machine. Purely visual: no game logic, no state saved.
import { drawSprite } from '../characters/sprites.js';
import { STAFF_LANE_Y } from './interior-layout.js';

const SPEED = 70;                  // design px per second (a calm walk)
const STOPS = [{ id: 'oven', x: 190 }, { id: 'counter', x: 520 }, { id: 'showcase', x: 880 }, { id: 'coffee', x: 1170 }];

export class StaffLayer {
  constructor(game) {
    this.game = game;
    this.x = STOPS[1].x; this.dir = 1; this.moving = false;
    this.target = null; this.wait = 1.5; this.i = 1; this.t = 0;
  }

  /** The station the baker should be at: a busy machine first, otherwise the next stop on a tour. */
  pick() {
    const busy = STOPS.filter((s) => this.game.jobsOf(s.id).length);
    if (busy.length) return busy.reduce((a, b) => (Math.abs(a.x - this.x) <= Math.abs(b.x - this.x) ? a : b));
    this.i = (this.i + 1) % STOPS.length;
    return STOPS[this.i];
  }

  update(dt) {
    this.t += dt;
    if (this.target) {
      const dx = this.target.x - this.x;
      if (Math.abs(dx) < 3) { this.x = this.target.x; this.target = null; this.moving = false; this.wait = 2 + Math.random() * 2.5; }
      else { this.moving = true; this.dir = dx > 0 ? 1 : -1; this.x += this.dir * Math.min(Math.abs(dx), SPEED * dt); }
      return;
    }
    this.wait -= dt;
    if (this.wait <= 0) {
      const next = this.pick();
      if (Math.abs(next.x - this.x) < 3) this.wait = 1.5; else this.target = next;
    }
  }

  draw(ctx) {
    drawSprite(ctx, 'chef', this.x, STAFF_LANE_Y, this.t, { dir: this.dir, fps: 7, scale: 0.9, frame: this.moving ? null : 0 });
  }
}
