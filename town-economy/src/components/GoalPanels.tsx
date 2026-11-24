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
import { FONT, PANEL_GAP } from "../theme";
import { SheetHeader } from "./SheetHeader";

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

/** A framed panel with its green plaque heading laid over the top edge, as the
 * Market mockup does: the heading is the game's own wheat-wreath beam, the
 * frame is the copper-rimmed dark card. */
export function GoalPanel({
  title,
  children,
  padX = 10,
  style,
}: {
  title: string;
  children: React.ReactNode;
  padX?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ alignSelf: "stretch", marginBottom: PANEL_GAP }, style]}>
      <View style={{ zIndex: 2, marginBottom: -26 }}>
        <SheetHeader text={title} />
      </View>
      <GoalFrame gap={0} contentStyle={{ paddingTop: 30, paddingHorizontal: padX }}>
        {children}
      </GoalFrame>
    </View>
  );
}

// -------------------------------------------------------------- ribbon

/** Section heading of the Goals page: the same plaque every other screen uses. */
export function GoalRibbon({ text }: { text: string }) {
  return (
    <View style={{ alignSelf: "stretch", marginTop: 2, marginBottom: 3, zIndex: 2 }}>
      <SheetHeader text={text} />
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
