import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import ribbonLeft from "../../assets/ui/sectionribbon/left.png";
import ribbonMid from "../../assets/ui/sectionribbon/mid.png";
import ribbonRight from "../../assets/ui/sectionribbon/right.png";
import { FONT, TYPE, WEIGHT } from "../theme";

interface Props {
  text: string;
  /** Unused now — every section label sits on the same green/gold ribbon
   * (see below) rather than a per-section colored dot, so there's nothing
   * left to tint. Kept in the type purely so none of this component's ~35
   * call sites, each passing their own accent color, need to change. */
  color?: string;
}

// The same left-cap/stretchy-middle/right-cap pattern as the quest
// banner's ribbon and the title plate — one real cropped image, not a
// CSS-drawn bar, so a longer section label just stretches the middle
// instead of distorting the wheat sprig or the gold tip.
const RIBBON_HEIGHT = 24;
const LEFT_CAP_ASPECT = 460 / 475;
const RIGHT_CAP_ASPECT = 168 / 475;
const LEFT_CAP_WIDTH = Math.round(RIBBON_HEIGHT * LEFT_CAP_ASPECT);
const RIGHT_CAP_WIDTH = Math.round(RIBBON_HEIGHT * RIGHT_CAP_ASPECT);

/** Every section header in the game sits on this same ribbon now — the
 * same "First Steps" treatment the quest banner uses — rather than the
 * plain gray caps text with a colored dot this used to be. */
export function SectionLabel({ text }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={[StyleSheet.absoluteFill, styles.bg]} pointerEvents="none">
        <Image
          source={ribbonLeft}
          style={{ width: LEFT_CAP_WIDTH, height: RIBBON_HEIGHT }}
          resizeMode="stretch"
        />
        <Image source={ribbonMid} style={{ flex: 1, height: RIBBON_HEIGHT }} resizeMode="stretch" />
        <Image
          source={ribbonRight}
          style={{ width: RIGHT_CAP_WIDTH, height: RIBBON_HEIGHT }}
          resizeMode="stretch"
        />
      </View>
      {/* Marked as a header so screen-reader users can jump between the
          sections of a long screen instead of swiping through every row. */}
      <Text style={styles.label} numberOfLines={1} accessibilityRole="header">
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: RIBBON_HEIGHT,
    // Sized to its text, not stretched to the screen's full width — the
    // reference shows this ribbon running only as wide as the label
    // needs, not edge to edge like the quest banner above it.
    alignSelf: "flex-start",
    justifyContent: "center",
    paddingLeft: LEFT_CAP_WIDTH + 6,
    paddingRight: RIGHT_CAP_WIDTH + 10,
    marginBottom: 10,
    marginTop: 6,
  },
  bg: { flexDirection: "row" },
  label: {
    color: "#f4e8ce",
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    letterSpacing: 1,
  },
});
