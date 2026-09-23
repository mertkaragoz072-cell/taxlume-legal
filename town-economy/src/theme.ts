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
 * of a dozen near-identical ones. */
export const RADIUS = {
  chip: 10,
  card: 14,
  feature: 18,
} as const;

/** the app's recurring text/semantic colors, named once instead of re-typed
 * as bare hex in every screen — see the "restraint" note on cardShadow et al.
 * below for why so few colors carry so much of the UI. */
export const COLORS = {
  textPrimary: "#f0e3c8",
  textMuted: "#a0917a",
  accent: "#e8c777",
  onLight: "#1a1410",
  positive: "#3fae5c",
  negative: "#c94b4b",
  warning: "#e0a13f",
} as const;

/** shared warm gradient stops for the app's dark-brown card background,
 * used with GradientFill so cards read as gently lit rather than flat */
export const CARD_GRADIENT: [string, string] = ["#332619", "#211a11"];
/** a warm, muted gold-brown wash for cards that mark something earned */
export const UNLOCKED_CARD_GRADIENT: [string, string] = ["#4a3a1c", "#26200f"];
export const GOLD_GRADIENT: [string, string] = ["#ffdf8e", "#e0a637"];
export const GREEN_GRADIENT: [string, string] = ["#5fd884", "#2a9c53"];
export const RED_GRADIENT: [string, string] = ["#f0776a", "#c73f3a"];
export const BLUE_GRADIENT: [string, string] = ["#6fb8f2", "#3a7ecc"];

/** the app's base backdrop — a subtle top-to-bottom wash instead of a flat
 * fill, so every screen has a little depth behind its cards */
export const APP_BACKGROUND_GRADIENT: [string, string] = ["#2a2013", "#140f0a"];

/** the same warm-dark backdrop, lightly retinted per real-world calendar
 * season — a quiet bit of ambient variety that costs nothing in gameplay
 * terms, purely a display-layer choice (not tied to any game state, so it
 * never needs a save-version bump). Each stays close enough to the base
 * gradient that cards and text contrast are unaffected. */
const SEASON_BACKGROUND_GRADIENTS: Record<"spring" | "summer" | "autumn" | "winter", [string, string]> = {
  spring: ["#243318", "#10140b"],
  summer: ["#332619", "#1a1409"],
  autumn: APP_BACKGROUND_GRADIENT,
  winter: ["#1a2233", "#0c0f16"],
};

export function seasonalBackgroundGradient(date: Date = new Date()): [string, string] {
  const month = date.getMonth(); // 0 = January
  if (month >= 2 && month <= 4) return SEASON_BACKGROUND_GRADIENTS.spring;
  if (month >= 5 && month <= 7) return SEASON_BACKGROUND_GRADIENTS.summer;
  if (month >= 8 && month <= 10) return SEASON_BACKGROUND_GRADIENTS.autumn;
  return SEASON_BACKGROUND_GRADIENTS.winter;
}

/** a soft lifted-card shadow; RN Web reads shadow*, native reads elevation too */
export const cardShadow: ViewStyle = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.28,
  shadowRadius: 10,
  elevation: 4,
};

/** a colored glow shadow for game-y "pop" — pass a good/action's own hue so
 * buttons and highlighted cards feel lit from within rather than flat */
export function glowShadow(color: string): ViewStyle {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
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
