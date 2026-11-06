import React, { useState } from "react";
import { Image, LayoutChangeEvent, StyleSheet, View } from "react-native";
import capL from "../../assets/ui/tradesheet/h_capL.png";
import capR from "../../assets/ui/tradesheet/h_capR.png";
import midL from "../../assets/ui/tradesheet/h_midL.png";
import midR from "../../assets/ui/tradesheet/h_midR.png";
import plL from "../../assets/ui/tradesheet/h_plL.png";
import plM from "../../assets/ui/tradesheet/h_plM.png";
import plR from "../../assets/ui/tradesheet/h_plR.png";
import { Text } from "./AppText";
import { FONT } from "../theme";

// Piece widths in the sent art's own pixels (the header strip is 80px tall).
const ART_H = 80;
const W = { capL: 154, midL: 28, plL: 83, plR: 99, midR: 20, capR: 155 };
// The vine-and-lantern ends are squeezed sideways a little so a long label still
// gets a plaque wide enough to read.
const CAP_SQUEEZE = 0.7;
const MIN_PLATE = 70;
const MIN_SQUEEZE = 0.38;

interface Props {
  text: string;
  /** rendered height of the header; defaults to 44 */
  height?: number;
}

/** A section heading: a carved beam with vines and lanterns at both ends and
 * a wheat-wreathed green plaque in the middle, built from the sent header art
 * as three stretchy parts (beam wood on each side, plaque fill in the middle)
 * so the plaque grows with its label and the beam fills the rest of the row.
 * The label's size is computed from its length, because phone fonts run wider
 * than a browser's and shrink-to-fit does not exist on web. */
export function SheetHeader({ text, height = 44 }: Props) {
  const [rowW, setRowW] = useState(360);
  const k = height / ART_H;
  const letter = 1;
  const textW = (size: number) => text.length * (size * 0.82 + letter);
  const plateFor = (size: number) => Math.max(MIN_PLATE * k, textW(size) + 14);
  // Everything but the caps and the plaque centre is fixed; the caps give way
  // first (down to MIN_SQUEEZE), then the label shrinks.
  const bodyW = (W.plL + W.plR) * k;
  const capsFull = (W.capL + W.capR) * k;
  const avail = rowW - bodyW - 2 * 6;
  let font = Math.round(height * 0.32);
  while (font > 8 && avail - plateFor(font) < capsFull * MIN_SQUEEZE) font -= 0.5;
  const plate = plateFor(font);
  const squeeze = Math.max(MIN_SQUEEZE, Math.min(CAP_SQUEEZE, (avail - plate) / capsFull));
  const onLayout = (e: LayoutChangeEvent) => setRowW(e.nativeEvent.layout.width);
  const img = (src: number, w: number) => ({
    source: src,
    style: { width: w * k, height },
    resizeMode: "stretch" as const,
  });

  return (
    <View style={[styles.row, { height }]} onLayout={onLayout}>
      <Image {...img(capL, W.capL * squeeze)} />
      <Image source={midL} style={[styles.mid, { height }]} resizeMode="stretch" />
      <Image {...img(plL, W.plL)} />
      <View style={{ width: plate, height }}>
        <Image source={plM} style={styles.fill} resizeMode="stretch" />
        <View style={styles.center} pointerEvents="none">
          <Text
            style={[styles.label, { fontSize: font, letterSpacing: letter }]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {text}
          </Text>
        </View>
      </View>
      <Image {...img(plR, W.plR)} />
      <Image source={midR} style={[styles.mid, { height }]} resizeMode="stretch" />
      <Image {...img(capR, W.capR * squeeze)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", width: "100%" },
  mid: { flex: 1, minWidth: 0 },
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
  label: { color: "#f6e2a0", fontFamily: FONT.display, textAlign: "center", marginTop: -2 },
});
