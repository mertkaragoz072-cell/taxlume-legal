import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import leftCap from "../../assets/ui/ribbon-green-left.png";
import midTile from "../../assets/ui/ribbon-green-mid.png";
import rightCap from "../../assets/ui/ribbon-green-right.png";
import { FONT, PARCHMENT, TYPE, WEIGHT } from "../theme";

interface Props {
  text: string;
  /** a small leading glyph for sections that read better with their own
   * icon (a clock, a gear) alongside the ribbon's own wheat ornament. */
  icon?: string;
}

const CAP_WIDTH = 95 / 2; // the source crop was taken at ~2x
const CAP_HEIGHT = 60 / 2;
const RIGHT_CAP_WIDTH = 55 / 2;

/** The parchment theme's section header: the game's own ribbon banner
 * artwork (see assets/ui/README or the mockup it was cut from), not a
 * CSS-drawn approximation — the left end (wheat sheaf) and right end
 * (pointed tail) are the exact cropped pieces, with a thin clean slice of
 * the ribbon's own fill stretched to fill however wide the text needs.
 * Text renders as a normal RN <Text> over it rather than being baked into
 * the image, which is the only way this still works once translated (or
 * once a section's name is simply longer in one language than another). */
export function BannerLabel({ text, icon }: Props) {
  return (
    <View style={styles.row}>
      <Image source={leftCap} style={styles.leftCap} resizeMode="stretch" />
      <Image source={midTile} style={styles.midTile} resizeMode="stretch" />
      <Image source={rightCap} style={styles.rightCap} resizeMode="stretch" />
      <View style={styles.textWrap} pointerEvents="none">
        <Text style={styles.label} accessibilityRole="header">
          {icon ? `${icon} ` : ""}
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: CAP_HEIGHT,
    marginTop: 18,
    marginBottom: 10,
  },
  leftCap: { width: CAP_WIDTH, height: CAP_HEIGHT },
  midTile: { flex: 1, height: CAP_HEIGHT, marginLeft: -2, marginRight: -2 },
  rightCap: { width: RIGHT_CAP_WIDTH, height: CAP_HEIGHT },
  textWrap: {
    position: "absolute",
    left: CAP_WIDTH - 6,
    right: RIGHT_CAP_WIDTH + 2,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: PARCHMENT.onDark,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    letterSpacing: 1,
    textAlign: "center",
  },
});
