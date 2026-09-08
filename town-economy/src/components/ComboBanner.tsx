import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { FONT, TYPE, WEIGHT } from "../theme";

interface ComboEvent {
  id: number;
  count: number;
}

interface Props {
  event: ComboEvent | null;
}

const VISIBLE_MS = 1800;

function tierColor(count: number): string {
  if (count >= 20) return "#c77df0";
  if (count >= 12) return "#f0776a";
  if (count >= 8) return "#e0a13f";
  return "#ffd75e";
}

/** A brief, self-dismissing "3x KOMBO!" toast that pops when tradeStreak
 * crosses a milestone (see App.tsx) — a pure celebratory flourish, not
 * routed through the economy event log. */
export function ComboBanner({ event }: Props) {
  const { t } = useEconomyContext();
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const lastId = useRef<number | null>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!event || event.id === lastId.current) return;
    lastId.current = event.id;
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    scale.setValue(0.6);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    hideTimeout.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    }, VISIBLE_MS);
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [event, scale, opacity]);

  if (!event) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { opacity, transform: [{ scale }] }]}
    >
      <Animated.View style={[styles.pill, { backgroundColor: tierColor(event.count) }]}>
        <Text style={styles.text}>{t("combo.milestone", { count: event.count })}</Text>
        <Text style={styles.subtext}>{t("combo.subtitle")}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 20,
  },
  pill: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  text: { color: "#1a1410", fontSize: TYPE.title, fontWeight: WEIGHT.black, fontFamily: FONT.black },
  subtext: { color: "#1a1410", fontSize: TYPE.micro, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, marginTop: 1 },
});
