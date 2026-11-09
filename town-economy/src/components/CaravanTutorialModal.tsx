import React, { useEffect, useRef } from "react";
import { StyleSheet, Image, Animated, Easing, View, useWindowDimensions } from "react-native";
import { Text } from "./AppText";
import { t } from "../i18n/t";
import { Language } from "../i18n/t";
import { FONT, SPACING } from "../theme";
import frameArt from "../../assets/ui/modal/cv_frame.webp";
import { upperForUi } from "../utils/uiLanguage";
import { ScalePressable } from "./ScalePressable";
import { SpotlightId } from "./Spotlight";

const ART_W = 702;
const ART_H = 558;

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
  const { width: winW } = useWindowDimensions();
  const cardW = Math.min(winW - SPACING.md * 2, 460);

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

  const k = cardW / ART_W;
  const box = (x: number, y: number, bw: number, bh: number) => ({
    position: "absolute" as const,
    left: x * k,
    top: y * k,
    width: bw * k,
    height: bh * k,
  });
  const u = Math.max(0.8, Math.min(1.15, cardW / 360));
  const fit = (text: string, boxW: number, max: number, em: number) =>
    Math.min(max, (boxW * k * 0.96) / (Math.max(1, text.length) * em));
  const guide = t(language, "caravanTutorial.guideTitle");
  const role = t(language, "caravanTutorial.guideRole").replace(/^[^\p{L}\p{N}]+/u, "");
  const title = upperForUi(t(language, step.titleKey));
  const body = t(language, step.textKey, { threshold: tradeUnlockThreshold });
  const progress = `${stepIndex + 1} / ${CARAVAN_STEPS.length}`;
  const nextLabel = isLast ? t(language, "common.close") : t(language, "common.next");
  // Largest body size at which the words still fit the painted text field.
  let bodySize = 14.5 * u;
  const fieldW = 332 * k;
  const fieldH = 160 * k;
  while (bodySize > 9 && Math.ceil((body.length * 0.54 * bodySize) / fieldW) * bodySize * 1.25 > fieldH) {
    bodySize -= 0.25;
  }

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
      <View style={{ width: cardW, height: ART_H * k, alignSelf: "center" }}>
        <Image source={frameArt} style={styles.fill} resizeMode="stretch" />
        <View style={[box(246, 58, 223, 37), styles.center]} pointerEvents="none">
          <Text style={[styles.plateName, { fontSize: fit(guide, 215, 20 * u, 0.62) }]} numberOfLines={1}>
            {guide}
          </Text>
        </View>
        <View style={[box(311, 94, 145, 27), styles.center]} pointerEvents="none">
          <Text style={[styles.plateRole, { fontSize: fit(role, 140, 13 * u, 0.6) }]} numberOfLines={1}>
            {role}
          </Text>
        </View>
        <View style={[box(564, 70, 79, 35), styles.center]} pointerEvents="none">
          <Text style={[styles.counter, { fontSize: 15 * u }]} numberOfLines={1}>
            {progress}
          </Text>
        </View>
        <View style={[box(308, 144, 322, 44), styles.center]} pointerEvents="none">
          <Text style={[styles.title, { fontSize: fit(title, 322, 24 * u, 0.7) }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View style={box(325, 211, 332, 172)} pointerEvents="none">
          <Text style={[styles.body, { fontSize: bodySize, lineHeight: bodySize * 1.25 }]}>{body}</Text>
        </View>
        <ScalePressable
          onPress={onSkip}
          scaleTo={0.96}
          accessibilityLabel={t(language, "common.skip")}
          style={[box(324, 411, 96, 53), styles.center]}
        >
          <Text style={[styles.skipText, { fontSize: fit(t(language, "common.skip"), 70, 17 * u, 0.6) }]}>
            {t(language, "common.skip")}
          </Text>
        </ScalePressable>
        <ScalePressable
          onPress={onNext}
          scaleTo={0.97}
          accessibilityLabel={nextLabel}
          style={box(430, 401, 223, 76)}
        >
          <View style={styles.nextBox}>
            <Text style={[styles.nextText, { fontSize: fit(nextLabel, 100, 24 * u, 0.6) }]} numberOfLines={1}>
              {nextLabel}
            </Text>
            {!isLast && <Text style={[styles.nextText, { fontSize: 26 * u, marginLeft: 6 }]}>›</Text>}
          </View>
        </ScalePressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Absolutely positioned rather than a normal flow sibling of the Trade
  // screen's ScrollView — a plain in-flow view here steals real height from
  // that ScrollView (React Native gives ScrollView flex-fill-remaining-space
  // behavior by default), squeezing its viewport down to whatever's left
  // under this card. TownMapView's own maxHeight budget assumed a generous
  // leftover and still lost the fight: the map rendered taller than what
  // was actually left, so its bottom rows (and once, a whole tier of towns)
  // ended up hidden under this card instead of above it — reported back
  // as the guide's own explanation staying behind the text. Floating over
  // the screen instead of pushing it up is also what the comments on this
  // component already claimed ("the trade screen stays live behind him") —
  // this was the one property that wasn't actually true yet.
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    zIndex: 30,
  },
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  center: { alignItems: "center", justifyContent: "center" },
  plateName: { color: "#3b2210", fontFamily: FONT.serif },
  plateRole: { color: "#5a3a1c", fontFamily: FONT.serif },
  counter: { color: "#f4dca0", fontFamily: FONT.serif, lineHeight: 18 },
  title: { color: "#fbeccb", fontFamily: FONT.serif, textAlign: "center" },
  body: { color: "#f6e8c8", fontFamily: FONT.medium },
  skipText: { color: "#f6e8c8", fontFamily: FONT.serif },
  nextBox: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingLeft: 36 },
  nextText: {
    color: "#fbeccb",
    fontFamily: FONT.serif,
    textShadowColor: "rgba(20,40,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
