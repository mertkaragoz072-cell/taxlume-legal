import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, LayoutChangeEvent, StyleSheet, View } from "react-native";
import chatterArt from "../../assets/ui/bars/chatter.webp";
import type { EconomyState } from "../economy/types";
import { pickTownChatterKey } from "../economy/townChatter";
import { FONT, PANEL_GAP } from "../theme";

interface Props {
  state: EconomyState;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const ROTATE_MS = 7000;
// the painted bubble takes the left ~13% of the bar
const TEXT_X = 0.13;
const FADE_MS = 250;

export function TownChatterTicker({ state, t }: Props) {
  const stateRef = useRef(state);
  stateRef.current = state;
  const [width, setWidth] = useState(360);
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

  const text = t(chatterKey);
  const textW = width * (1 - TEXT_X - 0.04);
  const size = Math.max(9, Math.min(12.5, (textW * 2 * 0.9) / (Math.max(1, text.length) * 0.6)));

  return (
    <View style={styles.wrap} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ width: "100%", aspectRatio: 1200 / 134 }}>
        <Image source={chatterArt} style={styles.art} resizeMode="stretch" />
        <View style={[styles.textBox, { left: width * TEXT_X, right: width * 0.04 }]}>
          <Animated.Text
            style={[styles.text, { opacity, fontSize: size, lineHeight: size * 1.2 }]}
            numberOfLines={2}
          >
            {text}
          </Animated.Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: PANEL_GAP },
  art: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  textBox: { position: "absolute", top: 0, bottom: 0, justifyContent: "center" },
  text: { color: "#d9c9a2", fontStyle: "italic", fontFamily: FONT.medium },
});
