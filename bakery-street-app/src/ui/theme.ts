import { useWindowDimensions } from "react-native";
import { PAL } from "../palette.js";

export const C = PAL as Record<string, string>;
export const fmt = (n: number) => n.toLocaleString("tr-TR");

/** The UI unit: every size in the UI is a multiple of it. Portrait (the game's orientation): 1% of the width, capped so tablets do not get giant buttons. Wide windows keep the old rule. */
export function useU(): number {
  const { width, height } = useWindowDimensions();
  return height >= width ? Math.min(width * 0.0102, 5.6) : Math.min(height / 100, width * 0.0058);
}
/** Text size: a multiple of the unit, never below 12. */
export const fs = (u: number, mult: number) => Math.max(12, u * mult);
export const FONT = { regular: "Nunito_700Bold", bold: "Nunito_800ExtraBold" };

/** Height of the fixed bottom navigation inside the safe area (picture buttons + label + padding); panels sit above it. */
export const navHeight = (u: number) => Math.max(52, u * 14) + Math.max(12, u * 2.7) * 1.35 + u * 2.6;
