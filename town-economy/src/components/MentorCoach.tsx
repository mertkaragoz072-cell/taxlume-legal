import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { DIFFICULTIES } from "../economy/difficulty";
import { effectiveDifficultyConfig } from "../economy/ngPlusModifiers";
import { currentMentorStep, isWaitingOnPlayer, MENTOR_STEPS } from "../economy/mentor";
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

// Bigger than the old inset portrait (112), and now free to spill over the
// card's top edge instead of being fit inside it — see portraitFloat below.
const PORTRAIT_SIZE = 148;

/** Merve, docked above the tab bar, walking a new mayor through the town.
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
  // The number that ends a run differs per difficulty, and New Game+ can
  // move it again, so the beat about losing reads the live one rather than
  // repeating a figure from the design doc.
  const hyperinflationIndex = Math.round(
    effectiveDifficultyConfig(DIFFICULTIES[state.difficulty], state.activeNgPlusModifiers).hyperinflationIndex
  );
  const enter = useRef(new Animated.Value(0)).current;
  const index = state.mentorStep;

  // Second way out of a beat that asks for an action, because the first one
  // — doing it — can be out of reach: too little cash for the trade, a
  // storage yard already full, a control the overlay failed to measure. A
  // tutorial is allowed to insist, briefly; it is not allowed to trap. After
  // a quarter of a minute the Continue button comes back.
  const [escaped, setEscaped] = useState(false);
  useEffect(() => {
    setEscaped(false);
    if (!MENTOR_STEPS[index]?.isDone) return;
    const timer = setTimeout(() => setEscaped(true), 15000);
    return () => clearTimeout(timer);
  }, [index]);

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
  // A beat with something to do withholds its Continue button: the way past
  // it is to do the thing. Skip stays, so nobody can be stranded by a step
  // they cannot complete.
  const waitingOnPlayer = isWaitingOnPlayer(step, state, escaped);
  const say = (key: string) => t(key, { limit: hyperinflationIndex });

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
          {/* A spacer, not the portrait itself: the real MentorPortrait
              renders below as a sibling of the card, so it can spill over
              the card's top edge instead of being clipped by its overflow.
              This just reserves the row's own space for it. */}
          <View style={styles.portraitSpacer} />
          <View style={styles.speech}>
            {/* Who is talking, and how much of this is left. The dots that
                used to carry progress were readable as decoration and not
                as "two more of these" — a count says it outright. */}
            <View style={styles.nameRow}>
              <Text style={styles.name}>
                {t("mentor.name")} <Text style={styles.role}>· {t("mentor.role")}</Text>
              </Text>
              <Text style={styles.progress}>
                {t("mentor.progress", { current: index + 1, total: MENTOR_STEPS.length })}
              </Text>
            </View>

            {/* Subject first. A player who already knows what a market is can
                see this beat is about the market and press on without
                reading the sentence. */}
            <Text style={styles.title}>{say(step.titleKey)}</Text>
            <Text style={styles.text}>{say(step.textKey)}</Text>

            {/* And the one thing to actually do, lifted out of the prose.
                Every beat used to end with its instruction buried in the
                middle of a paragraph. */}
            {step.tipKey && (
              <View style={styles.tipRow}>
                <Text style={styles.tipMark}>▸</Text>
                <Text style={styles.tip}>{say(step.tipKey)}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          {!isLast && (
            <ScalePressable onPress={onSkip} style={styles.skipBtn} scaleTo={0.96}>
              <Text style={styles.skipText}>{t("mentor.skip")}</Text>
            </ScalePressable>
          )}
          {waitingOnPlayer ? (
            <View style={styles.waitingBadge}>
              <Text style={styles.waitingText}>{t("mentor.waiting")}</Text>
            </View>
          ) : (
            <ScalePressable onPress={onNext} style={styles.nextBtn} scaleTo={0.96}>
              <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
              <Text style={styles.nextText}>{isLast ? t("mentor.done") : t("mentor.next")}</Text>
            </ScalePressable>
          )}
        </View>
      </View>

      {/* Sibling of the card, not a child of it — the card clips its own
          content (overflow: hidden, for its rounded corners), which used to
          crop her at its edge. Rendered after it so document order puts her
          on top with no zIndex needed. */}
      <View style={styles.portraitFloat} pointerEvents="none">
        <MentorPortrait size={PORTRAIT_SIZE} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dock: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, zIndex: 30 },
  card: {
    borderRadius: RADIUS.feature,
    padding: SPACING.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: withAlpha(COLORS.accent, 0.45),
    ...cardShadow,
  },
  row: { flexDirection: "row", alignItems: "flex-start" },
  // Reserves the row's own space for the floating portrait (below); it
  // carries no image itself.
  portraitSpacer: { width: PORTRAIT_SIZE - 24, marginRight: SPACING.sm },
  // Positioned against the dock, not the card, so its top-left lands at the
  // card's own top-left corner (the dock has no padding above the card) and
  // she can spill up and out of it instead of being clipped by its
  // overflow. The negative top is how far above the card's edge she sits.
  portraitFloat: { position: "absolute", left: SPACING.md, top: -SPACING.xl },
  speech: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  name: {
    color: COLORS.accent,
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
  },
  role: { color: COLORS.textMuted, fontWeight: WEIGHT.regular, fontFamily: FONT.medium },
  progress: { color: COLORS.textMuted, fontSize: TYPE.micro, fontFamily: FONT.medium },
  title: {
    color: COLORS.textPrimary,
    fontSize: TYPE.heading,
    fontFamily: FONT.display,
    marginTop: 4,
    marginBottom: 3,
  },
  text: { color: COLORS.textMuted, fontSize: TYPE.label, lineHeight: 18 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 7 },
  tipMark: { color: COLORS.positive, fontSize: TYPE.label, lineHeight: 18, marginRight: 5 },
  tip: {
    flex: 1,
    color: COLORS.positive,
    fontSize: TYPE.label,
    lineHeight: 18,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: SPACING.sm },
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
  waitingBadge: {
    borderRadius: RADIUS.chip,
    paddingVertical: 9,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: withAlpha(COLORS.positive, 0.6),
    backgroundColor: withAlpha(COLORS.positive, 0.14),
  },
  waitingText: {
    color: COLORS.positive,
    fontFamily: FONT.bold,
    fontWeight: WEIGHT.bold,
    fontSize: TYPE.label,
    lineHeight: 18,
  },
});
