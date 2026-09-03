import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DIFFICULTIES, DifficultyId } from "../economy/difficulty";
import { Language } from "../i18n/t";
import { GradientFill } from "./GradientFill";
import { PriceChart } from "./PriceChart";

interface Props {
  townName: string;
  cash: number;
  netWorth: number;
  inflationIndex: number;
  inflationRate: number;
  inflationHistory: number[];
  paused: boolean;
  muted: boolean;
  streakCount: number;
  difficulty: DifficultyId;
  language: Language;
  t: (key: string, params?: Record<string, string | number>) => string;
  onTogglePause: () => void;
  onToggleMuted: () => void;
  onToggleLanguage: () => void;
  onReset: () => void;
  onHelp: () => void;
  onEditName: () => void;
}

export function InflationHeader({
  townName,
  cash,
  netWorth,
  inflationIndex,
  inflationRate,
  inflationHistory,
  paused,
  muted,
  streakCount,
  difficulty,
  language,
  t,
  onTogglePause,
  onToggleMuted,
  onToggleLanguage,
  onReset,
  onHelp,
  onEditName,
}: Props) {
  const hot = inflationRate > 0.006;
  const difficultyConfig = DIFFICULTIES[difficulty];
  return (
    <View style={styles.wrap}>
      <GradientFill colors={["#241c12", "#140f0a"]} x1="0" y1="0" x2="0" y2="1" />
      <View style={styles.goldLine} />
      <View style={styles.topLine}>
        <View style={styles.townRow}>
          <Pressable onPress={onEditName} style={styles.townNamePressable}>
            <Text style={styles.town} numberOfLines={1}>
              🏘️ {townName.toUpperCase()} ✏️
            </Text>
          </Pressable>
          <View style={styles.streakBadge}>
            <Text style={styles.streakBadgeText}>
              {difficultyConfig.icon} {t(difficultyConfig.labelKey)}
            </Text>
          </View>
          {streakCount > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>🔥 {streakCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.controls}>
          <Pressable onPress={onToggleLanguage} style={styles.iconBtn}>
            <Text style={styles.langBtnText}>{language === "tr" ? "TR" : "EN"}</Text>
          </Pressable>
          <Pressable onPress={onHelp} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>❓</Text>
          </Pressable>
          <Pressable onPress={onToggleMuted} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>{muted ? "🔇" : "🔊"}</Text>
          </Pressable>
          <Pressable onPress={onTogglePause} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>{paused ? "▶" : "⏸"}</Text>
          </Pressable>
          <Pressable onPress={onReset} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>⟳</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{t("header.cash")}</Text>
          <Text style={styles.statValue}>{cash.toFixed(1)} 🪙</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{t("header.netWorth")}</Text>
          <Text style={styles.statValue}>{netWorth.toFixed(1)} 🪙</Text>
        </View>
        <View style={[styles.stat, styles.inflationStat]}>
          <View style={styles.inflationTextCol}>
            <Text style={styles.statLabel}>{t("header.inflation")}</Text>
            <Text style={[styles.statValue, { color: hot ? "#e0693f" : "#e8c777" }]}>
              {inflationIndex.toFixed(1)}{" "}
              <Text style={{ fontSize: 11 }}>
                ({inflationRate >= 0 ? "+" : ""}
                {(inflationRate * 100).toFixed(2)}%{t("header.perTurn")})
              </Text>
            </Text>
          </View>
          <PriceChart
            history={inflationHistory}
            color={hot ? "#e0693f" : "#e8c777"}
            width={70}
            height={30}
            strokeWidth={1.5}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  goldLine: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: "#e8c777",
    opacity: 0.55,
  },
  topLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  townRow: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  townNamePressable: { flexShrink: 1 },
  town: { color: "#e8c777", fontWeight: "800", fontSize: 14, letterSpacing: 0.5 },
  streakBadge: {
    backgroundColor: "#2a2016",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  streakBadgeText: { color: "#f0e3c8", fontSize: 11, fontWeight: "700" },
  controls: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#2a2016",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  iconBtnText: { color: "#f0e3c8", fontSize: 13 },
  langBtnText: { color: "#e8c777", fontSize: 10, fontWeight: "800" },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { flex: 1 },
  statLabel: { color: "#a0917a", fontSize: 10, marginBottom: 2 },
  statValue: { color: "#f0e3c8", fontSize: 14, fontWeight: "700" },
  inflationStat: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inflationTextCol: { flex: 1 },
});
