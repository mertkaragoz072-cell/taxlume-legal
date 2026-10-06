import { CONFIG } from './config.js';

// Ekran düzeni. Kamera yandan; gezegen çok büyük olduğundan yüzey yumuşak bir tepe gibi görünür.
// Kahraman ekranda solda (heroScreenX), düşmanlar sağdan gelir. Dünya birimi = oyun birimi (px değil).
export const View = {
  w: 0, h: 0, dpr: 1, dprCap: 3, scale: 1, cx: 0, cy: 0, R: 0,
  heroX: 0, heroY: 0, heroAngle: 0,       // kahramanın ekran konumu ve yüzeydeki ekran açısı (tepe noktasının solu)
  spanLeft: 0, spanRight: 0,              // kahramanın solunda/sağında görünen açı (radyan)
  visibleRightUnits: 0,                   // kahramanın sağında görünen mesafe (dünya birimi)
  resize(canvas) {
    const cam = CONFIG.camera;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    this.w = window.innerWidth; this.h = window.innerHeight;
    canvas.width = Math.round(this.w * this.dpr);
    canvas.height = Math.round(this.h * this.dpr);
    this.scale = Math.min(this.w / cam.visibleWidthUnits, this.h / cam.visibleHeightUnits);
    this.R = CONFIG.planet.radius * this.scale;
    this.heroX = this.w * cam.heroScreenX;
    this.heroY = this.h * cam.groundScreenY;
    this.cx = this.w / 2;                                   // tepe noktası ekran ortasında
    this.heroAngle = Math.asin((this.heroX - this.cx) / this.R);
    this.cy = this.heroY + this.R * Math.cos(this.heroAngle);
    const pad = 140 * this.scale;
    this.spanLeft = (this.heroX + pad) / this.R;
    this.spanRight = (this.w - this.heroX + pad) / this.R;
    this.visibleRightUnits = (this.w - this.heroX) / this.scale;
  },
};
