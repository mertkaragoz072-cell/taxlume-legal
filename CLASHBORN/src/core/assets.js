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
// Kırpılmış kareler (tools/trim_frames.py): dosya yalnız opak sınır kutusunu içerir (bellek ~yarı). Görsel `width/height` ile ÖZGÜN tuvali bildirir (çizim kodu pivot/boyutu tuvale göre hesaplar)
// ve drawImage kırpılan boşluğu geri koyar → çizim kodu değişmeden çalışır. Boyut kayıtla eşleşmezse (dosya yeniden üretilmiş) kayıt yok sayılır.
const _draw = CanvasRenderingContext2D.prototype.drawImage;
CanvasRenderingContext2D.prototype.drawImage = function (img, a, b, c, d, e, f, g, h) {
  const t = img && img.__t; if (!t) return _draw.apply(this, arguments);
  const [W, H, ox, oy, tw, th] = t, n = arguments.length;
  if (n === 3) return _draw.call(this, img, a + ox, b + oy);
  if (n === 5) { const kx = c / W, ky = d / H; return _draw.call(this, img, a + ox * kx, b + oy * ky, tw * kx, th * ky); }
  const kx = g / c, ky = h / d, x0 = Math.max(a, ox), y0 = Math.max(b, oy), x1 = Math.min(a + c, ox + tw), y1 = Math.min(b + d, oy + th);   // 9 argüman: kaynak dikdörtgeni kırpılmış kutuyla kesişir
  if (x1 <= x0 || y1 <= y0) return;
  return _draw.call(this, img, x0 - ox, y0 - oy, x1 - x0, y1 - y0, e + (x0 - a) * kx, f + (y0 - b) * ky, (x1 - x0) * kx, (y1 - y0) * ky);
};
export const rawDraw = (g, img, x, y) => _draw.call(g, img, x, y);        // kırpma telafisi OLMADAN çizer (kırpılmış karenin ham bitmap'ini küçük tuvale kopyalamak için)
export const Assets = {
  images: {},
  async load(images = {}, trim = {}) {
    await Promise.all(Object.entries(images).map(([key, src]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const t = trim[key]; if (t && img.naturalWidth === t[4] && img.naturalHeight === t[5]) { img.__t = t; Object.defineProperty(img, 'width', { value: t[0] }); Object.defineProperty(img, 'height', { value: t[1] }); }
        this.images[key] = /^prop_rock/.test(key) ? warmRock(img) : img; resolve();
      };
      img.onerror = () => { console.warn('Asset yüklenemedi:', src); resolve(); };
      img.src = src;
    })));
  },
  get(key) { return this.images[key] || null; },
  // Önceden çözme: tarayıcı (özellikle iOS) PNG'yi ilk çizimde senkron çözer → her yeni animasyon karesinde takılma. img.decode() çözmeyi ana akıştan önce yaptırır.
  // `pick(key)` true dönen görseller çözülür; `limit` eşzamanlı iş sayısı.
  async warm(pick, limit = 8) {
    const q = Object.entries(this.images).filter(([k, im]) => pick(k) && im.decode); let i = 0;
    await Promise.all(Array.from({ length: Math.min(limit, q.length) }, async () => { while (i < q.length) { const im = q[i++][1]; try { await im.decode(); } catch (e) { /* çözülemeyen görsel çizimde yine denenir */ } } }));
    return q.length;
  },
  // Bellek: seçilmeyen kahramanın kare setleri (HD karelerde onlarca MB) çözülmüş bitmap olarak tutulmaz; `keep` listesindekiler (portre) kalır.
  release(prefixes, keep = []) { let n = 0; for (const k of Object.keys(this.images)) if (prefixes.some((p) => k.startsWith(p)) && !keep.includes(k)) { delete this.images[k]; n++; } return n; },
};
