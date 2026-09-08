import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, StyleSheet, Text, View } from "react-native";
import { useSoundEffects } from "../audio/useSoundEffects";
import { useEconomyContext } from "../economy/EconomyContext";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, GOLD_GRADIENT, RADIUS, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";
import { GradientFill } from "./GradientFill";
import { ModalBackdrop } from "./ModalBackdrop";
import { ScalePressable } from "./ScalePressable";

interface Props {
  visible: boolean;
  amount: number;
  streakCount: number;
  onDismiss: () => void;
  onRevealed: () => void;
  sounds: ReturnType<typeof useSoundEffects>;
}

const WHEEL_ICONS = ["🪙", "💰", "🎁", "🪙", "💰", "🎁", "🪙", "💰"];
const WHEEL_RADIUS = 78;
const CHIP_SIZE = 34;

function chipPosition(index: number) {
  const angle = (index / WHEEL_ICONS.length) * 2 * Math.PI - Math.PI / 2;
  return {
    left: WHEEL_RADIUS + Math.cos(angle) * WHEEL_RADIUS - CHIP_SIZE / 2,
    top: WHEEL_RADIUS + Math.sin(angle) * WHEEL_RADIUS - CHIP_SIZE / 2,
  };
}

/** A once-a-day spin-to-reveal wheel over the daily check-in bonus. The
 * amount is already fixed by the streak formula (see dailyCheckIn in
 * useEconomy.ts) and already in the player's cash by the time this shows —
 * the spin is a celebratory reveal animation, not real randomness. */
export function DailyRewardWheelModal({ visible, amount, streakCount, onDismiss, onRevealed, sounds }: Props) {
  const { t } = useEconomyContext();
  const [spinning, setSpinning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setSpinning(false);
      setRevealed(false);
      rotateAnim.setValue(0);
    }
  }, [visible, rotateAnim]);

  if (!visible) return null;

  const spin = () => {
    setSpinning(true);
    const finalDeg = 360 * 5 + Math.floor(Math.random() * 360);
    Animated.timing(rotateAnim, {
      toValue: finalDeg,
      duration: 2600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSpinning(false);
      setRevealed(true);
      sounds.playSuccess();
      onRevealed();
    });
  };

  const rotateDeg = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "1deg"] });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <ModalBackdrop>
        <View style={styles.card}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          <Text style={styles.title}>{t("dailyWheel.title")}</Text>
          <Text style={styles.subtitle}>
            {revealed ? t("dailyWheel.streakLabel", { count: streakCount }) : t("dailyWheel.subtitle")}
          </Text>

          <View style={styles.wheelWrap}>
            <View style={styles.pointer} />
            <Animated.View style={[styles.wheel, { transform: [{ rotate: rotateDeg }] }]}>
              {WHEEL_ICONS.map((icon, i) => (
                <View key={i} style={[styles.chip, chipPosition(i)]}>
                  <Text style={styles.chipIcon}>{icon}</Text>
                </View>
              ))}
            </Animated.View>
            <View style={styles.hubHalo} />
            <View style={styles.hub} />
          </View>

          {revealed ? (
            <>
              <Text style={styles.wonTitle}>{t("dailyWheel.wonTitle")}</Text>
              <Text style={styles.wonAmount}>{t("dailyWheel.wonAmount", { amount })}</Text>
              <ScalePressable onPress={onDismiss} style={styles.spinBtn} scaleTo={0.96}>
                <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
                <Text style={styles.spinBtnText}>{t("dailyWheel.claimBtn")}</Text>
              </ScalePressable>
            </>
          ) : (
            <ScalePressable disabled={spinning} onPress={spin} style={styles.spinBtn} scaleTo={0.96}>
              <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
              <Text style={styles.spinBtnText}>
                {spinning ? t("dailyWheel.spinning") : t("dailyWheel.spinBtn")}
              </Text>
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
    maxWidth: 340,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    overflow: "hidden",
    ...cardShadow,
  },
  title: { color: "#f0e3c8", fontSize: 16, fontFamily: FONT.display, marginBottom: 4 },
  subtitle: { color: "#a0917a", fontSize: 12, marginBottom: SPACING.lg, textAlign: "center" },
  wheelWrap: {
    width: WHEEL_RADIUS * 2,
    height: WHEEL_RADIUS * 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  pointer: {
    position: "absolute",
    top: -4,
    zIndex: 2,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 11,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.5,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  wheel: {
    width: WHEEL_RADIUS * 2,
    height: WHEEL_RADIUS * 2,
    borderRadius: WHEEL_RADIUS,
    backgroundColor: "#1a1410",
    borderWidth: 2,
    borderColor: "#3a2d1e",
  },
  chip: {
    position: "absolute",
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: CHIP_SIZE / 2,
    backgroundColor: "#2a2016",
    borderWidth: 1,
    borderColor: withAlpha(COLORS.accent, 0.22),
    alignItems: "center",
    justifyContent: "center",
  },
  chipIcon: { fontSize: 16 },
  hubHalo: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: withAlpha(COLORS.accent, 0.18),
  },
  hub: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
  },
  wonTitle: { color: "#ffd75e", fontSize: TYPE.title, fontWeight: WEIGHT.black, fontFamily: FONT.black },
  wonAmount: {
    color: COLORS.positive,
    fontSize: TYPE.title + 8,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
  spinBtn: {
    width: "100%",
    borderRadius: RADIUS.card,
    paddingVertical: 12,
    alignItems: "center",
    overflow: "hidden",
  },
  spinBtnText: { color: "#1a1410", fontWeight: "800", fontFamily: FONT.black, fontSize: 14 },
});
