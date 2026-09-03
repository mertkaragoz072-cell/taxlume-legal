import { ViewStyle } from "react-native";

/** shared warm gradient stops for the app's dark-brown card background,
 * used with GradientFill so cards read as gently lit rather than flat */
export const CARD_GRADIENT: [string, string] = ["#332619", "#211a11"];
/** a warm, muted gold-brown wash for cards that mark something earned */
export const UNLOCKED_CARD_GRADIENT: [string, string] = ["#4a3a1c", "#26200f"];
export const GOLD_GRADIENT: [string, string] = ["#f3d78e", "#d9a94a"];
export const GREEN_GRADIENT: [string, string] = ["#57c374", "#2f8f4c"];
export const RED_GRADIENT: [string, string] = ["#dd6a63", "#b23a37"];
export const BLUE_GRADIENT: [string, string] = ["#63a8e0", "#3a72ad"];

/** a soft lifted-card shadow; RN Web reads shadow*, native reads elevation too */
export const cardShadow: ViewStyle = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.28,
  shadowRadius: 10,
  elevation: 4,
};
