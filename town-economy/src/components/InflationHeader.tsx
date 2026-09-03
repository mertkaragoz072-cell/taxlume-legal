import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DIFFICULTIES, DifficultyId } from "../economy/difficulty";
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
  onTogglePause: () => void;
  onToggleMuted: () => void;
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
  onTogglePause,
  onToggleMuted,
  onReset,
  onHelp,
  onEditName,
}: Props) {
  const hot = inflationRate > 0.006;
  const difficultyConfig = DIFFICULTIES[difficulty];
  return (
    <View style={styles.wrap}>
      <View style={styles.topLine}>
        <View style={styles.townRow}>
          <Pressable onPress={onEditName} style={styles.townNamePressable}>
            <Text style={styles.town} numberOfLines={1}>
              🏘️ {townName.toUpperCase()} ✏️
            </Text>
          </Pressable>
          <View style={styles.streakBadge}>
            <Text style={styles.streakBadgeText}>
              {difficultyConfig.icon} {difficultyConfig.label}
            </Text>
          </View>
          {streakCount > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>🔥 {streakCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.controls}>
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
          <Text style={styles.statLabel}>Nakit</Text>
          <Text style={styles.statValue}>{cash.toFixed(1)} 🪙</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Net Servet</Text>
          <Text style={styles.statValue}>{netWorth.toFixed(1)} 🪙</Text>
        </View>
        <View style={[styles.stat, styles.inflationStat]}>
          <View style={styles.inflationTextCol}>
            <Text style={styles.statLabel}>Enflasyon (TPI)</Text>
            <Text style={[styles.statValue, { color: hot ? "#e0693f" : "#e8c777" }]}>
              {inflationIndex.toFixed(1)}{" "}
              <Text style={{ fontSize: 11 }}>
                ({inflationRate >= 0 ? "+" : ""}
                {(inflationRate * 100).toFixed(2)}%/tur)
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
    backgroundColor: "#1a1410",
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#3a2d1e",
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
