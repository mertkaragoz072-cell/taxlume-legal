import React, { useId } from "react";
import { StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

interface Props {
  colors: [string, string];
  x1?: string;
  y1?: string;
  x2?: string;
  y2?: string;
}

/** An absolute-fill gradient rect meant as the first child inside a
 * rounded, `overflow: "hidden"` container — the same layering trick the
 * price-flash overlays already use, just static instead of animated.
 * Each instance gets its own gradient id (via useId) so several of these
 * on one screen don't clash — react-native-web renders every <Svg> as its
 * own <svg>, but url(#id) references resolve against the whole document. */
export function GradientFill({ colors, x1 = "0", y1 = "0", x2 = "1", y2 = "1" }: Props) {
  const gradientId = `gf${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id={gradientId} x1={x1} y1={y1} x2={x2} y2={y2}>
          <Stop offset="0" stopColor={colors[0]} />
          <Stop offset="1" stopColor={colors[1]} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
    </Svg>
  );
}
