import React, { useState } from "react";
import { StyleSheet, Text, View, Image, LayoutChangeEvent } from "react-native";
import kasabaMeydaniImage from "../../assets/kasaba-meydani.webp";
import { COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT } from "../theme";

interface Props {
  label: string;
  moodLabel: string;
  moodColor: string;
}

// The asset's own ratio (1774×887 px). Height is computed from a measured
// width in JS rather than left to CSS `aspectRatio`: react-native-web
// resolves that against the absolutely-positioned <Image> inside it and
// grows the box to the picture's raw pixel size instead of the row's width,
// which is what was turning "cover" into a tiny corner of the photo.
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
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.scene} onLayout={onLayout}>
      {width > 0 && (
        <Image
          source={kasabaMeydaniImage}
          style={{ width, height: width / IMAGE_RATIO }}
          resizeMode="cover"
        />
      )}
      <Text style={[styles.label, onArt]}>{label}</Text>
      <Text style={[styles.moodCaption, { color: moodColor }, onArt]}>{moodLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    width: "100%",
    // Callers that centre their children (MarketScreen's onboardingScene
    // wrapper) don't stretch them across the cross-axis by default, which
    // left `width: "100%"` resolving against nothing and the box sizing to
    // the image's own intrinsic pixel size instead. This pins it full-width
    // regardless of what the parent does.
    alignSelf: "stretch",
    borderRadius: RADIUS.feature,
    overflow: "hidden",
    marginBottom: SPACING.lg,
  },
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
