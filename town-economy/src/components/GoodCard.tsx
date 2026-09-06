import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { usePriceFlash } from "../hooks/usePriceFlash";
import { cardShadow, CARD_GRADIENT, COLORS, glowShadow, RADIUS, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";
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
      style={[
        styles.card,
        selected && { borderColor: good.color, borderWidth: 2 },
        selected && glowShadow(good.color),
      ]}
    >
      <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
      {selected && (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(good.color, 0.16) }]}
        />
      )}
      <View
        style={[styles.accentStripe, { backgroundColor: selected ? good.color : withAlpha(good.color, 0.4) }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.flashOverlay, { backgroundColor: flashColor, opacity }]}
      />
      <View style={styles.topRow}>
        <Text style={styles.icon}>{good.icon}</Text>
        <Text style={[styles.change, { color: positive ? COLORS.positive : COLORS.negative }]}>
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
    borderRadius: RADIUS.card,
    borderWidth: 2,
    borderColor: "transparent",
    padding: SPACING.sm + 2,
    paddingTop: SPACING.md + 1,
    marginRight: SPACING.sm + 2,
    alignItems: "center",
    overflow: "hidden",
    ...cardShadow,
  },
  accentStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  flashOverlay: {
    borderRadius: RADIUS.card,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 2,
  },
  icon: { fontSize: TYPE.heading },
  change: { fontSize: TYPE.caption, fontWeight: WEIGHT.bold },
  name: { color: COLORS.textPrimary, fontSize: TYPE.label, fontWeight: WEIGHT.medium, marginTop: SPACING.xs },
  price: { color: COLORS.accent, fontSize: TYPE.body, fontWeight: WEIGHT.bold },
  holding: {
    marginTop: 2,
    fontSize: TYPE.micro,
    color: COLORS.onLight,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 1,
  },
});
