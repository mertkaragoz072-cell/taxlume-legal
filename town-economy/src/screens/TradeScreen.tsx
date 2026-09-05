import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSoundEffects } from "../audio/useSoundEffects";
import { GradientFill } from "../components/GradientFill";
import { ScalePressable } from "../components/ScalePressable";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS, GOODS_BY_ID } from "../economy/goods";
import { ForeignTown, TOWNS, TOWNS_BY_ID, TownId } from "../economy/towns";
import { CaravanDirection, ContractDirection, EconomyState, GoodId } from "../economy/types";
import {
  CONTRACT_MARGIN_PCT,
  CONTRACT_MAX_ACTIVE,
  CONTRACT_TERM_DAY_STEPS,
  effectiveMetropolUnlockNetWorth,
  effectiveTariffRate,
  effectiveTradeUnlockNetWorth,
  isGoodUnlocked,
  TICKS_PER_GAME_DAY,
} from "../economy/useEconomy";
import { BLUE_GRADIENT, CARD_GRADIENT, cardShadow, GREEN_GRADIENT } from "../theme";

interface Props {
  sounds: ReturnType<typeof useSoundEffects>;
}

type QtyOption = 1 | 5 | "ALL";

const REGULAR_TOWNS = TOWNS.filter((tn) => tn.tier === "town");
const METROPOLISES = TOWNS.filter((tn) => tn.tier === "metropol");

interface TownPillProps {
  town: ForeignTown;
  selected: boolean;
  onPress: () => void;
  state: EconomyState;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function TownPill({ town, selected, onPress, state, t }: TownPillProps) {
  const effectiveTariff = effectiveTariffRate(state, town);
  return (
    <ScalePressable
      onPress={onPress}
      style={[styles.townPill, selected && styles.townPillActive]}
    >
      <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
      <Text style={styles.townIcon}>{town.icon}</Text>
      <Text style={styles.townName}>{t(town.nameKey)}</Text>
      <Text style={styles.townMeta}>
        {t("trade.townMeta", { ticks: town.distanceTicks, tariff: (effectiveTariff * 100).toFixed(0) })}
      </Text>
    </ScalePressable>
  );
}

export function TradeScreen({ sounds }: Props) {
  const { state, sendCaravan, openContract, t, netWorth, formatCoins } = useEconomyContext();
  const [townId, setTownId] = useState<TownId>(TOWNS[0].id);
  const [goodId, setGoodId] = useState<GoodId>(GOODS[0].id);
  const [direction, setDirection] = useState<CaravanDirection>("export");
  const [qtyOption, setQtyOption] = useState<QtyOption>(5);
  const [contractDirection, setContractDirection] = useState<ContractDirection>("long");
  const [contractQty, setContractQty] = useState<1 | 5 | 10>(1);
  const [contractTermDays, setContractTermDays] = useState(CONTRACT_TERM_DAY_STEPS[0]);

  if (!state.tradeUnlocked) {
    const target = effectiveTradeUnlockNetWorth(state);
    const pct = Math.max(0, Math.min(1, netWorth / target));
    return (
      <ScrollView contentContainerStyle={styles.lockedBody} showsVerticalScrollIndicator={false}>
        <View style={styles.lockedCard}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          <Text style={styles.lockedIcon}>🔒</Text>
          <Text style={styles.lockedTitle}>{t("trade.locked.title")}</Text>
          <Text style={styles.lockedDesc}>
            {t("trade.locked.description", { target: Math.round(target) })}
          </Text>
          <View style={styles.lockedTrack}>
            <View style={[styles.lockedFill, { width: `${pct * 100}%` }]} />
          </View>
          <Text style={styles.lockedProgress}>
            {t("trade.locked.progress", {
              current: Math.floor(netWorth),
              target: Math.round(target),
            })}
          </Text>
        </View>
      </ScrollView>
    );
  }

  const town = TOWNS_BY_ID[townId];
  const townState = state.foreignTowns[townId];
  const good = GOODS_BY_ID[goodId];
  const homePrice = state.goods[goodId].price;
  const theirPrice = townState.prices[goodId];
  const holding = state.goods[goodId].holding;

  const tariffRate = effectiveTariffRate(state, town);
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
      <Text style={styles.sectionLabel}>{t("trade.neighborsSectionLabel")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.townRow}>
        {REGULAR_TOWNS.map((tn) => (
          <TownPill
            key={tn.id}
            town={tn}
            selected={tn.id === townId}
            onPress={() => setTownId(tn.id)}
            state={state}
            t={t}
          />
        ))}
      </ScrollView>

      <Text style={styles.sectionLabel}>{t("trade.metropolSectionLabel")}</Text>
      {state.metropolUnlocked ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.townRow}>
          {METROPOLISES.map((tn) => (
            <TownPill
              key={tn.id}
              town={tn}
              selected={tn.id === townId}
              onPress={() => setTownId(tn.id)}
              state={state}
              t={t}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.metropolLockedCard}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          <Text style={styles.metropolLockedIcon}>🔒</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.metropolLockedTitle}>{t("trade.metropolLocked.title")}</Text>
            <Text style={styles.metropolLockedDesc}>
              {t("trade.metropolLocked.description", { target: Math.round(effectiveMetropolUnlockNetWorth(state)) })}
            </Text>
            <View style={styles.lockedTrack}>
              <View
                style={[
                  styles.lockedFill,
                  {
                    width: `${
                      Math.max(0, Math.min(1, netWorth / effectiveMetropolUnlockNetWorth(state))) * 100
                    }%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.metropolLockedProgress}>
              {t("trade.metropolLocked.progress", {
                current: Math.floor(netWorth),
                target: Math.round(effectiveMetropolUnlockNetWorth(state)),
              })}
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionLabel}>
        {t("trade.pricesSectionLabel", { town: t(town.nameKey).toUpperCase() })}
      </Text>
      <View style={styles.goodsTable}>
        {GOODS.filter((g) => isGoodUnlocked(g, state)).map((g) => {
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
                <Text style={styles.goodName}>{t(g.nameKey)}</Text>
                <Text style={styles.goodPrices}>
                  {t("trade.priceCompare", { home: home.toFixed(2), there: there.toFixed(2) })}
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
              {t("trade.export")}
            </Text>
          </ScalePressable>
          <ScalePressable
            style={[styles.sideBtn, direction === "import" && styles.sideBtnActiveImport]}
            onPress={() => setDirection("import")}
          >
            <Text style={[styles.sideBtnText, direction === "import" && styles.sideBtnTextActive]}>
              {t("trade.import")}
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
              <Text style={styles.qtyBtnText}>{q === "ALL" ? t("common.all") : q}</Text>
            </ScalePressable>
          ))}
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {t("trade.summaryLine", {
              qty: resolvedQty,
              good: t(good.nameKey),
              price: theirPrice.toFixed(2),
              town: t(town.nameKey),
            })}
          </Text>
          <Text style={styles.summaryTotal}>
            {direction === "export" ? "+" : "-"}
            {formatCoins(net)}
          </Text>
        </View>
        <Text style={styles.etaText}>
          {t("trade.eta", { ticks: town.distanceTicks, tariff: (tariffRate * 100).toFixed(0) })}
          {tariffRate < town.tariffRate ? t("trade.etaDiscountSuffix") : ""}
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
            {t("trade.sendCaravanBtn", { icon: good.icon })}
          </Text>
        </ScalePressable>
      </View>

      <Text style={styles.sectionLabel}>{t("trade.activeCaravansSectionLabel")}</Text>
      {state.caravans.length === 0 && (
        <Text style={styles.emptyText}>{t("trade.noCaravans")}</Text>
      )}
      {[...state.caravans]
        .sort((a, b) => a.arrivesAtTick - b.arrivesAtTick)
        .map((c) => {
          const cTown = TOWNS_BY_ID[c.townId];
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
                  {c.direction === "export" ? "📤" : "📥"} {cTown.icon} {t(cTown.nameKey)}
                </Text>
                <Text style={styles.caravanEta}>{t("trade.turnsLeft", { n: remaining })}</Text>
              </View>
              <Text style={styles.caravanSub}>
                {c.direction === "export"
                  ? t("trade.caravanSentSub", { qty: c.qty, good: t(g.nameKey) })
                  : t("trade.caravanImportingSub", { qty: c.qty, good: t(g.nameKey) })}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
            </View>
          );
        })}

      <Text style={styles.sectionLabel}>{t("trade.contract.sectionLabel")}</Text>
      <Text style={styles.contractDesc}>{t("trade.contract.description")}</Text>
      <View style={styles.panel}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        <View style={styles.sideToggle}>
          <ScalePressable
            style={[styles.sideBtn, contractDirection === "long" && styles.sideBtnActiveExport]}
            onPress={() => setContractDirection("long")}
          >
            <Text
              style={[styles.sideBtnText, contractDirection === "long" && styles.sideBtnTextActive]}
            >
              {t("trade.contract.directionLong")}
            </Text>
          </ScalePressable>
          <ScalePressable
            style={[styles.sideBtn, contractDirection === "short" && styles.sideBtnActiveImport]}
            onPress={() => setContractDirection("short")}
          >
            <Text
              style={[styles.sideBtnText, contractDirection === "short" && styles.sideBtnTextActive]}
            >
              {t("trade.contract.directionShort")}
            </Text>
          </ScalePressable>
        </View>

        <View style={styles.qtyRow}>
          {([1, 5, 10] as const).map((q) => (
            <ScalePressable
              key={q}
              style={[styles.qtyBtn, contractQty === q && { borderColor: good.color, borderWidth: 2 }]}
              onPress={() => setContractQty(q)}
            >
              <Text style={styles.qtyBtnText}>{q}</Text>
            </ScalePressable>
          ))}
        </View>

        <Text style={styles.contractTermLabel}>{t("trade.contract.termLabel")}</Text>
        <View style={styles.qtyRow}>
          {CONTRACT_TERM_DAY_STEPS.map((days) => (
            <ScalePressable
              key={days}
              style={[
                styles.qtyBtn,
                contractTermDays === days && { borderColor: good.color, borderWidth: 2 },
              ]}
              onPress={() => setContractTermDays(days)}
            >
              <Text style={styles.qtyBtnText}>{t("trade.contract.termDays", { days })}</Text>
            </ScalePressable>
          ))}
        </View>

        {(() => {
          const strikePreview = state.goods[goodId].price;
          const margin = Math.round(strikePreview * contractQty * CONTRACT_MARGIN_PCT * 100) / 100;
          const contractDisabled =
            state.contracts.length >= CONTRACT_MAX_ACTIVE ||
            state.cash < margin ||
            !isGoodUnlocked(good, state);
          return (
            <>
              <Text style={styles.summaryLabel}>
                {t("trade.contract.marginPreview", { amount: margin.toFixed(1) })}
              </Text>
              <Text style={styles.contractMaxNote}>
                {t("trade.contract.maxActiveNote", { max: CONTRACT_MAX_ACTIVE })}
              </Text>
              <ScalePressable
                disabled={contractDisabled}
                onPress={() => openContract(goodId, contractDirection, contractQty, contractTermDays)}
                style={[styles.confirmBtn, contractDisabled && styles.confirmBtnDisabled]}
                scaleTo={0.97}
              >
                <GradientFill
                  colors={contractDirection === "long" ? GREEN_GRADIENT : BLUE_GRADIENT}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                />
                <Text style={styles.confirmBtnText}>{t("trade.contract.openBtn")}</Text>
              </ScalePressable>
            </>
          );
        })()}
      </View>

      <Text style={styles.sectionLabel}>{t("trade.contract.activeSectionLabel")}</Text>
      {state.contracts.length === 0 && (
        <Text style={styles.emptyText}>{t("trade.contract.noContracts")}</Text>
      )}
      {[...state.contracts]
        .sort((a, b) => a.maturesAtTick - b.maturesAtTick)
        .map((c) => {
          const cGood = GOODS_BY_ID[c.goodId];
          const total = c.maturesAtTick - c.signedAtTick;
          const elapsed = state.tick - c.signedAtTick;
          const progress = total > 0 ? clamp01(elapsed / total) : 1;
          const daysLeft = Math.max(0, Math.ceil((c.maturesAtTick - state.tick) / TICKS_PER_GAME_DAY));
          return (
            <View key={c.id} style={styles.caravanCard}>
              <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
              <View style={styles.caravanHeader}>
                <Text style={styles.caravanTitle}>
                  {c.direction === "long" ? "📈" : "📉"} {cGood.icon} {t(cGood.nameKey)}
                </Text>
                <Text style={styles.caravanEta}>{t("trade.contract.daysLeft", { days: daysLeft })}</Text>
              </View>
              <Text style={styles.caravanSub}>
                {t("trade.contract.contractRow", {
                  qty: c.qty,
                  good: t(cGood.nameKey),
                  price: c.strikePrice.toFixed(2),
                })}
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
  lockedBody: { flexGrow: 1, padding: 16, justifyContent: "center" },
  lockedCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    overflow: "hidden",
    ...cardShadow,
  },
  lockedIcon: { fontSize: 40, marginBottom: 10 },
  lockedTitle: { color: "#f0e3c8", fontSize: 18, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  lockedDesc: {
    color: "#a0917a",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
  },
  lockedTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1a1410",
    overflow: "hidden",
    marginBottom: 8,
  },
  lockedFill: { height: "100%", backgroundColor: "#e8c777", borderRadius: 4 },
  lockedProgress: { color: "#e8c777", fontSize: 12, fontWeight: "700" },
  metropolLockedCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    overflow: "hidden",
    ...cardShadow,
  },
  metropolLockedIcon: { fontSize: 24, marginRight: 12 },
  metropolLockedTitle: { color: "#f0e3c8", fontWeight: "700", fontSize: 13 },
  metropolLockedDesc: { color: "#a0917a", fontSize: 11, marginTop: 3, marginBottom: 8, lineHeight: 15 },
  metropolLockedProgress: { color: "#e8c777", fontSize: 11, fontWeight: "700" },
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
  contractDesc: { color: "#a0917a", fontSize: 12, marginBottom: 12, lineHeight: 17 },
  contractTermLabel: { color: "#a0917a", fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6 },
  contractMaxNote: { color: "#a0917a", fontSize: 10, marginTop: 8, marginBottom: 10 },
  caravanCard: { borderRadius: 12, padding: 12, marginBottom: 10, overflow: "hidden" },
  caravanHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  caravanTitle: { color: "#f0e3c8", fontWeight: "700", fontSize: 12 },
  caravanEta: { color: "#e8c777", fontWeight: "700", fontSize: 11 },
  caravanSub: { color: "#a0917a", fontSize: 11, marginBottom: 8 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: "#1a1410", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#e8c777", borderRadius: 3 },
});
