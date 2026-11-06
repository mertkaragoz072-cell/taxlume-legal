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
    title: { x: 96, y: 14, w: 326, h: 34 },
    inset: 38,
  },
  properties: {
    top: topProp,
    topH: 56,
    mid: midB,
    bot: botB,
    botH: 30,
    title: { x: 92, y: 12, w: 186, h: 34 },
    inset: 38,
  },
  events: {
    top: topEv,
    topH: 54,
    mid: midB,
    bot: botB,
    botH: 30,
    title: { x: 92, y: 10, w: 206, h: 34 },
    inset: 38,
  },
  wheat: {
    top: topC,
    topH: 70,
    mid: midC,
    bot: botC,
    botH: 37,
    title: { x: 118, y: 14, w: 262, h: 40 },
    inset: 36,
  },
} satisfies Record<string, Frame>;

export type FrameName = keyof typeof FRAMES;

function useBoxWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [w, setW] = useState(360);
  return [w, (e) => setW(e.nativeEvent.layout.width)];
}

/** The lettering for a banner: sized from its length so it stays on the
 * ribbon on any phone font. */
export function bannerFontSize(text: string, boxW: number, boxH: number): number {
  return Math.max(8, Math.min(boxH * 0.5, (boxW * 0.94) / (text.length * 0.7 + 1)));
}

interface PanelProps {
  frame: FrameName;
  title: string;
  children: React.ReactNode;
  /** extra content laid on the top slice (e.g. the events filter counts) */
  topOverlay?: (w: number) => React.ReactNode;
  style?: { marginBottom?: number };
}

/** A painted parchment panel of any height: the banner/top frame, a stretchy
 * body and the bottom frame come from the sent Town art; the content is drawn
 * inside. */
export function StretchPanel({ frame, title, children, topOverlay, style }: PanelProps) {
  const f: Frame = FRAMES[frame];
  const [w, onLayout] = useBoxWidth();
  const s = w / ART_W;
  const size = bannerFontSize(title, f.title.w * s, f.title.h * s);
  return (
    <View style={[{ alignSelf: "stretch", marginBottom: PANEL_GAP }, style]} onLayout={onLayout}>
      <View style={{ width: "100%", height: f.topH * s }}>
        <Image source={f.top} style={styles.fill} resizeMode="stretch" />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: f.title.x * s,
            top: f.title.y * s,
            width: f.title.w * s,
            height: f.title.h * s,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={[styles.bannerText, { fontSize: size }]} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        </View>
        {topOverlay?.(w)}
      </View>
      <View>
        <Image source={f.mid} style={styles.fill} resizeMode="stretch" />
        <View style={{ paddingHorizontal: f.inset * s, paddingTop: 2 }}>{children}</View>
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
  bannerText: { color: "#f6e2a0", fontFamily: FONT.display, textAlign: "center", letterSpacing: 1 },
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
