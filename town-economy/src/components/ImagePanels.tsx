import React, { useState } from "react";
import { Image, ImageSourcePropType, LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Text } from "./AppText";
import headerImg from "../../assets/ui/inventory/header.png";
import ribbonImg from "../../assets/ui/inventory/ribbon.png";
import { FONT } from "../theme";

/** Width of the nearest laid-out box, so type and positions inside a
 * fixed-aspect painted panel scale with it. */
function useBoxWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [w, setW] = useState(360);
  return [w, (e) => setW(e.nativeEvent.layout.width)];
}

const GOLD_TEXT = "#f3d27a";

/** The carved beam with the green plaque (vines, lamps and the plaque's
 * gold rim are all in the art); only the title is drawn. */
export function BeamTitle({ title }: { title: string }) {
  const [w, onLayout] = useBoxWidth();
  return (
    <View style={styles.beam} onLayout={onLayout}>
      <Image source={headerImg} style={styles.fill} resizeMode="stretch" />
      <Text
        style={[styles.beamText, { fontSize: Math.round(w * 0.05) }]}
        numberOfLines={1}
        accessibilityRole="header"
      >
        {title}
      </Text>
    </View>
  );
}

/** The green section ribbon with its vines, sized to a share of the row. */
export function AssetRibbon({ text, widthPct = 62 }: { text: string; widthPct?: number }) {
  const [w, onLayout] = useBoxWidth();
  return (
    <View style={styles.ribbonRow} onLayout={onLayout}>
      <View style={[styles.ribbon, { width: `${widthPct}%` }]}>
        <Image source={ribbonImg} style={styles.fill} resizeMode="stretch" />
        <Text
          style={[styles.ribbonText, { fontSize: Math.round(w * (widthPct / 100) * 0.056) }]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

interface FixedPanelProps {
  source: ImageSourcePropType;
  /** source image width / height; the panel keeps this shape at any width */
  aspect: number;
  children: (width: number) => React.ReactNode;
  style?: { marginBottom?: number; marginTop?: number };
}

/** A painted frame drawn at its own aspect ratio, with children laid out
 * absolutely over it (they get the panel's width to size their type). */
export function FixedPanel({ source, aspect, children, style }: FixedPanelProps) {
  const [w, onLayout] = useBoxWidth();
  return (
    <View style={[{ aspectRatio: aspect }, style]} onLayout={onLayout}>
      <Image source={source} style={styles.fill} resizeMode="stretch" />
      {children(w)}
    </View>
  );
}

const styles = StyleSheet.create({
  // Explicit 100% too: on web an absolutely-positioned Image otherwise
  // falls back to its natural pixel size.
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  beam: { aspectRatio: 1310 / 135, justifyContent: "center", alignItems: "center", zIndex: 2 },
  beamText: {
    fontFamily: FONT.display,
    color: GOLD_TEXT,
    letterSpacing: 2,
    textShadowColor: "rgba(20,10,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginTop: -2,
  },
  ribbonRow: { flexDirection: "row", marginTop: 6, marginBottom: 2 },
  ribbon: { aspectRatio: 719 / 131, justifyContent: "center", paddingLeft: "19%", paddingRight: "9%" },
  ribbonText: {
    fontFamily: FONT.bold,
    color: GOLD_TEXT,
    letterSpacing: 1,
    textAlign: "center",
    marginTop: -2,
  },
});
