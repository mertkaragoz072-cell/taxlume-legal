import React from "react";
import { formatPercent } from "../utils/formatNumber";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { usePriceFlash } from "../hooks/usePriceFlash";
import {
  cardShadow,
  CARD_GRADIENT,
  COLORS,
  FONT,
  glowShadow,
  RADIUS,
  SPACING,
  TYPE,
  WEIGHT,
  withAlpha,
} from "../theme";
import { GoodIcon } from "./GoodIcon";
import { GradientFill } from "./GradientFill";
import { PriceChart } from "./PriceChart";
import { ScalePressable } from "./ScalePressable";

// Loosened to the fields this card actually renders (rather than the full
// Good/GoodState shape) so it can double as an asset card in InvestScreen.
interface Props {
  // id is optional because InvestScreen passes assets (gold, oil, tech
  // stock...) through this same card, and those aren't a GoodId — GoodIcon
  // just won't find art for them and falls back to their emoji, same as
  // ever.
  good: { id?: string; nameKey: string; icon: string; color: string; producerKey?: string };
  state: { price: number; history: number[]; holding: number };
  selected: boolean;
  onPress: () => void;
  /** optional corner tag, e.g. the demand cycle marking this good as sought
   * after or glutted — kept generic so the invest screen can leave it off */
  badge?: { text: string; color: string };
}

function pctChange(history: number[]): number {
  if (history.length < 2) return 0;
  const prev = history[history.length - 2];
  const curr = history[history.length - 1];
  if (prev === 0) return 0;
  return ((curr - prev) / prev) * 100;
}

export function GoodCard({ good, state, selected, onPress, badge }: Props) {
  const { state: economy, t } = useEconomyContext();
  const change = pctChange(state.history);
  const positive = change >= 0;
  const { opacity, flashColor } = usePriceFlash(state.price);

  return (
    // The shadow lives on this plain, never-animated View rather than on
    // ScalePressable's own style. ScalePressable puts a native-driven scale
    // transform on whatever node its style prop lands on for every press,
    // and a shadow (it forces an offscreen render pass) sharing a node with
    // that transform is the same combination that left TabBar's active tab
    // permanently blurred on a real device even after the animation
    // settled back to rest — cardShadow here is unconditional, so every
    // card, not just a selected one, would have picked up that blur the
    // first time it was tapped.
    <View
      style={[
        styles.card,
        selected && { borderColor: good.color, borderWidth: 2 },
        selected && glowShadow(good.color),
      ]}
    >
      <ScalePressable onPress={onPress} style={styles.cardInner}>
        <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
        {selected && (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(good.color, 0.16) }]}
          />
        )}
        <View
          style={[
            styles.accentStripe,
            { backgroundColor: selected ? good.color : withAlpha(good.color, 0.4) },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.flashOverlay, { backgroundColor: flashColor, opacity }]}
        />
        {badge && (
          <View style={[styles.badge, { backgroundColor: withAlpha(badge.color, 0.9) }]}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {badge.text}
            </Text>
          </View>
        )}
        <View style={styles.topRow}>
          <GoodIcon id={good.id ?? ""} fallback={good.icon} size={TYPE.heading} />
          <Text style={[styles.change, { color: positive ? COLORS.positive : COLORS.negative }]}>
            {change === 0 ? "" : positive ? "▲" : "▼"} {positive ? "+" : ""}
            {formatPercent(change, economy.language, 1)}
          </Text>
        </View>
        <PriceChart history={state.history} color={good.color} width={76} height={34} strokeWidth={1.5} />
        <Text style={styles.name} numberOfLines={1}>
          {t(good.nameKey)}
        </Text>
        {/* Who makes it, in the same breath as the price — a card is no
            longer just a number with a squiggle under it, it says something
            about the good before you even tap into it. Assets (gold, oil...)
            have no producer, so this quietly disappears for them. */}
        {good.producerKey && (
          <Text style={styles.producer} numberOfLines={1}>
            {t(good.producerKey)}
          </Text>
        )}
        <Text style={styles.price}>{state.price.toFixed(2)} 🪙</Text>
        {state.holding > 0 && <Text style={styles.holding}>x{state.holding}</Text>}
      </ScalePressable>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    borderTopRightRadius: RADIUS.card,
    borderBottomLeftRadius: RADIUS.card,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 2,
  },
  badgeText: { color: "#1a1410", fontSize: 8, fontWeight: WEIGHT.black, fontFamily: FONT.black },
  // Narrower than it used to be (108 → 92) so a horizontal row shows
  // roughly 3.5–4 cards at once instead of ~3 — most of the row reads at
  // a glance without scrolling, and the next card still peeks in at the
  // edge as a scroll hint.
  card: {
    width: 92,
    borderRadius: RADIUS.card,
    borderWidth: 2,
    borderColor: "transparent",
    marginRight: SPACING.sm,
    ...cardShadow,
  },
  cardInner: {
    borderRadius: RADIUS.card,
    padding: SPACING.sm,
    paddingTop: SPACING.sm + 2,
    alignItems: "center",
    overflow: "hidden",
  },
  accentStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  flashOverlay: {
    borderRadius: RADIUS.card,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 2,
  },
  change: { fontSize: TYPE.caption, fontWeight: WEIGHT.bold, fontFamily: FONT.bold },
  name: {
    color: COLORS.textPrimary,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.medium,
    fontFamily: FONT.medium,
    marginTop: SPACING.xs,
  },
  producer: { color: COLORS.textMuted, fontSize: TYPE.micro, marginTop: 1 },
  price: { color: COLORS.accent, fontSize: TYPE.body, fontWeight: WEIGHT.bold, fontFamily: FONT.bold },
  holding: {
    marginTop: 2,
    fontSize: TYPE.micro,
    color: COLORS.onLight,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 1,
  },
});
