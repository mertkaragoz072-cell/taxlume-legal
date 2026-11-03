import React from "react";
import { Image, ImageSourcePropType, StyleSheet, Text, View } from "react-native";
import { cardShadow, FONT, RADIUS, TYPE } from "../theme";
import { ParchmentBackground } from "./ParchmentBackground";

interface Props {
  /** an emoji, or a real icon image, shown before the title */
  icon: string | ImageSourcePropType;
  title: string;
  /** right end of the header bar — plain text or any node */
  right?: React.ReactNode;
  children: React.ReactNode;
  /** space under the panel; defaults to nothing so callers set their own */
  style?: { marginBottom?: number; marginTop?: number };
  /** tighter header and sheet padding for short, one-glance panels */
  compact?: boolean;
}

/** A dark wood bar (icon, serif title, a note on the right) over an inset
 * parchment sheet — the layout of the reference's season/demand panels,
 * drawn in code so the same frame carries Market Pulse and the demand
 * forecast. */
export function WoodPanel({ icon, title, right, children, style, compact }: Props) {
  return (
    <View style={[styles.frame, style]}>
      <View style={[styles.header, compact && styles.headerCompact]}>
        {typeof icon === "string" ? (
          <Text aria-hidden style={styles.icon}>
            {icon}
          </Text>
        ) : (
          <Image source={icon} style={styles.iconImage} resizeMode="contain" accessibilityElementsHidden />
        )}
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        <View style={styles.right}>
          {typeof right === "string" ? <Text style={styles.rightText}>{right}</Text> : right}
        </View>
      </View>
      <View style={[styles.paper, compact && styles.paperCompact]}>
        <ParchmentBackground />
        {children}
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
  headerCompact: { paddingVertical: 4 },
  paperCompact: { paddingVertical: 10, paddingHorizontal: 14 },
  icon: { fontSize: TYPE.heading },
  iconImage: { width: 19, height: 28 },
  title: { color: "#f4e8ce", fontFamily: FONT.display, fontSize: TYPE.body, letterSpacing: 1, flexShrink: 1 },
  right: { flex: 1, alignItems: "flex-end" },
  rightText: { color: "#f4e8ce", fontFamily: FONT.medium, fontSize: TYPE.label },
  paper: {
    marginHorizontal: 4,
    marginBottom: 4,
    // Clear of the sheet's own border and corner ornaments.
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});
