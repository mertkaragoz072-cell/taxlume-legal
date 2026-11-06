import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../components/AppText";
import { useSoundEffects } from "../audio/useSoundEffects";
import { BargainingModal } from "../components/BargainingModal";
import { CaravanRoad } from "../components/CaravanRoad";
import { GradientFill } from "../components/GradientFill";
import { ScalePressable } from "../components/ScalePressable";
import lockArt from "../../assets/ui/tradelock/panel.webp";
import { BeamTitle, FixedPanel } from "../components/ImagePanels";
import { SectionLabel } from "../components/SectionLabel";
import { SpotlightTarget, useSpotlightScroll } from "../components/Spotlight";
import { BulkContractPanel } from "../components/BulkContractPanel";
import { ContractPanel } from "../components/ContractPanel";
import { SendPanel } from "../components/SendPanel";
import { HeatmapPanel } from "../components/HeatmapPanel";
import { LockedTierCard } from "../components/LockedTierCard";
import { TownArtPills } from "../components/TownArtPills";
import { TownMapView } from "../components/TownMapView";
import { TradingHousesCard } from "../components/TradingHousesCard";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS, GOODS_BY_ID } from "../economy/goods";
import { ForeignTown, TOWNS, TOWNS_BY_ID, TownId } from "../economy/towns";
import { CaravanDirection, ContractDirection, EconomyState, GoodId } from "../economy/types";
import {
  BULK_CONTRACT_BONUS_PCT,
  BULK_CONTRACT_TERM_DAY_STEPS,
  CARAVAN_INSURANCE_COST_PCT,
  CONTRACT_MARGIN_PCT,
  CONTRACT_TERM_DAY_STEPS,
  effectiveBulkContractMaxActive,
  effectiveContractMaxActive,
  effectiveMetropolUnlockNetWorth,
  effectiveTariffRate,
  effectiveTradeUnlockNetWorth,
  isGoodUnlocked,
  LEGENDARY_UNLOCK_PRESTIGE_LEVEL,
  MYTHIC_UNLOCK_LEGENDARY_POINTS,
  TICKS_PER_GAME_DAY,
} from "../economy/useEconomy";
import {
  CARD_GRADIENT,
  cardShadow,
  COLORS,
  FONT,
  RADIUS,
  PANEL_GAP,
  SCREEN_PADDING,
  SPACING,
  TYPE,
  WEIGHT,
  WOOD_RIM,
  glowShadow,
} from "../theme";

interface Props {
  sounds: ReturnType<typeof useSoundEffects>;
  /** True only while the caravan tutorial is on its "where can you trade"
   * beat, which docks a card right under this map — see TownMapView's own
   * `maxHeight` prop for why that needs the map to shrink instead of just
   * getting silently cropped by a shrunk scroll viewport. */
  compactMap?: boolean;
}

type QtyOption = 1 | 5 | "ALL";

// Chance a caravan send offers the bargaining mini-game instead of sending
// straight away — occasional enough to feel like a surprise, not a chore.
const BARGAIN_CHANCE = 0.35;

const REGULAR_TOWNS = TOWNS.filter((tn) => tn.tier === "town");
const METROPOLISES = TOWNS.filter((tn) => tn.tier === "metropol");
const LEGENDARY_TOWNS = TOWNS.filter((tn) => tn.tier === "legendary");
const MYTHIC_TOWNS = TOWNS.filter((tn) => tn.tier === "mythic");
const ALL_TOWNS = [...REGULAR_TOWNS, ...METROPOLISES, ...LEGENDARY_TOWNS, ...MYTHIC_TOWNS];

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
    <ScalePressable onPress={onPress} style={[styles.townPill, selected && styles.townPillActive]}>
      <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
      <Text style={styles.townIcon}>{town.icon}</Text>
      <Text style={styles.townName}>{t(town.nameKey)}</Text>
      <Text style={styles.townMeta}>
        {t("trade.townMeta", { days: town.distanceDays, tariff: (effectiveTariff * 100).toFixed(0) })}
      </Text>
    </ScalePressable>
  );
}

export function TradeScreen({ sounds, compactMap }: Props) {
  const { state, sendCaravan, openContract, openBulkContract, t, tPlural, netWorth, formatCoins } =
    useEconomyContext();
  const [townId, setTownId] = useState<TownId>(TOWNS[0].id);
  const [goodId, setGoodId] = useState<GoodId>(GOODS[0].id);
  const [direction, setDirection] = useState<CaravanDirection>("export");
  const [qtyOption, setQtyOption] = useState<QtyOption>(5);
  const [insureCaravan, setInsureCaravan] = useState(false);
  const [contractDirection, setContractDirection] = useState<ContractDirection>("long");
  const [contractQty, setContractQty] = useState<1 | 5 | 10>(1);
  const [contractTermDays, setContractTermDays] = useState(CONTRACT_TERM_DAY_STEPS[0]);
  const [bulkQty, setBulkQty] = useState<1 | 5 | 10>(5);
  const [bulkTermDays, setBulkTermDays] = useState(BULK_CONTRACT_TERM_DAY_STEPS[0]);
  const [bargainVisible, setBargainVisible] = useState(false);
  const [pendingCaravan, setPendingCaravan] = useState<{
    townId: TownId;
    goodId: GoodId;
    direction: CaravanDirection;
    qty: number;
    insured: boolean;
  } | null>(null);
  const spotlightScroll = useSpotlightScroll();

  if (!state.tradeUnlocked) {
    const target = effectiveTradeUnlockNetWorth(state);
    const pct = Math.max(0, Math.min(1, netWorth / target));
    return (
      <ScrollView contentContainerStyle={styles.lockedBody} showsVerticalScrollIndicator={false}>
        {/* The sent lock-card art carries its own plaque, ribbon, parchment and
            progress groove; the words and the gold fill are drawn over it. */}
        <FixedPanel source={lockArt} aspect={900 / 932}>
          {(w) => {
            const px = (v: number) => `${(v / 1199) * 100}%` as const;
            const py = (v: number) => `${(v / 1242) * 100}%` as const;
            return (
              <>
                <Text
                  style={[
                    styles.lockPlaque,
                    {
                      left: px(335),
                      width: px(530),
                      top: py(110),
                      height: py(85),
                      fontSize: w * 0.052,
                      lineHeight: w * 0.07,
                    },
                  ]}
                  numberOfLines={1}
                  accessibilityRole="header"
                >
                  {t("tabs.trade").toUpperCase()}
                </Text>
                <Text
                  style={[
                    styles.lockRibbon,
                    {
                      left: px(260),
                      width: px(680),
                      top: py(566),
                      height: py(80),
                      fontSize: Math.min(w * 0.04, (w * 0.54) / (t("trade.locked.title").length * 0.95)),
                      lineHeight: w * 0.07,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {t("trade.locked.title")}
                </Text>
                <Text
                  style={[
                    styles.lockDesc,
                    {
                      left: px(175),
                      width: px(850),
                      top: py(690),
                      fontSize: w * 0.034,
                      lineHeight: w * 0.047,
                    },
                  ]}
                  numberOfLines={4}
                >
                  {t("trade.locked.description", { target: Math.round(target) })}
                </Text>
                <View
                  style={[styles.lockTrack, { left: px(192), width: px(816), top: py(918), height: py(44) }]}
                >
                  <View style={[styles.lockFill, { width: `${pct * 100}%` }]} />
                </View>
                <Text
                  style={[
                    styles.lockProgress,
                    { left: px(175), width: px(850), top: py(992), fontSize: w * 0.04 },
                  ]}
                  numberOfLines={1}
                >
                  {t("trade.locked.progress", { current: Math.floor(netWorth), target: Math.round(target) })}
                </Text>
              </>
            );
          }}
        </FixedPanel>
      </ScrollView>
    );
  }

  const town = TOWNS_BY_ID[townId];
  const townState = state.foreignTowns[townId];
  const good = GOODS_BY_ID[goodId];
  const theirPrice = townState.prices[goodId];
  const holding = state.goods[goodId].holding;

  const tariffRate = effectiveTariffRate(state, town);
  const affordableImport = Math.floor(state.cash / (theirPrice * (1 + tariffRate)));
  const resolvedQty = qtyOption === "ALL" ? (direction === "export" ? holding : affordableImport) : qtyOption;

  const gross = resolvedQty * theirPrice;
  const net = direction === "export" ? gross * (1 - tariffRate) : gross * (1 + tariffRate);
  const disabled =
    resolvedQty <= 0 || (direction === "export" ? resolvedQty > holding : net > state.cash + 0.001);

  const insurancePremium = (direction === "export" ? gross : net) * CARAVAN_INSURANCE_COST_PCT;
  const cashNeededForInsurance = direction === "export" ? insurancePremium : net + insurancePremium;
  const canAffordInsurance = state.cash + 0.001 >= cashNeededForInsurance;

  return (
    <>
      <ScrollView
        ref={spotlightScroll?.ref}
        onScroll={spotlightScroll?.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <BeamTitle title={t("tabs.trade")} />
        {state.caravans.length > 0 && (
          <View style={styles.roadBanner}>
            <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
            {[...state.caravans]
              .sort((a, b) => a.arrivesAtTick - b.arrivesAtTick)
              .map((c) => {
                const cTown = TOWNS_BY_ID[c.townId];
                const g = GOODS_BY_ID[c.goodId];
                const total = c.arrivesAtTick - c.departedTick;
                const elapsed = state.tick - c.departedTick;
                const progress = total > 0 ? clamp01(elapsed / total) : 1;
                const daysLeft = Math.max(0, Math.ceil((c.arrivesAtTick - state.tick) / TICKS_PER_GAME_DAY));
                return (
                  <CaravanRoad
                    key={c.id}
                    progress={progress}
                    destinationIcon={cTown.icon}
                    accentColor={g.color}
                    label={`${c.direction === "export" ? "📤" : "📥"} ${t(cTown.nameKey)} · ${g.icon} ${t(g.nameKey)}`}
                    etaLabel={tPlural("trade.turnsLeft", daysLeft, { n: daysLeft })}
                  />
                );
              })}
          </View>
        )}

        <SectionLabel text={t("tradingHouse.sectionLabel")} color="#f0a04b" />
        <TradingHousesCard activities={state.tradingHouses} />

        <SectionLabel text={t("trade.mapSectionLabel")} color="#5fd884" />
        <SpotlightTarget id="caravanMap">
          <TownMapView
            townName={state.townName}
            selectedEmblem={state.selectedEmblem}
            towns={ALL_TOWNS}
            selectedTownId={townId}
            onSelectTown={setTownId}
            metropolUnlocked={state.metropolUnlocked}
            legendaryUnlocked={state.legendaryUnlocked}
            mythicUnlocked={state.mythicUnlocked}
            caravans={state.caravans}
            tick={state.tick}
            t={t}
            maxHeight={compactMap ? 210 : undefined}
          />
        </SpotlightTarget>

        <SectionLabel text={t("trade.neighborsSectionLabel")} color="#6fb8f2" />
        <TownArtPills
          towns={REGULAR_TOWNS}
          selectedTownId={townId}
          onSelect={setTownId}
          nameOf={(tn) => t(tn.nameKey)}
          metaOf={(tn) =>
            t("trade.townMeta", {
              days: tn.distanceDays,
              tariff: (effectiveTariffRate(state, tn) * 100).toFixed(0),
            })
          }
        />

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
          <LockedTierCard
            title={t("trade.metropolLocked.title")}
            description={t("trade.metropolLocked.description", {
              target: Math.round(effectiveMetropolUnlockNetWorth(state)),
            })}
            progressText={t("trade.metropolLocked.progress", {
              current: Math.floor(netWorth),
              target: Math.round(effectiveMetropolUnlockNetWorth(state)),
            })}
            progress={netWorth / effectiveMetropolUnlockNetWorth(state)}
          />
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
          <LockedTierCard
            title={t("trade.legendaryLocked.title")}
            description={t("trade.legendaryLocked.description", { target: LEGENDARY_UNLOCK_PRESTIGE_LEVEL })}
            progressText={t("trade.legendaryLocked.progress", {
              current: state.prestigeLevel,
              target: LEGENDARY_UNLOCK_PRESTIGE_LEVEL,
            })}
            progress={state.prestigeLevel / LEGENDARY_UNLOCK_PRESTIGE_LEVEL}
          />
        )}

        {state.legendaryUnlocked && (
          <>
            <SectionLabel text={t("trade.mythicSectionLabel")} color="#c77df0" />
            {state.mythicUnlocked ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.townRow}>
                {MYTHIC_TOWNS.map((tn) => (
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
              <LockedTierCard
                title={t("trade.mythicLocked.title")}
                description={t("trade.mythicLocked.description", { target: MYTHIC_UNLOCK_LEGENDARY_POINTS })}
                progressText={t("trade.mythicLocked.progress", {
                  current: state.legendaryPoints,
                  target: MYTHIC_UNLOCK_LEGENDARY_POINTS,
                })}
                progress={state.legendaryPoints / MYTHIC_UNLOCK_LEGENDARY_POINTS}
              />
            )}
          </>
        )}

        <SectionLabel text={t("trade.heatmapSectionLabel")} color={good.color} />
        <Text style={styles.heatmapHint}>{t("trade.heatmapHint")}</Text>
        {(() => {
          const unlockedGoods = GOODS.filter((g) => isGoodUnlocked(g, state));
          const cellPct = (g: (typeof GOODS)[number], tn: ForeignTown): number | null => {
            if (tn.tier === "metropol" && !state.metropolUnlocked) return null;
            if (tn.tier === "legendary" && !state.legendaryUnlocked) return null;
            if (tn.tier === "mythic" && !state.mythicUnlocked) return null;
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
            <HeatmapPanel
              towns={ALL_TOWNS.map((tn) => ({ id: tn.id, icon: tn.icon }))}
              rows={unlockedGoods.map((g) => ({
                goodId: g.id,
                fallbackIcon: g.icon,
                color: g.color,
                selected: g.id === goodId,
                cells: ALL_TOWNS.map((tn) => cellPct(g, tn)),
              }))}
              selectedTownId={townId}
              best={bestGoodId && bestTownId ? { goodId: bestGoodId, townId: bestTownId } : null}
              onPickGood={setGoodId}
              onPickCell={(gid, tid) => {
                setGoodId(gid);
                setTownId(tid as TownId);
                setDirection("export");
              }}
            />
          );
        })()}

        <SendPanel
          direction={direction}
          onDirection={setDirection}
          exportLabel={t("trade.export")}
          importLabel={t("trade.import")}
          qtyOptions={([1, 5, "ALL"] as QtyOption[]).map((q) => ({
            key: String(q),
            label: q === "ALL" ? t("common.all") : String(q),
            selected: qtyOption === q,
            onPress: () => setQtyOption(q),
          }))}
          accent={good.color}
          summary={t("trade.summaryLine", {
            qty: resolvedQty,
            good: t(good.nameKey),
            price: theirPrice.toFixed(2),
            town: t(town.nameKey),
          })}
          total={`${direction === "export" ? "+" : "-"}${formatCoins(net)}`}
          eta={`${t("trade.eta", { days: town.distanceDays, tariff: (tariffRate * 100).toFixed(0) })}${
            tariffRate < town.tariffRate ? t("trade.etaDiscountSuffix") : ""
          }`}
          insuranceLabel={`🛡️ ${t("trade.insuranceLabel", { amount: formatCoins(insurancePremium) })}`}
          insuranceHint={
            insureCaravan && !canAffordInsurance ? t("trade.insuranceUnaffordable") : t("trade.insuranceHint")
          }
          insured={insureCaravan}
          onToggleInsurance={() => setInsureCaravan((v) => !v)}
          sendLabel={t("trade.sendCaravanBtn", { icon: good.icon })}
          sendDisabled={disabled}
          onSend={() => {
            if (Math.random() < BARGAIN_CHANCE) {
              setPendingCaravan({ townId, goodId, direction, qty: resolvedQty, insured: insureCaravan });
              setBargainVisible(true);
              return;
            }
            sendCaravan(townId, goodId, direction, resolvedQty, insureCaravan);
            if (direction === "export") sounds.playSell();
            else sounds.playBuy();
          }}
        />

        <SectionLabel text={t("trade.activeCaravansSectionLabel")} color="#5fd884" />
        {state.caravans.length === 0 && <Text style={styles.emptyText}>{t("trade.noCaravans")}</Text>}
        {[...state.caravans]
          .sort((a, b) => a.arrivesAtTick - b.arrivesAtTick)
          .map((c) => {
            const cTown = TOWNS_BY_ID[c.townId];
            const g = GOODS_BY_ID[c.goodId];
            const total = c.arrivesAtTick - c.departedTick;
            const elapsed = state.tick - c.departedTick;
            const progress = total > 0 ? clamp01(elapsed / total) : 1;
            const daysLeft = Math.max(0, Math.ceil((c.arrivesAtTick - state.tick) / TICKS_PER_GAME_DAY));
            return (
              <View key={c.id} style={styles.caravanCard}>
                <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
                <View style={[styles.caravanAccent, { backgroundColor: g.color }]} />
                <View style={styles.caravanHeader}>
                  <Text style={styles.caravanTitle}>
                    {c.direction === "export" ? "📤" : "📥"} {cTown.icon} {t(cTown.nameKey)}
                    {c.insured ? " 🛡️" : ""}
                  </Text>
                  <Text style={styles.caravanEta}>
                    {tPlural("trade.turnsLeft", daysLeft, { n: daysLeft })}
                  </Text>
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
        {(() => {
          const strikePreview = state.goods[goodId].price;
          const margin = Math.round(strikePreview * contractQty * CONTRACT_MARGIN_PCT * 100) / 100;
          const maxContracts = effectiveContractMaxActive(state);
          const contractDisabled =
            state.contracts.length >= maxContracts || state.cash < margin || !isGoodUnlocked(good, state);
          return (
            <ContractPanel
              direction={contractDirection}
              onDirection={setContractDirection}
              longLabel={t("trade.contract.directionLong")}
              shortLabel={t("trade.contract.directionShort")}
              qty={([1, 5, 10] as const).map((q) => ({
                key: String(q),
                label: String(q),
                selected: contractQty === q,
                onPress: () => setContractQty(q),
              }))}
              termLabel={t("trade.contract.termLabel")}
              terms={CONTRACT_TERM_DAY_STEPS.map((days) => ({
                key: String(days),
                label: t("trade.contract.termDays", { days }),
                selected: contractTermDays === days,
                onPress: () => setContractTermDays(days),
              }))}
              accent={good.color}
              note={t("trade.contract.marginPreview", { amount: margin.toFixed(1) })}
              maxNote={t("trade.contract.maxActiveNote", { max: maxContracts })}
              openLabel={t("trade.contract.openBtn")}
              openDisabled={contractDisabled}
              onOpen={() => {
                openContract(goodId, contractDirection, contractQty, contractTermDays);
                sounds.playBuy();
              }}
            />
          );
        })()}

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

        <SectionLabel text={t("trade.bulkContract.sectionLabel")} color="#5fd884" />
        <Text style={styles.contractDesc}>
          {t("trade.bulkContract.description", { pct: Math.round(BULK_CONTRACT_BONUS_PCT * 100) })}
        </Text>
        {(() => {
          const lockedPrice = state.goods[goodId].price * (1 + BULK_CONTRACT_BONUS_PCT);
          const payout = lockedPrice * bulkQty;
          const hasEnough = state.goods[goodId].holding >= bulkQty;
          const maxBulkContracts = effectiveBulkContractMaxActive(state);
          const bulkDisabled =
            state.bulkContracts.length >= maxBulkContracts || !hasEnough || !isGoodUnlocked(good, state);
          return (
            <BulkContractPanel
              qty={([1, 5, 10] as const).map((q) => ({
                key: String(q),
                label: String(q),
                selected: bulkQty === q,
                onPress: () => setBulkQty(q),
              }))}
              termLabel={t("trade.bulkContract.termLabel")}
              terms={BULK_CONTRACT_TERM_DAY_STEPS.map((days) => ({
                key: String(days),
                label: t("trade.bulkContract.termDays", { days }),
                selected: bulkTermDays === days,
                onPress: () => setBulkTermDays(days),
              }))}
              accent={good.color}
              payout={t("trade.bulkContract.payoutPreview", { amount: payout.toFixed(1) })}
              warning={
                !hasEnough
                  ? t("trade.bulkContract.insufficientHolding", { qty: bulkQty, good: t(good.nameKey) })
                  : undefined
              }
              maxNote={t("trade.bulkContract.maxActiveNote", { max: maxBulkContracts })}
              openLabel={t("trade.bulkContract.openBtn")}
              openDisabled={bulkDisabled}
              onOpen={() => {
                openBulkContract(goodId, bulkQty, bulkTermDays);
                sounds.playBuy();
              }}
            />
          );
        })()}

        <SectionLabel text={t("trade.bulkContract.activeSectionLabel")} color={COLORS.accent} />
        {state.bulkContracts.length === 0 && (
          <Text style={styles.emptyText}>{t("trade.bulkContract.noContracts")}</Text>
        )}
        {[...state.bulkContracts]
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
                    📦 {cGood.icon} {t(cGood.nameKey)}
                  </Text>
                  <Text style={styles.caravanEta}>
                    {t("trade.bulkContract.daysLeft", { days: daysLeft })}
                  </Text>
                </View>
                <Text style={styles.caravanSub}>
                  {t("trade.bulkContract.contractRow", {
                    qty: c.qty,
                    good: t(cGood.nameKey),
                    price: c.lockedPricePerUnit.toFixed(2),
                  })}
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
              </View>
            );
          })}
      </ScrollView>
      <BargainingModal
        visible={bargainVisible}
        onResolve={(bonus) => {
          if (pendingCaravan) {
            sendCaravan(
              pendingCaravan.townId,
              pendingCaravan.goodId,
              pendingCaravan.direction,
              pendingCaravan.qty,
              pendingCaravan.insured,
              bonus
            );
            if (pendingCaravan.direction === "export") sounds.playSell();
            else sounds.playBuy();
          }
          setBargainVisible(false);
          setPendingCaravan(null);
        }}
      />
    </>
  );
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

const styles = StyleSheet.create({
  body: { padding: SCREEN_PADDING, paddingBottom: 40 },
  roadBanner: {
    ...WOOD_RIM,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    marginBottom: PANEL_GAP,
    overflow: "hidden",
    ...cardShadow,
  },
  lockedBody: { flexGrow: 1, padding: SCREEN_PADDING, justifyContent: "flex-start" },
  lockPlaque: {
    position: "absolute",
    textAlign: "center",
    color: "#f3d27a",
    fontFamily: FONT.display,
    letterSpacing: 2,
  },
  lockRibbon: {
    position: "absolute",
    textAlign: "center",
    color: "#f4e8ce",
    fontFamily: FONT.display,
    letterSpacing: 1,
  },
  lockDesc: { position: "absolute", textAlign: "center", color: "#4a2f1a", fontFamily: FONT.serif },
  lockTrack: { position: "absolute", borderRadius: 999, overflow: "hidden", padding: 2 },
  lockFill: { height: "100%", backgroundColor: "#f2b630", borderRadius: 999 },
  lockProgress: { position: "absolute", textAlign: "center", color: "#4a2f1a", fontFamily: FONT.serif },
  townRow: { marginBottom: PANEL_GAP },
  townPill: {
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    marginRight: SPACING.sm + 2,
    width: 128,
    ...WOOD_RIM,
    overflow: "hidden",
    ...cardShadow,
  },
  townPillActive: { borderColor: "#f6d36a", ...glowShadow("#f6d36a") },
  townIcon: { fontSize: 22, marginBottom: SPACING.xs },
  townName: {
    color: COLORS.textPrimary,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    fontSize: TYPE.body,
  },
  townMeta: { color: COLORS.textMuted, fontSize: TYPE.micro, marginTop: SPACING.xs },
  heatmapHint: { color: COLORS.textMuted, fontSize: TYPE.caption, marginBottom: SPACING.sm, lineHeight: 15 },
  emptyText: { color: COLORS.textMuted, fontSize: TYPE.label, marginBottom: SPACING.sm + 2 },
  contractDesc: { color: COLORS.textMuted, fontSize: TYPE.label, marginBottom: SPACING.md, lineHeight: 17 },
  caravanCard: {
    ...WOOD_RIM,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    paddingLeft: SPACING.md + 3,
    marginBottom: SPACING.sm + 2,
    overflow: "hidden",
  },
  caravanAccent: { position: "absolute", top: 0, bottom: 0, left: 0, width: 4 },
  caravanHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: SPACING.xs },
  caravanTitle: {
    color: COLORS.textPrimary,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    fontSize: TYPE.label,
  },
  caravanEta: {
    color: COLORS.accent,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    fontSize: TYPE.caption,
  },
  caravanSub: { color: COLORS.textMuted, fontSize: TYPE.caption, marginBottom: SPACING.sm },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: COLORS.onLight, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: COLORS.accent, borderRadius: 3 },
});
