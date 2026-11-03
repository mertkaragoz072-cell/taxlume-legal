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
  CARD_GRADIENT,
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
                    backgroundColor: storagePct >= 1 ? COLORS.negative : "#e8b84a",
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
