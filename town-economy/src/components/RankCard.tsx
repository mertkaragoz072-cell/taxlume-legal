import React from "react";
import { StyleSheet, View } from "react-native";
import { FONT } from "../theme";
import { Text } from "./AppText";
import { GoalProgress } from "./GoalPanels";

interface Props {
  icon: string;
  title: string;
  /** "Next rank: Kingdom · 300K net worth" */
  next: string;
  /** 0..1 */
  pct: number;
  /** the town's rank colour */
  accent: string;
  /** "198K / 300K" */
  progressText: string;
  /** "What you get at Kingdom:" */
  previewTitle: string;
  /** one line per thing gained, each starting with its emoji */
  gains: string[];
}

const LEAD = /^((?:\p{Extended_Pictographic}[️‍\p{Extended_Pictographic}]*)+)\s*(.*)$/u;

/** The town's rank on the Goals page: the title big, a bar that says how far
 * along it is, and what the next rank brings as separate readable rows (the
 * emoji in a round chip, the words at a size that reads on a phone) instead of
 * one run of small grey lines. A line made of several " · "-separated gains
 * becomes a row of pills. */
export function RankCard({ icon, title, next, pct, accent, progressText, previewTitle, gains }: Props) {
  return (
    <View>
      <View style={styles.head}>
        <View style={[styles.badge, { borderColor: accent }]}>
          <Text style={styles.badgeIcon}>{icon}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.title, { color: accent }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.next} numberOfLines={2}>
            {next}
          </Text>
        </View>
      </View>

      <View style={styles.barRow}>
        <View style={{ flex: 1 }}>
          <GoalProgress pct={pct} color={accent} />
        </View>
        <Text style={styles.barText}>{progressText}</Text>
      </View>

      <Text style={[styles.preview, { color: accent }]}>{previewTitle}</Text>
      {gains.map((line) => {
        const m = LEAD.exec(line);
        const emoji = m ? m[1] : "•";
        const text = m ? m[2] : line;
        const parts = text.split(" · ");
        return (
          <View key={line} style={styles.row}>
            <View style={styles.chip}>
              <Text style={styles.chipIcon}>{emoji}</Text>
            </View>
            {parts.length > 1 ? (
              <View style={styles.pills}>
                {parts.map((p) => (
                  <View key={p} style={styles.pill}>
                    <Text style={styles.pillText}>{p}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.rowText}>{text}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeIcon: { fontSize: 30 },
  title: { fontFamily: FONT.display, fontSize: 26, letterSpacing: 0.5 },
  next: { color: "#eadcb6", fontFamily: FONT.medium, fontSize: 14, lineHeight: 19, marginTop: 1 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  barText: { color: "#f6e2a0", fontFamily: FONT.bold, fontSize: 13 },
  preview: { fontFamily: FONT.bold, fontSize: 15, marginTop: 16, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 },
  chip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.38)",
    borderWidth: 1,
    borderColor: "rgba(246,226,160,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  chipIcon: { fontSize: 16 },
  rowText: { flex: 1, color: "#f3e8cc", fontFamily: FONT.medium, fontSize: 15, lineHeight: 20 },
  pills: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1,
    borderColor: "rgba(246,226,160,0.28)",
  },
  pillText: { color: "#f3e8cc", fontFamily: FONT.medium, fontSize: 13 },
});
