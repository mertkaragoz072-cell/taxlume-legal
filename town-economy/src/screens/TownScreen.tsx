import React from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS } from "../economy/goods";
import { PriceChart } from "../components/PriceChart";

const screenWidth = Dimensions.get("window").width;
const chartWidth = Math.min(screenWidth - 48, 420);

function moodFor(rate: number): { label: string; emoji: string; color: string } {
  if (rate > 0.01) return { label: "Ekonomik kriz", emoji: "🔥", color: "#e0693f" };
  if (rate > 0.005) return { label: "Isınıyor", emoji: "😰", color: "#e0a13f" };
  if (rate > -0.001) return { label: "Sakin", emoji: "🙂", color: "#e8c777" };
  return { label: "Ferahlıyor", emoji: "😌", color: "#3fae5c" };
}

export function TownScreen() {
  const { state } = useEconomyContext();
  const mood = moodFor(state.inflationRate);

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={styles.moodCard}>
        <Text style={styles.moodEmoji}>{mood.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.moodLabel}>Kasaba Hissiyatı</Text>
          <Text style={[styles.moodValue, { color: mood.color }]}>{mood.label}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.moodIndex}>{state.inflationIndex.toFixed(1)}</Text>
          <Text style={styles.moodIndexLabel}>Fiyat Endeksi</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>📊 Enflasyon Geçmişi</Text>
        <PriceChart
          history={state.inflationHistory}
          color={mood.color}
          width={chartWidth}
          height={120}
          strokeWidth={3}
        />
      </View>

      <Text style={styles.sectionLabel}>ESNAF DURUMU</Text>
      <View style={styles.buildingsGrid}>
        {GOODS.map((g) => {
          const gs = state.goods[g.id];
          const ratio = gs.price / g.basePrice;
          const pct = Math.max(0, Math.min(1, (ratio - 0.6) / (1.8 - 0.6)));
          return (
            <View key={g.id} style={styles.buildingCard}>
              <Text style={styles.buildingIcon}>{g.icon}</Text>
              <Text style={styles.buildingName}>{g.producer}</Text>
              <View style={styles.buildingTrack}>
                <View
                  style={[
                    styles.buildingFill,
                    { height: `${pct * 100}%`, backgroundColor: g.color },
                  ]}
                />
              </View>
              <Text style={styles.buildingRatio}>{(ratio * 100).toFixed(0)}%</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>SON OLAYLAR</Text>
      {state.eventLog.length === 0 && (
        <Text style={styles.emptyText}>Henüz bir olay yaşanmadı, kasaba sakin.</Text>
      )}
      {state.eventLog.map((event) => (
        <View
          key={event.id}
          style={[
            styles.eventRow,
            {
              borderLeftColor:
                event.tone === "bad" ? "#c94b4b" : event.tone === "good" ? "#3fae5c" : "#a0917a",
            },
          ]}
        >
          <Text style={styles.eventText}>{event.message}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  moodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2016",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  moodEmoji: { fontSize: 32, marginRight: 12 },
  moodLabel: { color: "#a0917a", fontSize: 11 },
  moodValue: { fontSize: 16, fontWeight: "800", marginTop: 2 },
  moodIndex: { color: "#e8c777", fontSize: 16, fontWeight: "800" },
  moodIndexLabel: { color: "#a0917a", fontSize: 10, marginTop: 2 },
  chartCard: { backgroundColor: "#2a2016", borderRadius: 16, padding: 16, marginBottom: 20 },
  chartTitle: { color: "#f0e3c8", fontWeight: "700", fontSize: 13, marginBottom: 6 },
  sectionLabel: {
    color: "#a0917a",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
  },
  buildingsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  buildingCard: {
    width: "31%",
    backgroundColor: "#2a2016",
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
  },
  buildingIcon: { fontSize: 22 },
  buildingName: { color: "#f0e3c8", fontSize: 10, fontWeight: "600", marginTop: 4, textAlign: "center" },
  buildingTrack: {
    width: 10,
    height: 44,
    backgroundColor: "#1a1410",
    borderRadius: 5,
    marginTop: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  buildingFill: { width: "100%", borderRadius: 5 },
  buildingRatio: { color: "#a0917a", fontSize: 10, marginTop: 6 },
  emptyText: { color: "#a0917a", fontSize: 12, marginBottom: 10 },
  eventRow: {
    backgroundColor: "#2a2016",
    borderRadius: 10,
    borderLeftWidth: 3,
    padding: 10,
    marginBottom: 8,
  },
  eventText: { color: "#f0e3c8", fontSize: 12 },
});
