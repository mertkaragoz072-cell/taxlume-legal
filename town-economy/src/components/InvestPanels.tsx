import React, { useState } from "react";
import { Animated, Image, LayoutChangeEvent, StyleSheet, View } from "react-native";
import btnBuy from "../../assets/ui/invest/btn_buy.webp";
import chartArt from "../../assets/ui/invest/chart.webp";
import portfolioArt from "../../assets/ui/invest/portfolio.webp";
import tradeArt from "../../assets/ui/invest/trade.webp";
import { FONT, PANEL_GAP } from "../theme";
import { Text } from "./AppText";
import { ScalePressable } from "./ScalePressable";

const CREAM = "#e8dcc0";
const SOFT = "#bfae8c";
const GOLD = "#f6d27a";

type Box = { x: number; y: number; w: number; h: number };

function useScale(artW: number) {
  const [w, setW] = useState(360);
  const s = w / artW;
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const box = (b: Box) => ({
    position: "absolute" as const,
    left: b.x * s,
    top: b.y * s,
    width: b.w * s,
    height: b.h * s,
  });
  const fit = (text: string, boxW: number, max: number, em: number) =>
    Math.min(max, (boxW * 0.96) / (Math.max(1, text.length) * em)) * s;
  return { w, s, onLayout, box, fit };
}

// ------------------------------------------------------------ portfolio

interface PortfolioProps {
  label: string;
  value: string;
  pnl?: string;
  pnlPositive?: boolean;
}

/** "Yatırım Değeri": the dark rounded bar with the portfolio's worth and, when
 * something is held, its running profit or loss. */
export function PortfolioPanel({ label, value, pnl, pnlPositive = true }: PortfolioProps) {
  const { onLayout, box, fit } = useScale(721);
  return (
    <View
      style={{ aspectRatio: 721 / 158, alignSelf: "stretch", marginBottom: PANEL_GAP }}
      onLayout={onLayout}
    >
      <Image source={portfolioArt} style={styles.fill} resizeMode="stretch" />
      <View style={[box({ x: 38, y: 18, w: 420, h: 40 }), { justifyContent: "center" }]} pointerEvents="none">
        <Text style={[styles.label, { fontSize: fit(label, 420, 30, 0.58) }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={[box({ x: 38, y: 60, w: 380, h: 78 }), { justifyContent: "center" }]} pointerEvents="none">
        <Text style={[styles.value, { fontSize: fit(value, 380, 60, 0.6) }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      {pnl ? (
        <View
          style={[
            box({ x: 400, y: 70, w: 290, h: 58 }),
            { justifyContent: "center", alignItems: "flex-end" },
          ]}
          pointerEvents="none"
        >
          <Text
            style={[
              styles.pnl,
              { color: pnlPositive ? "#5fd884" : "#ef7a70", fontSize: fit(pnl, 290, 38, 0.56) },
            ]}
            numberOfLines={1}
          >
            {pnl}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------ chart card

interface ChartProps {
  icon: string;
  name: string;
  description: string;
  price: React.ReactNode;
  change: string;
  changePositive: boolean;
  /** the asset's own colour: tints the card */
  color: string;
  flashColor: string;
  flashOpacity: Animated.Value;
  holding: string;
  pnl?: string;
  pnlPositive?: boolean;
  /** the live chart, given the plot box in px */
  children: (w: number, h: number) => React.ReactNode;
  /** px size of the price text, derived from art width */
  priceSize?: number;
}

/** The selected asset's card: name, price, change, the chart itself and what
 * the player holds of it. */
export function AssetChartPanel(p: ChartProps) {
  const { s, onLayout, box, fit } = useScale(721);
  return (
    <View
      style={{ aspectRatio: 721 / 520, alignSelf: "stretch", marginBottom: PANEL_GAP }}
      onLayout={onLayout}
    >
      <Image source={chartArt} style={styles.fill} resizeMode="stretch" />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 4 * s,
          top: 4 * s,
          right: 4 * s,
          bottom: 4 * s,
          borderRadius: 40 * s,
          backgroundColor: p.color,
          opacity: 0.16,
        }}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 4 * s,
          top: 4 * s,
          right: 4 * s,
          bottom: 4 * s,
          borderRadius: 40 * s,
          backgroundColor: p.flashColor,
          opacity: p.flashOpacity,
        }}
      />
      <View style={[box({ x: 38, y: 26, w: 400, h: 56 }), { justifyContent: "center" }]} pointerEvents="none">
        <Text
          style={[styles.title, { fontSize: fit(`${p.icon} ${p.name}`, 400, 44, 0.58) }]}
          numberOfLines={1}
        >
          {p.icon} {p.name}
        </Text>
      </View>
      <View style={box({ x: 38, y: 86, w: 400, h: 76 })} pointerEvents="none">
        <Text
          style={[
            styles.desc,
            {
              fontSize: Math.min(28, (400 * 1.9) / Math.max(1, p.description.length * 0.52)) * s,
              lineHeight: 33 * s,
            },
          ]}
          numberOfLines={2}
        >
          {p.description}
        </Text>
      </View>
      <View
        style={[box({ x: 400, y: 24, w: 290, h: 60 }), { justifyContent: "center", alignItems: "flex-end" }]}
        pointerEvents="none"
      >
        {p.price}
      </View>
      <View
        style={[box({ x: 400, y: 88, w: 290, h: 46 }), { justifyContent: "center", alignItems: "flex-end" }]}
        pointerEvents="none"
      >
        <Text
          style={[
            styles.change,
            { color: p.changePositive ? "#5fd884" : "#ef7a70", fontSize: fit(p.change, 290, 34, 0.6) },
          ]}
          numberOfLines={1}
        >
          {p.change}
        </Text>
      </View>
      <View style={box({ x: 30, y: 164, w: 684, h: 250 })}>{p.children(684 * s, 250 * s)}</View>
      <View
        style={[box({ x: 38, y: 440, w: 380, h: 56 }), { justifyContent: "center" }]}
        pointerEvents="none"
      >
        <Text style={[styles.hold, { fontSize: fit(p.holding, 380, 30, 0.54) }]} numberOfLines={1}>
          {p.holding}
        </Text>
      </View>
      {p.pnl ? (
        <View
          style={[
            box({ x: 410, y: 440, w: 280, h: 56 }),
            { justifyContent: "center", alignItems: "flex-end" },
          ]}
          pointerEvents="none"
        >
          <Text
            style={[
              styles.hold,
              { color: p.pnlPositive ? "#5fd884" : "#ef7a70", fontSize: fit(p.pnl, 280, 30, 0.56) },
            ]}
            numberOfLines={1}
          >
            {p.pnl}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------ buy / sell

interface TradeProps {
  side: "buy" | "sell";
  onSide: (s: "buy" | "sell") => void;
  buyLabel: string;
  sellLabel: string;
  qty: { key: string; label: string; selected: boolean; onPress: () => void }[];
  accent: string;
  summary: string;
  total: string;
  confirmLabel: string;
  disabled: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
}

/** The invest al/sat panel: side toggle, quantity slots, summary and the big
 * confirm button (green to buy, red to sell). */
export function InvestTradePanel(p: TradeProps) {
  const { s, onLayout, box, fit } = useScale(717);
  const buy = p.side === "buy";
  const PILL_W = 333;
  const pillX = buy ? 28 : 358;
  return (
    <View
      style={{ aspectRatio: 717 / 356, alignSelf: "stretch", marginBottom: PANEL_GAP }}
      onLayout={onLayout}
    >
      <Image source={tradeArt} style={styles.fill} resizeMode="stretch" />

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: pillX * s,
          top: 26 * s,
          width: PILL_W * s,
          height: 64 * s,
          borderRadius: 28 * s,
          backgroundColor: buy ? "#4fa56a" : "#e0615f",
        }}
      />
      <View style={[box({ x: 22, y: 24, w: 676, h: 70 }), { flexDirection: "row" }]}>
        {(
          [
            ["buy", p.buyLabel],
            ["sell", p.sellLabel],
          ] as const
        ).map(([d, label]) => (
          <ScalePressable
            key={d}
            onPress={() => p.onSide(d)}
            accessibilityLabel={label}
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
            scaleTo={0.98}
          >
            <Text
              style={[styles.toggle, { fontSize: fit(label, 320, 34, 0.7) }, p.side !== d && { color: SOFT }]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </ScalePressable>
        ))}
      </View>

      {p.qty.map((q, i) => (
        <ScalePressable
          key={q.key}
          onPress={q.onPress}
          accessibilityLabel={q.label}
          style={[
            box({ x: [24, 252, 479][i], y: 98, w: [196, 197, 200][i], h: 88 }),
            styles.center,
            q.selected && { borderWidth: Math.max(2, 5 * s), borderColor: p.accent, borderRadius: 26 * s },
          ]}
          scaleTo={0.96}
        >
          <Text style={[styles.qty, { fontSize: 30 * s }]}>{q.label}</Text>
        </ScalePressable>
      ))}

      <View
        style={[box({ x: 30, y: 200, w: 470, h: 46 }), { justifyContent: "center" }]}
        pointerEvents="none"
      >
        <Text style={[styles.sum, { fontSize: fit(p.summary, 470 * 1.3, 28, 0.52) }]} numberOfLines={1}>
          {p.summary}
        </Text>
      </View>
      <View
        style={[box({ x: 470, y: 200, w: 224, h: 46 }), { justifyContent: "center", alignItems: "flex-end" }]}
        pointerEvents="none"
      >
        <Text style={[styles.total, { fontSize: fit(p.total, 224, 34, 0.6) }]} numberOfLines={1}>
          {p.total}
        </Text>
      </View>

      <ScalePressable
        disabled={p.disabled}
        onPress={p.onConfirm}
        accessibilityLabel={p.confirmLabel}
        style={box({ x: 21, y: 255, w: 676, h: 81 })}
        scaleTo={0.97}
      >
        <View style={{ flex: 1 }}>
          {buy && <Image source={btnBuy} style={styles.fill} resizeMode="stretch" />}
          {p.disabled && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 38 * s,
                backgroundColor: "rgba(40,26,14,0.55)",
              }}
            />
          )}
          <View style={styles.center}>
            <Text
              style={[styles.confirm, { fontSize: fit(p.confirmLabel, 600, 36, 0.62) }]}
              numberOfLines={1}
            >
              {p.confirmLabel}
            </Text>
          </View>
        </View>
      </ScalePressable>
      {p.children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  label: { color: SOFT, fontFamily: FONT.medium, letterSpacing: 1 },
  value: { color: "#f3e7c9", fontFamily: FONT.black },
  pnl: { fontFamily: FONT.bold },
  title: { color: "#f6ecd0", fontFamily: FONT.black },
  desc: { color: SOFT, fontFamily: FONT.medium },
  change: { fontFamily: FONT.bold },
  hold: { color: SOFT, fontFamily: FONT.medium },
  toggle: { color: "#fff", fontFamily: FONT.bold },
  qty: { color: CREAM, fontFamily: FONT.bold },
  sum: { color: SOFT, fontFamily: FONT.medium },
  total: { color: GOLD, fontFamily: FONT.bold },
  confirm: { color: "#fff", fontFamily: FONT.black, textAlign: "center" },
});
