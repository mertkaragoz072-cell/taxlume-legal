import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { withAlpha } from "../theme";

interface Props {
  icon: string;
  color: string;
  /** "md" (decision-style popups) or "lg" (full-screen onboarding) — the
   * two sizes this pattern has actually needed so far. */
  size?: "md" | "lg";
}

const SIZES = {
  md: { badge: 72, icon: 36 },
  lg: { badge: 84, icon: 44 },
};

/** A circular, softly-tinted medallion for a single emoji icon — the shared
 * "this moment matters" badge used at the top of decision/onboarding-style
 * modals, so every one of them reads as the same visual language instead of
 * each screen hand-rolling its own circle. */
export function IconBadge({ icon, color, size = "md" }: Props) {
  const dims = SIZES[size];
  return (
    <View
      style={[
        styles.badge,
        {
          width: dims.badge,
          height: dims.badge,
          borderRadius: dims.badge / 2,
          backgroundColor: withAlpha(color, 0.16),
        },
      ]}
    >
      <Text style={{ fontSize: dims.icon }}>{icon}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: "center", justifyContent: "center", marginBottom: 10 },
});
