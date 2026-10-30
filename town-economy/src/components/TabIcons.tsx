import React from "react";
import { Image } from "react-native";
import type { ScreenId } from "./TabBar";

import achievementsBadge from "../../assets/ui/tabbadges/achievements.png";
import inventoryBadge from "../../assets/ui/tabbadges/inventory.png";
import investBadge from "../../assets/ui/tabbadges/invest.png";
import marketBadge from "../../assets/ui/tabbadges/market.png";
import researchBadge from "../../assets/ui/tabbadges/research.png";
import townBadge from "../../assets/ui/tabbadges/town.png";
import tradeBadge from "../../assets/ui/tabbadges/trade.png";

interface Props {
  id: ScreenId;
  size: number;
  /** Full opacity on the active tab, dimmed at rest. These are complete
   * painted badges — carved-corner panel and icon baked into one image,
   * each already in its own tab's color — not a flat glyph TabBar can
   * recolor or gradient-fill itself, so TabBar no longer draws any panel
   * of its own behind this; opacity is the one state change left for it
   * to apply. */
  active: boolean;
}

const BADGES: Record<ScreenId, number> = {
  market: marketBadge,
  inventory: inventoryBadge,
  trade: tradeBadge,
  town: townBadge,
  research: researchBadge,
  invest: investBadge,
  achievements: achievementsBadge,
};

/** One complete painted badge per tab (panel + icon baked together),
 * cropped from a reference sheet sent for this exact purpose. Replaces the
 * earlier two-piece version of this file — a flat SVG glyph laid over a
 * separately-drawn CSS badge in TabBar — now that the badge art itself
 * carries the per-tab color and the carved-panel look that CSS was
 * standing in for. */
export function TabIcon({ id, size, active }: Props) {
  return (
    <Image
      source={BADGES[id]}
      style={{ width: size, height: size, opacity: active ? 1 : 0.68 }}
      resizeMode="contain"
    />
  );
}
