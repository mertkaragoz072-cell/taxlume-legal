import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS } from "../economy/goods";
import {
  estimateTaxIncomePerTick,
  isGoodUnlocked,
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
import { townRankIcon, townRankThreshold, townRankTitle } from "../economy/townRanks";
import { PROPERTIES } from "../economy/properties";
import { PRESTIGE_PERKS } from "../economy/prestigePerks";
import {
  WORKER_MAX_PER_GOOD,
  WORKER_PRODUCTION_BONUS_PER_WORKER,
  WORKER_WAGE_PER_TICK,
} from "../economy/workers";
import { GradientFill } from "../components/GradientFill";
import { PriceChart } from "../components/PriceChart";
import { ScalePressable } from "../components/ScalePressable";
import { SectionLabel } from "../components/SectionLabel";
import {
  CARD_GRADIENT,
  cardShadow,
  COLORS,
  FONT,
  glowShadow,
  GOLD_GRADIENT,
  RADIUS,
  SPACING,
  TYPE,
  WEIGHT,
  withAlpha,
} from "../theme";

const screenWidth = Dimensions.get("window").width;
const chartWidth = Math.min(screenWidth - 48, 420);

function moodFor(rate: number): { labelKey: string; emoji: string; color: string } {
  if (rate > 0.01) return { labelKey: "town.mood.crisis", emoji: "🔥", color: "#e0693f" };
  if (rate > 0.005) return { labelKey: "town.mood.heating", emoji: "😰", color: "#e0a13f" };
  if (rate > -0.001) return { labelKey: "town.mood.calm", emoji: "🙂", color: COLORS.accent };
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
    unlockPrestigePerk,
    netWorth,
    t,
    formatCoins,
  } = useEconomyContext();
  const mood = moodFor(state.inflationRate);
  const happy = happinessFor(state.happiness);
  const rankTitle = townRankTitle(state.townRankIndex, t);
  const rankNextThreshold = townRankThreshold(state.townRankIndex + 1);
  const rankPct = Math.max(0, Math.min(1, netWorth / rankNextThreshold));
  const taxIncomePerTick = estimateTaxIncomePerTick(state);
  const [prestigeArmed, setPrestigeArmed] = useState(false);
  const prestigeReady = netWorth >= PRESTIGE_UNLOCK_NET_WORTH;
  const prestigePct = Math.max(0, Math.min(1, netWorth / PRESTIGE_UNLOCK_NET_WORTH));
  const cap = loanCap(state);
  const [selectedTermMonths, setSelectedTermMonths] = useState(LOAN_TERM_MONTHS_STEPS[0]);
  const [showAllEvents, setShowAllEvents] = useState(false);
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
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(COLORS.accent, 0.1) }]}
        />
        <Text style={styles.moodEmoji}>{townRankIcon(state.townRankIndex)}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.moodLabel}>{t("town.rankLabel")}</Text>
          <Text style={[styles.moodValue, { color: COLORS.accent, fontFamily: FONT.display }]}>{rankTitle}</Text>
          <View style={styles.happinessTrack}>
            <View style={[styles.happinessFill, { width: `${rankPct * 100}%`, backgroundColor: COLORS.accent }]} />
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.moodIndex}>{townRankIcon(state.townRankIndex + 1)}</Text>
          <Text style={styles.moodIndexLabel}>{t("town.rankNext")}</Text>
        </View>
      </View>

      <View style={styles.moodCard}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(mood.color, 0.1) }]}
        />
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
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(happy.color, 0.1) }]}
        />
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

      <View style={[styles.prestigeCard, prestigeReady && glowShadow(COLORS.accent)]}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        {prestigeReady && (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(COLORS.accent, 0.08) }]}
          />
        )}
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

      <SectionLabel text={t("town.prestige.perksSectionLabel")} color={COLORS.accent} />
      <Text style={styles.prestigePointsLabel}>
        {t("town.prestige.pointsLabel", { points: state.prestigePoints })}
      </Text>
      {state.legendaryUnlocked && (
        <Text style={styles.legendaryPointsLabel}>
          {t("town.prestige.legendaryPointsLabel", { points: state.legendaryPoints })}
        </Text>
      )}
      {PRESTIGE_PERKS.map((perk) => {
        const unlocked = state.prestigePerks.includes(perk.id);
        const requiresDef = perk.requires ? PRESTIGE_PERKS.find((p) => p.id === perk.requires) : null;
        const requirementMet = !perk.requires || state.prestigePerks.includes(perk.requires);
        const disabled = unlocked || !requirementMet || state.prestigePoints < perk.cost;
        const effect = perk.effectLabel();
        return (
          <View key={perk.id} style={styles.upgradeCard}>
            <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
            <Text style={styles.upgradeIcon}>{perk.icon}</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.upgradeTitleRow}>
                <Text style={styles.upgradeName}>{t(perk.nameKey)}</Text>
                {unlocked && <Text style={styles.upgradeLevel}>{t("town.propertyOwnedLabel")}</Text>}
              </View>
              <Text style={styles.upgradeDesc}>{t(perk.descriptionKey)}</Text>
              <Text style={styles.upgradeEffect}>{t(effect.key, effect.params)}</Text>
              {!unlocked && !requirementMet && requiresDef && (
                <Text style={styles.perkRequires}>
                  {t("town.prestige.perkRequires", { name: t(requiresDef.nameKey) })}
                </Text>
              )}
            </View>
            <ScalePressable
              disabled={disabled}
              onPress={() => unlockPrestigePerk(perk.id)}
              style={[styles.upgradeBtn, disabled && styles.upgradeBtnDisabled]}
              scaleTo={0.95}
            >
              {!disabled && <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />}
              <Text style={styles.upgradeBtnText}>
                {unlocked ? t("town.prestige.perkUnlockedBtn") : t("town.prestige.perkUnlockBtn", { cost: perk.cost })}
              </Text>
            </ScalePressable>
          </View>
        );
      })}

      <View style={styles.bankCard}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: withAlpha(state.loan ? "#f0776a" : "#6fb8f2", 0.08) },
          ]}
        />
        <Text style={styles.taxTitle}>{t("town.bank.title")}</Text>
        <Text style={styles.taxDesc}>{t("town.bank.description")}</Text>
        {state.loan ? (
          <>
            <View style={styles.bankBalanceRow}>
              <Text style={styles.bankBalanceLabel}>{t("town.bank.activeTitle")}</Text>
              <Text style={styles.bankBalanceValue}>{formatCoins(state.loan.remainingBalance)}</Text>
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
          interactive
        />
      </View>

      <SectionLabel text={t("town.upgradesSectionLabel")} color="#6fb8f2" />
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

      <SectionLabel text={t("town.propertiesSectionLabel")} color="#c58ee0" />
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

      <SectionLabel text={t("town.merchantsSectionLabel")} color="#5fd884" />
      <View style={styles.buildingsGrid}>
        {GOODS.filter((g) => isGoodUnlocked(g, state)).map((g) => {
          const gs = state.goods[g.id];
          const ratio = gs.price / g.basePrice;
          const pct = Math.max(0, Math.min(1, (ratio - 0.6) / (1.8 - 0.6)));
          return (
            <View key={g.id} style={styles.buildingCard}>
              <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(g.color, 0.12) }]}
              />
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

      <SectionLabel text={t("town.workersSectionLabel")} color="#e0a13f" />
      <Text style={styles.workersNote}>{t("town.workersNote")}</Text>
      {GOODS.filter((g) => isGoodUnlocked(g, state)).map((g) => {
        const count = state.workers[g.id];
        return (
          <View key={g.id} style={styles.workerCard}>
            <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
            <View style={[styles.workerAccent, { backgroundColor: g.color }]} />
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

      <SectionLabel text={t("town.eventsSectionLabel")} color="#a0917a" />
      {state.eventLog.length === 0 && (
        <Text style={styles.emptyText}>{t("town.eventsEmpty")}</Text>
      )}
      {state.eventLog.length > 0 &&
        (() => {
          const goodCount = state.eventLog.filter((e) => e.tone === "good").length;
          const badCount = state.eventLog.filter((e) => e.tone === "bad").length;
          const neutralCount = state.eventLog.length - goodCount - badCount;
          return (
            <View style={styles.eventSummaryRow}>
              <Text style={[styles.eventSummaryChip, { color: COLORS.positive }]}>✅ {goodCount}</Text>
              <Text style={[styles.eventSummaryChip, { color: COLORS.negative }]}>⚠️ {badCount}</Text>
              <Text style={[styles.eventSummaryChip, { color: COLORS.textMuted }]}>ℹ️ {neutralCount}</Text>
            </View>
          );
        })()}
      {(showAllEvents ? state.eventLog : state.eventLog.slice(0, 5)).map((event) => (
        <View
          key={event.id}
          style={[
            styles.eventRow,
            {
              borderLeftColor:
                event.tone === "bad" ? COLORS.negative : event.tone === "good" ? COLORS.positive : COLORS.textMuted,
            },
          ]}
        >
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          <Text style={styles.eventText}>{event.message}</Text>
        </View>
      ))}
      {state.eventLog.length > 5 && (
        <ScalePressable onPress={() => setShowAllEvents((v) => !v)} style={styles.eventToggleBtn} scaleTo={0.97}>
          <Text style={styles.eventToggleBtnText}>
            {showAllEvents
              ? t("town.eventsShowLess")
              : t("town.eventsShowMore", { count: state.eventLog.length - 5 })}
          </Text>
        </ScalePressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: SPACING.lg, paddingBottom: 40 },
  moodCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.feature,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    overflow: "hidden",
    ...cardShadow,
  },
  moodEmoji: { fontSize: 32, marginRight: SPACING.md },
  moodLabel: { color: COLORS.textMuted, fontSize: TYPE.caption },
  moodValue: { fontSize: TYPE.title, fontWeight: WEIGHT.black, fontFamily: FONT.black, marginTop: 2 },
  moodIndex: { color: COLORS.accent, fontSize: TYPE.title, fontWeight: WEIGHT.black, fontFamily: FONT.black },
  moodIndexLabel: { color: COLORS.textMuted, fontSize: TYPE.micro, marginTop: 2 },
  happinessTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.onLight,
    overflow: "hidden",
    marginTop: 6,
  },
  happinessFill: { height: "100%", borderRadius: 3 },
  taxCard: {
    borderRadius: RADIUS.feature,
    padding: SPACING.lg,
    marginBottom: SPACING.xl - 4,
    overflow: "hidden",
    ...cardShadow,
  },
  taxHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  taxTitle: { color: COLORS.textPrimary, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.body },
  taxIncome: { color: COLORS.accent, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.label },
  taxDesc: { color: COLORS.textMuted, fontSize: TYPE.caption, marginTop: 6, marginBottom: SPACING.md },
  taxRow: { flexDirection: "row", gap: 6 },
  taxBtn: {
    flex: 1,
    backgroundColor: COLORS.onLight,
    borderRadius: RADIUS.chip,
    paddingVertical: 9,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    marginRight: 6,
  },
  taxBtnActive: { borderColor: COLORS.accent },
  taxBtnText: { color: COLORS.textMuted, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.label },
  taxBtnTextActive: { color: COLORS.accent },
  prestigeCard: {
    borderRadius: RADIUS.feature,
    padding: SPACING.lg,
    marginBottom: SPACING.xl - 4,
    overflow: "hidden",
    ...cardShadow,
  },
  prestigeLevel: { color: COLORS.accent, fontWeight: WEIGHT.black, fontFamily: FONT.black, fontSize: TYPE.label },
  prestigeBonus: { color: COLORS.positive, fontSize: TYPE.caption, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, marginTop: 6 },
  prestigeLocked: { color: COLORS.textMuted, fontSize: TYPE.caption, marginTop: SPACING.sm + 2, marginBottom: SPACING.sm },
  prestigeProgress: { color: COLORS.accent, fontSize: TYPE.label, fontWeight: WEIGHT.bold, fontFamily: FONT.bold },
  prestigePointsLabel: { color: COLORS.accent, fontSize: TYPE.label, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, marginBottom: SPACING.sm + 2 },
  legendaryPointsLabel: { color: "#c77df0", fontSize: TYPE.label, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, marginBottom: SPACING.sm + 2 },
  perkRequires: { color: COLORS.negative, fontSize: TYPE.micro, marginTop: 3, fontWeight: WEIGHT.medium, fontFamily: FONT.medium },
  lockedTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.onLight,
    overflow: "hidden",
    marginBottom: SPACING.sm,
  },
  lockedFill: { height: "100%", backgroundColor: COLORS.accent, borderRadius: 4 },
  prestigeBtn: {
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.md,
    alignItems: "center",
    overflow: "hidden",
    marginTop: SPACING.md,
  },
  prestigeBtnText: { color: COLORS.onLight, fontWeight: WEIGHT.black, fontFamily: FONT.black, fontSize: TYPE.body },
  bankCard: {
    borderRadius: RADIUS.feature,
    padding: SPACING.lg,
    marginBottom: SPACING.xl - 4,
    overflow: "hidden",
    ...cardShadow,
  },
  bankCap: { color: COLORS.textMuted, fontSize: TYPE.caption, marginTop: SPACING.xs, marginBottom: SPACING.sm + 2 },
  bankTermLabel: {
    color: COLORS.textMuted,
    fontSize: TYPE.micro,
    fontWeight: WEIGHT.bold, fontFamily: FONT.bold,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  bankBalanceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SPACING.sm },
  bankBalanceLabel: { color: COLORS.textMuted, fontSize: TYPE.caption },
  bankBalanceValue: { color: COLORS.negative, fontWeight: WEIGHT.black, fontFamily: FONT.black, fontSize: TYPE.title - 1 },
  bankRate: { color: COLORS.textMuted, fontSize: TYPE.micro, marginTop: 2, marginBottom: SPACING.sm + 2 },
  bankBtnRow: { flexDirection: "row", gap: SPACING.sm },
  bankBtn: {
    flex: 1,
    backgroundColor: COLORS.onLight,
    borderRadius: RADIUS.chip,
    paddingVertical: 9,
    alignItems: "center",
    marginRight: 6,
  },
  bankBtnText: { color: COLORS.accent, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.caption },
  workersNote: { color: COLORS.textMuted, fontSize: TYPE.caption, marginBottom: SPACING.sm + 2 },
  workerCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    paddingLeft: SPACING.md + 3,
    marginBottom: SPACING.sm + 2,
    overflow: "hidden",
  },
  workerAccent: { position: "absolute", top: 0, bottom: 0, left: 0, width: 4 },
  workerIcon: { fontSize: 22, marginRight: SPACING.md },
  workerName: { color: COLORS.textPrimary, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.body },
  workerInfo: { color: COLORS.positive, fontSize: TYPE.micro, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, marginTop: 2 },
  workerPipRow: { flexDirection: "row", gap: 4, marginTop: 6 },
  workerPip: { width: 14, height: 5, borderRadius: 3, backgroundColor: COLORS.onLight, marginRight: 4 },
  workerPipFilled: { backgroundColor: COLORS.accent },
  workerBtnCol: { marginLeft: SPACING.sm + 2, gap: 6 },
  workerBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.onLight,
    alignItems: "center",
    justifyContent: "center",
  },
  workerBtnDisabled: { opacity: 0.35 },
  workerBtnText: { color: COLORS.accent, fontWeight: WEIGHT.black, fontFamily: FONT.black, fontSize: TYPE.title },
  chartCard: {
    borderRadius: RADIUS.feature,
    padding: SPACING.lg,
    marginBottom: SPACING.xl - 4,
    overflow: "hidden",
    ...cardShadow,
  },
  chartTitle: { color: COLORS.textPrimary, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.body, marginBottom: 6 },
  buildingsGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm + 2, marginBottom: SPACING.xl - 4 },
  buildingCard: {
    width: "31%",
    borderRadius: RADIUS.card,
    padding: SPACING.sm + 2,
    alignItems: "center",
    overflow: "hidden",
  },
  buildingIcon: { fontSize: 22 },
  buildingName: {
    color: COLORS.textPrimary,
    fontSize: TYPE.micro,
    fontWeight: WEIGHT.medium, fontFamily: FONT.medium,
    marginTop: SPACING.xs,
    textAlign: "center",
  },
  buildingTrack: {
    width: 10,
    height: 44,
    backgroundColor: COLORS.onLight,
    borderRadius: 5,
    marginTop: SPACING.sm,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  buildingFill: { width: "100%", borderRadius: 5 },
  buildingRatio: { color: COLORS.textMuted, fontSize: TYPE.micro, marginTop: 6 },
  emptyText: { color: COLORS.textMuted, fontSize: TYPE.label, marginBottom: SPACING.sm + 2 },
  eventRow: {
    borderRadius: RADIUS.chip,
    borderLeftWidth: 3,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.sm,
    overflow: "hidden",
  },
  eventText: { color: COLORS.textPrimary, fontSize: TYPE.label },
  eventSummaryRow: { flexDirection: "row", gap: SPACING.md, marginBottom: SPACING.sm },
  eventSummaryChip: { fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.label },
  eventToggleBtn: { alignItems: "center", paddingVertical: SPACING.sm, marginBottom: SPACING.sm },
  eventToggleBtnText: { color: COLORS.accent, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.label },
  upgradeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    marginBottom: SPACING.sm + 2,
    overflow: "hidden",
  },
  upgradeIcon: { fontSize: 24, marginRight: SPACING.md },
  upgradeTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  upgradeName: { color: COLORS.textPrimary, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.body },
  upgradeLevel: { color: COLORS.textMuted, fontSize: TYPE.caption, fontWeight: WEIGHT.medium, fontFamily: FONT.medium },
  upgradeDesc: { color: COLORS.textMuted, fontSize: TYPE.caption, marginTop: 2 },
  upgradeEffect: { color: COLORS.positive, fontSize: TYPE.caption, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, marginTop: 3 },
  upgradeLevelTrack: { flexDirection: "row", gap: 4, marginTop: 6 },
  upgradeLevelPip: {
    width: 14,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.onLight,
    marginRight: 4,
  },
  upgradeLevelPipFilled: { backgroundColor: COLORS.accent },
  upgradeBtn: {
    borderRadius: RADIUS.chip,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm + 2,
    marginLeft: SPACING.sm + 2,
    overflow: "hidden",
  },
  upgradeBtnDisabled: { backgroundColor: "#4a4032" },
  upgradeBtnText: { color: COLORS.onLight, fontWeight: WEIGHT.black, fontFamily: FONT.black, fontSize: TYPE.label },
});
