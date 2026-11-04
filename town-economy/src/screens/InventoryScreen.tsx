import React from "react";
import { formatPercent } from "../utils/formatNumber";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import bagImg from "../../assets/ui/inventory/bag.png";
import coinsImg from "../../assets/ui/inventory/coins.png";
import crateImg from "../../assets/ui/inventory/crate.png";
import sceneImg from "../../assets/ui/inventory/scene_tall.png";
import storageImg from "../../assets/ui/inventory/storage.png";
import summaryImg from "../../assets/ui/inventory/summary.png";
import { Text } from "../components/AppText";
import { GoodIcon } from "../components/GoodIcon";
import { GradientFill } from "../components/GradientFill";
import { AssetRibbon, BeamTitle, FixedPanel } from "../components/ImagePanels";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS } from "../economy/goods";
import { storageCapacity, totalGoodsHolding } from "../economy/useEconomy";
import {
  PARCHMENT,
  COLORS,
  FONT,
  RADIUS,
  PANEL_GAP,
  SCREEN_PADDING,
  SPACING,
  TYPE,
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
      <BeamTitle title={t("tabs.inventory")} />
      <FixedPanel source={summaryImg} aspect={764 / 398} style={{ marginTop: -4, marginBottom: PANEL_GAP }}>
        {(w) => (
          <>
            {[
              { y: 27.4, icon: coinsImg, label: t("header.cash"), value: state.cash, strong: false },
              {
                y: 51.1,
                icon: crateImg,
                label: t("inventory.portfolioValue"),
                value: portfolioValue,
                strong: false,
              },
              { y: 77.7, icon: bagImg, label: t("header.netWorth"), value: netWorth, strong: true },
            ].map((row) => (
              <View key={row.label} style={[styles.sumRow, { top: `${row.y - 10}%` }]}>
                <Image
                  source={row.icon}
                  style={[styles.sumIcon, { width: w * 0.115 }]}
                  resizeMode="contain"
                />
                <Text style={[styles.sumLabel, { fontSize: w * 0.044 }]} numberOfLines={1}>
                  {row.label}
                </Text>
                <Text
                  style={[styles.sumValue, { fontSize: w * (row.strong ? 0.054 : 0.05) }]}
                  numberOfLines={1}
                >
                  {formatCoins(row.value)}
                </Text>
              </View>
            ))}
          </>
        )}
      </FixedPanel>

      <FixedPanel source={storageImg} aspect={733 / 147} style={{ marginBottom: PANEL_GAP }}>
        {(w) => (
          <>
            <Text style={[styles.storageLabel, { fontSize: w * 0.044 }]} numberOfLines={1}>
              {t("inventory.storageLabel")}
            </Text>
            <Text style={[styles.storageValue, { fontSize: w * 0.05 }]} numberOfLines={1}>
              {t("inventory.storageUsage", { used: Math.round(usedStorage), capacity: Math.round(capacity) })}
            </Text>
            <View style={styles.storageTrack}>
              <View
                style={[
                  styles.storageFill,
                  {
                    width: `${storagePct * 100}%`,
                    backgroundColor:
                      storagePct >= 1 ? COLORS.negative : storagePct >= 0.8 ? "#e8873a" : "#e8b84a",
                  },
                ]}
              />
            </View>
            {storagePct >= 1 && <Text style={styles.storageFullNote}>{t("inventory.storageFull")}</Text>}
          </>
        )}
      </FixedPanel>

      <AssetRibbon text={t("inventory.sectionLabel")} />
      {holdings.length === 0 && (
        <FixedPanel source={sceneImg} aspect={933 / 505} style={{ marginBottom: PANEL_GAP }}>
          {(w) => (
            // Printed straight on the scene's own cobbled floor, under the
            // chest — no panel or tint behind the words.
            <View style={styles.emptyCaption}>
              <Text style={[styles.emptyText, { fontSize: w * 0.046 }]}>{t("inventory.emptyTitle")}</Text>
              <Text style={[styles.emptySub, { fontSize: w * 0.0255 }]} numberOfLines={1}>
                {t("inventory.emptySubtitle")}
              </Text>
            </View>
          )}
        </FixedPanel>
      )}
      {holdings.map(({ good, gs }) => {
        const value = gs.holding * gs.price;
        const share = portfolioValue > 0 ? (value / portfolioValue) * 100 : 0;
        // Unrealised profit on what is held: today's price against what the
        // player paid on average. Nothing is shown until there is a cost basis.
        const hasCost = gs.avgCost > 0;
        const pnl = hasCost ? (gs.price - gs.avgCost) * gs.holding : 0;
        const pnlPct = hasCost ? (gs.price / gs.avgCost - 1) * 100 : 0;
        const up = pnl >= 0;
        return (
          <View key={good.id} style={styles.row}>
            <GradientFill colors={["#3b2616", "#24150b"]} x1="0" y1="0" x2="0" y2="1" />
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(good.color, 0.14) }]}
            />
            <View style={styles.iconPlate}>
              <GoodIcon id={good.id} fallback={good.icon} size={40} />
            </View>
            <View style={styles.rowMain}>
              <View style={styles.rowTop}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {t(good.nameKey)}
                </Text>
                <View style={styles.qtyChip}>
                  <Text style={styles.qtyChipText}>×{gs.holding}</Text>
                </View>
              </View>
              <Text style={styles.rowSub}>
                {t("inventory.rowSub", { qty: gs.holding, price: gs.price.toFixed(2) })}
              </Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${share}%`, backgroundColor: good.color }]} />
              </View>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{formatCoins(value)}</Text>
              {hasCost && (
                <View style={[styles.pnlChip, up ? styles.pnlUp : styles.pnlDown]}>
                  <Text style={[styles.pnlText, { color: up ? "#8fe0a3" : "#ff9d94" }]}>
                    {up ? "▲" : "▼"} {up ? "+" : ""}
                    {formatPercent(pnlPct, state.language, 1)}
                  </Text>
                </View>
              )}
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
  sumRow: {
    position: "absolute",
    left: "10%",
    right: "6.5%",
    height: "20%",
    flexDirection: "row",
    alignItems: "center",
  },
  sumIcon: { aspectRatio: 1, marginRight: "3%" },
  sumLabel: { flex: 1, color: PARCHMENT.ink, fontFamily: FONT.serif },
  sumValue: { color: PARCHMENT.ink, fontFamily: FONT.serif, fontVariant: ["lining-nums"] },
  storageLabel: {
    position: "absolute",
    left: "21.5%",
    top: "14%",
    color: "#f1e3c4",
    fontFamily: FONT.serif,
  },
  storageValue: {
    position: "absolute",
    right: "8%",
    top: "11%",
    color: "#fff6e0",
    fontFamily: FONT.serif,
    fontVariant: ["lining-nums"],
  },
  storageTrack: {
    position: "absolute",
    left: "20.4%",
    width: "72.2%",
    top: "52.5%",
    height: "20%",
    borderRadius: 999,
    overflow: "hidden",
    padding: 2,
  },
  storageFill: { height: "100%", borderRadius: 999 },
  storageFullNote: {
    position: "absolute",
    right: "8%",
    bottom: "2%",
    color: COLORS.negative,
    fontSize: TYPE.micro,
  },
  emptyCaption: {
    position: "absolute",
    left: "12%",
    right: "12%",
    bottom: "22%",
    alignItems: "center",
  },
  emptyText: {
    color: "#fff3d6",
    fontFamily: FONT.serif,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,1)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  emptySub: {
    color: "#f4e6c4",
    fontFamily: FONT.bold,
    textAlign: "center",
    marginTop: 2,
    textShadowColor: "rgba(0,0,0,1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.card,
    borderWidth: 2,
    borderColor: "#8a5f33",
    padding: SPACING.sm + 2,
    marginBottom: PANEL_GAP,
    overflow: "hidden",
  },
  iconPlate: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "rgba(246,231,196,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(201,160,90,0.6)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  rowMain: { flex: 1, marginRight: SPACING.sm + 2, minWidth: 0 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowName: { color: "#f6e7c4", fontFamily: FONT.serif, fontSize: TYPE.heading, flexShrink: 1 },
  qtyChip: {
    backgroundColor: "#f6d36a",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  qtyChipText: { color: "#3d2415", fontFamily: FONT.black, fontSize: TYPE.caption },
  rowSub: { color: "#cdbb98", fontSize: TYPE.caption, marginTop: 2, marginBottom: SPACING.sm - 2 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: "#140d07", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  rowRight: { alignItems: "flex-end", gap: 3 },
  rowValue: { color: "#f6e7c4", fontFamily: FONT.serif, fontSize: TYPE.title },
  pnlChip: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1, borderWidth: 1 },
  pnlUp: { backgroundColor: "rgba(47,138,77,0.28)", borderColor: "rgba(143,224,163,0.6)" },
  pnlDown: { backgroundColor: "rgba(168,69,61,0.3)", borderColor: "rgba(255,157,148,0.6)" },
  pnlText: { fontFamily: FONT.bold, fontSize: TYPE.caption },
  rowShare: { color: "#a99877", fontSize: TYPE.micro },
});
