import React from "react";
import { Image, Text } from "react-native";
import { GOOD_IMAGES } from "../economy/goodImages";
import { GoodId } from "../economy/types";

interface Props {
  /** Assets (gold, oil, tech stock...) share GoodCard but aren't a GoodId —
   * pass their string id through anyway, it just won't match the lookup. */
  id: string;
  /** The emoji every non-visual context already uses; shown as-is when no
   * commissioned art exists for this id, or when locked. */
  fallback: string;
  /** Controls both the image's box and the fallback text's font size, so a
   * missing image doesn't shift layout against a present one. */
  size: number;
  style?: { marginRight?: number; marginBottom?: number; opacity?: number };
  /** The compendium shows a locked good as "🔒", never its real art — a
   * picture would spoil what's behind the lock the same way spelling out
   * its name would. */
  locked?: boolean;
}

export function GoodIcon({ id, fallback, size, style, locked }: Props) {
  const source = locked ? undefined : GOOD_IMAGES[id as GoodId];
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
