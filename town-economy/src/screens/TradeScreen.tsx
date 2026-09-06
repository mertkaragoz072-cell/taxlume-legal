import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSoundEffects } from "../audio/useSoundEffects";
import { GradientFill } from "../components/GradientFill";
import { ScalePressable } from "../components/ScalePressable";
import { SectionLabel } from "../components/SectionLabel";
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
  LEGENDARY_UNLOCK_PRESTIGE_LEVEL,
  TICKS_PER_GAME_DAY,
} from "../economy/useEconomy";
import {
  BLUE_GRADIENT,
  CARD_GRADIENT,
  cardShadow,
  COLORS,
  FONT,
  GREEN_GRADIENT,
  RADIUS,
  SPACING,
  TYPE,
  WEIGHT,
  withAlpha,
} from "../theme";

interface Props {
  sounds: ReturnType<typeof useSoundEffects>;
}

type QtyOption = 1 | 5 | "ALL";

const REGULAR_TOWNS = TOWNS.filter((tn) => tn.tier === "town");
const METROPOLISES = TOWNS.filter((tn) => tn.tier === "metropol");
const LEGENDARY_TOWNS = TOWNS.filter((tn) => tn.tier === "legendary");
const ALL_TOWNS = [...REGULAR_TOWNS, ...METROPOLISES, ...LEGENDARY_TOWNS];

// Green above the baseline, red below — same intensity-scales-with-magnitude
// idea as a real heatmap, but built from the app's own warm palette (and a
// ⭐ on the single best cell) so it reads as a game board, not a spreadsheet.
function heatCellColor(pct: number): string {
  const clamped = Math.max(-50, Math.min(50, pct));
  const intensity = Math.abs(clamped) / 50;
  const base = clamped >= 0 ? "#5fd884" : "#f0776a";
  return withAlpha(base, 0.1 + intensity * 0.55);
}

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
      <SectionLabel text={t("trade.neighborsSectionLabel")} color="#6fb8f2" />
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

      <SectionLabel text={t("trade.metropolSectionLabel")} color="#c58ee0" />
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

      <SectionLabel text={t("trade.legendarySectionLabel")} color="#f0776a" />
      {state.legendaryUnlocked ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.townRow}>
          {LEGENDARY_TOWNS.map((tn) => (
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
            <Text style={styles.metropolLockedTitle}>{t("trade.legendaryLocked.title")}</Text>
            <Text style={styles.metropolLockedDesc}>
              {t("trade.legendaryLocked.description", { target: LEGENDARY_UNLOCK_PRESTIGE_LEVEL })}
            </Text>
            <View style={styles.lockedTrack}>
              <View
                style={[
                  styles.lockedFill,
                  {
                    width: `${
                      Math.max(0, Math.min(1, state.prestigeLevel / LEGENDARY_UNLOCK_PRESTIGE_LEVEL)) * 100
                    }%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.metropolLockedProgress}>
              {t("trade.legendaryLocked.progress", {
                current: state.prestigeLevel,
                target: LEGENDARY_UNLOCK_PRESTIGE_LEVEL,
              })}
            </Text>
          </View>
        </View>
      )}

      <SectionLabel text={t("trade.heatmapSectionLabel")} color={good.color} />
      <Text style={styles.heatmapHint}>{t("trade.heatmapHint")}</Text>
      {(() => {
        const unlockedGoods = GOODS.filter((g) => isGoodUnlocked(g, state));
        const cellPct = (g: (typeof GOODS)[number], tn: ForeignTown): number | null => {
          if (tn.tier === "metropol" && !state.metropolUnlocked) return null;
          if (tn.tier === "legendary" && !state.legendaryUnlocked) return null;
          const home = state.goods[g.id].price;
          const there = state.foreignTowns[tn.id].prices[g.id];
          const tariff = effectiveTariffRate(state, tn);
          return ((there * (1 - tariff) - home) / home) * 100;
        };
        let bestGoodId: GoodId | null = null;
        let bestTownId: TownId | null = null;
        let bestPct = -Infinity;
        for (const g of unlockedGoods) {
          for (const tn of ALL_TOWNS) {
            const pct = cellPct(g, tn);
            if (pct !== null && pct > bestPct) {
              bestPct = pct;
              bestGoodId = g.id;
              bestTownId = tn.id;
            }
          }
        }
        return (
          <View style={styles.heatmapCard}>
            <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
            <View style={styles.heatmapHeaderRow}>
              <View style={styles.heatmapCornerCell} />
              {ALL_TOWNS.map((tn) => (
                <View key={tn.id} style={styles.heatmapTownHeader}>
                  <Text style={styles.heatmapTownIcon}>{tn.icon}</Text>
                </View>
              ))}
            </View>
            {unlockedGoods.map((g) => (
              <View key={g.id} style={styles.heatmapRow}>
                <ScalePressable
                  onPress={() => setGoodId(g.id)}
                  style={[styles.heatmapGoodCell, g.id === goodId && { borderColor: g.color }]}
                  scaleTo={0.95}
                >
                  <Text style={styles.heatmapGoodIcon}>{g.icon}</Text>
                </ScalePressable>
                {ALL_TOWNS.map((tn) => {
                  const pct = cellPct(g, tn);
                  const isBest = g.id === bestGoodId && tn.id === bestTownId;
                  const isSelected = g.id === goodId && tn.id === townId;
                  if (pct === null) {
                    return (
                      <View key={tn.id} style={styles.heatmapCellLocked}>
                        <Text style={styles.heatmapLockIcon}>🔒</Text>
                      </View>
                    );
                  }
                  return (
                    <ScalePressable
                      key={tn.id}
                      onPress={() => {
                        setGoodId(g.id);
                        setTownId(tn.id);
                        setDirection("export");
                      }}
                      style={[
                        styles.heatmapCell,
                        { backgroundColor: heatCellColor(pct) },
                        isSelected && styles.heatmapCellSelected,
                      ]}
                      scaleTo={0.95}
                    >
                      {isBest && <Text style={styles.heatmapStar}>⭐</Text>}
                      <Text style={styles.heatmapCellText}>
                        {pct >= 0 ? "+" : ""}
                        {pct.toFixed(0)}%
                      </Text>
                    </ScalePressable>
                  );
                })}
              </View>
            ))}
          </View>
        );
      })()}

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

      <SectionLabel text={t("trade.activeCaravansSectionLabel")} color="#5fd884" />
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
              <View style={[styles.caravanAccent, { backgroundColor: g.color }]} />
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

      <SectionLabel text={t("trade.contract.sectionLabel")} color="#f0776a" />
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

      <SectionLabel text={t("trade.contract.activeSectionLabel")} color={COLORS.accent} />
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
              <View style={[styles.caravanAccent, { backgroundColor: cGood.color }]} />
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
  body: { padding: SPACING.lg, paddingBottom: 40 },
  lockedBody: { flexGrow: 1, padding: SPACING.lg, justifyContent: "center" },
  lockedCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    overflow: "hidden",
    ...cardShadow,
  },
  lockedIcon: { fontSize: 40, marginBottom: SPACING.sm + 2 },
  lockedTitle: {
    color: COLORS.textPrimary,
    fontSize: TYPE.heading,
    fontWeight: WEIGHT.black, fontFamily: FONT.black,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  lockedDesc: {
    color: COLORS.textMuted,
    fontSize: TYPE.body,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: SPACING.lg + 2,
  },
  lockedTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.onLight,
    overflow: "hidden",
    marginBottom: SPACING.sm,
  },
  lockedFill: { height: "100%", backgroundColor: COLORS.accent, borderRadius: 4 },
  lockedProgress: { color: COLORS.accent, fontSize: TYPE.label, fontWeight: WEIGHT.bold, fontFamily: FONT.bold },
  metropolLockedCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.feature,
    padding: SPACING.md + 2,
    marginBottom: SPACING.xl - 4,
    overflow: "hidden",
    ...cardShadow,
  },
  metropolLockedIcon: { fontSize: 24, marginRight: SPACING.md },
  metropolLockedTitle: { color: COLORS.textPrimary, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.body },
  metropolLockedDesc: {
    color: COLORS.textMuted,
    fontSize: TYPE.caption,
    marginTop: 3,
    marginBottom: SPACING.sm,
    lineHeight: 15,
  },
  metropolLockedProgress: { color: COLORS.accent, fontSize: TYPE.caption, fontWeight: WEIGHT.bold, fontFamily: FONT.bold },
  townRow: { marginBottom: SPACING.xl - 4 },
  townPill: {
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    marginRight: SPACING.sm + 2,
    width: 128,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
    ...cardShadow,
  },
  townPillActive: { borderColor: COLORS.accent },
  townIcon: { fontSize: 22, marginBottom: SPACING.xs },
  townName: { color: COLORS.textPrimary, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.body },
  townMeta: { color: COLORS.textMuted, fontSize: TYPE.micro, marginTop: SPACING.xs },
  heatmapHint: { color: COLORS.textMuted, fontSize: TYPE.caption, marginBottom: SPACING.sm, lineHeight: 15 },
  heatmapCard: {
    borderRadius: RADIUS.feature,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.xl - 4,
    overflow: "hidden",
    ...cardShadow,
  },
  heatmapHeaderRow: { flexDirection: "row", marginBottom: 6 },
  heatmapCornerCell: { width: 34 },
  heatmapTownHeader: { flex: 1, alignItems: "center" },
  heatmapTownIcon: { fontSize: 16 },
  heatmapRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  heatmapGoodCell: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.chip,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
    marginRight: 2,
  },
  heatmapGoodIcon: { fontSize: 17 },
  heatmapCell: {
    flex: 1,
    height: 34,
    marginHorizontal: 2,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  heatmapCellSelected: { borderWidth: 2, borderColor: COLORS.accent },
  heatmapCellText: { color: COLORS.textPrimary, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.micro },
  heatmapStar: { fontSize: 9, position: "absolute", top: 1, right: 2 },
  heatmapCellLocked: {
    flex: 1,
    height: 34,
    marginHorizontal: 2,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  heatmapLockIcon: { fontSize: TYPE.label, opacity: 0.4 },
  panel: {
    borderRadius: RADIUS.feature,
    padding: SPACING.md,
    marginBottom: SPACING.xl - 4,
    overflow: "hidden",
    ...cardShadow,
  },
  sideToggle: {
    flexDirection: "row",
    backgroundColor: COLORS.onLight,
    borderRadius: RADIUS.chip,
    padding: 3,
    marginBottom: SPACING.sm + 2,
  },
  sideBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.chip - 2, alignItems: "center" },
  sideBtnActiveExport: { backgroundColor: COLORS.positive },
  sideBtnActiveImport: { backgroundColor: "#4a90c9" },
  sideBtnText: { color: COLORS.textMuted, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.caption },
  sideBtnTextActive: { color: "#fff" },
  qtyRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.sm + 2 },
  qtyBtn: {
    flex: 1,
    backgroundColor: COLORS.onLight,
    borderRadius: RADIUS.chip,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    marginRight: SPACING.sm,
  },
  qtyBtnText: { color: COLORS.textPrimary, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.label },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2 },
  summaryLabel: { color: COLORS.textMuted, fontSize: TYPE.caption, flex: 1, marginRight: SPACING.sm },
  summaryTotal: { color: COLORS.accent, fontSize: TYPE.body, fontWeight: WEIGHT.bold, fontFamily: FONT.bold },
  etaText: {
    color: COLORS.textMuted,
    fontSize: TYPE.micro,
    marginTop: 6,
    marginBottom: SPACING.sm + 2,
    paddingHorizontal: 2,
  },
  confirmBtn: { borderRadius: RADIUS.card, paddingVertical: SPACING.md, alignItems: "center", overflow: "hidden" },
  confirmBtnDisabled: { opacity: 0.35 },
  confirmBtnText: { color: "#fff", fontWeight: WEIGHT.black, fontFamily: FONT.black, fontSize: TYPE.body },
  emptyText: { color: COLORS.textMuted, fontSize: TYPE.label, marginBottom: SPACING.sm + 2 },
  contractDesc: { color: COLORS.textMuted, fontSize: TYPE.label, marginBottom: SPACING.md, lineHeight: 17 },
  contractTermLabel: {
    color: COLORS.textMuted,
    fontSize: TYPE.micro,
    fontWeight: WEIGHT.bold, fontFamily: FONT.bold,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  contractMaxNote: { color: COLORS.textMuted, fontSize: TYPE.micro, marginTop: SPACING.sm, marginBottom: SPACING.sm + 2 },
  caravanCard: {
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    paddingLeft: SPACING.md + 3,
    marginBottom: SPACING.sm + 2,
    overflow: "hidden",
  },
  caravanAccent: { position: "absolute", top: 0, bottom: 0, left: 0, width: 4 },
  caravanHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: SPACING.xs },
  caravanTitle: { color: COLORS.textPrimary, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.label },
  caravanEta: { color: COLORS.accent, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.caption },
  caravanSub: { color: COLORS.textMuted, fontSize: TYPE.caption, marginBottom: SPACING.sm },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: COLORS.onLight, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: COLORS.accent, borderRadius: 3 },
});
