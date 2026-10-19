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
  'ground-walk-a': 'assets/ground-walk-a.webp',   // sidewalk slab strips (tile left-to-right)
  'ground-walk-b': 'assets/ground-walk-b.webp',
  'town-backdrop': 'assets/town-backdrop.webp',   // wide panorama, no alpha
};

// Street / scene props (assets/props/<name>.webp), registered under the key 'prop-<name>'.
export const PROPS = ['barrel', 'barrel2', 'barrel_flowers', 'bench_iron', 'bench_wood', 'bollard_black', 'bollard_gold', 'bollard_stone', 'cart',
  'chalkboard', 'crates', 'fountain', 'lamp', 'lamp_triple', 'planter_blue', 'planter_blue2', 'planter_box', 'planter_flowers', 'planter_flowers2',
  'planter_green', 'planter_wood', 'pot_flowers', 'pot_small', 'pot_topiary', 'pot_topiary2', 'urn'];
for (const name of PROPS) MANIFEST[`prop-${name}`] = `assets/props/${name}.webp`;

// Cafe interior art is drop-in: a name listed in INTERIOR_ART is loaded from assets/interior/<name>.webp and used by the scene instead of
// its own drawing. Names that are not listed are never requested (no 404 noise). Possible names: wall, floor, oven, counter, showcase,
// coffee, storage, upgrades, table, chair (see assets/interior/README.md).
export const INTERIOR_ART = [];
for (const name of INTERIOR_ART) MANIFEST[`int-${name}`] = `assets/interior/${name}.webp`;

const images = {};

/**
 * Loads every registered image. Resolves with { failed, timedOut } when all are done or after `timeoutMs`, whichever comes first;
 * a missing or slow image never blocks the game (modules fall back to their procedural drawing, late images appear when they arrive).
 */
export function loadAssets({ onProgress, timeoutMs = 12000 } = {}) {
  const entries = Object.entries(MANIFEST).filter(([, src]) => src);
  let done = 0, failed = 0;
  const step = () => { done += 1; onProgress?.(done, entries.length); };
  const jobs = entries.map(([key, src]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { images[key] = img; step(); resolve(); };
    img.onerror = () => { failed += 1; step(); resolve(); };
    img.src = src;
  }));
  const timeout = new Promise((resolve) => setTimeout(() => resolve(true), timeoutMs));
  return Promise.race([Promise.all(jobs).then(() => false), timeout]).then((timedOut) => ({ failed, timedOut }));
}

export const getImage = (key) => images[key] ?? null;

/** Draw the registered image for `key`; returns false when none is available. */
export function drawAsset(ctx, key, x, y, w, h) {
  const img = images[key];
  if (!img) return false;
  ctx.drawImage(img, x, y, w, h);
  return true;
}
