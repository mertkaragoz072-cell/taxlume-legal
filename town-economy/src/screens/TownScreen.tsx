import React, { useEffect, useRef, useState } from "react";
import { formatPercent } from "../utils/formatNumber";
import { Animated, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../components/AppText";
import { useEconomyContext } from "../economy/EconomyContext";
import { resolveEventMessage } from "../i18n/t";
import { GOODS } from "../economy/goods";
import {
  effectiveWorkerMaxPerGood,
  estimateTaxIncomePerTick,
  inflationPressureBreakdown,
  isGoodUnlocked,
  loanCap,
  loanInterestRatePerDay,
  loanTickRateToDayRate,
  LOAN_TERM_DAYS_PER_MONTH,
  LOAN_TERM_MONTHS_STEPS,
  PRESTIGE_CASH_BONUS_PER_LEVEL,
  PRESTIGE_PRODUCTION_BONUS_PER_LEVEL,
  DOCTRINE_UNLOCK_NET_WORTH,
  PRESTIGE_UNLOCK_NET_WORTH,
  TAX_RATE_STEPS,
  TICKS_PER_GAME_DAY,
  WORKERS_UNLOCK_NET_WORTH,
} from "../economy/useEconomy";
import { DOCTRINES_BY_ID } from "../economy/doctrines";
import { UPGRADES, upgradeCost } from "../economy/upgrades";
import { townRankIcon, townRankThreshold, townRankTitle } from "../economy/townRanks";
import { PROPERTIES } from "../economy/properties";
import { PRESTIGE_PERKS } from "../economy/prestigePerks";
import { WORKER_PRODUCTION_BONUS_PER_WORKER, WORKER_WAGE_PER_TICK } from "../economy/workers";
import { GoodIcon } from "../components/GoodIcon";
import { GradientFill } from "../components/GradientFill";
import { PriceChart } from "../components/PriceChart";
import { ScalePressable } from "../components/ScalePressable";
import { SectionLabel } from "../components/SectionLabel";
import { StretchPanel, GoldButton } from "../components/PanelKit";
import {
  BankPanel,
  ChartPanel,
  HappinessPanel,
  MoodPanel,
  RankPanel,
  TaxPanel,
} from "../components/TownPanels";
import { BUILDING_ART, EventRow, FactorRow, INK, INK_GREEN, TownItemCard } from "../components/TownCards";
import { TownChatterTicker } from "../components/TownChatterTicker";
import { happinessFor, TownSquareScene } from "../components/TownSquareScene";
import {
  CARD_GRADIENT,
  cardShadow,
  COLORS,
  PANEL_GAP,
  SCREEN_PADDING,
  FONT,
  glowShadow,
  GOLD_GRADIENT,
  RADIUS,
  SPACING,
  TYPE,
  WEIGHT,
  withAlpha,
} from "../theme";

/** Chart line colours that read on parchment (the mood colours are tuned for the dark theme). */
const CHART_INK = { crisis: "#b8431c", heating: "#a8680f", calm: "#7a5a14", cooling: "#2f8a4a" } as const;

function moodFor(rate: number): { labelKey: string; emoji: string; color: string } {
  if (rate > 0.01) return { labelKey: "town.mood.crisis", emoji: "🔥", color: "#e0693f" };
  if (rate > 0.005) return { labelKey: "town.mood.heating", emoji: "😰", color: "#e0a13f" };
  if (rate > -0.001) return { labelKey: "town.mood.calm", emoji: "🙂", color: COLORS.accent };
  return { labelKey: "town.mood.cooling", emoji: "😌", color: "#3fae5c" };
}

interface Props {
  /** opens the doctrine picker; owned by App so the modal sits above every screen */
  onOpenDoctrine: () => void;
}

export function TownScreen({ onOpenDoctrine }: Props) {
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
  const activeDoctrine = state.doctrine ? DOCTRINES_BY_ID[state.doctrine] : null;
  const mood = moodFor(state.inflationRate);
  const happy = happinessFor(state.happiness);
  const inflationPressure = inflationPressureBreakdown(state);
  // Per-tick rates compounded out to a whole game day, same conversion the
  // header's own inflation line uses — a per-tick number like 0.005 means
  // nothing to a player, "+2.1%/day" does.
  const dailyPct = (rate: number) => (Math.pow(1 + rate, TICKS_PER_GAME_DAY) - 1) * 100;
  const rankTitle = townRankTitle(state.townRankIndex, t);
  const rankCurrentThreshold = townRankThreshold(state.townRankIndex);
  const rankNextThreshold = townRankThreshold(state.townRankIndex + 1);
  // Progress *within* the current tier, not of net worth against the next
  // tier's absolute threshold — the latter left the bar already a third (or
  // more) full the instant a rank was reached, since each tier's threshold
  // is itself a sizeable fraction of the next one's.
  const rankPct = Math.max(
    0,
    Math.min(1, (netWorth - rankCurrentThreshold) / (rankNextThreshold - rankCurrentThreshold))
  );
  const taxIncomePerTick = estimateTaxIncomePerTick(state);
  const [prestigeArmed, setPrestigeArmed] = useState(false);
  const prestigeReady = netWorth >= PRESTIGE_UNLOCK_NET_WORTH;
  const prestigePct = Math.max(0, Math.min(1, netWorth / PRESTIGE_UNLOCK_NET_WORTH));
  const cap = loanCap(state);
  const maxWorkersPerGood = effectiveWorkerMaxPerGood(state);
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
      <TownSquareScene
        happiness={state.happiness}
        tick={state.tick}
        townRankIndex={state.townRankIndex}
        label={t("town.squareLabel")}
        moodLabel={t(happy.labelKey)}
        moodColor={happy.color}
      />
      <TownChatterTicker state={state} t={t} />

      <RankPanel
        label={t("town.rankLabel")}
        title={rankTitle}
        icon={townRankIcon(state.townRankIndex)}
        nextIcon={townRankIcon(state.townRankIndex + 1)}
        nextLabel={t("town.rankNext")}
        pct={rankPct}
      />

      <MoodPanel
        label={t("town.moodLabel")}
        mood={t(mood.labelKey)}
        emoji={mood.emoji}
        index={state.inflationIndex.toFixed(1)}
        indexLabel={t("town.priceIndexLabel")}
      />

      <StretchPanel frame="wheat" title={t("town.inflationFactors.title")}>
        <FactorRow
          label={t("town.inflationFactors.baseline")}
          value={`+${formatPercent(dailyPct(inflationPressure.baseline), state.language, 2)}`}
          up
          good={false}
        />
        {inflationPressure.unhappinessDrag > 0 && (
          <FactorRow
            label={t("town.inflationFactors.unhappiness")}
            value={`+${formatPercent(dailyPct(inflationPressure.unhappinessDrag), state.language, 2)}`}
            up
            good={false}
          />
        )}
        {inflationPressure.contentRelief > 0 && (
          <FactorRow
            label={t("town.inflationFactors.content")}
            value={`-${formatPercent(dailyPct(inflationPressure.contentRelief), state.language, 2)}`}
            up={false}
            good
          />
        )}
        {inflationPressure.taxHappinessDrag > 0.5 && (
          <FactorRow
            label={t("town.inflationFactors.tax")}
            value={`-${Math.round(inflationPressure.taxHappinessDrag)} ${t("town.inflationFactors.happinessSuffix")}`}
            up={false}
            good={false}
          />
        )}
        {inflationPressure.debtHappinessDrag > 0.5 && (
          <FactorRow
            label={t("town.inflationFactors.debt")}
            value={`-${Math.round(inflationPressure.debtHappinessDrag)} ${t("town.inflationFactors.happinessSuffix")}`}
            up={false}
            good={false}
          />
        )}
      </StretchPanel>

      <HappinessPanel
        label={t("town.happinessLabel")}
        status={t(happy.labelKey)}
        emoji={happy.emoji}
        value={state.happiness}
        outOf={t("town.outOf100")}
        color={happy.color}
      />

      <TaxPanel
        title={t("town.tax.title")}
        rateLabel={t("town.tax.rateLabel")}
        description={t("town.tax.description")}
        income={
          taxIncomePerTick > 0
            ? t("town.tax.incomePerTurn", { amount: (taxIncomePerTick * TICKS_PER_GAME_DAY).toFixed(2) })
            : t("town.tax.none")
        }
        rates={TAX_RATE_STEPS.map((rate) => ({
          label: formatPercent(rate * 100, state.language),
          selected: Math.abs(state.taxRate - rate) < 0.001,
          onPress: () => setTaxRate(rate),
        }))}
      />

      {/* A brand-new player's net worth is nowhere near these thresholds
          (15,000+/5,000+/100,000+), so showing them from day one was just a
          wall of "locked" teasers before anything else useful. Each section
          now only appears once the player is in reach of it — halfway to
          its own threshold — or has already engaged with it, rather than
          the instant the town exists. */}
      {(prestigeReady || state.prestigeLevel > 0 || netWorth >= PRESTIGE_UNLOCK_NET_WORTH * 0.5) && (
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
              <Text style={styles.prestigeLevel}>
                {t("town.prestige.level", { level: state.prestigeLevel })}
              </Text>
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
      )}

      {(activeDoctrine || netWorth >= DOCTRINE_UNLOCK_NET_WORTH * 0.5) && (
        <>
          <SectionLabel text={t("doctrine.activeLabel")} color="#e8c777" />
          <View style={styles.doctrineCard}>
            <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
            {activeDoctrine ? (
              <>
                <View style={styles.doctrineHead}>
                  <Text aria-hidden style={styles.doctrineIcon}>
                    {activeDoctrine.icon}
                  </Text>
                  <Text style={styles.doctrineName}>{t(activeDoctrine.nameKey)}</Text>
                </View>
                <Text style={styles.doctrineBonus}>+ {t(activeDoctrine.bonusKey)}</Text>
                <Text style={styles.doctrinePenalty}>− {t(activeDoctrine.penaltyKey)}</Text>
              </>
            ) : netWorth >= DOCTRINE_UNLOCK_NET_WORTH ? (
              <>
                <Text style={styles.doctrinePrompt}>{t("doctrine.choosePrompt")}</Text>
                <ScalePressable onPress={onOpenDoctrine} style={styles.doctrineBtn} scaleTo={0.96}>
                  <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
                  <Text style={styles.doctrineBtnText}>{t("doctrine.chooseBtn")}</Text>
                </ScalePressable>
              </>
            ) : (
              <Text style={styles.doctrineLocked}>
                🔒 {t("doctrine.lockedNote", { amount: DOCTRINE_UNLOCK_NET_WORTH })}
              </Text>
            )}
          </View>
        </>
      )}

      {/* Prestige perks are spent out of prestigePoints, which stay at 0
          until the player has actually prestiged once — before that this
          whole list (and its "0 points" label) has nothing to say. */}
      {state.prestigeLevel > 0 && (
        <>
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
                    {unlocked
                      ? t("town.prestige.perkUnlockedBtn")
                      : t("town.prestige.perkUnlockBtn", { cost: perk.cost })}
                  </Text>
                </ScalePressable>
              </View>
            );
          })}
        </>
      )}

      {state.loan ? (
        <BankPanel
          title={t("town.bank.title")}
          description={t("town.bank.description")}
          chipLabel={t("town.bank.activeTitle")}
          info={[
            formatCoins(state.loan.remainingBalance),
            `${(loanTickRateToDayRate(state.loan.interestRatePerTick) * 100).toFixed(2)}% · ${t("town.bank.termMonths", { months: state.loan.termMonths })}`,
          ]}
          rateLine={t("town.bank.rate", {
            pct: (loanTickRateToDayRate(state.loan.interestRatePerTick) * 100).toFixed(2),
            months: state.loan.termMonths,
            days: state.loan.termMonths * LOAN_TERM_DAYS_PER_MONTH,
          })}
          pills={([0.25, 0.5, 1] as const).flatMap((frac) => {
            const amount = Math.min(state.cash, state.loan!.remainingBalance) * frac;
            if (amount < 1) return [];
            return [
              {
                label:
                  frac === 1
                    ? t("town.bank.repayAllBtn")
                    : t("town.bank.repayBtn", { amount: Math.round(amount) }),
                onPress: () => repayLoan(amount),
              },
            ];
          })}
        />
      ) : (
        <BankPanel
          title={t("town.bank.title")}
          description={t("town.bank.description")}
          cap={t("town.bank.cap", { amount: cap })}
          chipLabel={t("town.bank.termLabel")}
          terms={LOAN_TERM_MONTHS_STEPS.map((months) => ({
            label: t("town.bank.termMonths", { months }),
            selected: months === selectedTermMonths,
            onPress: () => setSelectedTermMonths(months),
          }))}
          rateLine={t("town.bank.ratePreview", {
            pct: (previewDayRate * 100).toFixed(2),
            days: previewTermDays,
          })}
          pills={([0.25, 0.5, 1] as const).flatMap((frac) => {
            const amount = Math.round(cap * frac);
            if (amount < 10) return [];
            return [
              {
                label: t("town.bank.takeBtn", { amount }),
                onPress: () => takeLoan(amount, selectedTermMonths),
              },
            ];
          })}
        />
      )}

      <ChartPanel title={t("town.chartTitle")}>
        {(w, h) => (
          <PriceChart
            history={state.inflationHistory}
            color={
              CHART_INK[
                state.inflationRate > 0.01
                  ? "crisis"
                  : state.inflationRate > 0.005
                    ? "heating"
                    : state.inflationRate > -0.001
                      ? "calm"
                      : "cooling"
              ]
            }
            width={w}
            height={h}
            strokeWidth={3}
            interactive
          />
        )}
      </ChartPanel>

      <StretchPanel frame="upgrades" title={t("town.upgradesSectionLabel")}>
        {UPGRADES.map((u) => {
          const level = state.upgrades[u.id];
          const maxed = level >= u.maxLevel;
          const cost = maxed ? 0 : upgradeCost(u, level);
          const disabled = maxed || state.cash < cost;
          const effect = level > 0 ? u.effectLabel(level) : null;
          return (
            <TownItemCard
              key={u.id}
              art={BUILDING_ART[u.id]}
              fallbackIcon={u.icon}
              name={t(u.nameKey)}
              tag={t("town.upgradeLevel", { level, max: u.maxLevel })}
              description={t(u.descriptionKey)}
              effect={effect ? t(effect.key, effect.params) : undefined}
              pips={[level, u.maxLevel]}
              buttonLabel={maxed ? t("town.upgradeMaxed") : `${cost} 🪙`}
              buttonDisabled={disabled}
              onPress={() => upgrade(u.id)}
            />
          );
        })}
      </StretchPanel>

      <StretchPanel frame="properties" title={t("town.propertiesSectionLabel")}>
        {PROPERTIES.map((p) => {
          const owned = state.ownedProperties.includes(p.id);
          const disabled = owned || state.cash < p.cost;
          const effect = p.effectLabel();
          return (
            <TownItemCard
              key={p.id}
              art={BUILDING_ART[p.id]}
              fallbackIcon={p.icon}
              name={t(p.nameKey)}
              tag={owned ? t("town.propertyOwnedLabel") : undefined}
              description={t(p.descriptionKey)}
              effect={t(effect.key, effect.params)}
              buttonLabel={owned ? t("town.propertyOwnedBtn") : `${p.cost} 🪙`}
              buttonDisabled={disabled}
              onPress={() => buyProperty(p.id)}
            />
          );
        })}
      </StretchPanel>

      {(state.workersUnlocked || netWorth >= WORKERS_UNLOCK_NET_WORTH * 0.5) && (
        <>
          <SectionLabel text={t("town.workersSectionLabel")} color="#e0a13f" />
          {!state.workersUnlocked ? (
            <View style={styles.workersLockedCard}>
              <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
              <Text style={styles.doctrineLocked}>
                🔒 {t("town.workersLockedNote", { amount: WORKERS_UNLOCK_NET_WORTH })}
              </Text>
              <View style={styles.lockedTrack}>
                <View
                  style={[
                    styles.lockedFill,
                    { width: `${Math.max(0, Math.min(1, netWorth / WORKERS_UNLOCK_NET_WORTH)) * 100}%` },
                  ]}
                />
              </View>
            </View>
          ) : (
            <Text style={styles.workersNote}>{t("town.workersNote")}</Text>
          )}
        </>
      )}
      {state.workersUnlocked &&
        GOODS.filter((g) => isGoodUnlocked(g, state)).map((g) => {
          const count = state.workers[g.id];
          return (
            <View key={g.id} style={styles.workerCard}>
              <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
              <View style={[styles.workerAccent, { backgroundColor: g.color }]} />
              <GoodIcon id={g.id} fallback={g.icon} size={22} style={styles.workerIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.workerName}>{t(g.nameKey)}</Text>
                {count > 0 && (
                  <Text style={styles.workerInfo}>
                    {t("town.workerWage", {
                      amount: (count * WORKER_WAGE_PER_TICK * TICKS_PER_GAME_DAY).toFixed(1),
                    })}
                    {" · "}
                    {t("town.workerBonus", {
                      pct: Math.round(count * WORKER_PRODUCTION_BONUS_PER_WORKER * 100),
                    })}
                  </Text>
                )}
                <View style={styles.workerPipRow}>
                  {Array.from({ length: maxWorkersPerGood }).map((_, i) => (
                    <View key={i} style={[styles.workerPip, i < count && styles.workerPipFilled]} />
                  ))}
                </View>
              </View>
              <View style={styles.workerBtnCol}>
                <ScalePressable
                  disabled={count >= maxWorkersPerGood}
                  onPress={() => hireWorker(g.id)}
                  style={[styles.workerBtn, count >= maxWorkersPerGood && styles.workerBtnDisabled]}
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

      {(() => {
        const goodCount = state.eventLog.filter((e) => e.tone === "good").length;
        const badCount = state.eventLog.filter((e) => e.tone === "bad").length;
        const neutralCount = state.eventLog.length - goodCount - badCount;
        const shown = showAllEvents ? state.eventLog : state.eventLog.slice(0, 5);
        // The filter bar's three icons are painted on the banner strip (853-px
        // art, icon centres at 610 / 688 / 760); their counts sit just right.
        const counts = [
          { x: 632, n: goodCount, color: INK_GREEN },
          { x: 710, n: badCount, color: "#e8c777" },
          { x: 782, n: neutralCount, color: "#f6e2a0" },
        ];
        return (
          <StretchPanel
            frame="events"
            title={t("town.eventsSectionLabel")}
            topOverlay={(w) =>
              state.eventLog.length === 0
                ? null
                : counts.map((c) => (
                    <Text
                      key={c.x}
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        left: (c.x / 853) * w,
                        top: (10 / 853) * w,
                        width: (46 / 853) * w,
                        height: (34 / 853) * w,
                        lineHeight: (34 / 853) * w,
                        fontSize: Math.max(10, (26 / 853) * w),
                        color: c.color === INK_GREEN ? "#7fe39a" : c.color,
                        fontFamily: FONT.black,
                      }}
                    >
                      {c.n}
                    </Text>
                  ))
            }
          >
            {state.eventLog.length === 0 && <Text style={styles.eventsEmpty}>{t("town.eventsEmpty")}</Text>}
            {shown.map((event, i) => (
              <EventRow
                key={event.id}
                tone={event.tone}
                text={resolveEventMessage(state.language, event)}
                last={i === shown.length - 1}
              />
            ))}
            {state.eventLog.length > 5 && (
              <View style={styles.eventsToggle}>
                <GoldButton
                  label={
                    showAllEvents
                      ? t("town.eventsShowLess")
                      : t("town.eventsShowMore", { count: state.eventLog.length - 5 })
                  }
                  onPress={() => setShowAllEvents((v) => !v)}
                  height={30}
                />
              </View>
            )}
          </StretchPanel>
        );
      })()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  eventsEmpty: {
    color: INK,
    fontFamily: FONT.medium,
    fontSize: 12,
    paddingVertical: 10,
    textAlign: "center",
  },
  eventsToggle: { alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  doctrineCard: {
    borderRadius: RADIUS.feature,
    padding: SPACING.md,
    marginBottom: PANEL_GAP,
    overflow: "hidden",
    ...cardShadow,
  },
  doctrineHead: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.xs },
  doctrineIcon: { fontSize: 20, marginRight: SPACING.sm },
  doctrineName: {
    color: COLORS.textPrimary,
    fontSize: TYPE.body,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
  },
  doctrineBonus: {
    color: COLORS.positive,
    fontSize: TYPE.micro,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
  doctrinePenalty: {
    color: COLORS.negative,
    fontSize: TYPE.micro,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    marginTop: 2,
  },
  doctrinePrompt: { color: COLORS.textMuted, fontSize: TYPE.micro, marginBottom: SPACING.sm, lineHeight: 15 },
  doctrineBtn: { borderRadius: 12, paddingVertical: 10, alignItems: "center", overflow: "hidden" },
  doctrineBtnText: { color: "#1a1410", fontWeight: "800", fontFamily: FONT.black, fontSize: 13 },
  doctrineLocked: { color: COLORS.textMuted, fontSize: TYPE.micro },
  body: { padding: SCREEN_PADDING, paddingBottom: 40 },
  taxHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  taxTitle: {
    color: COLORS.textPrimary,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    fontSize: TYPE.body,
  },
  taxDesc: { color: COLORS.textMuted, fontSize: TYPE.caption, marginTop: 6, marginBottom: SPACING.md },
  prestigeCard: {
    borderRadius: RADIUS.feature,
    padding: SPACING.lg,
    marginBottom: PANEL_GAP,
    overflow: "hidden",
    ...cardShadow,
  },
  prestigeLevel: {
    color: COLORS.accent,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    fontSize: TYPE.label,
  },
  prestigeBonus: {
    color: COLORS.positive,
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    marginTop: 6,
  },
  prestigeLocked: {
    color: COLORS.textMuted,
    fontSize: TYPE.caption,
    marginTop: SPACING.sm + 2,
    marginBottom: SPACING.sm,
  },
  prestigeProgress: {
    color: COLORS.accent,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
  prestigePointsLabel: {
    color: COLORS.accent,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    marginBottom: SPACING.sm + 2,
  },
  legendaryPointsLabel: {
    color: "#c77df0",
    fontSize: TYPE.label,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    marginBottom: SPACING.sm + 2,
  },
  perkRequires: {
    color: COLORS.negative,
    fontSize: TYPE.micro,
    marginTop: 3,
    fontWeight: WEIGHT.medium,
    fontFamily: FONT.medium,
  },
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
  prestigeBtnText: {
    color: COLORS.onLight,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    fontSize: TYPE.body,
  },
  workersNote: { color: COLORS.textMuted, fontSize: TYPE.caption, marginBottom: SPACING.sm + 2 },
  workersLockedCard: {
    borderRadius: RADIUS.feature,
    padding: SPACING.md,
    marginBottom: PANEL_GAP,
    overflow: "hidden",
    ...cardShadow,
  },
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
  workerIcon: { marginRight: SPACING.md },
  workerName: {
    color: COLORS.textPrimary,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    fontSize: TYPE.body,
  },
  workerInfo: {
    color: COLORS.positive,
    fontSize: TYPE.micro,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    marginTop: 2,
  },
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
  workerBtnText: {
    color: COLORS.accent,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    fontSize: TYPE.title,
  },
  upgradeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    marginBottom: SPACING.sm + 2,
    overflow: "hidden",
    minHeight: 80,
  },
  upgradeIcon: { fontSize: 24, marginRight: SPACING.md },
  upgradeTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  upgradeName: {
    color: COLORS.textPrimary,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    fontSize: TYPE.body,
  },
  upgradeLevel: {
    color: COLORS.textMuted,
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.medium,
    fontFamily: FONT.medium,
  },
  upgradeDesc: { color: COLORS.textMuted, fontSize: TYPE.caption, marginTop: 2 },
  upgradeEffect: {
    color: COLORS.positive,
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    marginTop: 3,
  },
  upgradeBtn: {
    borderRadius: RADIUS.chip,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm + 2,
    marginLeft: SPACING.sm + 2,
    overflow: "hidden",
  },
  upgradeBtnDisabled: { backgroundColor: "#4a4032" },
  upgradeBtnText: {
    color: COLORS.onLight,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    fontSize: TYPE.label,
  },
});
