import React, { useEffect, useRef, useState } from "react";
import { currentMentorStep } from "../economy/mentor";
import { SpotlightTarget } from "../components/Spotlight";
import { Animated, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSoundEffects } from "../audio/useSoundEffects";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS, GOODS_BY_ID } from "../economy/goods";
import { isGlutted, isHot } from "../economy/demandCycles";
import { SEASONAL_EVENT_TEMPLATES_BY_ID } from "../economy/seasonalEvents";
import {
  AUTO_TRADE_TRIGGER_PCT_STEPS,
  effectiveAutoTradeMaxRules,
  isGoodUnlocked,
  TICKS_PER_GAME_DAY,
} from "../economy/useEconomy";
import { townRankIcon, townRankNameKey } from "../economy/townRanks";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { BuySellPanel } from "../components/BuySellPanel";
import { DemandForecastCard } from "../components/DemandForecastCard";
import { SeasonStrip } from "../components/SeasonStrip";
import { GoodCard } from "../components/GoodCard";
import { GradientFill } from "../components/GradientFill";
import { PriceChart } from "../components/PriceChart";
import { ProductionChainLine } from "../components/ProductionChainLine";
import { ScalePressable } from "../components/ScalePressable";
import { SectionLabel } from "../components/SectionLabel";
import { usePriceFlash } from "../hooks/usePriceFlash";
import {
  cardShadow,
  CARD_GRADIENT,
  COLORS,
  CONTENT_MAX_WIDTH,
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
import { formatCompactNumber as formatNumber, formatPercent } from "../utils/formatNumber";

const formatPrice = (v: number) => `${v.toFixed(2)} 🪙`;

interface Props {
  sounds: ReturnType<typeof useSoundEffects>;
}

export function MarketScreen({ sounds }: Props) {
  const scroller = useRef<ScrollView>(null);
  const panelY = useRef(0);
  const {
    state,
    selectGood,
    trade,
    addAutoTradeRule,
    removeAutoTradeRule,
    toggleAutoTradeRule,
    t,
    tPlural,
    marketSpreadPct,
  } = useEconomyContext();
  // A hook, not Dimensions.get() read once at module scope — on native,
  // that snapshot can be taken before the bridge has reported the real
  // window size, and being a module-level const it then never corrects
  // itself, leaving the chart permanently sized off a wrong (sometimes
  // zero) width. useWindowDimensions re-renders once the real size lands.
  // Clamped against CONTENT_MAX_WIDTH (not a raw screenWidth cap) so the
  // chart fills its card up to however wide the content column actually
  // gets — on a phone that's just screenWidth, same as before; on an iPad
  // it used to cap at a phone-sized 420 and leave the rest of a much wider
  // card blank.
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = Math.min(screenWidth, CONTENT_MAX_WIDTH) - 48;
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
  const seasonalDaysLeft = state.activeSeasonalEvent
    ? Math.max(0, Math.ceil((state.activeSeasonalEvent.expiresAtTick - state.tick) / TICKS_PER_GAME_DAY))
    : 0;

  const change =
    selectedState.history.length > 1
      ? ((selectedState.price - selectedState.history[selectedState.history.length - 2]) /
          selectedState.history[selectedState.history.length - 2]) *
        100
      : 0;

  const unrealizedPnl = (selectedState.price - selectedState.avgCost) * selectedState.holding;

  // The market's vitals at a glance — average mood plus whichever good
  // moved the most in either direction this tick. Purely a derived display
  // value (no new state); it replaces what used to be the town square
  // image at the top of this screen, which told you nothing about the
  // market itself and only ever lived here because it had nowhere else to
  // be before the game had a dedicated Town tab.
  const marketPulse = (() => {
    const movers = unlockedGoods.map((g) => {
      const h = state.goods[g.id].history;
      const prev = h.length > 1 ? h[h.length - 2] : 0;
      const fraction = h.length > 1 && prev !== 0 ? (h[h.length - 1] - prev) / prev : 0;
      return { good: g, fraction };
    });
    const avg = movers.length > 0 ? movers.reduce((a, m) => a + m.fraction, 0) / movers.length : 0;
    const sentiment =
      avg > 0.004
        ? { key: "bullish", icon: "🐂", color: "#3fae5c" }
        : avg < -0.004
          ? { key: "bearish", icon: "🐻", color: "#c94b4b" }
          : { key: "neutral", icon: "😐", color: COLORS.textMuted };
    const topGainer = movers.length > 0 ? movers.reduce((a, m) => (m.fraction > a.fraction ? m : a)) : null;
    const topLoser = movers.length > 0 ? movers.reduce((a, m) => (m.fraction < a.fraction ? m : a)) : null;
    return { sentiment, topGainer, topLoser };
  })();

  // The buy button lives below the fold. When the guided tour reaches the
  // beat that asks the player to press it, dimming the screen around a
  // control they cannot see would be a puzzle, not a lesson — so the list
  // brings it into view first.
  useEffect(() => {
    if (currentMentorStep(state.mentorStep)?.spotlight !== "buy") return;
    const timer = setTimeout(
      () => scroller.current?.scrollTo({ y: Math.max(0, panelY.current - 120), animated: true }),
      350
    );
    return () => clearTimeout(timer);
  }, [state.mentorStep]);

  return (
    <ScrollView ref={scroller} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      {/* Market Pulse: the town square image used to open this screen, but
          it said nothing about the market and only lived here because the
          game had no Town tab yet to send it to. This says something —
          overall mood plus whoever moved the most, in either direction,
          this tick — and it updates every tick instead of sitting still. */}
      <View style={styles.pulseCard}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <View style={styles.pulseHeaderRow}>
          <Text style={styles.pulseTitle}>{t("market.pulse.title")}</Text>
          <Text style={[styles.pulseSentiment, { color: marketPulse.sentiment.color }]}>
            {marketPulse.sentiment.icon} {t(`market.sentiment.${marketPulse.sentiment.key}`)}
          </Text>
        </View>
        {marketPulse.topGainer && marketPulse.topLoser && (
          <View style={styles.pulseMoversRow}>
            <View style={styles.pulseMover}>
              <Text style={styles.pulseMoverLabel}>{t("market.pulse.topGainer")}</Text>
              <Text style={styles.pulseMoverGood} numberOfLines={1}>
                {marketPulse.topGainer.good.icon} {t(marketPulse.topGainer.good.nameKey)}
              </Text>
              <Text style={[styles.pulseMoverPct, { color: COLORS.positive }]}>
                {marketPulse.topGainer.fraction >= 0 ? "+" : ""}
                {formatPercent(marketPulse.topGainer.fraction * 100, state.language, 1)}
              </Text>
            </View>
            <View style={styles.pulseMoverDivider} />
            <View style={styles.pulseMover}>
              <Text style={styles.pulseMoverLabel}>{t("market.pulse.topLoser")}</Text>
              <Text style={styles.pulseMoverGood} numberOfLines={1}>
                {marketPulse.topLoser.good.icon} {t(marketPulse.topLoser.good.nameKey)}
              </Text>
              <Text style={[styles.pulseMoverPct, { color: COLORS.negative }]}>
                {formatPercent(marketPulse.topLoser.fraction * 100, state.language, 1)}
              </Text>
            </View>
          </View>
        )}
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
                {tPlural("market.seasonalEventTicksLeft", seasonalDaysLeft, {
                  days: seasonalDaysLeft,
                })}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* The selected good's own detail chart, at the top where a player
          lands first — the "Kasaba Piyasası" grid it was picked from sits
          directly below it (no season/demand cards in between), so picking
          a different good from the grid and seeing its chart update feels
          like one motion rather than a scroll away. */}
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
              {formatPercent(change, state.language, 2)}
            </Text>
          </View>
        </View>

        {/* Under the good's own name, because that is where a player is
            standing when they decide whether to buy it: a scarce input here
            means this good's price is about to climb. */}
        <ProductionChainLine good={selected} />

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
                : t("market.unrealizedLoss", {
                    amount: formatNumber(Math.abs(unrealizedPnl), state.language),
                  })}
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
            badge={
              isHot(state.demandCycle, g.id)
                ? { text: t("market.demand.hotBadge"), color: "#f0a04b" }
                : isGlutted(state.demandCycle, g.id)
                  ? { text: t("market.demand.glutBadge"), color: "#6fb8f2" }
                  : undefined
            }
          />
        ))}
      </ScrollView>

      {lockedGoods.length > 0 && (
        <>
          <SectionLabel text={t("market.comingSoonLabel")} color="#a0917a" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.goodsRow}>
            {lockedGoods.map((g) => (
              <View key={g.id} style={[styles.lockedCard, { borderColor: withAlpha(g.color, 0.3) }]}>
                <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
                <View style={[styles.lockedAccentStripe, { backgroundColor: withAlpha(g.color, 0.5) }]} />
                <View style={styles.lockedBadge}>
                  <Text style={styles.lockedBadgeText}>🔒</Text>
                </View>
                {/* The good's own icon, full size and in its own color
                    rather than greyed out — this is a preview of a reward,
                    not a dead slot, so it should look like one. */}
                <Text style={styles.lockedIcon}>{g.icon}</Text>
                <Text style={styles.lockedName} numberOfLines={1}>
                  {t(g.nameKey)}
                </Text>
                <View style={[styles.lockedRankChip, { borderColor: withAlpha(g.color, 0.4) }]}>
                  <Text style={styles.lockedRankIcon}>{townRankIcon(g.unlockRank ?? 0)}</Text>
                  <Text style={styles.lockedRankText} numberOfLines={1}>
                    {t(townRankNameKey(g.unlockRank ?? 0))}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {/* The year above the week: the season sets the backdrop the demand
          cycle plays out against, and reading them together is what turns a
          reaction into a plan. Outside the conditional below because the
          season is always running, cycle or no cycle. */}
      <SeasonStrip />

      {state.demandCycle && (
        <DemandForecastCard cycle={state.demandCycle} next={state.nextDemandCycle} tick={state.tick} />
      )}

      <SpotlightTarget id="buy">
        <View onLayout={(e) => (panelY.current = e.nativeEvent.layout.y)}>
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
        </View>
      </SpotlightTarget>

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
          {autoSide === "buy"
            ? t("market.autoTrade.triggerBelowLabel")
            : t("market.autoTrade.triggerAboveLabel")}
        </Text>
        <View style={styles.qtyRow}>
          {AUTO_TRADE_TRIGGER_PCT_STEPS.map((pct) => (
            <ScalePressable
              key={pct}
              style={[styles.qtyBtn, autoPct === pct && { borderColor: selected.color, borderWidth: 2 }]}
              onPress={() => setAutoPct(pct)}
            >
              <Text style={styles.qtyBtnText}>{formatPercent(pct * 100, state.language)}</Text>
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
          const maxRules = effectiveAutoTradeMaxRules(state);
          const disabled = state.autoTradeRules.length >= maxRules || !isGoodUnlocked(selected, state);
          return (
            <>
              <Text style={styles.autoTradePreview}>
                {t("market.autoTrade.preview", { qty: autoQty, price: triggerPrice.toFixed(2) })}
              </Text>
              <Text style={styles.autoTradeMaxNote}>
                {t("market.autoTrade.maxActiveNote", { max: maxRules })}
              </Text>
              <ScalePressable
                disabled={disabled}
                onPress={() => {
                  addAutoTradeRule(selected.id, autoSide, autoPct, autoQty);
                  sounds.playBuy();
                }}
                style={[styles.confirmBtn, disabled && styles.confirmBtnDisabled]}
                scaleTo={0.97}
              >
                <GradientFill
                  colors={autoSide === "buy" ? GREEN_GRADIENT : RED_GRADIENT}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                />
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
                {t(rule.side === "buy" ? "market.autoTrade.ruleRowBuy" : "market.autoTrade.ruleRowSell", {
                  qty: rule.qty,
                  price: rule.triggerPrice.toFixed(2),
                })}
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
  pulseCard: {
    borderRadius: RADIUS.feature,
    padding: SPACING.md + 2,
    marginBottom: SPACING.lg,
    overflow: "hidden",
    ...cardShadow,
  },
  pulseHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pulseTitle: {
    color: COLORS.textMuted,
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    letterSpacing: 1,
  },
  pulseSentiment: { fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.label },
  pulseMoversRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: "#3a2d1e",
  },
  pulseMover: { flex: 1 },
  pulseMoverDivider: { width: 1, alignSelf: "stretch", backgroundColor: "#3a2d1e", marginHorizontal: SPACING.md },
  pulseMoverLabel: { color: COLORS.textMuted, fontSize: TYPE.micro, marginBottom: 3 },
  pulseMoverGood: {
    color: COLORS.textPrimary,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.medium,
    fontFamily: FONT.medium,
  },
  pulseMoverPct: { fontSize: TYPE.body, fontWeight: WEIGHT.black, fontFamily: FONT.black, marginTop: 2 },
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
  seasonalTitle: {
    color: COLORS.onLight,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    fontSize: TYPE.body,
  },
  seasonalDesc: { color: "#2a2016", fontSize: TYPE.caption, marginTop: 2 },
  seasonalFooterRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  seasonalBonus: {
    color: COLORS.onLight,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    fontSize: TYPE.label,
  },
  seasonalTicksLeft: {
    color: "#2a2016",
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
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
  chartTitle: {
    color: COLORS.textPrimary,
    fontSize: TYPE.title,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
  },
  chartSubtitle: { color: COLORS.textMuted, fontSize: TYPE.label, marginTop: 2 },
  chartPrice: {
    color: COLORS.accent,
    fontSize: TYPE.heading,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
  },
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
  // Matches GoodCard's own width/gap (92 / sm) so both rows show the same
  // ~3.5-4 cards per screen instead of ~3.
  lockedCard: {
    width: 92,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    padding: SPACING.sm,
    paddingTop: SPACING.sm + 2,
    marginRight: SPACING.sm,
    alignItems: "center",
    overflow: "hidden",
    ...cardShadow,
  },
  lockedAccentStripe: { position: "absolute", top: 0, left: 0, right: 0, height: 4 },
  lockedBadge: {
    position: "absolute",
    top: SPACING.xs,
    right: SPACING.xs,
    opacity: 0.75,
  },
  lockedBadgeText: { fontSize: TYPE.caption },
  // Full size and full color — this is a preview of a reward waiting at a
  // rank, not a greyed-out dead slot, so only the icon gets a touch of
  // dimming rather than the whole card.
  lockedIcon: { fontSize: TYPE.heading, opacity: 0.75 },
  lockedName: {
    color: COLORS.textPrimary,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.medium,
    fontFamily: FONT.medium,
    marginTop: 6,
  },
  lockedRankChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: SPACING.xs + 2,
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.chip,
    borderWidth: 1,
    backgroundColor: withAlpha("#000000", 0.25),
    maxWidth: "100%",
  },
  lockedRankIcon: { fontSize: TYPE.micro },
  lockedRankText: { color: COLORS.textMuted, fontSize: TYPE.micro, fontWeight: WEIGHT.bold, fontFamily: FONT.bold },
  gameOverBox: {
    marginTop: SPACING.lg + 2,
    backgroundColor: "#3a1f1a",
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    alignItems: "center",
  },
  gameOverText: {
    color: "#f0b7a8",
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    fontSize: TYPE.body,
    textAlign: "center",
  },
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
  sideBtnText: {
    color: COLORS.textMuted,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    fontSize: TYPE.body,
  },
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
  qtyBtnText: {
    color: COLORS.textPrimary,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    fontSize: TYPE.label,
  },
  autoTradePreview: { color: COLORS.textMuted, fontSize: TYPE.caption, flex: 1, marginBottom: 2 },
  autoTradeMaxNote: { color: COLORS.textMuted, fontSize: TYPE.micro, marginBottom: SPACING.sm + 2 },
  confirmBtn: {
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.md,
    alignItems: "center",
    overflow: "hidden",
  },
  confirmBtnDisabled: { opacity: 0.35 },
  confirmBtnText: {
    color: "#fff",
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    fontSize: TYPE.body + 1,
  },
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
  autoTradeRowTitle: {
    color: COLORS.textPrimary,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    fontSize: TYPE.label,
  },
  autoTradeRowSub: { color: COLORS.textMuted, fontSize: TYPE.caption, marginTop: 1 },
  autoTradeToggleBtn: {
    borderRadius: RADIUS.chip,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm + 2,
    backgroundColor: "#1a1410",
    marginRight: SPACING.sm,
  },
  autoTradeToggleBtnActive: { backgroundColor: COLORS.positive },
  autoTradeToggleBtnText: {
    color: "#fff",
    fontSize: TYPE.micro,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
  autoTradeDeleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#3a1f1a",
    alignItems: "center",
    justifyContent: "center",
  },
  autoTradeDeleteBtnText: {
    color: "#f0b7a8",
    fontSize: TYPE.label,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
});
