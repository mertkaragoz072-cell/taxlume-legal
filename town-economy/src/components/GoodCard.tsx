import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Good, GoodState } from "../economy/types";
import { PriceChart } from "./PriceChart";

interface Props {
  good: Good;
  state: GoodState;
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
  const change = pctChange(state.history);
  const positive = change >= 0;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, selected && { borderColor: good.color, borderWidth: 2 }]}
    >
      <View style={styles.topRow}>
        <Text style={styles.icon}>{good.icon}</Text>
        <Text style={[styles.change, { color: positive ? "#3fae5c" : "#c94b4b" }]}>
          {positive ? "+" : ""}
          {change.toFixed(1)}%
        </Text>
      </View>
      <PriceChart history={state.history} color={good.color} width={92} height={34} strokeWidth={1.5} />
      <Text style={styles.name}>{good.name}</Text>
      <Text style={styles.price}>{state.price.toFixed(2)} 🪙</Text>
      {state.holding > 0 && <Text style={styles.holding}>x{state.holding}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 108,
    backgroundColor: "#2a2016",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
    padding: 10,
    marginRight: 10,
    alignItems: "center",
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
