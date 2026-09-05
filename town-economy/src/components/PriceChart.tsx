import React from "react";
import { View } from "react-native";
import Svg, { Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";

interface Props {
  history: number[];
  color: string;
  width: number;
  height: number;
  strokeWidth?: number;
}

interface Point {
  x: number;
  y: number;
}

// Catmull-Rom → cubic Bezier smoothing, so the line reads as an organic
// price curve (like a real trading app) rather than a jagged
// connect-the-dots polyline between tick samples.
function smoothLinePath(points: Point[]): string {
  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export function PriceChart({ history, color, width, height, strokeWidth = 2.5 }: Props) {
  // Wrapped in a plain View rather than returning the <Svg> bare: on web,
  // react-native-svg's root renders as a plain (statically positioned) DOM
  // node, which paints BEHIND any absolutely/relatively positioned sibling
  // — like the GradientFill card background — regardless of DOM order.
  // Wrapping it in a View (react-native-web defaults Views to position:
  // relative) puts the chart in the same stacking layer as everything else
  // on the card, so it actually paints on top like it's supposed to.
  const gradientId = React.useId().replace(/:/g, "");

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

  const points: Point[] = history.map((value, i) => ({
    x: (i / (history.length - 1)) * width,
    y: height - padY - ((value - min) / span) * (height - padY * 2),
  }));

  const linePath = smoothLinePath(points);
  // Same curve, closed down to the baseline — a soft gradient fill under
  // the line is what makes a chart read as "financial" rather than a bare
  // line plot (Robinhood/Yahoo Finance-style area chart).
  const areaPath = `${linePath} L ${width.toFixed(1)},${height.toFixed(1)} L 0,${height.toFixed(1)} Z`;

  const lastY = points[points.length - 1].y;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
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
        <Path
          d={linePath}
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
