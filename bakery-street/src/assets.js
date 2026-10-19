// Placeholder-art registry.
//
// Everything on the street is currently drawn procedurally by its own module.
// To swap in real artwork, drop a PNG/WebP into ./assets and set its path here.
// A module that calls drawAsset(key, ...) will use the image when present and
// fall back to its procedural drawing when the path is null.
export const MANIFEST = {
  bakery: 'assets/bakery.webp',   // final art (transparent WebP); the procedural drawing is the fallback
  bookshop: 'assets/bookshop.webp',
  market: 'assets/market.webp',
  'ground-walk-a': 'assets/ground-walk-a.webp',   // sidewalk slab strips (tile left-to-right)
  'ground-walk-b': 'assets/ground-walk-b.webp',
  'ground-plaza': 'assets/ground-plaza.webp',     // flat paving for the plaza
  'town-backdrop': 'assets/town-backdrop.webp',   // wide panorama, no alpha
};

const images = {};

export function loadAssets() {
  const jobs = Object.entries(MANIFEST)
    .filter(([, src]) => src)
    .map(([key, src]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { images[key] = img; resolve(); };
      img.onerror = () => resolve();
      img.src = src;
    }));
  return Promise.all(jobs);
}

export const getImage = (key) => images[key] ?? null;

/** Draw the registered image for `key`; returns false when none is available. */
export function drawAsset(ctx, key, x, y, w, h) {
  const img = images[key];
  if (!img) return false;
  ctx.drawImage(img, x, y, w, h);
  return true;
}
