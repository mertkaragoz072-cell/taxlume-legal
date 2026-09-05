import React, { useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { CARD_GRADIENT, cardShadow, GOLD_GRADIENT } from "../theme";
import { GradientFill } from "./GradientFill";
import { ScalePressable } from "./ScalePressable";

interface Slide {
  icon: string;
  titleKey: string;
  bodyKey: string;
}

const SLIDES: Slide[] = [
  { icon: "🏘️", titleKey: "tutorial.slide1Title", bodyKey: "tutorial.slide1Body" },
  { icon: "📈", titleKey: "tutorial.slide2Title", bodyKey: "tutorial.slide2Body" },
  { icon: "🔥", titleKey: "tutorial.slide3Title", bodyKey: "tutorial.slide3Body" },
  { icon: "🚚", titleKey: "tutorial.slide4Title", bodyKey: "tutorial.slide4Body" },
  { icon: "🏛️", titleKey: "tutorial.slide5Title", bodyKey: "tutorial.slide5Body" },
  { icon: "🔬", titleKey: "tutorial.slide6Title", bodyKey: "tutorial.slide6Body" },
  { icon: "🏦", titleKey: "tutorial.slide7Title", bodyKey: "tutorial.slide7Body" },
  { icon: "🏆", titleKey: "tutorial.slide8Title", bodyKey: "tutorial.slide8Body" },
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
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          <Text style={styles.icon}>{slide.icon}</Text>
          <Text style={styles.title}>{t(slide.titleKey)}</Text>
          <Text style={styles.body}>{t(slide.bodyKey)}</Text>

          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    overflow: "hidden",
    ...cardShadow,
  },
  icon: { fontSize: 44, marginBottom: 10 },
  title: { color: "#f0e3c8", fontSize: 18, fontWeight: "800", marginBottom: 10, textAlign: "center" },
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
  nextBtnText: { color: "#1a1410", fontWeight: "800", fontSize: 14 },
  skipBtn: { marginTop: 10, paddingVertical: 6 },
  skipBtnText: { color: "#a0917a", fontSize: 12, fontWeight: "600" },
});
