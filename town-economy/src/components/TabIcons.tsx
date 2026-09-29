import React from "react";
import { View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { ScreenId } from "./TabBar";

interface Props {
  id: ScreenId;
  color: string;
  size: number;
  /** The exact badge colour sitting behind this icon (its solid fill when
   * active, its faint tint when not) — passed through so a shape can be
   * drawn in `bg` instead of `color` and read as a genuine cutout in the
   * glyph rather than a same-colour stroke. A same-hue detail drawn at
   * reduced opacity over a same-hue fill was tried twice earlier this pass
   * (a coin's rim, a medal's disc) and was invisible both times — there is
   * no substitute for the real contrasting colour underneath. */
  bg: string;
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
 * than a designed icon set. A second pass added proper curves where a curve
 * is what the object actually looks like (a coin's roundness, a sack's
 * belly, a flask's shoulder, a ribbon's taper). This pass adds "punched"
 * detail — a coin's rim, a wagon's wheel hubs, a window, a bubble, a medal's
 * star — filled in the exact badge colour behind the icon (see the `bg`
 * prop) rather than a same-colour stroke, since a same-hue detail at
 * reduced opacity over a same-hue fill proved invisible when tried. All of
 * it verified against real rendered screenshots at actual badge size rather
 * than trusted blind.
 *
 * Town's icon deliberately echoes the brand mark's own language (see
 * assets/logo/README.md: "three buildings of rising height... pitched
 * roofs carry the town") rather than inventing an unrelated house glyph —
 * one more place the tab bar can agree with the rest of the app's identity
 * instead of just filling the slot. */
export function TabIcon({ id, color, size, bg }: Props) {
  return (
    <View aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {ICONS[id](color, bg)}
      </Svg>
    </View>
  );
}

const ICONS: Record<ScreenId, (color: string, bg: string) => React.ReactNode> = {
  // Two round coins, offset enough to read as two overlapping discs rather
  // than a fused blob — the back coin at reduced opacity is what sells
  // "two coins" instead of one lopsided one. Both a full punched ring and a
  // single punched dot were tried on the front coin first — at the dark,
  // near-black fill the active state uses, a ring read as a target and a
  // dot read as a pupil (an isolated dot inside a dark disc is an extremely
  // strong "eye" cue, worse than either invisible-detail failure this pass
  // is meant to fix). A short punched dash reads as a coin's slot instead,
  // the same convention piggy-bank icons use, without the eye problem.
  market: (color, bg) => (
    <>
      <Circle cx={8.2} cy={15.5} r={6.1} fill={color} opacity={0.55} />
      <Circle cx={15.5} cy={8.2} r={6.1} fill={color} />
      <Rect x={13.5} y={7.55} width={4} height={1.3} rx={0.65} fill={bg} />
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
  // A covered wagon: an arched canopy over a bed on two wheels, each wheel
  // given a punched hub — the canopy (a real curve, not a flat rectangle
  // roof) and the hubs are what separate this from a generic delivery
  // truck and tie it to the caravans this screen actually sends between
  // towns.
  trade: (color, bg) => (
    <>
      <Path d="M0.5 12.5 L3 12.5 L3 15 L0.5 15 Z" fill={color} />
      <Rect x={3} y={11} width={16} height={6} rx={1.2} fill={color} />
      <Path d="M3 11 Q11 2.5 19 11 Z" fill={color} />
      <Circle cx={7.5} cy={19} r={3.3} fill={color} />
      <Circle cx={7.5} cy={19} r={1.3} fill={bg} />
      <Circle cx={16.5} cy={19} r={3.3} fill={color} />
      <Circle cx={16.5} cy={19} r={1.3} fill={bg} />
    </>
  ),
  // Three buildings of rising height with pitched roofs — the brand mark's
  // own silhouette (see assets/logo/README.md), simplified to flat shapes.
  // A roof taller than its own wall (an earlier pass here had roofs 140% of
  // body height) reads as an arrowhead on a stick, not a house — real roof
  // pitches are shallow. These keep the eave overhang that says "roof"
  // rather than "pointed bar," but at well under half the body's height.
  // One punched window per building — deliberately just one each, not a
  // grid of them, since a full window grid collapsed into noise at this
  // size when tried.
  town: (color, bg) => (
    <>
      <Rect x={3} y={16} width={6} height={6} fill={color} />
      <Path d="M1.5 16 L6 12 L10.5 16 Z" fill={color} />
      <Rect x={5.1} y={18} width={1.8} height={1.8} fill={bg} />
      <Rect x={9.5} y={12} width={6} height={10} fill={color} />
      <Path d="M8 12 L12.5 7.5 L17 12 Z" fill={color} />
      <Rect x={11.6} y={15} width={1.8} height={1.8} fill={bg} />
      <Rect x={16} y={8} width={6} height={14} fill={color} />
      <Path d="M14.5 8 L19 3 L23.5 8 Z" fill={color} />
      <Rect x={18.1} y={11} width={1.8} height={1.8} fill={bg} />
    </>
  ),
  // A flask: a straight neck opening into a smoothly rounded, bottom-heavy
  // body — the curved shoulder is what actually reads as glassware instead
  // of a shield or gem. Two punched bubbles well inside the lower body read
  // as liquid catching air, not a second unrelated shape.
  research: (color, bg) => (
    <>
      <Path
        d="M9.5 3 H14.5 V8.3 L19 17.5 C20 19.6 18.5 22 16.2 22 H7.8 C5.5 22 4 19.6 5 17.5 L9.5 8.3 Z"
        fill={color}
      />
      <Circle cx={12.3} cy={17.2} r={1.6} fill={bg} />
      <Circle cx={9.6} cy={14.3} r={1} fill={bg} />
    </>
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
  // A punched 5-point star on the disc's face is the actual "medal" detail
  // — a plain circle reads as any round badge, a star reads as an award.
  achievements: (color, bg) => (
    <>
      <Path d="M8.8 12.5 L11 12.5 L9.3 22 L7.8 18.7 L5.8 22 Z" fill={color} />
      <Path d="M15.2 12.5 L13 12.5 L14.7 22 L16.2 18.7 L18.2 22 Z" fill={color} />
      <Circle cx={12} cy={9} r={6.6} fill={color} />
      <Path
        d="M12 6.4 L12.62 8.15 L14.47 8.2 L13 9.32 L13.53 11.1 L12 10.05 L10.47 11.1 L11 9.32 L9.53 8.2 L11.38 8.15 Z"
        fill={bg}
      />
    </>
  ),
};
