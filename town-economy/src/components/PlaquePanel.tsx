import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "./AppText";
import { cardShadow, FONT, RADIUS, TYPE } from "../theme";
import { GradientFill } from "./GradientFill";
import { ParchmentBackground } from "./ParchmentBackground";

interface Props {
  title: string;
  children: React.ReactNode;
  style?: { marginBottom?: number; marginTop?: number };
}

/** A parchment sheet in a wood frame, titled by a green gold-rimmed plaque
 * set into the top beam — the layout of the reference's Inventory summary.
 * Drawn in code; the carved beam, vines and plaque are asset slots. */
export function PlaquePanel({ title, children, style }: Props) {
  return (
    <View style={[styles.frame, style]}>
      <View style={styles.beam}>
        <View style={styles.plaque}>
          <GradientFill colors={["#2f6a45", "#1d4a30"]} x1="0" y1="0" x2="0" y2="1" />
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        </View>
      </View>
      <View style={styles.paper}>
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
    backgroundColor: "#4a3220",
    overflow: "hidden",
    ...cardShadow,
  },
  beam: { alignItems: "center", paddingTop: 6, paddingBottom: 4 },
  plaque: {
    minWidth: 150,
    paddingHorizontal: 28,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#c9a05a",
    overflow: "hidden",
    alignItems: "center",
  },
  title: {
    color: "#f1cf7a",
    fontFamily: FONT.display,
    fontSize: TYPE.heading + 4,
    letterSpacing: 1.5,
  },
  paper: { marginHorizontal: 4, marginBottom: 4, paddingVertical: 8, paddingHorizontal: 14 },
});
