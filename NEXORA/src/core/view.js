import { CONFIG } from './config.js';

// Ekran boyutu ve gezegen ekran konumu. Portre ve yatay ekranlara uyar.
export const View = {
  w: 0, h: 0, dpr: 1, scale: 1, cx: 0, cy: 0, R: 0,
  resize(canvas) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth; this.h = window.innerHeight;
    canvas.width = Math.round(this.w * this.dpr);
    canvas.height = Math.round(this.h * this.dpr);
    this.scale = Math.min(this.w / 520, this.h / 640);
    this.R = CONFIG.planet.radius * this.scale;
    const top = this.h * 0.42;               // oyuncunun durduğu yüzey noktası
    this.cx = this.w / 2;
    this.cy = top + this.R;
  },
};
