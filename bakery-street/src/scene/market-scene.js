// Market screen background: a warm shop interior with the Market building art on the left.
// The shopping list itself is a DOM panel (ui/market.js) on the right.
import { DESIGN } from '../config.js';
import { getImage } from '../assets.js';
import { vgrad, shadow, glowAt, rrect, paint } from '../util.js';

export class MarketScene {
  constructor() { this.id = 'market'; this.t = 0; this.view = null; }
  resize(view) { this.view = view; }
  hitTest() { return null; }
  press() {}
  update(dt) { this.t += dt; }

  render(ctx) {
    const v = this.view, k = v.scale * v.dpr, t = this.t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(k, 0, 0, k, v.ox * k, v.oy * k);
    const x0 = -v.ox - 10, w = v.vw + 20, yTop = -v.oy - 10, yBot = v.vh - v.oy + 10, floor = 560;
    ctx.fillStyle = vgrad(ctx, yTop, floor, [[0, '#f6e2b4'], [1, '#e2c286']]); ctx.fillRect(x0, yTop, w, floor - yTop);
    ctx.fillStyle = 'rgba(150,100,40,.10)';
    for (let x = x0 - (x0 % 60); x < x0 + w; x += 60) ctx.fillRect(x, yTop, 24, floor - yTop);
    ctx.fillStyle = vgrad(ctx, floor, yBot, [[0, '#c9955c'], [1, '#97642f']]); ctx.fillRect(x0, floor, w, yBot - floor);
    ctx.strokeStyle = 'rgba(60,28,6,.35)'; ctx.lineWidth = 2;
    for (let y = floor + 40; y < yBot; y += 48) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke(); }
    // the Market building, big on the left
    const img = getImage('market');
    if (img) {
      const h = 520, iw = (img.naturalWidth / img.naturalHeight) * h, x = 250 - iw / 2, y = floor + 70 - h;
      shadow(ctx, x + iw / 2, floor + 62, iw * 0.42, 14, 0.32);
      ctx.drawImage(img, x, y, iw, h);
      const flick = 0.85 + 0.15 * Math.sin(t * 2.3);
      ctx.globalCompositeOperation = 'lighter';
      glowAt(ctx, x + iw * 0.17, y + h * 0.56, 70, '255,190,80', 0.3 * flick);
      glowAt(ctx, x + iw * 0.84, y + h * 0.56, 70, '255,190,80', 0.3 * flick);
      ctx.globalCompositeOperation = 'source-over';
    } else { rrect(ctx, 80, 160, 340, 400, 12); paint(ctx, '#c08648', 3); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const g = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.45, W / 2, H * 0.5, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(40,15,0,0)'); g.addColorStop(1, 'rgba(40,15,0,.3)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}
