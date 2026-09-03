import React, { useRef } from "react";
import { Animated, GestureResponderEvent, Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends PressableProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  scaleTo?: number;
}

export function ScalePressable({ style, children, scaleTo = 0.94, onPressIn, onPressOut, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <AnimatedPressable
      style={[style, { transform: [{ scale }] }]}
      onPressIn={(e: GestureResponderEvent) => {
        Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 40 }).start();
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
        onPressOut?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
