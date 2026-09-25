import React from "react";
import { Dimensions, StyleSheet, Text, View, Image } from "react-native";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT } from "../theme";
import { Bobbing } from "./Bobbing";
import { GradientFill } from "./GradientFill";
import { TownSquareBackdrop } from "./TownSquareBackdrop";
import { VillagerIllustration } from "./VillagerIllustration";

interface Props {
  happiness: number;
  label: string;
  moodLabel: string;
  moodColor: string;
}

const SCENE_WIDTH = Math.min(Dimensions.get("window").width - 64, 340);
const SCENE_HEIGHT = Math.round((SCENE_WIDTH * 128) / 320);

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

function moodForHappiness(happiness: number): "happy" | "neutral" | "sad" {
  if (happiness >= 70) return "happy";
  if (happiness < 45) return "sad";
  return "neutral";
}

/** An ambient "town square" scene atop the Town screen: a painted backdrop of
 * the square with a small crowd standing in it, whose expressions track the
 * town's current happiness. Purely visual, no mechanical effect.
 *
 * The crowd is three different wardrobes rather than one villager three times,
 * and the backdrop's lit windows warm up with happiness too — so a thriving
 * town and a miserable one read differently at a glance, before the caption. */
export function TownSquareScene({ happiness, label, moodLabel, moodColor }: Props) {
  const mood = moodForHappiness(happiness);
  const warmth = Math.max(0, Math.min(1, happiness / 100));

  return (
    <View style={styles.card}>
      <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
      <Text style={styles.label}>{label}</Text>

      <View style={styles.scene}>
        <View aria-hidden style={styles.backdrop}>
          {mood === "sad" ? (
            <Image
              source={require("../../assets/angry-marketplace.webp")}
              style={{ width: SCENE_WIDTH, height: SCENE_HEIGHT }}
              resizeMode="cover"
            />
          ) : (
            <TownSquareBackdrop width={SCENE_WIDTH} height={SCENE_HEIGHT} warmth={warmth} />
          )}
        </View>
        <View style={styles.crowd}>
          <Bobbing delay={0}>
            <VillagerIllustration size={46} mood={mood} variant={1} />
          </Bobbing>
          <Bobbing delay={220}>
            <VillagerIllustration size={60} mood={mood} variant={0} />
          </Bobbing>
          <Bobbing delay={440}>
            <VillagerIllustration size={42} mood={mood} variant={2} />
          </Bobbing>
        </View>
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
    justifyContent: "flex-end",
  },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  crowd: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: SPACING.lg,
    // the crowd stands on the square's ground line rather than the card's edge
    paddingBottom: 4,
  },
  moodCaption: {
    marginTop: SPACING.md,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
});
