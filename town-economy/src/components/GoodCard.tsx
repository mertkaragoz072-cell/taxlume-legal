import React from "react";
import { formatPercent } from "../utils/formatNumber";
import { Animated, Image, StyleSheet, View } from "react-native";
import { Text } from "./AppText";
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
const GOLD_BORDER = "#6f4e2e";
const GOLD_BORDER_SELECTED = "#ffd24a";

// Light/dark ends of the corner ribbon, derived from the badge color the
// caller passes (orange for sought-after, blue for glutted).
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) =>
    Math.max(0, Math.min(255, Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount))));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `rgb(${r},${g},${b})`;
}
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
  // Lettering is sized to the text it carries: Turkish puts the percent sign
  // in front ("-%16,0") and names like "Teknoloji Hissesi" run long, and a card
  // is only ~90px wide, so long strings step down (and a big move drops its
  // decimal) instead of ending in an ellipsis.
  const changeText = formatPercent(change, economy.language, Math.abs(change) >= 10 ? 0 : 1);
  const changeSize = changeText.length > 4 ? 9 : TYPE.micro;
  const nameLen = t(good.nameKey).length;
  const nameSize = nameLen > 10 ? 12 : TYPE.title - 2;
  const prodLen = good.producerKey ? t(good.producerKey).length : 0;
  const producerSize = prodLen > 12 ? 9 : TYPE.caption;
  const cardPadding = Math.round(SPACING.sm * scale);
  const iconSize = Math.round(40 * scale);
  const chartWidth = Math.max(32, Math.round(88 * scale));
  const chartHeight = Math.max(20, Math.round(30 * scale));

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
        selected && { ...glowShadow(GOLD_BORDER_SELECTED), shadowOpacity: 0.85, shadowRadius: 12 },
      ]}
    >
      <ScalePressable onPress={onPress} style={styles.cardInner}>
        {/* The data half — icon, today's move, the trend — on the app's
            usual dark card, same as before. */}
        <View style={[styles.topZone, { padding: cardPadding }]}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: withAlpha(good.color, selected ? 0.36 : 0.16) },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: flashColor, opacity }]}
          />
          {badge && (
            <View style={styles.badge}>
              <GradientFill
                colors={[shade(badge.color, 0.1), shade(badge.color, -0.1)]}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              />
              <Text style={styles.badgeText} numberOfLines={1}>
                {badge.text}
              </Text>
            </View>
          )}
          <View style={styles.topRow}>
            <GoodIcon id={good.id ?? ""} fallback={good.icon} size={iconSize} />
            <View style={styles.changeWrap}>
              {change !== 0 && width >= 110 && (
                <Text style={[styles.arrow, { color: positive ? COLORS.positive : COLORS.negative }]}>
                  {positive ? "▲" : "▼"}
                </Text>
              )}
              <Text
                numberOfLines={1}
                style={[
                  styles.change,
                  { color: positive ? COLORS.positive : COLORS.negative, fontSize: changeSize },
                ]}
              >
                {positive ? "+" : ""}
                {changeText}
              </Text>
            </View>
          </View>
          <View style={styles.chartBox}>
            <PriceChart
              history={state.history.slice(-24)}
              color={good.color}
              width={chartWidth}
              height={chartHeight}
              strokeWidth={1.5}
              smooth={false}
              filled={false}
              baseline={false}
            />
          </View>
        </View>
        {/* The identity half — name, who makes it, the price — on a cream
            parchment strip instead of the same dark card, matching the
            reference's two-tone card rather than one uniform dark panel. */}
        <View pointerEvents="none" style={styles.innerFrame} />
        <View pointerEvents="none" style={[styles.bracket, styles.bracketTL]} />
        {!badge && <View pointerEvents="none" style={[styles.bracket, styles.bracketTR]} />}

        <View style={styles.bottomFrame}>
          <View style={styles.bottomZone}>
            <Text
              style={[styles.name, { fontSize: nameSize, lineHeight: nameLen > 10 ? 14 : 18 }]}
              numberOfLines={2}
            >
              {t(good.nameKey)}
            </Text>
            {/* Who makes it, in the same breath as the price — a card is no
              longer just a number with a squiggle under it, it says
              something about the good before you even tap into it. Assets
              (gold, oil...) have no producer, so this quietly disappears
              for them. */}
            {good.producerKey && (
              <Text style={[styles.producer, { fontSize: producerSize }]} numberOfLines={1}>
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
    borderTopRightRadius: RADIUS.card - 2,
    borderBottomLeftRadius: 12,
    paddingLeft: 10,
    paddingRight: 7,
    paddingVertical: 2,
    overflow: "hidden",
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: "rgba(60,30,8,0.45)",
    zIndex: 4,
  },
  badgeText: { color: "#2a1608", fontSize: 8.5, fontWeight: WEIGHT.black, fontFamily: FONT.black },
  card: {
    borderRadius: RADIUS.card,
    // Same width selected or not, so picking a card never shifts its contents.
    borderWidth: 2,
    marginRight: SPACING.sm,
    ...cardShadow,
  },
  // No padding or alignment of its own — the card is two differently
  // colored zones now (see topZone/bottomZone below), each owning its
  // own padding, clipped to the card's rounded corners by this wrapper.
  cardInner: {
    borderRadius: RADIUS.card,
    overflow: "hidden",
    backgroundColor: "#3a2615",
  },
  topZone: { alignItems: "center" },
  // Dark wood frame around the parchment, so the cream label reads as a
  // plate inset in the card rather than the card's own bottom half.
  bottomFrame: {},
  // The identity half — cream parchment, matching the reference's
  // two-tone card instead of one uniform dark panel.
  bottomZone: {
    alignItems: "center",
    backgroundColor: PARCHMENT.paper,
    // Spans the card's full width and sits on its bottom edge, so it is
    // exactly as wide as the dark zone above it.
    borderRadius: 0,
    borderTopWidth: 2,
    borderTopColor: "#8a5f33",
    paddingTop: 3,
    paddingBottom: 5,
    paddingHorizontal: 3,
  },
  // A thin lighter bevel line just inside the card's wood border, and an
  // L-shaped bronze bracket in each corner, like the reference's frame.
  innerFrame: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RADIUS.card - 2,
    borderWidth: 1,
    borderColor: "rgba(214,170,110,0.35)",
    zIndex: 3,
  },
  bracket: { position: "absolute", width: 9, height: 9, borderColor: "#b88a4a", zIndex: 5 },
  bracketTL: { top: 1, left: 1, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 5 },
  bracketTR: { top: 1, right: 1, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 5 },
  chartBox: { overflow: "hidden" },
  changeWrap: { flexDirection: "row", alignItems: "center", gap: 3, flexShrink: 1 },
  arrow: { fontSize: 8 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    // Room for the corner badge above the move on every card, badge or
    // not, so cards in a row keep the same height and alignment.
    marginTop: 6,
    marginBottom: 2,
  },
  change: { fontSize: TYPE.micro, fontWeight: WEIGHT.black, fontFamily: FONT.black, flexShrink: 1 },
  name: {
    color: PARCHMENT.ink,
    fontSize: TYPE.title - 2,
    fontFamily: FONT.serif,
    textAlign: "center",
  },
  producer: {
    color: PARCHMENT.inkMuted,
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.medium,
    fontFamily: FONT.medium,
    lineHeight: 12,
    marginTop: 0,
  },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  coin: { width: 15, height: 15 },
  price: {
    color: PARCHMENT.ink,
    fontSize: TYPE.title,
    fontFamily: FONT.serif,
    lineHeight: 20,
    fontVariant: ["lining-nums"],
  },
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
