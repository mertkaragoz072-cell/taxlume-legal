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
  if (history.length < 2) {
    return <View style={{ width, height }} />;
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
  );
}
