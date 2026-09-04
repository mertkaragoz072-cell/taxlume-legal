import React from "react";
import { Animated, Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSoundEffects } from "../audio/useSoundEffects";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS } from "../economy/goods";
import { SEASONAL_EVENT_TEMPLATES_BY_ID } from "../economy/seasonalEvents";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { BuySellPanel } from "../components/BuySellPanel";
import { GoodCard } from "../components/GoodCard";
import { GradientFill } from "../components/GradientFill";
import { PriceChart } from "../components/PriceChart";
import { usePriceFlash } from "../hooks/usePriceFlash";
import { cardShadow, CARD_GRADIENT, GOLD_GRADIENT } from "../theme";

const screenWidth = Dimensions.get("window").width;
const chartWidth = Math.min(screenWidth - 48, 420);
const formatPrice = (v: number) => `${v.toFixed(2)} 🪙`;

interface Props {
  sounds: ReturnType<typeof useSoundEffects>;
}

export function MarketScreen({ sounds }: Props) {
  const { state, selectGood, trade, t } = useEconomyContext();
  const selected = GOODS.find((g) => g.id === state.selectedGood)!;
  const selectedState = state.goods[selected.id];
  const { opacity: flashOpacity, flashColor } = usePriceFlash(selectedState.price);
  const seasonalTemplate = state.activeSeasonalEvent
    ? SEASONAL_EVENT_TEMPLATES_BY_ID[state.activeSeasonalEvent.templateId]
    : null;

  const change =
    selectedState.history.length > 1
      ? ((selectedState.price - selectedState.history[selectedState.history.length - 2]) /
          selectedState.history[selectedState.history.length - 2]) *
        100
      : 0;

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      {state.activeSeasonalEvent && seasonalTemplate && (
        <View style={styles.seasonalCard}>
          <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          <Text style={styles.seasonalIcon}>{seasonalTemplate.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.seasonalTitle}>{t(seasonalTemplate.titleKey)}</Text>
            <Text style={styles.seasonalDesc}>{t(seasonalTemplate.descriptionKey)}</Text>
            <View style={styles.seasonalFooterRow}>
              <Text style={styles.seasonalBonus}>
                {t("market.seasonalEventBonus", {
                  pct: Math.round((seasonalTemplate.priceMultiplier - 1) * 100),
                })}
              </Text>
              <Text style={styles.seasonalTicksLeft}>
                {t("market.seasonalEventTicksLeft", {
                  ticks: Math.max(0, state.activeSeasonalEvent.expiresAtTick - state.tick),
                })}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.chartCard}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: flashColor, opacity: flashOpacity }]}
        />
        <View style={styles.chartHeaderRow}>
          <View>
            <Text style={styles.chartTitle}>
              {selected.icon} {t(selected.nameKey)}
            </Text>
            <Text style={styles.chartSubtitle}>{t(selected.producerKey)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <AnimatedNumber value={selectedState.price} formatter={formatPrice} style={styles.chartPrice} />
            <Text style={[styles.chartChange, { color: change >= 0 ? "#3fae5c" : "#c94b4b" }]}>
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)}%
            </Text>
          </View>
        </View>
        <PriceChart
          history={selectedState.history}
          color={selected.color}
          width={chartWidth}
          height={140}
          strokeWidth={3}
        />
      </View>

      <Text style={styles.sectionLabel}>{t("market.sectionLabel")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.goodsRow}>
        {GOODS.map((g) => (
          <GoodCard
            key={g.id}
            good={g}
            state={state.goods[g.id]}
            selected={g.id === state.selectedGood}
            onPress={() => selectGood(g.id)}
          />
        ))}
      </ScrollView>

      <BuySellPanel
        good={selected}
        state={selectedState}
        cash={state.cash}
        onTrade={(side, qty) => {
          trade(selected.id, side, qty);
          if (side === "buy") sounds.playBuy();
          else sounds.playSell();
        }}
      />

      {state.gameOver && (
        <View style={styles.gameOverBox}>
          <Text style={styles.gameOverText}>{t("market.gameOverTitle")}</Text>
          <Text style={styles.gameOverSub}>{t("market.gameOverSubtitle")}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  seasonalCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    overflow: "hidden",
    ...cardShadow,
  },
  seasonalIcon: { fontSize: 28, marginRight: 12 },
  seasonalTitle: { color: "#1a1410", fontWeight: "800", fontSize: 14 },
  seasonalDesc: { color: "#2a2016", fontSize: 11, marginTop: 2 },
  seasonalFooterRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  seasonalBonus: { color: "#1a1410", fontWeight: "800", fontSize: 12 },
  seasonalTicksLeft: { color: "#2a2016", fontSize: 11, fontWeight: "700" },
  chartCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    overflow: "hidden",
    ...cardShadow,
  },
  chartHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  chartTitle: { color: "#f0e3c8", fontSize: 17, fontWeight: "800" },
  chartSubtitle: { color: "#a0917a", fontSize: 12, marginTop: 2 },
  chartPrice: { color: "#e8c777", fontSize: 18, fontWeight: "800" },
  chartChange: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  sectionLabel: {
    color: "#a0917a",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  goodsRow: { marginBottom: 18 },
  gameOverBox: {
    marginTop: 18,
    backgroundColor: "#3a1f1a",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  gameOverText: { color: "#f0b7a8", fontWeight: "800", fontSize: 14, textAlign: "center" },
  gameOverSub: { color: "#c9a893", fontSize: 12, marginTop: 6, textAlign: "center" },
});
