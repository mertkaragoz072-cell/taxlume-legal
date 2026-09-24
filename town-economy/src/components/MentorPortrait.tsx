import React from "react";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

type Mood = "warm" | "explaining";

interface Props {
  size?: number;
  mood?: Mood;
}

/* Same warm range as the townsfolk in VillagerIllustration — she has to look
 * like she came out of one of those houses, not like a UI mascot dropped on
 * top of the game. What separates her from the crowd is silhouette, not
 * palette: a headscarf and a braid instead of the townsmen's brimmed cap. */
const SKIN = "#e8b489";
const SKIN_SHADE = "#cf9468";
const SCARF = "#c05a46";
const SCARF_LIGHT = "#dd7b5f";
const SCARF_SHADE = "#8f3d2e";
const DRESS = "#4a7a70";
const DRESS_LIGHT = "#659a8d";
const DRESS_SHADE = "#335a52";
const HAIR = "#3a2418";
const HAIR_LIGHT = "#553522";
const GOLD = "#e8c777";
const GOLD_SHADE = "#c2a055";
const INK = "#2a2016";

/** Zeyno, the market woman who shows a new mayor around the town.
 *
 * A bust rather than a full figure: she appears in a coach bubble at the
 * bottom of a live screen, where a whole body would either be thumbnail-
 * sized or eat the market behind her. Cropping to head and shoulders keeps
 * the face big enough to read an expression at 96px.
 *
 * Vector for the same reasons as the rest of the town's art — crisp at any
 * size, nothing added to the bundle, and every colour comes from the palette
 * the cards are already drawn in.
 */
export function MentorPortrait({ size = 96, mood = "warm" }: Props) {
  const id = `mentor${mood}`;
  return (
    <Svg width={size} height={size * 1.12} viewBox="0 0 100 112">
      <Defs>
        <LinearGradient id={`${id}scarf`} x1="0" y1="0" x2="1" y2="0.5">
          <Stop offset="0" stopColor={SCARF_LIGHT} />
          <Stop offset="0.6" stopColor={SCARF} />
          <Stop offset="1" stopColor={SCARF_SHADE} />
        </LinearGradient>
        <LinearGradient id={`${id}skin`} x1="0" y1="0" x2="1" y2="0.6">
          <Stop offset="0" stopColor={SKIN} />
          <Stop offset="1" stopColor={SKIN_SHADE} />
        </LinearGradient>
        <LinearGradient id={`${id}dress`} x1="0" y1="0" x2="1" y2="0.4">
          <Stop offset="0" stopColor={DRESS_LIGHT} />
          <Stop offset="0.55" stopColor={DRESS} />
          <Stop offset="1" stopColor={DRESS_SHADE} />
        </LinearGradient>
      </Defs>

      {/* shoulders */}
      <Path d="M50 62 Q72 63 81 78 L90 112 H10 L19 78 Q28 63 50 62 Z" fill={`url(#${id}dress)`} />
      {/* embroidered band along the neckline, echoing the townsmen's collar */}
      <Path d="M36 66 Q50 80 64 66 L67 72 Q50 88 33 72 Z" fill={GOLD} />
      <Path d="M36 66 Q50 80 64 66 L65 69 Q50 84 35 69 Z" fill={GOLD_SHADE} opacity={0.5} />

      {/* the braid, drawn behind the head so it reads as coming over her
          shoulder rather than lying on top of her dress */}
      <Path d="M68 46 Q80 60 76 86" stroke={HAIR} strokeWidth={9} strokeLinecap="round" fill="none" />
      <Path d="M71 56 L77 60 M73 66 L79 70 M74 76 L79 79" stroke={HAIR_LIGHT} strokeWidth={1.6} />
      <Circle cx={76} cy={88} r={3.4} fill={SCARF_SHADE} />

      {/* neck */}
      <Rect x={43} y={56} width={14} height={12} rx={4} fill={SKIN_SHADE} />

      {/* face */}
      <Circle cx={50} cy={42} r={18.5} fill={`url(#${id}skin)`} />

      {/* hair at the temples, the bit a scarf leaves showing */}
      <Path d="M31 38 Q33 22 50 22 Q67 22 69 38 Q62 30 50 30 Q38 30 31 38 Z" fill={HAIR} />

      {/* headscarf: crown, then the tail knotted at her left shoulder */}
      <Path d="M29 34 Q31 14 50 14 Q69 14 71 34 Q68 26 50 25 Q32 26 29 34 Z" fill={`url(#${id}scarf)`} />
      <Path d="M28 33 Q30 40 33 45 Q30 34 34 28 Z" fill={SCARF_SHADE} />
      <Path d="M29 34 Q22 44 24 58 Q29 62 33 57 Q29 45 34 36 Z" fill={`url(#${id}scarf)`} />
      {/* a row of stitching across the crown — the detail that makes it cloth */}
      <Path d="M33 25 Q50 19 67 25" stroke={GOLD} strokeWidth={1.6} fill="none" opacity={0.75} />

      {/* earring */}
      <Circle cx={70} cy={48} r={2.6} fill={GOLD} />

      <G>
        <Circle cx={42.5} cy={45} r={2.6} fill={INK} />
        <Circle cx={57.5} cy={45} r={2.6} fill={INK} />
        <Circle cx={43.5} cy={44} r={0.9} fill="#fff" opacity={0.85} />
        <Circle cx={58.5} cy={44} r={0.9} fill="#fff" opacity={0.85} />
      </G>

      {/* Brows do the talking. Level and soft when she is welcoming you;
          one lifted when she is pointing something out. */}
      {mood === "explaining" ? (
        <>
          <Path d="M37 38 Q42 34 47 37" stroke={HAIR} strokeWidth={1.9} strokeLinecap="round" fill="none" />
          <Path d="M53 38 Q58 36 63 39" stroke={HAIR} strokeWidth={1.9} strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <Path
            d="M37 38 Q42 35.5 47 37.5"
            stroke={HAIR}
            strokeWidth={1.9}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M53 37.5 Q58 35.5 63 38"
            stroke={HAIR}
            strokeWidth={1.9}
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}

      <Ellipse cx={36} cy={51} rx={4.2} ry={2.6} fill="#e07a4a" opacity={0.32} />
      <Ellipse cx={64} cy={51} rx={4.2} ry={2.6} fill="#e07a4a" opacity={0.32} />
      <Path d="M43 53 Q50 60 57 53" stroke={INK} strokeWidth={1.9} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
