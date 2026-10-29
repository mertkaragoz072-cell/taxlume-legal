import React from "react";
import { Image } from "react-native";
import type { ScreenId } from "./TabBar";

import achievementsIcon from "../../assets/ui/tabicons/achievements.png";
import inventoryIcon from "../../assets/ui/tabicons/inventory.png";
import investIcon from "../../assets/ui/tabicons/invest.png";
import marketIcon from "../../assets/ui/tabicons/market.png";
import researchIcon from "../../assets/ui/tabicons/research.png";
import townIcon from "../../assets/ui/tabicons/town.png";
import tradeIcon from "../../assets/ui/tabicons/trade.png";

interface Props {
  id: ScreenId;
  size: number;
  /** Full opacity on the active tab, dimmed at rest — these are painted
   * illustrations with their own fixed palette (gold scales, a blue swap
   * arrow...), not a flat glyph that could be recoloured to contrast with
   * the badge behind it the way the single-colour SVG set this replaced
   * did. Opacity is the one state change that still applies to a raster
   * icon without fighting its own art. */
  active: boolean;
}

const ICONS: Record<ScreenId, number> = {
  market: marketIcon,
  inventory: inventoryIcon,
  trade: tradeIcon,
  town: townIcon,
  research: researchIcon,
  invest: investIcon,
  achievements: achievementsIcon,
};

/** One painted illustration per tab, cropped from a reference sheet sent
 * for this exact purpose — replaces the flat-filled SVG glyph set this
 * file used to hand-draw (see git history for that approach's own notes on
 * what it tried and why). */
export function TabIcon({ id, size, active }: Props) {
  return (
    <Image
      source={ICONS[id]}
      style={{ width: size, height: size, opacity: active ? 1 : 0.6 }}
      resizeMode="contain"
    />
  );
}
