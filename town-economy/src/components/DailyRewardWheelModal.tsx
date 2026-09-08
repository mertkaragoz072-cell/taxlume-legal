import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from "react-native-svg";
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
const SEGMENT_COUNT = WHEEL_ICONS.length;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;
const WHEEL_RADIUS = 78;
const ICON_SIZE = 22;
// Two alternating warm wood tones (rather than a bright/casino palette) so
// the wheel reads as a real carved object that belongs in this game's
// world, not a neon slot machine.
const SEGMENT_COLORS = ["#3a2a1c", "#4a3520"];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function wedgePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
}

function iconPosition(index: number) {
  const midAngle = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
  const pos = polarToCartesian(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_RADIUS * 0.62, midAngle);
  return { left: pos.x - ICON_SIZE / 2, top: pos.y - ICON_SIZE / 2 };
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
              <Svg width={WHEEL_RADIUS * 2} height={WHEEL_RADIUS * 2} style={StyleSheet.absoluteFill}>
                <Defs>
                  <RadialGradient id="dailyWheelGloss" cx="35%" cy="28%" r="75%">
                    <Stop offset="0" stopColor="#ffffff" stopOpacity={0.12} />
                    <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                {WHEEL_ICONS.map((_, i) => (
                  <Path
                    key={i}
                    d={wedgePath(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_RADIUS - 2, i * SEGMENT_ANGLE, (i + 1) * SEGMENT_ANGLE)}
                    fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                  />
                ))}
                {WHEEL_ICONS.map((_, i) => {
                  const angle = i * SEGMENT_ANGLE;
                  const inner = polarToCartesian(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_RADIUS * 0.2, angle);
                  const outer = polarToCartesian(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_RADIUS - 2, angle);
                  return (
                    <Line
                      key={i}
                      x1={inner.x}
                      y1={inner.y}
                      x2={outer.x}
                      y2={outer.y}
                      stroke={withAlpha(COLORS.accent, 0.3)}
                      strokeWidth={1}
                    />
                  );
                })}
                <Circle
                  cx={WHEEL_RADIUS}
                  cy={WHEEL_RADIUS}
                  r={WHEEL_RADIUS - 2}
                  fill="url(#dailyWheelGloss)"
                />
                <Circle
                  cx={WHEEL_RADIUS}
                  cy={WHEEL_RADIUS}
                  r={WHEEL_RADIUS - 1.5}
                  fill="none"
                  stroke={withAlpha(COLORS.accent, 0.55)}
                  strokeWidth={2.5}
                />
              </Svg>
              {WHEEL_ICONS.map((icon, i) => (
                <Text key={i} style={[styles.wedgeIcon, iconPosition(i)]}>
                  {icon}
                </Text>
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
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pointer: {
    position: "absolute",
    top: -4,
    zIndex: 2,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: COLORS.accent,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  wheel: {
    width: WHEEL_RADIUS * 2,
    height: WHEEL_RADIUS * 2,
    borderRadius: WHEEL_RADIUS,
    overflow: "hidden",
  },
  wedgeIcon: {
    position: "absolute",
    fontSize: 16,
    width: ICON_SIZE,
    height: ICON_SIZE,
    textAlign: "center",
    lineHeight: ICON_SIZE,
  },
  hubHalo: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: withAlpha(COLORS.accent, 0.18),
  },
  hub: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: "#2a2016",
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
