import React from "react";
import { Animated, Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSoundEffects } from "../audio/useSoundEffects";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS } from "../economy/goods";
import { BuySellPanel } from "../components/BuySellPanel";
import { GoodCard } from "../components/GoodCard";
import { PriceChart } from "../components/PriceChart";
import { usePriceFlash } from "../hooks/usePriceFlash";

const screenWidth = Dimensions.get("window").width;
const chartWidth = Math.min(screenWidth - 48, 420);

interface Props {
  sounds: ReturnType<typeof useSoundEffects>;
}

export function MarketScreen({ sounds }: Props) {
  const { state, selectGood, trade } = useEconomyContext();
  const selected = GOODS.find((g) => g.id === state.selectedGood)!;
  const selectedState = state.goods[selected.id];
  const { opacity: flashOpacity, flashColor } = usePriceFlash(selectedState.price);

  const change =
    selectedState.history.length > 1
      ? ((selectedState.price - selectedState.history[selectedState.history.length - 2]) /
          selectedState.history[selectedState.history.length - 2]) *
        100
      : 0;

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={styles.chartCard}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: flashColor, opacity: flashOpacity }]}
        />
        <View style={styles.chartHeaderRow}>
          <View>
            <Text style={styles.chartTitle}>
              {selected.icon} {selected.name}
            </Text>
            <Text style={styles.chartSubtitle}>{selected.producer}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.chartPrice}>{selectedState.price.toFixed(2)} 🪙</Text>
            <Text style={[styles.chartChange, { color: change >= 0 ? "#3fae5c" : "#c94b4b" }]}>
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
        onTrade={(side, qty) => {
          trade(selected.id, side, qty);
          if (side === "buy") sounds.playBuy();
          else sounds.playSell();
        }}
      />

      {state.gameOver && (
        <View style={styles.gameOverBox}>
          <Text style={styles.gameOverText}>💥 Hiperenflasyon kasabayı vurdu! Ekonomi çöktü.</Text>
          <Text style={styles.gameOverSub}>Yeniden başlamak için üstteki ⟳ butonuna dokun.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  chartCard: {
    backgroundColor: "#2a2016",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    overflow: "hidden",
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
