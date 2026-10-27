import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { FONT, PARCHMENT, SPACING, TYPE, WEIGHT } from "../theme";

interface Props {
  text: string;
  /** a small leading glyph — the mockup's ribbons each carry a wheat-sheaf
   * ornament; other sections read better with their own icon (a clock, a
   * lock) so this is a prop rather than hard-coded. */
  icon?: string;
}

/** The parchment theme's section header: a dark ribbon banner instead of
 * SectionLabel's plain dot-and-caps text. A rounded bar rather than the
 * mockup's pointed flag-tail ends — a true cut-corner ribbon needs either
 * an SVG path or four rotated corner triangles, and neither survives a
 * long translated string (German/Turkish section titles run noticeably
 * longer than English) without the geometry fighting the text. The color
 * and the end ornaments carry the "banner" read without that fragility. */
export function BannerLabel({ text, icon }: Props) {
  return (
    <View style={styles.row}>
      <Text aria-hidden style={styles.ornament}>
        🌾
      </Text>
      <View style={styles.ribbon}>
        <Text style={styles.label} accessibilityRole="header">
          {icon ? `${icon} ` : ""}
          {text}
        </Text>
      </View>
      <Text aria-hidden style={styles.ornament}>
        🌾
      </Text>
    </View>
  );
}

const RADIUS_PILL = 999;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    gap: 4,
  },
  ribbon: {
    backgroundColor: PARCHMENT.ribbon,
    borderWidth: 1.5,
    borderColor: PARCHMENT.gold,
    borderRadius: RADIUS_PILL,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 6,
  },
  label: {
    color: PARCHMENT.onDark,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  ornament: { fontSize: 14, opacity: 0.85 },
});
