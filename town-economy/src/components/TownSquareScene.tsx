import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT } from "../theme";
import { GradientFill } from "./GradientFill";
import { TownSquareBackdrop } from "./TownSquareBackdrop";

interface Props {
  happiness: number;
  label: string;
  moodLabel: string;
  moodColor: string;
}

// TownSquareBackdrop's own canvas ratio (see BASE_W/BASE_H there) — the
// scene box follows it so the drawing fills the card edge to edge instead
// of being fit into a guessed box.
const SCENE_RATIO = 320 / 128;

/** How to label the square: the word for this mood and the colour that goes
 * with it. Lives here rather than in a screen because two of them caption
 * the same scene — the Town tab, and the Market tab during the guided first
 * session. */
export function happinessFor(h: number): { labelKey: string; emoji: string; color: string } {
  if (h < 20) return { labelKey: "town.happiness.revolt", emoji: "😡", color: "#c94b4b" };
  if (h < 45) return { labelKey: "town.happiness.unrest", emoji: "😠", color: "#e0693f" };
  if (h < 70) return { labelKey: "town.happiness.coping", emoji: "😐", color: "#e0a13f" };
  if (h < 90) return { labelKey: "town.happiness.content", emoji: "🙂", color: "#a8c777" };
  return { labelKey: "town.happiness.veryContent", emoji: "😄", color: "#3fae5c" };
}

/** Kasaba meydanı — çizilmiş bir sahne, kimse yok: evler, tezgahlar, çeşme,
 * bayraklar. Renkleri kasabanın mutluluğuna göre canlı/soluk arasında
 * kayar (bkz. TownSquareBackdrop'taki warmth). */
export function TownSquareScene({ happiness, label, moodLabel, moodColor }: Props) {
  return (
    <View style={styles.card}>
      <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
      <Text style={styles.label}>{label}</Text>

      <View style={styles.scene}>
        <TownSquareBackdrop width="100%" height="100%" warmth={happiness / 100} />
      </View>

      <Text style={[styles.moodCaption, { color: moodColor }]}>{moodLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.feature,
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    marginBottom: SPACING.lg,
    overflow: "hidden",
    alignItems: "stretch",
    ...cardShadow,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  scene: {
    width: "100%",
    aspectRatio: SCENE_RATIO,
    borderRadius: RADIUS.card,
    overflow: "hidden",
  },
  moodCaption: {
    alignSelf: "center",
    marginTop: SPACING.md,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
});
