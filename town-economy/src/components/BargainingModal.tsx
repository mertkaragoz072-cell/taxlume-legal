import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Modal, StyleSheet, View } from "react-native";
import { Text } from "./AppText";
import { useEconomyContext } from "../economy/EconomyContext";
import { COLORS, FONT } from "../theme";
import { upperForUi } from "../utils/uiLanguage";
import frameArt from "../../assets/ui/modal/barg_frame.webp";
import { ModalBackdrop } from "./ModalBackdrop";
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
  const [frameW, setFrameW] = useState(340);

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

  const k = frameW / ART_W;
  const box = (x: number, y: number, bw: number, bh: number) => ({
    position: "absolute" as const,
    left: x * k,
    top: y * k,
    width: bw * k,
    height: bh * k,
  });
  const title = upperForUi(t("bargain.title").replace(/^[^\p{L}\p{N}]+/u, ""));
  const titleSize = Math.min(40 * k, (430 * k * 0.95) / (title.length * 0.7));
  const btnLabel = (result ? t("bargain.continueBtn") : t("bargain.stopBtn")).replace(/^[^\p{L}\p{N}]+/u, "");
  const btnSize = Math.min(56 * k, (250 * k * 0.95) / (btnLabel.length * 0.52));
  const subtitleText = result ? resultText : t("bargain.subtitle");
  const subColor = !result
    ? "#f6e8c8"
    : result.tier === "perfect"
      ? "#9cf0b0"
      : result.tier === "good"
        ? "#f4c43c"
        : "#e8dcc0";
  const subSize = Math.min(
    16 * Math.max(0.85, Math.min(1.1, frameW / 360)),
    (620 * k * 0.97) / (subtitleText.length * 0.52)
  );

  return (
    <Modal visible transparent animationType="fade">
      <ModalBackdrop>
        <View
          style={[styles.frame, { width: frameW }]}
          onLayout={(e) => setFrameW(e.nativeEvent.layout.width)}
        >
          <View style={{ width: "100%", aspectRatio: ART_W / ART_H }}>
            <Image source={frameArt} style={styles.fill} resizeMode="stretch" />

            <View style={[box(150, 160, 450, 64), styles.center]} pointerEvents="none">
              <Text
                style={[styles.title, { fontSize: titleSize }]}
                numberOfLines={1}
                accessibilityRole="header"
              >
                {title}
              </Text>
            </View>
            <View style={[box(50, 240, 645, 44), styles.center]} pointerEvents="none">
              <Text style={[styles.sub, { fontSize: subSize, color: subColor }]} numberOfLines={1}>
                {subtitleText}
              </Text>
            </View>

            <View style={box(60, 326, 625, 66)} onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
              <View style={[styles.goodZone, { left: barW * 0.3, width: barW * 0.4 }]} />
              <View style={[styles.perfectZoneHalo, { left: barW * 0.4, width: barW * 0.2 }]} />
              <View style={[styles.perfectZone, { left: barW * 0.44, width: barW * 0.12 }]} />
              <Animated.View style={[styles.marker, { left: markerLeft, top: (66 * k - MARKER_SIZE) / 2 }]} />
            </View>

            <ScalePressable
              onPress={result ? () => onResolve(result.bonus) : stop}
              scaleTo={0.97}
              accessibilityLabel={result ? t("bargain.continueBtn") : t("bargain.stopBtn")}
              style={box(105, 423, 525, 108)}
            >
              <View style={[styles.btnTextBox, { left: 245 * k, right: 28 * k }]}>
                <Text style={[styles.btnText, { fontSize: btnSize }]} numberOfLines={1}>
                  {(result ? t("bargain.continueBtn") : t("bargain.stopBtn")).replace(/^[^\p{L}\p{N}]+/u, "")}
                </Text>
              </View>
            </ScalePressable>

            {!result && (
              <ScalePressable
                onPress={() => onResolve(0)}
                scaleTo={0.97}
                style={[box(150, 538, 450, 44), styles.center]}
              >
                <Text style={styles.skipText} numberOfLines={1}>
                  {t("bargain.skipBtn")}
                </Text>
              </ScalePressable>
            )}
          </View>
        </View>
      </ModalBackdrop>
    </Modal>
  );
}

const ART_W = 745;
const ART_H = 655;

const styles = StyleSheet.create({
  frame: { maxWidth: 400, alignSelf: "center" },
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  center: { alignItems: "center", justifyContent: "center" },
  title: { color: "#4a2a12", fontFamily: FONT.serif, textAlign: "center" },
  sub: { fontFamily: FONT.medium, textAlign: "center" },
  btnTextBox: { position: "absolute", top: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  btnText: {
    color: "#fbeccb",
    fontFamily: FONT.serif,
    textShadowColor: "rgba(40,20,0,0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  skipText: { color: "#f6e8c8", fontFamily: FONT.medium, fontSize: 14, lineHeight: 20 },
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
});
