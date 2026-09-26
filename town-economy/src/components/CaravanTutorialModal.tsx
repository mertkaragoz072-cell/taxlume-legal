import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Image, Animated, Easing } from "react-native";
import caravanGuideImage from "../../assets/mentor-merve.png";
import { t } from "../i18n/t";
import { Language } from "../i18n/t";
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
import { ScalePressable } from "./ScalePressable";
import { SpotlightId } from "./Spotlight";

interface CaravanStep {
  titleKey: string;
  textKey: string;
  /** Which control this beat is about — SpotlightOverlay lights it up and
   * dims the rest of the trade screen, same as the Merve tour. Left unset
   * for the opening beat, which isn't about any one control yet. */
  spotlight?: SpotlightId;
}

export const CARAVAN_STEPS: CaravanStep[] = [
  { titleKey: "caravanTutorial.step1Title", textKey: "caravanTutorial.step1Text" },
  { titleKey: "caravanTutorial.step2Title", textKey: "caravanTutorial.step2Text", spotlight: "caravanMap" },
  {
    titleKey: "caravanTutorial.step3Title",
    textKey: "caravanTutorial.step3Text",
    spotlight: "caravanDirection",
  },
  { titleKey: "caravanTutorial.step4Title", textKey: "caravanTutorial.step4Text", spotlight: "caravanMap" },
  { titleKey: "caravanTutorial.step5Title", textKey: "caravanTutorial.step5Text", spotlight: "caravanSend" },
];

interface Props {
  visible: boolean;
  stepIndex: number;
  language: Language;
  /** Net worth the map's "where can you trade" beat quotes as the unlock
   * bar — the string carries a `{threshold}` placeholder for it. */
  tradeUnlockThreshold: number;
  onNext: () => void;
  onSkip: () => void;
}

/** Kervan rehberinin öğretici karotu — Merve'nin ders panosuyla aynı kalıp:
 * ekranın geri kalanı canlı kalır, o sadece altını kaplar, ve anlattığı
 * kontrol SpotlightOverlay tarafından aydınlatılırken diğer her şey
 * bulanıklaşır. Tam ekran bir modal artık değil — arkasındaki Trade
 * ekranının kendisi ders malzemesi. */
export function CaravanTutorialModal({
  visible,
  stepIndex,
  language,
  tradeUnlockThreshold,
  onNext,
  onSkip,
}: Props) {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, visible, stepIndex]);

  if (!visible) return null;
  const step = CARAVAN_STEPS[stepIndex];
  if (!step) return null;
  const isLast = stepIndex === CARAVAN_STEPS.length - 1;

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
            <Image source={caravanGuideImage} style={styles.characterImage} resizeMode="contain" />
          </View>

          <View style={styles.speech}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>
                {t(language, "caravanTutorial.guideTitle")}
                <Text style={styles.role}> · {t(language, "caravanTutorial.guideRole")}</Text>
              </Text>
              <Text style={styles.progress}>
                {stepIndex + 1} / {CARAVAN_STEPS.length}
              </Text>
            </View>

            <Text style={styles.title}>{t(language, step.titleKey)}</Text>
            <Text style={styles.text}>{t(language, step.textKey, { threshold: tradeUnlockThreshold })}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          {!isLast && (
            <ScalePressable onPress={onSkip} style={styles.skipBtn} scaleTo={0.96}>
              <Text style={styles.skipText}>{t(language, "common.skip")}</Text>
            </ScalePressable>
          )}
          <ScalePressable onPress={onNext} style={styles.nextBtn} scaleTo={0.96}>
            <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
            <Text style={styles.nextText}>
              {isLast ? t(language, "common.close") : t(language, "common.next")}
            </Text>
          </ScalePressable>
        </View>
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
  portrait: { marginRight: SPACING.sm, marginTop: -2 },
  characterImage: { width: 84, height: 110 },
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
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: SPACING.sm },
  skipBtn: { paddingVertical: 8, paddingHorizontal: SPACING.sm, marginRight: SPACING.xs },
  skipText: { color: COLORS.textMuted, fontSize: TYPE.caption, fontFamily: FONT.medium },
  nextBtn: {
    borderRadius: RADIUS.chip,
    paddingVertical: 9,
    paddingHorizontal: SPACING.lg,
    overflow: "hidden",
  },
  nextText: { color: "#1a1410", fontFamily: FONT.black, fontSize: TYPE.label, lineHeight: 18 },
});
