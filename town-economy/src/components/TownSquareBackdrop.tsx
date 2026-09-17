import React from "react";
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

interface Props {
  width: number;
  height: number;
  /** warms the lit windows and the glow on the horizon when the town is doing
   * well, and lets them die down when it is not */
  warmth: number;
}

const BASE_W = 320;
const BASE_H = 128;

const SKY_TOP = "#241a0f";
const SKY_LOW = "#6b4620";
const HILL_FAR = "#3a2a18";

/** The scene behind the Town Square crowd: a cobbled square at golden hour,
 * with stalls, a well and lit windows in the houses behind.
 *
 * Deliberately low-contrast and bottom-weighted — it has to sit behind the
 * villagers and a caption without competing with either, so the busy detail
 * stays near the ground line where the crowd already covers it. */
export function TownSquareBackdrop({ width, height, warmth }: Props) {
  const glow = 0.25 + warmth * 0.45;
  const windowOpacity = 0.45 + warmth * 0.55;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${BASE_W} ${BASE_H}`}>
      <Defs>
        <LinearGradient id="tsSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={SKY_TOP} />
          <Stop offset="0.62" stopColor="#3d2a15" />
          <Stop offset="1" stopColor={SKY_LOW} />
        </LinearGradient>
        <LinearGradient id="tsGround" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#5a4326" />
          <Stop offset="1" stopColor="#382817" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="tsSun" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffd98a" stopOpacity={0} />
          <Stop offset="1" stopColor="#ffc46a" stopOpacity={glow} />
        </LinearGradient>
      </Defs>

      <Rect x={0} y={0} width={BASE_W} height={BASE_H} fill="url(#tsSky)" />
      {/* the low sun's wash, strongest right on the horizon */}
      <Rect x={0} y={44} width={BASE_W} height={40} fill="url(#tsSun)" />

      {/* distant hills */}
      <Path d="M0 84 Q40 68 78 82 Q110 70 146 83 L146 92 L0 92 Z" fill={HILL_FAR} opacity={0.85} />
      <Path d="M170 83 Q206 69 242 82 Q280 70 320 84 L320 92 L170 92 Z" fill={HILL_FAR} opacity={0.85} />

      {/* the row of houses: plain blocks and roofs, read as a skyline */}
      <G>
        <Rect x={16} y={62} width={40} height={30} fill="#402d1a" />
        <Path d="M12 63 L36 48 L60 63 Z" fill="#553a20" />
        <Rect x={24} y={70} width={8} height={9} rx={1.5} fill="#f0e3c8" opacity={windowOpacity} />
        <Rect x={40} y={70} width={8} height={9} rx={1.5} fill="#f0e3c8" opacity={windowOpacity * 0.7} />

        <Rect x={64} y={54} width={34} height={38} fill="#372617" />
        <Path d="M60 55 L81 41 L102 55 Z" fill="#4c331c" />
        <Rect x={72} y={62} width={7} height={8} rx={1.5} fill="#f0e3c8" opacity={windowOpacity * 0.85} />
        <Rect x={84} y={62} width={7} height={8} rx={1.5} fill="#f0e3c8" opacity={windowOpacity * 0.5} />
        <Rect x={78} y={78} width={9} height={14} rx={1.5} fill="#2a1c10" />

        <Rect x={222} y={58} width={38} height={34} fill="#3d2a19" />
        <Path d="M218 59 L241 44 L264 59 Z" fill="#523720" />
        <Rect x={230} y={66} width={8} height={9} rx={1.5} fill="#f0e3c8" opacity={windowOpacity * 0.9} />
        <Rect x={244} y={66} width={8} height={9} rx={1.5} fill="#f0e3c8" opacity={windowOpacity * 0.6} />

        <Rect x={268} y={66} width={34} height={26} fill="#372617" />
        <Path d="M264 67 L285 54 L306 67 Z" fill="#4c331c" />
        <Rect x={278} y={74} width={8} height={8} rx={1.5} fill="#f0e3c8" opacity={windowOpacity * 0.75} />
      </G>

      {/* the well, dead centre behind where the crowd stands */}
      <G>
        <Rect x={148} y={78} width={24} height={14} rx={2} fill="#4a3826" />
        <Rect x={152} y={62} width={3} height={17} fill="#5c4530" />
        <Rect x={165} y={62} width={3} height={17} fill="#5c4530" />
        <Path d="M146 63 L160 55 L174 63 Z" fill="#6b4a2a" />
      </G>

      {/* two market stalls with striped awnings */}
      <G>
        <Rect x={104} y={76} width={34} height={16} fill="#43301c" />
        <Path d="M100 76 L104 66 L138 66 L142 76 Z" fill="#c97b3d" />
        <Path d="M108 66 L105 76 L112 76 L115 66 Z" fill="#e8c777" opacity={0.75} />
        <Path d="M124 66 L121 76 L128 76 L131 66 Z" fill="#e8c777" opacity={0.75} />
      </G>
      <G>
        <Rect x={182} y={76} width={34} height={16} fill="#43301c" />
        <Path d="M178 76 L182 66 L216 66 L220 76 Z" fill="#a8623a" />
        <Path d="M186 66 L183 76 L190 76 L193 66 Z" fill="#e8c777" opacity={0.6} />
        <Path d="M202 66 L199 76 L206 76 L209 66 Z" fill="#e8c777" opacity={0.6} />
      </G>

      {/* the cobbled square itself, fading out so the card's own gradient shows */}
      <Rect x={0} y={92} width={BASE_W} height={36} fill="url(#tsGround)" />
      <Ellipse cx={160} cy={96} rx={150} ry={7} fill="#6b5130" opacity={0.35} />
    </Svg>
  );
}
