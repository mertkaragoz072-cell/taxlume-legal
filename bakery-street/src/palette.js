// The art-direction palette: one place for every colour the game paints with.
//
// Six base colours (the standard) and tones derived from them by mixing, never typed by hand elsewhere:
//   canvas drawing  -> import { PAL } and use PAL.honey ...
//   DOM / CSS       -> var(--honey) ...  (the :root block of style.css is generated from this file; tests/palette.test.js keeps them in sync)
// Rules of use: walls cream/vanilla, floor and wood honey, ovens and accents terracotta, status/progress soft green,
// text and outlines dark brown. Characters, food and icons keep their natural colours.

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** Blend two #rrggbb colours (f = 0 -> a, 1 -> b). */
export function mix(a, b, f) {
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b);
  const h = (v) => Math.round(v).toString(16).padStart(2, '0');
  return `#${h(r1 + (r2 - r1) * f)}${h(g1 + (g2 - g1) * f)}${h(b1 + (b2 - b1) * f)}`;
}

export const BASE = {
  cream: '#F5E6C8',       // warm cream: cards, walls, highlights
  vanilla: '#E8D2A8',     // vanilla beige: card shading, wall lower tone
  honey: '#C99A61',       // honey wood: floor, furniture, frames
  terracotta: '#B85F3B',  // brick / accent: oven, call-to-action, warnings
  brown: '#795238',       // dark brown: outlines, edges
  green: '#7D9855',       // soft green: progress, success, positive buttons
};

const W = '#FFFFFF';
export const PAL = {
  ...BASE,
  paper: mix(BASE.cream, W, 0.6),                 // the lightest surface (card highlight, bubbles)
  creamLight: mix(BASE.cream, W, 0.35),
  vanillaDark: mix(BASE.vanilla, BASE.honey, 0.4),
  honeyLight: mix(BASE.honey, BASE.cream, 0.45),
  honeyDark: mix(BASE.honey, BASE.brown, 0.5),
  terracottaLight: mix(BASE.terracotta, BASE.cream, 0.45),
  terracottaPale: mix(BASE.terracotta, BASE.cream, 0.8),
  terracottaDark: mix(BASE.terracotta, BASE.brown, 0.5),
  brownDark: mix(BASE.brown, '#000000', 0.42),    // text and contours (readable on every cream surface)
  brownSoft: mix(BASE.brown, BASE.vanilla, 0.4),
  greenLight: mix(BASE.green, BASE.cream, 0.4),
  greenPale: mix(BASE.green, BASE.cream, 0.8),
  greenDark: mix(BASE.green, '#000000', 0.35),   // button / bar body (white text reads on it)
  greenDeep: mix(BASE.green, '#000000', 0.6),
};
/** Dark brown for text and outlines. */
export const INK = PAL.brownDark;

const kebab = (k) => k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
/** The CSS custom properties for every token, as `--name: #hex;` lines (used for the :root block and at start-up). */
export const cssTokens = () => Object.entries(PAL).map(([k, v]) => `--${kebab(k)}: ${v.toLowerCase()};`);
