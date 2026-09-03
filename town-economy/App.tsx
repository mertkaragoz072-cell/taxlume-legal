import { StatusBar } from "expo-status-bar";
import React from "react";
import { Dimensions, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { BuySellPanel } from "./src/components/BuySellPanel";
import { GoodCard } from "./src/components/GoodCard";
import { InflationHeader } from "./src/components/InflationHeader";
import { PriceChart } from "./src/components/PriceChart";
import { GOODS } from "./src/economy/goods";
import { useEconomy } from "./src/economy/useEconomy";

const screenWidth = Dimensions.get("window").width;
const chartWidth = Math.min(screenWidth - 48, 420);

export default function App() {
  const { state, selectGood, trade, togglePause, reset, netWorth } = useEconomy();
  const selected = GOODS.find((g) => g.id === state.selectedGood)!;
  const selectedState = state.goods[selected.id];

  const change =
    selectedState.history.length > 1
      ? ((selectedState.price - selectedState.history[selectedState.history.length - 2]) /
          selectedState.history[selectedState.history.length - 2]) *
        100
      : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
        <InflationHeader
          cash={state.cash}
          netWorth={netWorth}
          inflationIndex={state.inflationIndex}
          inflationRate={state.inflationRate}
          inflationHistory={state.inflationHistory}
          paused={state.paused}
          onTogglePause={togglePause}
          onReset={reset}
        />

        {state.lastEvent && (
          <View
            style={[
              styles.eventBanner,
              {
                backgroundColor:
                  state.lastEvent.tone === "bad"
                    ? "#3a1f1a"
                    : state.lastEvent.tone === "good"
                    ? "#1c3320"
                    : "#2a2016",
              },
            ]}
          >
            <Text style={styles.eventText}>📰 {state.lastEvent.message}</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.chartCard}>
            <View style={styles.chartHeaderRow}>
              <View>
                <Text style={styles.chartTitle}>
                  {selected.icon} {selected.name}
                </Text>
                <Text style={styles.chartSubtitle}>{selected.producer}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.chartPrice}>{selectedState.price.toFixed(2)} 🪙</Text>
                <Text
                  style={[
                    styles.chartChange,
                    { color: change >= 0 ? "#3fae5c" : "#c94b4b" },
                  ]}
                >
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(2)}%
                </Text>
              </View>
            </View>
            <PriceChart
              history={selectedState.history}
              color={selected.color}
              width={chartWidth}
              height={140}
              strokeWidth={3}
            />
          </View>

          <Text style={styles.sectionLabel}>KASABA PİYASASI</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.goodsRow}>
            {GOODS.map((g) => (
              <GoodCard
                key={g.id}
                good={g}
                state={state.goods[g.id]}
                selected={g.id === state.selectedGood}
                onPress={() => selectGood(g.id)}
              />
            ))}
          </ScrollView>

          <BuySellPanel
            good={selected}
            state={selectedState}
            cash={state.cash}
            onTrade={(side, qty) => trade(selected.id, side, qty)}
          />

          {state.gameOver && (
            <View style={styles.gameOverBox}>
              <Text style={styles.gameOverText}>
                💥 Hiperenflasyon kasabayı vurdu! Ekonomi çöktü.
              </Text>
              <Text style={styles.gameOverSub}>Yeniden başlamak için üstteki ⟳ butonuna dokun.</Text>
            </View>
          )}
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#1a1410" },
  body: { padding: 16, paddingBottom: 40 },
  eventBanner: {
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  eventText: { color: "#f0e3c8", fontSize: 12 },
  chartCard: {
    backgroundColor: "#2a2016",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },
  chartHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  chartTitle: { color: "#f0e3c8", fontSize: 17, fontWeight: "800" },
  chartSubtitle: { color: "#a0917a", fontSize: 12, marginTop: 2 },
  chartPrice: { color: "#e8c777", fontSize: 18, fontWeight: "800" },
  chartChange: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  sectionLabel: {
    color: "#a0917a",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  goodsRow: { marginBottom: 18 },
  gameOverBox: {
    marginTop: 18,
    backgroundColor: "#3a1f1a",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  gameOverText: { color: "#f0b7a8", fontWeight: "800", fontSize: 14, textAlign: "center" },
  gameOverSub: { color: "#c9a893", fontSize: 12, marginTop: 6, textAlign: "center" },
});
