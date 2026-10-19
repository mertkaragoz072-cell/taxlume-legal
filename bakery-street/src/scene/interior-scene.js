// Cafe & bakery interior. Placeholder art drawn in code; every area is a tappable station (see interior-layout.js).
import { DESIGN } from '../config.js';
import { INK, rrect, poly, paint, vgrad, hgrad, shadow, lighten, darken, glowAt, label, clamp, fontCss, textFloor } from '../util.js';
import { AREAS, WALL_Y, FLOOR_Y, areaAt } from './interior-layout.js';
import { formatTime } from '../game/game.js';
import { getImage } from '../assets.js';
import { CustomerLayer } from './interior-customers.js';

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
    this.customers = new CustomerLayer(game, game.cafe);
    game.on('complete', ({ station, product }) => {
      const area = AREAS.find((a) => a.station === station);
      this.pops.push({ x: area.x + area.w / 2, y: area.y + 20, text: `+1 ${game.productsDef[product].icon}`, life: 1 });
    });
  }

  resize(view) { this.view = view; }

  /** Customers (their order bubbles) take priority over the tables and machines they stand in front of. */
  hitTest(x, y) { return this.customers.hitTest(x, y) ?? areaAt(x, y)?.id ?? null; }
  snap() { this.customers.snap(); }
  press(on, x, y) { this.pressedId = on ? this.hitTest(x, y) : null; }
  select(id) { this.selected = id; }

  update(dt) {
    this.t += dt;
    this.customers.update(dt);
    for (const p of this.pops) p.life -= dt * 0.8;
    this.pops = this.pops.filter((p) => p.life > 0);
  }

  render(ctx) {
    const v = this.view, k = v.scale * v.dpr, t = this.t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(k, 0, 0, k, v.ox * k, v.oy * k);
    const x0 = -v.ox - 10, w = v.vw + 20, yTop = -v.oy - 10, yBot = v.vh - v.oy + 10;

    this.room(ctx, x0, w, yTop, yBot);
    for (const a of AREAS) {
      const press = this.pressedId === a.id ? 1.5 : 0;
      ctx.save();
      if (press) { ctx.translate(a.x + a.w / 2, a.y + a.h); ctx.scale(0.99, 0.99); ctx.translate(-(a.x + a.w / 2), -(a.y + a.h)); }
      if (!this.areaAsset(ctx, a)) ART[a.id]?.(ctx, a, this);
      ctx.restore();
    }
    for (const a of AREAS) this.overlay(ctx, a);
    this.customers.draw(ctx, t);

    for (const p of this.pops) { // completion pops
      ctx.globalAlpha = clamp(p.life * 1.5, 0, 1);
      label(ctx, p.text, p.x, p.y - (1 - p.life) * 60, { font: '700 34px sans-serif', fill: '#fff6c0', lw: 5 });
    }
    ctx.globalAlpha = 1;
    // soft vignette
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const g = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.45, W / 2, H * 0.5, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(40,15,0,0)'); g.addColorStop(1, 'rgba(40,15,0,.3)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
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
    shadow(ctx, a.x + a.w / 2, a.y + a.h + 4, w * 0.5, 10, 0.28);
    ctx.drawImage(img, a.x + (a.w - w) / 2, a.y + a.h - h, w, h);
    if (a.station && this.game.jobs[a.station]) { ctx.globalCompositeOperation = 'lighter'; glowAt(ctx, a.x + a.w / 2, a.y + a.h * 0.6, a.w * 0.6, '255,170,60', 0.3 + 0.08 * Math.sin(this.t * 9)); ctx.globalCompositeOperation = 'source-over'; }
    if (a.id === 'showcase') showcaseStock(ctx, a, this);
    return true;
  }

  /** Wall, wainscot, window, floor. */
  room(ctx, x0, w, yTop, yBot) {
    const wall = getImage('int-wall'), floor = getImage('int-floor');
    if (wall && floor) { // supplied wall and floor art, tiled sideways
      const tile = (img, y, h) => { const tw = (img.naturalWidth / img.naturalHeight) * h; for (let x = x0 - (((x0 % tw) + tw) % tw); x < x0 + w; x += tw) ctx.drawImage(img, x, y, tw + 1, h); };
      tile(wall, yTop, FLOOR_Y - yTop); tile(floor, FLOOR_Y, yBot - FLOOR_Y);
      return;
    }
    ctx.fillStyle = vgrad(ctx, yTop, FLOOR_Y, [[0, '#f6e2b4'], [1, '#e8c98c']]);
    ctx.fillRect(x0, yTop, w, FLOOR_Y - yTop);
    // wallpaper stripes
    ctx.fillStyle = 'rgba(190,130,60,.10)';
    for (let x = x0 - (x0 % 56); x < x0 + w; x += 56) ctx.fillRect(x, yTop, 22, FLOOR_Y - yTop - 70);
    // wood wainscot
    ctx.fillStyle = vgrad(ctx, FLOOR_Y - 76, FLOOR_Y, [[0, '#9a6234'], [1, '#6a3d1c']]);
    ctx.fillRect(x0, FLOOR_Y - 76, w, 76);
    ctx.fillStyle = 'rgba(255,225,170,.35)'; ctx.fillRect(x0, FLOOR_Y - 76, w, 4);
    ctx.fillStyle = 'rgba(40,16,4,.45)';
    for (let x = x0 - (x0 % 70); x < x0 + w; x += 70) ctx.fillRect(x, FLOOR_Y - 72, 3, 68);
    // two windows with warm daylight
    for (const wx of [440, 830]) {
      rrect(ctx, wx, 118, 150, 120, 8); paint(ctx, '#7a4824', 3);
      rrect(ctx, wx + 8, 126, 134, 104, 4); paint(ctx, vgrad(ctx, 126, 230, [[0, '#bfe4ff'], [1, '#ffeec0']]), 1.5);
      ctx.fillStyle = '#7a4824'; ctx.fillRect(wx + 73, 126, 4, 104); ctx.fillRect(wx + 8, 176, 134, 4);
    }
    // floor planks
    ctx.fillStyle = vgrad(ctx, FLOOR_Y, yBot, [[0, '#c18a52'], [1, '#97642f']]);
    ctx.fillRect(x0, FLOOR_Y, w, yBot - FLOOR_Y);
    ctx.strokeStyle = 'rgba(60,28,6,.35)'; ctx.lineWidth = 2;
    for (let y = FLOOR_Y + 36; y < yBot; y += 44 + (y - FLOOR_Y) * 0.05) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke(); }
    for (let y = FLOOR_Y, row = 0; y < yBot; y += 44, row++) for (let x = x0 - (x0 % 180) + (row % 2) * 90; x < x0 + w; x += 180) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 44); ctx.stroke(); }
    // entrance mat on the right: customers walk in from here
    rrect(ctx, 1235, 692, 200, 52, 10); paint(ctx, vgrad(ctx, 692, 744, [[0, '#8a2f2a'], [1, '#5a1c18']]), 3);
    label(ctx, '▶ Giriş', 1335, 735, { font: '700 20px "Trebuchet MS", sans-serif', fill: '#f6dd9a', lw: 3 });
    ctx.fillStyle = vgrad(ctx, FLOOR_Y, FLOOR_Y + 40, [[0, 'rgba(40,16,4,.4)'], [1, 'rgba(40,16,4,0)']]);
    ctx.fillRect(x0, FLOOR_Y, w, 40);
  }

  /** Name tag + progress bar over each area. */
  overlay(ctx, a) {
    if (a.id.startsWith('table') && this.game.cafe?.tableOwner(+a.id.slice(5) - 1)) return;   // the order bubble takes the label's place
    const cx = a.x + a.w / 2;
    const sel = this.selected === a.id;
    const text = a.label;
    ctx.font = fontCss(FONT);
    const tw = ctx.measureText(text).width + 28, ty = a.y - 22, th = Math.max(34, textFloor.px * 1.5);
    const lx = clamp(cx, tw / 2 + 8, DESIGN.w - tw / 2 - 8);          // keep the tag inside the screen (e.g. "Geliştirmeler" at the right edge)
    rrect(ctx, lx - tw / 2, ty - th / 2, tw, th, th / 2);
    paint(ctx, sel ? vgrad(ctx, ty - th / 2, ty + th / 2, [[0, '#fff2b8'], [1, '#ffc94a']]) : vgrad(ctx, ty - th / 2, ty + th / 2, [[0, '#fff6dc'], [1, '#f1d9a3']]), 2.5, sel ? '#c8861a' : '#9a6431');
    label(ctx, text, lx, ty + 1, { font: FONT, fill: '#4a2a12', lw: 0 });
    if (!a.station) return;
    const jobs = [...this.game.jobsOf(a.station)].sort((p, q) => this.game.remainingOf(p) - this.game.remainingOf(q));
    const bw = Math.min(a.w - 30, 220), many = jobs.length > 1, bh = Math.max(many ? 18 : 24, textFloor.px * 1.25), step = bh + 4;
    jobs.forEach((job, i) => {
      const by = ty + th / 2 + 17 + i * step, prog = 1 - this.game.remainingOf(job) / job.duration, rem = this.game.remainingOf(job);
      rrect(ctx, cx - bw / 2, by, bw, bh, bh / 2); paint(ctx, '#4a3a2a', 2.5);
      ctx.save(); rrect(ctx, cx - bw / 2 + 2, by + 2, bw - 4, bh - 4, bh / 2 - 2); ctx.clip();
      ctx.fillStyle = vgrad(ctx, by, by + bh, [[0, '#9be86a'], [1, '#3fa63a']]); ctx.fillRect(cx - bw / 2, by, bw * prog, bh);
      ctx.restore();
      const def = this.game.productsDef[job.product];
      label(ctx, `${def.icon} ${formatTime(rem)}`, cx, by + bh / 2 + 1, { font: `700 ${many ? 14 : 17}px sans-serif`, fill: '#fff', lw: 4 });
    });
    if (a.station && this.game.capacity(a.station) > 1) label(ctx, `${jobs.length}/${this.game.capacity(a.station)}`, a.x + a.w - 22, a.y + 20, { font: '700 20px sans-serif', fill: '#fff6dc', lw: 4 });
  }
}

// ---------------------------------------------------------------------------------------- placeholder art
const ART = {
  oven(ctx, a, scene) {
    const { x, y, w, h } = a, active = !!scene.game.jobs.oven;
    shadow(ctx, x + w / 2, y + h + 4, w * 0.55, 12, 0.3);
    rrect(ctx, x, y + 60, w, h - 60, 14); paint(ctx, vgrad(ctx, y, y + h, [[0, '#d98a58'], [1, '#9c4f2c']]), 3.5);
    ctx.save(); rrect(ctx, x, y + 60, w, h - 60, 14); ctx.clip();      // brick pattern
    ctx.strokeStyle = 'rgba(70,25,8,.45)'; ctx.lineWidth = 2;
    for (let r = 0; r < 12; r++) { const yy = y + 60 + r * 22; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); for (let c = (r % 2) * 25; c < w; c += 50) { ctx.beginPath(); ctx.moveTo(x + c, yy); ctx.lineTo(x + c, yy + 22); ctx.stroke(); } }
    ctx.restore();
    // chimney hood
    poly(ctx, [[x + 40, y + 60], [x + w - 40, y + 60], [x + w - 80, y], [x + 80, y]]); paint(ctx, vgrad(ctx, y, y + 60, [[0, '#6a625a'], [1, '#3a342f']]), 3);
    // mouth
    const mx = x + 55, my = y + 135, mw = w - 110, mh = 130;
    ctx.beginPath(); ctx.moveTo(mx, my + mh); ctx.lineTo(mx, my + 40); ctx.quadraticCurveTo(mx + mw / 2, my - 30, mx + mw, my + 40); ctx.lineTo(mx + mw, my + mh); ctx.closePath();
    paint(ctx, active ? vgrad(ctx, my, my + mh, [[0, '#ffe08a'], [0.5, '#ff9a3a'], [1, '#d6501a']]) : '#2a1812', 4);
    if (active) { glowAt(ctx, x + w / 2, my + 70, 170, '255,170,60', 0.45 + 0.1 * Math.sin(scene.t * 9)); flames(ctx, mx, my + mh, mw, scene.t); }
    else { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(mx + 6, my + 50, mw - 12, 30); }
    rrect(ctx, mx - 10, my + mh - 6, mw + 20, 16, 5); paint(ctx, '#6a625a', 2.5);
  },
  counter(ctx, a) {
    const { x, y, w, h } = a;
    shadow(ctx, x + w / 2, y + h + 4, w * 0.55, 10, 0.3);
    rrect(ctx, x, y + 40, w, h - 40, 10); paint(ctx, vgrad(ctx, y + 40, y + h, [[0, '#b27a44'], [1, '#6a3d1c']]), 3.5);
    ctx.fillStyle = 'rgba(40,16,4,.4)'; ctx.fillRect(x + 14, y + 66, w - 28, h - 90);
    rrect(ctx, x - 8, y + 24, w + 16, 22, 8); paint(ctx, vgrad(ctx, y + 24, y + 46, [[0, '#f4e2bc'], [1, '#c9a56c']]), 3);   // marble top
    // dough, rolling pin, flour sack
    ctx.beginPath(); ctx.ellipse(x + 90, y + 16, 38, 16, 0, 0, 7); paint(ctx, '#f2d59a', 2.5);
    rrect(ctx, x + 150, y + 6, 80, 14, 7); paint(ctx, '#c08648', 2.5);
    ctx.beginPath(); ctx.ellipse(x + 270, y + 12, 22, 14, 0, 0, 7); paint(ctx, '#fff6e0', 2.5);
  },
  showcase(ctx, a, scene) {
    const { x, y, w, h } = a;
    shadow(ctx, x + w / 2, y + h + 4, w * 0.55, 10, 0.3);
    rrect(ctx, x, y + 120, w, h - 120, 10); paint(ctx, vgrad(ctx, y + 120, y + h, [[0, '#b27a44'], [1, '#6a3d1c']]), 3.5);
    rrect(ctx, x + 6, y + 30, w - 12, 94, 8); paint(ctx, vgrad(ctx, y + 30, y + 124, [[0, '#d6efff'], [1, '#fff1cc']]), 3);   // glass case
    ctx.fillStyle = 'rgba(255,255,255,.28)'; poly(ctx, [[x + 20, y + 32], [x + 70, y + 32], [x + 30, y + 122], [x + 14, y + 122]]); ctx.fill();
    showcaseStock(ctx, a, scene);
    rrect(ctx, x - 6, y + 14, w + 12, 18, 6); paint(ctx, '#c93a2e', 3);   // canopy
  },
  coffee(ctx, a, scene) {
    const { x, y, w, h } = a, active = !!scene.game.jobs.coffee;
    shadow(ctx, x + w / 2, y + h + 4, w * 0.6, 10, 0.3);
    rrect(ctx, x, y + 150, w, h - 150, 10); paint(ctx, vgrad(ctx, y + 150, y + h, [[0, '#b27a44'], [1, '#6a3d1c']]), 3.5);                 // counter
    rrect(ctx, x + 12, y + 30, w - 24, 125, 12); paint(ctx, vgrad(ctx, y + 30, y + 155, [[0, '#d9d4cc'], [1, '#8a847c']]), 3.5);           // machine body
    rrect(ctx, x + 24, y + 12, w - 48, 30, 8); paint(ctx, '#3a342f', 3);
    for (const dx of [38, w - 52]) { ctx.beginPath(); ctx.arc(x + dx, y + 78, 12, 0, 7); paint(ctx, active ? '#ffc94a' : '#e8473d', 2.5); }
    rrect(ctx, x + w / 2 - 28, y + 100, 56, 14, 4); paint(ctx, '#26211d', 2.5);
    rrect(ctx, x + w / 2 - 18, y + 118, 36, 32, 5); paint(ctx, '#fffaf0', 2.5);   // cup
    if (active) { ctx.fillStyle = '#7a4320'; ctx.fillRect(x + w / 2 - 15, y + 130 - (scene.game.progress('coffee') * 12), 30, 18 + scene.game.progress('coffee') * 12 - 6); steam(ctx, x + w / 2, y + 112, scene.t); }
  },
  storage(ctx, a) {
    const { x, y, w, h } = a;
    shadow(ctx, x + w / 2, y + h + 4, w * 0.6, 9, 0.3);
    for (const [bx, by, bw, bh] of [[x, y + 70, 60, 80], [x + 36, y + 30, 58, 70], [x + 4, y + 8, 50, 70]]) {
      rrect(ctx, bx, by, bw, bh, 5); paint(ctx, vgrad(ctx, by, by + bh, [[0, '#c8915a'], [1, '#8a5a30']]), 3);
      ctx.strokeStyle = 'rgba(40,16,4,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, by + bh / 2); ctx.lineTo(bx + bw, by + bh / 2); ctx.stroke();
    }
    rrect(ctx, x + 40, y + 100, 52, 50, 8); paint(ctx, vgrad(ctx, y + 100, y + 150, [[0, '#fbf1d8'], [1, '#c9ac78']]), 3);   // flour sack
  },
  upgrades(ctx, a, scene) {
    const { x, y, w, h } = a, cx = x + w / 2;
    shadow(ctx, cx, y + h + 4, 40, 6, 0.2);
    ctx.fillStyle = '#6a3d1c'; ctx.fillRect(cx - 4, y, 8, 26);                    // hanging bracket
    rrect(ctx, x + 4, y + 26, w - 8, h - 40, 10); paint(ctx, vgrad(ctx, y + 26, y + h, [[0, '#d9a05a'], [1, '#8a5a2c']]), 3.5);
    rrect(ctx, x + 12, y + 34, w - 24, h - 56, 6); paint(ctx, '#fff3d0', 2);
    label(ctx, '⬆', cx, y + 66, { font: '700 44px sans-serif', fill: '#3fa63a', lw: 4 });
    const total = Object.values(scene.game.upgrades).reduce((s, n) => s + n, 0), max = Object.keys(scene.game.upgrades).reduce((s, id) => s + scene.game.maxLevel(id), 0);
    label(ctx, `${total}/${max}`, cx, y + 104, { font: '700 20px "Trebuchet MS", sans-serif', fill: '#6a3a14', lw: 0 });
  },
  table1: (ctx, a) => drawTable(ctx, a),
  table2: (ctx, a) => drawTable(ctx, a),
  table3: (ctx, a) => drawTable(ctx, a),
};

/** Stock icons in the showcase glass: one small pile per product in stock. */
function showcaseStock(ctx, a, scene) {
  const { x, y } = a;
    let ix = x + 28;
    for (const [id, def] of Object.entries(scene.game.productsDef)) {
      const n = scene.game.products[id];
      if (n > 0) { ctx.font = '34px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(def.icon, ix, y + 78); label(ctx, `×${n}`, ix, y + 110, { font: '700 17px sans-serif', fill: '#fff', lw: 4 }); }
      ix += 76;
    }
}

function drawTable(ctx, a) {
  const cx = a.x + a.w / 2, y = a.y + a.h;
  shadow(ctx, cx, y - 6, 100, 14, 0.28);
  for (const dx of [-95, 95]) { // chairs
    rrect(ctx, cx + dx - 22, y - 120, 44, 80, 8); paint(ctx, vgrad(ctx, y - 120, y - 40, [[0, '#c08648'], [1, '#8a5a2c']]), 3);
    rrect(ctx, cx + dx - 30, y - 50, 60, 18, 6); paint(ctx, '#d6382e', 3);
    for (const lx of [-22, 22]) { ctx.fillStyle = '#5a3a22'; ctx.fillRect(cx + dx + lx - 4, y - 34, 8, 30); }
  }
  ctx.fillStyle = '#5a3a22'; ctx.fillRect(cx - 8, y - 90, 16, 84);
  ctx.beginPath(); ctx.ellipse(cx, y - 8, 46, 12, 0, 0, 7); paint(ctx, '#3a2418', 2.5);
  ctx.beginPath(); ctx.ellipse(cx, y - 100, 90, 22, 0, 0, 7); paint(ctx, vgrad(ctx, y - 124, y - 78, [[0, '#f6e2bc'], [1, '#d6b078']]), 3.5);
  ctx.beginPath(); ctx.ellipse(cx, y - 100, 90, 22, 0, 0, 7); ctx.strokeStyle = '#d6382e'; ctx.lineWidth = 6; ctx.setLineDash([14, 10]); ctx.stroke(); ctx.setLineDash([]);
}

function flames(ctx, x, yBase, w, t) {
  for (let i = 0; i < 6; i++) {
    const fx = x + 20 + (i / 5) * (w - 40), fh = 40 + 18 * Math.sin(t * 8 + i * 1.7);
    ctx.beginPath(); ctx.moveTo(fx - 12, yBase); ctx.quadraticCurveTo(fx - 8, yBase - fh * 0.6, fx, yBase - fh); ctx.quadraticCurveTo(fx + 8, yBase - fh * 0.6, fx + 12, yBase); ctx.closePath();
    ctx.fillStyle = i % 2 ? '#ffb43a' : '#ff7a1a'; ctx.fill();
  }
}

function steam(ctx, x, y, t) {
  for (let i = 0; i < 3; i++) {
    const p = (((t * 0.7 + i / 3) % 1) + 1) % 1;
    ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - p)})`;
    ctx.beginPath(); ctx.arc(x + Math.sin(p * 7 + i) * 8, y - p * 40, 4 + p * 6, 0, 7); ctx.fill();
  }
}
