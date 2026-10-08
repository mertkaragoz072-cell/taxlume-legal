import React, { useId, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

/** A soft radial wash, centered above the content column, meant to sit
 * behind it — see App.tsx, where it's layered between the base seasonal
 * gradient and the content itself.
 *
 * On a phone the content column fills the screen, so this is never seen
 * past the header. On a tablet the column is capped (CONTENT_MAX_WIDTH)
 * and leaves bare gradient on both sides; without this, that margin reads
 * as empty dead space rather than part of the same scene — the game's own
 * palette never reaches it. This blooms the same warm gold outward past
 * the column's edges, so the margin reads as atmosphere the content sits
 * in rather than a border around it.
 *
 * userSpaceOnUse + a measured size, not percentage radii — see
 * GradientFill's own comment: with the default objectBoundingBox units, a
 * radial gradient's percentages are relative to a *unit square* stretched
 * to the element's own width and height, so on a wide, short screen
 * (exactly this element's whole use case) it renders as a flattened oval
 * instead of a circular glow. */
export function AmbientGlow() {
  const gradientId = `ag${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width: Math.round(width), height: Math.round(height) });
  };
  const radius = Math.max(size.width, size.height) * 0.62;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      {size.width > 0 && size.height > 0 && (
        <Svg width={size.width} height={size.height} pointerEvents="none">
          <Defs>
            <RadialGradient
              id={gradientId}
              gradientUnits="userSpaceOnUse"
              cx={size.width / 2}
              cy={size.height * 0.06}
              r={radius}
            >
              <Stop offset="0" stopColor="#e1c58c" stopOpacity={0.14} />
              <Stop offset="1" stopColor="#e1c58c" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={size.width} height={size.height} fill={`url(#${gradientId})`} />
        </Svg>
      )}
    </View>
  );
}
