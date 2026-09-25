import React from "react";
import { Dimensions, StyleSheet, Text, View, Image } from "react-native";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT } from "../theme";
import { GradientFill } from "./GradientFill";

interface Props {
  happiness: number;
  label: string;
  moodLabel: string;
  moodColor: string;
}

const SCENE_WIDTH = Math.min(Dimensions.get("window").width - 64, 400);
const SCENE_HEIGHT = Math.round((SCENE_WIDTH * 180) / 400);

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
export function TownSquareScene({ happiness, label, moodLabel, moodColor }: Props) {
  return (
    <View style={styles.card}>
      <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
      <Text style={styles.label}>{label}</Text>

      <View style={styles.scene}>
        <Image
          source={require("../../assets/kasaba-meydani.webp")}
          style={{ width: SCENE_WIDTH, height: SCENE_HEIGHT }}
          resizeMode="contain"
        />
      </View>

      <Text style={[styles.moodCaption, { color: moodColor }]}>{moodLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.feature,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    overflow: "hidden",
    alignItems: "center",
    ...cardShadow,
  },
  label: {
    alignSelf: "flex-start",
    color: COLORS.textMuted,
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  scene: {
    width: SCENE_WIDTH,
    height: SCENE_HEIGHT,
    borderRadius: RADIUS.card,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  moodCaption: {
    marginTop: SPACING.md,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
});
