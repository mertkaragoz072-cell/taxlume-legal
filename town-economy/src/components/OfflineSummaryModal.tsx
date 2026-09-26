import React from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { OfflineSummary } from "../economy/types";
import {
  CARD_GRADIENT,
  cardShadow,
  COLORS,
  FONT,
  GOLD_GRADIENT,
  RADIUS,
  SPACING,
  TYPE,
  WEIGHT,
  withAlpha,
} from "../theme";
import { GradientFill } from "./GradientFill";
import { IconBadge } from "./IconBadge";
import { ModalBackdrop } from "./ModalBackdrop";
import { ScalePressable } from "./ScalePressable";
import { SectionLabel } from "./SectionLabel";

interface Props {
  summary: OfflineSummary | null;
  onDismiss: () => void;
}

function formatElapsed(
  ms: number,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return t("offline.minutes", { n: minutes });
  if (minutes === 0) return t("offline.hours", { n: hours });
  return t("offline.hoursMinutes", { h: hours, m: minutes });
}

/** One "+123 🪙" figure with its label — cash, net worth, or (when it
 * happened) caravans landed, all read the same way at a glance instead of
 * needing their own bespoke layouts. */
function StatTile({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          tone === "positive" && { color: COLORS.positive },
          tone === "negative" && { color: COLORS.negative },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/** One line item in a section list — a quest, an achievement, or a raw
 * event message. Each gets its own bordered row instead of a bare line of
 * text, so a handful of unrelated one-liners reads as a list rather than a
 * wall of text once a few of them wrap to two lines. */
function ListRow({ text }: { text: string }) {
  return (
    <View style={styles.listRow}>
      <Text style={styles.listRowText}>{text}</Text>
    </View>
  );
}

export function OfflineSummaryModal({ summary, onDismiss }: Props) {
  const { t, formatCoins } = useEconomyContext();
  if (!summary) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <ModalBackdrop>
        <View style={styles.card}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />

          <View style={styles.header}>
            <IconBadge icon="🌙" color={COLORS.accent} />
            <Text style={styles.title}>{t("offline.title")}</Text>
            <Text style={styles.subtitle}>
              {t("offline.subtitle", { elapsed: formatElapsed(summary.elapsedMs, t) })}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {summary.hyperinflationHappened && (
              <View style={styles.crisisRow}>
                <Text aria-hidden style={styles.crisisIcon}>
                  💥
                </Text>
                <Text style={styles.crisisText}>{t("offline.hyperinflation")}</Text>
              </View>
            )}

            <View style={styles.statsGrid}>
              <StatTile
                label={t("header.cash")}
                value={`${summary.cashDelta >= 0 ? "+" : ""}${formatCoins(summary.cashDelta)}`}
                tone={summary.cashDelta >= 0 ? "positive" : "negative"}
              />
              <StatTile
                label={t("header.netWorth")}
                value={`${summary.netWorthDelta >= 0 ? "+" : ""}${formatCoins(summary.netWorthDelta)}`}
                tone={summary.netWorthDelta >= 0 ? "positive" : "negative"}
              />
              {summary.caravansCompleted > 0 && (
                <StatTile label={t("offline.caravansCompleted")} value={`🚚 ${summary.caravansCompleted}`} />
              )}
            </View>

            {summary.newQuests.length > 0 && (
              <View style={styles.section}>
                <SectionLabel text={t("offline.questsSectionLabel")} color={COLORS.positive} />
                {summary.newQuests.map((title) => (
                  <ListRow key={title} text={`✅ ${title}`} />
                ))}
              </View>
            )}

            {summary.newAchievements.length > 0 && (
              <View style={styles.section}>
                <SectionLabel text={t("offline.achievementsSectionLabel")} color={COLORS.accent} />
                {summary.newAchievements.map((title) => (
                  <ListRow key={title} text={`🏆 ${title}`} />
                ))}
              </View>
            )}

            {summary.recentEvents.length > 0 && (
              <View style={styles.section}>
                <SectionLabel text={t("offline.eventsSectionLabel")} />
                {summary.recentEvents.map((event) => (
                  <ListRow key={event.id} text={event.message} />
                ))}
              </View>
            )}
          </ScrollView>

          <ScalePressable onPress={onDismiss} style={styles.confirmBtn} scaleTo={0.96}>
            <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
            <Text style={styles.confirmBtnText}>{t("offline.confirmBtn")}</Text>
          </ScalePressable>
        </View>
      </ModalBackdrop>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "85%",
    borderRadius: RADIUS.feature,
    borderWidth: 1,
    borderColor: withAlpha(COLORS.accent, 0.3),
    padding: SPACING.lg,
    overflow: "hidden",
    ...cardShadow,
  },
  header: { alignItems: "center", marginBottom: SPACING.lg },
  title: { color: COLORS.textPrimary, fontSize: TYPE.heading, fontFamily: FONT.display },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: TYPE.body,
    textAlign: "center",
    marginTop: SPACING.xs,
  },
  crisisRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: withAlpha(COLORS.negative, 0.14),
    borderWidth: 1,
    borderColor: withAlpha(COLORS.negative, 0.4),
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  crisisIcon: { fontSize: 18, marginRight: SPACING.sm },
  crisisText: {
    flex: 1,
    color: "#f0b7a8",
    fontSize: TYPE.label,
    fontWeight: WEIGHT.medium,
    fontFamily: FONT.medium,
    lineHeight: 17,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginBottom: SPACING.md },
  statTile: {
    flexGrow: 1,
    minWidth: "42%",
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: withAlpha(COLORS.accent, 0.18),
    backgroundColor: withAlpha("#000000", 0.15),
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: TYPE.caption,
    fontFamily: FONT.medium,
    marginBottom: 3,
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: TYPE.title,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
  },
  section: { marginBottom: SPACING.md },
  listRow: {
    borderRadius: RADIUS.card,
    backgroundColor: withAlpha("#000000", 0.15),
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs + 2,
  },
  listRowText: { color: COLORS.textPrimary, fontSize: TYPE.label, lineHeight: 17 },
  confirmBtn: {
    borderRadius: RADIUS.chip,
    paddingVertical: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.sm,
    overflow: "hidden",
  },
  confirmBtnText: {
    color: COLORS.onLight,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    fontSize: TYPE.body,
  },
});
