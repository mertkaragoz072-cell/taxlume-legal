import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { currentMentorStep, MENTOR_STEPS } from "../economy/mentor";
import {
  CARD_GRADIENT,
  cardShadow,
  COLORS,
  FONT,
  GOLD_GRADIENT,
  RADIUS,
  SPACING,
  TYPE,
  WEIGHT,
  withAlpha,
} from "../theme";
import { GradientFill } from "./GradientFill";
import { MentorPortrait } from "./MentorPortrait";
import { ScalePressable } from "./ScalePressable";

interface Props {
  /** advance the tour by one beat */
  onNext: () => void;
  /** end it early */
  onSkip: () => void;
}

/** Zeyno, docked above the tab bar, walking a new mayor through the town.
 *
 * She is a dock, not an overlay: the screen she is describing stays live
 * above her, scrollable and tappable, and she simply takes up the bottom of
 * it. A modal would have put a picture of the game in front of the game,
 * which is the thing this replaced — eight slides a player read before
 * touching anything, half of them about screens still locked.
 *
 * Each beat switches to the tab it is about and lights that tab up (see
 * MENTOR_STEPS and TabBar's `spotlight`), so "this is the Market" is said
 * while the market is on screen with its tab pulsing underneath.
 */
export function MentorCoach({ onNext, onSkip }: Props) {
  const { state, t } = useEconomyContext();
  const step = currentMentorStep(state.mentorStep);
  const enter = useRef(new Animated.Value(0)).current;
  const index = state.mentorStep;

  // Re-run per beat: she lifts back in each time she says something new,
  // which is what stops seven paragraphs in the same box reading as one
  // long wall of text.
  useEffect(() => {
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  if (!step) return null;
  const isLast = index === MENTOR_STEPS.length - 1;

  return (
    <Animated.View
      style={[
        styles.dock,
        {
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}
    >
      <View style={styles.card}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />

        <View style={styles.row}>
          <View style={styles.portrait}>
            <MentorPortrait size={76} mood={step.mood} />
          </View>
          <View style={styles.speech}>
            <Text style={styles.name}>
              {t("mentor.name")} <Text style={styles.role}>· {t("mentor.role")}</Text>
            </Text>
            <Text style={styles.text}>{t(step.textKey)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {MENTOR_STEPS.map((s, i) => (
              <View key={s.id} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>

          {!isLast && (
            <ScalePressable onPress={onSkip} style={styles.skipBtn} scaleTo={0.96}>
              <Text style={styles.skipText}>{t("mentor.skip")}</Text>
            </ScalePressable>
          )}
          <ScalePressable onPress={onNext} style={styles.nextBtn} scaleTo={0.96}>
            <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
            <Text style={styles.nextText}>{isLast ? t("mentor.done") : t("mentor.next")}</Text>
          </ScalePressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dock: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  card: {
    borderRadius: RADIUS.feature,
    padding: SPACING.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: withAlpha(COLORS.accent, 0.45),
    ...cardShadow,
  },
  row: { flexDirection: "row", alignItems: "flex-start" },
  // The portrait is bottom-cropped by the card's own overflow, which reads
  // as her leaning in over the edge rather than a sticker pasted on.
  portrait: { marginRight: SPACING.sm + 2, marginTop: -2 },
  speech: { flex: 1 },
  name: {
    color: COLORS.accent,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    marginBottom: 3,
  },
  role: { color: COLORS.textMuted, fontWeight: WEIGHT.regular, fontFamily: FONT.medium },
  text: { color: COLORS.textPrimary, fontSize: TYPE.body, lineHeight: 19 },
  footer: { flexDirection: "row", alignItems: "center", marginTop: SPACING.md },
  dots: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4a4032" },
  dotActive: { backgroundColor: COLORS.accent, width: 16 },
  skipBtn: { paddingVertical: 8, paddingHorizontal: SPACING.sm, marginRight: SPACING.xs },
  skipText: { color: COLORS.textMuted, fontSize: TYPE.caption, fontFamily: FONT.medium },
  nextBtn: {
    borderRadius: RADIUS.chip,
    paddingVertical: 9,
    paddingHorizontal: SPACING.lg,
    overflow: "hidden",
  },
  // No numeric fontWeight next to FONT.black — it is already the heavy cut,
  // and asking iOS to weight a weighted file shifts the metrics enough to
  // push the label off its own button. lineHeight spelled out for the same
  // reason.
  nextText: { color: "#1a1410", fontFamily: FONT.black, fontSize: TYPE.label, lineHeight: 18 },
});
