import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, LayoutChangeEvent, StyleSheet, View } from "react-native";
import newsArt from "../../assets/ui/bars/news.webp";
import { Text } from "./AppText";
import { EconomyEvent } from "../economy/types";
import { Language, resolveEventMessage } from "../i18n/t";
import { FONT, SCREEN_PADDING } from "../theme";

interface Props {
  event: EconomyEvent | null;
  /** Events carry the language they fired in baked into `.message` (see
   * EconomyEvent's own comment) — re-resolving through `key`/`params`
   * against the *current* language here is what stops this banner from
   * showing a stale language right after the player switches, which is
   * what it did before this prop existed. */
  language: Language;
}

// The sent banner is green (a good piece of news); a bad or neutral one lays a
// translucent wash over the same art so the tone still reads at a glance.
const TONE_TINT: Record<EconomyEvent["tone"], string | null> = {
  good: null,
  bad: "rgba(150,34,24,0.55)",
  neutral: "rgba(96,64,28,0.5)",
};
// art is 1200 x 161; the words sit right of the news icon slot
const ART_ASPECT = 1200 / 161;
const TEXT_X = 0.13;
const TEXT_RIGHT = 0.04;

// How long the banner stays up before it clears itself — this is a normal
// flex sibling (unlike ComboBanner's absolute overlay), so without this it
// never stopped occupying layout space once the first event of a run fired,
// permanently pushing everything below it down and, stacked underneath an
// active crisis warning and flash deal, shoving the market content itself
// off the first screen.
const VISIBLE_MS = 5000;

export function EventBanner({ event, language }: Props) {
  const translateY = useRef(new Animated.Value(-16)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const lastId = useRef<number | null>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [width, setWidth] = useState(360);

  useEffect(() => {
    if (!event || event.id === lastId.current) return;
    lastId.current = event.id;
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setDismissed(false);
    translateY.setValue(-16);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
    hideTimeout.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -16, duration: 300, useNativeDriver: true }),
      ]).start(() => setDismissed(true));
    }, VISIBLE_MS);
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [event, translateY, opacity]);

  if (!event || dismissed) return null;

  const message = resolveEventMessage(language, event);
  const textW = width * (1 - TEXT_X - TEXT_RIGHT);
  // two lines at most: pick the largest size at which the message fits them
  const size = Math.max(9, Math.min(13, (textW * 2 * 0.92) / (Math.max(1, message.length) * 0.54)));
  const tint = TONE_TINT[event.tone];

  return (
    <Animated.View
      style={[styles.banner, { opacity, transform: [{ translateY }] }]}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      <View style={{ width: "100%", aspectRatio: ART_ASPECT }}>
        <Image source={newsArt} style={styles.art} resizeMode="stretch" />
        {tint ? <View pointerEvents="none" style={[styles.tint, { backgroundColor: tint }]} /> : null}
        <View style={[styles.icon, { width: width * TEXT_X }]}>
          <Text aria-hidden style={{ fontSize: Math.max(16, width * 0.06) }}>
            📰
          </Text>
        </View>
        <View style={[styles.textBox, { left: width * TEXT_X, right: width * TEXT_RIGHT }]}>
          <Text style={[styles.text, { fontSize: size, lineHeight: size * 1.2 }]} numberOfLines={2}>
            {message}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: { marginHorizontal: SCREEN_PADDING, marginTop: 10 },
  art: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  tint: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 40 },
  icon: { position: "absolute", top: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
  textBox: { position: "absolute", top: 0, bottom: 0, justifyContent: "center" },
  text: { color: "#f0e3c8", fontFamily: FONT.medium },
});
