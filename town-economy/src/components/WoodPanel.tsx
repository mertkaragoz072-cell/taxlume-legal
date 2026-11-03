import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { cardShadow, FONT, PARCHMENT, RADIUS, TYPE } from "../theme";

interface Props {
  /** emoji shown before the title */
  icon: string;
  title: string;
  /** right end of the header bar — plain text or any node */
  right?: React.ReactNode;
  children: React.ReactNode;
  /** space under the panel; defaults to nothing so callers set their own */
  style?: { marginBottom?: number };
}

/** A dark wood bar (icon, serif title, a note on the right) over an inset
 * parchment sheet — the layout of the reference's season/demand panels,
 * drawn in code so the same frame carries Market Pulse and the demand
 * forecast. */
export function WoodPanel({ icon, title, right, children, style }: Props) {
  return (
    <View style={[styles.frame, style]}>
      <View style={styles.header}>
        <Text aria-hidden style={styles.icon}>
          {icon}
        </Text>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        <View style={styles.right}>
          {typeof right === "string" ? <Text style={styles.rightText}>{right}</Text> : right}
        </View>
      </View>
      <View style={styles.paper}>
        {children}
        <View pointerEvents="none" style={[styles.bracket, styles.bracketTL]} />
        <View pointerEvents="none" style={[styles.bracket, styles.bracketTR]} />
        <View pointerEvents="none" style={[styles.bracket, styles.bracketBL]} />
        <View pointerEvents="none" style={[styles.bracket, styles.bracketBR]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: RADIUS.feature,
    borderWidth: 2,
    borderColor: "#6f4e2e",
    backgroundColor: "#3a2615",
    overflow: "hidden",
    ...cardShadow,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 7 },
  icon: { fontSize: TYPE.heading },
  title: { color: "#f4e8ce", fontFamily: FONT.display, fontSize: TYPE.body, letterSpacing: 1, flexShrink: 1 },
  right: { flex: 1, alignItems: "flex-end" },
  rightText: { color: "#f4e8ce", fontFamily: FONT.medium, fontSize: TYPE.label },
  paper: {
    backgroundColor: PARCHMENT.paper,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#8a5f33",
    marginHorizontal: 5,
    marginBottom: 5,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bracket: { position: "absolute", width: 9, height: 9, borderColor: "#b88a4a" },
  bracketTL: { top: 1, left: 1, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 4 },
  bracketTR: { top: 1, right: 1, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 4 },
  bracketBL: { bottom: 1, left: 1, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 4 },
  bracketBR: { bottom: 1, right: 1, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 4 },
});
