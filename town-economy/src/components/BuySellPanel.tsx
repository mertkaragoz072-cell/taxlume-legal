import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { CARD_GRADIENT, cardShadow, GREEN_GRADIENT, RED_GRADIENT } from "../theme";
import { GradientFill } from "./GradientFill";
import { ScalePressable } from "./ScalePressable";

// Loosened to the fields this panel actually needs (rather than the full
// Good/GoodState shape) so it can double as an asset buy/sell panel in
// InvestScreen.
interface Props {
  good: { nameKey: string; icon: string; color: string };
  state: { price: number; holding: number };
  cash: number;
  onTrade: (side: "buy" | "sell", qty: number) => void;
}

type Qty = 1 | 5 | "ALL";

export function BuySellPanel({ good, state, cash, onTrade }: Props) {
  const { t } = useEconomyContext();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qtyOption, setQtyOption] = useState<Qty>(1);

  const affordableAll = Math.floor(cash / state.price);
  const resolvedQty = qtyOption === "ALL" ? (side === "buy" ? affordableAll : state.holding) : qtyOption;
  const total = resolvedQty * state.price;
  const disabled =
    resolvedQty <= 0 || (side === "buy" ? total > cash + 0.001 : resolvedQty > state.holding);

  return (
    <View style={styles.wrap}>
      <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
      <View style={styles.sideToggle}>
        <Pressable
          style={[styles.sideBtn, side === "buy" && styles.sideBtnActiveBuy]}
          onPress={() => setSide("buy")}
        >
          <Text style={[styles.sideBtnText, side === "buy" && styles.sideBtnTextActive]}>
            {t("market.buyShort")}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.sideBtn, side === "sell" && styles.sideBtnActiveSell]}
          onPress={() => setSide("sell")}
        >
          <Text style={[styles.sideBtnText, side === "sell" && styles.sideBtnTextActive]}>
            {t("market.sellShort")}
          </Text>
        </Pressable>
      </View>

      <View style={styles.qtyRow}>
        {([1, 5, "ALL"] as Qty[]).map((q) => (
          <Pressable
            key={String(q)}
            style={[styles.qtyBtn, qtyOption === q && { borderColor: good.color, borderWidth: 2 }]}
            onPress={() => setQtyOption(q)}
          >
            <Text style={styles.qtyBtnText}>{q === "ALL" ? t("common.all") : q}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>
          {resolvedQty} x {t(good.nameKey)} @ {state.price.toFixed(2)}
        </Text>
        <Text style={styles.summaryTotal}>{total.toFixed(1)} 🪙</Text>
      </View>

      <ScalePressable
        disabled={disabled}
        onPress={() => onTrade(side, resolvedQty)}
        style={[styles.confirmBtn, disabled && styles.confirmBtnDisabled]}
        scaleTo={0.97}
      >
        <GradientFill colors={side === "buy" ? GREEN_GRADIENT : RED_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
        <Text style={styles.confirmBtnText}>
          {side === "buy" ? t("market.buyConfirm") : t("market.sellConfirm")} {good.icon}
        </Text>
      </ScalePressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    padding: 12,
    overflow: "hidden",
    ...cardShadow,
  },
  sideToggle: {
    flexDirection: "row",
    backgroundColor: "#1a1410",
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
  },
  sideBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  sideBtnActiveBuy: { backgroundColor: "#3fae5c" },
  sideBtnActiveSell: { backgroundColor: "#c94b4b" },
  sideBtnText: { color: "#a0917a", fontWeight: "700", fontSize: 13 },
  sideBtnTextActive: { color: "#fff" },
  qtyRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  qtyBtn: {
    flex: 1,
    backgroundColor: "#1a1410",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    marginRight: 8,
  },
  qtyBtnText: { color: "#f0e3c8", fontWeight: "700", fontSize: 12 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  summaryLabel: { color: "#a0917a", fontSize: 12 },
  summaryTotal: { color: "#e8c777", fontSize: 13, fontWeight: "700" },
  confirmBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center", overflow: "hidden" },
  confirmBtnDisabled: { opacity: 0.35 },
  confirmBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
