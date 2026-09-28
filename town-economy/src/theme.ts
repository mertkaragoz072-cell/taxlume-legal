import { ViewStyle } from "react-native";

// --- Design tokens ---------------------------------------------------------
// A single small scale for text size/weight and spacing so every screen
// draws from the same ruler instead of each one picking its own numbers —
// the difference between "handmade" and "designed." Prefer these over a
// bare fontSize/margin literal in new or touched code.
export const TYPE = {
  micro: 10, // fine print: chart axis labels, tiny meta text
  caption: 11, // captions, secondary meta (badges, sub-labels)
  label: 12, // stat labels, form labels
  body: 13, // default body/paragraph text
  title: 16, // card/row titles, emphasized values
  heading: 18, // section headings, prominent prices
  display: 24, // hero numbers (rare — one per screen at most)
} as const;

export const WEIGHT = {
  regular: "500" as const,
  medium: "600" as const,
  bold: "700" as const,
  black: "800" as const,
};

// Custom fonts loaded in App.tsx — a distinct static family per weight
// (React Native doesn't synthesize weights for a custom TTF the way a
// browser does, so `fontWeight` alone has no visual effect on these; pair
// every WEIGHT.x with the matching FONT.x). `display` is the app's one
// flourish — a chiseled serif for a town's name and its biggest numbers,
// used sparingly (see the "restraint" note by COLORS below) so it reads
// as an occasional accent rather than the whole app's voice.
export const FONT = {
  regular: "Manrope_500Medium",
  medium: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  black: "Manrope_800ExtraBold",
  display: "Cinzel_700Bold",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/** corner radius scale — chip/pill, a normal row or button, and a big
 * feature card, so "how rounded" reads as three deliberate sizes instead
 * of a dozen near-identical ones. A touch softer than the original scale
 * (10/14/18) — the extra couple of pixels is what reads as a current app
 * rather than one from several years ago; card content didn't need to
 * change to feel it. */
export const RADIUS = {
  chip: 12,
  card: 16,
  feature: 20,
} as const;

/** the app's recurring text/semantic colors, named once instead of re-typed
 * as bare hex in every screen — see the "restraint" note on cardShadow et al.
 * below for why so few colors carry so much of the UI.
 *
 * Each was pulled a little toward gray from its original, more neon-leaning
 * version — same hue and close to the same lightness (so text contrast on
 * the dark background is unaffected), just less saturated. A screen full of
 * fully-saturated red/green/gold against a near-black backdrop is what was
 * actually making this read as tiring rather than the darkness itself. */
export const COLORS = {
  textPrimary: "#f0e3c8",
  textMuted: "#a0917a",
  accent: "#e1c58c",
  onLight: "#1a1410",
  positive: "#4ea56a",
  negative: "#c15c58",
  warning: "#d1a25c",
} as const;

/** shared warm gradient stops for the app's dark-brown card background,
 * used with GradientFill so cards read as gently lit rather than flat */
export const CARD_GRADIENT: [string, string] = ["#332619", "#211a11"];
/** a warm, muted gold-brown wash for cards that mark something earned */
export const UNLOCKED_CARD_GRADIENT: [string, string] = ["#4a3a1c", "#26200f"];
// The four gradients below carry the same desaturation as COLORS above —
// each was the brightest, most saturated version of its hue in the app
// (a button fill or a "look at this" glow reads best filled edge-to-edge in
// its own color, unlike text, so these started further from gray than
// COLORS did) and got pulled back the furthest for it.
export const GOLD_GRADIENT: [string, string] = ["#f0d494", "#d1a04f"];
export const GREEN_GRADIENT: [string, string] = ["#80c495", "#448a5d"];
export const RED_GRADIENT: [string, string] = ["#dd8b7f", "#b0554d"];
export const BLUE_GRADIENT: [string, string] = ["#84b0d9", "#4f76a3"];

/** the app's base backdrop — a subtle top-to-bottom wash instead of a flat
 * fill, so every screen has a little depth behind its cards. Floor lifted
 * off near-black (#140f0a) — true black next to the saturated gradients
 * above is the other half of the harsh-contrast combination that made the
 * app tiring to look at for long sessions; a dark backdrop doesn't need to
 * be *that* dark to still read as night. */
export const APP_BACKGROUND_GRADIENT: [string, string] = ["#271f18", "#1c1710"];

/** the same warm-dark backdrop, lightly retinted per real-world calendar
 * season — a quiet bit of ambient variety that costs nothing in gameplay
 * terms, purely a display-layer choice (not tied to any game state, so it
 * never needs a save-version bump). Each stays close enough to the base
 * gradient that cards and text contrast are unaffected. Floors lifted the
 * same way as APP_BACKGROUND_GRADIENT above, for the same reason. */
const SEASON_BACKGROUND_GRADIENTS: Record<"spring" | "summer" | "autumn" | "winter", [string, string]> = {
  spring: ["#253420", "#181f14"],
  summer: ["#302518", "#211a10"],
  autumn: APP_BACKGROUND_GRADIENT,
  winter: ["#1c2531", "#171c24"],
};

export function seasonalBackgroundGradient(date: Date = new Date()): [string, string] {
  const month = date.getMonth(); // 0 = January
  if (month >= 2 && month <= 4) return SEASON_BACKGROUND_GRADIENTS.spring;
  if (month >= 5 && month <= 7) return SEASON_BACKGROUND_GRADIENTS.summer;
  if (month >= 8 && month <= 10) return SEASON_BACKGROUND_GRADIENTS.autumn;
  return SEASON_BACKGROUND_GRADIENTS.winter;
}

/** a soft lifted-card shadow; RN Web reads shadow*, native reads elevation too.
 *
 * Wider and lower-opacity than the original (offset 4 / opacity 0.28 /
 * radius 10) — a shadow that close and that dark reads as a hard-edged drop
 * shadow, the one detail that most says "a few years old" about a card-heavy
 * screen. Spreading the same shadow over a larger, softer radius at lower
 * opacity gives the same sense that a card is lifted off the background
 * without the dark ring around its edge. */
export const cardShadow: ViewStyle = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.18,
  shadowRadius: 16,
  elevation: 4,
};

/** a colored glow shadow for game-y "pop" — pass a good/action's own hue so
 * buttons and highlighted cards feel lit from within rather than flat.
 * Softer than the original (opacity 0.55) for the same reason the palette
 * above got desaturated: a fully-opaque colored glow next to the app's dark
 * backdrop is loud on its own, and the app has several of these live on
 * screen at once (a hot inflation stat, a selected good, a ready prestige
 * card) — 0.55 each stacked up fast. */
export function glowShadow(color: string): ViewStyle {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.38,
    shadowRadius: 9,
    elevation: 6,
  };
}

/** hex ("#rrggbb") to an rgba() string at the given alpha — used to tint a
 * card's gradient with a good's own color without hand-picking new hexes
 * for every single good. */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
