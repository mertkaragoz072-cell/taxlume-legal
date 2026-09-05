import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { usePriceFlash } from "../hooks/usePriceFlash";
import { cardShadow, CARD_GRADIENT } from "../theme";
import { GradientFill } from "./GradientFill";
import { PriceChart } from "./PriceChart";
import { ScalePressable } from "./ScalePressable";

// Loosened to the fields this card actually renders (rather than the full
// Good/GoodState shape) so it can double as an asset card in InvestScreen.
interface Props {
  good: { nameKey: string; icon: string; color: string };
  state: { price: number; history: number[]; holding: number };
  selected: boolean;
  onPress: () => void;
}

function pctChange(history: number[]): number {
  if (history.length < 2) return 0;
  const prev = history[history.length - 2];
  const curr = history[history.length - 1];
  if (prev === 0) return 0;
  return ((curr - prev) / prev) * 100;
}

export function GoodCard({ good, state, selected, onPress }: Props) {
  const { t } = useEconomyContext();
  const change = pctChange(state.history);
  const positive = change >= 0;
  const { opacity, flashColor } = usePriceFlash(state.price);

  return (
    <ScalePressable
      onPress={onPress}
      style={[styles.card, selected && { borderColor: good.color, borderWidth: 2 }]}
    >
      <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
      <View style={[styles.accentStripe, { backgroundColor: good.color }]} />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.flashOverlay, { backgroundColor: flashColor, opacity }]}
      />
      <View style={styles.topRow}>
        <Text style={styles.icon}>{good.icon}</Text>
        <Text style={[styles.change, { color: positive ? "#3fae5c" : "#c94b4b" }]}>
          {positive ? "+" : ""}
          {change.toFixed(1)}%
        </Text>
      </View>
      <PriceChart
        history={state.history}
        color={good.color}
        width={92}
        height={34}
        strokeWidth={1.5}
        filled={false}
      />
      <Text style={styles.name}>{t(good.nameKey)}</Text>
      <Text style={styles.price}>{state.price.toFixed(2)} 🪙</Text>
      {state.holding > 0 && <Text style={styles.holding}>x{state.holding}</Text>}
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 108,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
    padding: 10,
    paddingTop: 13,
    marginRight: 10,
    alignItems: "center",
    overflow: "hidden",
    ...cardShadow,
  },
  accentStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  flashOverlay: {
    borderRadius: 14,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 2,
  },
  icon: { fontSize: 20 },
  change: { fontSize: 11, fontWeight: "700" },
  name: { color: "#f0e3c8", fontSize: 12, fontWeight: "600", marginTop: 4 },
  price: { color: "#e8c777", fontSize: 13, fontWeight: "700" },
  holding: {
    marginTop: 2,
    fontSize: 10,
    color: "#1a1410",
    backgroundColor: "#e8c777",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
});
