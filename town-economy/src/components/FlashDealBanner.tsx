import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { FlashDealInstance, flashDealMultiplier } from "../economy/flashDeals";
import { GOODS_BY_ID } from "../economy/goods";
import { TICK_MS } from "../economy/useEconomy";
import { COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";

const ACCENT = "#ffd75e";

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

  return (
    <Animated.View style={[styles.wrap, { opacity }]}>
      <Text aria-hidden style={styles.icon}>
        ⚡
      </Text>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {t(deal.direction === "crash" ? "flashDeal.crashTitle" : "flashDeal.spikeTitle", {
            good: t(good.nameKey),
            pct,
          })}
        </Text>
        <Text style={styles.advice} numberOfLines={1}>
          {t(deal.direction === "crash" ? "flashDeal.crashAdvice" : "flashDeal.spikeAdvice")}
        </Text>
      </View>
      <View style={styles.countBox}>
        <Text style={styles.countValue}>{secondsLeft}</Text>
        <Text style={styles.countUnit}>{t("flashDeal.secondsUnit")}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: withAlpha(ACCENT, 0.55),
    backgroundColor: withAlpha(ACCENT, 0.15),
  },
  icon: { fontSize: 20, marginRight: SPACING.sm },
  body: { flex: 1 },
  title: { color: ACCENT, fontSize: TYPE.caption, fontWeight: WEIGHT.black, fontFamily: FONT.black },
  advice: { color: COLORS.textMuted, fontSize: TYPE.micro, marginTop: 1 },
  countBox: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 38,
    marginLeft: SPACING.sm,
  },
  countValue: { color: ACCENT, fontSize: TYPE.heading, fontWeight: WEIGHT.black, fontFamily: FONT.black },
  countUnit: { color: COLORS.textMuted, fontSize: 9, marginTop: -2 },
});
