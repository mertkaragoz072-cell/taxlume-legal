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
  plainTitle,
  RankPanel,
  TaxPanel,
} from "../components/TownPanels";
import { DoctrinePanel } from "../components/DoctrinePanel";
import { WorkersLockedPanel } from "../components/WorkersLockedPanel";
import { PerkCard, PointsLine } from "../components/PerkCard";
import { PrestigePanel } from "../components/PrestigePanel";
import { BUILDING_ART, EventRow, FactorRow, INK, INK_GREEN, TownItemCard } from "../components/TownCards";
import { TownChatterTicker } from "../components/TownChatterTicker";
import { happinessFor } from "../components/TownSquareScene";
import { CARD_GRADIENT, COLORS, SCREEN_PADDING, FONT, RADIUS, SPACING, TYPE, WEIGHT } from "../theme";

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
        <PrestigePanel
          title={plainTitle(t("town.prestige.title"))}
          level={
            state.prestigeLevel > 0 ? t("town.prestige.level", { level: state.prestigeLevel }) : undefined
          }
          description={t("town.prestige.description")}
          bonus={
            state.prestigeLevel > 0
              ? t("town.prestige.bonus", {
                  pct: Math.round(state.prestigeLevel * PRESTIGE_PRODUCTION_BONUS_PER_LEVEL * 100),
                  cash: state.prestigeLevel * PRESTIGE_CASH_BONUS_PER_LEVEL,
                })
              : undefined
          }
          ready={prestigeReady}
          note={t("town.prestige.locked", { target: PRESTIGE_UNLOCK_NET_WORTH })}
          pct={prestigePct}
          progressText={t("town.prestige.progress", {
            current: Math.floor(netWorth),
            target: PRESTIGE_UNLOCK_NET_WORTH,
          })}
          armed={prestigeArmed}
          buttonLabel={prestigeArmed ? t("town.prestige.confirmButton") : t("town.prestige.button")}
          pulseScale={pulseScale}
          onPress={() => {
            if (!prestigeArmed) {
              setPrestigeArmed(true);
              return;
            }
            prestige();
            setPrestigeArmed(false);
          }}
        />
      )}

      {(activeDoctrine || netWorth >= DOCTRINE_UNLOCK_NET_WORTH * 0.5) && (
        <DoctrinePanel
          title={t("doctrine.activeLabel")}
          state={
            activeDoctrine
              ? {
                  kind: "active",
                  icon: activeDoctrine.icon,
                  name: t(activeDoctrine.nameKey),
                  bonus: t(activeDoctrine.bonusKey),
                  penalty: t(activeDoctrine.penaltyKey),
                }
              : netWorth >= DOCTRINE_UNLOCK_NET_WORTH
                ? {
                    kind: "choose",
                    prompt: t("doctrine.choosePrompt"),
                    buttonLabel: t("doctrine.chooseBtn"),
                    onChoose: onOpenDoctrine,
                  }
                : {
                    kind: "locked",
                    note: `🔒 ${t("doctrine.lockedNote", { amount: DOCTRINE_UNLOCK_NET_WORTH })}`,
                  }
          }
        />
      )}

      {/* Prestige perks are spent out of prestigePoints, which stay at 0
          until the player has actually prestiged once — before that this
          whole list (and its "0 points" label) has nothing to say. */}
      {state.prestigeLevel > 0 && (
        <>
          <SectionLabel text={t("town.prestige.perksSectionLabel")} color={COLORS.accent} />
          <PointsLine text={plainTitle(t("town.prestige.pointsLabel", { points: state.prestigePoints }))} />
          {state.legendaryUnlocked && (
            <PointsLine
              tone="violet"
              text={t("town.prestige.legendaryPointsLabel", { points: state.legendaryPoints })}
              medal={false}
            />
          )}
          {PRESTIGE_PERKS.map((perk) => {
            const unlocked = state.prestigePerks.includes(perk.id);
            const requiresDef = perk.requires ? PRESTIGE_PERKS.find((p) => p.id === perk.requires) : null;
            const requirementMet = !perk.requires || state.prestigePerks.includes(perk.requires);
            const disabled = unlocked || !requirementMet || state.prestigePoints < perk.cost;
            const effect = perk.effectLabel();
            return (
              <PerkCard
                key={perk.id}
                icon={perk.icon}
                name={t(perk.nameKey)}
                tag={unlocked ? t("town.propertyOwnedLabel") : undefined}
                description={t(perk.descriptionKey)}
                effect={t(effect.key, effect.params)}
                requires={
                  !unlocked && !requirementMet && requiresDef
                    ? t("town.prestige.perkRequires", { name: t(requiresDef.nameKey) })
                    : undefined
                }
                buttonLabel={
                  unlocked
                    ? t("town.prestige.perkUnlockedBtn")
                    : t("town.prestige.perkUnlockBtn", { cost: perk.cost })
                }
                buttonDisabled={disabled}
                onPress={() => unlockPrestigePerk(perk.id)}
              />
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
            <WorkersLockedPanel
              note={t("town.workersLockedNote", { amount: WORKERS_UNLOCK_NET_WORTH })}
              pct={netWorth / WORKERS_UNLOCK_NET_WORTH}
            />
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
  body: { padding: SCREEN_PADDING, paddingBottom: 40 },
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
});
