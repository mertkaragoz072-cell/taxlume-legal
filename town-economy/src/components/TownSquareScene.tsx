import React from "react";
import { StyleSheet, Text, View, Image } from "react-native";
import kasabaMeydaniImage from "../../assets/kasaba-meydani.webp";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT } from "../theme";
import { GradientFill } from "./GradientFill";

interface Props {
  label: string;
  moodLabel: string;
  moodColor: string;
}

// The asset's own ratio (1170×739 px) rather than a guessed box: a mismatch
// here is what "contain" turns into empty bars down both sides — which was
// the actual bug, not the card's padding. Sized as a percentage of the card
// (not a Dimensions.get() snapshot) so it fills the card correctly at any
// screen width and on rotation, with no manual re-measure.
const IMAGE_RATIO = 1170 / 739;

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

/** Kasaba meydanı görseli — sadece görsel, mekanik efekti yok. */
export function TownSquareScene({ label, moodLabel, moodColor }: Props) {
  return (
    <View style={styles.card}>
      <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
      <Text style={styles.label}>{label}</Text>

      <View style={styles.scene}>
        <Image source={kasabaMeydaniImage} style={styles.image} resizeMode="cover" />
      </View>

      <Text style={[styles.moodCaption, { color: moodColor }]}>{moodLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.feature,
    // A thin frame, not a mat: the picture is the point of this card, so
    // padding is just enough to keep the label and caption off its edge.
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
    aspectRatio: IMAGE_RATIO,
    borderRadius: RADIUS.card,
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  moodCaption: {
    alignSelf: "center",
    marginTop: SPACING.md,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
});
