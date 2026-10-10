import React, { useState } from "react";
import { Image, Modal, StyleSheet, Text, View } from "react-native";
import panel1 from "../../assets/birthday-comic/panel1.png";
import panel2 from "../../assets/birthday-comic/panel2.png";
import panel3 from "../../assets/birthday-comic/panel3.png";
import panel4 from "../../assets/birthday-comic/panel4.png";
import panel5 from "../../assets/birthday-comic/panel5.png";
import panel6 from "../../assets/birthday-comic/panel6.png";
import {
  CARD_GRADIENT,
  COLORS,
  FONT,
  GOLD_GRADIENT,
  RADIUS,
  SPACING,
  TYPE,
  WEIGHT,
  cardShadow,
} from "../theme";
import { ConfettiBurst } from "./ConfettiBurst";
import { GradientFill } from "./GradientFill";
import { ModalBackdrop } from "./ModalBackdrop";
import { ScalePressable } from "./ScalePressable";

const PANELS = [panel1, panel2, panel3, panel4, panel5, panel6];

interface Props {
  visible: boolean;
  onFinish: () => void;
}

/** A one-off, non-translated easter egg in the same spirit as ProposalModal
 * — a 6-panel birthday comic, each panel's own text baked into the art,
 * shown right after "Başla" and before the marriage proposal. Paginated the
 * same way TutorialModal is (tap through, dots track progress) since that
 * is the one multi-step modal already in the app. */
export function BirthdayComicModal({ visible, onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  // react-native-web's Image doesn't size itself by aspectRatio (see
  // ProposalModal's identical note) — measuring the rendered width and
  // feeding it back as an explicit height is what AmbientGlow does for the
  // same reason. These panels were cropped square with no margin to spare,
  // so a true square box matters here: anything off-square crops baked-in
  // text right off the edge, which a wider photo like ProposalModal's own
  // can shrug off but these panels can't.
  const [boxSize, setBoxSize] = useState(280);
  if (!visible) return null;

  const isLast = index === PANELS.length - 1;

  const next = () => {
    if (isLast) {
      setConfettiTrigger((n) => n + 1);
      setIndex(0);
      setTimeout(onFinish, 700);
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
          <View style={styles.imageWrap} onLayout={(e) => setBoxSize(e.nativeEvent.layout.width)}>
            <Image
              source={PANELS[index]}
              style={{ width: boxSize, height: boxSize, borderRadius: RADIUS.card }}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          </View>

          <View style={styles.dots}>
            {PANELS.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>

          <ScalePressable onPress={next} style={styles.nextBtn} scaleTo={0.96}>
            <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
            <Text style={styles.nextBtnText}>{isLast ? "Hadi Başlayalım 💛" : "İleri"}</Text>
          </ScalePressable>

          {!isLast && (
            <ScalePressable onPress={skip} style={styles.skipBtn} scaleTo={0.96}>
              <Text style={styles.skipBtnText}>Geç</Text>
            </ScalePressable>
          )}
        </View>
      </ModalBackdrop>
      <ConfettiBurst trigger={confettiTrigger} big />
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "92%",
    borderRadius: RADIUS.feature,
    borderWidth: 1,
    borderColor: "rgba(240, 212, 148, 0.35)",
    padding: SPACING.lg,
    overflow: "hidden",
    alignItems: "center",
    ...cardShadow,
  },
  imageWrap: { width: "100%", marginBottom: SPACING.lg },
  dots: { flexDirection: "row", gap: 6, marginBottom: SPACING.lg },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4a4032",
  },
  dotActive: { backgroundColor: COLORS.accent, width: 18 },
  nextBtn: {
    width: "100%",
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.md,
    alignItems: "center",
    overflow: "hidden",
  },
  nextBtnText: { color: COLORS.onLight, fontFamily: FONT.black, fontSize: TYPE.body, lineHeight: 20 },
  skipBtn: { marginTop: SPACING.sm + 2, paddingVertical: 6 },
  skipBtnText: {
    color: COLORS.textMuted,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.medium,
    fontFamily: FONT.medium,
  },
});
