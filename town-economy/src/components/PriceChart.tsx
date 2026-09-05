import React from "react";
import { View } from "react-native";
import Svg, { Line, Polyline } from "react-native-svg";

interface Props {
  history: number[];
  color: string;
  width: number;
  height: number;
  strokeWidth?: number;
}

export function PriceChart({ history, color, width, height, strokeWidth = 2.5 }: Props) {
  // Wrapped in a plain View rather than returning the <Svg> bare: on web,
  // react-native-svg's root renders as a plain (statically positioned) DOM
  // node, which paints BEHIND any absolutely/relatively positioned sibling
  // — like the GradientFill card background — regardless of DOM order.
  // Wrapping it in a View (react-native-web defaults Views to position:
  // relative) puts the chart in the same stacking layer as everything else
  // on the card, so it actually paints on top like it's supposed to.
  if (history.length === 0) {
    return <View style={{ width, height }} />;
  }

  // Right at the start (or the moment a good unlocks) there's only the
  // seed price and no movement yet — a bare empty box there reads as
  // broken, so show a flat "gathering data" baseline instead of nothing.
  if (history.length < 2) {
    const y = height / 2;
    return (
      <View style={{ width, height }}>
        <Svg width={width} height={height}>
          <Line x1={0} y1={y} x2={width} y2={y} stroke={color} strokeWidth={1} strokeDasharray="3,4" opacity={0.35} />
        </Svg>
      </View>
    );
  }

  const min = Math.min(...history);
  const max = Math.max(...history);
  const span = max - min || 1;
  const padY = height * 0.12;

  const points = history
    .map((value, i) => {
      const x = (i / (history.length - 1)) * width;
      const y = height - padY - ((value - min) / span) * (height - padY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const lastValue = history[history.length - 1];
  const lastY = height - padY - ((lastValue - min) / span) * (height - padY * 2);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Line
          x1={0}
          y1={lastY}
          x2={width}
          y2={lastY}
          stroke={color}
          strokeWidth={1}
          strokeDasharray="3,4"
          opacity={0.25}
        />
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
