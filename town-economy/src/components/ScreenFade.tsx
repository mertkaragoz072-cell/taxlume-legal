import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

/** Fades and lifts a screen in when its tab opens, so switching tabs reads as
 * a change of room instead of a hard cut. Mount it with a `key` per screen. */
export function ScreenFade({ children }: { children: React.ReactNode }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [t]);
  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: t,
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}
