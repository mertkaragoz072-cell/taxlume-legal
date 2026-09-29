import React from "react";
import { View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { ScreenId } from "./TabBar";

interface Props {
  id: ScreenId;
  color: string;
  size: number;
}

/** One flat-filled glyph per tab. Replaces the raw emoji the tab bar used to
 * show: a platform's own emoji font draws differently everywhere (flatter
 * on Android, a different style on iOS, blurrier at this badge's ~20px size
 * than the rest of this screen's deliberately drawn art), where these read
 * identically everywhere and sit on the badge's own colour instead of
 * carrying their own unrelated palette.
 *
 * A first pass here stuck to straight-line rects/circles/paths only, to
 * guarantee nothing could render as a broken shape sight unseen — but that
 * played it too safe and the result read as crude wireframe blobs rather
 * than a designed icon set. This pass uses proper curves where a curve is
 * what the object actually looks like (a coin's roundness, a sack's belly,
 * a flask's shoulder, a ribbon's taper), verified against real rendered
 * screenshots at actual badge size rather than trusted blind.
 *
 * Town's icon deliberately echoes the brand mark's own language (see
 * assets/logo/README.md: "three buildings of rising height... pitched
 * roofs carry the town") rather than inventing an unrelated house glyph —
 * one more place the tab bar can agree with the rest of the app's identity
 * instead of just filling the slot. */
export function TabIcon({ id, color, size }: Props) {
  return (
    <View aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {ICONS[id](color)}
      </Svg>
    </View>
  );
}

const ICONS: Record<ScreenId, (color: string) => React.ReactNode> = {
  // Two round coins, offset enough to read as two overlapping discs rather
  // than a fused blob — the back coin at reduced opacity is what sells
  // "two coins" instead of one lopsided one.
  market: (color) => (
    <>
      <Circle cx={8.2} cy={15.5} r={6.1} fill={color} opacity={0.55} />
      <Circle cx={15.5} cy={8.2} r={6.1} fill={color} />
    </>
  ),
  // A drawstring sack: a rounded, belly-out body (a real curve, not a
  // trapezoid) cinched by a tied loop at the neck. The loop is a stroke,
  // not a fill, so the badge's own colour shows straight through the
  // middle of it without this needing to know what that colour is.
  inventory: (color) => (
    <>
      <Path
        d="M8.5 9 C5.8 9 4.3 11.3 4.8 14.2 L6 19.5 C6.4 21.2 7.8 22 9.5 22 H14.5 C16.2 22 17.6 21.2 18 19.5 L19.2 14.2 C19.7 11.3 18.2 9 15.5 9 Z"
        fill={color}
      />
      <Path d="M9 9 C9 6.5 10.3 5 12 5 C13.7 5 15 6.5 15 9" fill="none" stroke={color} strokeWidth={2} />
    </>
  ),
  // A loaded wagon: a bed on two wheels with a hitch tongue at the front —
  // echoes the caravans this screen actually sends between towns rather
  // than a generic delivery truck.
  trade: (color) => (
    <>
      <Path d="M1 12 L4.5 12 L4.5 9.5 L1 9.5 Z" fill={color} />
      <Rect x={4} y={6} width={16} height={9} rx={2} fill={color} />
      <Circle cx={8} cy={19} r={3.6} fill={color} />
      <Circle cx={17} cy={19} r={3.6} fill={color} />
    </>
  ),
  // Three buildings of rising height with pitched roofs — the brand mark's
  // own silhouette (see assets/logo/README.md), simplified to flat shapes.
  // A roof taller than its own wall (an earlier pass here had roofs 140% of
  // body height) reads as an arrowhead on a stick, not a house — real roof
  // pitches are shallow. These keep the eave overhang that says "roof"
  // rather than "pointed bar," but at well under half the body's height.
  town: (color) => (
    <>
      <Rect x={3} y={16} width={6} height={6} fill={color} />
      <Path d="M1.5 16 L6 12 L10.5 16 Z" fill={color} />
      <Rect x={9.5} y={12} width={6} height={10} fill={color} />
      <Path d="M8 12 L12.5 7.5 L17 12 Z" fill={color} />
      <Rect x={16} y={8} width={6} height={14} fill={color} />
      <Path d="M14.5 8 L19 3 L23.5 8 Z" fill={color} />
    </>
  ),
  // A flask: a straight neck opening into a smoothly rounded, bottom-heavy
  // body — the curved shoulder is what actually reads as glassware instead
  // of a shield or gem.
  research: (color) => (
    <Path
      d="M9.5 3 H14.5 V8.3 L19 17.5 C20 19.6 18.5 22 16.2 22 H7.8 C5.5 22 4 19.6 5 17.5 L9.5 8.3 Z"
      fill={color}
    />
  ),
  // Three ascending flat-top bars capped with an arrowhead — growth, not
  // just a price history (market's own coins cover that ground instead).
  // Flat tops are what keep this from reading as "town" again.
  invest: (color) => (
    <>
      <Rect x={3} y={15} width={4} height={6} rx={0.6} fill={color} />
      <Rect x={9} y={10} width={4} height={11} rx={0.6} fill={color} />
      <Rect x={15} y={4} width={4} height={17} rx={0.6} fill={color} />
      <Path d="M17 1 L20 5 H14 Z" fill={color} />
    </>
  ),
  // A medal: a disc over two tapered ribbon tails, each notched at the tip
  // — the notch (a small triangular bite out of the bottom edge) is what
  // makes a plain triangle read as "ribbon" instead of "flag" or "wing".
  achievements: (color) => (
    <>
      <Path d="M8.8 12.5 L11 12.5 L9.3 22 L7.8 18.7 L5.8 22 Z" fill={color} />
      <Path d="M15.2 12.5 L13 12.5 L14.7 22 L16.2 18.7 L18.2 22 Z" fill={color} />
      <Circle cx={12} cy={9} r={6.6} fill={color} />
    </>
  ),
};
