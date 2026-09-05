import React from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { OfflineSummary } from "../economy/types";
import { CARD_GRADIENT, cardShadow, GOLD_GRADIENT } from "../theme";
import { GradientFill } from "./GradientFill";
import { ScalePressable } from "./ScalePressable";

interface Props {
  summary: OfflineSummary | null;
  onDismiss: () => void;
}

function formatElapsed(ms: number, t: (key: string, params?: Record<string, string | number>) => string): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return t("offline.minutes", { n: minutes });
  if (minutes === 0) return t("offline.hours", { n: hours });
  return t("offline.hoursMinutes", { h: hours, m: minutes });
}

export function OfflineSummaryModal({ summary, onDismiss }: Props) {
  const { t, formatCoins } = useEconomyContext();
  if (!summary) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          <Text style={styles.title}>{t("offline.title")}</Text>
          <Text style={styles.subtitle}>
            {t("offline.subtitle", { elapsed: formatElapsed(summary.elapsedMs, t) })}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
          {summary.hyperinflationHappened && (
            <View style={[styles.row, styles.crisisRow]}>
              <Text style={styles.crisisText}>{t("offline.hyperinflation")}</Text>
            </View>
          )}

          <View style={styles.statsGrid}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{t("header.cash")}</Text>
              <Text style={[styles.statValue, { color: summary.cashDelta >= 0 ? "#3fae5c" : "#c94b4b" }]}>
                {summary.cashDelta >= 0 ? "+" : ""}
                {formatCoins(summary.cashDelta)}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{t("header.netWorth")}</Text>
              <Text
                style={[styles.statValue, { color: summary.netWorthDelta >= 0 ? "#3fae5c" : "#c94b4b" }]}
              >
                {summary.netWorthDelta >= 0 ? "+" : ""}
                {formatCoins(summary.netWorthDelta)}
              </Text>
            </View>
            {summary.caravansCompleted > 0 && (
              <View style={styles.stat}>
                <Text style={styles.statLabel}>{t("offline.caravansCompleted")}</Text>
                <Text style={styles.statValue}>🚚 {summary.caravansCompleted}</Text>
              </View>
            )}
          </View>

          {summary.newQuests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t("offline.questsSectionLabel")}</Text>
              {summary.newQuests.map((title) => (
                <Text key={title} style={styles.achievementText}>
                  ✅ {title}
                </Text>
              ))}
            </View>
          )}

          {summary.newAchievements.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t("offline.achievementsSectionLabel")}</Text>
              {summary.newAchievements.map((title) => (
                <Text key={title} style={styles.achievementText}>
                  🏆 {title}
                </Text>
              ))}
            </View>
          )}

          {summary.recentEvents.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t("offline.eventsSectionLabel")}</Text>
              {summary.recentEvents.map((event) => (
                <Text key={event.id} style={styles.eventText} numberOfLines={2}>
                  {event.message}
                </Text>
              ))}
            </View>
          )}
          </ScrollView>

          <ScalePressable onPress={onDismiss} style={styles.confirmBtn} scaleTo={0.96}>
            <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
            <Text style={styles.confirmBtnText}>{t("offline.confirmBtn")}</Text>
          </ScalePressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "85%",
    borderRadius: 18,
    padding: 18,
    overflow: "hidden",
    ...cardShadow,
  },
  title: { color: "#f0e3c8", fontSize: 18, fontWeight: "800", marginBottom: 4 },
  subtitle: { color: "#a0917a", fontSize: 12, marginBottom: 14 },
  row: { marginBottom: 12 },
  crisisRow: { backgroundColor: "#3a1f1a", borderRadius: 10, padding: 10 },
  crisisText: { color: "#f0b7a8", fontSize: 12, fontWeight: "600" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 },
  stat: { minWidth: "40%" },
  statLabel: { color: "#a0917a", fontSize: 10, marginBottom: 2 },
  statValue: { color: "#f0e3c8", fontSize: 15, fontWeight: "800" },
  section: { marginTop: 14 },
  sectionLabel: {
    color: "#a0917a",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  achievementText: { color: "#e8c777", fontSize: 12, fontWeight: "700", marginBottom: 4 },
  eventText: { color: "#f0e3c8", fontSize: 11, marginBottom: 4 },
  confirmBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 18,
    overflow: "hidden",
  },
  confirmBtnText: { color: "#1a1410", fontWeight: "800", fontSize: 14 },
});
