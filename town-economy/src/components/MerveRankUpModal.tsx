import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, GOLD_GRADIENT, RADIUS, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";
import { ConfettiBurst } from "./ConfettiBurst";
import { GradientFill } from "./GradientFill";
import { MentorPortrait } from "./MentorPortrait";
import { ModalBackdrop } from "./ModalBackdrop";
import { ScalePressable } from "./ScalePressable";

interface Props {
  rankUp: { icon: string; title: string } | null;
  onDismiss: () => void;
}

/** Merve, stepping out of her usual guide role to congratulate the player in
 * person the moment the town reaches a new rank — village to town, town to
 * city, and every tier after. The rank-up event still lands in the log
 * (see applyTownRankUp) for the player who wants the full record; this is
 * the one that actually stops them and makes the milestone feel earned. */
export function MerveRankUpModal({ rankUp, onDismiss }: Props) {
  const { t } = useEconomyContext();
  const enter = useRef(new Animated.Value(0)).current;
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  useEffect(() => {
    if (!rankUp) return;
    setConfettiTrigger((n) => n + 1);
    enter.setValue(0);
    Animated.spring(enter, { toValue: 1, useNativeDriver: true, friction: 7, tension: 55 }).start();
  }, [rankUp, enter]);

  if (!rankUp) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <ModalBackdrop>
        <Animated.View
          style={{
            opacity: enter,
            transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
          }}
        >
          <View style={styles.card}>
            <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
            <MentorPortrait size={132} />
            <Text style={styles.eyebrow}>{t("merveRankUp.eyebrow")}</Text>
            <Text style={styles.title}>{t("merveRankUp.title")}</Text>
            <Text style={styles.body}>
              {t("merveRankUp.body", { icon: rankUp.icon, title: rankUp.title })}
            </Text>

            <ScalePressable onPress={onDismiss} style={styles.confirmBtn} scaleTo={0.96}>
              <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
              <Text style={styles.confirmBtnText}>{t("merveRankUp.confirmBtn")}</Text>
            </ScalePressable>
          </View>
        </Animated.View>
      </ModalBackdrop>
      <ConfettiBurst trigger={confettiTrigger} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: RADIUS.feature,
    borderWidth: 1,
    borderColor: withAlpha(COLORS.accent, 0.35),
    padding: SPACING.lg,
    alignItems: "center",
    overflow: "hidden",
    ...cardShadow,
  },
  eyebrow: {
    color: COLORS.accent,
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    letterSpacing: 1,
    marginTop: SPACING.sm,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: TYPE.heading,
    fontFamily: FONT.display,
    marginTop: 4,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  body: {
    color: COLORS.textMuted,
    fontSize: TYPE.body,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: SPACING.lg,
  },
  confirmBtn: {
    width: "100%",
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.md,
    alignItems: "center",
    overflow: "hidden",
  },
  confirmBtnText: { color: COLORS.onLight, fontWeight: WEIGHT.black, fontFamily: FONT.black, fontSize: TYPE.body },
});
