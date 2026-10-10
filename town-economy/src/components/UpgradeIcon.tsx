import React from "react";
import { Image, Text } from "react-native";
import { upgradeTierForLevel, UPGRADE_IMAGES } from "../economy/upgradeImages";
import { UpgradeId } from "../economy/types";

interface Props {
  id: UpgradeId;
  /** current level — 0 shows the plain emoji (nothing built yet); each
   * tier of commissioned art kicks in as the upgrade is bought further,
   * see upgradeTierForLevel. */
  level: number;
  /** The emoji every non-visual context already uses; shown as-is when no
   * commissioned art exists yet for this upgrade/tier. */
  fallback: string;
  /** Controls both the image's box and the fallback text's font size, so a
   * missing image doesn't shift layout against a present one. */
  size: number;
  style?: { marginRight?: number; marginBottom?: number };
}

export function UpgradeIcon({ id, level, fallback, size, style }: Props) {
  const source = level > 0 ? UPGRADE_IMAGES[id]?.[upgradeTierForLevel(level)] : undefined;
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
