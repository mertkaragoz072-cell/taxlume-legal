import React from "react";
import { Animated, Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSoundEffects } from "../audio/useSoundEffects";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS } from "../economy/goods";
import { SEASONAL_EVENT_TEMPLATES_BY_ID } from "../economy/seasonalEvents";
import { gameDayFromTick, isGoodUnlocked } from "../economy/useEconomy";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { BuySellPanel } from "../components/BuySellPanel";
import { GoodCard } from "../components/GoodCard";
import { GradientFill } from "../components/GradientFill";
import { PriceChart } from "../components/PriceChart";
import { SectionLabel } from "../components/SectionLabel";
import { usePriceFlash } from "../hooks/usePriceFlash";
import {
  cardShadow,
  CARD_GRADIENT,
  COLORS,
  FONT,
  GOLD_GRADIENT,
  RADIUS,
  SPACING,
  TYPE,
  WEIGHT,
  withAlpha,
} from "../theme";
import { formatCompactNumber as formatNumber } from "../utils/formatNumber";

const screenWidth = Dimensions.get("window").width;
const chartWidth = Math.min(screenWidth - 48, 420);
const formatPrice = (v: number) => `${v.toFixed(2)} 🪙`;

interface Props {
  sounds: ReturnType<typeof useSoundEffects>;
}

export function MarketScreen({ sounds }: Props) {
  const { state, selectGood, trade, t, marketSpreadPct } = useEconomyContext();
  const unlockedGoods = GOODS.filter((g) => isGoodUnlocked(g, state));
  const lockedGoods = GOODS.filter((g) => !isGoodUnlocked(g, state));
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

  const unrealizedPnl = (selectedState.price - selectedState.avgCost) * selectedState.holding;

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
          interactive
        />
        {selectedState.holding > 0 && (
          <View style={styles.holdingRow}>
            <Text style={styles.holdingText}>
              {t("market.holdingLabel", { qty: selectedState.holding })} ·{" "}
              {t("market.avgCostLabel", { price: selectedState.avgCost.toFixed(2) })}
            </Text>
            <Text style={[styles.holdingPnl, { color: unrealizedPnl >= 0 ? "#3fae5c" : "#c94b4b" }]}>
              {unrealizedPnl >= 0
                ? t("market.unrealizedProfit", { amount: formatNumber(unrealizedPnl, state.language) })
                : t("market.unrealizedLoss", { amount: formatNumber(Math.abs(unrealizedPnl), state.language) })}
            </Text>
          </View>
        )}
      </View>

      <SectionLabel text={t("market.sectionLabel")} color={selected.color} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.goodsRow}>
        {unlockedGoods.map((g) => (
          <GoodCard
            key={g.id}
            good={g}
            state={state.goods[g.id]}
            selected={g.id === state.selectedGood}
            onPress={() => selectGood(g.id)}
          />
        ))}
      </ScrollView>

      {lockedGoods.length > 0 && (
        <>
          <SectionLabel text={t("market.comingSoonLabel")} color="#a0917a" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.goodsRow}>
            {lockedGoods.map((g) => {
              const daysLeft = Math.max(1, (g.unlockDay ?? 1) - gameDayFromTick(state.tick));
              return (
                <View key={g.id} style={styles.lockedCard}>
                  <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
                  <Text style={styles.lockedIcon}>🔒 {g.icon}</Text>
                  <Text style={styles.lockedName}>{t(g.nameKey)}</Text>
                  <Text style={styles.lockedDay}>{t("market.unlocksInDays", { days: daysLeft })}</Text>
                </View>
              );
            })}
          </ScrollView>
        </>
      )}

      <BuySellPanel
        good={selected}
        state={selectedState}
        cash={state.cash}
        spreadPct={marketSpreadPct}
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
  body: { padding: SPACING.lg, paddingBottom: 40 },
  seasonalCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.feature,
    padding: SPACING.md + 2,
    marginBottom: SPACING.lg,
    overflow: "hidden",
    ...cardShadow,
  },
  seasonalIcon: { fontSize: 28, marginRight: SPACING.md },
  seasonalTitle: { color: COLORS.onLight, fontWeight: WEIGHT.black, fontFamily: FONT.black, fontSize: TYPE.body },
  seasonalDesc: { color: "#2a2016", fontSize: TYPE.caption, marginTop: 2 },
  seasonalFooterRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  seasonalBonus: { color: COLORS.onLight, fontWeight: WEIGHT.black, fontFamily: FONT.black, fontSize: TYPE.label },
  seasonalTicksLeft: { color: "#2a2016", fontSize: TYPE.caption, fontWeight: WEIGHT.bold, fontFamily: FONT.bold },
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
  chartSubtitle: { color: COLORS.textMuted, fontSize: TYPE.label, marginTop: 2 },
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
  goodsRow: { marginBottom: SPACING.lg + 2 },
  lockedCard: {
    width: 108,
    borderRadius: RADIUS.card,
    padding: SPACING.sm + 2,
    paddingTop: SPACING.md + 1,
    marginRight: SPACING.sm + 2,
    alignItems: "center",
    overflow: "hidden",
    opacity: 0.6,
    ...cardShadow,
  },
  lockedIcon: { fontSize: TYPE.heading },
  lockedName: { color: COLORS.textPrimary, fontSize: TYPE.label, fontWeight: WEIGHT.medium, fontFamily: FONT.medium, marginTop: 6 },
  lockedDay: { color: COLORS.textMuted, fontSize: TYPE.micro, marginTop: SPACING.xs, textAlign: "center" },
  gameOverBox: {
    marginTop: SPACING.lg + 2,
    backgroundColor: "#3a1f1a",
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    alignItems: "center",
  },
  gameOverText: { color: "#f0b7a8", fontWeight: WEIGHT.black, fontFamily: FONT.black, fontSize: TYPE.body, textAlign: "center" },
  gameOverSub: { color: "#c9a893", fontSize: TYPE.label, marginTop: 6, textAlign: "center" },
});
