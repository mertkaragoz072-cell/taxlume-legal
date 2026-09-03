import React from "react";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

interface Props {
  size?: number;
}

/** A small flat-style villager mascot, palette-matched to the rest of the
 * town's UI, used to give the "someone's asking for something" modals a face. */
export function VillagerIllustration({ size = 84 }: Props) {
  const width = size;
  const height = size * 1.32;

  return (
    <Svg width={width} height={height} viewBox="0 0 90 119">
      <Ellipse cx={45} cy={113} rx={24} ry={5} fill="#000" opacity={0.28} />

      <Rect x={33} y={86} width={9} height={22} rx={4} fill="#5c4530" />
      <Rect x={48} y={86} width={9} height={22} rx={4} fill="#5c4530" />

      {/* far arm, resting at the side */}
      <Path d="M31 55 Q22 66 27 79" stroke="#c97b3d" strokeWidth={9} strokeLinecap="round" fill="none" />
      <Circle cx={27} cy={80} r={6.5} fill="#e0a878" />

      {/* robe */}
      <Path d="M45 40 L70 99 L20 99 Z" fill="#c97b3d" />
      <Rect x={25} y={71} width={40} height={8} rx={4} fill="#8a5a34" />
      <Path d="M32 42 Q45 53 58 42 L58 48 Q45 59 32 48 Z" fill="#e8c777" />

      {/* near arm, raised as if asking for something */}
      <Path d="M61 52 Q78 43 75 23" stroke="#c97b3d" strokeWidth={9} strokeLinecap="round" fill="none" />
      <Circle cx={75} cy={21} r={6.5} fill="#e0a878" />

      <Rect x={40} y={31} width={10} height={10} fill="#e0a878" />
      <Circle cx={45} cy={21} r={16} fill="#e0a878" />
      <Path d="M28 19 Q28 3 45 3 Q62 3 62 19 Q53 11 45 11 Q37 11 28 19 Z" fill="#3a2418" />

      <Circle cx={40} cy={22} r={1.6} fill="#2a2016" />
      <Circle cx={50} cy={22} r={1.6} fill="#2a2016" />
      <Path d="M39 27 Q45 31 51 27" stroke="#2a2016" strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
