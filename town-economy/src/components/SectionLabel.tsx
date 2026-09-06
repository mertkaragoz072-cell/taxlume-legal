import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, SPACING, TYPE, WEIGHT } from "../theme";

interface Props {
  text: string;
  color?: string;
}

/** A small colored dot in front of a section header — used throughout the
 * app so every screen's section labels read as part of the same system
 * rather than plain gray caps text. */
export function SectionLabel({ text, color = COLORS.accent }: Props) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.label}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.sm, marginTop: SPACING.xs + 2 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: SPACING.xs + 2 },
  label: { color: COLORS.textMuted, fontSize: TYPE.caption, fontWeight: WEIGHT.bold, letterSpacing: 1 },
});
