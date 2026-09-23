import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { TICK_MS } from "../economy/useEconomy";
import { COLORS, FONT, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";

interface Props {
  /** 0 (just departed) to 1 (arriving) */
  progress: number;
  destinationIcon: string;
  accentColor: string;
  label: string;
  etaLabel: string;
}

// A caravan icon crawls along a thin road from home to the destination town,
// re-animating toward the new progress value every tick so the motion reads
// as continuous rather than a series of jumps.
export function CaravanRoad({ progress, destinationIcon, accentColor, label, etaLabel }: Props) {
  const anim = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: TICK_MS,
      useNativeDriver: false,
    }).start();
  }, [progress, anim]);

  const left = anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={styles.wrap}>
      <View style={styles.roadRow}>
        <Text style={styles.endIcon}>🏠</Text>
        <View style={styles.track}>
          <View style={[styles.trackLine, { backgroundColor: withAlpha(accentColor, 0.35) }]} />
          <Animated.Text style={[styles.caravanIcon, { left }]}>🐫</Animated.Text>
        </View>
        <Text style={styles.endIcon}>{destinationIcon}</Text>
      </View>
      <View style={styles.footerRow}>
        <Text style={[styles.label, { color: accentColor }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.eta}>{etaLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING.sm + 2 },
  roadRow: { flexDirection: "row", alignItems: "center" },
  endIcon: { fontSize: 16, width: 22, textAlign: "center" },
  track: { flex: 1, height: 20, justifyContent: "center", marginHorizontal: SPACING.xs },
  trackLine: { height: 2, borderRadius: 1 },
  caravanIcon: {
    position: "absolute",
    top: -7,
    fontSize: 18,
    marginLeft: -9,
    transform: [{ scaleX: -1 }],
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
    paddingLeft: 22,
    paddingRight: 22,
  },
  label: {
    fontSize: TYPE.micro,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    flex: 1,
    marginRight: SPACING.sm,
  },
  eta: { color: COLORS.textMuted, fontSize: TYPE.micro },
});
