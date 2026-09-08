import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";
import { GradientFill } from "./GradientFill";
import { VillagerIllustration } from "./VillagerIllustration";

interface Props {
  happiness: number;
  label: string;
  moodLabel: string;
  moodColor: string;
}

function moodForHappiness(happiness: number): "happy" | "neutral" | "sad" {
  if (happiness >= 70) return "happy";
  if (happiness < 45) return "sad";
  return "neutral";
}

function Bobbing({ children, delay }: { children: React.ReactNode; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1400, delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  return <Animated.View style={{ transform: [{ translateY }] }}>{children}</Animated.View>;
}

/** An ambient "town square" scene atop the Town screen — a small crowd of
 * villagers, reusing the mascot from VillagerIllustration, whose expression
 * reacts to the town's current happiness. Purely visual, no mechanical effect. */
export function TownSquareScene({ happiness, label, moodLabel, moodColor }: Props) {
  const mood = moodForHappiness(happiness);
  return (
    <View style={styles.card}>
      <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(moodColor, 0.08) }]}
      />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Bobbing delay={0}>
          <VillagerIllustration size={50} mood={mood} />
        </Bobbing>
        <Bobbing delay={220}>
          <VillagerIllustration size={64} mood={mood} />
        </Bobbing>
        <Bobbing delay={440}>
          <VillagerIllustration size={46} mood={mood} />
        </Bobbing>
      </View>
      <View style={styles.ground} />
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
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: SPACING.lg,
  },
  ground: {
    width: "70%",
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.28)",
    marginTop: -6,
  },
  moodCaption: {
    marginTop: SPACING.sm,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
});
