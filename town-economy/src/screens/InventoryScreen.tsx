import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { GradientFill } from "../components/GradientFill";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS } from "../economy/goods";
import { CARD_GRADIENT, cardShadow } from "../theme";

export function InventoryScreen() {
  const { state, portfolioValue, netWorth, t, formatCoins } = useEconomyContext();
  const holdings = GOODS.map((g) => ({ good: g, gs: state.goods[g.id] })).filter(
    ({ gs }) => gs.holding > 0
  );

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={styles.summaryCard}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t("header.cash")}</Text>
          <Text style={styles.summaryValue}>{formatCoins(state.cash)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t("inventory.portfolioValue")}</Text>
          <Text style={styles.summaryValue}>{formatCoins(portfolioValue)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.netRow]}>
          <Text style={styles.netLabel}>{t("header.netWorth")}</Text>
          <Text style={styles.netValue}>{formatCoins(netWorth)}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>{t("inventory.sectionLabel")}</Text>
      {holdings.length === 0 && (
        <View style={styles.emptyBox}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          <Text style={styles.emptyText}>{t("inventory.emptyTitle")}</Text>
          <Text style={styles.emptySub}>{t("inventory.emptySubtitle")}</Text>
        </View>
      )}
      {holdings.map(({ good, gs }) => {
        const value = gs.holding * gs.price;
        const share = portfolioValue > 0 ? (value / portfolioValue) * 100 : 0;
        return (
          <View key={good.id} style={styles.row}>
            <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
            <View style={[styles.accentStripe, { backgroundColor: good.color }]} />
            <Text style={styles.rowIcon}>{good.icon}</Text>
            <View style={styles.rowMain}>
              <Text style={styles.rowName}>{t(good.nameKey)}</Text>
              <Text style={styles.rowSub}>
                {t("inventory.rowSub", { qty: gs.holding, price: gs.price.toFixed(2) })}
              </Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${share}%`, backgroundColor: good.color }]} />
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.rowValue}>{formatCoins(value)}</Text>
              <Text style={styles.rowShare}>%{share.toFixed(0)}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    overflow: "hidden",
    ...cardShadow,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { color: "#a0917a", fontSize: 13 },
  summaryValue: { color: "#f0e3c8", fontSize: 13, fontWeight: "600" },
  netRow: { marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#3a2d1e", marginBottom: 0 },
  netLabel: { color: "#e8c777", fontSize: 14, fontWeight: "700" },
  netValue: { color: "#e8c777", fontSize: 16, fontWeight: "800" },
  sectionLabel: {
    color: "#a0917a",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
  },
  emptyBox: {
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    overflow: "hidden",
  },
  emptyText: { color: "#f0e3c8", fontWeight: "600", marginBottom: 4 },
  emptySub: { color: "#a0917a", fontSize: 12, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    paddingLeft: 15,
    marginBottom: 10,
    overflow: "hidden",
  },
  accentStripe: { position: "absolute", top: 0, bottom: 0, left: 0, width: 3 },
  rowIcon: { fontSize: 26, marginRight: 12 },
  rowMain: { flex: 1, marginRight: 10 },
  rowName: { color: "#f0e3c8", fontWeight: "700", fontSize: 14 },
  rowSub: { color: "#a0917a", fontSize: 11, marginTop: 1, marginBottom: 6 },
  barTrack: { height: 5, borderRadius: 3, backgroundColor: "#1a1410", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  rowValue: { color: "#e8c777", fontWeight: "700", fontSize: 13 },
  rowShare: { color: "#a0917a", fontSize: 11, marginTop: 2 },
});
