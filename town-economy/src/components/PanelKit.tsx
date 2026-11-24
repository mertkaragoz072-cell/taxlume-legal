import React, { useState } from "react";
import { Image, ImageSourcePropType, LayoutChangeEvent, StyleSheet, View } from "react-native";
import btnL from "../../assets/ui/town/btn_l.webp";
import btnM from "../../assets/ui/town/btn_m.webp";
import btnOffL from "../../assets/ui/town/btn_off_l.webp";
import btnOffM from "../../assets/ui/town/btn_off_m.webp";
import botB from "../../assets/ui/town/bot_b.webp";
import botC from "../../assets/ui/town/bot_c.webp";
import midB from "../../assets/ui/town/mid_b.webp";
import midC from "../../assets/ui/town/mid_c.webp";
import topC from "../../assets/ui/town/top_c.webp";
import topEv from "../../assets/ui/town/top_ev.webp";
import topProp from "../../assets/ui/town/top_prop.webp";
import topUp from "../../assets/ui/town/top_up.webp";
import { FONT, PANEL_GAP } from "../theme";
import { Text } from "./AppText";
import { ScalePressable } from "./ScalePressable";
import { SheetHeader } from "./SheetHeader";

// All art is 853 wide; positions below are in those pixels and scale with the
// rendered panel width.
const ART_W = 853;

interface Frame {
  top: ImageSourcePropType;
  topH: number;
  mid: ImageSourcePropType;
  bot: ImageSourcePropType;
  botH: number;
  /** where the banner's lettering goes, in art pixels */
  title: { x: number; y: number; w: number; h: number };
  /** inner padding of the parchment, from the frame's inside edge */
  inset: number;
}

const FRAMES = {
  upgrades: {
    top: topUp,
    topH: 57,
    mid: midB,
    bot: botB,
    botH: 30,
    title: { x: 94, y: 14, w: 280, h: 34 },
    inset: 38,
  },
  properties: {
    top: topProp,
    topH: 56,
    mid: midB,
    bot: botB,
    botH: 30,
    title: { x: 92, y: 12, w: 282, h: 34 },
    inset: 38,
  },
  events: {
    top: topEv,
    topH: 54,
    mid: midB,
    bot: botB,
    botH: 30,
    title: { x: 92, y: 10, w: 282, h: 34 },
    inset: 38,
  },
  wheat: {
    top: topC,
    topH: 70,
    mid: midC,
    bot: botC,
    botH: 37,
    title: { x: 108, y: 14, w: 266, h: 40 },
    inset: 36,
  },
} satisfies Record<string, Frame>;

export type FrameName = keyof typeof FRAMES;

function useBoxWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [w, setW] = useState(360);
  return [w, (e) => setW(e.nativeEvent.layout.width)];
}

/** Height of the heading plaque every panel wears. */
const HEAD_H = 36;

interface PanelProps {
  frame: FrameName;
  title: string;
  children: React.ReactNode;
  style?: { marginBottom?: number };
}

/** A painted parchment panel of any height: the frame's top edge, a stretchy
 * body and the bottom frame come from the sent Town art; the heading is the
 * game's own plaque (the one every other screen uses), laid over the painted
 * banner so every heading is the same size, straight and centred. */
export function StretchPanel({ frame, title, children, style }: PanelProps) {
  const f: Frame = FRAMES[frame];
  const [w, onLayout] = useBoxWidth();
  const s = w / ART_W;
  const topH = f.topH * s;
  return (
    <View style={[{ alignSelf: "stretch", marginBottom: PANEL_GAP }, style]} onLayout={onLayout}>
      <View style={{ width: "100%", height: topH }}>
        <Image source={f.top} style={styles.fill} resizeMode="stretch" />
      </View>
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, zIndex: 2 }}>
        <SheetHeader text={title} height={HEAD_H} />
      </View>
      <View>
        <Image source={f.mid} style={styles.fill} resizeMode="stretch" />
        <View
          style={{
            paddingHorizontal: f.inset * s,
            paddingTop: Math.max(2, HEAD_H - topH + 4),
          }}
        >
          {children}
        </View>
      </View>
      <View style={{ width: "100%", height: f.botH * s }}>
        <Image source={f.bot} style={styles.fill} resizeMode="stretch" />
      </View>
    </View>
  );
}

interface GoldButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** rendered height in px */
  height?: number;
  accessibilityLabel?: string;
}

const CAP = 26;
const BTN_H = 60;

/** The sent gold button, stretched to its label: painted end caps and a
 * stretchy middle, so it is as wide as the words need. */
export function GoldButton({ label, onPress, disabled, height = 34, accessibilityLabel }: GoldButtonProps) {
  const k = height / BTN_H;
  const size = Math.round(height * 0.4);
  // emoji coins render as the silver coin image, ~1em wide
  const textW = label.length * (size * 0.56) + 2;
  const width = Math.max(64, CAP * 2 * k + textW + 6);
  const L = disabled ? btnOffL : btnL;
  const M = disabled ? btnOffM : btnM;
  return (
    <ScalePressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? label}
      scaleTo={0.95}
      style={{ width, height }}
    >
      <View style={{ flexDirection: "row", width, height }}>
        <Image source={L} style={{ width: CAP * k, height }} resizeMode="stretch" />
        <Image source={M} style={{ flex: 1, height }} resizeMode="stretch" />
        <Image
          source={L}
          style={{ width: CAP * k, height, transform: [{ scaleX: -1 }] }}
          resizeMode="stretch"
        />
      </View>
      <View pointerEvents="none" style={styles.btnLabel}>
        <Text style={[styles.btnText, { fontSize: size, opacity: disabled ? 0.6 : 1 }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  btnLabel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#4a2a0e", fontFamily: FONT.black, textAlign: "center" },
});
