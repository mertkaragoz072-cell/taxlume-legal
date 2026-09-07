import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import type { EconomyState } from "../economy/types";
import { pickTownChatterKey } from "../economy/townChatter";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, RADIUS, SPACING, TYPE } from "../theme";
import { GradientFill } from "./GradientFill";

interface Props {
  state: EconomyState;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const ROTATE_MS = 7000;
const FADE_MS = 250;

export function TownChatterTicker({ state, t }: Props) {
  const stateRef = useRef(state);
  stateRef.current = state;
  const [chatterKey, setChatterKey] = useState(() => pickTownChatterKey(state));
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => {
        setChatterKey((prev) => {
          let next = pickTownChatterKey(stateRef.current);
          for (let attempts = 0; next === prev && attempts < 5; attempts++) {
            next = pickTownChatterKey(stateRef.current);
          }
          return next;
        });
        Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
      });
    }, ROTATE_MS);
    return () => clearInterval(interval);
  }, [opacity]);

  return (
    <View style={styles.wrap}>
      <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
      <Text style={styles.icon}>💬</Text>
      <Animated.Text style={[styles.text, { opacity }]} numberOfLines={2}>
        {t(chatterKey)}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    overflow: "hidden",
    ...cardShadow,
  },
  icon: { fontSize: 16, marginRight: SPACING.sm },
  text: { flex: 1, color: COLORS.textMuted, fontSize: TYPE.caption, fontStyle: "italic", fontFamily: FONT.medium },
});
