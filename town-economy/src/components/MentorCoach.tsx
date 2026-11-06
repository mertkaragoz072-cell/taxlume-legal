import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, useWindowDimensions, View } from "react-native";
import cardArt from "../../assets/ui/mervecard/card.webp";
import { Text } from "./AppText";
import { useEconomyContext } from "../economy/EconomyContext";
import { DIFFICULTIES } from "../economy/difficulty";
import { effectiveDifficultyConfig } from "../economy/ngPlusModifiers";
import { currentMentorStep, isWaitingOnPlayer, MENTOR_STEPS } from "../economy/mentor";
import { FONT, SCREEN_PADDING, SPACING } from "../theme";
import { ScalePressable } from "./ScalePressable";

interface Props {
  /** advance the tour by one beat */
  onNext: () => void;
  /** end it early */
  onSkip: () => void;
}

// The sent card, cropped from its sheet to 1616 x 853. Every field below is
// read off the original sheet (1637 wide) and shifted by the crop (OX, OY),
// then scaled by card width / ART_W so the words stay on their plaques.
const ART_W = 1616;
const ART_H = 853;
const OX = 10;
const OY = 75;
const NAME = { x: 672, y: 195, w: 638, h: 83 };
const TAG = { x: 1337, y: 195, w: 225, h: 77 };
const TITLE = { x: 698, y: 320, w: 810, h: 110 };
const BODY = { x: 698, y: 480, w: 880, h: 225 };
const SKIP = { x: 852, y: 735, w: 218, h: 93 };
const NEXT = { x: 1103, y: 712, w: 414, h: 128 };

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
  const { width: windowWidth } = useWindowDimensions();
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

  const name = `${t("mentor.name")} · ${t("mentor.role")}`;
  const title = say(step.titleKey);
  const body = say(step.textKey);
  const tip = step.tipKey ? say(step.tipKey) : "";
  const progress = t("mentor.progress", { current: index + 1, total: MENTOR_STEPS.length });
  const nextLabel = waitingOnPlayer ? t("mentor.waiting") : isLast ? t("mentor.done") : t("mentor.next");
  const cardW = Math.min(windowWidth - SCREEN_PADDING * 2, 480);
  const s = cardW / ART_W;
  const cardH = ART_H * s;
  const w = (px: number) => px * s;
  const x = (px: number) => (px - OX) * s;
  const y = (px: number) => (px - OY) * s;

  // The art's text field is small, so the body is sized from its length: the
  // largest size at which the sentence and its tip still fit the field
  // (phone letters average ~0.52em). Better a smaller line than one that
  // runs over the buttons.
  const fieldW = w(BODY.w);
  const fieldH = w(BODY.h);
  let bodySize = 12.5;
  const linesAt = (size: number) =>
    Math.ceil((body.length * 0.52 * size) / fieldW) +
    (tip ? Math.ceil(((tip.length + 3) * 0.52 * size) / fieldW) : 0);
  while (bodySize > 8.5 && linesAt(bodySize) * bodySize * 1.17 > fieldH) bodySize -= 0.25;
  const fit = (text: string, boxW: number, maxSize: number, em: number) =>
    Math.min(maxSize, (boxW * 0.92) / (text.length * em));

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
      {/* Merve's painted card: her portrait, the name plaque, the step tag,
          the title scroll and both buttons are all in the art. Only the
          words are drawn. */}
      <View style={{ width: cardW, height: cardH }}>
        <Image source={cardArt} style={styles.art} resizeMode="stretch" />

        <View
          style={[styles.field, { left: x(NAME.x), top: y(NAME.y), width: w(NAME.w), height: w(NAME.h) }]}
        >
          <Text
            style={[styles.name, { fontSize: fit(name, w(NAME.w), w(NAME.h) * 0.5, 0.84) }]}
            numberOfLines={1}
          >
            {name}
          </Text>
        </View>
        <View style={[styles.field, { left: x(TAG.x), top: y(TAG.y), width: w(TAG.w), height: w(TAG.h) }]}>
          <Text
            style={[styles.progress, { fontSize: fit(progress, w(TAG.w), w(TAG.h) * 0.46, 0.62) }]}
            numberOfLines={1}
          >
            {progress}
          </Text>
        </View>
        <View
          style={[styles.field, { left: x(TITLE.x), top: y(TITLE.y), width: w(TITLE.w), height: w(TITLE.h) }]}
        >
          <Text
            accessibilityRole="header"
            style={[styles.title, { fontSize: fit(title, w(TITLE.w), w(TITLE.h) * 0.46, 0.86) }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        <View style={[styles.bodyBox, { left: x(BODY.x), top: y(BODY.y), width: fieldW, height: fieldH }]}>
          <Text style={[styles.body, { fontSize: bodySize, lineHeight: bodySize * 1.17 }]}>{body}</Text>
          {tip ? (
            <Text style={[styles.tip, { fontSize: bodySize, lineHeight: bodySize * 1.17 }]}>▸ {tip}</Text>
          ) : null}
        </View>

        <ScalePressable
          onPress={onSkip}
          accessibilityLabel={t("mentor.skip")}
          style={[styles.field, { left: x(SKIP.x), top: y(SKIP.y), width: w(SKIP.w), height: w(SKIP.h) }]}
          scaleTo={0.96}
        >
          <Text
            style={[styles.skipText, { fontSize: fit(t("mentor.skip"), w(SKIP.w), w(SKIP.h) * 0.5, 0.62) }]}
          >
            {t("mentor.skip")}
          </Text>
        </ScalePressable>
        {waitingOnPlayer ? (
          <View
            style={[styles.field, { left: x(NEXT.x), top: y(NEXT.y), width: w(NEXT.w), height: w(NEXT.h) }]}
          >
            <Text
              style={[
                styles.nextText,
                { fontSize: fit(nextLabel, w(NEXT.w), w(NEXT.h) * 0.4, 0.62), opacity: 0.8 },
              ]}
            >
              {nextLabel}
            </Text>
          </View>
        ) : (
          <ScalePressable
            onPress={onNext}
            accessibilityLabel={nextLabel}
            style={[styles.field, { left: x(NEXT.x), top: y(NEXT.y), width: w(NEXT.w), height: w(NEXT.h) }]}
            scaleTo={0.96}
          >
            <Text style={[styles.nextText, { fontSize: fit(nextLabel, w(NEXT.w), w(NEXT.h) * 0.4, 0.62) }]}>
              {nextLabel}
            </Text>
          </ScalePressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Absolutely positioned for the same reason as CaravanTutorialModal's
  // identically-named dock (see its comment): left in normal flow, this
  // view steals height from whichever screen's ScrollView is mounted
  // behind it (Market's "buy" spotlight beat included), squeezing its
  // viewport and risking the same target-hidden-under-the-card bug there.
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingBottom: SPACING.sm,
    zIndex: 30,
  },
  art: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  field: { position: "absolute", alignItems: "center", justifyContent: "center" },
  bodyBox: { position: "absolute", overflow: "hidden" },
  name: { color: "#f6e2a0", fontFamily: FONT.display, textAlign: "center", letterSpacing: 0.5 },
  progress: { color: "#f1e3b8", fontFamily: FONT.bold, textAlign: "center" },
  title: { color: "#4a2f1a", fontFamily: FONT.display, textAlign: "center" },
  body: { color: "#3d2415", fontFamily: FONT.medium },
  tip: { color: "#1f6b32", fontFamily: FONT.bold, marginTop: 1 },
  skipText: { color: "#5a3d22", fontFamily: FONT.bold, textAlign: "center" },
  nextText: { color: "#f6e2a0", fontFamily: FONT.black, textAlign: "center" },
});
