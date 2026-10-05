// Sprite yükleme sistemi. Çizim kodu Assets.get('anahtar') ile bakar; yoksa placeholder çizer.
// Görseller data/asset_manifest.json içindeki "images" tablosundan yüklenir (yol: proje köküne göre).
export const Assets = {
  images: {},
  async load(images = {}) {
    await Promise.all(Object.entries(images).map(([key, src]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.images[key] = img; resolve(); };
      img.onerror = () => { console.warn('Asset yüklenemedi:', src); resolve(); };
      img.src = src;
    })));
  },
  get(key) { return this.images[key] || null; },
};
