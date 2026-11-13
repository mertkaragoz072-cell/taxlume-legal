import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./AppText";
import { useEconomyContext } from "../economy/EconomyContext";
import { HOT_STREAK_BONUS_PER_TRADE, HOT_STREAK_MAX_BONUS } from "../economy/useEconomy";
import {
  CARD_GRADIENT,
  cardShadow,
  COLORS,
  FONT,
  glowShadow,
  RADIUS,
  SPACING,
  TYPE,
  WEIGHT,
  withAlpha,
} from "../theme";
import { CoinPop } from "./CoinPop";
import { InvestTradePanel } from "./InvestPanels";
import { GradientFill } from "./GradientFill";
import { BigButton } from "./ModalKit";
import { TradeDialog } from "./TradeDialog";
import { SpotlightTarget } from "./Spotlight";

// Loosened to the fields this panel actually needs (rather than the full
// Good/GoodState shape) so it can double as an asset buy/sell panel in
// InvestScreen.
interface Props {
  good: { nameKey: string; icon: string; color: string };
  state: { price: number; holding: number };
  cash: number;
  onTrade: (side: "buy" | "sell", qty: number) => void;
  /** total round-trip bid/ask spread as a fraction of the quoted price (e.g. 0.03 = 3%); omit for no spread */
  spreadPct?: number;
  /** render as the painted trade dialog (panel art, plaque buttons) instead of the dark card; needs goodId and onClose */
  dialog?: boolean;
  /** render on the sent Invest-screen panel art (only the Invest screen sets it) */
  painted?: boolean;
  goodId?: string;
  onClose?: () => void;
}

// A number is any amount the player typed or stepped to; the dark card only
// ever offers 1, 5 and ALL, the dialog also takes a free amount.
type Qty = number | "ALL";

export function BuySellPanel({
  good,
  state,
  cash,
  onTrade,
  spreadPct = 0,
  dialog = false,
  painted = false,
  goodId,
  onClose,
}: Props) {
  const { t, formatCoins, state: economyState } = useEconomyContext();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  // Only for a player who has never traded — `totalTrades` is a lifetime
  // count, so this cannot come back later.
  const nudge = economyState.stats.totalTrades === 0 && side === "buy";
  const [qtyOption, setQtyOption] = useState<Qty>(1);
  const [coinPopTrigger, setCoinPopTrigger] = useState(0);

  const tradeStreak = economyState.tradeStreak;
  const streakBonusPct = Math.round(
    Math.min(Math.max(tradeStreak - 1, 0) * HOT_STREAK_BONUS_PER_TRADE, HOT_STREAK_MAX_BONUS) * 100
  );

  // The quoted chart price is the fair mid-price; what you actually pay or
  // receive sits a half-spread on either side of it, same as the reducer.
  const execPrice = side === "buy" ? state.price * (1 + spreadPct / 2) : state.price * (1 - spreadPct / 2);
  const affordableAll = Math.floor(cash / execPrice);
  const resolvedQty = qtyOption === "ALL" ? (side === "buy" ? affordableAll : state.holding) : qtyOption;
  const total = resolvedQty * execPrice;
  const disabled = resolvedQty <= 0 || (side === "buy" ? total > cash + 0.001 : resolvedQty > state.holding);

  if (dialog) {
    return (
      <TradeDialog
        good={good}
        goodId={goodId ?? ""}
        holding={state.holding}
        side={side}
        setSide={setSide}
        qtyOption={qtyOption}
        setQtyOption={setQtyOption}
        resolvedQty={resolvedQty}
        execPrice={execPrice}
        total={total}
        disabled={disabled}
        onClose={onClose}
        onConfirm={() => {
          onTrade(side, resolvedQty);
          setCoinPopTrigger((n) => n + 1);
        }}
        coinPopTrigger={coinPopTrigger}
      />
    );
  }

  if (painted) {
    return (
      <View>
        {tradeStreak >= 2 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakBadgeText}>
              {t("market.hotStreak", { streak: tradeStreak, bonusPct: streakBonusPct })}
            </Text>
          </View>
        )}
        <InvestTradePanel
          side={side}
          onSide={setSide}
          buyLabel={t("market.buyShort")}
          sellLabel={t("market.sellShort")}
          qty={([1, 5, "ALL"] as Qty[]).map((q) => ({
            key: String(q),
            label: q === "ALL" ? t("common.all") : String(q),
            selected: qtyOption === q,
            onPress: () => setQtyOption(q),
          }))}
          accent={good.color}
          summary={`${resolvedQty} x ${t(good.nameKey)} @ ${execPrice.toFixed(2)}`}
          total={formatCoins(total)}
          confirmLabel={`${side === "buy" ? t("market.buyConfirm") : t("market.sellConfirm")} ${good.icon}`}
          disabled={disabled}
          onConfirm={() => {
            onTrade(side, resolvedQty);
            setCoinPopTrigger((n) => n + 1);
          }}
        >
          <CoinPop trigger={coinPopTrigger} />
        </InvestTradePanel>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
      {tradeStreak >= 2 && (
        <View style={styles.streakBadge}>
          <Text style={styles.streakBadgeText}>
            {t("market.hotStreak", { streak: tradeStreak, bonusPct: streakBonusPct })}
          </Text>
        </View>
      )}
      <View style={styles.sideToggle}>
        <Pressable
          style={[styles.sideBtn, side === "buy" && styles.sideBtnActiveBuy]}
          onPress={() => setSide("buy")}
        >
          <Text style={[styles.sideBtnText, side === "buy" && styles.sideBtnTextActive]}>
            {t("market.buyShort")}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.sideBtn, side === "sell" && styles.sideBtnActiveSell]}
          onPress={() => setSide("sell")}
        >
          <Text style={[styles.sideBtnText, side === "sell" && styles.sideBtnTextActive]}>
            {t("market.sellShort")}
          </Text>
        </Pressable>
      </View>

      <View style={styles.qtyRow}>
        {([1, 5, "ALL"] as Qty[]).map((q) => (
          <Pressable
            key={String(q)}
            style={[styles.qtyBtn, qtyOption === q && { borderColor: good.color, borderWidth: 2 }]}
            onPress={() => setQtyOption(q)}
          >
            <Text style={styles.qtyBtnText}>{q === "ALL" ? t("common.all") : q}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>
          {resolvedQty} x {t(good.nameKey)} @ {execPrice.toFixed(2)}
        </Text>
        <Text style={styles.summaryTotal}>{formatCoins(total)}</Text>
      </View>

      {/* A ring around the trade button until the player has made their
          first one. The guided card says "buy any good in the Market"; this
          is the part of the market it means. It costs nothing to anyone past
          their first trade, because it is gone by then. */}
      <SpotlightTarget id="buy" style={[styles.confirmBtnWrap, nudge && styles.confirmBtnNudge]}>
        <BigButton
          tone={side === "buy" ? "green" : "red"}
          height={52}
          fontSize={18}
          disabled={disabled}
          label={`${side === "buy" ? t("market.buyConfirm") : t("market.sellConfirm")} ${good.icon}`}
          onPress={() => {
            onTrade(side, resolvedQty);
            setCoinPopTrigger((n) => n + 1);
          }}
        />
        <CoinPop trigger={coinPopTrigger} />
      </SpotlightTarget>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: RADIUS.feature,
    padding: SPACING.md,
    overflow: "hidden",
    ...cardShadow,
  },
  streakBadge: {
    alignSelf: "center",
    backgroundColor: withAlpha("#f0776a", 0.16),
    borderRadius: RADIUS.chip,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    marginBottom: SPACING.sm,
  },
  streakBadgeText: {
    color: "#f0776a",
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
  sideToggle: {
    flexDirection: "row",
    backgroundColor: "#1a1410",
    borderRadius: RADIUS.chip,
    padding: 3,
    marginBottom: SPACING.md - 2,
  },
  sideBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.chip - 2, alignItems: "center" },
  sideBtnActiveBuy: { backgroundColor: COLORS.positive },
  sideBtnActiveSell: { backgroundColor: COLORS.negative },
  sideBtnText: {
    color: COLORS.textMuted,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    fontSize: TYPE.body,
  },
  sideBtnTextActive: { color: "#fff" },
  qtyRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md - 2 },
  qtyBtn: {
    flex: 1,
    backgroundColor: "#1a1410",
    borderRadius: RADIUS.chip,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    marginRight: SPACING.sm,
  },
  qtyBtnText: {
    color: COLORS.textPrimary,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    fontSize: TYPE.label,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.md - 2,
    paddingHorizontal: 2,
  },
  summaryLabel: { color: COLORS.textMuted, fontSize: TYPE.label },
  summaryTotal: { color: COLORS.accent, fontSize: TYPE.body, fontWeight: WEIGHT.bold, fontFamily: FONT.bold },
  confirmBtnNudge: {
    borderWidth: 2,
    borderColor: withAlpha("#5fd884", 0.9),
    borderRadius: RADIUS.feature,
    ...glowShadow("#5fd884"),
  },
  confirmBtnWrap: { position: "relative" },
  confirmBtn: {
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.md,
    alignItems: "center",
    overflow: "hidden",
  },
  confirmBtnDisabled: { opacity: 0.35 },
  confirmBtnText: {
    color: "#fff",
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    fontSize: TYPE.body + 1,
  },
});
