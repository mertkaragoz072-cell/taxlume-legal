import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Image,
  Animated,
  Easing,
} from "react-native";
import { t } from "../i18n/t";
import { Language } from "../i18n/t";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, GOLD_GRADIENT, RADIUS, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";
import { GradientFill } from "./GradientFill";
import { ScalePressable } from "./ScalePressable";

interface CaravanStep {
  titleKey: string;
  textKey: string;
}

const CARAVAN_STEPS: CaravanStep[] = [
  { titleKey: "caravanTutorial.step1Title", textKey: "caravanTutorial.step1Text" },
  { titleKey: "caravanTutorial.step2Title", textKey: "caravanTutorial.step2Text" },
  { titleKey: "caravanTutorial.step3Title", textKey: "caravanTutorial.step3Text" },
  { titleKey: "caravanTutorial.step4Title", textKey: "caravanTutorial.step4Text" },
  { titleKey: "caravanTutorial.step5Title", textKey: "caravanTutorial.step5Text" },
];

interface Props {
  visible: boolean;
  language: Language;
  onDismiss: () => void;
}

export function CaravanTutorialModal({ visible, language, onDismiss }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
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
  const isLast = stepIndex === CARAVAN_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      setStepIndex(0);
      onDismiss();
    } else {
      setStepIndex(stepIndex + 1);
    }
  };

  const handleSkip = () => {
    setStepIndex(0);
    onDismiss();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: enter,
              transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            },
          ]}
        >
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />

          <View style={styles.row}>
            {/* Character Portrait */}
            <View style={styles.portrait}>
              <Image
                source={require("../../assets/caravan-merchant-guide.png")}
                style={styles.characterImage}
                resizeMode="contain"
              />
            </View>

            {/* Speech Content */}
            <View style={styles.speech}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>
                  {t(language, "caravanTutorial.guideTitle")}
                  <Text style={styles.role}> · 🐪 Kervan Ustası</Text>
                </Text>
              </View>

              <Text style={styles.progress}>
                {stepIndex + 1} / {CARAVAN_STEPS.length}
              </Text>

              <Text style={styles.title}>{t(language, step.titleKey)}</Text>
              <Text style={styles.text}>{t(language, step.textKey)}</Text>
            </View>
          </View>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            {!isLast && (
              <ScalePressable onPress={handleSkip} style={styles.skipBtn} scaleTo={0.96}>
                <Text style={styles.skipText}>{t(language, "common.skip")}</Text>
              </ScalePressable>
            )}
            <ScalePressable onPress={handleNext} style={styles.nextBtn} scaleTo={0.96}>
              <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
              <Text style={styles.nextText}>{isLast ? t(language, "common.close") : t(language, "common.next")}</Text>
            </ScalePressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: withAlpha("#000000", 0.5),
  },
  card: {
    width: "90%",
    maxWidth: 400,
    borderRadius: RADIUS.feature,
    padding: SPACING.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: withAlpha(COLORS.accent, 0.45),
    ...cardShadow,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  portrait: {
    marginRight: SPACING.sm,
    marginTop: -2,
  },
  characterImage: {
    width: 100,
    height: 130,
  },
  speech: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  name: {
    color: COLORS.accent,
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
  },
  role: {
    color: COLORS.textMuted,
    fontWeight: WEIGHT.regular,
    fontFamily: FONT.medium,
  },
  progress: {
    color: COLORS.textMuted,
    fontSize: TYPE.micro,
    fontFamily: FONT.medium,
    marginBottom: 4,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: TYPE.heading,
    fontFamily: FONT.display,
    marginTop: 4,
    marginBottom: 3,
  },
  text: {
    color: COLORS.textMuted,
    fontSize: TYPE.label,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: SPACING.sm,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: SPACING.sm,
    marginRight: SPACING.xs,
  },
  skipText: {
    color: COLORS.textMuted,
    fontSize: TYPE.caption,
    fontFamily: FONT.medium,
  },
  nextBtn: {
    borderRadius: RADIUS.chip,
    paddingVertical: 9,
    paddingHorizontal: SPACING.lg,
    overflow: "hidden",
  },
  nextText: {
    color: "#1a1410",
    fontFamily: FONT.black,
    fontSize: TYPE.label,
    lineHeight: 18,
  },
});
