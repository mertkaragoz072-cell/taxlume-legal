import React from "react";
import { formatPercent } from "../utils/formatNumber";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import statCoins from "../../assets/ui/statpanel2/coins.png";
import statMoneyBag from "../../assets/ui/statpanel2/moneybag.png";
import { Text } from "../components/AppText";
import { GoodIcon } from "../components/GoodIcon";
import { GradientFill } from "../components/GradientFill";
import { PlaquePanel } from "../components/PlaquePanel";
import { SectionLabel } from "../components/SectionLabel";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS } from "../economy/goods";
import { storageCapacity, totalGoodsHolding } from "../economy/useEconomy";
import {
  CARD_GRADIENT,
  cardShadow,
  PARCHMENT,
  COLORS,
  FONT,
  RADIUS,
  PANEL_GAP,
  SCREEN_PADDING,
  SPACING,
  TYPE,
  WEIGHT,
  withAlpha,
} from "../theme";

export function InventoryScreen() {
  const { state, portfolioValue, netWorth, t, formatCoins } = useEconomyContext();
  const holdings = GOODS.map((g) => ({ good: g, gs: state.goods[g.id] })).filter(({ gs }) => gs.holding > 0);
  const usedStorage = totalGoodsHolding(state);
  const capacity = storageCapacity(state);
  const storagePct = capacity > 0 ? Math.min(1, usedStorage / capacity) : 0;

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <PlaquePanel title={t("tabs.inventory")} style={{ marginBottom: PANEL_GAP }}>
        <View style={styles.sumRow}>
          <Image source={statCoins} style={styles.sumIcon} resizeMode="contain" />
          <Text style={styles.sumLabel}>{t("header.cash")}</Text>
          <Text style={styles.sumValue}>{formatCoins(state.cash)}</Text>
        </View>
        <View style={styles.sumRow}>
          {/* Placeholder glyph until the crate art arrives. */}
          <Text style={styles.sumIconGlyph}>📦</Text>
          <Text style={styles.sumLabel}>{t("inventory.portfolioValue")}</Text>
          <Text style={styles.sumValue}>{formatCoins(portfolioValue)}</Text>
        </View>
        <View style={styles.sumDivider}>
          <View style={styles.sumLine} />
          <Text style={styles.sumOrnament}>❖</Text>
          <View style={styles.sumLine} />
        </View>
        <View style={styles.sumRow}>
          <Image source={statMoneyBag} style={styles.sumIcon} resizeMode="contain" />
          <Text style={[styles.sumLabel, styles.sumLabelStrong]}>{t("header.netWorth")}</Text>
          <Text style={[styles.sumValue, styles.sumValueStrong]}>{formatCoins(netWorth)}</Text>
        </View>
      </PlaquePanel>

      <View style={styles.storageCard}>
        <GradientFill colors={["#3b2616", "#2a1a0e"]} x1="0" y1="0" x2="0" y2="1" />
        <View pointerEvents="none" style={[styles.bracket, styles.bracketTL]} />
        <View pointerEvents="none" style={[styles.bracket, styles.bracketTR]} />
        <View pointerEvents="none" style={[styles.bracket, styles.bracketBL]} />
        <View pointerEvents="none" style={[styles.bracket, styles.bracketBR]} />
        {/* Placeholder glyph until the chest art arrives. */}
        <Text style={styles.storageIcon}>🧰</Text>
        <View style={styles.storageMain}>
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
                  backgroundColor: storagePct >= 1 ? COLORS.negative : "#e8c777",
                },
              ]}
            />
          </View>
          {storagePct >= 1 && <Text style={styles.storageFullNote}>{t("inventory.storageFull")}</Text>}
        </View>
      </View>

      <SectionLabel text={t("inventory.sectionLabel")} color={COLORS.accent} />
      {holdings.length === 0 && (
        <View style={styles.emptyBox}>
          <GradientFill colors={["#2c1d12", "#1a110a"]} x1="0" y1="0" x2="0" y2="1" />
          {/* Placeholder for the cellar scene with the open chest. */}
          <Text style={styles.emptyGlyph}>🧰</Text>
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
            <GoodIcon id={good.id} fallback={good.icon} size={36} style={{ marginRight: SPACING.md }} />
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
              <Text style={styles.rowShare}>{formatPercent(share, state.language)}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: SCREEN_PADDING, paddingBottom: 40 },
  sumRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  sumIcon: { width: 44, height: 44, marginRight: SPACING.md },
  sumIconGlyph: { width: 44, fontSize: 30, textAlign: "center", marginRight: SPACING.md },
  sumLabel: { flex: 1, color: PARCHMENT.ink, fontFamily: FONT.medium, fontSize: TYPE.title },
  sumLabelStrong: { fontFamily: FONT.bold },
  sumValue: { color: PARCHMENT.ink, fontFamily: FONT.black, fontSize: TYPE.title },
  sumValueStrong: { fontSize: TYPE.heading },
  sumDivider: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 2 },
  sumLine: { flex: 1, height: 1, backgroundColor: "rgba(61,36,21,0.3)" },
  sumOrnament: { color: "#a77a3c", fontSize: TYPE.label },
  storageCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.card,
    borderWidth: 2,
    borderColor: "#6f4e2e",
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    marginBottom: PANEL_GAP,
    overflow: "hidden",
    ...cardShadow,
  },
  bracket: { position: "absolute", width: 9, height: 9, borderColor: "#b88a4a" },
  bracketTL: { top: 1, left: 1, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 5 },
  bracketTR: { top: 1, right: 1, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 5 },
  bracketBL: { bottom: 1, left: 1, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 5 },
  bracketBR: { bottom: 1, right: 1, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 5 },
  storageIcon: { fontSize: 30, marginRight: SPACING.md },
  storageMain: { flex: 1 },
  storageHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: SPACING.xs },
  storageLabel: { color: "#d9c7a3", fontFamily: FONT.medium, fontSize: TYPE.body },
  storageValue: { color: "#f4e8ce", fontFamily: FONT.black, fontSize: TYPE.body },
  storageTrack: { height: 10, borderRadius: 5, backgroundColor: "#140d07", overflow: "hidden" },
  storageFill: { height: "100%", borderRadius: 5 },
  storageFullNote: { color: COLORS.negative, fontSize: TYPE.micro, marginTop: SPACING.xs },
  emptyBox: {
    borderRadius: RADIUS.card,
    borderWidth: 2,
    borderColor: "#6f4e2e",
    paddingVertical: SPACING.xl + 8,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
    overflow: "hidden",
    marginBottom: PANEL_GAP,
  },
  emptyGlyph: { fontSize: 64, marginBottom: SPACING.sm },
  emptyText: {
    color: "#f4e8ce",
    fontFamily: FONT.bold,
    fontSize: TYPE.heading,
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  emptySub: { color: "#bfae8c", fontSize: TYPE.body, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.card,
    borderWidth: 2,
    borderColor: "#6f4e2e",
    padding: SPACING.md,
    paddingLeft: SPACING.md + 3,
    marginBottom: PANEL_GAP,
    overflow: "hidden",
  },
  accentStripe: { position: "absolute", top: 0, bottom: 0, left: 0, width: 3 },
  rowMain: { flex: 1, marginRight: SPACING.sm + 2 },
  rowName: {
    color: COLORS.textPrimary,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    fontSize: TYPE.title,
  },
  rowSub: { color: COLORS.textMuted, fontSize: TYPE.caption, marginTop: 1, marginBottom: SPACING.sm - 2 },
  barTrack: { height: 5, borderRadius: 3, backgroundColor: COLORS.onLight, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  rowValue: { color: COLORS.accent, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.body },
  rowShare: { color: COLORS.textMuted, fontSize: TYPE.caption, marginTop: 2 },
});
