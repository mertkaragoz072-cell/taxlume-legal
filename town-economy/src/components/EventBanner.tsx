import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { EconomyEvent } from "../economy/types";

interface Props {
  event: EconomyEvent | null;
}

const TONE_BG: Record<EconomyEvent["tone"], string> = {
  bad: "#3a1f1a",
  good: "#1c3320",
  neutral: "#2a2016",
};

export function EventBanner({ event }: Props) {
  const translateY = useRef(new Animated.Value(-16)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const lastId = useRef<number | null>(null);

  useEffect(() => {
    if (!event || event.id === lastId.current) return;
    lastId.current = event.id;
    translateY.setValue(-16);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [event, translateY, opacity]);

  if (!event) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: TONE_BG[event.tone], opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.text}>📰 {event.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  text: { color: "#f0e3c8", fontSize: 12 },
});
