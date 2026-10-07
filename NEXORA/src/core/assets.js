// Sprite yükleme sistemi. Çizim kodu Assets.get('anahtar') ile bakar; yoksa placeholder çizer.
// Görseller data/asset_manifest.json içindeki "images" tablosundan yüklenir (yol: proje köküne göre).
// Taş sprite'ları mor-mavi geliyordu (paletin dışında): parlaklık korunup sıcak gri-kahveye çevrilir (bir kez, yüklemede).
function warmRock(img) {
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, cv.width, cv.height), px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    const l = 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2];
    px[i] = Math.min(255, l * 1.12 + 6); px[i + 1] = Math.min(255, l * 1.0 + 2); px[i + 2] = l * 0.82;     // ışık→sıcak, gölge→kahverengi
  }
  g.putImageData(d, 0, 0); return cv;
}
export const Assets = {
  images: {},
  async load(images = {}) {
    await Promise.all(Object.entries(images).map(([key, src]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.images[key] = /^prop_rock/.test(key) ? warmRock(img) : img; resolve(); };
      img.onerror = () => { console.warn('Asset yüklenemedi:', src); resolve(); };
      img.src = src;
    })));
  },
  get(key) { return this.images[key] || null; },
};
