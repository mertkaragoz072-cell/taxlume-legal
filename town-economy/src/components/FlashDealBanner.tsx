import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import downArt from "../../assets/ui/flash/down.webp";
import upArt from "../../assets/ui/flash/up.webp";
import { Text } from "./AppText";
import { useEconomyContext } from "../economy/EconomyContext";
import { FlashDealInstance, flashDealMultiplier } from "../economy/flashDeals";
import { GOODS_BY_ID } from "../economy/goods";
import { TICK_MS } from "../economy/useEconomy";
import { FONT, SCREEN_PADDING, SPACING } from "../theme";

// The sent banners are 2107 x 283 (green + up arrow = price up, a selling
// chance; red + down arrow = price down, a buying chance). Fields are in the
// art's own pixels: the words between the crate and the divider, the
// countdown to its right.
const ART_W = 2107;
const ART_H = 283;
const TEXT = { x: 400, y: 40, w: 1190, h: 205 };
const COUNT = { x: 1640, y: 40, w: 420, h: 205 };

interface Props {
  deal: FlashDealInstance | null;
  tick: number;
}

/** A flash deal is only worth anything if it's noticed — this pins a loud,
 * pulsing banner above whatever screen the player is on for as long as one
 * is live, with a live countdown, the same "can't miss it" job
 * CrisisWarningBanner does for a scheduled disaster. */
export function FlashDealBanner({ deal, tick }: Props) {
  const { t } = useEconomyContext();
  const [bannerW, setBannerW] = useState(360);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!deal) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 450,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 450,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [deal, pulse]);

  if (!deal) return null;
  const good = GOODS_BY_ID[deal.goodId];
  const pct = Math.round(Math.abs(1 - flashDealMultiplier(deal.direction)) * 100);
  const secondsLeft = Math.max(0, Math.ceil(((deal.expiresAtTick - tick) * TICK_MS) / 1000));
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  const crash = deal.direction === "crash";
  const title = t(crash ? "flashDeal.crashTitle" : "flashDeal.spikeTitle", { good: t(good.nameKey), pct });
  const advice = t(crash ? "flashDeal.crashAdvice" : "flashDeal.spikeAdvice");
  const s = bannerW / ART_W;
  // sized from the text, not left to shrink: phone fonts run wider than a browser's
  const textW = TEXT.w * s;
  const titleSize = Math.max(9, Math.min(TEXT.h * s * 0.36, (textW * 0.96) / (title.length * 0.6)));
  const adviceSize = Math.max(8, Math.min(TEXT.h * s * 0.27, (textW * 0.96) / (advice.length * 0.52)));

  return (
    <Animated.View
      style={[styles.wrap, { opacity }]}
      onLayout={(e) => setBannerW(e.nativeEvent.layout.width)}
      accessibilityRole="alert"
    >
      <View style={{ width: "100%", aspectRatio: ART_W / ART_H }}>
        <Image source={crash ? downArt : upArt} style={styles.art} resizeMode="stretch" />
        <View style={[styles.field, { left: TEXT.x * s, top: TEXT.y * s, width: textW, height: TEXT.h * s }]}>
          <Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.advice, { fontSize: adviceSize }]} numberOfLines={1}>
            {advice}
          </Text>
        </View>
        <View
          style={[
            styles.field,
            styles.count,
            { left: COUNT.x * s, top: COUNT.y * s, width: COUNT.w * s, height: COUNT.h * s },
          ]}
        >
          <Text style={[styles.countValue, { fontSize: COUNT.h * s * 0.46 }]} numberOfLines={1}>
            {secondsLeft}
          </Text>
          <Text style={[styles.countUnit, { fontSize: Math.max(8, COUNT.h * s * 0.22) }]} numberOfLines={1}>
            {t("flashDeal.secondsUnit")}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: SCREEN_PADDING, marginBottom: SPACING.sm },
  art: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  field: { position: "absolute", justifyContent: "center" },
  count: { alignItems: "center" },
  title: {
    color: "#fff3c8",
    fontFamily: FONT.black,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  advice: { color: "#f0e2bc", fontFamily: FONT.medium, marginTop: 1 },
  countValue: { color: "#ffd75e", fontFamily: FONT.black },
  countUnit: { color: "#f0e2bc", fontFamily: FONT.medium, marginTop: -2 },
});
