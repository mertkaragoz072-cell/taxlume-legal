import React, { useId, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
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
 * own <svg>, but url(#id) references resolve against the whole document.
 *
 * The plain View around the Svg is load-bearing, not tidiness. Almost every
 * card that uses this has padding, and the two runtimes disagree about what
 * a percentage on an absolutely-positioned child is a percentage *of*: the
 * web resolves it against the padding box, Yoga against the content box. So
 * `width="100%"` straight inside a `padding: 28` card painted the gradient
 * 56px short on each axis on a phone while looking perfect in a browser —
 * the card's own progress bar and label ended up outside their background.
 * The wrapper has no padding of its own, which makes 100% mean the same
 * thing under either rule.
 *
 * The Svg itself is measured rather than given width/height="100%" for a
 * related reason: react-native-svg resolves a percentage against whatever
 * the enclosing layout has settled to *at that moment*, which is a separate,
 * earlier pass than the surrounding flex box's own — nest this one flex
 * level deeper than whatever a screen last tested it at (the gold CTA
 * button gained a glow-shadow wrapper around it later, for instance) and it
 * can paint the gradient only across however wide the button was on an
 * intermediate layout pass, cut off past that on a real device, again never
 * showing up on web. Reading the wrapper's own onLayout and handing the Svg
 * that exact pixel size sidesteps needing the two layout passes to agree.
 */
export function GradientFill({ colors, x1 = "0", y1 = "0", x2 = "1", y2 = "1" }: Props) {
  const gradientId = `gf${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width: Math.round(width), height: Math.round(height) });
  };
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      {size.width > 0 && size.height > 0 && (
        <Svg width={size.width} height={size.height} pointerEvents="none">
          <Defs>
            <LinearGradient id={gradientId} x1={x1} y1={y1} x2={x2} y2={y2}>
              <Stop offset="0" stopColor={colors[0]} />
              <Stop offset="1" stopColor={colors[1]} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size.width} height={size.height} fill={`url(#${gradientId})`} />
        </Svg>
      )}
    </View>
  );
}
