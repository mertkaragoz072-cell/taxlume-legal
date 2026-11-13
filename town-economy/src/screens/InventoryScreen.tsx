import React from "react";
import { formatPercent } from "../utils/formatNumber";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import bagImg from "../../assets/ui/inventory/bag.png";
import coinsImg from "../../assets/ui/inventory/coins.png";
import crateImg from "../../assets/ui/inventory/crate.png";
import sceneImg from "../../assets/ui/inventory/scene_tall.png";
import chipDown from "../../assets/ui/inv2/chip_down.png";
import chipUp from "../../assets/ui/inv2/chip_up.png";
import qtyPill from "../../assets/ui/inv2/qty_pill.png";
import rowBrown from "../../assets/ui/inv2/row_brown.png";
import rowGold from "../../assets/ui/inv2/row_gold.png";
import rowGreen from "../../assets/ui/inv2/row_green.png";
import storageFull from "../../assets/ui/inv2/store_full.png";
import storageNormal from "../../assets/ui/inv2/store_normal.png";
import summaryImg from "../../assets/ui/inventory/summary.png";
import { Text } from "../components/AppText";
import { GoodIcon } from "../components/GoodIcon";
import { SpotlightTarget, useSpotlightScroll } from "../components/Spotlight";
import { MENTOR_STEPS } from "../economy/mentor";
import { AssetRibbon, BeamTitle, FixedPanel } from "../components/ImagePanels";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS } from "../economy/goods";
import { storageCapacity, totalGoodsHolding } from "../economy/useEconomy";
import { PARCHMENT, FONT, PANEL_GAP, SCREEN_PADDING } from "../theme";

export function InventoryScreen() {
  const { state, portfolioValue, netWorth, t, formatCoins } = useEconomyContext();
  const holdings = GOODS.map((g) => ({ good: g, gs: state.goods[g.id] })).filter(({ gs }) => gs.holding > 0);
  const usedStorage = totalGoodsHolding(state);
  const capacity = storageCapacity(state);
  const spotlightScroll = useSpotlightScroll();
  const mentorOn = state.mentorStep < MENTOR_STEPS.length;
  const storagePct = capacity > 0 ? Math.min(1, usedStorage / capacity) : 0;

  return (
    <ScrollView
      ref={spotlightScroll?.ref}
      onScroll={spotlightScroll?.onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={[styles.body, mentorOn && { paddingBottom: 300 }]}
      showsVerticalScrollIndicator={false}
    >
      <BeamTitle title={t("tabs.inventory")} />
      <SpotlightTarget id="holdings">
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
                  <Text
                    style={[styles.sumLabel, { fontSize: w * 0.044 }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    {row.label}
                  </Text>
                  <Text
                    style={[styles.sumValue, { fontSize: w * (row.strong ? 0.054 : 0.05) }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    {formatCoins(row.value)}
                  </Text>
                </View>
              ))}
            </>
          )}
        </FixedPanel>
      </SpotlightTarget>

      {/* The crate turns into the warning one (red badge) from 90% full. */}
      <FixedPanel
        source={storagePct >= 0.9 ? storageFull : storageNormal}
        aspect={storagePct >= 0.9 ? 839 / 123 : 838 / 151}
        style={{ marginBottom: PANEL_GAP }}
      >
        {(w) => {
          const warn = storagePct >= 0.9;
          return (
            <>
              <Text
                style={[styles.storageLabel, { fontSize: w * 0.044, top: warn ? "9%" : "8%" }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {t("inventory.storageLabel")}
              </Text>
              <Text
                style={[styles.storageValue, { fontSize: w * 0.05, top: warn ? "6%" : "5%" }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {t("inventory.storageUsage", {
                  used: Math.round(usedStorage),
                  capacity: Math.round(capacity),
                })}
              </Text>
              <View style={[styles.storageTrack, warn ? styles.storageTrackFull : styles.storageTrackNormal]}>
                <View
                  style={[
                    styles.storageFill,
                    {
                      width: `${storagePct * 100}%`,
                      backgroundColor:
                        storagePct >= 1 ? "#f0574a" : storagePct >= 0.8 ? "#f2993a" : "#f7d66a",
                    },
                  ]}
                />
              </View>
            </>
          );
        }}
      </FixedPanel>

      <AssetRibbon text={t("inventory.sectionLabel")} />
      {holdings.length === 0 && (
        <FixedPanel source={sceneImg} aspect={933 / 505} style={{ marginBottom: PANEL_GAP }}>
          {(w) => (
            // Printed straight on the scene's own cobbled floor, under the
            // chest — no panel or tint behind the words.
            <View style={styles.emptyCaption}>
              <Text style={[styles.emptyText, { fontSize: w * 0.046 }]}>{t("inventory.emptyTitle")}</Text>
              <Text
                style={[styles.emptySub, { fontSize: w * 0.0255 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
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
        const pnlPct = hasCost ? (gs.price / gs.avgCost - 1) * 100 : 0;
        const up = pnlPct >= 0;
        // Green board when the stock is in profit, brown when it is under
        // water, gold while there is nothing to compare against yet.
        const frame = !hasCost ? rowGold : up ? rowGreen : rowBrown;
        return (
          <FixedPanel key={good.id} source={frame} aspect={824 / 180} style={{ marginBottom: PANEL_GAP }}>
            {(w) => (
              <>
                <View style={styles.rowIcon}>
                  <GoodIcon id={good.id} fallback={good.icon} size={w * 0.125} />
                </View>
                <View style={styles.rowTextCol}>
                  <View style={styles.rowTop}>
                    <Text
                      style={[styles.rowName, { fontSize: w * 0.05 }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.6}
                    >
                      {t(good.nameKey)}
                    </Text>
                    <View style={{ width: w * 0.115, aspectRatio: 146 / 77 }}>
                      <Image source={qtyPill} style={styles.fillImg} resizeMode="stretch" />
                      <View style={styles.centerAll}>
                        <Text style={[styles.qtyText, { fontSize: w * 0.034 }]}>×{gs.holding}</Text>
                      </View>
                    </View>
                  </View>
                  <Text
                    style={[styles.rowSub, { fontSize: w * 0.032 }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    {t("inventory.rowSub", { qty: gs.holding, price: gs.price.toFixed(2) })} ·{" "}
                    {formatPercent(share, state.language)}
                  </Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${share}%`, backgroundColor: good.color }]} />
                  </View>
                </View>
                <View style={styles.rowRight}>
                  <Text
                    style={[styles.rowValue, { fontSize: w * 0.05 }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    {formatCoins(value)}
                  </Text>
                  {hasCost && (
                    <View style={{ width: w * 0.215, aspectRatio: 216 / 85 }}>
                      <Image source={up ? chipUp : chipDown} style={styles.fillImg} resizeMode="stretch" />
                      <View style={styles.chipTextWrap}>
                        <Text
                          style={[styles.pnlText, { fontSize: w * 0.032, color: up ? "#b6f0c3" : "#ffb3ab" }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.6}
                        >
                          {up ? "+" : ""}
                          {formatPercent(pnlPct, state.language, 1)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </>
            )}
          </FixedPanel>
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
  storageLabel: { position: "absolute", left: "21.5%", color: "#f1e3c4", fontFamily: FONT.serif },
  storageValue: {
    position: "absolute",
    right: "8%",
    color: "#fff6e0",
    fontFamily: FONT.serif,
    fontVariant: ["lining-nums"],
  },
  storageTrack: {
    position: "absolute",
    left: "22.6%",
    width: "69.6%",
    borderRadius: 999,
    overflow: "hidden",
    padding: 2,
  },
  storageTrackNormal: { top: "46.5%", height: "24%" },
  storageTrackFull: { top: "53%", height: "28%" },
  storageFill: { height: "100%", borderRadius: 999 },
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
  fillImg: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  centerAll: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIcon: {
    position: "absolute",
    left: "3.9%",
    top: "11.8%",
    width: "16.1%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTextCol: {
    position: "absolute",
    left: "22%",
    top: "10%",
    right: "30%",
    bottom: "12%",
    justifyContent: "space-between",
  },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowName: { color: "#f6e7c4", fontFamily: FONT.serif, flexShrink: 1 },
  qtyText: { color: "#3d2415", fontFamily: FONT.black },
  rowSub: { color: "#e2d2ae" },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: "rgba(20,13,7,0.85)", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  rowRight: {
    position: "absolute",
    right: "4%",
    top: "10%",
    bottom: "12%",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  rowValue: { color: "#fff3d6", fontFamily: FONT.serif },
  chipTextWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "36%",
    right: "8%",
    alignItems: "center",
    justifyContent: "center",
  },
  pnlText: { fontFamily: FONT.black },
});
