import React, { useState } from "react";
import { Image, LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import cardBot from "../../assets/ui/goals/card_bot.webp";
import cardMid from "../../assets/ui/goals/card_mid.webp";
import cardTop from "../../assets/ui/goals/card_top.webp";
import ic_bars from "../../assets/ui/goals/ic_bars.webp";
import ic_swords from "../../assets/ui/goals/ic_swords.webp";
import ic_cart from "../../assets/ui/goals/ic_cart.webp";
import ic_shield from "../../assets/ui/goals/ic_shield.webp";
import ic_coins from "../../assets/ui/goals/ic_coins.webp";
import ic_trophy from "../../assets/ui/goals/ic_trophy.webp";
import ic_lock from "../../assets/ui/goals/ic_lock.webp";
import ic_store from "../../assets/ui/goals/ic_store.webp";
import ic_bars2 from "../../assets/ui/goals/ic_bars2.webp";
import ic_bag from "../../assets/ui/goals/ic_bag.webp";
import ribL from "../../assets/ui/goals/rib_l.webp";
import ribM from "../../assets/ui/goals/rib_m.webp";
import ribR from "../../assets/ui/goals/rib_r.webp";
import { FONT, PANEL_GAP } from "../theme";
import { Text } from "./AppText";

export const GOAL_ICONS = {
  bars: ic_bars,
  swords: ic_swords,
  cart: ic_cart,
  shield: ic_shield,
  coins: ic_coins,
  trophy: ic_trophy,
  lock: ic_lock,
  store: ic_store,
  bars2: ic_bars2,
  bag: ic_bag,
} as const;

export type GoalIconName = keyof typeof GOAL_ICONS;

/** Painted icon drawn at a fixed height; width follows the art's own shape. */
export function GoalIcon({ name, size, style }: { name: GoalIconName; size: number; style?: object }) {
  return (
    <Image
      source={GOAL_ICONS[name]}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityElementsHidden
    />
  );
}

function useWidth(initial = 360): [number, (e: LayoutChangeEvent) => void] {
  const [w, setW] = useState(initial);
  return [w, (e) => setW(e.nativeEvent.layout.width)];
}

// ---------------------------------------------------------------- card

const CARD_ART_W = 426; // the sent card, in 1x mockup pixels
const CARD_CAP = 28;

interface FrameProps {
  children: React.ReactNode;
  /** a faint gold wash for finished / highlighted cards */
  lit?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  gap?: number;
}

/** The dark copper-rimmed card of the Goals page, stretchable to any height:
 * painted top and bottom caps with a stretchy body; the content is drawn
 * inside. */
export function GoalFrame({ children, lit, style, contentStyle, gap = PANEL_GAP - 4 }: FrameProps) {
  const [w, onLayout] = useWidth();
  const cap = CARD_CAP * (w / CARD_ART_W);
  return (
    <View
      style={[{ alignSelf: "stretch", marginBottom: gap, minHeight: cap * 2 }, style]}
      onLayout={onLayout}
    >
      <View pointerEvents="none" style={[styles.layer, { top: 0, height: cap }]}>
        <Image source={cardTop} style={styles.fill} resizeMode="stretch" />
      </View>
      <View pointerEvents="none" style={[styles.layer, { top: cap - 1, bottom: cap - 1 }]}>
        <Image source={cardMid} style={styles.fill} resizeMode="stretch" />
      </View>
      <View pointerEvents="none" style={[styles.layer, { bottom: 0, height: cap }]}>
        <Image source={cardBot} style={styles.fill} resizeMode="stretch" />
      </View>
      {lit && (
        <View
          pointerEvents="none"
          style={[
            styles.lit,
            { borderRadius: Math.max(10, cap * 0.7), left: 4, right: 4, top: 4, bottom: 4 },
          ]}
        />
      )}
      <View
        style={[
          { paddingHorizontal: Math.max(12, cap * 0.55), paddingVertical: Math.max(8, cap * 0.4) },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

// -------------------------------------------------------------- ribbon

const RIB_ART_W = 428;
const RIB_ART_H = 52;
const RIB_CAP = 105;

/** The green plaque ribbon that heads each Goals section: laurel ends and
 * vines are painted, the title is drawn. */
export function GoalRibbon({ text }: { text: string }) {
  const [w, onLayout] = useWidth();
  const h = Math.min(44, w * (RIB_ART_H / RIB_ART_W));
  const k = h / RIB_ART_H;
  const cap = RIB_CAP * k;
  const textW = Math.max(60, w - cap * 2 + 14);
  const size = Math.max(8, Math.min(h * 0.38, (textW * 0.96) / (text.length * 0.85 + 1)));
  return (
    <View style={{ alignSelf: "stretch", height: h, marginTop: 2, marginBottom: 5 }} onLayout={onLayout}>
      <View style={{ flexDirection: "row", height: h }}>
        <Image source={ribL} style={{ width: cap, height: h }} resizeMode="stretch" />
        <Image source={ribM} style={{ flex: 1, height: h }} resizeMode="stretch" />
        <Image source={ribR} style={{ width: cap, height: h }} resizeMode="stretch" />
      </View>
      <View pointerEvents="none" style={styles.ribText}>
        <Text
          style={[styles.ribTitle, { fontSize: size, width: textW }]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

// ------------------------------------------------------------ progress

/** Cream bar on a recessed dark track, as in the mockup. */
export function GoalProgress({ pct, color = "#f1e2b8" }: { pct: number; color?: string }) {
  const p = Math.max(0, Math.min(1, pct));
  return (
    <View style={styles.track}>
      {p > 0 && <View style={[styles.trackFill, { width: `${p * 100}%`, backgroundColor: color }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  layer: { position: "absolute", left: 0, right: 0 },
  lit: { position: "absolute", backgroundColor: "rgba(232,199,119,0.10)" },
  ribText: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  ribTitle: {
    color: "#f6e2a0",
    fontFamily: FONT.display,
    textAlign: "center",
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,30,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#140c06",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.5)",
    overflow: "hidden",
  },
  trackFill: { height: "100%", borderRadius: 3 },
});
