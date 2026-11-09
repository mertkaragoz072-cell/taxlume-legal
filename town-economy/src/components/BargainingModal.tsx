import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, StyleSheet, View } from "react-native";
import { Text } from "./AppText";
import { useEconomyContext } from "../economy/EconomyContext";
import { COLORS, FONT, SPACING, TYPE, WEIGHT } from "../theme";
import medStall from "../../assets/ui/modal/med_stall.webp";
import { ModalBackdrop } from "./ModalBackdrop";
import { BigButton, ModalShell } from "./ModalKit";
import { ScalePressable } from "./ScalePressable";

interface Props {
  visible: boolean;
  onResolve: (tariffDiscountBonus: number) => void;
}

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
  const [barW, setBarW] = useState(250);

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
    outputRange: [0, barW - MARKER_SIZE],
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
        <ModalShell title={t("bargain.title")} medallion={medStall}>
          <Text style={styles.subtitle}>{t("bargain.subtitle")}</Text>
          <View style={styles.divider}>
            <View style={styles.divLine} />
            <View style={styles.divGem} />
            <View style={styles.divLine} />
          </View>

          <View style={styles.barTrack} onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
            <View style={[styles.goodZone, { left: barW * 0.3, width: barW * 0.4 }]} />
            <View style={[styles.perfectZoneHalo, { left: barW * 0.4, width: barW * 0.2 }]} />
            <View style={[styles.perfectZone, { left: barW * 0.44, width: barW * 0.12 }]} />
            <Animated.View style={[styles.marker, { left: markerLeft }]} />
          </View>

          {result ? (
            <>
              <Text
                style={[
                  styles.resultText,
                  {
                    color:
                      result.tier === "perfect" ? "#7fe39a" : result.tier === "good" ? "#f4c43c" : "#d8c8a8",
                  },
                ]}
              >
                {resultText}
              </Text>
              <BigButton label={t("bargain.continueBtn")} onPress={() => onResolve(result.bonus)} />
            </>
          ) : (
            <>
              <BigButton label={t("bargain.stopBtn")} onPress={stop} />
              <ScalePressable onPress={() => onResolve(0)} style={styles.skipBtn} scaleTo={0.97}>
                <Text style={styles.skipBtnText}>{t("bargain.skipBtn")}</Text>
              </ScalePressable>
            </>
          )}
        </ModalShell>
      </ModalBackdrop>
    </Modal>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: "#f4e8d0", fontSize: TYPE.label, marginBottom: SPACING.lg, textAlign: "center" },
  divider: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  divLine: { flex: 1, height: 1, backgroundColor: "rgba(232,170,70,0.6)" },
  divGem: {
    width: 8,
    height: 8,
    marginHorizontal: 8,
    backgroundColor: "#f0b84a",
    transform: [{ rotate: "45deg" }],
  },
  barTrack: {
    alignSelf: "stretch",
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(10,6,2,0.6)",
    borderWidth: 2.5,
    borderColor: "#e0a03c",
    justifyContent: "center",
    marginBottom: SPACING.lg,
    overflow: "hidden",
  },
  goodZone: {
    position: "absolute",
    height: "70%",
    top: "15%",
    borderRadius: 999,
    backgroundColor: "rgba(224, 161, 63, 0.14)",
  },
  perfectZoneHalo: {
    position: "absolute",
    height: "88%",
    top: "6%",
    borderRadius: 999,
    backgroundColor: "rgba(95, 216, 132, 0.14)",
  },
  perfectZone: {
    position: "absolute",
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
  skipBtn: { alignItems: "center", paddingVertical: 8 },
  skipBtnText: {
    color: "#e8dcc0",
    fontSize: TYPE.label,
    fontWeight: WEIGHT.medium,
    fontFamily: FONT.medium,
  },
});
