import React from "react";
import { Image, Text } from "react-native";
import { AchievementId } from "../economy/achievements";
import { ACHIEVEMENT_IMAGES } from "../economy/achievementImages";

interface Props {
  id: AchievementId;
  /** The emoji every non-visual context already uses; shown as-is when no
   * commissioned art exists for this id, or when locked. */
  fallback: string;
  /** Controls both the image's box and the fallback text's font size, so a
   * missing image doesn't shift layout against a present one. */
  size: number;
  style?: { marginRight?: number; marginBottom?: number; opacity?: number };
  /** A locked achievement always shows "🔒", never its real art — the badge
   * is part of what's still hidden. */
  locked?: boolean;
}

export function AchievementIcon({ id, fallback, size, style, locked }: Props) {
  const source = locked ? undefined : ACHIEVEMENT_IMAGES[id];
  if (source) {
    return (
      <Image
        source={source}
        style={[{ width: size, height: size }, style]}
        resizeMode="contain"
        accessibilityElementsHidden
      />
    );
  }
  return (
    <Text aria-hidden style={[{ fontSize: size }, style]}>
      {fallback}
    </Text>
  );
}
