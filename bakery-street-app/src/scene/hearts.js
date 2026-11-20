// Little hearts that float up when the player pets a cat (town square and café). Vector only, no picture needed.
export class Hearts {
  constructor() { this.list = []; }
  /** A small burst of hearts at (x, y) in the scene's own units. */
  add(x, y, n = 5) {
    for (let i = 0; i < n; i++) this.list.push({ x: x + (Math.random() - 0.5) * 120, y: y - Math.random() * 40, vx: (Math.random() - 0.5) * 70, vy: -130 - Math.random() * 90, s: 0.7 + Math.random() * 0.6, life: 1 + i * 0.12, wob: Math.random() * 6 });
    if (this.list.length > 40) this.list.splice(0, this.list.length - 40);
  }
  update(dt) {
    for (const h of this.list) { h.life -= dt * 0.7; h.x += (h.vx + Math.sin(h.life * 6 + h.wob) * 18) * dt; h.y += h.vy * dt; }
    this.list = this.list.filter((h) => h.life > 0);
  }
  draw(ctx) {
    for (const h of this.list) {
      const a = Math.max(0, Math.min(1, h.life * 1.6)), r = 30 * h.s;
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(h.x, h.y);
      ctx.beginPath();
      ctx.moveTo(0, r * 0.9);
      ctx.bezierCurveTo(-r * 1.3, -r * 0.1, -r * 0.7, -r * 1.2, 0, -r * 0.45);
      ctx.bezierCurveTo(r * 0.7, -r * 1.2, r * 1.3, -r * 0.1, 0, r * 0.9);
      ctx.fillStyle = '#E8737F'; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = '#FFF4E8'; ctx.stroke();
      ctx.restore();
    }
  }
}
