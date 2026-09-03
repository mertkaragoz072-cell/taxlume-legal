import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSoundEffects } from "../audio/useSoundEffects";
import { GradientFill } from "../components/GradientFill";
import { ScalePressable } from "../components/ScalePressable";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS, GOODS_BY_ID } from "../economy/goods";
import { TOWNS, TOWNS_BY_ID, TownId } from "../economy/towns";
import { CaravanDirection, GoodId } from "../economy/types";
import { UPGRADES_BY_ID } from "../economy/upgrades";
import { BLUE_GRADIENT, CARD_GRADIENT, cardShadow, GREEN_GRADIENT } from "../theme";

interface Props {
  sounds: ReturnType<typeof useSoundEffects>;
}

type QtyOption = 1 | 5 | "ALL";

export function TradeScreen({ sounds }: Props) {
  const { state, sendCaravan } = useEconomyContext();
  const [townId, setTownId] = useState<TownId>(TOWNS[0].id);
  const [goodId, setGoodId] = useState<GoodId>(GOODS[0].id);
  const [direction, setDirection] = useState<CaravanDirection>("export");
  const [qtyOption, setQtyOption] = useState<QtyOption>(5);

  const town = TOWNS_BY_ID[townId];
  const townState = state.foreignTowns[townId];
  const good = GOODS_BY_ID[goodId];
  const homePrice = state.goods[goodId].price;
  const theirPrice = townState.prices[goodId];
  const holding = state.goods[goodId].holding;

  const tariffRate = Math.max(
    0,
    town.tariffRate - state.upgrades.caravanserai * UPGRADES_BY_ID.caravanserai.effectPerLevel
  );
  const affordableImport = Math.floor(state.cash / (theirPrice * (1 + tariffRate)));
  const resolvedQty =
    qtyOption === "ALL" ? (direction === "export" ? holding : affordableImport) : qtyOption;

  const gross = resolvedQty * theirPrice;
  const net = direction === "export" ? gross * (1 - tariffRate) : gross * (1 + tariffRate);
  const disabled =
    resolvedQty <= 0 ||
    (direction === "export" ? resolvedQty > holding : net > state.cash + 0.001);

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionLabel}>KOMŞU KASABALAR</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.townRow}>
        {TOWNS.map((t) => {
          const selected = t.id === townId;
          const effectiveTariff = Math.max(
            0,
            t.tariffRate - state.upgrades.caravanserai * UPGRADES_BY_ID.caravanserai.effectPerLevel
          );
          return (
            <ScalePressable
              key={t.id}
              onPress={() => setTownId(t.id)}
              style={[styles.townPill, selected && styles.townPillActive]}
            >
              <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
              <Text style={styles.townIcon}>{t.icon}</Text>
              <Text style={styles.townName}>{t.name}</Text>
              <Text style={styles.townMeta}>
                {t.distanceTicks} tur · %{(effectiveTariff * 100).toFixed(0)} vergi
              </Text>
            </ScalePressable>
          );
        })}
      </ScrollView>

      <Text style={styles.sectionLabel}>{town.name.toUpperCase()} FİYATLARI</Text>
      <View style={styles.goodsTable}>
        {GOODS.map((g) => {
          const home = state.goods[g.id].price;
          const there = townState.prices[g.id];
          const delta = ((there - home) / home) * 100;
          const selected = g.id === goodId;
          return (
            <ScalePressable
              key={g.id}
              onPress={() => setGoodId(g.id)}
              style={[styles.goodRow, selected && { borderColor: g.color, borderWidth: 2 }]}
              scaleTo={0.98}
            >
              <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
              <Text style={styles.goodIcon}>{g.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.goodName}>{g.name}</Text>
                <Text style={styles.goodPrices}>
                  Bizde {home.toFixed(2)} 🪙 · Onlarda {there.toFixed(2)} 🪙
                </Text>
              </View>
              <Text style={[styles.goodDelta, { color: delta >= 0 ? "#3fae5c" : "#c94b4b" }]}>
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(0)}%
              </Text>
            </ScalePressable>
          );
        })}
      </View>

      <View style={styles.panel}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <View style={styles.sideToggle}>
          <ScalePressable
            style={[styles.sideBtn, direction === "export" && styles.sideBtnActiveExport]}
            onPress={() => setDirection("export")}
          >
            <Text style={[styles.sideBtnText, direction === "export" && styles.sideBtnTextActive]}>
              İHRAÇ ET (Sat)
            </Text>
          </ScalePressable>
          <ScalePressable
            style={[styles.sideBtn, direction === "import" && styles.sideBtnActiveImport]}
            onPress={() => setDirection("import")}
          >
            <Text style={[styles.sideBtnText, direction === "import" && styles.sideBtnTextActive]}>
              İTHAL ET (Al)
            </Text>
          </ScalePressable>
        </View>

        <View style={styles.qtyRow}>
          {([1, 5, "ALL"] as QtyOption[]).map((q) => (
            <ScalePressable
              key={String(q)}
              style={[styles.qtyBtn, qtyOption === q && { borderColor: good.color, borderWidth: 2 }]}
              onPress={() => setQtyOption(q)}
            >
              <Text style={styles.qtyBtnText}>{q === "ALL" ? "TÜMÜ" : q}</Text>
            </ScalePressable>
          ))}
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {resolvedQty} x {good.name} @ {theirPrice.toFixed(2)} ({town.name})
          </Text>
          <Text style={styles.summaryTotal}>
            {direction === "export" ? "+" : "-"}
            {net.toFixed(1)} 🪙
          </Text>
        </View>
        <Text style={styles.etaText}>
          🚚 Kervan {town.distanceTicks} turda ulaşır · %{(tariffRate * 100).toFixed(0)} vergi dahil
          {tariffRate < town.tariffRate ? " (Kervansaray indirimli)" : ""}
        </Text>

        <ScalePressable
          disabled={disabled}
          onPress={() => {
            sendCaravan(townId, goodId, direction, resolvedQty);
            if (direction === "export") sounds.playSell();
            else sounds.playBuy();
          }}
          style={[styles.confirmBtn, disabled && styles.confirmBtnDisabled]}
          scaleTo={0.97}
        >
          <GradientFill
            colors={direction === "export" ? GREEN_GRADIENT : BLUE_GRADIENT}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          />
          <Text style={styles.confirmBtnText}>
            Kervanı Yola Çıkar {good.icon}
          </Text>
        </ScalePressable>
      </View>

      <Text style={styles.sectionLabel}>AKTİF KERVANLAR</Text>
      {state.caravans.length === 0 && (
        <Text style={styles.emptyText}>Yolda kervan yok. Yukarıdan bir sevkiyat başlat.</Text>
      )}
      {[...state.caravans]
        .sort((a, b) => a.arrivesAtTick - b.arrivesAtTick)
        .map((c) => {
          const t = TOWNS_BY_ID[c.townId];
          const g = GOODS_BY_ID[c.goodId];
          const total = c.arrivesAtTick - c.departedTick;
          const elapsed = state.tick - c.departedTick;
          const progress = total > 0 ? clamp01(elapsed / total) : 1;
          const remaining = Math.max(0, c.arrivesAtTick - state.tick);
          return (
            <View key={c.id} style={styles.caravanCard}>
              <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
              <View style={styles.caravanHeader}>
                <Text style={styles.caravanTitle}>
                  {c.direction === "export" ? "📤" : "📥"} {t.icon} {t.name}
                </Text>
                <Text style={styles.caravanEta}>{remaining} tur kaldı</Text>
              </View>
              <Text style={styles.caravanSub}>
                {c.qty} {g.name} {c.direction === "export" ? "gönderildi" : "ithal ediliyor"}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
            </View>
          );
        })}
    </ScrollView>
  );
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    color: "#a0917a",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
  },
  townRow: { marginBottom: 20 },
  townPill: {
    borderRadius: 14,
    padding: 12,
    marginRight: 10,
    width: 128,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
    ...cardShadow,
  },
  townPillActive: { borderColor: "#e8c777" },
  townIcon: { fontSize: 22, marginBottom: 4 },
  townName: { color: "#f0e3c8", fontWeight: "700", fontSize: 13 },
  townMeta: { color: "#a0917a", fontSize: 10, marginTop: 4 },
  goodsTable: { marginBottom: 20 },
  goodRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
  },
  goodIcon: { fontSize: 22, marginRight: 10 },
  goodName: { color: "#f0e3c8", fontWeight: "700", fontSize: 13 },
  goodPrices: { color: "#a0917a", fontSize: 11, marginTop: 2 },
  goodDelta: { fontWeight: "800", fontSize: 13 },
  panel: { borderRadius: 16, padding: 12, marginBottom: 20, overflow: "hidden", ...cardShadow },
  sideToggle: {
    flexDirection: "row",
    backgroundColor: "#1a1410",
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
  },
  sideBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  sideBtnActiveExport: { backgroundColor: "#3fae5c" },
  sideBtnActiveImport: { backgroundColor: "#4a90c9" },
  sideBtnText: { color: "#a0917a", fontWeight: "700", fontSize: 11 },
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
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2 },
  summaryLabel: { color: "#a0917a", fontSize: 11, flex: 1, marginRight: 8 },
  summaryTotal: { color: "#e8c777", fontSize: 13, fontWeight: "700" },
  etaText: { color: "#a0917a", fontSize: 10, marginTop: 6, marginBottom: 10, paddingHorizontal: 2 },
  confirmBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center", overflow: "hidden" },
  confirmBtnDisabled: { opacity: 0.35 },
  confirmBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  emptyText: { color: "#a0917a", fontSize: 12, marginBottom: 10 },
  caravanCard: { borderRadius: 12, padding: 12, marginBottom: 10, overflow: "hidden" },
  caravanHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  caravanTitle: { color: "#f0e3c8", fontWeight: "700", fontSize: 12 },
  caravanEta: { color: "#e8c777", fontWeight: "700", fontSize: 11 },
  caravanSub: { color: "#a0917a", fontSize: 11, marginBottom: 8 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: "#1a1410", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#e8c777", borderRadius: 3 },
});
