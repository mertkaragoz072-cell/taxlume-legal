import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Text } from "../components/AppText";
import * as Clipboard from "expo-clipboard";
import { AchievementIcon } from "../components/AchievementIcon";
import { GoodIcon } from "../components/GoodIcon";
import { GradientFill } from "../components/GradientFill";
import { PriceChart } from "../components/PriceChart";
import { ScalePressable } from "../components/ScalePressable";
import { RankCard } from "../components/RankCard";
import { formatCompactNumber } from "../utils/formatNumber";
import { GoalFrame, GoalIcon, GoalIconName, GoalProgress, GoalRibbon } from "../components/GoalPanels";
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID, AchievementId } from "../economy/achievements";
import { useEconomyContext } from "../economy/EconomyContext";
import { ERAS, eraTitleKey } from "../economy/eras";
import { useGuild } from "../guild/GuildContext";
import { rankGainLines } from "../economy/rankPerks";
import { rankTheme } from "../economy/rankTheme";
import { GUILD_UNLOCK_RANK } from "../economy/constants";
import { townRankIcon, townRankNameKey, townRankThreshold, townRankTitle } from "../economy/townRanks";
import { GOODS } from "../economy/goods";
import { MINI_QUEST_TEMPLATES_BY_ID } from "../economy/miniQuests";
import { QUEST_TEMPLATES_BY_ID } from "../economy/quests";
import { RESEARCH_NODES } from "../economy/research";
import { decodeSaveCode, encodeSaveCode } from "../economy/saveCode";
import { TOWNS } from "../economy/towns";
import { festivalMetric } from "../economy/townFestival";
import { gameDayFromTick, isGoodUnlocked, RIVAL_TOWN_GRACE_DAYS, TICK_MS } from "../economy/useEconomy";
import { WEEKLY_CHALLENGE_TEMPLATES_BY_ID } from "../economy/weeklyChallenges";
import {
  cardShadow,
  COLORS,
  CONTENT_MAX_WIDTH,
  PANEL_GAP,
  SCREEN_PADDING,
  FONT,
  GOLD_GRADIENT,
  RADIUS,
  SPACING,
  TYPE,
  WEIGHT,
  withAlpha,
} from "../theme";

/** Painted icons for the two daily-quest kinds the mockup shows; every other
 * quest keeps its emoji. */
const QUEST_ART: Record<string, GoalIconName> = {
  daily_two_towns: "store",
  daily_trade_big: "bars2",
};

type ImportFeedback = { type: "success" | "error"; text: string };

export function AchievementsScreen() {
  const { state, netWorth, t, hydrate, formatCoins } = useEconomyContext();
  const guildCtx = useGuild();
  const guildLocked = state.townRankIndex < GUILD_UNLOCK_RANK && guildCtx.status !== "in";
  // See MarketScreen's identical comment: a hook instead of a module-level
  // Dimensions.get() snapshot, which on native can be taken before the
  // bridge reports the real window size and then never self-corrects.
  // Clamped against CONTENT_MAX_WIDTH, not a raw screenWidth cap — see
  // MarketScreen for why.
  const { width: screenWidth } = useWindowDimensions();
  const netWorthChartWidth = Math.min(screenWidth, CONTENT_MAX_WIDTH) - (SCREEN_PADDING * 2 + 16);
  const unlockedCount = state.unlockedAchievements.length;
  const completedQuestCount = state.dailyQuests.filter((q) => q.completed).length;
  const miniQuest = state.activeMiniQuest;
  const miniQuestTemplate = miniQuest ? MINI_QUEST_TEMPLATES_BY_ID[miniQuest.templateId] : null;
  const weeklyChallenge = state.weeklyChallenge;
  const weeklyChallengeTemplate = weeklyChallenge
    ? WEEKLY_CHALLENGE_TEMPLATES_BY_ID[weeklyChallenge.templateId]
    : null;
  const festivalProgress = state.festivalProgress;

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

  const statCells: { label: string; value: string; icon?: GoalIconName; emoji?: string; color?: string }[] = [
    { label: t("achievements.stats.totalTrades"), value: String(state.stats.totalTrades), icon: "bars" },
    {
      label: t("achievements.stats.caravansCompleted"),
      value: String(state.stats.totalCaravansCompleted),
      icon: "cart",
    },
    {
      label: t("achievements.stats.townsTradedWith"),
      value: String(state.stats.townsTradedWith.length),
      emoji: "🏘️",
    },
    { label: t("achievements.stats.loansRepaid"), value: String(state.stats.loansRepaid), icon: "shield" },
    { label: t("achievements.stats.contractsWon"), value: String(state.stats.contractsWon), icon: "swords" },
    { label: t("achievements.stats.prestigeLevel"), value: String(state.prestigeLevel), icon: "trophy" },
    {
      label: t("achievements.stats.totalRealizedProfit"),
      value: formatCoins(state.stats.totalRealizedProfit),
      icon: "coins",
      color: state.stats.totalRealizedProfit >= 0 ? "#3fae5c" : "#c94b4b",
    },
    {
      label: t("achievements.stats.bestTradeStreak"),
      value: String(state.stats.bestTradeStreak),
      emoji: "🔥",
    },
    {
      label: t("achievements.stats.bestNetWorthEver"),
      value: formatCoins(state.bestNetWorthEver),
      icon: "bag",
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <GoalFrame>
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
      </GoalFrame>

      <GoalRibbon text={t("achievements.rankSectionLabel")} />
      <GoalFrame lit>
        {(() => {
          const idx = state.townRankIndex;
          const theme = rankTheme(idx);
          const lo = townRankThreshold(idx);
          const hi = townRankThreshold(idx + 1);
          const pct = hi > lo ? (netWorth - lo) / (hi - lo) : 0;
          return (
            <RankCard
              icon={townRankIcon(idx)}
              title={townRankTitle(idx, t)}
              next={t("achievements.rankNext", {
                title: townRankTitle(idx + 1, t),
                amount: formatCoins(hi, 0),
              })}
              pct={pct}
              accent={theme.accent}
              progressText={`${formatCompactNumber(netWorth, state.language, 0)} / ${formatCompactNumber(hi, state.language, 0)}`}
              previewTitle={t("achievements.rankPreview", { title: townRankTitle(idx + 1, t) })}
              gains={rankGainLines(idx, idx + 1, t)}
            />
          );
        })()}
      </GoalFrame>

      <GoalRibbon text={t("guild.title")} />
      <GoalFrame lit={guildCtx.status === "in"}>
        <Pressable
          disabled={guildLocked || guildCtx.status === "unavailable" || guildCtx.status === "loading"}
          onPress={guildCtx.openHub}
          accessibilityRole="button"
          accessibilityLabel={t("guild.title")}
          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <Text style={{ fontSize: 30 }}>{guildLocked ? "🔒" : "🛡️"}</Text>
          <Text style={[styles.summaryLabel, { flex: 1, marginBottom: 0 }]}>
            {guildLocked
              ? t("guild.locked", { rank: townRankTitle(GUILD_UNLOCK_RANK, t) })
              : guildCtx.status === "unavailable"
                ? t("guild.soon")
                : guildCtx.status === "in" && guildCtx.guild
                  ? t("guild.cardIn", {
                      name: guildCtx.guild.name,
                      done: Math.min(guildCtx.guild.goalProgress, guildCtx.guild.goalTarget),
                      goal: guildCtx.guild.goalTarget,
                    })
                  : t("guild.cardNone")}
          </Text>
          {!guildLocked && guildCtx.status !== "unavailable" && <Text style={styles.summaryBig}>›</Text>}
        </Pressable>
      </GoalFrame>

      <GoalRibbon text={t("achievements.eraPathSection")} />
      <GoalFrame>
        {(() => {
          const now = Math.min(state.townRankIndex, ERAS.length - 1);
          // every era already lived through, the current one, and a peek at
          // the next two — the rest stays a closed door
          const shown = Math.min(ERAS.length - 1, now + 2);
          return Array.from({ length: shown + 1 }, (_, i) => {
            const reached = i <= now;
            const theme = rankTheme(i);
            return (
              <View key={i} style={[styles.eraRow, i === now && styles.eraRowNow]}>
                <View style={[styles.eraChip, { opacity: reached ? 1 : 0.7 }]}>
                  <Text style={{ fontSize: 22 }}>{reached ? townRankIcon(i) : "🔒"}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[styles.eraName, { color: reached ? theme.accent : "#d8cba8" }]}
                    numberOfLines={1}
                  >
                    {t(townRankNameKey(i))}
                    {i === now ? `  ·  ${t("achievements.eraPathNow")}` : ""}
                  </Text>
                  <Text style={styles.eraSub} numberOfLines={2}>
                    {reached
                      ? t(eraTitleKey(i))
                      : t("achievements.eraPathLocked", { amount: formatCoins(townRankThreshold(i), 0) })}
                  </Text>
                </View>
              </View>
            );
          });
        })()}
      </GoalFrame>

      {state.unlockedAchievements.length > 0 && (
        <>
          <GoalRibbon text={t("achievements.hallOfFameSectionLabel")} />
          <View style={styles.hallOfFameRow}>
            {[...state.unlockedAchievements]
              .slice(-3)
              .reverse()
              .map((id) => {
                const a = ACHIEVEMENTS_BY_ID[id as AchievementId];
                if (!a) return null;
                return (
                  <View key={id} style={styles.hallOfFameChip}>
                    <AchievementIcon
                      id={a.id}
                      fallback={a.icon}
                      size={TYPE.heading}
                      style={{ marginBottom: 4 }}
                    />
                    <Text style={styles.hallOfFameTitle} numberOfLines={2}>
                      {t(a.titleKey)}
                    </Text>
                  </View>
                );
              })}
          </View>
        </>
      )}

      <GoalRibbon text={t("achievements.statsSectionLabel")} />
      <GoalFrame contentStyle={styles.statsBody}>
        <View style={styles.statsGrid}>
          {statCells.map((cell, i) => (
            <View
              key={cell.label}
              style={[
                styles.statItem,
                i % 3 !== 2 && styles.statDivV,
                i < statCells.length - 3 && styles.statDivH,
              ]}
            >
              {cell.icon ? (
                <GoalIcon name={cell.icon} size={26} style={{ marginBottom: 3 }} />
              ) : (
                <Text style={styles.statEmoji}>{cell.emoji}</Text>
              )}
              <Text
                style={[styles.statValue, cell.color ? { color: cell.color } : null]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {cell.value}
              </Text>
              <Text style={styles.statLabel} numberOfLines={2}>
                {cell.label}
              </Text>
            </View>
          ))}
        </View>
      </GoalFrame>

      <GoalRibbon text={t("achievements.netWorthHistorySectionLabel")} />
      <GoalFrame>
        <Text style={styles.netWorthChartValue}>{formatCoins(netWorth)}</Text>
        <PriceChart
          history={state.netWorthHistory}
          color="#5fd884"
          width={netWorthChartWidth}
          height={100}
          strokeWidth={3}
          interactive
        />
        {/* Hidden for the first few days, like the event that announces it.
            A town starts worth about what the rival does, so a brand new
            player opening this tab would find a red "ahead of you" badge
            before they had bought anything. */}
        {gameDayFromTick(state.tick) > RIVAL_TOWN_GRACE_DAYS && (
          <View style={styles.rivalRow}>
            <Text style={styles.rivalLabel}>
              🏘️ {t("achievements.rivalTownLabel", { amount: formatCoins(state.rivalNetWorth) })}
            </Text>
            <Text style={[styles.rivalStatus, { color: state.rivalCurrentlyAhead ? "#c94b4b" : "#3fae5c" }]}>
              {state.rivalCurrentlyAhead ? t("achievements.rivalAhead") : t("achievements.rivalBehind")}
            </Text>
          </View>
        )}
      </GoalFrame>

      {miniQuest && miniQuestTemplate && (
        <>
          <GoalRibbon text={t("achievements.miniQuestSectionLabel")} />
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
              <GoalFrame lit>
                <View style={styles.rowInner}>
                  <View style={styles.rowIcon}>
                    <Text style={styles.icon}>{miniQuestTemplate.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.title, styles.titleUnlocked]} numberOfLines={2}>
                        {t(miniQuestTemplate.titleKey)}
                      </Text>
                      <Text style={styles.reward}>+{miniQuest.reward} 🪙</Text>
                    </View>
                    <Text style={styles.description}>
                      {t(miniQuestTemplate.descriptionKey, { target: miniQuest.target })}
                    </Text>
                    <GoalProgress pct={pct} />
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
              </GoalFrame>
            );
          })()}
        </>
      )}

      {weeklyChallenge && weeklyChallengeTemplate && (
        <>
          <GoalRibbon text={t("achievements.weeklyChallengeSectionLabel")} />
          {(() => {
            const current = Math.max(
              0,
              Math.min(
                weeklyChallengeTemplate.metric(state.stats) - weeklyChallenge.startValue,
                weeklyChallenge.target
              )
            );
            const pct = weeklyChallenge.target > 0 ? current / weeklyChallenge.target : 0;
            return (
              <GoalFrame lit>
                <View style={styles.rowInner}>
                  <View style={styles.rowIcon}>
                    <GoalIcon name="bag" size={30} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.title, styles.titleUnlocked]} numberOfLines={2}>
                        {t(weeklyChallengeTemplate.titleKey)}
                      </Text>
                      <Text style={styles.reward}>
                        {t("achievements.weeklyChallengeReward", { amount: weeklyChallenge.reward })}
                      </Text>
                    </View>
                    <Text style={styles.description}>
                      {t(weeklyChallengeTemplate.descriptionKey, { target: weeklyChallenge.target })}
                    </Text>
                    <GoalProgress pct={pct} />
                    <Text style={styles.progressText}>
                      {weeklyChallenge.claimed
                        ? t("achievements.weeklyChallengeClaimed")
                        : t("achievements.weeklyChallengeProgress", {
                            current: Math.floor(current),
                            target: weeklyChallenge.target,
                          })}
                    </Text>
                  </View>
                </View>
              </GoalFrame>
            );
          })()}
        </>
      )}

      {festivalProgress && (
        <>
          <GoalRibbon text={t("achievements.festivalSectionLabel")} />
          {(() => {
            const current = Math.max(
              0,
              Math.min(festivalMetric(state.stats) - festivalProgress.startValue, festivalProgress.target)
            );
            const pct = festivalProgress.target > 0 ? current / festivalProgress.target : 0;
            return (
              <GoalFrame lit>
                <View style={styles.rowInner}>
                  <View style={styles.rowIcon}>
                    <Text style={styles.icon}>🎪</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.title, styles.titleUnlocked]} numberOfLines={2}>
                        {t("achievements.festivalTitle")}
                      </Text>
                      <Text style={styles.reward}>
                        {t("achievements.festivalReward", { amount: festivalProgress.reward })}
                      </Text>
                    </View>
                    <Text style={styles.description}>
                      {t("achievements.festivalDescription", { target: festivalProgress.target })}
                    </Text>
                    <GoalProgress pct={pct} />
                    <Text style={styles.progressText}>
                      {festivalProgress.claimed
                        ? t("achievements.festivalClaimed")
                        : t("achievements.festivalProgress", {
                            current: Math.floor(current),
                            target: festivalProgress.target,
                          })}
                    </Text>
                  </View>
                </View>
              </GoalFrame>
            );
          })()}
        </>
      )}

      <GoalRibbon text={t("achievements.dailyQuestsLabel")} />
      <View style={styles.questHeaderRow}>
        <Text style={styles.questNote}>{t("achievements.dailyQuestsNote")}</Text>
        <Text style={styles.questCount}>
          {t("achievements.dailyQuestsCount", {
            count: completedQuestCount,
            total: state.dailyQuests.length,
          })}
        </Text>
      </View>
      {state.dailyQuests.map((q) => {
        const template = QUEST_TEMPLATES_BY_ID[q.templateId];
        if (!template) return null;
        const current = Math.min(template.progress(state.dailyProgress), q.target);
        const pct = q.target > 0 ? Math.min(1, current / q.target) : q.completed ? 1 : 0;
        const art = QUEST_ART[q.templateId];
        return (
          <GoalFrame key={q.id} lit={q.completed}>
            <View style={styles.rowInner}>
              <View style={styles.rowIcon}>
                {q.completed ? (
                  <Text style={styles.icon}>✅</Text>
                ) : art ? (
                  <GoalIcon name={art} size={30} />
                ) : (
                  <Text style={[styles.icon, styles.iconLocked]}>{template.icon}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, q.completed && styles.titleUnlocked]} numberOfLines={2}>
                    {t(template.titleKey)}
                  </Text>
                  <Text style={styles.reward}>+{q.reward} 🪙</Text>
                </View>
                <Text style={styles.description}>{t(template.descriptionKey, { target: q.target })}</Text>
                {!q.completed && (
                  <>
                    <GoalProgress pct={pct} />
                    <Text style={styles.progressText}>
                      {Math.floor(current)} / {q.target}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </GoalFrame>
        );
      })}

      <GoalRibbon text={t("achievements.sectionLabel")} />
      {ACHIEVEMENTS.map((a) => {
        const unlocked = state.unlockedAchievements.includes(a.id);
        const current = Math.min(a.progress(state, netWorth), a.target);
        const pct = a.target > 0 ? Math.min(1, current / a.target) : unlocked ? 1 : 0;
        return (
          <GoalFrame key={a.id} lit={unlocked}>
            <View style={styles.rowInner}>
              <View style={styles.rowIcon}>
                {unlocked ? (
                  <AchievementIcon id={a.id} fallback={a.icon} size={28} />
                ) : (
                  <GoalIcon name="lock" size={28} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, unlocked && styles.titleUnlocked]} numberOfLines={2}>
                    {t(a.titleKey)}
                  </Text>
                  <Text style={styles.reward}>+{a.reward} 🪙</Text>
                </View>
                <Text style={styles.description}>{t(a.descriptionKey)}</Text>
                {!unlocked && (
                  <>
                    <GoalProgress pct={pct} />
                    <Text style={styles.progressText}>
                      {Math.floor(current)} / {a.target}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </GoalFrame>
        );
      })}

      <GoalRibbon text={t("achievements.compendiumSectionLabel")} />
      <GoalFrame>
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
                <GoodIcon
                  id={g.id}
                  fallback={unlocked ? g.icon : "🔒"}
                  size={TYPE.title}
                  locked={!unlocked}
                />
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
        <GoalProgress pct={state.researched.length / RESEARCH_NODES.length} />
      </GoalFrame>

      <GoalRibbon text={t("backup.sectionLabel")} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <GoalFrame>
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
        </GoalFrame>
      </KeyboardAvoidingView>
    </ScrollView>
  );
}

/** Secondary text on the dark cards: light enough to read, not a grey that sinks into the wood. */
const READ = "#dccfae";

const styles = StyleSheet.create({
  eraRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 14,
  },
  eraRowNow: { backgroundColor: "rgba(246,226,160,0.1)" },
  eraChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.38)",
    borderWidth: 1,
    borderColor: "rgba(246,226,160,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  eraName: { fontFamily: FONT.display, fontSize: 17, letterSpacing: 0.4 },
  eraSub: { color: "#eadcb6", fontFamily: FONT.medium, fontSize: 14, lineHeight: 19, marginTop: 1 },
  body: { padding: SCREEN_PADDING, paddingBottom: 40 },
  summaryCard: {
    borderRadius: RADIUS.feature,
    padding: SPACING.lg,
    marginBottom: PANEL_GAP,
    overflow: "hidden",
    ...cardShadow,
  },
  summaryRow: { flexDirection: "row", alignItems: "baseline", marginBottom: SPACING.sm, flexWrap: "wrap" },
  summaryBig: {
    color: COLORS.accent,
    fontSize: TYPE.display,
    fontFamily: FONT.display,
    marginRight: SPACING.sm,
  },
  summaryLabel: { color: READ, fontSize: 14, lineHeight: 19 },
  streakRow: { flexDirection: "row", alignItems: "center" },
  streakEmoji: { fontSize: TYPE.title, marginRight: 6 },
  streakText: { color: COLORS.textPrimary, fontSize: 14 },
  statsCard: {
    borderRadius: RADIUS.feature,
    padding: SPACING.lg,
    marginBottom: PANEL_GAP,
    overflow: "hidden",
    ...cardShadow,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap" },
  statsBody: { paddingHorizontal: 8, paddingVertical: 8 },
  statItem: { width: "33.33%", alignItems: "center", paddingHorizontal: 4, paddingVertical: SPACING.sm },
  statDivV: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: "rgba(232,199,119,0.18)" },
  statDivH: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(232,199,119,0.18)" },
  statEmoji: { fontSize: 24, marginBottom: 3, lineHeight: 28 },
  rowInner: { flexDirection: "row", alignItems: "center" },
  rowIcon: { width: 34, alignItems: "center", justifyContent: "center", marginRight: 10 },
  statValue: {
    color: COLORS.accent,
    fontSize: TYPE.heading,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
  },
  statLabel: { color: READ, fontSize: 12, textAlign: "center", marginTop: 2 },
  hallOfFameRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: PANEL_GAP },
  hallOfFameChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(246,211,106,0.8)",
    backgroundColor: "rgba(70,44,20,0.92)",
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: 6,
    alignItems: "center",
    overflow: "hidden",
  },
  hallOfFameTitle: {
    color: "#fbeccb",
    fontSize: 12,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    textAlign: "center",
  },
  netWorthChartCard: {
    borderRadius: RADIUS.feature,
    padding: SPACING.lg,
    marginBottom: PANEL_GAP,
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
  rivalLabel: { color: READ, fontSize: 13 },
  rivalStatus: { fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: 13 },
  compendiumCard: {
    borderRadius: RADIUS.feature,
    padding: SPACING.lg,
    marginBottom: PANEL_GAP,
    overflow: "hidden",
    ...cardShadow,
  },
  compendiumGroupLabel: {
    color: READ,
    fontSize: 14,
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
    marginBottom: 10,
  },
  questCount: { color: "#e8c777", fontSize: 13, fontWeight: "700", fontFamily: FONT.bold },
  questNote: { color: READ, fontSize: 12, flex: 1, marginRight: 8 },
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
  miniQuestTicksLeft: { color: "#e8c777", fontSize: 12, fontWeight: "700", fontFamily: FONT.bold },
  icon: { fontSize: 26, marginRight: 12 },
  iconLocked: { opacity: 0.5 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: READ, fontWeight: "700", fontFamily: FONT.bold, fontSize: 15 },
  titleUnlocked: { color: "#f0e3c8" },
  reward: { color: "#e8c777", fontSize: 13, fontWeight: "700", fontFamily: FONT.bold },
  description: { color: READ, fontSize: 13, lineHeight: 18, marginTop: 2, marginBottom: 6 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: "#1a1410", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#e8c777", borderRadius: 2 },
  progressText: { color: READ, fontSize: 12, marginTop: 3 },
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
    color: "#5fd884",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: FONT.bold,
    marginTop: 8,
  },
  backupFeedbackError: {
    color: "#f08a8a",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: FONT.bold,
    marginTop: 8,
  },
});
