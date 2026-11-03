import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import ribbonLeft from "../../assets/ui/sectionribbon/left.png";
import ribbonMid from "../../assets/ui/sectionribbon/mid.png";
import ribbonRight from "../../assets/ui/sectionribbon/right.png";
import { FONT, TYPE } from "../theme";

interface Props {
  text: string;
  /** Unused now — every section label sits on the same green/gold ribbon
   * (see below) rather than a per-section colored dot, so there's nothing
   * left to tint. Kept in the type purely so none of this component's ~35
   * call sites, each passing their own accent color, need to change. */
  color?: string;
}

// The same left-cap/stretchy-middle/right-cap pattern as the title plate —
// one real cropped image, not a CSS-drawn bar, so a longer label just
// stretches the middle instead of distorting the wheat sprig or the gold
// tip.
const RIBBON_HEIGHT = 28;
const LEFT_CAP_ASPECT = 460 / 475;
const RIGHT_CAP_ASPECT = 168 / 475;

interface RibbonProps {
  text: string;
  /** Ribbon height in px; the caps and the label scale with it. */
  height?: number;
  fontSize?: number;
}

/** The green/gold wheat ribbon with its label, sized to the text and with
 * no margins of its own — SectionLabel adds the screen-header spacing, the
 * quest strip drops it in as is. */
export function RibbonLabel({ text, height = RIBBON_HEIGHT, fontSize = TYPE.body }: RibbonProps) {
  const leftCap = Math.round(height * LEFT_CAP_ASPECT);
  const rightCap = Math.round(height * RIGHT_CAP_ASPECT);
  return (
    <View
      style={[
        styles.ribbon,
        { height, paddingLeft: leftCap + 6, paddingRight: rightCap + Math.round(height / 4) },
      ]}
    >
      <View style={[StyleSheet.absoluteFill, styles.bg]} pointerEvents="none">
        <Image source={ribbonLeft} style={{ width: leftCap, height }} resizeMode="stretch" />
        <Image source={ribbonMid} style={{ flex: 1, height }} resizeMode="stretch" />
        <Image source={ribbonRight} style={{ width: rightCap, height }} resizeMode="stretch" />
      </View>
      {/* Marked as a header so screen-reader users can jump between the
          sections of a long screen instead of swiping through every row. */}
      <Text style={[styles.label, { fontSize }]} numberOfLines={1} accessibilityRole="header">
        {text}
      </Text>
    </View>
  );
}

/** Every section header in the game sits on this same ribbon now, rather
 * than the plain gray caps text with a colored dot this used to be. */
export function SectionLabel({ text }: Props) {
  return (
    <View style={styles.wrap}>
      <RibbonLabel text={text} />
    </View>
  );
}

const styles = StyleSheet.create({
  ribbon: {
    // Sized to its text, not stretched to the screen's full width.
    alignSelf: "flex-start",
    justifyContent: "center",
  },
  wrap: {
    alignSelf: "flex-start",
    // Tucks over the top edge of the panel below, like the reference's
    // ribbons overlapping the cards they title.
    marginBottom: -5,
    zIndex: 2,
    marginTop: 2,
  },
  bg: { flexDirection: "row" },
  label: {
    color: "#f4e8ce",
    // The app's one decorative flourish (see FONT.display's own comment in
    // theme.ts) rather than the plain body sans — this sits on carved
    // ribbon art the same way the town name sits on its carved sign, where
    // that extra flourish reads as part of the engraving.
    fontFamily: FONT.display,
    letterSpacing: 1,
  },
});
