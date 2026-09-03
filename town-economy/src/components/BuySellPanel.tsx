import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Good, GoodState } from "../economy/types";

interface Props {
  good: Good;
  state: GoodState;
  cash: number;
  onTrade: (side: "buy" | "sell", qty: number) => void;
}

type Qty = 1 | 5 | "ALL";

export function BuySellPanel({ good, state, cash, onTrade }: Props) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qtyOption, setQtyOption] = useState<Qty>(1);

  const affordableAll = Math.floor(cash / state.price);
  const resolvedQty = qtyOption === "ALL" ? (side === "buy" ? affordableAll : state.holding) : qtyOption;
  const total = resolvedQty * state.price;
  const disabled =
    resolvedQty <= 0 || (side === "buy" ? total > cash + 0.001 : resolvedQty > state.holding);

  return (
    <View style={styles.wrap}>
      <View style={styles.sideToggle}>
        <Pressable
          style={[styles.sideBtn, side === "buy" && styles.sideBtnActiveBuy]}
          onPress={() => setSide("buy")}
        >
          <Text style={[styles.sideBtnText, side === "buy" && styles.sideBtnTextActive]}>AL</Text>
        </Pressable>
        <Pressable
          style={[styles.sideBtn, side === "sell" && styles.sideBtnActiveSell]}
          onPress={() => setSide("sell")}
        >
          <Text style={[styles.sideBtnText, side === "sell" && styles.sideBtnTextActive]}>SAT</Text>
        </Pressable>
      </View>

      <View style={styles.qtyRow}>
        {([1, 5, "ALL"] as Qty[]).map((q) => (
          <Pressable
            key={String(q)}
            style={[styles.qtyBtn, qtyOption === q && { borderColor: good.color, borderWidth: 2 }]}
            onPress={() => setQtyOption(q)}
          >
            <Text style={styles.qtyBtnText}>{q === "ALL" ? "TÜMÜ" : q}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>
          {resolvedQty} x {good.name} @ {state.price.toFixed(2)}
        </Text>
        <Text style={styles.summaryTotal}>{total.toFixed(1)} 🪙</Text>
      </View>

      <Pressable
        disabled={disabled}
        onPress={() => onTrade(side, resolvedQty)}
        style={[
          styles.confirmBtn,
          { backgroundColor: side === "buy" ? "#3fae5c" : "#c94b4b" },
          disabled && styles.confirmBtnDisabled,
        ]}
      >
        <Text style={styles.confirmBtnText}>
          {side === "buy" ? "SATIN AL" : "SAT"} {good.icon}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#2a2016",
    borderRadius: 16,
    padding: 12,
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
  confirmBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  confirmBtnDisabled: { opacity: 0.35 },
  confirmBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
