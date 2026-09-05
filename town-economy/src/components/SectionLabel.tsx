import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  text: string;
  color?: string;
}

/** A small colored dot in front of a section header — used throughout the
 * app so every screen's section labels read as part of the same system
 * rather than plain gray caps text. */
export function SectionLabel({ text, color = "#e8c777" }: Props) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.label}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  label: { color: "#a0917a", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
});
