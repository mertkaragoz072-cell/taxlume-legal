import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, GOLD_GRADIENT, RADIUS, SPACING, TYPE, WEIGHT } from "../theme";
import { GradientFill } from "./GradientFill";
import { ModalBackdrop } from "./ModalBackdrop";
import { ScalePressable } from "./ScalePressable";

interface Props {
  visible: boolean;
  onResolve: (tariffDiscountBonus: number) => void;
}

const BAR_WIDTH = 280;
const MARKER_SIZE = 20;
const PASS_MS = 950;

// Tap accuracy tiers, scored by distance from the bar's center (0 = dead
// center, 1 = either edge) — never a penalty, worst case is just no bonus.
const PERFECT_ZONE = 0.12;
const GOOD_ZONE = 0.35;
const PERFECT_BONUS = 0.5;
const GOOD_BONUS = 0.25;

type Result = { tier: "perfect" | "good" | "miss"; bonus: number } | null;

/** An optional, always-upside timing mini-game offered on some caravan
 * sends (see TradeScreen's random trigger): tap "Stop!" while a marker
 * ping-pongs across a bar, land near the center for a one-off tariff
 * discount on that caravan only (see sendCaravan's tariffDiscountBonus). */
export function BargainingModal({ visible, onResolve }: Props) {
  const { t } = useEconomyContext();
  const [result, setResult] = useState<Result>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const animLoop = useRef<Animated.CompositeAnimation | null>(null);
  const positionRef = useRef(0);

  useEffect(() => {
    if (!visible) return;
    setResult(null);
    anim.setValue(0);
    const listenerId = anim.addListener(({ value }) => {
      positionRef.current = value;
    });
    animLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: PASS_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: PASS_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    animLoop.current.start();
    return () => {
      animLoop.current?.stop();
      anim.removeListener(listenerId);
    };
  }, [visible, anim]);

  if (!visible) return null;

  const stop = () => {
    animLoop.current?.stop();
    const distFromCenter = Math.abs(positionRef.current - 0.5) * 2;
    let tier: "perfect" | "good" | "miss" = "miss";
    let bonus = 0;
    if (distFromCenter < PERFECT_ZONE) {
      tier = "perfect";
      bonus = PERFECT_BONUS;
    } else if (distFromCenter < GOOD_ZONE) {
      tier = "good";
      bonus = GOOD_BONUS;
    }
    setResult({ tier, bonus });
  };

  const markerLeft = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BAR_WIDTH - MARKER_SIZE],
  });

  const resultText =
    result?.tier === "perfect"
      ? t("bargain.resultPerfect", { pct: Math.round(result.bonus * 100) })
      : result?.tier === "good"
        ? t("bargain.resultGood", { pct: Math.round(result.bonus * 100) })
        : result
          ? t("bargain.resultMiss")
          : "";

  return (
    <Modal visible transparent animationType="fade">
      <ModalBackdrop>
        <View style={styles.card}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          <Text style={styles.title}>{t("bargain.title")}</Text>
          <Text style={styles.subtitle}>{t("bargain.subtitle")}</Text>

          <View style={styles.barTrack}>
            <View style={styles.goodZone} />
            <View style={styles.perfectZoneHalo} />
            <View style={styles.perfectZone} />
            <Animated.View style={[styles.marker, { left: markerLeft }]} />
          </View>

          {result ? (
            <>
              <Text
                style={[
                  styles.resultText,
                  {
                    color:
                      result.tier === "perfect"
                        ? COLORS.positive
                        : result.tier === "good"
                          ? "#e0a13f"
                          : COLORS.textMuted,
                  },
                ]}
              >
                {resultText}
              </Text>
              <ScalePressable onPress={() => onResolve(result.bonus)} style={styles.continueBtn} scaleTo={0.96}>
                <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
                <Text style={styles.continueBtnText}>{t("bargain.continueBtn")}</Text>
              </ScalePressable>
            </>
          ) : (
            <>
              <ScalePressable onPress={stop} style={styles.stopBtn} scaleTo={0.94}>
                <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
                <Text style={styles.stopBtnText}>{t("bargain.stopBtn")}</Text>
              </ScalePressable>
              <ScalePressable onPress={() => onResolve(0)} style={styles.skipBtn} scaleTo={0.97}>
                <Text style={styles.skipBtnText}>{t("bargain.skipBtn")}</Text>
              </ScalePressable>
            </>
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
  title: { color: "#f0e3c8", fontSize: 16, fontFamily: FONT.display, marginBottom: 4, textAlign: "center" },
  subtitle: { color: "#a0917a", fontSize: 12, marginBottom: SPACING.lg, textAlign: "center" },
  barTrack: {
    width: BAR_WIDTH,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1a1410",
    borderWidth: 2,
    borderColor: "#3a2d1e",
    justifyContent: "center",
    marginBottom: SPACING.lg,
    overflow: "hidden",
  },
  goodZone: {
    position: "absolute",
    left: BAR_WIDTH * 0.3,
    width: BAR_WIDTH * 0.4,
    height: "70%",
    top: "15%",
    borderRadius: 999,
    backgroundColor: "rgba(224, 161, 63, 0.14)",
  },
  perfectZoneHalo: {
    position: "absolute",
    left: BAR_WIDTH * 0.4,
    width: BAR_WIDTH * 0.2,
    height: "88%",
    top: "6%",
    borderRadius: 999,
    backgroundColor: "rgba(95, 216, 132, 0.14)",
  },
  perfectZone: {
    position: "absolute",
    left: BAR_WIDTH * 0.44,
    width: BAR_WIDTH * 0.12,
    height: "70%",
    top: "15%",
    borderRadius: 999,
    backgroundColor: "rgba(95, 216, 132, 0.24)",
  },
  marker: {
    position: "absolute",
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    backgroundColor: COLORS.accent,
    top: 7,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  resultText: {
    fontSize: TYPE.label,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    marginBottom: SPACING.md,
    textAlign: "center",
  },
  stopBtn: {
    width: "100%",
    borderRadius: RADIUS.card,
    paddingVertical: 14,
    alignItems: "center",
    overflow: "hidden",
    marginBottom: SPACING.sm,
  },
  stopBtnText: { color: "#1a1410", fontWeight: "800", fontFamily: FONT.black, fontSize: 16 },
  skipBtn: { alignItems: "center", paddingVertical: 8 },
  skipBtnText: { color: "#a0917a", fontSize: 12, fontWeight: "600", fontFamily: FONT.medium },
  continueBtn: {
    width: "100%",
    borderRadius: RADIUS.card,
    paddingVertical: 12,
    alignItems: "center",
    overflow: "hidden",
  },
  continueBtnText: { color: "#1a1410", fontWeight: "800", fontFamily: FONT.black, fontSize: 14 },
});
