import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";

interface Props {
  children: React.ReactNode;
  /** stagger, in ms — give each item in a group a different one so they drift
   * out of phase instead of rising and falling as a single block */
  delay?: number;
  /** how far to travel, in px */
  distance?: number;
  duration?: number;
}

/** Floats its children up and down forever. A crowd that breathes reads as
 * alive where a static one reads as a sprite sheet; the same trick keeps the
 * title screen's logo from looking pasted on.
 *
 * Extracted from TownSquareScene when the title screen wanted it too —
 * duplicating the loop would have meant two places to get the cleanup wrong.
 */
export function Bobbing({ children, delay = 0, distance = 4, duration = 1400 }: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay, duration]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] });
  return <Animated.View style={{ transform: [{ translateY }] }}>{children}</Animated.View>;
}
