import React from "react";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

interface Props {
  width: number;
  height: number;
  /** 0 = a town that has stopped caring, 1 = a town doing well. Drains the
   * colour out of the square rather than only darkening it, so an unhappy
   * town looks tired instead of merely unlit. */
  warmth: number;
}

const BASE_W = 320;
const BASE_H = 128;

function hex(n: number): string {
  return Math.round(Math.max(0, Math.min(255, n)))
    .toString(16)
    .padStart(2, "0");
}

/** Blend two hex colours, so one set of shapes can serve both moods. */
function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => hex(v + (pb[i] - v) * t)).join("")}`;
}

/** Where an unhappy town's colours drift: dusty and washed out, not black. */
const DRAB = "#8b7a63";

/** The scene behind the Town Square crowd: a working market square in
 * daylight — plastered houses with terracotta roofs, stalls with produce on
 * the counters, bunting, barrels, a tree and a well.
 *
 * Bright on purpose. The first version was dark and low-contrast so it would
 * sit politely behind the crowd, and the result read as a ruin at dusk rather
 * than a town anyone lived in. A lit square actually serves the crowd better:
 * the villagers are the most saturated shapes in the frame, so against pale
 * plaster they stand in the scene instead of floating on top of it. */
export function TownSquareBackdrop({ width, height, warmth }: Props) {
  // Never drained all the way, or a struggling town stops looking like the
  // same place the thriving one was.
  const d = (1 - Math.max(0, Math.min(1, warmth))) * 0.6;
  const c = (col: string) => mix(col, DRAB, d);

  const plaster = c("#e6cda1");
  const plasterShade = c("#c8ab7c");
  const roof = c("#b5613a");
  const roofShade = c("#8f472a");
  const timber = c("#7a5530");
  const lit = mix("#ffe6ae", "#9c8f79", d * 1.2);
  const cobble = c("#cbb084");
  const cobbleShade = c("#ab8f65");
  const leaf = c("#6f8347");
  const leafDark = c("#566a36");
  const hill = c("#93a061");

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${BASE_W} ${BASE_H}`}>
      <Defs>
        <LinearGradient id="tsSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c("#93b3c2")} />
          <Stop offset="0.55" stopColor={c("#dbc9a0")} />
          <Stop offset="1" stopColor={c("#f8e6c0")} />
        </LinearGradient>
        <LinearGradient id="tsGround" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={cobble} />
          <Stop offset="1" stopColor={cobbleShade} />
        </LinearGradient>
      </Defs>

      <Rect x={0} y={0} width={BASE_W} height={BASE_H} fill="url(#tsSky)" />

      {/* two birds — the cheapest possible sign the place is inhabited */}
      <Path
        d="M38 20 q4 -3 8 0 M48 24 q4 -3 8 0"
        stroke={c("#6b5a44")}
        strokeWidth={1.4}
        fill="none"
        opacity={0.55 * (1 - d)}
        strokeLinecap="round"
      />

      {/* rolling hills behind the roofline */}
      <Path d="M0 74 Q52 56 104 72 Q150 60 196 73 Q252 58 320 74 L320 100 L0 100 Z" fill={hill} />
      <Path
        d="M0 82 Q60 70 118 82 Q180 72 240 83 Q284 76 320 84 L320 100 L0 100 Z"
        fill={leafDark}
        opacity={0.5}
      />

      {/* the houses: plaster walls, terracotta roofs, timber frames */}
      <G>
        <Rect x={10} y={56} width={46} height={40} fill={plaster} />
        <Rect x={44} y={56} width={12} height={40} fill={plasterShade} />
        <Path d="M4 58 L33 38 L62 58 Z" fill={roof} />
        <Rect x={4} y={57} width={58} height={4} fill={roofShade} />
        <Rect x={17} y={65} width={11} height={12} rx={1} fill={timber} />
        <Rect x={18} y={66} width={9} height={10} rx={1} fill={lit} />
        <Rect x={32} y={65} width={11} height={12} rx={1} fill={timber} />
        <Rect x={33} y={66} width={9} height={10} rx={1} fill={lit} opacity={0.8} />
        <Rect x={24} y={82} width={11} height={14} rx={1} fill={timber} />
        <Rect x={46} y={42} width={7} height={13} fill={plasterShade} />
        <Path
          d="M49 40 q-5 -6 0 -11 q5 -5 1 -10"
          stroke={c("#f3e7d0")}
          strokeWidth={2.6}
          fill="none"
          opacity={0.45 * (1 - d)}
          strokeLinecap="round"
        />

        <Rect x={66} y={46} width={38} height={50} fill={plaster} />
        <Rect x={92} y={46} width={12} height={50} fill={plasterShade} />
        <Path d="M60 48 L85 30 L110 48 Z" fill={roof} />
        <Rect x={60} y={47} width={50} height={4} fill={roofShade} />
        <Rect x={72} y={55} width={10} height={11} rx={1} fill={timber} />
        <Rect x={73} y={56} width={8} height={9} rx={1} fill={lit} />
        <Rect x={85} y={55} width={10} height={11} rx={1} fill={timber} />
        <Rect x={86} y={56} width={8} height={9} rx={1} fill={lit} opacity={0.75} />
        <Rect x={66} y={69} width={38} height={2} fill={timber} />
        <Rect x={72} y={76} width={10} height={11} rx={1} fill={timber} />
        <Rect x={73} y={77} width={8} height={9} rx={1} fill={lit} opacity={0.85} />
        <Rect x={85} y={76} width={10} height={11} rx={1} fill={timber} />
        <Rect x={86} y={77} width={8} height={9} rx={1} fill={lit} opacity={0.6} />

        <Rect x={224} y={52} width={42} height={44} fill={plaster} />
        <Rect x={254} y={52} width={12} height={44} fill={plasterShade} />
        <Path d="M218 54 L245 34 L272 54 Z" fill={roof} />
        <Rect x={218} y={53} width={54} height={4} fill={roofShade} />
        <Rect x={231} y={61} width={11} height={12} rx={1} fill={timber} />
        <Rect x={232} y={62} width={9} height={10} rx={1} fill={lit} />
        <Rect x={245} y={61} width={11} height={12} rx={1} fill={timber} />
        <Rect x={246} y={62} width={9} height={10} rx={1} fill={lit} opacity={0.7} />
        <Rect x={238} y={80} width={12} height={16} rx={1} fill={timber} />

        <Rect x={274} y={64} width={38} height={32} fill={plaster} />
        <Rect x={300} y={64} width={12} height={32} fill={plasterShade} />
        <Path d="M268 66 L293 50 L318 66 Z" fill={roof} />
        <Rect x={268} y={65} width={50} height={4} fill={roofShade} />
        <Rect x={281} y={73} width={11} height={11} rx={1} fill={timber} />
        <Rect x={282} y={74} width={9} height={9} rx={1} fill={lit} opacity={0.85} />
      </G>

      {/* a tree between the houses and the square */}
      <G>
        <Rect x={207} y={70} width={6} height={26} fill={timber} />
        <Circle cx={210} cy={60} r={14} fill={leaf} />
        <Circle cx={201} cy={66} r={10} fill={leafDark} />
        <Circle cx={218} cy={67} r={9} fill={leafDark} />
        <Circle cx={212} cy={54} r={9} fill={c("#869b52")} />
      </G>

      {/* the well */}
      <G>
        <Rect x={146} y={72} width={28} height={13} rx={2} fill={c("#b09877")} />
        <Rect x={146} y={72} width={28} height={3.5} fill={c("#907a5c")} />
        <Rect x={150} y={54} width={3} height={19} fill={timber} />
        <Rect x={167} y={54} width={3} height={19} fill={timber} />
        <Path d="M142 56 L160 46 L178 56 Z" fill={roof} />
        <Rect x={142} y={55} width={36} height={3} fill={roofShade} />
      </G>

      {/* bunting across the square — the detail that says "market day" */}
      <G opacity={1 - d * 0.75}>
        <Path d="M108 56 Q160 68 212 56" stroke={timber} strokeWidth={1.2} fill="none" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const t = i / 7;
          const x = 108 + t * 104;
          const y = 56 + Math.sin(Math.PI * t) * 11;
          const flag = [c("#c9452f"), c("#e8c777"), c("#6f8347")][i % 3];
          return <Path key={i} d={`M${x - 3.2} ${y} L${x + 3.2} ${y} L${x} ${y + 7} Z`} fill={flag} />;
        })}
      </G>

      {/* two stalls, with produce on the counters */}
      <G>
        <Rect x={104} y={80} width={40} height={16} fill={c("#96754e")} />
        <Rect x={104} y={80} width={40} height={3} fill={c("#77593a")} />
        <Path d="M100 80 L105 68 L143 68 L148 80 Z" fill={c("#c9452f")} />
        <Path d="M110 68 L106 80 L114 80 L118 68 Z" fill={c("#f5e7c6")} />
        <Path d="M126 68 L122 80 L130 80 L134 68 Z" fill={c("#f5e7c6")} />
        <Circle cx={112} cy={77} r={2.6} fill={c("#d9622f")} />
        <Circle cx={119} cy={77} r={2.6} fill={c("#c23a2c")} />
        <Circle cx={126} cy={77} r={2.6} fill={c("#7f9a45")} />
        <Circle cx={133} cy={77} r={2.6} fill={c("#e0a637")} />
      </G>
      <G>
        <Rect x={176} y={80} width={40} height={16} fill={c("#96754e")} />
        <Rect x={176} y={80} width={40} height={3} fill={c("#77593a")} />
        <Path d="M172 80 L177 68 L215 68 L220 80 Z" fill={c("#d98b2b")} />
        <Path d="M182 68 L178 80 L186 80 L190 68 Z" fill={c("#f5e7c6")} />
        <Path d="M198 68 L194 80 L202 80 L206 68 Z" fill={c("#f5e7c6")} />
        <Circle cx={184} cy={77} r={2.6} fill={c("#e0a637")} />
        <Circle cx={191} cy={77} r={2.6} fill={c("#7f9a45")} />
        <Circle cx={198} cy={77} r={2.6} fill={c("#d9622f")} />
      </G>

      {/* barrels and crates out at the edges, clear of where the crowd stands */}
      <G>
        <Rect x={62} y={82} width={13} height={14} rx={3} fill={c("#a1713f")} />
        <Rect x={62} y={86} width={13} height={1.8} fill={c("#77502b")} />
        <Rect x={62} y={91} width={13} height={1.8} fill={c("#77502b")} />
        <Rect x={78} y={87} width={12} height={9} fill={c("#b89058")} />
        <Path d="M78 91.5 H90" stroke={c("#8f6c3b")} strokeWidth={1.4} />
      </G>
      <G>
        <Rect x={248} y={84} width={12} height={12} rx={3} fill={c("#a1713f")} />
        <Rect x={248} y={88} width={12} height={1.8} fill={c("#77502b")} />
      </G>

      {/* the cobbled square */}
      <Rect x={0} y={96} width={BASE_W} height={BASE_H - 96} fill="url(#tsGround)" />
      <Ellipse cx={160} cy={96} rx={170} ry={4} fill={cobbleShade} opacity={0.5} />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
        <Path
          key={i}
          d={`M${i * 28 - 6} ${105 + (i % 2) * 9} q7 -3 14 0`}
          stroke={cobbleShade}
          strokeWidth={1.6}
          fill="none"
          opacity={0.65}
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}
