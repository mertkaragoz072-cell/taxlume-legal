import React, { useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { CARD_GRADIENT, cardShadow, FONT, GOLD_GRADIENT } from "../theme";
import { GradientFill } from "./GradientFill";
import { IconBadge } from "./IconBadge";
import { ModalBackdrop } from "./ModalBackdrop";
import { ScalePressable } from "./ScalePressable";

interface Slide {
  icon: string;
  titleKey: string;
  bodyKey: string;
  color: string;
}

/** Three slides, and only three.
 *
 * There were eight: the market, inflation, caravans, tax, the tabs that open
 * later, the bank and prestige, achievements. A feature tour read before
 * touching anything, at the exact moment a player has no idea which parts
 * matter — and the last five were describing screens that are still locked.
 *
 * What is left is the premise and nothing else: whose town this is, that
 * trades move prices, and that inflation is the thing that ends a run. The
 * rest is taught by the guided steps (see economy/onboarding.ts), which make
 * the player do it rather than read about it, one mechanic at a time, as the
 * game unlocks them.
 */
const SLIDES: Slide[] = [
  { icon: "🏘️", titleKey: "tutorial.slide1Title", bodyKey: "tutorial.slide1Body", color: "#e8c777" },
  { icon: "📈", titleKey: "tutorial.slide2Title", bodyKey: "tutorial.slide2Body", color: "#5fd884" },
  { icon: "🔥", titleKey: "tutorial.slide3Title", bodyKey: "tutorial.slide3Body", color: "#f0776a" },
];

interface Props {
  visible: boolean;
  onFinish: () => void;
}

export function TutorialModal({ visible, onFinish }: Props) {
  const { t } = useEconomyContext();
  const [index, setIndex] = useState(0);
  if (!visible) return null;

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      setIndex(0);
      onFinish();
    } else {
      setIndex(index + 1);
    }
  };

  const skip = () => {
    setIndex(0);
    onFinish();
  };

  return (
    <Modal visible transparent animationType="fade">
      <ModalBackdrop>
        <View style={styles.card}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          <IconBadge icon={slide.icon} color={slide.color} size="lg" />
          <Text style={[styles.title, { color: slide.color }]}>{t(slide.titleKey)}</Text>
          <Text style={styles.body}>{t(slide.bodyKey)}</Text>

          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View
                key={i}
                style={[styles.dot, i === index && [styles.dotActive, { backgroundColor: s.color }]]}
              />
            ))}
          </View>

          <ScalePressable onPress={next} style={styles.nextBtn} scaleTo={0.96}>
            <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
            <Text style={styles.nextBtnText}>{isLast ? t("tutorial.start") : t("tutorial.next")}</Text>
          </ScalePressable>

          {!isLast && (
            <ScalePressable onPress={skip} style={styles.skipBtn} scaleTo={0.96}>
              <Text style={styles.skipBtnText}>{t("tutorial.skip")}</Text>
            </ScalePressable>
          )}
        </View>
      </ModalBackdrop>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    overflow: "hidden",
    ...cardShadow,
  },
  title: { color: "#f0e3c8", fontSize: 18, fontFamily: FONT.display, marginBottom: 10, textAlign: "center" },
  body: { color: "#a0917a", fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 18 },
  dots: { flexDirection: "row", gap: 6, marginBottom: 18 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4a4032",
    marginRight: 6,
  },
  dotActive: { backgroundColor: "#e8c777", width: 18 },
  nextBtn: {
    width: "100%",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    overflow: "hidden",
  },
  // No numeric fontWeight alongside the family. FONT.black already *is* the
  // heavy cut, and asking iOS for a weight on top of a weighted file makes it
  // synthesise one, which shifts the metrics — the label rendered below the
  // button's bottom edge on a phone, half of it outside the gold. lineHeight
  // is spelled out for the same reason: left to the font, the line box was
  // taller than the space the button had reserved for it.
  nextBtnText: { color: "#1a1410", fontFamily: FONT.black, fontSize: 14, lineHeight: 20 },
  skipBtn: { marginTop: 10, paddingVertical: 6 },
  skipBtnText: { color: "#a0917a", fontSize: 12, fontWeight: "600", fontFamily: FONT.medium },
});
