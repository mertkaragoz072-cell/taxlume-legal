import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { FONT, TYPE, WEIGHT } from "../theme";

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

interface Props {
  onPress: () => void;
}

/** Header icon for the "watch an ad to speed up" boost — a plain lightning
 * bolt when idle, or a pulsing pill with a live mm:ss countdown while a
 * boost is active. Tapping either state opens SpeedBoostModal. */
export function SpeedBoostButton({ onPress }: Props) {
  const { state, t } = useEconomyContext();
  const active = state.speedBoostExpiresAt !== null;
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [active]);

  const remainingMs = active ? Math.max(0, state.speedBoostExpiresAt! - Date.now()) : 0;

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });

  return (
    <Pressable
      onPress={onPress}
      style={[styles.iconBtn, active && styles.iconBtnActive]}
      accessibilityRole="button"
      accessibilityLabel={
        active
          ? t("a11y.speedBoostActive", { time: formatCountdown(remainingMs) })
          : t("a11y.speedBoost")
      }
    >
      <Animated.Text style={[styles.icon, active && { transform: [{ scale }] }]}>⚡</Animated.Text>
      {active && <Text style={styles.badge}>{formatCountdown(remainingMs)}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#2a2016",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 6,
  },
  iconBtnActive: { backgroundColor: "rgba(255, 215, 94, 0.28)" },
  icon: { fontSize: TYPE.body },
  badge: { color: "#ffd75e", fontSize: 10, fontWeight: WEIGHT.black, fontFamily: FONT.black, marginLeft: 3 },
});
