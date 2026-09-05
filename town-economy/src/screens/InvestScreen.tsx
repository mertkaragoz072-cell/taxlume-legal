import React, { useState } from "react";
import { Animated, Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSoundEffects } from "../audio/useSoundEffects";
import { useEconomyContext } from "../economy/EconomyContext";
import { ASSETS, AssetId } from "../economy/assets";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { BuySellPanel } from "../components/BuySellPanel";
import { GoodCard } from "../components/GoodCard";
import { GradientFill } from "../components/GradientFill";
import { PriceChart } from "../components/PriceChart";
import { usePriceFlash } from "../hooks/usePriceFlash";
import { cardShadow, CARD_GRADIENT } from "../theme";
import { formatCompactNumber as formatNumber } from "../utils/formatNumber";

const screenWidth = Dimensions.get("window").width;
const chartWidth = Math.min(screenWidth - 48, 420);

interface Props {
  sounds: ReturnType<typeof useSoundEffects>;
}

export function InvestScreen({ sounds }: Props) {
  const { state, tradeAsset, assetsValue, t, formatCoins } = useEconomyContext();
  const formatPrice = (v: number) => formatCoins(v, 2);
  const [selectedId, setSelectedId] = useState<AssetId>(ASSETS[0].id);
  const selected = ASSETS.find((a) => a.id === selectedId)!;
  const selectedState = state.assets[selected.id];
  const { opacity: flashOpacity, flashColor } = usePriceFlash(selectedState.price);

  const change =
    selectedState.history.length > 1
      ? ((selectedState.price - selectedState.history[selectedState.history.length - 2]) /
          selectedState.history[selectedState.history.length - 2]) *
        100
      : 0;

  const unrealizedPnl = (selectedState.price - selectedState.avgCost) * selectedState.holding;

  const totalPnl = ASSETS.reduce((sum, a) => {
    const as = state.assets[a.id];
    return sum + (as.price - as.avgCost) * as.holding;
  }, 0);

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={styles.portfolioCard}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <Text style={styles.portfolioLabel}>{t("invest.portfolioLabel")}</Text>
        <View style={styles.portfolioRow}>
          <Text style={styles.portfolioValue}>{formatCoins(assetsValue)}</Text>
          {assetsValue > 0 && (
            <Text style={[styles.portfolioPnl, { color: totalPnl >= 0 ? "#3fae5c" : "#c94b4b" }]}>
              {totalPnl >= 0
                ? t("invest.unrealizedProfit", { amount: formatNumber(totalPnl, state.language) })
                : t("invest.unrealizedLoss", { amount: formatNumber(Math.abs(totalPnl), state.language) })}
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.sectionNote}>{t("invest.sectionNote")}</Text>

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
            <Text style={styles.chartSubtitle}>{t(selected.descriptionKey)}</Text>
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
        {selectedState.holding > 0 ? (
          <View style={styles.holdingRow}>
            <Text style={styles.holdingText}>
              {t("invest.holdingLabel", { qty: selectedState.holding })} ·{" "}
              {t("invest.avgCostLabel", { price: selectedState.avgCost.toFixed(2) })}
            </Text>
            <Text style={[styles.holdingPnl, { color: unrealizedPnl >= 0 ? "#3fae5c" : "#c94b4b" }]}>
              {unrealizedPnl >= 0
                ? t("invest.unrealizedProfit", { amount: formatNumber(unrealizedPnl, state.language) })
                : t("invest.unrealizedLoss", {
                    amount: formatNumber(Math.abs(unrealizedPnl), state.language),
                  })}
            </Text>
          </View>
        ) : (
          <Text style={styles.noHolding}>{t("invest.noHolding")}</Text>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assetsRow}>
        {ASSETS.map((a) => (
          <GoodCard
            key={a.id}
            good={a}
            state={state.assets[a.id]}
            selected={a.id === selectedId}
            onPress={() => setSelectedId(a.id)}
          />
        ))}
      </ScrollView>

      <BuySellPanel
        good={selected}
        state={selectedState}
        cash={state.cash}
        onTrade={(side, qty) => {
          tradeAsset(selected.id, side, qty);
          if (side === "buy") sounds.playBuy();
          else sounds.playSell();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  portfolioCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    overflow: "hidden",
    ...cardShadow,
  },
  portfolioLabel: { color: "#a0917a", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  portfolioRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  portfolioValue: { color: "#e8c777", fontSize: 20, fontWeight: "800" },
  portfolioPnl: { fontSize: 13, fontWeight: "700" },
  sectionNote: { color: "#a0917a", fontSize: 12, marginBottom: 16, lineHeight: 17 },
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
  chartSubtitle: { color: "#a0917a", fontSize: 12, marginTop: 2, maxWidth: 200 },
  chartPrice: { color: "#e8c777", fontSize: 18, fontWeight: "800" },
  chartChange: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  holdingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#3a2d1e",
  },
  holdingText: { color: "#a0917a", fontSize: 11, flex: 1 },
  holdingPnl: { fontSize: 12, fontWeight: "700" },
  noHolding: {
    color: "#a0917a",
    fontSize: 11,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#3a2d1e",
  },
  assetsRow: { marginBottom: 18 },
});
