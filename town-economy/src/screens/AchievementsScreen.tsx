import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { GradientFill } from "../components/GradientFill";
import { ACHIEVEMENTS } from "../economy/achievements";
import { useEconomyContext } from "../economy/EconomyContext";
import { QUEST_TEMPLATES_BY_ID } from "../economy/quests";
import { CARD_GRADIENT, cardShadow, UNLOCKED_CARD_GRADIENT } from "../theme";

export function AchievementsScreen() {
  const { state, netWorth, t } = useEconomyContext();
  const unlockedCount = state.unlockedAchievements.length;
  const completedQuestCount = state.dailyQuests.filter((q) => q.completed).length;

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
});
