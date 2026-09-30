import React, { useRef, useState } from "react";
import { Animated, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import proposalSource from "../../assets/proposal-photo.png";
import { CARD_GRADIENT, COLORS, FONT, GOLD_GRADIENT, RADIUS, SPACING, TYPE, WEIGHT, cardShadow } from "../theme";
import { ConfettiBurst } from "./ConfettiBurst";
import { GradientFill } from "./GradientFill";
import { ModalBackdrop } from "./ModalBackdrop";
import { ScalePressable } from "./ScalePressable";

const NO_BTN_SIZE = { width: 108, height: 46 };

interface Props {
  visible: boolean;
  onAccept: () => void;
}

/** A one-off, non-translated easter egg, not a game feature — the proposal
 * itself is in Turkish on purpose, shown every time "Başla" is pressed.
 * "Hayır" never actually answers no: it dodges away from the pointer (web
 * hover) and from the very start of a press (touch), so in practice only
 * "Evet" can ever be reached. */
export function ProposalModal({ visible, onAccept }: Props) {
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [dodged, setDodged] = useState(false);
  const [zoneSize, setZoneSize] = useState({ width: 260, height: 110 });
  const noLeft = useRef(new Animated.Value(0)).current;
  const noTop = useRef(new Animated.Value(0)).current;

  if (!visible) return null;

  const dodge = () => {
    const maxLeft = Math.max(0, zoneSize.width - NO_BTN_SIZE.width);
    const maxTop = Math.max(0, zoneSize.height - NO_BTN_SIZE.height);
    setDodged(true);
    Animated.spring(noLeft, {
      toValue: Math.random() * maxLeft,
      useNativeDriver: false,
      speed: 26,
      bounciness: 16,
    }).start();
    Animated.spring(noTop, {
      toValue: Math.random() * maxTop,
      useNativeDriver: false,
      speed: 26,
      bounciness: 16,
    }).start();
  };

  const handleAccept = () => {
    setAccepted(true);
    setConfettiTrigger((n) => n + 1);
    // A beat to let the confetti and the "EVET!" text land before the game
    // takes over the screen.
    setTimeout(onAccept, 1100);
  };

  return (
    <Modal visible transparent animationType="fade">
      <ModalBackdrop>
        <View style={styles.card}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          <Image
            source={proposalSource}
            style={styles.image}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
          <Text style={styles.title}>{accepted ? "EVET DEDİ! 💍✨" : "BENİMLE EVLENİR MİSİN? 💍"}</Text>
          {!accepted && (
            <View
              style={styles.dodgeZone}
              onLayout={(e) =>
                setZoneSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
              }
            >
              <ScalePressable onPress={handleAccept} style={styles.yesBtn} scaleTo={0.95}>
                <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
                <Text style={styles.yesBtnText}>EVET 💖</Text>
              </ScalePressable>
              <Animated.View
                style={[
                  styles.noBtnWrap,
                  dodged && { position: "absolute", left: noLeft, top: noTop },
                ]}
              >
                <Pressable
                  onHoverIn={dodge}
                  onPressIn={dodge}
                  onPress={dodge}
                  style={styles.noBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.noBtnText}>Hayır</Text>
                </Pressable>
              </Animated.View>
            </View>
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
  // A fixed height (not aspectRatio, which react-native-web's Image doesn't
  // size itself by) — "cover" then crops the source to fit, which keeps the
  // card a predictable, on-screen size on every device instead of growing
  // to the full 1312x1199 photo and pushing the buttons off-screen.
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
    marginBottom: SPACING.lg,
  },
  dodgeZone: { width: "100%", height: 110, position: "relative" },
  yesBtn: {
    alignSelf: "center",
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg + 8,
    overflow: "hidden",
  },
  yesBtnText: {
    color: COLORS.onLight,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    fontSize: TYPE.body,
  },
  noBtnWrap: { alignSelf: "center", marginTop: SPACING.md },
  noBtn: {
    width: NO_BTN_SIZE.width,
    height: NO_BTN_SIZE.height,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  noBtnText: {
    color: COLORS.textMuted,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    fontSize: TYPE.body,
  },
});
