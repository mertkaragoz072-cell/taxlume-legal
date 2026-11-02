import React from "react";
import { formatPercent } from "../utils/formatNumber";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import coinIcon from "../../assets/ui/statpanel2/coinbullet.png";
import { useEconomyContext } from "../economy/EconomyContext";
import { usePriceFlash } from "../hooks/usePriceFlash";
import {
  cardShadow,
  CARD_GRADIENT,
  COLORS,
  FONT,
  glowShadow,
  PARCHMENT,
  RADIUS,
  SPACING,
  TYPE,
  WEIGHT,
  withAlpha,
} from "../theme";

// The card's own gold trim — not tied to any one good's color, matching
// the reference's border (plain bronze at rest, a brighter gold glow once
// selected) rather than the good's own accent color, which the badge and
// chart already carry.
const GOLD_BORDER = "#a9793f";
const GOLD_BORDER_SELECTED = "#f0d494";
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
  /** Card width in px. The caller works out how wide a card can be while
   * still fitting its usual count (4, early on) across the screen without
   * scrolling — this component has no idea how wide its own row is.
   * Defaults to the old fixed size for any caller that doesn't pass one. */
  width?: number;
}

function pctChange(history: number[]): number {
  if (history.length < 2) return 0;
  const prev = history[history.length - 2];
  const curr = history[history.length - 1];
  if (prev === 0) return 0;
  return ((curr - prev) / prev) * 100;
}

const BASE_WIDTH = 112;

export function GoodCard({ good, state, selected, onPress, badge, width = BASE_WIDTH }: Props) {
  const { state: economy, t } = useEconomyContext();
  const change = pctChange(state.history);
  const positive = change >= 0;
  const { opacity, flashColor } = usePriceFlash(state.price);
  // Everything inside scales off the same factor as the card itself, so a
  // narrower row (more goods unlocked, a smaller phone) shrinks as one
  // piece instead of the icon/chart staying fixed-size and overflowing a
  // card that got smaller around them.
  const scale = width / BASE_WIDTH;
  const cardPadding = Math.round(SPACING.md * scale);
  const iconSize = Math.round(52 * scale);
  const chartWidth = Math.max(32, Math.round(88 * scale));
  const chartHeight = Math.max(20, Math.round(56 * scale));

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
        { width, borderColor: selected ? GOLD_BORDER_SELECTED : GOLD_BORDER },
        selected && { borderWidth: 2 },
        selected && glowShadow(GOLD_BORDER_SELECTED),
      ]}
    >
      <ScalePressable onPress={onPress} style={styles.cardInner}>
        {/* The data half — icon, today's move, the trend — on the app's
            usual dark card, same as before. */}
        <View style={[styles.topZone, { padding: cardPadding }]}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          {selected && (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(good.color, 0.16) }]}
            />
          )}
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: flashColor, opacity }]}
          />
          {badge && (
            <View style={[styles.badge, { backgroundColor: withAlpha(badge.color, 0.95) }]}>
              <Text style={styles.badgeText} numberOfLines={1}>
                {badge.text}
              </Text>
            </View>
          )}
          <View style={styles.topRow}>
            <GoodIcon id={good.id ?? ""} fallback={good.icon} size={iconSize} />
            <Text style={[styles.change, { color: positive ? COLORS.positive : COLORS.negative }]}>
              {change === 0 ? "" : positive ? "▲" : "▼"} {positive ? "+" : ""}
              {formatPercent(change, economy.language, 1)}
            </Text>
          </View>
          <PriceChart
            history={state.history}
            color={good.color}
            width={chartWidth}
            height={chartHeight}
            strokeWidth={2}
          />
        </View>
        {/* The identity half — name, who makes it, the price — on a cream
            parchment strip instead of the same dark card, matching the
            reference's two-tone card rather than one uniform dark panel. */}
        <View style={[styles.bottomZone, { paddingHorizontal: cardPadding, paddingBottom: cardPadding }]}>
          <Text style={styles.name} numberOfLines={1}>
            {t(good.nameKey)}
          </Text>
          {/* Who makes it, in the same breath as the price — a card is no
              longer just a number with a squiggle under it, it says
              something about the good before you even tap into it. Assets
              (gold, oil...) have no producer, so this quietly disappears
              for them. */}
          {good.producerKey && (
            <Text style={styles.producer} numberOfLines={1}>
              {t(good.producerKey)}
            </Text>
          )}
          <View style={styles.priceRow}>
            <Text style={styles.price} numberOfLines={1}>
              {state.price.toFixed(2)}
            </Text>
            <Image source={coinIcon} style={styles.coin} resizeMode="contain" />
          </View>
          {state.holding > 0 && <Text style={styles.holding}>x{state.holding}</Text>}
        </View>
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
  card: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    marginRight: SPACING.sm,
    ...cardShadow,
  },
  // No padding or alignment of its own — the card is two differently
  // colored zones now (see topZone/bottomZone below), each owning its
  // own padding, clipped to the card's rounded corners by this wrapper.
  cardInner: {
    borderRadius: RADIUS.card,
    overflow: "hidden",
  },
  topZone: { alignItems: "center" },
  // The identity half — cream parchment, matching the reference's
  // two-tone card instead of one uniform dark panel.
  bottomZone: {
    alignItems: "center",
    backgroundColor: PARCHMENT.paper,
    paddingTop: SPACING.xs + 2,
  },
  // Icon above the move rather than beside it — at four cards across there
  // isn't room for a big icon and a readable "▲ +1.4%" on one line.
  topRow: { alignItems: "center", width: "100%", marginBottom: 4 },
  change: { fontSize: TYPE.body, fontWeight: WEIGHT.black, fontFamily: FONT.black, marginTop: 2 },
  name: {
    color: PARCHMENT.ink,
    fontSize: TYPE.heading,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
  },
  producer: {
    color: PARCHMENT.inkMuted,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.medium,
    fontFamily: FONT.medium,
    marginTop: 1,
  },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  coin: { width: 16, height: 16 },
  price: { color: PARCHMENT.ink, fontSize: TYPE.heading, fontWeight: WEIGHT.black, fontFamily: FONT.black },
  holding: {
    marginTop: 2,
    fontSize: TYPE.micro,
    color: "#fff",
    backgroundColor: PARCHMENT.ink,
    borderRadius: 8,
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 1,
  },
});
