import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { GradientFill } from "../components/GradientFill";
import { ScalePressable } from "../components/ScalePressable";
import { ACHIEVEMENTS } from "../economy/achievements";
import { useEconomyContext } from "../economy/EconomyContext";
import { MINI_QUEST_TEMPLATES_BY_ID } from "../economy/miniQuests";
import { QUEST_TEMPLATES_BY_ID } from "../economy/quests";
import { decodeSaveCode, encodeSaveCode } from "../economy/saveCode";
import { CARD_GRADIENT, cardShadow, GOLD_GRADIENT, UNLOCKED_CARD_GRADIENT } from "../theme";

type ImportFeedback = { type: "success" | "error"; text: string };

export function AchievementsScreen() {
  const { state, netWorth, t, hydrate } = useEconomyContext();
  const unlockedCount = state.unlockedAchievements.length;
  const completedQuestCount = state.dailyQuests.filter((q) => q.completed).length;
  const miniQuest = state.activeMiniQuest;
  const miniQuestTemplate = miniQuest ? MINI_QUEST_TEMPLATES_BY_ID[miniQuest.templateId] : null;

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

      {miniQuest && miniQuestTemplate && (
        <>
          <Text style={styles.sectionLabel}>{t("achievements.miniQuestSectionLabel")}</Text>
          {(() => {
            const current = Math.max(
              0,
              Math.min(
                miniQuestTemplate.metric(state.dailyProgress) - miniQuest.baseline,
                miniQuest.target
              )
            );
            const pct = miniQuest.target > 0 ? current / miniQuest.target : 0;
            const ticksLeft = Math.max(0, miniQuest.expiresAtTick - state.tick);
            return (
              <View style={styles.miniQuestCard}>
                <GradientFill colors={UNLOCKED_CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
                <Text style={styles.icon}>{miniQuestTemplate.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.title, styles.titleUnlocked]}>
                      {t(miniQuestTemplate.titleKey)}
                    </Text>
                    <Text style={styles.reward}>+{miniQuest.reward} 🪙</Text>
                  </View>
                  <Text style={styles.description}>{t(miniQuestTemplate.descriptionKey)}</Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, styles.miniQuestProgressFill, { width: `${pct * 100}%` }]} />
                  </View>
                  <View style={styles.miniQuestFooterRow}>
                    <Text style={styles.progressText}>
                      {Math.floor(current)} / {miniQuest.target}
                    </Text>
                    <Text style={styles.miniQuestTicksLeft}>
                      {t("achievements.miniQuestTicksLeft", { ticks: ticksLeft })}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })()}
        </>
      )}

      <View style={styles.questHeaderRow}>
        <Text style={styles.sectionLabel}>{t("achievements.dailyQuestsLabel")}</Text>
        <Text style={styles.questCount}>
          {t("achievements.dailyQuestsCount", { count: completedQuestCount, total: state.dailyQuests.length })}
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

      <Text style={styles.sectionLabel}>{t("achievements.sectionLabel")}</Text>
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
            <Text style={[styles.icon, !unlocked && styles.iconLocked]}>
              {unlocked ? a.icon : "🔒"}
            </Text>
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

      <Text style={styles.sectionLabel}>{t("backup.sectionLabel")}</Text>
      <View style={styles.backupCard}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <Text style={styles.description}>{t("backup.description")}</Text>
        <ScalePressable onPress={handleCopyCode} style={styles.backupBtn} scaleTo={0.97}>
          <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
          <Text style={styles.backupBtnText}>{t("backup.copyBtn")}</Text>
        </ScalePressable>
        {copyFeedback && <Text style={styles.backupFeedbackSuccess}>{t("backup.copied")}</Text>}

        <Text style={[styles.description, styles.backupImportDesc]}>
          {t("backup.importDescription")}
        </Text>
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
              importFeedback.type === "success"
                ? styles.backupFeedbackSuccess
                : styles.backupFeedbackError
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
  body: { padding: 16, paddingBottom: 40 },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    overflow: "hidden",
    ...cardShadow,
  },
  summaryRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 8 },
  summaryBig: { color: "#e8c777", fontSize: 22, fontWeight: "800", marginRight: 8 },
  summaryLabel: { color: "#a0917a", fontSize: 12 },
  streakRow: { flexDirection: "row", alignItems: "center" },
  streakEmoji: { fontSize: 16, marginRight: 6 },
  streakText: { color: "#f0e3c8", fontSize: 12 },
  questHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  questCount: { color: "#e8c777", fontSize: 11, fontWeight: "700" },
  questNote: { color: "#6b5f4d", fontSize: 10, marginBottom: 10 },
  sectionLabel: {
    color: "#a0917a",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 6,
  },
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
  miniQuestTicksLeft: { color: "#e8c777", fontSize: 10, fontWeight: "700" },
  icon: { fontSize: 26, marginRight: 12 },
  iconLocked: { opacity: 0.5 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "#a0917a", fontWeight: "700", fontSize: 13 },
  titleUnlocked: { color: "#f0e3c8" },
  reward: { color: "#e8c777", fontSize: 11, fontWeight: "700" },
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
  backupBtnText: { color: "#1a1410", fontWeight: "800", fontSize: 13 },
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
  backupFeedbackSuccess: { color: "#3fae5c", fontSize: 11, fontWeight: "700", marginTop: 8 },
  backupFeedbackError: { color: "#c94b4b", fontSize: 11, fontWeight: "700", marginTop: 8 },
});
