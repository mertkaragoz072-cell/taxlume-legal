import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PriceChart } from "./PriceChart";

interface Props {
  cash: number;
  netWorth: number;
  inflationIndex: number;
  inflationRate: number;
  inflationHistory: number[];
  paused: boolean;
  onTogglePause: () => void;
  onReset: () => void;
}

export function InflationHeader({
  cash,
  netWorth,
  inflationIndex,
  inflationRate,
  inflationHistory,
  paused,
  onTogglePause,
  onReset,
}: Props) {
  const hot = inflationRate > 0.006;
  return (
    <View style={styles.wrap}>
      <View style={styles.topLine}>
        <Text style={styles.town}>🏘️ TAXLUME KASABASI</Text>
        <View style={styles.controls}>
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
  town: { color: "#e8c777", fontWeight: "800", fontSize: 14, letterSpacing: 0.5 },
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
