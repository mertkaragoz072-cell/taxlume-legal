import React from "react";
import { StyleSheet, Text, View, Image } from "react-native";
import kasabaMeydaniImage from "../../assets/kasaba-meydani.webp";
import { COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT } from "../theme";

interface Props {
  label: string;
  moodLabel: string;
  moodColor: string;
}

// The asset's own ratio (1774×887 px) — the scene box follows it so the
// picture fills its box edge to edge with resizeMode="cover" instead of
// being fit into a guessed box (a mismatch there is what turns "contain"
// into empty bars down the sides).
const IMAGE_RATIO = 1774 / 887;

// Legible over any part of the photo without a card behind it to guarantee
// contrast — the picture is meant to fill the space on its own, not sit in
// a card's dark mat.
const onArt = {
  textShadowColor: "rgba(0, 0, 0, 0.75)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

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

/** Kasaba meydanı görseli — sadece görsel, kart arka planı/çerçevesi yok:
 * resim kendi başına duruyor, etiket ve ruh hali onun üzerine yazılıyor. */
export function TownSquareScene({ label, moodLabel, moodColor }: Props) {
  return (
    <View style={styles.scene}>
      <Image source={kasabaMeydaniImage} style={styles.image} resizeMode="cover" />
      <Text style={[styles.label, onArt]}>{label}</Text>
      <Text style={[styles.moodCaption, { color: moodColor }, onArt]}>{moodLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    width: "100%",
    aspectRatio: IMAGE_RATIO,
    borderRadius: RADIUS.feature,
    overflow: "hidden",
    marginBottom: SPACING.lg,
  },
  image: { ...StyleSheet.absoluteFill },
  label: {
    position: "absolute",
    top: SPACING.sm,
    left: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    letterSpacing: 0.5,
  },
  moodCaption: {
    position: "absolute",
    bottom: SPACING.sm,
    left: SPACING.sm,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
});
