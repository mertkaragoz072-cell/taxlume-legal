// Cafe & bakery interior. Placeholder art drawn in code; every area is a tappable station (see interior-layout.js).
import { INK, rrect, poly, paint, vgrad, hgrad, shadow, lighten, darken, glowAt, label, clamp, fontCss, textFloor, gradeScreen, createCanvas } from '../util.js';
import { PAL } from '../palette.js';
import { AREAS, DRAW_ORDER, FLOOR_Y, CAM, ROOM, WAITER_LANE_Y, STAFF_LANE_Y, areaAt, depthOf, seatRect } from './interior-layout.js';
import { drawProp } from './props.js';
import { formatTime } from '../game/game.js';
import { getImage, drawIcon } from '../assets.js';
import { CustomerLayer } from './interior-customers.js';
import { StaffLayer } from './interior-staff.js';

/** Pendant lamps along the back wall, hung in the gaps between the wall pieces. */
/** Parallax: how far (world px) the nearest plane moves at full look, and each plane's share of it. */
const PARALLAX_PX = 24;
const PLANE = { wall: 0.25, deco: 0.5, kitchen: 0.8, floor: 1.1, front: 1.7 };
/** Per-table chair offsets (design px at 2x of the picture scale) and tilt in radians: [left chair, right chair]. */
const CHAIRS = [
  [{ dx: -7, dy: 3, rot: -0.035 }, { dx: 9, dy: -2, rot: 0.04 }],
  [{ dx: 5, dy: -3, rot: 0.03 }, { dx: -6, dy: 2, rot: -0.05 }],
  [{ dx: -10, dy: 0, rot: 0.05 }, { dx: 4, dy: 4, rot: 0.02 }],
  [{ dx: 2, dy: 3, rot: -0.02 }, { dx: 11, dy: -3, rot: -0.04 }],
];
const LAMPS = [285, 700, 975];
const FONT = '700 22px "Trebuchet MS", "Segoe UI", sans-serif';

export class InteriorScene {
  /** @param {import('../game/game.js').Game} game */
  constructor(game) {
    this.id = 'interior';
    this.game = game;
    this.t = 0;
    this.pressedId = null;
    this.selected = null;       // area id whose panel is open
    this.spring = {};           // area id -> seconds since it was tapped (a springy squash-and-stretch)
    this.sparks = [];           // little glittering bits that fly off a tapped piece of furniture
    this.pops = [];             // floating "+1 Ekmek" texts
    this.view = null;
    this.cam = { zoom: CAM.zoom, tx: 0, ty: 0, wl: 0, wr: 1400, wt: 0, wb: 790 };   // zoomed-out camera, see resize()
    this.customers = new CustomerLayer(game, game.cafe);
    this.staff = new StaffLayer(game);
    this.staff.guests = () => this.customers.v.values();
    this.customers.extra = () => [this.staff.waiter];          // guests give way to the waiter too
    this.rects = {};            // where each area's art was actually drawn (labels follow it)
    this.look = 0; this.lk = 0; // parallax: target (-1..1, from touch) and the smoothed value in use
    this.motes = Array.from({ length: 34 }, (_, i) => ({ x: -120 + ((i * 97) % 1620), y: 110 + ((i * 53) % 620), r: 1.2 + (i % 3) * 0.6, p: i * 1.7, vx: 4 + (i % 5), vy: -3 - (i % 4) }));   // drifting dust
    game.on('complete', ({ station, product }) => {
      const area = AREAS.find((a) => a.station === station);
      this.pops.push({ x: area.x + area.w / 2, y: area.y + 20, text: '+1', icon: product, life: 1 });
    });
  }

  /**
   * The camera looks at the room from a little further away: world coordinates (the layout in interior-layout.js) are drawn at
   * `zoom` and centred on CAM.cx, with the floor's front edge a fixed margin above the bottom of the screen. Taps and the guests'
   * entrance follow the same transform, so everything else keeps working in world coordinates.
   */
  resize(view) {
    this.view = view;
    // tablets (4:3 and similar): the room is brought closer so the extra height is not just empty wall; phones keep the base zoom
    const tall = Math.max(0, Math.min(1, (view.vh - 870) / 180)), z = CAM.zoom + (Math.min(view.vw / 1650, 0.9) - CAM.zoom) * tall, cx = CAM.cx + (815 - CAM.cx) * tall, tx = view.vw / 2 - cx * z, ty = view.vh - CAM.bottomPad - CAM.baseY * z;
    this.cam = { zoom: z, tx, ty, wl: -tx / z, wr: (view.vw - tx) / z, wt: -ty / z, wb: (view.vh - ty) / z };
  }

  /** Pointer position in the design space used by main.js (origin shifted by view.ox/oy) -> world. */
  toWorld(x, y) { const c = this.cam, v = this.view; return { x: (x + v.ox - c.tx) / c.zoom, y: (y + v.oy - c.ty) / c.zoom }; }
  /** World -> the same pointer space (used by tests and debugging). */
  toScreen(x, y) { const c = this.cam, v = this.view; return { x: x * c.zoom + c.tx - v.ox, y: y * c.zoom + c.ty - v.oy }; }

  /** Steer the parallax (finger position), -1..1. */
  setLook(n) { this.look = clamp(n, -1, 1); }

  /**
   * Parallax: the camera sways a little, so planes at different depths slide against each other. Factor per plane (nearer = more):
   * wall .25, wall decoration .5, kitchen furniture and baker .8, floor level (tables, guests, waiter) 1.1, front plants 1.7.
   */
  shift(plane) { return -this.lk * PARALLAX_PX * PLANE[plane]; }
  /** The plane an area belongs to. */
  planeOf(a) { return a.id.startsWith('table') ? 'floor' : 'kitchen'; }

  /** Customers (their order bubbles) take priority over the tables and machines they stand in front of. */
  hitTest(x, y) {
    const p = this.toWorld(x, y), f = this.shift('floor');
    return this.customers.hitTest(p.x - f, p.y) ?? AREAS.find((a) => { const q = p.x - this.shift(this.planeOf(a)); return q >= a.x && q <= a.x + a.w && p.y >= a.y && p.y <= a.y + a.h; })?.id ?? null;
  }
  snap() { this.customers.snap(); }
  press(on, x, y) {
    const was = this.pressedId;
    this.pressedId = on ? this.hitTest(x, y) : null;
    const a = !on && was ? AREAS.find((q) => q.id === was) : null;
    if (a) {                                                     // let go: the piece springs back and a few sparkles pop out of it
      this.spring[a.id] = 0;
      for (let i = 0; i < 9; i++) this.sparks.push({ x: a.x + a.w * (0.2 + Math.random() * 0.6), y: a.y + a.h * (0.3 + Math.random() * 0.4), vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 90, life: 1, r: 2 + Math.random() * 2.5 });
    }
  }
  select(id) { this.selected = id; }

  update(dt) {
    this.t += dt;
    // the look follows the finger and eases back to a slow idle sway, so the depth is visible without touching
    const idle = Math.sin(this.t * 0.35) * 0.45;
    this.lk += ((this.look !== 0 ? this.look : idle) - this.lk) * Math.min(1, dt * 3);
    this.customers.update(dt);
    this.staff.update(dt);
    for (const m of this.motes) { m.x += m.vx * dt; m.y += m.vy * dt; if (m.y < 100) { m.y = 740; m.x = -120 + ((m.x + 120) * 7.3) % 1620; } if (m.x > 1500) m.x -= 1620; }
    for (const id in this.spring) { this.spring[id] += dt; if (this.spring[id] > 1) delete this.spring[id]; }
    for (const p of this.sparks) { p.life -= dt * 1.6; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 180 * dt; }
    this.sparks = this.sparks.filter((p) => p.life > 0);
    for (const p of this.pops) p.life -= dt * 0.8;
    this.pops = this.pops.filter((p) => p.life > 0);
  }

  render(ctx) {
    const v = this.view, c = this.cam, k = v.scale * v.dpr * c.zoom, t = this.t;
    const floorPx = textFloor.px; textFloor.px = floorPx / c.zoom;           // canvas text keeps its ~12 screen px minimum under the zoom
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(k, 0, 0, k, c.tx * v.scale * v.dpr, c.ty * v.scale * v.dpr);
    const x0 = c.wl - 10, w = c.wr - c.wl + 20, yTop = c.wt - 10, yBot = c.wb + 10;

    this.cachedRoom(ctx, x0 - 60, w + 120, yTop, yBot, this.shift('wall'));   // wall and floor, cached (a little wider than the screen for the sway)
    ctx.save(); ctx.translate(this.shift('deco'), 0); this.decor(ctx); ctx.restore();
    this.shifted(ctx, 'floor', () => this.rug(ctx));
    // Everything that stands on the floor is drawn back to front by the line it stands on (its base y), so people pass in front of
    // or behind counters and tables correctly. Ties keep the DRAW_ORDER of the furniture.
    const items = [];
    for (const id of DRAW_ORDER) {
      if (id === '_staff') { items.push({ y: STAFF_LANE_Y, draw: () => this.shifted(ctx, 'kitchen', () => this.staff.drawBaker(ctx)) }); continue; }
      const a = AREAS.find((x) => x.id === id);
      if (!this.tableOpen(a)) continue;
      items.push({ y: depthOf(a), draw: () => this.shifted(ctx, this.planeOf(a), () => this.drawArea(ctx, a)) });
    }
    items.push({ y: this.staff.waiter.y, draw: () => this.shifted(ctx, 'floor', () => this.staff.drawWaiter(ctx)) }, ...this.customers.items(t).map((it) => ({ y: it.y, draw: (c2) => this.shifted(c2, 'floor', () => it.draw(c2)) })));
    items.map((it, i) => [it, i]).sort((p, q) => p[0].y - q[0].y || p[1] - q[1]).forEach(([it]) => it.draw(ctx));
    this.shifted(ctx, 'floor', () => this.staff.drawServed(ctx));
    for (const a of AREAS) if (this.tableOpen(a)) this.shifted(ctx, this.planeOf(a), () => this.overlay(ctx, a));
    this.shifted(ctx, 'floor', () => this.customers.drawBubbles(ctx, t));
    this.shifted(ctx, 'deco', () => this.light(ctx));
    this.shifted(ctx, 'front', () => this.frontDecor(ctx));

    for (const p of this.pops) { // completion pops
      ctx.globalAlpha = clamp(p.life * 1.5, 0, 1);
      label(ctx, p.text, p.x - (p.icon ? 18 : 0), p.y - (1 - p.life) * 60, { font: '700 34px sans-serif', fill: PAL.cream, lw: 5 });
      if (p.icon) drawIcon(ctx, p.icon, p.x + 22, p.y - (1 - p.life) * 60, 44);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.sparks) { ctx.fillStyle = `rgba(255,222,150,${clamp(p.life, 0, 1) * 0.9})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, 7); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    gradeScreen(ctx, { warm: 0.12, vignette: 0.1, floorFade: 0.05 });
    textFloor.px = floorPx;
  }

  /** Runs `fn` with the drawing moved sideways by the parallax of `plane`. */
  shifted(ctx, plane, fn) { const d = this.shift(plane); ctx.save(); ctx.translate(d, 0); fn(); ctx.restore(); }

  drawArea(ctx, a) {
    ctx.save();
    const sp = this.spring[a.id], b = sp === undefined ? 0 : Math.exp(-7 * sp) * Math.sin(sp * 22) * 0.04;   // damped bounce after a tap
    if (this.pressedId === a.id || sp !== undefined) {
      const px = this.pressedId === a.id ? 0.975 : 1 + b * -0.5, py = this.pressedId === a.id ? 0.96 : 1 + b;
      ctx.translate(a.x + a.w / 2, a.y + a.h); ctx.scale(px, py); ctx.translate(-(a.x + a.w / 2), -(a.y + a.h));
    }
    if (!this.areaAsset(ctx, a)) ART[a.id]?.(ctx, a, this);
    ctx.restore();
  }

  /**
   * A table with its two chairs as separate pieces: each table has its own chair offsets and tilt, the chair a guest uses is pulled out
   * while they walk up and slid in when they sit, and a mirrored table swaps the chairs' roles.
   */
  tableSet(ctx, a, tableImg, dx, dy, w, h) {
    const i = +a.id.slice(5) - 1, tw = CHAIRS[i % CHAIRS.length], s = w / 1000;
    const owner = this.game.cafe?.tableOwner(i), v = owner ? this.customers.v.get(owner.id) : null;
    const seat = v && v.sit > 0 ? getImage(`seat-${v.look}`) : null;
    if (seat) {                                                 // an occupied table: the guest's own seated picture fades in over the empty table
      const r = seatRect(a, seat);
      ctx.globalAlpha = 1 - v.sit;
      this.drawEmptyTable(ctx, a, tableImg, dx, dy, w, h, tw, s, null);
      ctx.globalAlpha = v.sit;
      this.castShadow(ctx, `seat-${v.look}`, seat, r.x, r.y, r.w, r.h);
      if (r.flip) { ctx.save(); ctx.translate(r.x + r.w, 0); ctx.scale(-1, 1); ctx.drawImage(seat, 0, r.y, r.w, r.h); ctx.restore(); } else ctx.drawImage(seat, r.x, r.y, r.w, r.h);
      ctx.globalAlpha = 1;
      return;
    }
    this.drawEmptyTable(ctx, a, tableImg, dx, dy, w, h, tw, s, v);
  }

  drawEmptyTable(ctx, a, tableImg, dx, dy, w, h, tw, s, v) {
    const i = +a.id.slice(5) - 1, owner = this.game.cafe?.tableOwner(i);
    const near = !!(v && (v.moving || v.sit > 0 || owner.state === 'seated'));
    const sit = v ? v.sit ?? 0 : 0;
    const side = a.side ?? -1;                                   // the chair the guest uses
    const slide = near ? 14 * (1 - sit) - 5 * sit : 0;           // out while walking up, in when seated
    // the three pieces are separate pictures: sizes follow the table (460 units wide of a 1000-unit set), all standing on one baseline
    const f = (580 / tableImg.naturalWidth) * s, base = dy + h;
    const tW = tableImg.naturalWidth * f, tH = tableImg.naturalHeight * f;
    const pieces = [];
    for (const [key, cx] of [['chair-left', 165], ['chair-right', 835]]) {
      const img = getImage(`int-${key}`), t = tw[key === 'chair-left' ? 0 : 1];
      const guest = (key === 'chair-left') === (side === -1), cw = img.naturalWidth * f * 0.78, ch = img.naturalHeight * f * 0.78;       // chairs are drawn a bit smaller than the table's scale (the picture drew them large)
      const px = dx + cx * s + t.dx * 1.6 + (guest ? slide * (key === 'chair-left' ? -1 : 1) : 0);
      pieces.push({ key, img, x: px - cw / 2, y: base - ch + t.dy, w: cw, h: ch, rot: t.rot, pivot: px });
    }
    for (const p of pieces) this.castShadow(ctx, p.key, p.img, p.x, p.y, p.w, p.h);
    this.castShadow(ctx, 'table', tableImg, dx + 500 * s - tW / 2, base - tH, tW, tH);
    for (const p of pieces) {                                    // chairs stand behind the table
      ctx.save(); ctx.translate(p.pivot, base); ctx.rotate(p.rot); ctx.translate(-p.pivot, -base);
      ctx.drawImage(p.img, p.x, p.y, p.w, p.h);
      ctx.restore();
    }
    ctx.drawImage(tableImg, dx + 500 * s - tW / 2, base - tH, tW, tH);
  }

  /** Thrown shadow of a piece of furniture: its silhouette, tinted, flattened and leaning right (cached once per piece). */
  castShadow(ctx, key, img, dx, dy, w, h) {
    const K = 0.55, S = 0.2, by = dy + h;                       // lean per unit of height, depth squash (the shadow falls back and to the right)
    const ck = `${key}:${Math.round(w)}x${Math.round(h)}`;
    this.shadows ??= {};
    let c = this.shadows[ck];
    if (!c) {
      const ox = dx - 12, oy = by - S * h - 14, cw = Math.ceil(w + K * h + 24), ch = Math.ceil(S * h + 20);
      const cv = createCanvas(cw, ch), g = cv.getContext('2d');
      g.setTransform(1, 0, -K, S, K * by - ox, by * (1 - S) - oy);
      g.filter = 'shadow-tint blur(3px)';
      g.drawImage(img, dx, dy, w, h);
      c = this.shadows[ck] = { cv, ox: ox - dx, oy: oy - by };
    }
    const keep = ctx.globalAlpha;
    ctx.globalAlpha = keep * 0.45;
    ctx.drawImage(c.cv, dx + c.ox, by + c.oy);
    ctx.globalAlpha = keep;
  }

  /**
   * Draws the supplied art for an area (assets/interior/<id>.webp; the three tables share 'table') fitted inside the area's box,
   * standing on its bottom edge. Returns false when there is no art, so the procedural drawing is used. Live details (oven fire,
   * showcase stock) are drawn on top so the machines still show what they are doing.
   */
  areaAsset(ctx, a) {
    const img = getImage(`int-${a.id.startsWith('table') ? 'table' : a.id}`);
    if (!img) return false;
    const isTable = a.id.startsWith('table') && getImage('int-chair-left') && getImage('int-chair-right');
    let w, h, dx, dy;
    if (isTable) { w = a.w; h = w * 0.524; dx = a.x; dy = a.y + a.h - h; }   // a table set is a 1000 x 524 unit box (table + two chairs), see drawEmptyTable
    else {
      const s = Math.min(a.w / img.naturalWidth, a.h / img.naturalHeight); w = img.naturalWidth * s;
      h = Math.min(img.naturalHeight * s * 1.18, a.h);        // a very flat piece may be stretched up to 18% taller to fill its box
      dx = a.x + (a.w - w) / 2; dy = a.y + a.h - h;
    }
    // grounding: the object's own silhouette thrown across the floor (see castShadow; tables and chairs cast their own), plus a
    // tight dark line where the base touches the floor and a faint wider pool of occlusion
    if (!isTable) this.castShadow(ctx, a.id, img, dx, dy, w, h);
    shadow(ctx, a.x + a.w / 2 + 6, a.y + a.h + 2, w * 0.5, 9, 0.16);
    shadow(ctx, a.x + a.w / 2 + 2, a.y + a.h, w * 0.4, 3.5, 0.34);
    this.rects[a.id] = { x: dx, y: dy, w, h };
    if (isTable) this.tableSet(ctx, a, img, dx, dy, w, h);
    else if (a.flip) { ctx.save(); ctx.translate(dx + w, 0); ctx.scale(-1, 1); ctx.drawImage(img, 0, dy, w, h); ctx.restore(); }
    else ctx.drawImage(img, dx, dy, w, h);
    const busy = !!(a.station && this.game.jobs[a.station]);
    if (a.id === 'oven' && !busy) { ctx.globalCompositeOperation = 'lighter'; glowAt(ctx, a.x + a.w / 2, a.y + a.h * 0.62, a.w * 0.42, '255,140,50', 0.09 + 0.03 * Math.sin(this.t * 3)); ctx.globalCompositeOperation = 'source-over'; }   // embers
    if (a.id === 'oven') {                                       // embers and a thin smoke rising from the oven
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const p = (((this.t * (busy ? 0.55 : 0.3) + i / 7) % 1) + 1) % 1, ex = a.x + a.w * (0.3 + 0.4 * ((i * 0.37) % 1)) + Math.sin(p * 6 + i) * 8;
        ctx.fillStyle = `rgba(255,${150 + 60 * p | 0},70,${0.8 * (1 - p)})`; ctx.beginPath(); ctx.arc(ex, a.y + a.h * 0.5 - p * 90, 2.2 * (1 - p * 0.6), 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (a.id === 'coffee') steam(ctx, a.x + a.w * 0.5, dy + h * 0.42, this.t);
    if (a.id === 'showcase') this.glint(ctx, dx, dy, w, h);
    if (a.station && this.game.jobs[a.station]) { ctx.globalCompositeOperation = 'lighter'; glowAt(ctx, a.x + a.w / 2, a.y + a.h * 0.6, a.w * 0.6, '255,170,60', 0.3 + 0.08 * Math.sin(this.t * 9)); ctx.globalCompositeOperation = 'source-over'; }
    if (a.id === 'showcase') showcaseStock(ctx, a, this, { x: dx, y: dy, w, h });
    if (a.id === 'upgrades') upgradeCount(ctx, this, dx + w * 0.6, dy + h * 0.865);   // the sign's empty lower panel
    return true;
  }

  /** Back layer: shelves with jars and plates, plants and warm pendant lamps on the back wall (drawn over any wall art). */
  decor(ctx) {
    const wall = FLOOR_Y, deco = this.wallDecor(ctx);
    // two shelf rows along the wall behind the counters (only when the supplied shelf picture is missing)
    if (!getImage('int-shelf')) for (const [x0, x1, y] of [[320, 1030, 208], [320, 1030, 268]]) {
      ctx.fillStyle = PAL.brown; ctx.fillRect(x0, y, x1 - x0, 7);
      ctx.fillStyle = 'rgba(70,48,32,.35)'; ctx.fillRect(x0, y + 7, x1 - x0, 3);
      for (let x = x0 + 14; x < x1 - 20; x += 34) {
        const k = Math.round((x * 7) % 3);
        if (k === 0) { rrect(ctx, x, y - 24, 22, 24, 5); paint(ctx, PAL.vanilla, 2); ctx.fillStyle = PAL.honeyDark; ctx.fillRect(x + 3, y - 29, 16, 6); }
        else if (k === 1) { for (let i = 0; i < 3; i++) { rrect(ctx, x - 2, y - 7 - i * 5, 26, 5, 2); paint(ctx, PAL.creamLight, 1.5); } }
        else { rrect(ctx, x, y - 20, 22, 20, 4); paint(ctx, PAL.honey, 2); }
      }
    }
    // hanging copper lamps with a warm pool of light on the wall
    for (const lx of LAMPS) {
      ctx.strokeStyle = PAL.brownDark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, deco.beamBottom ?? this.cam.wt - 20); ctx.lineTo(lx, 128); ctx.stroke();
      poly(ctx, [[lx - 26, 156], [lx + 26, 156], [lx + 14, 128], [lx - 14, 128]]); paint(ctx, PAL.honeyDark, 2.5);
      ctx.beginPath(); ctx.arc(lx, 158, 7, 0, 7); ctx.fillStyle = PAL.vanilla; ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; glowAt(ctx, lx, 175, 120, '255,190,90', 0.16 + 0.03 * Math.sin(this.t * 2 + lx)); ctx.globalCompositeOperation = 'source-over';
    }
    // ceiling shade, so the wall gets darker toward the top like a lit room (starts above the screen so there is no visible edge)
    ctx.fillStyle = vgrad(ctx, -600, 250, [[0, 'rgba(121,82,56,.3)'], [0.7, 'rgba(121,82,56,.16)'], [1, 'rgba(121,82,56,0)']]);
    ctx.fillRect(this.cam.wl - 100, -600, this.cam.wr - this.cam.wl + 200, 850);
    // soft floor shadow where the wall meets the kitchen floor
    ctx.fillStyle = vgrad(ctx, wall, wall + 30, [[0, 'rgba(70,48,32,.28)'], [1, 'rgba(70,48,32,0)']]);
    ctx.fillRect(this.cam.wl - 100, wall, this.cam.wr - this.cam.wl + 200, 30);
  }

  /**
   * Supplied wall pieces, each drawn only when its picture exists, always keeping its aspect ratio: a ceiling beam across the room, the
   * rack above the oven, the shelf over the prep counter, two windows, and the green entrance door at the right end.
   * Returns where the lamps' cords should start (under the beam).
   */
  wallDecor(ctx) {
    const put = (key, cx, base, h) => {
      const img = getImage(`int-${key}`); if (!img) return false;
      const w = img.naturalWidth * h / img.naturalHeight;
      shadow(ctx, cx + 6, base + 2, w * 0.42, 6, 0.16);
      ctx.drawImage(img, cx - w / 2, base - h, w, h);
      return true;
    };
    const c = this.cam, beam = getImage('int-room') ? null : getImage('int-beam');          // the new room has its own beams
    if (beam) {                                                   // the plain middle of the beam, stretched along the wall
      const top = 22, h = 66, sx = beam.naturalWidth * 0.2, sw = beam.naturalWidth * 0.6;
      ctx.drawImage(beam, sx, 0, sw, beam.naturalHeight, c.wl - 20, top, c.wr - c.wl + 40, h);
      ctx.fillStyle = vgrad(ctx, top + h, top + h + 26, [[0, 'rgba(70,48,32,.22)'], [1, 'rgba(70,48,32,0)']]); ctx.fillRect(c.wl - 20, top + h, c.wr - c.wl + 40, 26);
    }
    // heights follow the people (a guest is ~250 px): door ~1.0x, windows 0.65-0.75x with their sills on one line (y ~290), even ~90 px gaps
    put('rack', 140, 172, 100);
    put('shelf', 500, 252, 165);
    put('window-shutter', 840, 290, 160);
    put('window-arch', 1112, 284, 190);
    put('door', 1470, 430, 255);
    return { beamBottom: beam ? 86 : null };
  }

  /** Warm pools of lamp light on counters and floor, drifting dust in the light, and soft depth haze. Additive, so it only brightens. */
  light(ctx) {
    ctx.globalCompositeOperation = 'lighter';
    for (const lx of LAMPS) {
      const f = 0.9 + 0.1 * Math.sin(this.t * 2.1 + lx);
      glowAt(ctx, lx, 330, 170, '255,196,110', 0.10 * f);
      glowAt(ctx, lx, 600, 210, '255,190,100', 0.075 * f);
    }
    if (getImage('int-window-arch')) {                         // daylight falling from the two windows onto the wall and floor
      for (const [x, top, w] of [[840, 200, 120], [1112, 190, 110]]) {
        const sway = 4 * Math.sin(this.t * 0.4 + x), g = ctx.createLinearGradient(0, top, 0, 560);
        g.addColorStop(0, 'rgba(255,238,190,.16)'); g.addColorStop(1, 'rgba(255,238,190,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w / 2, top); ctx.lineTo(x + w / 2, top); ctx.lineTo(x + w / 2 - 150 + sway, 560); ctx.lineTo(x - w / 2 - 150 + sway, 560); ctx.closePath(); ctx.fill();
      }
    }
    for (const m of []) {                                         // drifting dust motes removed (photographic)
      const a = 0.25 + 0.25 * Math.sin(this.t * 1.3 + m.p);
      ctx.fillStyle = `rgba(255,236,190,${a})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /** Front layer: two big leafy plants framing the bottom corners of the screen, a little blurred, in front of everyone. */
  frontDecor(ctx) {
    const c = this.cam, blur = 'filter' in ctx;                // depth of field: the nearest plants are soft (skipped where unsupported)
    // (the corner plants used to be blurred like a camera's depth of field; they are crisp now)
    if (false && blur) ctx.filter = 'blur(2.5px)';
    drawProp(ctx, 'pot_topiary', c.wl + 60, c.wb + 40, 150, { shade: false });
    drawProp(ctx, 'pot_topiary2', c.wr - 60, c.wb + 40, 150, { shade: false });
    if (blur) ctx.filter = 'none';
  }

  /** A woven rug lying flat on the floor in front of the counter: a perspective trapezoid with a border, stripes and fringe. */
  rug(ctx) {
    const cx = 720, y0 = 492, y1 = 590, w0 = 470, w1 = 560;
    const quad = (k) => { const a0 = w0 / 2 - k, a1 = w1 / 2 - k * 1.1, ya = y0 + k * 0.35, yb = y1 - k * 0.35; poly(ctx, [[cx - a0, ya], [cx + a0, ya], [cx + a1, yb], [cx - a1, yb]]); };
    ctx.save();
    ctx.globalAlpha = 0.9;
    quad(-6); ctx.fillStyle = 'rgba(70,48,32,.22)'; ctx.fill();                          // contact shadow
    for (let i = 0; i < 9; i++) { const x = cx - w1 / 2 + 8 + i * (w1 - 16) / 8; ctx.strokeStyle = PAL.cream; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y1 - 1); ctx.lineTo(x - 3, y1 + 7); ctx.stroke(); }   // fringe
    quad(0); ctx.fillStyle = PAL.terracotta; ctx.fill();
    quad(9); ctx.fillStyle = PAL.cream; ctx.fill();
    quad(15); ctx.fillStyle = PAL.honey; ctx.fill();
    quad(30); ctx.fillStyle = PAL.terracotta; ctx.fill();
    ctx.strokeStyle = 'rgba(245,230,200,.55)'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]);   // stitched diamonds along the middle
    for (let i = 0; i < 5; i++) { const x = cx - 180 + i * 90, y = (y0 + y1) / 2; poly(ctx, [[x - 28, y], [x, y - 14], [x + 28, y], [x, y + 14]]); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.restore();
  }

  /** A soft highlight sweeping across the showcase glass every few seconds. */
  glint(ctx, x, y, w, h) {
    const p = ((this.t * 0.16) % 1.7) - 0.35;
    if (p < 0 || p > 1) return;
    ctx.save(); ctx.beginPath(); ctx.rect(x + w * 0.05, y + h * 0.2, w * 0.9, h * 0.42); ctx.clip();
    const gx = x + w * p, g = ctx.createLinearGradient(gx - 30, 0, gx + 30, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.28)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.transform(1, 0, -0.35, 1, 0, 0); ctx.fillRect(gx - 30 + (y + h * 0.4) * 0.35, y, 60, h);
    ctx.restore();
  }

  /** Wall, wainscot, floor. */
  room(ctx, x0, w, yTop, yBot) {
    const wallImg = getImage('int-wall'), floorImg = getImage('int-floor');
    const tile = (img, y, h) => { const tw = (img.naturalWidth / img.naturalHeight) * h; for (let x = x0 - (((x0 % tw) + tw) % tw); x < x0 + w; x += tw) ctx.drawImage(img, x, y, tw + 1, h); };
    if (wallImg) tile(wallImg, yTop, FLOOR_Y - yTop);        // supplied wall art, repeated sideways (each piece falls back on its own)
    if (wallImg) {                                           // light, warm wall: a cream wash over the art, vanilla toward the floor
      ctx.fillStyle = vgrad(ctx, yTop, FLOOR_Y, [[0, 'rgba(245,230,200,.5)'], [1, 'rgba(232,210,168,.36)']]); ctx.fillRect(x0, yTop, w, FLOOR_Y - yTop);
    }
    else {
      ctx.fillStyle = vgrad(ctx, yTop, FLOOR_Y, [[0, PAL.cream], [1, PAL.honeyLight]]);
      ctx.fillRect(x0, yTop, w, FLOOR_Y - yTop);
      // wallpaper stripes
      ctx.fillStyle = 'rgba(201,154,97,.12)';
      for (let x = x0 - (x0 % 56); x < x0 + w; x += 56) ctx.fillRect(x, yTop, 22, FLOOR_Y - yTop - 70);
      // wood wainscot
      ctx.fillStyle = vgrad(ctx, FLOOR_Y - 76, FLOOR_Y, [[0, PAL.brown], [1, PAL.brownDark]]);
      ctx.fillRect(x0, FLOOR_Y - 76, w, 76);
      ctx.fillStyle = 'rgba(245,230,200,.35)'; ctx.fillRect(x0, FLOOR_Y - 76, w, 4);
      ctx.fillStyle = 'rgba(70,48,32,.45)';
      for (let x = x0 - (x0 % 70); x < x0 + w; x += 70) ctx.fillRect(x, FLOOR_Y - 72, 3, 68);
    }
    if (floorImg) {
      tile(floorImg, FLOOR_Y, yBot - FLOOR_Y);
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(201,154,97,.45)'; ctx.fillRect(x0, FLOOR_Y, w, yBot - FLOOR_Y);   // calm the orange so the floor sits behind the furniture
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(232,210,168,.22)'; ctx.fillRect(x0, FLOOR_Y, w, yBot - FLOOR_Y);   // vanilla wash: honey, not orange
      ctx.fillStyle = vgrad(ctx, FLOOR_Y, FLOOR_Y + 46, [[0, 'rgba(70,48,32,.4)'], [1, 'rgba(70,48,32,0)']]); ctx.fillRect(x0, FLOOR_Y, w, 46);   // wall meets floor
      return;
    }
    // floor planks
    ctx.fillStyle = vgrad(ctx, FLOOR_Y, yBot, [[0, PAL.honey], [1, PAL.brown]]);
    ctx.fillRect(x0, FLOOR_Y, w, yBot - FLOOR_Y);
    ctx.strokeStyle = 'rgba(70,48,32,.35)'; ctx.lineWidth = 2;
    for (let y = FLOOR_Y + 36; y < yBot; y += 44 + (y - FLOOR_Y) * 0.05) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke(); }
    for (let y = FLOOR_Y, row = 0; y < yBot; y += 44, row++) for (let x = x0 - (x0 % 180) + (row % 2) * 90; x < x0 + w; x += 180) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 44); ctx.stroke(); }
    // entrance mat on the right: customers walk in from here
    rrect(ctx, 1235, 522, 200, 46, 10); paint(ctx, vgrad(ctx, 522, 568, [[0, PAL.terracottaDark], [1, PAL.terracottaDark]]), 3);
    label(ctx, '▶ Giriş', 1335, 558, { font: '700 20px "Trebuchet MS", sans-serif', fill: PAL.vanilla, lw: 3 });
    ctx.fillStyle = vgrad(ctx, FLOOR_Y, FLOOR_Y + 40, [[0, 'rgba(70,48,32,.4)'], [1, 'rgba(70,48,32,0)']]);
    ctx.fillRect(x0, FLOOR_Y, w, 40);
  }

  /** The wall and floor never change, so they are painted once per screen size and then just copied (the multiply wash is costly). */
  cachedRoom(ctx, x0, w, yTop, yBot, dx = 0) {
    const cv = ctx.canvas, m = ctx.getTransform(), M = Math.ceil(60 * m.a);          // 60 world px of spare wall on each side for the sway
    const key = `${cv.width}x${cv.height}:${this.cam.tx.toFixed(1)}:${this.cam.ty.toFixed(1)}:${!!getImage('int-wall')}${!!getImage('int-floor')}${!!getImage('int-room')}`;
    if (this.roomKey !== key) {
      const c = createCanvas(cv.width + 2 * M, cv.height);
      this.roomCanvas = c;
      const g = c.getContext('2d');
      g.setTransform(m.a, m.b, m.c, m.d, m.e + M, m.f);
      if (getImage('int-room')) this.shell(g, x0, w, yTop, yBot); else this.room(g, x0, w, yTop, yBot);
      this.roomKey = key;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(this.roomCanvas, dx * m.a - M, 0); ctx.setTransform(m);
  }

  /** The supplied empty room, scaled to cover the visible world with its wall/floor join on FLOOR_Y; dark wood fills any spare edge. */
  shell(g, x0, w, yTop, yBot) {
    const img = getImage('int-room'), ratio = img.naturalHeight / img.naturalWidth, jn = ROOM.join;
    const sc = Math.max((w + 20) / img.naturalWidth, (yBot - FLOOR_Y) / (img.naturalHeight * (1 - jn)), (FLOOR_Y - yTop) / (img.naturalHeight * jn));
    const iw = img.naturalWidth * sc, ih = img.naturalHeight * sc, x = x0 + w / 2 - iw / 2 - 0, y = FLOOR_Y - ih * jn;
    g.fillStyle = PAL.honeyDark; g.fillRect(x0, yTop, w, yBot - yTop);
    g.drawImage(img, x, y, iw, ih);
  }

  /** Tables beyond the cafeTables upgrade level are not there yet (unless a guest from an older save still sits at one). */
  tableOpen(a) {
    if (!a.id.startsWith('table')) return true;
    const i = +a.id.slice(5) - 1, cafe = this.game.cafe;
    return !cafe || i < cafe.tableCount() || !!cafe.tableOwner(i);
  }

  /**
   * Name tag (only while the area is selected or pressed, so the room stays calm) and, for machines, a small progress bar
   * that sits on top of the object.
   */
  overlay(ctx, a) {
    const sel = this.selected === a.id, tagOn = sel || this.pressedId === a.id;
    const cx = a.x + a.w / 2, rect = this.rects[a.id], top = rect?.y ?? a.y;    // the tag sits on the object, not on its empty box
    let barTop = top - 10;
    if (tagOn) {
      const text = a.label;
      ctx.font = fontCss(FONT);
      // `labelOn: 'front'` puts the tag on the object's front panel, leaving its top free (the baker's head shows above the counter)
      const tw = ctx.measureText(text).width + 28, th = Math.max(34, textFloor.px * 1.5), ty = a.labelOn === 'front' && rect ? rect.y + rect.h * 0.64 : top - 20;
      const lx = clamp(cx, this.cam.wl + tw / 2 + 8, this.cam.wr - tw / 2 - 8);   // keep the tag inside the screen
      rrect(ctx, lx - tw / 2, ty - th / 2, tw, th, th / 2);
      paint(ctx, sel ? vgrad(ctx, ty - th / 2, ty + th / 2, [[0, PAL.cream], [1, PAL.honey]]) : vgrad(ctx, ty - th / 2, ty + th / 2, [[0, PAL.creamLight], [1, PAL.vanilla]]), 2.5, sel ? PAL.honeyDark : PAL.brown);
      label(ctx, text, lx, ty + 1, { font: FONT, fill: PAL.brownDark, lw: 0 });
      if (a.labelOn !== 'front') barTop = ty - th / 2 - 8;
    }
    if (!a.station) return;
    const jobs = [...this.game.jobsOf(a.station)].sort((p, q) => this.game.remainingOf(p) - this.game.remainingOf(q));
    const bw = Math.min(a.w - 50, 170), many = jobs.length > 1, bh = Math.max(many ? 16 : 20, textFloor.px * 1.2), step = bh + 4;
    jobs.forEach((job, i) => {
      const by = barTop - bh - i * step, prog = 1 - this.game.remainingOf(job) / job.duration, rem = this.game.remainingOf(job);
      rrect(ctx, cx - bw / 2, by, bw, bh, bh / 2); paint(ctx, PAL.brownDark, 2.5);
      ctx.save(); rrect(ctx, cx - bw / 2 + 2, by + 2, bw - 4, bh - 4, bh / 2 - 2); ctx.clip();
      ctx.fillStyle = vgrad(ctx, by, by + bh, [[0, PAL.greenLight], [1, PAL.green]]); ctx.fillRect(cx - bw / 2, by, bw * prog, bh);
      ctx.restore();
      const def = this.game.productsDef[job.product];
      const tx = cx + 10, hasIcon = drawIcon(ctx, job.product, cx - 30, by + bh / 2, bh * 1.1);
      label(ctx, hasIcon ? formatTime(rem) : `${def.icon} ${formatTime(rem)}`, hasIcon ? tx : cx, by + bh / 2 + 1, { font: `700 ${many ? 13 : 15}px sans-serif`, fill: PAL.paper, lw: 4 });
    });
    if (a.station && this.game.capacity(a.station) > 1) label(ctx, `${jobs.length}/${this.game.capacity(a.station)}`, a.x + a.w - 22, a.y + 20, { font: '700 20px sans-serif', fill: PAL.creamLight, lw: 4 });
  }
}

// ---------------------------------------------------------------------------------------- placeholder art
const ART = {
  oven(ctx, a, scene) {
    const { x, y, w, h } = a, active = !!scene.game.jobs.oven;
    shadow(ctx, x + w / 2, y + h + 4, w * 0.55, 12, 0.3);
    rrect(ctx, x, y + 60, w, h - 60, 14); paint(ctx, vgrad(ctx, y, y + h, [[0, PAL.honey], [1, PAL.brown]]), 3.5);
    ctx.save(); rrect(ctx, x, y + 60, w, h - 60, 14); ctx.clip();      // brick pattern
    ctx.strokeStyle = 'rgba(70,48,32,.45)'; ctx.lineWidth = 2;
    for (let r = 0; r < 12; r++) { const yy = y + 60 + r * 22; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); for (let c = (r % 2) * 25; c < w; c += 50) { ctx.beginPath(); ctx.moveTo(x + c, yy); ctx.lineTo(x + c, yy + 22); ctx.stroke(); } }
    ctx.restore();
    // chimney hood
    poly(ctx, [[x + 40, y + 60], [x + w - 40, y + 60], [x + w - 80, y], [x + 80, y]]); paint(ctx, vgrad(ctx, y, y + 60, [[0, PAL.brown], [1, PAL.brownDark]]), 3);
    // mouth
    const mx = x + 55, my = y + 135, mw = w - 110, mh = 130;
    ctx.beginPath(); ctx.moveTo(mx, my + mh); ctx.lineTo(mx, my + 40); ctx.quadraticCurveTo(mx + mw / 2, my - 30, mx + mw, my + 40); ctx.lineTo(mx + mw, my + mh); ctx.closePath();
    paint(ctx, active ? vgrad(ctx, my, my + mh, [[0, PAL.vanilla], [0.5, PAL.honey], [1, PAL.honeyDark]]) : PAL.brownDark, 4);
    if (active) { glowAt(ctx, x + w / 2, my + 70, 170, '255,170,60', 0.45 + 0.1 * Math.sin(scene.t * 9)); flames(ctx, mx, my + mh, mw, scene.t); }
    else { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(mx + 6, my + 50, mw - 12, 30); }
    rrect(ctx, mx - 10, my + mh - 6, mw + 20, 16, 5); paint(ctx, PAL.brown, 2.5);
  },
  counter(ctx, a) {
    const { x, y, w, h } = a;
    shadow(ctx, x + w / 2, y + h + 4, w * 0.55, 10, 0.3);
    rrect(ctx, x, y + 40, w, h - 40, 10); paint(ctx, vgrad(ctx, y + 40, y + h, [[0, PAL.honeyDark], [1, PAL.brownDark]]), 3.5);
    ctx.fillStyle = 'rgba(70,48,32,.4)'; ctx.fillRect(x + 14, y + 66, w - 28, h - 90);
    rrect(ctx, x - 8, y + 24, w + 16, 22, 8); paint(ctx, vgrad(ctx, y + 24, y + 46, [[0, PAL.cream], [1, PAL.honey]]), 3);   // marble top
    // dough, rolling pin, flour sack
    ctx.beginPath(); ctx.ellipse(x + 90, y + 16, 38, 16, 0, 0, 7); paint(ctx, PAL.vanilla, 2.5);
    rrect(ctx, x + 150, y + 6, 80, 14, 7); paint(ctx, PAL.honeyDark, 2.5);
    ctx.beginPath(); ctx.ellipse(x + 270, y + 12, 22, 14, 0, 0, 7); paint(ctx, PAL.paper, 2.5);
  },
  showcase(ctx, a, scene) {
    const { x, y, w, h } = a;
    shadow(ctx, x + w / 2, y + h + 4, w * 0.55, 10, 0.3);
    rrect(ctx, x, y + 120, w, h - 120, 10); paint(ctx, vgrad(ctx, y + 120, y + h, [[0, PAL.honeyDark], [1, PAL.brownDark]]), 3.5);
    rrect(ctx, x + 6, y + 30, w - 12, 94, 8); paint(ctx, vgrad(ctx, y + 30, y + 124, [[0, PAL.creamLight], [1, PAL.creamLight]]), 3);   // glass case
    ctx.fillStyle = 'rgba(255,255,255,.28)'; poly(ctx, [[x + 20, y + 32], [x + 70, y + 32], [x + 30, y + 122], [x + 14, y + 122]]); ctx.fill();
    showcaseStock(ctx, a, scene);
    rrect(ctx, x - 6, y + 14, w + 12, 18, 6); paint(ctx, PAL.terracotta, 3);   // canopy
  },
  coffee(ctx, a, scene) {
    const { x, y, w, h } = a, active = !!scene.game.jobs.coffee;
    shadow(ctx, x + w / 2, y + h + 4, w * 0.6, 10, 0.3);
    rrect(ctx, x, y + 150, w, h - 150, 10); paint(ctx, vgrad(ctx, y + 150, y + h, [[0, PAL.honeyDark], [1, PAL.brownDark]]), 3.5);                 // counter
    rrect(ctx, x + 12, y + 30, w - 24, 125, 12); paint(ctx, vgrad(ctx, y + 30, y + 155, [[0, PAL.vanilla], [1, PAL.honeyDark]]), 3.5);           // machine body
    rrect(ctx, x + 24, y + 12, w - 48, 30, 8); paint(ctx, PAL.brownDark, 3);
    for (const dx of [38, w - 52]) { ctx.beginPath(); ctx.arc(x + dx, y + 78, 12, 0, 7); paint(ctx, active ? PAL.honey : PAL.terracottaLight, 2.5); }
    rrect(ctx, x + w / 2 - 28, y + 100, 56, 14, 4); paint(ctx, PAL.brownDark, 2.5);
    rrect(ctx, x + w / 2 - 18, y + 118, 36, 32, 5); paint(ctx, PAL.paper, 2.5);   // cup
    if (active) { ctx.fillStyle = PAL.brown; ctx.fillRect(x + w / 2 - 15, y + 130 - (scene.game.progress('coffee') * 12), 30, 18 + scene.game.progress('coffee') * 12 - 6); steam(ctx, x + w / 2, y + 112, scene.t); }
  },
  storage(ctx, a) {
    const { x, y, w, h } = a;
    shadow(ctx, x + w / 2, y + h + 4, w * 0.6, 9, 0.3);
    for (const [bx, by, bw, bh] of [[x, y + 70, 60, 80], [x + 36, y + 30, 58, 70], [x + 4, y + 8, 50, 70]]) {
      rrect(ctx, bx, by, bw, bh, 5); paint(ctx, vgrad(ctx, by, by + bh, [[0, PAL.honey], [1, PAL.brown]]), 3);
      ctx.strokeStyle = 'rgba(70,48,32,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, by + bh / 2); ctx.lineTo(bx + bw, by + bh / 2); ctx.stroke();
    }
    rrect(ctx, x + 40, y + 100, 52, 50, 8); paint(ctx, vgrad(ctx, y + 100, y + 150, [[0, PAL.creamLight], [1, PAL.honey]]), 3);   // flour sack
  },
  upgrades(ctx, a, scene) {
    const { x, y, w, h } = a, cx = x + w / 2;
    shadow(ctx, cx, y + h + 4, 40, 6, 0.2);
    ctx.fillStyle = PAL.brownDark; ctx.fillRect(cx - 4, y, 8, 26);                    // hanging bracket
    rrect(ctx, x + 4, y + 26, w - 8, h - 40, 10); paint(ctx, vgrad(ctx, y + 26, y + h, [[0, PAL.honey], [1, PAL.brown]]), 3.5);
    rrect(ctx, x + 12, y + 34, w - 24, h - 56, 6); paint(ctx, PAL.creamLight, 2);
    if (!drawIcon(ctx, 'arrow', cx, y + 64, 48)) label(ctx, '⬆', cx, y + 66, { font: '700 44px sans-serif', fill: PAL.green, lw: 4 });
    upgradeCount(ctx, scene, cx, y + 104);
  },
  table1: (ctx, a) => drawTable(ctx, a),
  table2: (ctx, a) => drawTable(ctx, a),
  table3: (ctx, a) => drawTable(ctx, a),
  table4: (ctx, a) => drawTable(ctx, a),
};

/** "bought / total" upgrade levels as small dark text. */
function upgradeCount(ctx, scene, x, y) {
  const total = Object.values(scene.game.upgrades).reduce((s, n) => s + n, 0), max = Object.keys(scene.game.upgrades).reduce((s, id) => s + scene.game.maxLevel(id), 0);
  label(ctx, `${total}/${max}`, x, y, { font: '700 17px "Trebuchet MS", sans-serif', fill: PAL.brownDark, lw: 0 });
}

/** Stock icons in the showcase glass: one small pile per product in stock. */
function showcaseStock(ctx, a, scene, art = null) {
  // a stock chip per product in stock on the wooden front of the showcase (the glass already shows the goods)
  const r = art ?? { x: a.x, y: a.y, w: a.w, h: a.h };
  const items = Object.entries(scene.game.productsDef).filter(([id]) => scene.game.products[id] > 0);
  const step = Math.min(70, (r.w * 0.82) / Math.max(1, items.length));
  items.forEach(([id, def], i) => {
    const cx = r.x + r.w / 2 + (i - (items.length - 1) / 2) * step, cy = r.y + r.h * 0.865;
    rrect(ctx, cx - 30, cy - 14, 60, 28, 14); paint(ctx, 'rgba(70,48,32,.85)', 1.5, PAL.honeyLight);
    if (!drawIcon(ctx, id, cx - 13, cy, 22)) label(ctx, def.icon, cx - 13, cy, { font: '15px sans-serif', fill: PAL.paper, lw: 0 });
    label(ctx, `${scene.game.products[id]}`, cx + 13, cy + 1, { font: '700 14px sans-serif', fill: PAL.paper, lw: 0 });
  });
}

function drawTable(ctx, a) {
  const cx = a.x + a.w / 2, y = a.y + a.h;
  shadow(ctx, cx, y - 6, 100, 14, 0.28);
  for (const dx of [-95, 95]) { // chairs
    rrect(ctx, cx + dx - 22, y - 120, 44, 80, 8); paint(ctx, vgrad(ctx, y - 120, y - 40, [[0, PAL.honeyDark], [1, PAL.brown]]), 3);
    rrect(ctx, cx + dx - 30, y - 50, 60, 18, 6); paint(ctx, PAL.terracotta, 3);
    for (const lx of [-22, 22]) { ctx.fillStyle = PAL.brownDark; ctx.fillRect(cx + dx + lx - 4, y - 34, 8, 30); }
  }
  ctx.fillStyle = PAL.brownDark; ctx.fillRect(cx - 8, y - 90, 16, 84);
  ctx.beginPath(); ctx.ellipse(cx, y - 8, 46, 12, 0, 0, 7); paint(ctx, PAL.brownDark, 2.5);
  ctx.beginPath(); ctx.ellipse(cx, y - 100, 90, 22, 0, 0, 7); paint(ctx, vgrad(ctx, y - 124, y - 78, [[0, PAL.cream], [1, PAL.honeyLight]]), 3.5);
  ctx.beginPath(); ctx.ellipse(cx, y - 100, 90, 22, 0, 0, 7); ctx.strokeStyle = PAL.terracotta; ctx.lineWidth = 6; ctx.setLineDash([14, 10]); ctx.stroke(); ctx.setLineDash([]);
}

function flames(ctx, x, yBase, w, t) {
  for (let i = 0; i < 6; i++) {
    const fx = x + 20 + (i / 5) * (w - 40), fh = 40 + 18 * Math.sin(t * 8 + i * 1.7);
    ctx.beginPath(); ctx.moveTo(fx - 12, yBase); ctx.quadraticCurveTo(fx - 8, yBase - fh * 0.6, fx, yBase - fh); ctx.quadraticCurveTo(fx + 8, yBase - fh * 0.6, fx + 12, yBase); ctx.closePath();
    ctx.fillStyle = i % 2 ? PAL.honey : PAL.honey; ctx.fill();
  }
}

function steam(ctx, x, y, t) {
  for (let i = 0; i < 3; i++) {
    const p = (((t * 0.7 + i / 3) % 1) + 1) % 1;
    ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - p)})`;
    ctx.beginPath(); ctx.arc(x + Math.sin(p * 7 + i) * 8, y - p * 40, 4 + p * 6, 0, 7); ctx.fill();
  }
}
