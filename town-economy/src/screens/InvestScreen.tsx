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
import { cardShadow, CARD_GRADIENT, COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";
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
            <Text style={[styles.portfolioPnl, { color: totalPnl >= 0 ? COLORS.positive : COLORS.negative }]}>
              {totalPnl >= 0
                ? t("invest.unrealizedProfit", { amount: formatNumber(totalPnl, state.language) })
                : t("invest.unrealizedLoss", { amount: formatNumber(Math.abs(totalPnl), state.language) })}
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.sectionNote}>{t("invest.sectionNote")}</Text>

      <View style={[styles.chartCard, { borderColor: withAlpha(selected.color, 0.4) }]}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(selected.color, 0.1) }]}
        />
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
            <Text style={[styles.chartChange, { color: change >= 0 ? COLORS.positive : COLORS.negative }]}>
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
          interactive
        />
        {selectedState.holding > 0 ? (
          <View style={styles.holdingRow}>
            <Text style={styles.holdingText}>
              {t("invest.holdingLabel", { qty: selectedState.holding })} ·{" "}
              {t("invest.avgCostLabel", { price: selectedState.avgCost.toFixed(2) })}
            </Text>
            <Text style={[styles.holdingPnl, { color: unrealizedPnl >= 0 ? COLORS.positive : COLORS.negative }]}>
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
  body: { padding: SPACING.lg, paddingBottom: 40 },
  portfolioCard: {
    borderRadius: RADIUS.feature,
    padding: SPACING.md + 2,
    marginBottom: SPACING.md,
    overflow: "hidden",
    ...cardShadow,
  },
  portfolioLabel: { color: COLORS.textMuted, fontSize: TYPE.caption, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, letterSpacing: 1 },
  portfolioRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SPACING.xs },
  portfolioValue: { color: COLORS.accent, fontSize: TYPE.display, fontWeight: WEIGHT.black, fontFamily: FONT.black },
  portfolioPnl: { fontSize: TYPE.body, fontWeight: WEIGHT.bold, fontFamily: FONT.bold },
  sectionNote: { color: COLORS.textMuted, fontSize: TYPE.label, marginBottom: SPACING.lg, lineHeight: 17 },
  chartCard: {
    borderRadius: RADIUS.feature,
    borderWidth: 1.5,
    padding: SPACING.lg,
    marginBottom: SPACING.lg + 2,
    overflow: "hidden",
    ...cardShadow,
  },
  chartHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  chartTitle: { color: COLORS.textPrimary, fontSize: TYPE.title, fontWeight: WEIGHT.black, fontFamily: FONT.black },
  chartSubtitle: { color: COLORS.textMuted, fontSize: TYPE.label, marginTop: 2, maxWidth: 200 },
  chartPrice: { color: COLORS.accent, fontSize: TYPE.heading, fontWeight: WEIGHT.black, fontFamily: FONT.black },
  chartChange: { fontSize: TYPE.body, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, marginTop: 2 },
  holdingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.sm + 2,
    paddingTop: SPACING.sm + 2,
    borderTopWidth: 1,
    borderTopColor: "#3a2d1e",
  },
  holdingText: { color: COLORS.textMuted, fontSize: TYPE.caption, flex: 1 },
  holdingPnl: { fontSize: TYPE.label, fontWeight: WEIGHT.bold, fontFamily: FONT.bold },
  noHolding: {
    color: COLORS.textMuted,
    fontSize: TYPE.caption,
    marginTop: SPACING.sm + 2,
    paddingTop: SPACING.sm + 2,
    borderTopWidth: 1,
    borderTopColor: "#3a2d1e",
  },
  assetsRow: { marginBottom: SPACING.lg + 2 },
});
