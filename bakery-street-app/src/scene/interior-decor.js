// What the player has bought, shown in the café: decoration standing in its slots, equipment tiers on the stations, themes, the waiting-area
// posts, VIP marks, and the little reveal / first-use animations. It only READS the shop state every frame (src/game/shop.js), so a bought
// piece can never be missing from the scene: when a picture is not available a simple vector stand-in is drawn instead.
import { AREAS, DECOR_SLOTS, QUEUE_SPOTS, perspScale, CAM } from './interior-layout.js';
import { getImage } from '../assets.js';
import { createCanvas, clamp, shadow, glowAt, label } from '../util.js';
import { PAL } from '../palette.js';

/** How a better tier of a station looks until real art exists: scale, a tint over the picture, a gleam, and stars on a brass plaque. */
const TIER_LOOK = {
  2: { tint: 'rgba(255,170,70,.22)', scale: 1.03 },
  3: { tint: 'rgba(255,205,80,.24)', scale: 1.06 },
  4: { tint: 'rgba(110,190,255,.20)', scale: 1.09 },
};
const AREA_OF_LINE = { oven: 'oven', coffee: 'coffee', counter: 'counter', showcase: 'showcase', storage: 'storage' };
const LINE_OF_AREA = Object.fromEntries(Object.entries(AREA_OF_LINE).map(([l, a]) => [a, l]));
const easeOutBack = (k) => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

export class DecorLayer {
  /** @param {import('./interior-scene.js').InteriorScene} scene */
  constructor(scene) {
    this.scene = scene;
    this.game = scene.game;
    this.cache = {};            // tinted pictures
    this.born = {};             // item id -> seconds since it was bought (a pop-in)
    this.reveals = [];          // { x, y, t, text } rings and labels for something just bought
    this.intros = [];           // { areaId, t, text } first use of new equipment
    this.petals = Array.from({ length: 30 }, (_, i) => ({ x: (i * 137) % 900, y: (i * 211) % 1700, v: 28 + (i % 7) * 7, s: 3 + (i % 4), p: i * 1.3 }));
    const g = this.game;
    g.on('shop', ({ item }) => this.onBought(item));
    g.on('shopIntro', ({ item, line }) => this.onIntro(item, line));
    g.on('stage', () => { this.reveals.push({ x: CAM.w / 2, y: 330, t: 0, text: this.game.shop?.stage().name ?? '', big: true }); scene.burst(CAM.w / 2, 330, 26, 520); });
  }

  get shop() { return this.game.shop; }
  imgOf(d) { return d.art?.image ? getImage(`int-${d.art.image}`) : null; }

  // ---- events ---------------------------------------------------------------------------------
  /** Where on the world an item is (for its reveal ring). */
  pointOf(d) {
    const s = this.scene;
    const area = (id) => AREAS.find((a) => a.id === id);
    const mid = (a) => (a ? { x: a.x + a.w / 2, y: a.y + a.h * 0.5 } : { x: CAM.w / 2, y: 700 });
    if (d.slot && DECOR_SLOTS[d.slot]) { const sl = DECOR_SLOTS[d.slot]; return { x: sl.x, y: sl.y - (sl.h ?? 40) * perspScale(sl.y) * 0.5 }; }
    if (d.slot === 'tableTop') return mid(area('table1'));
    if (d.slot === 'theme') return { x: CAM.w / 2, y: 420 };
    if (d.kind === 'upgrade') return mid(area(`table${d.level + 2}`));
    if (d.line === 'waiting') return { x: QUEUE_SPOTS[0].x, y: QUEUE_SPOTS[0].y - 90 };
    if (d.line === 'vip') return { x: CAM.w / 2, y: 1200 };
    if (d.effect?.area === 'aisle') return { x: 450, y: 1150 };
    if (d.effect?.area === 'wall') return { x: 806, y: 350 };
    if (d.kind === 'recipe') return mid(area(this.game.productsDef[d.recipe]?.station === 'coffee' ? 'coffee' : 'oven'));
    if (d.line && AREA_OF_LINE[d.line]) return mid(area(AREA_OF_LINE[d.line]));
    return { x: CAM.w / 2, y: 700 };
  }

  onBought(d) {
    const p = this.pointOf(d), s = this.scene;
    this.born[d.id] = 0;
    this.reveals.push({ x: p.x, y: p.y, t: 0, text: d.kind === 'recipe' ? `Yeni tarif: ${d.name.replace(' Tarifi', '')}` : d.name });
    s.burst(p.x, p.y + s.warpAt(p.y), d.kind === 'equipment' ? 22 : 14, 120);
    const areaId = d.line && AREA_OF_LINE[d.line];
    if (areaId) s.spring[areaId] = 0;
  }

  onIntro(d, line) {
    const areaId = AREA_OF_LINE[line]; if (!areaId) return;
    const a = AREAS.find((x) => x.id === areaId);
    this.intros.push({ areaId, t: 0, text: d.name });
    this.scene.spring[areaId] = 0;
    this.scene.burst(a.x + a.w / 2, a.y + a.h * 0.45, 26, a.w * 0.8);
  }

  update(dt) {
    for (const id of Object.keys(this.born)) { this.born[id] += dt; if (this.born[id] > 1) delete this.born[id]; }
    for (const r of this.reveals) r.t += dt;
    this.reveals = this.reveals.filter((r) => r.t < (r.big ? 3.2 : 2.6));
    for (const i of this.intros) i.t += dt;
    this.intros = this.intros.filter((i) => i.t < 2.2);
  }

  /** Scale of a piece that was just bought (pops in with a little overshoot), else 1. */
  pop(id) { const t = this.born[id]; return t === undefined ? 1 : Math.max(0.01, easeOutBack(clamp(t / 0.55, 0, 1))); }

  // ---- equipment tiers --------------------------------------------------------------------------
  tinted(key, img, color) {
    const ck = `${key}|${color}`;
    let c = this.cache[ck];
    if (!c) {
      const w = img.naturalWidth, h = img.naturalHeight, cv = createCanvas(w, h), g = cv.getContext('2d');
      g.drawImage(img, 0, 0, w, h);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = color; g.fillRect(0, 0, w, h);
      c = this.cache[ck] = cv;
    }
    return c;
  }

  /** The picture of a station, in the look of its owned tier (tier 1 = the plain picture). */
  drawTiered(ctx, a, img, dx, dy, w, h) {
    const line = LINE_OF_AREA[a.id], tier = line && this.shop ? this.shop.tier(line) : 1, look = TIER_LOOK[tier];
    const born = this.shop ? this.pop(this.shop.tierItem(line)?.id) : 1;
    if (!look) { ctx.drawImage(img, dx, dy, w, h); return; }
    const k = look.scale * (born < 1 || born > 1 ? born : 1), t = this.scene.t;
    ctx.save();
    ctx.translate(dx + w / 2, dy + h); ctx.scale(k, k); ctx.translate(-(dx + w / 2), -(dy + h));
    ctx.drawImage(this.tinted(a.id, img, look.tint), dx, dy, w, h);
    if (tier >= 3) {                                              // a slow gleam over the whole piece
      const glow = this.tinted(`${a.id}:glow`, img, 'rgba(255,255,255,.9)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.05 + 0.05 * Math.sin(t * 2.2 + dx);
      ctx.drawImage(glow, dx, dy, w, h);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    ctx.restore();
    this.plaque(ctx, dx + w / 2, dy + h - 6, tier);
    if (tier >= 4) {                                              // twinkles
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const p = (t * 0.6 + i * 0.25) % 1, px = dx + w * (0.15 + 0.7 * ((i * 0.37 + 0.1) % 1)), py = dy + h * (0.2 + 0.5 * ((i * 0.61) % 1));
        ctx.fillStyle = `rgba(200,240,255,${0.8 * Math.sin(p * Math.PI)})`; ctx.beginPath(); ctx.arc(px, py, 3 + 3 * Math.sin(p * Math.PI), 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /** A small brass plaque with one star per tier above the first, on the front of the station. */
  plaque(ctx, cx, y, tier) {
    const n = tier - 1, w = 18 + n * 22, h = 22;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - w / 2, y - h / 2, w, h, 8) : ctx.rect(cx - w / 2, y - h / 2, w, h);
    ctx.fillStyle = PAL.honeyDark; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = PAL.brownDark; ctx.stroke();
    for (let i = 0; i < n; i++) this.star(ctx, cx + (i - (n - 1) / 2) * 20, y, 8, '#FFE08A');
  }
  star(ctx, x, y, r, fill) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r, px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }

  // ---- decoration --------------------------------------------------------------------------------
  placed(kind) { return (this.shop?.placedItems() ?? []).filter((d) => DECOR_SLOTS[d.slot]?.kind === kind); }

  /** Rugs and mats lying on the floor (drawn under the furniture and the people). */
  drawFlat(ctx) {
    if (this.shop?.has('areaAisle')) this.drawAisle(ctx);
    for (const d of this.placed('flat')) {
      const sl = DECOR_SLOTS[d.slot], img = this.imgOf(d), k = perspScale(sl.y), w = sl.w * k * this.pop(d.id), wy = this.scene.warpAt(sl.y);
      if (img) { const h = w * img.naturalHeight / img.naturalWidth; ctx.drawImage(img, sl.x - w / 2, sl.y - h / 2 + wy, w, h); }
      else {                                                       // stand-in: a plain woven mat
        const h = w * 0.4;
        ctx.fillStyle = 'rgba(184,95,59,.9)'; ctx.beginPath(); ctx.ellipse(sl.x, sl.y + wy, w / 2, h / 2, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = PAL.cream; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sl.x, sl.y + wy, w * 0.4, h * 0.36, 0, 0, 7); ctx.stroke();
      }
    }
  }

  /** The aisle as its own section once its area is bought: a polished strip with a thin border and brass studs in the corners. */
  drawAisle(ctx) {
    const y0 = 905, y1 = 1405, x0 = 340, x1 = 560, wy0 = this.scene.warpAt(y0), wy1 = this.scene.warpAt(y1), pop = this.pop('areaAisle');
    ctx.save();
    ctx.globalAlpha = Math.min(1, pop);
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y0 + wy0, x1 - x0, y1 + wy1 - y0 - wy0, 26) : ctx.rect(x0, y0 + wy0, x1 - x0, y1 + wy1 - y0 - wy0);
    ctx.fillStyle = 'rgba(255,238,196,.13)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,246,222,.42)'; ctx.stroke();
    for (const [x, y, w] of [[x0 + 14, y0 + 14, wy0], [x1 - 14, y0 + 14, wy0], [x0 + 14, y1 - 14, wy1], [x1 - 14, y1 - 14, wy1]]) { ctx.beginPath(); ctx.arc(x, y + w, 5, 0, 7); ctx.fillStyle = '#E3B64E'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = PAL.brownDark; ctx.stroke(); }
    ctx.restore();
  }

  /** Things standing on the floor and the waiting-area posts: depth-sorted with the people by the scene ({ y, draw }). */
  items() {
    const out = [];
    for (const d of this.placed('stand')) {
      const sl = DECOR_SLOTS[d.slot];
      out.push({ y: sl.y, draw: (ctx) => this.drawStanding(ctx, d, sl) });
    }
    const q = this.shop?.queueBonus() ?? 0;
    if (q > 0) out.push({ y: 805, draw: (ctx) => this.drawPosts(ctx, q) });
    return out;
  }

  drawStanding(ctx, d, sl) {
    const img = this.imgOf(d), k = perspScale(sl.y), h = sl.h * k, pop = this.pop(d.id);
    ctx.save();
    ctx.translate(sl.x, sl.y); ctx.scale(pop, pop); ctx.translate(-sl.x, -sl.y);
    if (img) {
      const w = h * img.naturalWidth / img.naturalHeight, dx = sl.x - w / 2, dy = sl.y - h;
      this.scene.castShadow(ctx, `decor-${d.id}`, img, dx, dy, w, h);
      this.scene.grounding(ctx, sl.x, sl.y, w * 0.7);
      ctx.drawImage(img, dx, dy, w, h);
    } else {                                                       // stand-in: a clay pot with leaves
      const w = h * 0.7;
      this.scene.grounding(ctx, sl.x, sl.y, w * 0.8);
      ctx.fillStyle = '#B85F3B'; ctx.beginPath(); ctx.moveTo(sl.x - w * 0.3, sl.y - h * 0.35); ctx.lineTo(sl.x + w * 0.3, sl.y - h * 0.35); ctx.lineTo(sl.x + w * 0.2, sl.y); ctx.lineTo(sl.x - w * 0.2, sl.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = PAL.green; for (const [dx, dy, r] of [[-0.25, -0.55, 0.22], [0.2, -0.65, 0.25], [0, -0.85, 0.24]]) { ctx.beginPath(); ctx.ellipse(sl.x + dx * w, sl.y + dy * h, r * w, r * h * 0.8, 0, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }

  /** Brass posts and a rope along the places where guests wait (the waiting-area expansion). */
  drawPosts(ctx, q) {
    const y = 806, xs = q >= 2 ? [196, 422, 648] : [236, 608], sc = perspScale(y);
    const post = (x) => {
      shadow(ctx, x + 4, y + 2, 18 * sc, 5, 0.25);
      ctx.fillStyle = '#E3B64E'; ctx.fillRect(x - 3 * sc, y - 62 * sc, 6 * sc, 62 * sc);
      ctx.beginPath(); ctx.arc(x, y - 64 * sc, 8 * sc, 0, 7); ctx.fillStyle = '#F4CF73'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = PAL.brownDark; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, y, 13 * sc, 5 * sc, 0, 0, 7); ctx.fillStyle = '#C79A2E'; ctx.fill();
    };
    for (let i = 0; i < xs.length - 1; i++) {                       // a sagging rope between the posts
      const x0 = xs[i], x1 = xs[i + 1];
      ctx.strokeStyle = PAL.terracotta; ctx.lineWidth = 6 * sc; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, y - 56 * sc); ctx.quadraticCurveTo((x0 + x1) / 2, y - 36 * sc, x1, y - 56 * sc); ctx.stroke();
    }
    for (const x of xs) post(x);
  }

  /** Shelves on the back wall. */
  drawWall(ctx) {
    if (this.shop?.has('areaWall')) {                              // the wooden display panel the shelves hang on
      const x = 732, y = 244, w = 148, h = 214, pop = Math.min(1, this.pop('areaWall'));
      ctx.save(); ctx.globalAlpha = pop;
      shadow(ctx, x + w / 2 + 3, y + h + 4, w * 0.5, 6, 0.2);
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, 10) : ctx.rect(x, y, w, h);
      ctx.fillStyle = '#B07C48'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = PAL.brown; ctx.stroke();
      ctx.strokeStyle = 'rgba(70,48,32,.35)'; ctx.lineWidth = 2;
      for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x + (w / 5) * i, y + 4); ctx.lineTo(x + (w / 5) * i, y + h - 4); ctx.stroke(); }
      ctx.restore();
    }
    for (const d of this.placed('wall')) {
      const sl = DECOR_SLOTS[d.slot], img = this.imgOf(d), pop = this.pop(d.id);
      ctx.save(); ctx.translate(sl.x, sl.y); ctx.scale(pop, pop); ctx.translate(-sl.x, -sl.y);
      if (img) {
        const w = sl.w, h = w * img.naturalHeight / img.naturalWidth;
        shadow(ctx, sl.x + 4, sl.y + 3, w * 0.4, 5, 0.18);
        ctx.drawImage(img, sl.x - w / 2, sl.y - h, w, h);
      } else { ctx.fillStyle = PAL.brown; ctx.fillRect(sl.x - sl.w / 2, sl.y - 10, sl.w, 8); }
      ctx.restore();
    }
  }

  /** Pendant lamps hanging in the aisle (front layer): the picture on a cord that fades into the air, plus a warm pool of light on the floor. */
  drawHang(ctx) {
    const t = this.scene.t;
    for (const d of this.placed('hang')) {
      const sl = DECOR_SLOTS[d.slot], img = this.imgOf(d), k = perspScale(sl.y), h = sl.h * k, w = img ? h * img.naturalWidth / img.naturalHeight : h * 0.9, wy = this.scene.warpAt(sl.y), pop = this.pop(d.id);
      const top = sl.y - h + wy, sway = Math.sin(t * 0.9 + sl.y) * 2;
      ctx.save();
      ctx.translate(sl.x, sl.y + wy); ctx.scale(pop, pop); ctx.translate(-sl.x, -(sl.y + wy));
      const g = ctx.createLinearGradient(0, top - 120, 0, top + 6);
      g.addColorStop(0, 'rgba(70,48,32,0)'); g.addColorStop(1, 'rgba(70,48,32,.9)');
      ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sl.x, top - 120); ctx.lineTo(sl.x + sway * 0.3, top + 8); ctx.stroke();
      if (img) ctx.drawImage(img, sl.x - w / 2 + sway, top, w, h);
      else { ctx.fillStyle = '#C97A3A'; ctx.beginPath(); ctx.moveTo(sl.x - w * 0.4, top + h * 0.7); ctx.quadraticCurveTo(sl.x, top - h * 0.1, sl.x + w * 0.4, top + h * 0.7); ctx.closePath(); ctx.fill(); }
      ctx.globalCompositeOperation = 'lighter';
      glowAt(ctx, sl.x + sway, top + h * 0.8, 90 * k, '255,196,110', 0.2 + 0.04 * Math.sin(t * 2 + sl.y));
      glowAt(ctx, sl.x, sl.y + wy + 150, 140 * k, '255,190,100', 0.07);     // the pool on the floor below
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }
  }

  /** Theme particles over the whole room: spring petals or cosy snow with a warm glow. */
  drawTheme(ctx) {
    const theme = this.shop?.theme(), t = this.scene.t;
    if (!theme) return;
    const c = this.scene.cam, W = c.wr - c.wl, H = c.wb;
    ctx.save();
    for (const p of this.petals) {
      const x = c.wl + ((p.x + t * (theme === 'spring' ? p.v * 0.6 : p.v * 0.15) + Math.sin(t * 0.8 + p.p) * 25) % W + W) % W;
      const y = ((p.y + t * p.v * (theme === 'spring' ? 1 : 0.8)) % (H + 60)) - 30;
      if (theme === 'spring') { ctx.fillStyle = 'rgba(255,170,190,.85)'; ctx.beginPath(); ctx.ellipse(x, y, p.s * 1.6, p.s * 0.9, Math.sin(t + p.p) * 2, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(x, y, p.s * 0.7, 0, 7); ctx.fill(); }
    }
    if (theme === 'cozy') { ctx.globalCompositeOperation = 'lighter'; glowAt(ctx, 450, 700, 700, '255,170,80', 0.07); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
  }

  /** Rings, labels and spotlights for things just bought or used for the first time (drawn on top of everything). */
  drawFx(ctx) {
    const s = this.scene;
    for (const r of this.reveals) {
      const k = clamp(r.t / 1.1, 0, 1), y = r.y + s.warpAt(r.y), a = (1 - k) * (r.t < 0.2 ? r.t / 0.2 : 1);
      ctx.save();
      ctx.globalAlpha = clamp(a * 1.4, 0, 1);
      ctx.strokeStyle = r.big ? '#FFE08A' : PAL.paper; ctx.lineWidth = 8 * (1 - k) + 2;
      ctx.beginPath(); ctx.arc(r.x, y, (r.big ? 80 : 40) + k * (r.big ? 260 : 130), 0, 7); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter'; glowAt(ctx, r.x, y, 110 + k * 60, '255,226,140', 0.35 * (1 - k)); ctx.globalCompositeOperation = 'source-over';
      const lt = clamp(r.t / (r.big ? 3.2 : 2.6), 0, 1);
      ctx.globalAlpha = clamp(Math.min(1, r.t * 4) * (1 - Math.max(0, lt - 0.7) / 0.3), 0, 1);
      label(ctx, r.text, r.x, y - 70 - lt * 40, { font: `700 ${r.big ? 44 : 32}px sans-serif`, fill: PAL.cream, lw: 6 });
      ctx.restore();
    }
    for (const i of this.intros) {                                  // a light cone and the name over the equipment on its first use
      const a = AREAS.find((x) => x.id === i.areaId), k = clamp(i.t / 2.2, 0, 1), cx = a.x + a.w / 2, y = a.y + s.warpAt(a.y);
      ctx.save();
      ctx.globalAlpha = Math.sin(k * Math.PI);
      ctx.globalCompositeOperation = 'lighter';
      glowAt(ctx, cx, y + a.h * 0.5, a.w * 0.9, '255,230,150', 0.32);
      ctx.globalCompositeOperation = 'source-over';
      label(ctx, i.text, cx, y - 26 - k * 20, { font: '700 30px sans-serif', fill: PAL.cream, lw: 6 });
      ctx.restore();
    }
  }
}
