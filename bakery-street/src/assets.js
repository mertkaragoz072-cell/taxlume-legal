// Artwork registry: every image the game draws, keyed by name.
//
// To replace artwork, drop a WebP/PNG into ./assets and change its path here.
// A module that calls drawAsset(key, ...) uses the image when it is loaded and
// falls back to its own procedural drawing when the image is missing.
export const MANIFEST = {
  bakery: 'assets/bakery.webp',   // final art (transparent WebP); the procedural drawing is the fallback
  bookshop: 'assets/bookshop.webp',
  market: 'assets/market.webp',
  'char-girl_basket': 'assets/characters/girl_basket.webp',
  'char-boy_cap': 'assets/characters/boy_cap.webp',
  'char-girl_red': 'assets/characters/girl_red.webp',
  'char-grandma': 'assets/characters/grandma.webp',
  'char-boy_backpack': 'assets/characters/boy_backpack.webp',   // walk-cycle strips
  'char-girl_hat': 'assets/characters/girl_hat.webp',
  'char-oldman': 'assets/characters/oldman.webp',
  'char-chef': 'assets/characters/chef.webp',
  'prop-bench_iron': 'assets/props/bench_iron.webp',
  'prop-bollard_black': 'assets/props/bollard_black.webp',
  'prop-bollard_stone': 'assets/props/bollard_stone.webp',
  'prop-lamp': 'assets/props/lamp.webp',
  'prop-planter_flowers': 'assets/props/planter_flowers.webp',
  'prop-planter_flowers2': 'assets/props/planter_flowers2.webp',
  'prop-pot_topiary': 'assets/props/pot_topiary.webp',
  'prop-urn': 'assets/props/urn.webp',
  'ground-walk-a': 'assets/ground-walk-a.webp',   // sidewalk slab strips (tile left-to-right)
  'ground-walk-b': 'assets/ground-walk-b.webp',
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
