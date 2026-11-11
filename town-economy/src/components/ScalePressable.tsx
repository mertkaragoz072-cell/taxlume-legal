import React, { useRef } from "react";
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends PressableProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  scaleTo?: number;
}

export function ScalePressable({ style, children, scaleTo = 0.94, onPressIn, onPressOut, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const dim = useRef(new Animated.Value(1)).current;
  // The caller may already dim the button (disabled, locked): the press dip
  // multiplies with that instead of replacing it.
  const own = StyleSheet.flatten(style)?.opacity;
  const opacity = typeof own === "number" ? Animated.multiply(dim, own) : dim;

  return (
    <AnimatedPressable
      // Almost every tappable surface in the app is one of these, so the
      // button role belongs here rather than being retyped at 150 call sites.
      // It sits before the prop spread so a caller can still override it
      // (a tab, a checkbox) without a second wrapper.
      accessibilityRole="button"
      // Many painted buttons are 34-40 px tall; the slop brings every tap
      // target to the 44 pt minimum without changing how anything looks.
      hitSlop={{ top: 7, bottom: 7, left: 4, right: 4 }}
      style={[style, { transform: [{ scale }], opacity }]}
      onPressIn={(e: GestureResponderEvent) => {
        Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 40 }).start();
        Animated.timing(dim, { toValue: 0.88, duration: 70, useNativeDriver: true }).start();
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
        Animated.timing(dim, { toValue: 1, duration: 140, useNativeDriver: true }).start();
        onPressOut?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
