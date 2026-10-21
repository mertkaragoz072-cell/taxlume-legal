// Cafe & bakery interior. Placeholder art drawn in code; every area is a tappable station (see interior-layout.js).
import { INK, rrect, poly, paint, vgrad, hgrad, shadow, lighten, darken, glowAt, label, clamp, fontCss, textFloor, gradeScreen } from '../util.js';
import { PAL } from '../palette.js';
import { AREAS, DRAW_ORDER, FLOOR_Y, CAM, WAITER_LANE_Y, STAFF_LANE_Y, areaAt, depthOf } from './interior-layout.js';
import { drawProp } from './props.js';
import { formatTime } from '../game/game.js';
import { getImage, drawIcon } from '../assets.js';
import { CustomerLayer } from './interior-customers.js';
import { StaffLayer } from './interior-staff.js';

/** Pendant lamps along the back wall, hung in the gaps between the wall pieces. */
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
    this.pops = [];             // floating "+1 Ekmek" texts
    this.view = null;
    this.cam = { zoom: CAM.zoom, tx: 0, ty: 0, wl: 0, wr: 1400, wt: 0, wb: 790 };   // zoomed-out camera, see resize()
    this.customers = new CustomerLayer(game, game.cafe);
    this.staff = new StaffLayer(game);
    this.staff.guests = () => this.customers.v.values();
    this.rects = {};            // where each area's art was actually drawn (labels follow it)
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
    const z = CAM.zoom, tx = view.vw / 2 - CAM.cx * z, ty = view.vh - CAM.bottomPad - CAM.baseY * z;
    this.cam = { zoom: z, tx, ty, wl: -tx / z, wr: (view.vw - tx) / z, wt: -ty / z, wb: (view.vh - ty) / z };
  }

  /** Pointer position in the design space used by main.js (origin shifted by view.ox/oy) -> world. */
  toWorld(x, y) { const c = this.cam, v = this.view; return { x: (x + v.ox - c.tx) / c.zoom, y: (y + v.oy - c.ty) / c.zoom }; }
  /** World -> the same pointer space (used by tests and debugging). */
  toScreen(x, y) { const c = this.cam, v = this.view; return { x: x * c.zoom + c.tx - v.ox, y: y * c.zoom + c.ty - v.oy }; }

  /** Customers (their order bubbles) take priority over the tables and machines they stand in front of. */
  hitTest(x, y) { const p = this.toWorld(x, y); return this.customers.hitTest(p.x, p.y) ?? areaAt(p.x, p.y)?.id ?? null; }
  snap() { this.customers.snap(); }
  press(on, x, y) { this.pressedId = on ? this.hitTest(x, y) : null; }
  select(id) { this.selected = id; }

  update(dt) {
    this.t += dt;
    this.customers.update(dt);
    this.staff.update(dt);
    for (const m of this.motes) { m.x += m.vx * dt; m.y += m.vy * dt; if (m.y < 100) { m.y = 740; m.x = -120 + ((m.x + 120) * 7.3) % 1620; } if (m.x > 1500) m.x -= 1620; }
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

    this.cachedRoom(ctx, x0, w, yTop, yBot);
    this.decor(ctx);
    // Everything that stands on the floor is drawn back to front by the line it stands on (its base y), so people pass in front of
    // or behind counters and tables correctly. Ties keep the DRAW_ORDER of the furniture.
    const items = [];
    for (const id of DRAW_ORDER) {
      if (id === '_staff') { items.push({ y: STAFF_LANE_Y, draw: () => this.staff.drawBaker(ctx) }); continue; }
      const a = AREAS.find((x) => x.id === id);
      if (!this.tableOpen(a)) continue;
      items.push({ y: depthOf(a), draw: () => this.drawArea(ctx, a) });
    }
    items.push({ y: this.staff.waiter.y, draw: () => this.staff.drawWaiter(ctx) }, ...this.customers.items(t));
    items.map((it, i) => [it, i]).sort((p, q) => p[0].y - q[0].y || p[1] - q[1]).forEach(([it]) => it.draw(ctx));
    for (const a of AREAS) if (this.tableOpen(a)) this.overlay(ctx, a);
    this.customers.drawBubbles(ctx, t);
    this.light(ctx);
    this.frontDecor(ctx);

    for (const p of this.pops) { // completion pops
      ctx.globalAlpha = clamp(p.life * 1.5, 0, 1);
      label(ctx, p.text, p.x - (p.icon ? 18 : 0), p.y - (1 - p.life) * 60, { font: '700 34px sans-serif', fill: PAL.cream, lw: 5 });
      if (p.icon) drawIcon(ctx, p.icon, p.x + 22, p.y - (1 - p.life) * 60, 44);
    }
    ctx.globalAlpha = 1;
    gradeScreen(ctx, { warm: 0.3, vignette: 0.3, floorFade: 0.12 });
    textFloor.px = floorPx;
  }

  drawArea(ctx, a) {
    ctx.save();
    if (this.pressedId === a.id) { ctx.translate(a.x + a.w / 2, a.y + a.h); ctx.scale(0.99, 0.99); ctx.translate(-(a.x + a.w / 2), -(a.y + a.h)); }
    if (!this.areaAsset(ctx, a)) ART[a.id]?.(ctx, a, this);
    ctx.restore();
  }

  /**
   * Draws the supplied art for an area (assets/interior/<id>.webp; the three tables share 'table') fitted inside the area's box,
   * standing on its bottom edge. Returns false when there is no art, so the procedural drawing is used. Live details (oven fire,
   * showcase stock) are drawn on top so the machines still show what they are doing.
   */
  areaAsset(ctx, a) {
    const img = getImage(`int-${a.id.startsWith('table') ? 'table' : a.id}`);
    if (!img) return false;
    const s = Math.min(a.w / img.naturalWidth, a.h / img.naturalHeight), w = img.naturalWidth * s;
    const h = Math.min(img.naturalHeight * s * 1.18, a.h);       // a very flat piece may be stretched up to 18% taller to fill its box
    // contact shadow: a wide soft one plus a tighter dark core, pushed a little to the right (light comes from the upper left)
    shadow(ctx, a.x + a.w / 2 + 10, a.y + a.h + 3, w * 0.54, 13, 0.30);
    shadow(ctx, a.x + a.w / 2 + 4, a.y + a.h + 1, w * 0.44, 6, 0.32);
    const dx = a.x + (a.w - w) / 2, dy = a.y + a.h - h;
    this.rects[a.id] = { x: dx, y: dy, w, h };
    ctx.drawImage(img, dx, dy, w, h);
    const busy = !!(a.station && this.game.jobs[a.station]);
    if (a.id === 'oven' && !busy) { ctx.globalCompositeOperation = 'lighter'; glowAt(ctx, a.x + a.w / 2, a.y + a.h * 0.62, a.w * 0.42, '255,140,50', 0.09 + 0.03 * Math.sin(this.t * 3)); ctx.globalCompositeOperation = 'source-over'; }   // embers
    if (a.id === 'coffee' && busy) steam(ctx, a.x + a.w * 0.5, dy + h * 0.42, this.t);
    if (a.id === 'showcase') this.glint(ctx, dx, dy, w, h);
    if (a.station && this.game.jobs[a.station]) { ctx.globalCompositeOperation = 'lighter'; glowAt(ctx, a.x + a.w / 2, a.y + a.h * 0.6, a.w * 0.6, '255,170,60', 0.3 + 0.08 * Math.sin(this.t * 9)); ctx.globalCompositeOperation = 'source-over'; }
    if (a.id === 'showcase') showcaseStock(ctx, a, this, { x: dx, y: dy, w, h });
    if (a.id === 'upgrades') upgradeCount(ctx, this, dx + w * 0.58, dy + h * 0.775);   // the sign's empty lower panel
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
    const c = this.cam, beam = getImage('int-beam');
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
    for (const m of this.motes) {
      const a = 0.25 + 0.25 * Math.sin(this.t * 1.3 + m.p);
      ctx.fillStyle = `rgba(255,236,190,${a})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /** Front layer: two big leafy plants framing the bottom corners of the screen, a little blurred, in front of everyone. */
  frontDecor(ctx) {
    const c = this.cam, blur = 'filter' in ctx;                // depth of field: the nearest plants are soft (skipped where unsupported)
    if (blur) ctx.filter = 'blur(2.5px)';
    drawProp(ctx, 'pot_topiary', c.wl + 60, c.wb + 40, 150, { shade: false });
    drawProp(ctx, 'pot_topiary2', c.wr - 60, c.wb + 40, 150, { shade: false });
    if (blur) ctx.filter = 'none';
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
  cachedRoom(ctx, x0, w, yTop, yBot) {
    const cv = ctx.canvas, key = `${cv.width}x${cv.height}:${this.cam.tx.toFixed(1)}:${this.cam.ty.toFixed(1)}:${!!getImage('int-wall')}${!!getImage('int-floor')}`;
    if (this.roomKey !== key) {
      const c = this.roomCanvas ?? (this.roomCanvas = document.createElement('canvas'));
      c.width = cv.width; c.height = cv.height;
      const g = c.getContext('2d'), m = ctx.getTransform();
      g.setTransform(m);
      this.room(g, x0, w, yTop, yBot);
      this.roomKey = key;
    }
    const m = ctx.getTransform();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(this.roomCanvas, 0, 0); ctx.setTransform(m);
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
  // `art` = where the supplied showcase image was drawn: the items then stand on its lower shelf, the counts on the wooden front
  const { x, y } = a;
  const iy = art ? art.y + art.h * 0.43 : y + 78, ly = art ? art.y + art.h * 0.58 : y + 110, step = art ? art.w * 0.2 : 76;
    let ix = art ? art.x + art.w * 0.17 : x + 28;
    for (const [id, def] of Object.entries(scene.game.productsDef)) {
      const n = scene.game.products[id];
      if (n > 0) { if (!drawIcon(ctx, id, ix, iy, 46)) { ctx.font = '34px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = PAL.brownDark; ctx.fillText(def.icon, ix, iy); } label(ctx, `×${n}`, ix, ly, { font: '700 14px sans-serif', fill: PAL.paper, lw: 4 }); }
      ix += step;
    }
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
