import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS } from "../economy/goods";
import {
  estimateTaxIncomePerTick,
  loanCap,
  loanInterestRatePerDay,
  loanTickRateToDayRate,
  LOAN_TERM_DAYS_PER_MONTH,
  LOAN_TERM_MONTHS_STEPS,
  PRESTIGE_CASH_BONUS_PER_LEVEL,
  PRESTIGE_PRODUCTION_BONUS_PER_LEVEL,
  PRESTIGE_UNLOCK_NET_WORTH,
  TAX_RATE_STEPS,
} from "../economy/useEconomy";
import { UPGRADES, upgradeCost } from "../economy/upgrades";
import { PROPERTIES } from "../economy/properties";
import {
  WORKER_MAX_PER_GOOD,
  WORKER_PRODUCTION_BONUS_PER_WORKER,
  WORKER_WAGE_PER_TICK,
} from "../economy/workers";
import { GradientFill } from "../components/GradientFill";
import { PriceChart } from "../components/PriceChart";
import { ScalePressable } from "../components/ScalePressable";
import { CARD_GRADIENT, cardShadow, GOLD_GRADIENT } from "../theme";

const screenWidth = Dimensions.get("window").width;
const chartWidth = Math.min(screenWidth - 48, 420);

function moodFor(rate: number): { labelKey: string; emoji: string; color: string } {
  if (rate > 0.01) return { labelKey: "town.mood.crisis", emoji: "🔥", color: "#e0693f" };
  if (rate > 0.005) return { labelKey: "town.mood.heating", emoji: "😰", color: "#e0a13f" };
  if (rate > -0.001) return { labelKey: "town.mood.calm", emoji: "🙂", color: "#e8c777" };
  return { labelKey: "town.mood.cooling", emoji: "😌", color: "#3fae5c" };
}

function happinessFor(h: number): { labelKey: string; emoji: string; color: string } {
  if (h < 20) return { labelKey: "town.happiness.revolt", emoji: "😡", color: "#c94b4b" };
  if (h < 45) return { labelKey: "town.happiness.unrest", emoji: "😠", color: "#e0693f" };
  if (h < 70) return { labelKey: "town.happiness.coping", emoji: "😐", color: "#e0a13f" };
  if (h < 90) return { labelKey: "town.happiness.content", emoji: "🙂", color: "#a8c777" };
  return { labelKey: "town.happiness.veryContent", emoji: "😄", color: "#3fae5c" };
}

export function TownScreen() {
  const {
    state,
    upgrade,
    setTaxRate,
    prestige,
    takeLoan,
    repayLoan,
    hireWorker,
    fireWorker,
    buyProperty,
    netWorth,
    t,
  } = useEconomyContext();
  const mood = moodFor(state.inflationRate);
  const happy = happinessFor(state.happiness);
  const taxIncomePerTick = estimateTaxIncomePerTick(state);
  const [prestigeArmed, setPrestigeArmed] = useState(false);
  const prestigeReady = netWorth >= PRESTIGE_UNLOCK_NET_WORTH;
  const prestigePct = Math.max(0, Math.min(1, netWorth / PRESTIGE_UNLOCK_NET_WORTH));
  const cap = loanCap(state);
  const [selectedTermMonths, setSelectedTermMonths] = useState(LOAN_TERM_MONTHS_STEPS[0]);
  const previewDayRate = loanInterestRatePerDay(state, selectedTermMonths);
  const previewTermDays = selectedTermMonths * LOAN_TERM_DAYS_PER_MONTH;

  // A gentle breathing pulse on the Prestige button once it's actually
  // tappable — draws the eye without a modal or sound nagging about it.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!prestigeReady || prestigeArmed) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [prestigeReady, prestigeArmed, pulse]);
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={styles.moodCard}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <Text style={styles.moodEmoji}>{mood.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.moodLabel}>{t("town.moodLabel")}</Text>
          <Text style={[styles.moodValue, { color: mood.color }]}>{t(mood.labelKey)}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.moodIndex}>{state.inflationIndex.toFixed(1)}</Text>
          <Text style={styles.moodIndexLabel}>{t("town.priceIndexLabel")}</Text>
        </View>
      </View>

      <View style={styles.moodCard}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <Text style={styles.moodEmoji}>{happy.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.moodLabel}>{t("town.happinessLabel")}</Text>
          <Text style={[styles.moodValue, { color: happy.color }]}>{t(happy.labelKey)}</Text>
          <View style={styles.happinessTrack}>
            <View
              style={[
                styles.happinessFill,
                { width: `${state.happiness}%`, backgroundColor: happy.color },
              ]}
            />
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.moodIndex}>{Math.round(state.happiness)}</Text>
          <Text style={styles.moodIndexLabel}>{t("town.outOf100")}</Text>
        </View>
      </View>

      <View style={styles.taxCard}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <View style={styles.taxHeaderRow}>
          <Text style={styles.taxTitle}>{t("town.tax.title")}</Text>
          <Text style={styles.taxIncome}>
            {taxIncomePerTick > 0
              ? t("town.tax.incomePerTurn", { amount: taxIncomePerTick.toFixed(2) })
              : t("town.tax.none")}
          </Text>
        </View>
        <Text style={styles.taxDesc}>{t("town.tax.description")}</Text>
        <View style={styles.taxRow}>
          {TAX_RATE_STEPS.map((rate) => {
            const selected = Math.abs(state.taxRate - rate) < 0.001;
            return (
              <ScalePressable
                key={rate}
                onPress={() => setTaxRate(rate)}
                style={[styles.taxBtn, selected && styles.taxBtnActive]}
              >
                <Text style={[styles.taxBtnText, selected && styles.taxBtnTextActive]}>
                  %{Math.round(rate * 100)}
                </Text>
              </ScalePressable>
            );
          })}
        </View>
      </View>

      <View style={styles.prestigeCard}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <View style={styles.taxHeaderRow}>
          <Text style={styles.taxTitle}>{t("town.prestige.title")}</Text>
          {state.prestigeLevel > 0 && (
            <Text style={styles.prestigeLevel}>{t("town.prestige.level", { level: state.prestigeLevel })}</Text>
          )}
        </View>
        <Text style={styles.taxDesc}>{t("town.prestige.description")}</Text>
        {state.prestigeLevel > 0 && (
          <Text style={styles.prestigeBonus}>
            {t("town.prestige.bonus", {
              pct: Math.round(state.prestigeLevel * PRESTIGE_PRODUCTION_BONUS_PER_LEVEL * 100),
              cash: state.prestigeLevel * PRESTIGE_CASH_BONUS_PER_LEVEL,
            })}
          </Text>
        )}
        {prestigeReady ? (
          <Animated.View style={{ transform: [{ scale: prestigeArmed ? 1 : pulseScale }] }}>
            <ScalePressable
              onPress={() => {
                if (!prestigeArmed) {
                  setPrestigeArmed(true);
                  return;
                }
                prestige();
                setPrestigeArmed(false);
              }}
              style={styles.prestigeBtn}
              scaleTo={0.97}
            >
              <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
              <Text style={styles.prestigeBtnText}>
                {prestigeArmed ? t("town.prestige.confirmButton") : t("town.prestige.button")}
              </Text>
            </ScalePressable>
          </Animated.View>
        ) : (
          <>
            <Text style={styles.prestigeLocked}>
              {t("town.prestige.locked", { target: PRESTIGE_UNLOCK_NET_WORTH })}
            </Text>
            <View style={styles.lockedTrack}>
              <View style={[styles.lockedFill, { width: `${prestigePct * 100}%` }]} />
            </View>
            <Text style={styles.prestigeProgress}>
              {t("town.prestige.progress", {
                current: Math.floor(netWorth),
                target: PRESTIGE_UNLOCK_NET_WORTH,
              })}
            </Text>
          </>
        )}
      </View>

      <View style={styles.bankCard}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <Text style={styles.taxTitle}>{t("town.bank.title")}</Text>
        <Text style={styles.taxDesc}>{t("town.bank.description")}</Text>
        {state.loan ? (
          <>
            <View style={styles.bankBalanceRow}>
              <Text style={styles.bankBalanceLabel}>{t("town.bank.activeTitle")}</Text>
              <Text style={styles.bankBalanceValue}>{state.loan.remainingBalance.toFixed(1)} 🪙</Text>
            </View>
            <Text style={styles.bankRate}>
              {t("town.bank.rate", {
                pct: (loanTickRateToDayRate(state.loan.interestRatePerTick) * 100).toFixed(2),
                months: state.loan.termMonths,
                days: state.loan.termMonths * LOAN_TERM_DAYS_PER_MONTH,
              })}
            </Text>
            <View style={styles.bankBtnRow}>
              {([0.25, 0.5, 1] as const).map((frac) => {
                const amount = Math.min(state.cash, state.loan!.remainingBalance) * frac;
                if (amount < 1) return null;
                return (
                  <ScalePressable key={frac} onPress={() => repayLoan(amount)} style={styles.bankBtn}>
                    <Text style={styles.bankBtnText}>
                      {frac === 1
                        ? t("town.bank.repayAllBtn")
                        : t("town.bank.repayBtn", { amount: Math.round(amount) })}
                    </Text>
                  </ScalePressable>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.bankCap}>{t("town.bank.cap", { amount: cap })}</Text>
            <Text style={styles.bankTermLabel}>{t("town.bank.termLabel")}</Text>
            <View style={styles.taxRow}>
              {LOAN_TERM_MONTHS_STEPS.map((months) => {
                const selected = months === selectedTermMonths;
                return (
                  <ScalePressable
                    key={months}
                    onPress={() => setSelectedTermMonths(months)}
                    style={[styles.taxBtn, selected && styles.taxBtnActive]}
                  >
                    <Text style={[styles.taxBtnText, selected && styles.taxBtnTextActive]}>
                      {t("town.bank.termMonths", { months })}
                    </Text>
                  </ScalePressable>
                );
              })}
            </View>
            <Text style={styles.bankRate}>
              {t("town.bank.ratePreview", { pct: (previewDayRate * 100).toFixed(2), days: previewTermDays })}
            </Text>
            <View style={styles.bankBtnRow}>
              {([0.25, 0.5, 1] as const).map((frac) => {
                const amount = Math.round(cap * frac);
                if (amount < 10) return null;
                return (
                  <ScalePressable
                    key={frac}
                    onPress={() => takeLoan(amount, selectedTermMonths)}
                    style={styles.bankBtn}
                  >
                    <Text style={styles.bankBtnText}>{t("town.bank.takeBtn", { amount })}</Text>
                  </ScalePressable>
                );
              })}
            </View>
          </>
        )}
      </View>

      <View style={styles.chartCard}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <Text style={styles.chartTitle}>{t("town.chartTitle")}</Text>
        <PriceChart
          history={state.inflationHistory}
          color={mood.color}
          width={chartWidth}
          height={120}
          strokeWidth={3}
        />
      </View>

      <Text style={styles.sectionLabel}>{t("town.upgradesSectionLabel")}</Text>
      {UPGRADES.map((u) => {
        const level = state.upgrades[u.id];
        const maxed = level >= u.maxLevel;
        const cost = maxed ? 0 : upgradeCost(u, level);
        const disabled = maxed || state.cash < cost;
        return (
          <View key={u.id} style={styles.upgradeCard}>
            <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
            <Text style={styles.upgradeIcon}>{u.icon}</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.upgradeTitleRow}>
                <Text style={styles.upgradeName}>{t(u.nameKey)}</Text>
                <Text style={styles.upgradeLevel}>
                  {t("town.upgradeLevel", { level, max: u.maxLevel })}
                </Text>
              </View>
              <Text style={styles.upgradeDesc}>{t(u.descriptionKey)}</Text>
              {level > 0 &&
                (() => {
                  const effect = u.effectLabel(level);
                  return <Text style={styles.upgradeEffect}>{t(effect.key, effect.params)}</Text>;
                })()}
              <View style={styles.upgradeLevelTrack}>
                {Array.from({ length: u.maxLevel }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.upgradeLevelPip, i < level && styles.upgradeLevelPipFilled]}
                  />
                ))}
              </View>
            </View>
            <ScalePressable
              disabled={disabled}
              onPress={() => upgrade(u.id)}
              style={[styles.upgradeBtn, disabled && styles.upgradeBtnDisabled]}
              scaleTo={0.95}
            >
              {!disabled && <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />}
              <Text style={styles.upgradeBtnText}>
                {maxed ? t("town.upgradeMaxed") : `${cost} 🪙`}
              </Text>
            </ScalePressable>
          </View>
        );
      })}

      <Text style={styles.sectionLabel}>{t("town.propertiesSectionLabel")}</Text>
      {PROPERTIES.map((p) => {
        const owned = state.ownedProperties.includes(p.id);
        const disabled = owned || state.cash < p.cost;
        const effect = p.effectLabel();
        return (
          <View key={p.id} style={styles.upgradeCard}>
            <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
            <Text style={styles.upgradeIcon}>{p.icon}</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.upgradeTitleRow}>
                <Text style={styles.upgradeName}>{t(p.nameKey)}</Text>
                {owned && <Text style={styles.upgradeLevel}>{t("town.propertyOwnedLabel")}</Text>}
              </View>
              <Text style={styles.upgradeDesc}>{t(p.descriptionKey)}</Text>
              <Text style={styles.upgradeEffect}>{t(effect.key, effect.params)}</Text>
            </View>
            <ScalePressable
              disabled={disabled}
              onPress={() => buyProperty(p.id)}
              style={[styles.upgradeBtn, disabled && styles.upgradeBtnDisabled]}
              scaleTo={0.95}
            >
              {!disabled && <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />}
              <Text style={styles.upgradeBtnText}>
                {owned ? t("town.propertyOwnedBtn") : `${p.cost} 🪙`}
              </Text>
            </ScalePressable>
          </View>
        );
      })}

      <Text style={styles.sectionLabel}>{t("town.merchantsSectionLabel")}</Text>
      <View style={styles.buildingsGrid}>
        {GOODS.map((g) => {
          const gs = state.goods[g.id];
          const ratio = gs.price / g.basePrice;
          const pct = Math.max(0, Math.min(1, (ratio - 0.6) / (1.8 - 0.6)));
          return (
            <View key={g.id} style={styles.buildingCard}>
              <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
              <Text style={styles.buildingIcon}>{g.icon}</Text>
              <Text style={styles.buildingName}>{t(g.producerKey)}</Text>
              <View style={styles.buildingTrack}>
                <View
                  style={[
                    styles.buildingFill,
                    { height: `${pct * 100}%`, backgroundColor: g.color },
                  ]}
                />
              </View>
              <Text style={styles.buildingRatio}>{(ratio * 100).toFixed(0)}%</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>{t("town.workersSectionLabel")}</Text>
      <Text style={styles.workersNote}>{t("town.workersNote")}</Text>
      {GOODS.map((g) => {
        const count = state.workers[g.id];
        return (
          <View key={g.id} style={styles.workerCard}>
            <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
            <Text style={styles.workerIcon}>{g.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.workerName}>{t(g.nameKey)}</Text>
              {count > 0 && (
                <Text style={styles.workerInfo}>
                  {t("town.workerWage", { amount: (count * WORKER_WAGE_PER_TICK).toFixed(1) })}
                  {" · "}
                  {t("town.workerBonus", { pct: Math.round(count * WORKER_PRODUCTION_BONUS_PER_WORKER * 100) })}
                </Text>
              )}
              <View style={styles.workerPipRow}>
                {Array.from({ length: WORKER_MAX_PER_GOOD }).map((_, i) => (
                  <View key={i} style={[styles.workerPip, i < count && styles.workerPipFilled]} />
                ))}
              </View>
            </View>
            <View style={styles.workerBtnCol}>
              <ScalePressable
                disabled={count >= WORKER_MAX_PER_GOOD}
                onPress={() => hireWorker(g.id)}
                style={[styles.workerBtn, count >= WORKER_MAX_PER_GOOD && styles.workerBtnDisabled]}
              >
                <Text style={styles.workerBtnText}>+</Text>
              </ScalePressable>
              <ScalePressable
                disabled={count <= 0}
                onPress={() => fireWorker(g.id)}
                style={[styles.workerBtn, count <= 0 && styles.workerBtnDisabled]}
              >
                <Text style={styles.workerBtnText}>−</Text>
              </ScalePressable>
            </View>
          </View>
        );
      })}

      <Text style={styles.sectionLabel}>{t("town.eventsSectionLabel")}</Text>
      {state.eventLog.length === 0 && (
        <Text style={styles.emptyText}>{t("town.eventsEmpty")}</Text>
      )}
      {state.eventLog.map((event) => (
        <View
          key={event.id}
          style={[
            styles.eventRow,
            {
              borderLeftColor:
                event.tone === "bad" ? "#c94b4b" : event.tone === "good" ? "#3fae5c" : "#a0917a",
            },
          ]}
        >
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          <Text style={styles.eventText}>{event.message}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  moodCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    overflow: "hidden",
    ...cardShadow,
  },
  moodEmoji: { fontSize: 32, marginRight: 12 },
  moodLabel: { color: "#a0917a", fontSize: 11 },
  moodValue: { fontSize: 16, fontWeight: "800", marginTop: 2 },
  moodIndex: { color: "#e8c777", fontSize: 16, fontWeight: "800" },
  moodIndexLabel: { color: "#a0917a", fontSize: 10, marginTop: 2 },
  happinessTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "#1a1410",
    overflow: "hidden",
    marginTop: 6,
  },
  happinessFill: { height: "100%", borderRadius: 3 },
  taxCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    overflow: "hidden",
    ...cardShadow,
  },
  taxHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  taxTitle: { color: "#f0e3c8", fontWeight: "700", fontSize: 13 },
  taxIncome: { color: "#e8c777", fontWeight: "700", fontSize: 12 },
  taxDesc: { color: "#a0917a", fontSize: 11, marginTop: 6, marginBottom: 12 },
  taxRow: { flexDirection: "row", gap: 6 },
  taxBtn: {
    flex: 1,
    backgroundColor: "#1a1410",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    marginRight: 6,
  },
  taxBtnActive: { borderColor: "#e8c777" },
  taxBtnText: { color: "#a0917a", fontWeight: "700", fontSize: 12 },
  taxBtnTextActive: { color: "#e8c777" },
  prestigeCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    overflow: "hidden",
    ...cardShadow,
  },
  prestigeLevel: { color: "#e8c777", fontWeight: "800", fontSize: 12 },
  prestigeBonus: { color: "#3fae5c", fontSize: 11, fontWeight: "700", marginTop: 6 },
  prestigeLocked: { color: "#a0917a", fontSize: 11, marginTop: 10, marginBottom: 8 },
  prestigeProgress: { color: "#e8c777", fontSize: 12, fontWeight: "700" },
  lockedTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1a1410",
    overflow: "hidden",
    marginBottom: 8,
  },
  lockedFill: { height: "100%", backgroundColor: "#e8c777", borderRadius: 4 },
  prestigeBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    overflow: "hidden",
    marginTop: 12,
  },
  prestigeBtnText: { color: "#1a1410", fontWeight: "800", fontSize: 14 },
  bankCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    overflow: "hidden",
    ...cardShadow,
  },
  bankCap: { color: "#a0917a", fontSize: 11, marginTop: 4, marginBottom: 10 },
  bankTermLabel: { color: "#a0917a", fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6 },
  bankBalanceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  bankBalanceLabel: { color: "#a0917a", fontSize: 11 },
  bankBalanceValue: { color: "#c94b4b", fontWeight: "800", fontSize: 15 },
  bankRate: { color: "#a0917a", fontSize: 10, marginTop: 2, marginBottom: 10 },
  bankBtnRow: { flexDirection: "row", gap: 8 },
  bankBtn: {
    flex: 1,
    backgroundColor: "#1a1410",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    marginRight: 6,
  },
  bankBtnText: { color: "#e8c777", fontWeight: "700", fontSize: 11 },
  workersNote: { color: "#a0917a", fontSize: 11, marginBottom: 10 },
  workerCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  workerIcon: { fontSize: 22, marginRight: 12 },
  workerName: { color: "#f0e3c8", fontWeight: "700", fontSize: 13 },
  workerInfo: { color: "#3fae5c", fontSize: 10, fontWeight: "700", marginTop: 2 },
  workerPipRow: { flexDirection: "row", gap: 4, marginTop: 6 },
  workerPip: { width: 14, height: 5, borderRadius: 3, backgroundColor: "#1a1410", marginRight: 4 },
  workerPipFilled: { backgroundColor: "#e8c777" },
  workerBtnCol: { marginLeft: 10, gap: 6 },
  workerBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1a1410",
    alignItems: "center",
    justifyContent: "center",
  },
  workerBtnDisabled: { opacity: 0.35 },
  workerBtnText: { color: "#e8c777", fontWeight: "800", fontSize: 16 },
  chartCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    overflow: "hidden",
    ...cardShadow,
  },
  chartTitle: { color: "#f0e3c8", fontWeight: "700", fontSize: 13, marginBottom: 6 },
  sectionLabel: {
    color: "#a0917a",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
  },
  buildingsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  buildingCard: {
    width: "31%",
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
    overflow: "hidden",
  },
  buildingIcon: { fontSize: 22 },
  buildingName: { color: "#f0e3c8", fontSize: 10, fontWeight: "600", marginTop: 4, textAlign: "center" },
  buildingTrack: {
    width: 10,
    height: 44,
    backgroundColor: "#1a1410",
    borderRadius: 5,
    marginTop: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  buildingFill: { width: "100%", borderRadius: 5 },
  buildingRatio: { color: "#a0917a", fontSize: 10, marginTop: 6 },
  emptyText: { color: "#a0917a", fontSize: 12, marginBottom: 10 },
  eventRow: {
    borderRadius: 10,
    borderLeftWidth: 3,
    padding: 10,
    marginBottom: 8,
    overflow: "hidden",
  },
  eventText: { color: "#f0e3c8", fontSize: 12 },
  upgradeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  upgradeIcon: { fontSize: 24, marginRight: 12 },
  upgradeTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  upgradeName: { color: "#f0e3c8", fontWeight: "700", fontSize: 13 },
  upgradeLevel: { color: "#a0917a", fontSize: 11, fontWeight: "600" },
  upgradeDesc: { color: "#a0917a", fontSize: 11, marginTop: 2 },
  upgradeEffect: { color: "#3fae5c", fontSize: 11, fontWeight: "700", marginTop: 3 },
  upgradeLevelTrack: { flexDirection: "row", gap: 4, marginTop: 6 },
  upgradeLevelPip: {
    width: 14,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#1a1410",
    marginRight: 4,
  },
  upgradeLevelPipFilled: { backgroundColor: "#e8c777" },
  upgradeBtn: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginLeft: 10,
    overflow: "hidden",
  },
  upgradeBtnDisabled: { backgroundColor: "#4a4032" },
  upgradeBtnText: { color: "#1a1410", fontWeight: "800", fontSize: 12 },
});
