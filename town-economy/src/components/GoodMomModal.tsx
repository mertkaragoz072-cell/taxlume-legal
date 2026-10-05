import React, { useState } from "react";
import { Image, Modal, StyleSheet, Text, View } from "react-native";
import goodMomSource from "../../assets/good-mom-photo.png";
import { CARD_GRADIENT, COLORS, FONT, GOLD_GRADIENT, RADIUS, SPACING, TYPE, WEIGHT, cardShadow } from "../theme";
import { ConfettiBurst } from "./ConfettiBurst";
import { GradientFill } from "./GradientFill";
import { ModalBackdrop } from "./ModalBackdrop";
import { ScalePressable } from "./ScalePressable";

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

/** A one-off, non-translated easter egg in the same spirit as
 * ProposalModal — shown right after "Evet," before the game itself
 * opens, so the two read as one beat instead of a proposal followed by
 * an unrelated interruption. */
export function GoodMomModal({ visible, onDismiss }: Props) {
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  if (!visible) return null;

  const handleDismiss = () => {
    setConfettiTrigger((n) => n + 1);
    setTimeout(onDismiss, 700);
  };

  return (
    <Modal visible transparent animationType="fade">
      <ModalBackdrop>
        <View style={styles.card}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          <Image source={goodMomSource} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
          <Text style={styles.title}>ÇOK İYİ BİR ANNESİN 🥰</Text>
          <Text style={styles.body}>
            Onu bu kadar sevdiğin, bu kadar iyi baktığın için ne kadar şanslı olduğumuzu bir bilsen. İyi ki varsın.
          </Text>
          <ScalePressable onPress={handleDismiss} style={styles.btn} scaleTo={0.95}>
            <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
            <Text style={styles.btnText}>Hadi Başlayalım 💛</Text>
          </ScalePressable>
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
  // Fixed height, same reasoning as ProposalModal's own image: "cover"
  // crops the 1254x1254 source to fit a predictable card size instead of
  // growing to the full photo and pushing the button off-screen.
  image: {
    width: "100%",
    height: 220,
    borderRadius: RADIUS.card,
    marginBottom: SPACING.lg,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: TYPE.title,
    fontFamily: FONT.display,
    textAlign: "center",
    marginBottom: SPACING.sm + 2,
  },
  body: {
    color: COLORS.textMuted,
    fontSize: TYPE.body,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  btn: {
    alignSelf: "center",
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg + 8,
    overflow: "hidden",
  },
  btnText: {
    color: COLORS.onLight,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    fontSize: TYPE.body,
  },
});
