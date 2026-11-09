import React, { useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { Text } from "./AppText";
import { useEconomyContext } from "../economy/EconomyContext";
import { FONT } from "../theme";
import icBook from "../../assets/ui/modal/ic_book.webp";
import { ModalBackdrop } from "./ModalBackdrop";
import { ArrowButton, BigButton, ModalShell, ParchmentNote } from "./ModalKit";
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
        <ModalShell title={t("a11y.help")} plateIcon={icBook} onClose={skip}>
          <View style={styles.carousel}>
            <ArrowButton dir="left" onPress={() => setIndex(index - 1)} disabled={index === 0} />
            <View style={{ flex: 1, marginHorizontal: 6 }}>
              <ParchmentNote>
                <Text style={styles.emoji}>{slide.icon}</Text>
                <Text style={[styles.title, { color: "#3b2412" }]}>{t(slide.titleKey)}</Text>
                <Text style={styles.body}>{t(slide.bodyKey)}</Text>
              </ParchmentNote>
            </View>
            <ArrowButton dir="right" onPress={() => setIndex(index + 1)} disabled={isLast} />
          </View>

          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View
                key={i}
                style={[styles.dot, i === index && [styles.dotActive, { backgroundColor: "#f4c43c" }]]}
              />
            ))}
          </View>

          <BigButton label={isLast ? t("tutorial.start") : t("tutorial.next")} onPress={next} />

          {!isLast && (
            <ScalePressable onPress={skip} style={styles.skipBtn} scaleTo={0.96}>
              <Text style={styles.skipBtnText}>{t("tutorial.skip")}</Text>
            </ScalePressable>
          )}
        </ModalShell>
      </ModalBackdrop>
    </Modal>
  );
}

const styles = StyleSheet.create({
  carousel: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  emoji: { fontSize: 44, textAlign: "center", marginBottom: 6 },
  title: { fontSize: 16, fontFamily: FONT.display, textAlign: "center", marginBottom: 6 },
  body: { color: "#4a3320", fontFamily: FONT.medium, fontSize: 12.5, lineHeight: 18, textAlign: "center" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 7, marginVertical: 8 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.22)" },
  dotActive: { width: 11, height: 11, borderRadius: 6 },
  skipBtn: { alignItems: "center", paddingVertical: 10, marginTop: 2 },
  skipBtnText: { color: "#d8c8a8", fontSize: 13, fontFamily: FONT.medium },
});
