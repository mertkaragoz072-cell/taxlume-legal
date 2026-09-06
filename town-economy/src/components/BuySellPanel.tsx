import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import {
  CARD_GRADIENT,
  cardShadow,
  COLORS,
  GREEN_GRADIENT,
  RADIUS,
  RED_GRADIENT,
  SPACING,
  TYPE,
  WEIGHT,
} from "../theme";
import { CoinPop } from "./CoinPop";
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
  /** total round-trip bid/ask spread as a fraction of the quoted price (e.g. 0.03 = 3%); omit for no spread */
  spreadPct?: number;
}

type Qty = 1 | 5 | "ALL";

export function BuySellPanel({ good, state, cash, onTrade, spreadPct = 0 }: Props) {
  const { t, formatCoins } = useEconomyContext();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qtyOption, setQtyOption] = useState<Qty>(1);
  const [coinPopTrigger, setCoinPopTrigger] = useState(0);

  // The quoted chart price is the fair mid-price; what you actually pay or
  // receive sits a half-spread on either side of it, same as the reducer.
  const execPrice = side === "buy" ? state.price * (1 + spreadPct / 2) : state.price * (1 - spreadPct / 2);
  const affordableAll = Math.floor(cash / execPrice);
  const resolvedQty = qtyOption === "ALL" ? (side === "buy" ? affordableAll : state.holding) : qtyOption;
  const total = resolvedQty * execPrice;
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
          {resolvedQty} x {t(good.nameKey)} @ {execPrice.toFixed(2)}
        </Text>
        <Text style={styles.summaryTotal}>{formatCoins(total)}</Text>
      </View>

      <View style={styles.confirmBtnWrap}>
        <ScalePressable
          disabled={disabled}
          onPress={() => {
            onTrade(side, resolvedQty);
            setCoinPopTrigger((n) => n + 1);
          }}
          style={[styles.confirmBtn, disabled && styles.confirmBtnDisabled]}
          scaleTo={0.97}
        >
          <GradientFill colors={side === "buy" ? GREEN_GRADIENT : RED_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
          <Text style={styles.confirmBtnText}>
            {side === "buy" ? t("market.buyConfirm") : t("market.sellConfirm")} {good.icon}
          </Text>
        </ScalePressable>
        <CoinPop trigger={coinPopTrigger} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: RADIUS.feature,
    padding: SPACING.md,
    overflow: "hidden",
    ...cardShadow,
  },
  sideToggle: {
    flexDirection: "row",
    backgroundColor: "#1a1410",
    borderRadius: RADIUS.chip,
    padding: 3,
    marginBottom: SPACING.md - 2,
  },
  sideBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.chip - 2, alignItems: "center" },
  sideBtnActiveBuy: { backgroundColor: COLORS.positive },
  sideBtnActiveSell: { backgroundColor: COLORS.negative },
  sideBtnText: { color: COLORS.textMuted, fontWeight: WEIGHT.bold, fontSize: TYPE.body },
  sideBtnTextActive: { color: "#fff" },
  qtyRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md - 2 },
  qtyBtn: {
    flex: 1,
    backgroundColor: "#1a1410",
    borderRadius: RADIUS.chip,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    marginRight: SPACING.sm,
  },
  qtyBtnText: { color: COLORS.textPrimary, fontWeight: WEIGHT.bold, fontSize: TYPE.label },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.md - 2,
    paddingHorizontal: 2,
  },
  summaryLabel: { color: COLORS.textMuted, fontSize: TYPE.label },
  summaryTotal: { color: COLORS.accent, fontSize: TYPE.body, fontWeight: WEIGHT.bold },
  confirmBtnWrap: { position: "relative" },
  confirmBtn: { borderRadius: RADIUS.card, paddingVertical: SPACING.md, alignItems: "center", overflow: "hidden" },
  confirmBtnDisabled: { opacity: 0.35 },
  confirmBtnText: { color: "#fff", fontWeight: WEIGHT.black, fontSize: TYPE.body + 1 },
});
