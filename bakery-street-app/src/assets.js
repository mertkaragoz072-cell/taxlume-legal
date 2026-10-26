import { EQUIPMENT_ART } from './data/economy.js';

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
  'char-boy_redcap': 'assets/characters/boy_redcap.webp',
  'char-girl_glasses': 'assets/characters/girl_glasses.webp',
  'char-oldman': 'assets/characters/oldman.webp',
  'char-chef_oven': 'assets/characters/chef_oven.webp',   // the chef putting bread in the oven (one-shot)
  'char-chef_coffee': 'assets/characters/chef_coffee.webp',   // the chef making a coffee (one-shot)
  'char-chef': 'assets/characters/chef.webp',
  'char-waiter_hand': 'assets/characters/waiter_hand.webp',   // the waiter handing a tray over (one-shot)
  'char-waiter': 'assets/characters/waiter.webp',   // the dining-room waiter (walk cycle)
  'ground-walk-a': 'assets/ground-walk-a.webp',   // sidewalk slab strips (tile left-to-right)
  'ground-walk-b': 'assets/ground-walk-b.webp',
  'town-backdrop': 'assets/town-backdrop.webp',   // wide panorama, no alpha
  'explore-map': 'assets/explore-map.webp',       // Keşif parchment map (1600 px wide, 16:9; the three region spots sit on its left half)
};

// Street / scene props (assets/props/<name>.webp), registered under the key 'prop-<name>'.
export const PROPS = ['barrel', 'barrel2', 'barrel_flowers', 'bench_iron', 'bench_wood', 'bollard_black', 'bollard_gold', 'bollard_stone', 'cart',
  'chalkboard', 'crates', 'fountain', 'lamp', 'lamp_triple', 'planter_blue', 'planter_blue2', 'planter_box', 'planter_flowers', 'planter_flowers2',
  'planter_green', 'planter_wood', 'pot_flowers', 'pot_small', 'pot_topiary', 'pot_topiary2', 'urn'];
for (const name of PROPS) MANIFEST[`prop-${name}`] = `assets/props/${name}.webp`;

// Cafe interior art is drop-in: a name listed in INTERIOR_ART is loaded from assets/interior/<name>.webp and used by the scene instead of
// its own drawing. Names that are not listed are never requested (no 404 noise). Possible names: wall, floor, oven, counter, showcase,
// coffee, storage, upgrades, table, chair (see assets/interior/README.md).
export const INTERIOR_ART = ['oven', 'counter', 'showcase', 'coffee', 'storage', 'upgrades', 'table', 'wall', 'floor',
  'window-arch', 'window-shutter', 'shelf', 'door', 'rack', 'beam', 'chair-left', 'chair-right', 'room', 'lamp', 'rug-green', 'rug-runner', 'table-plain',
  'plant-1', 'plant-2', 'plant-3', 'shelf-plants', 'mat-paw', 'table-cake', 'table-cup'];     // the last seven are shop decoration (see interior-decor.js)   // the last six are wall decoration (see InteriorScene.decor)
for (const name of INTERIOR_ART) MANIFEST[`int-${name}`] = `assets/interior/${name}.webp`;
// Equipment tier pictures (EQUIPMENT_ART) are optional: a file that is not there yet is simply skipped (no warning, the station keeps its picture).
export const OPTIONAL_ART = new Set();
for (const tiers of Object.values(EQUIPMENT_ART)) for (const name of Object.values(tiers)) { MANIFEST[`int-${name}`] = `assets/interior/${name}.webp`; OPTIONAL_ART.add(`int-${name}`); }

// Item icons (assets/icons/<id>.webp, 256 px): products and ingredients, keyed 'icon-<id>'. The emoji in data/economy.js stay as the text
// fallback; ui/icon-swap.js shows these pictures in their place everywhere in the DOM, and canvas scenes draw them with drawIcon().
export const ICON_IDS = ['bread', 'croissant', 'cake', 'coffee', 'flour', 'butter', 'sugar', 'egg', 'milk', 'beans',
  'simit', 'latte', 'kurabiye', 'mocha', 'muffin', 'waffle'];     // the last six are the shop recipes (stand-in pictures from scripts/make_recipe_icons.py until real art arrives)
/** Currency / status pictures (coin, XP star, gem, gift, lock, stopwatch, check, up-arrow, basket) and the upgrade, building (b-), region (r-) and order-bar (o-) pictures; the upgrade (u-), research (r-) and quest (q-) pictures. */
export const UI_ICON_IDS = ['coin', 'xp', 'gem', 'gift', 'lock', 'timer', 'check', 'arrow', 'basket',
  'u-oven', 'u-speed', 'u-showcase', 'u-tables', 'r-knowledge', 'r-efficient', 'r-seller', 'r-culture', 'r-equipment', 'q-target', 'q-line', 'q-explorer',
  'b-bakery', 'b-market', 'b-bookshop', 'b-plot', 'r-meadow', 'r-forest', 'r-ruins', 'o-guests', 'o-waiting', 'o-order'];
for (const id of UI_ICON_IDS) MANIFEST[`icon-${id}`] = `assets/icons/${id}.webp`;
for (const id of ICON_IDS) MANIFEST[`icon-${id}`] = `assets/icons/${id}.webp`;

/** Seated guests with their own chair and table (assets/characters/seat-<look>.webp), drawn in place of the empty table while a guest sits. */
export const SEAT_LOOKS = [];   // the seated pictures were human guests; cats sit as their walking sprite until the seated cat pictures (Komut 5) arrive
for (const id of SEAT_LOOKS) MANIFEST[`seat-${id}`] = `assets/characters/seat-${id}.webp`;

const images = {};

/**
 * Loads every registered picture into Skia. Resolves with { failed } when all are done; a missing picture never blocks the game
 * (modules fall back to their own drawing).
 */
export async function loadAssets({ onProgress } = {}) {
  // native modules are loaded here, not at the top, so the game logic and its tests can import this file in plain Node
  const [{ Asset }, { Skia }, { GameImage }, { ASSET_MODULES }] = await Promise.all([import('expo-asset'), import('@shopify/react-native-skia'), import('./engine/ctx2d'), import('./generated/assetModules')]);
  const entries = Object.entries(MANIFEST).filter(([, src]) => src);
  let done = 0, failed = 0;
  // a handful at a time: decoding everything at once spikes memory on small phones
  const queue = [...entries];
  const worker = async () => {
    for (let e = queue.shift(); e; e = queue.shift()) {
      const [key, src] = e;
      if (OPTIONAL_ART.has(key) && ASSET_MODULES[src] === undefined) { done += 1; onProgress?.(done, entries.length); continue; }       // optional art that has not been made yet
      try {
        const mod = ASSET_MODULES[src];
        if (mod === undefined) throw new Error(`no module for ${src}`);
        const asset = Asset.fromModule(mod);
        await asset.downloadAsync();
        const data = await Skia.Data.fromURI(asset.localUri ?? asset.uri);
        const image = Skia.Image.MakeImageFromEncoded(data);
        if (!image) throw new Error(`could not decode ${src}`);
        images[key] = new GameImage(image);
      } catch (err) { failed += 1; console.warn('[assets]', key, String(err)); }
      done += 1; onProgress?.(done, entries.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return { failed, timedOut: false };
}

export const getImage = (key) => images[key] ?? null;
/** Registers a picture under a key (tests and tools use it to stand in for a loaded asset). */
export const registerImage = (key, img) => { images[key] = img; };
export const unregisterImage = (key) => { delete images[key]; };

/** Draw the registered image for `key`; returns false when none is available. */
export function drawAsset(ctx, key, x, y, w, h) {
  const img = images[key];
  if (!img) return false;
  ctx.drawImage(img, x, y, w, h);
  return true;
}

/** Draws the icon of product / ingredient `id` centred at (x, y), `size` px square. Returns false when the picture is missing. */
export function drawIcon(ctx, id, x, y, size) {
  const img = images[`icon-${id}`];
  if (!img) return false;
  const k = size / Math.max(img.width, img.height), w = img.width * k, h = img.height * k;
  ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  return true;
}

/** The icon picture of `id`, or its emoji when there is no picture (recipes bought in the shop have no picture yet). Draws nothing without either. */
export function drawIconOrEmoji(ctx, id, emoji, x, y, size) {
  if (drawIcon(ctx, id, x, y, size)) return true;
  if (!emoji) return false;
  ctx.save();
  ctx.font = `${Math.round(size * 0.82)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y + size * 0.04);
  ctx.restore();
  return true;
}
