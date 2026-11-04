import React, { useState } from "react";
import { Image, ImageSourcePropType, LayoutChangeEvent, Pressable, StyleSheet, View } from "react-native";
import { Text } from "./AppText";
import closeImg from "../../assets/ui/trade/close.png";
import confirmImg from "../../assets/ui/trade/confirm.png";
import crateImg from "../../assets/ui/trade/crate.png";
import panelImg from "../../assets/ui/trade/panel.png";
import qtyBrownImg from "../../assets/ui/trade/qty_brown.png";
import qtyGoldImg from "../../assets/ui/trade/qty_gold.png";
import tabBrownImg from "../../assets/ui/trade/tab_brown.png";
import tabGreenImg from "../../assets/ui/trade/tab_green.png";
import { useEconomyContext } from "../economy/EconomyContext";
import { FONT } from "../theme";
import { CoinPop } from "./CoinPop";
import { GoodIcon } from "./GoodIcon";

type Qty = 1 | 5 | "ALL";

interface Props {
  good: { nameKey: string; icon: string; color: string };
  goodId: string;
  price: number;
  holding: number;
  side: "buy" | "sell";
  setSide: (s: "buy" | "sell") => void;
  qtyOption: Qty;
  setQtyOption: (q: Qty) => void;
  resolvedQty: number;
  execPrice: number;
  total: number;
  disabled: boolean;
  onClose?: () => void;
  onConfirm: () => void;
  coinPopTrigger: number;
}

const INK = "#3d2415";
const CREAM = "#f6e7c4";

// Everything is placed as a share of the panel art (1095 x 1003), read off
// the sent layout, so the dialog keeps its look at any width.
const PANEL_ASPECT = 1095 / 1003;

function Art({
  source,
  left,
  top,
  width,
  aspect,
  children,
  onPress,
  label,
  style,
}: {
  source: ImageSourcePropType;
  left: number;
  top: number;
  width: number;
  aspect: number;
  children?: React.ReactNode;
  onPress?: () => void;
  label?: string;
  style?: object;
}) {
  const box = {
    position: "absolute" as const,
    left: `${left}%` as const,
    top: `${top}%` as const,
    width: `${width}%` as const,
    aspectRatio: aspect,
  };
  const inner = (
    <>
      <Image source={source} style={styles.fill} resizeMode="stretch" />
      <View style={styles.center}>{children}</View>
    </>
  );
  if (onPress)
    return (
      <Pressable style={[box, style]} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
        {inner}
      </Pressable>
    );
  return <View style={[box, style]}>{inner}</View>;
}

export function TradeDialog(p: Props) {
  const { t, formatCoins } = useEconomyContext();
  const [w, setW] = useState(380);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const buy = p.side === "buy";
  const f = (k: number) => Math.round(w * k);
  const qtys: { q: Qty; left: number; width: number; art: ImageSourcePropType; aspect: number }[] = [
    { q: 1, left: 11, width: 28.1, art: qtyGoldImg, aspect: 308 / 116 },
    { q: 5, left: 40.6, width: 23.5, art: qtyBrownImg, aspect: 257 / 108 },
    { q: "ALL", left: 65.5, width: 24.9, art: qtyBrownImg, aspect: 273 / 109 },
  ];

  return (
    <View style={styles.panel} onLayout={onLayout}>
      <Image source={panelImg} style={styles.fill} resizeMode="stretch" />

      <View style={styles.headIcon}>
        <GoodIcon id={p.goodId} fallback={p.good.icon} size={f(0.2)} />
      </View>
      <Text style={[styles.name, { fontSize: f(0.075) }]} numberOfLines={1}>
        {t(p.good.nameKey)}
      </Text>
      <View style={styles.meta}>
        <Text style={[styles.metaText, { fontSize: f(0.062) }]}>{p.price.toFixed(2)} 🪙</Text>
        <Image
          source={crateImg}
          style={{ width: f(0.07), height: f(0.062), marginLeft: f(0.03) }}
          resizeMode="contain"
        />
        <Text style={[styles.metaText, { fontSize: f(0.062) }]}>×{p.holding}</Text>
      </View>
      <Pressable
        onPress={p.onClose}
        style={styles.close}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Image source={closeImg} style={styles.fill} resizeMode="contain" />
      </Pressable>

      <Art
        source={buy ? tabGreenImg : tabBrownImg}
        left={7.8}
        top={30.2}
        width={43.5}
        aspect={476 / 134}
        onPress={() => p.setSide("buy")}
        label={t("market.buyShort")}
      >
        <Text style={[styles.tabText, { fontSize: f(0.052) }]}>{t("market.buyShort")}</Text>
      </Art>
      <Art
        source={buy ? tabBrownImg : tabGreenImg}
        left={50.5}
        top={30.2}
        width={41.5}
        aspect={455 / 134}
        onPress={() => p.setSide("sell")}
        label={t("market.sellShort")}
      >
        <Text style={[styles.tabText, { fontSize: f(0.052) }]}>{t("market.sellShort")}</Text>
      </Art>

      {qtys.map((o) => {
        const on = p.qtyOption === o.q;
        return (
          <Art
            key={String(o.q)}
            source={on ? qtyGoldImg : o.art}
            left={o.left}
            top={48.6}
            width={o.width}
            aspect={on ? 308 / 116 : o.aspect}
            onPress={() => p.setQtyOption(o.q)}
          >
            <Text style={[styles.qtyText, { fontSize: f(0.055), color: on ? INK : CREAM }]}>
              {o.q === "ALL" ? t("common.all") : o.q}
            </Text>
          </Art>
        );
      })}

      <View style={styles.summary}>
        <Text style={[styles.sumText, { fontSize: f(0.05) }]} numberOfLines={1}>
          {p.resolvedQty} x {t(p.good.nameKey)} @ {p.execPrice.toFixed(2)}
        </Text>
        <Text style={[styles.sumTotal, { fontSize: f(0.062) }]} numberOfLines={1}>
          {formatCoins(p.total)}
        </Text>
      </View>

      <Art
        source={confirmImg}
        left={22.6}
        top={74.3}
        width={54.6}
        aspect={611 / 152}
        onPress={p.disabled ? undefined : p.onConfirm}
        label={buy ? t("market.buyConfirm") : t("market.sellConfirm")}
        style={p.disabled ? styles.off : undefined}
      >
        <View style={styles.confirmRow}>
          <Text style={[styles.confirmText, { fontSize: f(0.068) }]}>
            {buy ? t("market.buyConfirm") : t("market.sellConfirm")}
          </Text>
          <GoodIcon id={p.goodId} fallback={p.good.icon} size={f(0.07)} style={{ marginRight: -f(0.02) }} />
        </View>
      </Art>
      <View pointerEvents="none" style={styles.coinPop}>
        <CoinPop trigger={p.coinPopTrigger} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: "100%", aspectRatio: PANEL_ASPECT },
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  headIcon: { position: "absolute", left: "9%", top: "9.5%" },
  name: { position: "absolute", left: "31%", top: "10.5%", right: "20%", color: INK, fontFamily: FONT.serif },
  meta: { position: "absolute", left: "31%", top: "21%", flexDirection: "row", alignItems: "center" },
  metaText: { color: INK, fontFamily: FONT.serif },
  close: { position: "absolute", left: "85.5%", top: "9.2%", width: "10.5%", aspectRatio: 1 },
  tabText: { color: CREAM, fontFamily: FONT.display, letterSpacing: 1 },
  qtyText: { fontFamily: FONT.display },
  summary: {
    position: "absolute",
    left: "12%",
    right: "11%",
    top: "62.2%",
    height: "9.4%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sumText: { color: INK, fontFamily: FONT.serif, flexShrink: 1 },
  sumTotal: { color: INK, fontFamily: FONT.serif },
  confirmRow: { flexDirection: "row", alignItems: "center" },
  confirmText: { color: CREAM, fontFamily: FONT.display, letterSpacing: 1.5 },
  off: { opacity: 0.4 },
  coinPop: { position: "absolute", left: 0, right: 0, top: "76%" },
});
