import { ViewStyle } from "react-native";

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
