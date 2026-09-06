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
