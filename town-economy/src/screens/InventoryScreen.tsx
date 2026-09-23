import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { GradientFill } from "../components/GradientFill";
import { SectionLabel } from "../components/SectionLabel";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS } from "../economy/goods";
import { storageCapacity, totalGoodsHolding } from "../economy/useEconomy";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";

export function InventoryScreen() {
  const { state, portfolioValue, netWorth, t, formatCoins } = useEconomyContext();
  const holdings = GOODS.map((g) => ({ good: g, gs: state.goods[g.id] })).filter(({ gs }) => gs.holding > 0);
  const usedStorage = totalGoodsHolding(state);
  const capacity = storageCapacity(state);
  const storagePct = capacity > 0 ? Math.min(1, usedStorage / capacity) : 0;

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

      <View style={styles.storageCard}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <View style={styles.storageHeaderRow}>
          <Text style={styles.storageLabel}>{t("inventory.storageLabel")}</Text>
          <Text style={styles.storageValue}>
            {t("inventory.storageUsage", { used: Math.round(usedStorage), capacity: Math.round(capacity) })}
          </Text>
        </View>
        <View style={styles.storageTrack}>
          <View
            style={[
              styles.storageFill,
              {
                width: `${storagePct * 100}%`,
                backgroundColor: storagePct >= 1 ? COLORS.negative : COLORS.accent,
              },
            ]}
          />
        </View>
        {storagePct >= 1 && <Text style={styles.storageFullNote}>{t("inventory.storageFull")}</Text>}
      </View>

      <SectionLabel text={t("inventory.sectionLabel")} color={COLORS.accent} />
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
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(good.color, 0.1) }]}
            />
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
  body: { padding: SPACING.lg, paddingBottom: 40 },
  summaryCard: {
    borderRadius: RADIUS.feature,
    padding: SPACING.lg,
    marginBottom: SPACING.xl - 4,
    overflow: "hidden",
    ...cardShadow,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: SPACING.sm },
  summaryLabel: { color: COLORS.textMuted, fontSize: TYPE.body },
  summaryValue: {
    color: COLORS.textPrimary,
    fontSize: TYPE.body,
    fontWeight: WEIGHT.medium,
    fontFamily: FONT.medium,
  },
  netRow: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm + 2,
    borderTopWidth: 1,
    borderTopColor: "#3a2d1e",
    marginBottom: 0,
  },
  netLabel: { color: COLORS.accent, fontSize: TYPE.body + 1, fontWeight: WEIGHT.bold, fontFamily: FONT.bold },
  netValue: { color: COLORS.accent, fontSize: TYPE.title, fontWeight: WEIGHT.black, fontFamily: FONT.black },
  storageCard: {
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    marginBottom: SPACING.xl - 4,
    overflow: "hidden",
    ...cardShadow,
  },
  storageHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: SPACING.xs },
  storageLabel: { color: COLORS.textMuted, fontSize: TYPE.label },
  storageValue: {
    color: COLORS.textPrimary,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
  storageTrack: { height: 8, borderRadius: 4, backgroundColor: "#1a1410", overflow: "hidden" },
  storageFill: { height: "100%", borderRadius: 4 },
  storageFullNote: { color: COLORS.negative, fontSize: TYPE.micro, marginTop: SPACING.xs },
  emptyBox: {
    borderRadius: RADIUS.card,
    padding: SPACING.xl - 4,
    alignItems: "center",
    overflow: "hidden",
  },
  emptyText: {
    color: COLORS.textPrimary,
    fontWeight: WEIGHT.medium,
    fontFamily: FONT.medium,
    marginBottom: SPACING.xs,
  },
  emptySub: { color: COLORS.textMuted, fontSize: TYPE.label, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    paddingLeft: SPACING.md + 3,
    marginBottom: SPACING.sm + 2,
    overflow: "hidden",
  },
  accentStripe: { position: "absolute", top: 0, bottom: 0, left: 0, width: 3 },
  rowIcon: { fontSize: 26, marginRight: SPACING.md },
  rowMain: { flex: 1, marginRight: SPACING.sm + 2 },
  rowName: { color: COLORS.textPrimary, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.body },
  rowSub: { color: COLORS.textMuted, fontSize: TYPE.caption, marginTop: 1, marginBottom: SPACING.sm - 2 },
  barTrack: { height: 5, borderRadius: 3, backgroundColor: COLORS.onLight, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  rowValue: { color: COLORS.accent, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.body },
  rowShare: { color: COLORS.textMuted, fontSize: TYPE.caption, marginTop: 2 },
});
