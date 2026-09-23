import React, { useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { GradientFill } from "../components/GradientFill";
import { PriceChart } from "../components/PriceChart";
import { ScalePressable } from "../components/ScalePressable";
import { SectionLabel } from "../components/SectionLabel";
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID, AchievementId } from "../economy/achievements";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS } from "../economy/goods";
import { MINI_QUEST_TEMPLATES_BY_ID } from "../economy/miniQuests";
import { QUEST_TEMPLATES_BY_ID } from "../economy/quests";
import { RESEARCH_NODES } from "../economy/research";
import { decodeSaveCode, encodeSaveCode } from "../economy/saveCode";
import { TOWNS } from "../economy/towns";
import { isGoodUnlocked, TICK_MS } from "../economy/useEconomy";
import { WEEKLY_CHALLENGE_TEMPLATES_BY_ID } from "../economy/weeklyChallenges";
import {
  CARD_GRADIENT,
  cardShadow,
  COLORS,
  FONT,
  GOLD_GRADIENT,
  RADIUS,
  SPACING,
  TYPE,
  UNLOCKED_CARD_GRADIENT,
  WEIGHT,
  withAlpha,
} from "../theme";

const screenWidth = Dimensions.get("window").width;
const netWorthChartWidth = Math.min(screenWidth - 48, 420);

type ImportFeedback = { type: "success" | "error"; text: string };

export function AchievementsScreen() {
  const { state, netWorth, t, hydrate, formatCoins } = useEconomyContext();
  const unlockedCount = state.unlockedAchievements.length;
  const completedQuestCount = state.dailyQuests.filter((q) => q.completed).length;
  const miniQuest = state.activeMiniQuest;
  const miniQuestTemplate = miniQuest ? MINI_QUEST_TEMPLATES_BY_ID[miniQuest.templateId] : null;
  const weeklyChallenge = state.weeklyChallenge;
  const weeklyChallengeTemplate = weeklyChallenge
    ? WEEKLY_CHALLENGE_TEMPLATES_BY_ID[weeklyChallenge.templateId]
    : null;

  const [copyFeedback, setCopyFeedback] = useState(false);
  const [importText, setImportText] = useState("");
  const [importArmed, setImportArmed] = useState(false);
  const [importFeedback, setImportFeedback] = useState<ImportFeedback | null>(null);

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(encodeSaveCode(state));
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2500);
  };

  const handleImport = () => {
    // Validate before arming — a garbage paste should say so immediately,
    // not make the player tap twice to discover that.
    const result = decodeSaveCode(importText);
    if (!result.ok) {
      setImportFeedback({ type: "error", text: t(`backup.error.${result.reason}`) });
      setImportArmed(false);
      return;
    }
    if (!importArmed) {
      setImportArmed(true);
      return;
    }
    hydrate(result.state);
    setImportFeedback({ type: "success", text: t("backup.restored") });
    setImportText("");
    setImportArmed(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={styles.summaryCard}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryBig}>
            {t("achievements.unlockedCount", { count: unlockedCount, total: ACHIEVEMENTS.length })}
          </Text>
          <Text style={styles.summaryLabel}>{t("achievements.unlockedLabel")}</Text>
        </View>
        <View style={styles.streakRow}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakText}>
            {state.streak.count > 0
              ? t("achievements.streak", { count: state.streak.count })
              : t("achievements.noStreak")}
          </Text>
        </View>
      </View>

      {state.unlockedAchievements.length > 0 && (
        <>
          <SectionLabel text={t("achievements.hallOfFameSectionLabel")} color="#c58ee0" />
          <View style={styles.hallOfFameRow}>
            {[...state.unlockedAchievements]
              .slice(-3)
              .reverse()
              .map((id) => {
                const a = ACHIEVEMENTS_BY_ID[id as AchievementId];
                if (!a) return null;
                return (
                  <View key={id} style={styles.hallOfFameChip}>
                    <GradientFill colors={UNLOCKED_CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
                    <Text style={styles.hallOfFameIcon}>{a.icon}</Text>
                    <Text style={styles.hallOfFameTitle} numberOfLines={2}>
                      {t(a.titleKey)}
                    </Text>
                  </View>
                );
              })}
          </View>
        </>
      )}

      <SectionLabel text={t("achievements.statsSectionLabel")} color="#e8c777" />
      <View style={styles.statsCard}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{state.stats.totalTrades}</Text>
            <Text style={styles.statLabel}>{t("achievements.stats.totalTrades")}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{state.stats.totalCaravansCompleted}</Text>
            <Text style={styles.statLabel}>{t("achievements.stats.caravansCompleted")}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{state.stats.townsTradedWith.length}</Text>
            <Text style={styles.statLabel}>{t("achievements.stats.townsTradedWith")}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{state.stats.loansRepaid}</Text>
            <Text style={styles.statLabel}>{t("achievements.stats.loansRepaid")}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{state.stats.contractsWon}</Text>
            <Text style={styles.statLabel}>{t("achievements.stats.contractsWon")}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{state.prestigeLevel}</Text>
            <Text style={styles.statLabel}>{t("achievements.stats.prestigeLevel")}</Text>
          </View>
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                { color: state.stats.totalRealizedProfit >= 0 ? "#3fae5c" : "#c94b4b" },
              ]}
            >
              {formatCoins(state.stats.totalRealizedProfit)}
            </Text>
            <Text style={styles.statLabel}>{t("achievements.stats.totalRealizedProfit")}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>🔥{state.stats.bestTradeStreak}</Text>
            <Text style={styles.statLabel}>{t("achievements.stats.bestTradeStreak")}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>🏆{formatCoins(state.bestNetWorthEver)}</Text>
            <Text style={styles.statLabel}>{t("achievements.stats.bestNetWorthEver")}</Text>
          </View>
        </View>
      </View>

      <SectionLabel text={t("achievements.netWorthHistorySectionLabel")} color="#5fd884" />
      <View style={styles.netWorthChartCard}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <Text style={styles.netWorthChartValue}>{formatCoins(netWorth)}</Text>
        <PriceChart
          history={state.netWorthHistory}
          color="#5fd884"
          width={netWorthChartWidth}
          height={100}
          strokeWidth={3}
          interactive
        />
        <View style={styles.rivalRow}>
          <Text style={styles.rivalLabel}>
            🏘️ {t("achievements.rivalTownLabel", { amount: formatCoins(state.rivalNetWorth) })}
          </Text>
          <Text style={[styles.rivalStatus, { color: state.rivalCurrentlyAhead ? "#c94b4b" : "#3fae5c" }]}>
            {state.rivalCurrentlyAhead ? t("achievements.rivalAhead") : t("achievements.rivalBehind")}
          </Text>
        </View>
      </View>

      {miniQuest && miniQuestTemplate && (
        <>
          <SectionLabel text={t("achievements.miniQuestSectionLabel")} color="#f0776a" />
          {(() => {
            const current = Math.max(
              0,
              Math.min(miniQuestTemplate.metric(state.dailyProgress) - miniQuest.baseline, miniQuest.target)
            );
            const pct = miniQuest.target > 0 ? current / miniQuest.target : 0;
            const secondsLeft = Math.ceil(
              (Math.max(0, miniQuest.expiresAtTick - state.tick) * TICK_MS) / 1000
            );
            return (
              <View style={styles.miniQuestCard}>
                <GradientFill colors={UNLOCKED_CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
                <Text style={styles.icon}>{miniQuestTemplate.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.title, styles.titleUnlocked]}>{t(miniQuestTemplate.titleKey)}</Text>
                    <Text style={styles.reward}>+{miniQuest.reward} 🪙</Text>
                  </View>
                  <Text style={styles.description}>{t(miniQuestTemplate.descriptionKey)}</Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressFill, styles.miniQuestProgressFill, { width: `${pct * 100}%` }]}
                    />
                  </View>
                  <View style={styles.miniQuestFooterRow}>
                    <Text style={styles.progressText}>
                      {Math.floor(current)} / {miniQuest.target}
                    </Text>
                    <Text style={styles.miniQuestTicksLeft}>
                      {t("achievements.miniQuestTicksLeft", { seconds: secondsLeft })}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })()}
        </>
      )}

      {weeklyChallenge && weeklyChallengeTemplate && (
        <>
          <SectionLabel text={t("achievements.weeklyChallengeSectionLabel")} color="#e8c777" />
          {(() => {
            const current = Math.max(
              0,
              Math.min(
                weeklyChallengeTemplate.metric(state.stats) - weeklyChallenge.startValue,
                weeklyChallengeTemplate.target
              )
            );
            const pct = weeklyChallengeTemplate.target > 0 ? current / weeklyChallengeTemplate.target : 0;
            return (
              <View style={styles.miniQuestCard}>
                <GradientFill colors={UNLOCKED_CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
                <Text style={styles.icon}>{weeklyChallengeTemplate.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.title, styles.titleUnlocked]}>
                      {t(weeklyChallengeTemplate.titleKey)}
                    </Text>
                    <Text style={styles.reward}>
                      {t("achievements.weeklyChallengeReward", { amount: weeklyChallengeTemplate.reward })}
                    </Text>
                  </View>
                  <Text style={styles.description}>
                    {t(weeklyChallengeTemplate.descriptionKey, { target: weeklyChallengeTemplate.target })}
                  </Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressFill, styles.miniQuestProgressFill, { width: `${pct * 100}%` }]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {weeklyChallenge.claimed
                      ? t("achievements.weeklyChallengeClaimed")
                      : t("achievements.weeklyChallengeProgress", {
                          current: Math.floor(current),
                          target: weeklyChallengeTemplate.target,
                        })}
                  </Text>
                </View>
              </View>
            );
          })()}
        </>
      )}

      <View style={styles.questHeaderRow}>
        <SectionLabel text={t("achievements.dailyQuestsLabel")} color="#6fb8f2" />
        <Text style={styles.questCount}>
          {t("achievements.dailyQuestsCount", {
            count: completedQuestCount,
            total: state.dailyQuests.length,
          })}
        </Text>
      </View>
      <Text style={styles.questNote}>{t("achievements.dailyQuestsNote")}</Text>
      {state.dailyQuests.map((q) => {
        const template = QUEST_TEMPLATES_BY_ID[q.templateId];
        if (!template) return null;
        const current = Math.min(template.progress(state.dailyProgress), q.target);
        const pct = q.target > 0 ? Math.min(1, current / q.target) : q.completed ? 1 : 0;
        return (
          <View key={q.id} style={[styles.card, q.completed && styles.cardUnlocked]}>
            <GradientFill
              colors={q.completed ? UNLOCKED_CARD_GRADIENT : CARD_GRADIENT}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            />
            <Text style={[styles.icon, !q.completed && styles.iconLocked]}>
              {q.completed ? "✅" : template.icon}
            </Text>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, q.completed && styles.titleUnlocked]}>
                  {t(template.titleKey)}
                </Text>
                <Text style={styles.reward}>+{q.reward} 🪙</Text>
              </View>
              <Text style={styles.description}>{t(template.descriptionKey)}</Text>
              {!q.completed && (
                <>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
                  </View>
                  <Text style={styles.progressText}>
                    {Math.floor(current)} / {q.target}
                  </Text>
                </>
              )}
            </View>
          </View>
        );
      })}

      <SectionLabel text={t("achievements.sectionLabel")} color="#c58ee0" />
      {ACHIEVEMENTS.map((a) => {
        const unlocked = state.unlockedAchievements.includes(a.id);
        const current = Math.min(a.progress(state, netWorth), a.target);
        const pct = a.target > 0 ? Math.min(1, current / a.target) : unlocked ? 1 : 0;
        return (
          <View key={a.id} style={[styles.card, unlocked && styles.cardUnlocked]}>
            <GradientFill
              colors={unlocked ? UNLOCKED_CARD_GRADIENT : CARD_GRADIENT}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            />
            <Text style={[styles.icon, !unlocked && styles.iconLocked]}>{unlocked ? a.icon : "🔒"}</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, unlocked && styles.titleUnlocked]}>{t(a.titleKey)}</Text>
                <Text style={styles.reward}>+{a.reward} 🪙</Text>
              </View>
              <Text style={styles.description}>{t(a.descriptionKey)}</Text>
              {!unlocked && (
                <>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
                  </View>
                  <Text style={styles.progressText}>
                    {Math.floor(current)} / {a.target}
                  </Text>
                </>
              )}
            </View>
          </View>
        );
      })}

      <SectionLabel text={t("achievements.compendiumSectionLabel")} color="#6fb8f2" />
      <View style={styles.compendiumCard}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <Text style={styles.compendiumGroupLabel}>
          {t("achievements.compendiumGoods", {
            count: GOODS.filter((g) => isGoodUnlocked(g, state)).length,
            total: GOODS.length,
          })}
        </Text>
        <View style={styles.compendiumGrid}>
          {GOODS.map((g) => {
            const unlocked = isGoodUnlocked(g, state);
            return (
              <View key={g.id} style={[styles.compendiumChip, !unlocked && styles.compendiumChipLocked]}>
                <Text style={styles.compendiumIcon}>{unlocked ? g.icon : "🔒"}</Text>
              </View>
            );
          })}
        </View>

        <Text style={[styles.compendiumGroupLabel, styles.compendiumGroupLabelSpaced]}>
          {t("achievements.compendiumTowns", {
            count: state.stats.townsTradedWith.length,
            total: TOWNS.length,
          })}
        </Text>
        <View style={styles.compendiumGrid}>
          {TOWNS.map((tn) => {
            const visited = state.stats.townsTradedWith.includes(tn.id);
            return (
              <View key={tn.id} style={[styles.compendiumChip, !visited && styles.compendiumChipLocked]}>
                <Text style={styles.compendiumIcon}>{visited ? tn.icon : "🔒"}</Text>
              </View>
            );
          })}
        </View>

        <Text style={[styles.compendiumGroupLabel, styles.compendiumGroupLabelSpaced]}>
          {t("achievements.compendiumResearch", {
            count: state.researched.length,
            total: RESEARCH_NODES.length,
          })}
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${(state.researched.length / RESEARCH_NODES.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      <SectionLabel text={t("backup.sectionLabel")} color="#a0917a" />
      <View style={styles.backupCard}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <Text style={styles.description}>{t("backup.description")}</Text>
        <ScalePressable onPress={handleCopyCode} style={styles.backupBtn} scaleTo={0.97}>
          <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
          <Text style={styles.backupBtnText}>{t("backup.copyBtn")}</Text>
        </ScalePressable>
        {copyFeedback && <Text style={styles.backupFeedbackSuccess}>{t("backup.copied")}</Text>}

        <Text style={[styles.description, styles.backupImportDesc]}>{t("backup.importDescription")}</Text>
        <TextInput
          value={importText}
          onChangeText={(text) => {
            setImportText(text);
            setImportArmed(false);
            setImportFeedback(null);
          }}
          placeholder={t("backup.importPlaceholder")}
          placeholderTextColor="#6b5f4d"
          style={styles.backupInput}
          multiline
          numberOfLines={3}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <ScalePressable
          disabled={importText.trim().length === 0}
          onPress={handleImport}
          style={[styles.backupBtn, importText.trim().length === 0 && styles.backupBtnDisabled]}
          scaleTo={0.97}
        >
          {importText.trim().length > 0 && (
            <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
          )}
          <Text style={styles.backupBtnText}>
            {importArmed ? t("backup.confirmImportBtn") : t("backup.importBtn")}
          </Text>
        </ScalePressable>
        {importFeedback && (
          <Text
            style={
              importFeedback.type === "success" ? styles.backupFeedbackSuccess : styles.backupFeedbackError
            }
          >
            {importFeedback.text}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: SPACING.lg, paddingBottom: 40 },
  summaryCard: {
    borderRadius: RADIUS.feature,
    padding: SPACING.lg,
    marginBottom: SPACING.xl - 4,
    overflow: "hidden",
    ...cardShadow,
  },
  summaryRow: { flexDirection: "row", alignItems: "baseline", marginBottom: SPACING.sm },
  summaryBig: {
    color: COLORS.accent,
    fontSize: TYPE.display,
    fontFamily: FONT.display,
    marginRight: SPACING.sm,
  },
  summaryLabel: { color: COLORS.textMuted, fontSize: TYPE.label },
  streakRow: { flexDirection: "row", alignItems: "center" },
  streakEmoji: { fontSize: TYPE.title, marginRight: 6 },
  streakText: { color: COLORS.textPrimary, fontSize: TYPE.label },
  statsCard: {
    borderRadius: RADIUS.feature,
    padding: SPACING.lg,
    marginBottom: SPACING.xl - 4,
    overflow: "hidden",
    ...cardShadow,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap" },
  statItem: { width: "33.33%", marginBottom: SPACING.md, alignItems: "center" },
  statValue: {
    color: COLORS.accent,
    fontSize: TYPE.heading,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
  },
  statLabel: { color: COLORS.textMuted, fontSize: TYPE.micro, textAlign: "center", marginTop: 2 },
  hallOfFameRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.xl - 4 },
  hallOfFameChip: {
    flex: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.sm + 2,
    alignItems: "center",
    overflow: "hidden",
    ...cardShadow,
  },
  hallOfFameIcon: { fontSize: TYPE.heading, marginBottom: 4 },
  hallOfFameTitle: {
    color: COLORS.textPrimary,
    fontSize: TYPE.micro,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    textAlign: "center",
  },
  netWorthChartCard: {
    borderRadius: RADIUS.feature,
    padding: SPACING.lg,
    marginBottom: SPACING.xl - 4,
    overflow: "hidden",
    ...cardShadow,
  },
  netWorthChartValue: {
    color: "#5fd884",
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    fontSize: TYPE.heading,
    marginBottom: 6,
  },
  rivalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: "#3a2d1e",
  },
  rivalLabel: { color: COLORS.textMuted, fontSize: TYPE.caption },
  rivalStatus: { fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.caption },
  compendiumCard: {
    borderRadius: RADIUS.feature,
    padding: SPACING.lg,
    marginBottom: SPACING.xl - 4,
    overflow: "hidden",
    ...cardShadow,
  },
  compendiumGroupLabel: {
    color: COLORS.textMuted,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    marginBottom: SPACING.sm,
  },
  compendiumGroupLabelSpaced: { marginTop: SPACING.md },
  compendiumGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  compendiumChip: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.chip,
    backgroundColor: withAlpha(COLORS.accent, 0.12),
    alignItems: "center",
    justifyContent: "center",
  },
  compendiumChipLocked: { backgroundColor: "#1a1410", opacity: 0.5 },
  compendiumIcon: { fontSize: TYPE.title },
  questHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  questCount: { color: "#e8c777", fontSize: 11, fontWeight: "700", fontFamily: FONT.bold },
  questNote: { color: "#6b5f4d", fontSize: 10, marginBottom: 10 },
  card: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    opacity: 0.7,
    overflow: "hidden",
  },
  cardUnlocked: { opacity: 1, borderWidth: 1, borderColor: "#e8c777", ...cardShadow },
  miniQuestCard: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e8c777",
    overflow: "hidden",
    ...cardShadow,
  },
  miniQuestProgressFill: { backgroundColor: "#e8c777" },
  miniQuestFooterRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  miniQuestTicksLeft: { color: "#e8c777", fontSize: 10, fontWeight: "700", fontFamily: FONT.bold },
  icon: { fontSize: 26, marginRight: 12 },
  iconLocked: { opacity: 0.5 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "#a0917a", fontWeight: "700", fontFamily: FONT.bold, fontSize: 13 },
  titleUnlocked: { color: "#f0e3c8" },
  reward: { color: "#e8c777", fontSize: 11, fontWeight: "700", fontFamily: FONT.bold },
  description: { color: "#a0917a", fontSize: 11, marginTop: 2, marginBottom: 6 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: "#1a1410", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#e8c777", borderRadius: 2 },
  progressText: { color: "#a0917a", fontSize: 10, marginTop: 3 },
  backupCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    overflow: "hidden",
    ...cardShadow,
  },
  backupImportDesc: { marginTop: 14 },
  backupBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    overflow: "hidden",
    marginTop: 4,
  },
  backupBtnDisabled: { backgroundColor: "#4a4032" },
  backupBtnText: { color: "#1a1410", fontWeight: "800", fontFamily: FONT.black, fontSize: 13 },
  backupInput: {
    backgroundColor: "#1a1410",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#3a2d1e",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#f0e3c8",
    fontSize: 12,
    marginTop: 8,
    marginBottom: 10,
    textAlignVertical: "top",
  },
  backupFeedbackSuccess: {
    color: "#3fae5c",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: FONT.bold,
    marginTop: 8,
  },
  backupFeedbackError: {
    color: "#c94b4b",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: FONT.bold,
    marginTop: 8,
  },
});
