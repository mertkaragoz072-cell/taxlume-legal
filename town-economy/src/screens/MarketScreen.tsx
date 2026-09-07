import React, { useState } from "react";
import { Animated, Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSoundEffects } from "../audio/useSoundEffects";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS, GOODS_BY_ID } from "../economy/goods";
import { SEASONAL_EVENT_TEMPLATES_BY_ID } from "../economy/seasonalEvents";
import {
  AUTO_TRADE_MAX_RULES,
  AUTO_TRADE_TRIGGER_PCT_STEPS,
  gameDayFromTick,
  isGoodUnlocked,
  TICKS_PER_GAME_DAY,
} from "../economy/useEconomy";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { BuySellPanel } from "../components/BuySellPanel";
import { GoodCard } from "../components/GoodCard";
import { GradientFill } from "../components/GradientFill";
import { PriceChart } from "../components/PriceChart";
import { ScalePressable } from "../components/ScalePressable";
import { SectionLabel } from "../components/SectionLabel";
import { usePriceFlash } from "../hooks/usePriceFlash";
import {
  cardShadow,
  CARD_GRADIENT,
  COLORS,
  FONT,
  GOLD_GRADIENT,
  GREEN_GRADIENT,
  RADIUS,
  RED_GRADIENT,
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
  const { state, selectGood, trade, addAutoTradeRule, removeAutoTradeRule, toggleAutoTradeRule, t, marketSpreadPct } =
    useEconomyContext();
  const [autoSide, setAutoSide] = useState<"buy" | "sell">("buy");
  const [autoPct, setAutoPct] = useState(AUTO_TRADE_TRIGGER_PCT_STEPS[0]);
  const [autoQty, setAutoQty] = useState<1 | 5 | 10>(1);
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

  // A rough "market mood" reading — the average of every unlocked good's
  // latest tick-over-tick move. Purely a derived display value (no new
  // state), meant as a quick at-a-glance cue for whether it's broadly a
  // buyer's or seller's moment, not a precise signal.
  const sentiment = (() => {
    const changes = unlockedGoods.map((g) => {
      const h = state.goods[g.id].history;
      if (h.length < 2) return 0;
      const prev = h[h.length - 2];
      return prev !== 0 ? (h[h.length - 1] - prev) / prev : 0;
    });
    const avg = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
    if (avg > 0.004) return { key: "bullish", icon: "🐂", color: "#3fae5c" };
    if (avg < -0.004) return { key: "bearish", icon: "🐻", color: "#c94b4b" };
    return { key: "neutral", icon: "😐", color: COLORS.textMuted };
  })();

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={styles.sentimentRow}>
        <Text style={[styles.sentimentText, { color: sentiment.color }]}>
          {sentiment.icon} {t(`market.sentiment.${sentiment.key}`)}
        </Text>
      </View>

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
                  days: Math.max(
                    0,
                    Math.ceil((state.activeSeasonalEvent.expiresAtTick - state.tick) / TICKS_PER_GAME_DAY)
                  ),
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

      <SectionLabel text={t("market.autoTrade.sectionLabel")} color={selected.color} />
      <Text style={styles.autoTradeDesc}>{t("market.autoTrade.description")}</Text>
      <View style={styles.autoTradePanel}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <View style={styles.sideToggle}>
          <ScalePressable
            style={[styles.sideBtn, autoSide === "buy" && styles.sideBtnActiveBuy]}
            onPress={() => setAutoSide("buy")}
          >
            <Text style={[styles.sideBtnText, autoSide === "buy" && styles.sideBtnTextActive]}>
              {t("market.buyShort")}
            </Text>
          </ScalePressable>
          <ScalePressable
            style={[styles.sideBtn, autoSide === "sell" && styles.sideBtnActiveSell]}
            onPress={() => setAutoSide("sell")}
          >
            <Text style={[styles.sideBtnText, autoSide === "sell" && styles.sideBtnTextActive]}>
              {t("market.sellShort")}
            </Text>
          </ScalePressable>
        </View>

        <Text style={styles.autoTradeSubLabel}>
          {autoSide === "buy" ? t("market.autoTrade.triggerBelowLabel") : t("market.autoTrade.triggerAboveLabel")}
        </Text>
        <View style={styles.qtyRow}>
          {AUTO_TRADE_TRIGGER_PCT_STEPS.map((pct) => (
            <ScalePressable
              key={pct}
              style={[styles.qtyBtn, autoPct === pct && { borderColor: selected.color, borderWidth: 2 }]}
              onPress={() => setAutoPct(pct)}
            >
              <Text style={styles.qtyBtnText}>%{Math.round(pct * 100)}</Text>
            </ScalePressable>
          ))}
        </View>

        <Text style={styles.autoTradeSubLabel}>{t("market.autoTrade.qtyLabel")}</Text>
        <View style={styles.qtyRow}>
          {([1, 5, 10] as const).map((q) => (
            <ScalePressable
              key={q}
              style={[styles.qtyBtn, autoQty === q && { borderColor: selected.color, borderWidth: 2 }]}
              onPress={() => setAutoQty(q)}
            >
              <Text style={styles.qtyBtnText}>{q}</Text>
            </ScalePressable>
          ))}
        </View>

        {(() => {
          const triggerPrice =
            autoSide === "buy" ? selectedState.price * (1 - autoPct) : selectedState.price * (1 + autoPct);
          const disabled = state.autoTradeRules.length >= AUTO_TRADE_MAX_RULES || !isGoodUnlocked(selected, state);
          return (
            <>
              <Text style={styles.autoTradePreview}>
                {t("market.autoTrade.preview", { qty: autoQty, price: triggerPrice.toFixed(2) })}
              </Text>
              <Text style={styles.autoTradeMaxNote}>
                {t("market.autoTrade.maxActiveNote", { max: AUTO_TRADE_MAX_RULES })}
              </Text>
              <ScalePressable
                disabled={disabled}
                onPress={() => addAutoTradeRule(selected.id, autoSide, autoPct, autoQty)}
                style={[styles.confirmBtn, disabled && styles.confirmBtnDisabled]}
                scaleTo={0.97}
              >
                <GradientFill colors={autoSide === "buy" ? GREEN_GRADIENT : RED_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
                <Text style={styles.confirmBtnText}>{t("market.autoTrade.addBtn")}</Text>
              </ScalePressable>
            </>
          );
        })()}
      </View>

      <SectionLabel text={t("market.autoTrade.activeSectionLabel")} color={COLORS.accent} />
      {state.autoTradeRules.length === 0 && (
        <Text style={styles.autoTradeEmptyText}>{t("market.autoTrade.noRules")}</Text>
      )}
      {state.autoTradeRules.map((rule) => {
        const ruleGood = GOODS_BY_ID[rule.goodId];
        return (
          <View key={rule.id} style={styles.autoTradeRow}>
            <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
            <View style={[styles.autoTradeAccent, { backgroundColor: ruleGood.color }]} />
            <Text style={styles.autoTradeRowIcon}>{ruleGood.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.autoTradeRowTitle}>
                {rule.side === "buy" ? "📉" : "📈"} {t(ruleGood.nameKey)}
              </Text>
              <Text style={styles.autoTradeRowSub}>
                {t(
                  rule.side === "buy" ? "market.autoTrade.ruleRowBuy" : "market.autoTrade.ruleRowSell",
                  { qty: rule.qty, price: rule.triggerPrice.toFixed(2) }
                )}
              </Text>
            </View>
            <ScalePressable
              style={[styles.autoTradeToggleBtn, rule.enabled && styles.autoTradeToggleBtnActive]}
              onPress={() => toggleAutoTradeRule(rule.id)}
            >
              <Text style={styles.autoTradeToggleBtnText}>
                {rule.enabled ? t("market.autoTrade.on") : t("market.autoTrade.off")}
              </Text>
            </ScalePressable>
            <ScalePressable style={styles.autoTradeDeleteBtn} onPress={() => removeAutoTradeRule(rule.id)}>
              <Text style={styles.autoTradeDeleteBtnText}>✕</Text>
            </ScalePressable>
          </View>
        );
      })}

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
  sentimentRow: { alignItems: "center", marginBottom: SPACING.md },
  sentimentText: { fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.label },
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
  autoTradeDesc: { color: COLORS.textMuted, fontSize: TYPE.label, marginBottom: SPACING.md, lineHeight: 17 },
  autoTradePanel: {
    borderRadius: RADIUS.card,
    padding: SPACING.md + 2,
    marginBottom: SPACING.lg + 2,
    overflow: "hidden",
    ...cardShadow,
  },
  sideToggle: {
    flexDirection: "row",
    backgroundColor: "#1a1410",
    borderRadius: RADIUS.chip,
    padding: 3,
    marginBottom: SPACING.md - 2,
  },
  sideBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.chip - 2, alignItems: "center" },
  sideBtnActiveBuy: { backgroundColor: COLORS.positive },
  sideBtnActiveSell: { backgroundColor: COLORS.negative },
  sideBtnText: { color: COLORS.textMuted, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.body },
  sideBtnTextActive: { color: "#fff" },
  autoTradeSubLabel: { color: COLORS.textMuted, fontSize: TYPE.label, marginBottom: SPACING.xs },
  qtyRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md - 2 },
  qtyBtn: {
    flex: 1,
    backgroundColor: "#1a1410",
    borderRadius: RADIUS.chip,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    marginRight: SPACING.sm,
  },
  qtyBtnText: { color: COLORS.textPrimary, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.label },
  autoTradePreview: { color: COLORS.textMuted, fontSize: TYPE.caption, flex: 1, marginBottom: 2 },
  autoTradeMaxNote: { color: COLORS.textMuted, fontSize: TYPE.micro, marginBottom: SPACING.sm + 2 },
  confirmBtn: { borderRadius: RADIUS.card, paddingVertical: SPACING.md, alignItems: "center", overflow: "hidden" },
  confirmBtnDisabled: { opacity: 0.35 },
  confirmBtnText: { color: "#fff", fontWeight: WEIGHT.black, fontFamily: FONT.black, fontSize: TYPE.body + 1 },
  autoTradeEmptyText: { color: COLORS.textMuted, fontSize: TYPE.label, marginBottom: SPACING.sm + 2 },
  autoTradeRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    paddingLeft: SPACING.md + 3,
    marginBottom: SPACING.sm + 2,
    overflow: "hidden",
  },
  autoTradeAccent: { position: "absolute", top: 0, bottom: 0, left: 0, width: 3 },
  autoTradeRowIcon: { fontSize: 22, marginRight: SPACING.sm + 2 },
  autoTradeRowTitle: { color: COLORS.textPrimary, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.label },
  autoTradeRowSub: { color: COLORS.textMuted, fontSize: TYPE.caption, marginTop: 1 },
  autoTradeToggleBtn: {
    borderRadius: RADIUS.chip,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm + 2,
    backgroundColor: "#1a1410",
    marginRight: SPACING.sm,
  },
  autoTradeToggleBtnActive: { backgroundColor: COLORS.positive },
  autoTradeToggleBtnText: { color: "#fff", fontSize: TYPE.micro, fontWeight: WEIGHT.bold, fontFamily: FONT.bold },
  autoTradeDeleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#3a1f1a",
    alignItems: "center",
    justifyContent: "center",
  },
  autoTradeDeleteBtnText: { color: "#f0b7a8", fontSize: TYPE.label, fontWeight: WEIGHT.bold, fontFamily: FONT.bold },
});
