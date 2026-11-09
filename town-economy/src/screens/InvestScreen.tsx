import React, { useState } from "react";
import { ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { Text } from "../components/AppText";
import { useSoundEffects } from "../audio/useSoundEffects";
import { useEconomyContext } from "../economy/EconomyContext";
import { ASSETS, AssetId } from "../economy/assets";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { AssetChartPanel, PortfolioPanel } from "../components/InvestPanels";
import { BuySellPanel } from "../components/BuySellPanel";
import { GoodCard } from "../components/GoodCard";
import { PriceChart } from "../components/PriceChart";
import { usePriceFlash } from "../hooks/usePriceFlash";
import {
  COLORS,
  CONTENT_MAX_WIDTH,
  PANEL_GAP,
  SCREEN_PADDING,
  FONT,
  SPACING,
  TYPE,
} from "../theme";
import { formatCompactNumber as formatNumber, formatPercent } from "../utils/formatNumber";

interface Props {
  sounds: ReturnType<typeof useSoundEffects>;
}

export function InvestScreen({ sounds }: Props) {
  const { state, tradeAsset, assetsValue, t, formatCoins } = useEconomyContext();
  // See MarketScreen's identical comment: a hook instead of a module-level
  // Dimensions.get() snapshot, which on native can be taken before the
  // bridge reports the real window size and then never self-corrects.
  // Clamped against CONTENT_MAX_WIDTH, not a raw screenWidth cap — see
  // MarketScreen for why.
  const { width: screenWidth } = useWindowDimensions();
  // All 4 assets fit the row at once — see MarketScreen's goodCardWidth
  // for why this is computed rather than a fixed guess.
  const assetsRowWidth = Math.min(screenWidth, CONTENT_MAX_WIDTH) - SCREEN_PADDING * 2;
  const assetCardWidth = (assetsRowWidth - SPACING.sm * 3) / 4;
  const formatPrice = (v: number) => formatCoins(v, 2);
  const [selectedId, setSelectedId] = useState<AssetId>(ASSETS[0].id);
  const selected = ASSETS.find((a) => a.id === selectedId)!;
  const selectedState = state.assets[selected.id];
  const { opacity: flashOpacity, flashColor } = usePriceFlash(selectedState.price);

  const change =
    selectedState.history.length > 1
      ? ((selectedState.price - selectedState.history[selectedState.history.length - 2]) /
          selectedState.history[selectedState.history.length - 2]) *
        100
      : 0;

  const unrealizedPnl = (selectedState.price - selectedState.avgCost) * selectedState.holding;

  const totalPnl = ASSETS.reduce((sum, a) => {
    const as = state.assets[a.id];
    return sum + (as.price - as.avgCost) * as.holding;
  }, 0);

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <PortfolioPanel
        label={t("invest.portfolioLabel")}
        value={formatCoins(assetsValue)}
        pnl={
          assetsValue > 0
            ? totalPnl >= 0
              ? t("invest.unrealizedProfit", { amount: formatNumber(totalPnl, state.language) })
              : t("invest.unrealizedLoss", { amount: formatNumber(Math.abs(totalPnl), state.language) })
            : undefined
        }
        pnlPositive={totalPnl >= 0}
      />

      <Text style={styles.sectionNote}>{t("invest.sectionNote")}</Text>

      <AssetChartPanel
        icon={selected.icon}
        name={t(selected.nameKey)}
        description={t(selected.descriptionKey)}
        price={
          <AnimatedNumber
            value={selectedState.price}
            formatter={formatPrice}
            style={{ color: "#f6e2a0", fontFamily: FONT.black, fontSize: 22 }}
          />
        }
        change={`${change >= 0 ? "+" : ""}${formatPercent(change, state.language, 2)}`}
        changePositive={change >= 0}
        color={selected.color}
        flashColor={flashColor}
        flashOpacity={flashOpacity}
        holding={
          selectedState.holding > 0
            ? `${t("invest.holdingLabel", { qty: selectedState.holding })} · ${t("invest.avgCostLabel", {
                price: selectedState.avgCost.toFixed(2),
              })}`
            : t("invest.noHolding")
        }
        pnl={
          selectedState.holding > 0
            ? unrealizedPnl >= 0
              ? t("invest.unrealizedProfit", { amount: formatNumber(unrealizedPnl, state.language) })
              : t("invest.unrealizedLoss", { amount: formatNumber(Math.abs(unrealizedPnl), state.language) })
            : undefined
        }
        pnlPositive={unrealizedPnl >= 0}
      >
        {(w, h) => (
          <PriceChart
            history={selectedState.history}
            color={selected.color}
            width={w}
            height={h}
            strokeWidth={3}
            interactive
          />
        )}
      </AssetChartPanel>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assetsRow}>
        {ASSETS.map((a) => (
          <GoodCard
            key={a.id}
            good={a}
            state={state.assets[a.id]}
            selected={a.id === selectedId}
            onPress={() => setSelectedId(a.id)}
            width={assetCardWidth}
          />
        ))}
      </ScrollView>

      <BuySellPanel
        painted
        good={selected}
        state={selectedState}
        cash={state.cash}
        onTrade={(side, qty) => {
          tradeAsset(selected.id, side, qty);
          if (side === "buy") sounds.playBuy();
          else sounds.playSell();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: SCREEN_PADDING, paddingBottom: 40 },
  sectionNote: { color: COLORS.textMuted, fontSize: TYPE.label, marginBottom: PANEL_GAP, lineHeight: 17 },
  assetsRow: { marginBottom: PANEL_GAP },
});
