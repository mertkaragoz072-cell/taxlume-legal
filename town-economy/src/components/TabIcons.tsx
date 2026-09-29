import React from "react";
import { View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { ScreenId } from "./TabBar";

interface Props {
  id: ScreenId;
  color: string;
  size: number;
}

/** One flat-filled glyph per tab, drawn from rects/circles/straight-line
 * paths only — no bezier curves — so nothing here can render as a broken or
 * self-intersecting shape sight unseen. Replaces the raw emoji the tab bar
 * used to show: a platform's own emoji font draws differently everywhere
 * (flatter on Android, a different style on iOS, blurrier at this badge's
 * ~20px size than the rest of this screen's deliberately drawn art), where
 * these read identically everywhere and sit on the badge's own colour
 * instead of carrying their own unrelated palette.
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
  // Two overlapping coins — the market is where goods change hands for cash.
  market: (color) => (
    <>
      <Circle cx={9} cy={15} r={6} fill={color} opacity={0.85} />
      <Circle cx={15} cy={9} r={6} fill={color} />
    </>
  ),
  // A drawstring sack: a trapezoid body plus an unfilled loop for the tied
  // top — the loop is a stroke, not a fill, so the badge's own colour shows
  // straight through the middle of it without this needing to know what
  // that colour is.
  inventory: (color) => (
    <>
      <Path d="M6 9 H18 L20 21 H4 Z" fill={color} />
      <Rect x={9} y={3} width={6} height={5} rx={3} fill="none" stroke={color} strokeWidth={2} />
    </>
  ),
  // A loaded wagon: a bed on two wheels, echoing the caravans this screen
  // actually sends between towns rather than a generic delivery truck.
  trade: (color) => (
    <>
      <Rect x={2} y={6} width={16} height={9} rx={1.5} fill={color} />
      <Circle cx={7} cy={19} r={3.4} fill={color} />
      <Circle cx={16} cy={19} r={3.4} fill={color} />
    </>
  ),
  // Three buildings of rising height with pitched roofs — the brand mark's
  // own silhouette (see assets/logo/README.md), simplified to flat shapes.
  // The roofs oversail their own bodies and stand nearly as tall as them,
  // on purpose: a roof only as wide as its wall reads, at this size, as
  // just a pointed-top bar — indistinguishable from invest's flat-top
  // ones. An eave that visibly overhangs is what actually says "house"
  // rather than "chart" in a 19px glyph.
  town: (color) => (
    <>
      <Rect x={4} y={17} width={5} height={5} fill={color} />
      <Path d="M2.5 17 L6.5 10 L10.5 17 Z" fill={color} />
      <Rect x={10.5} y={13} width={5} height={9} fill={color} />
      <Path d="M9 13 L13 5 L17 13 Z" fill={color} />
      <Rect x={17} y={10} width={5} height={12} fill={color} />
      <Path d="M15.5 10 L19.5 2.5 L23.5 10 Z" fill={color} />
    </>
  ),
  // A flask: narrow neck, flared body — the plainest "research" silhouette
  // there is, and distinct from every other tab's icon shape.
  research: (color) => <Path d="M9 3 L15 3 L15 9 L20 19 L18 21 L6 21 L4 19 L9 9 Z" fill={color} />,
  // Three ascending flat-top bars capped with an arrowhead — growth, not
  // just a price history (market's own coins cover that ground instead).
  // Flat tops are what keep this from reading as "town" again.
  invest: (color) => (
    <>
      <Rect x={3} y={15} width={4} height={6} fill={color} />
      <Rect x={9} y={10} width={4} height={11} fill={color} />
      <Rect x={15} y={4} width={4} height={17} fill={color} />
      <Path d="M17 1 L20 5 H14 Z" fill={color} />
    </>
  ),
  // A medal: a disc over two ribbon tails. Each tail is its own plain
  // triangle rather than one zigzag path shared between both — a single
  // multi-point outline collapsed into a smudge at this size; two simple
  // shapes with a gap between them keep reading as "ribbon" small.
  achievements: (color) => (
    <>
      <Path d="M7 13 L4 22 L9.5 18 Z" fill={color} />
      <Path d="M17 13 L20 22 L14.5 18 Z" fill={color} />
      <Circle cx={12} cy={9} r={6.5} fill={color} />
    </>
  ),
};
