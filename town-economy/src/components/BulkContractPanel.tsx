import React, { useState } from "react";
import { Image, LayoutChangeEvent, StyleSheet, View } from "react-native";
import panelArt from "../../assets/ui/contract/bulk.webp";
import { FONT, PANEL_GAP } from "../theme";
import { Text } from "./AppText";
import { ScalePressable } from "./ScalePressable";

// The sent wholesale panel, trimmed to 1107 x 765: three quantity slots, three
// term slots, a few note lines and the open button. Its painted selections and
// coin were cleared; the live state is drawn over it. Fields are in those pixels.
const ART_W = 1107;
const ART_H = 765;
const QTY = { y: 40, h: 107, xs: [39, 395, 747], ws: [311, 314, 319] };
const TERM = { y: 241, h: 106, xs: [39, 394, 747], ws: [315, 315, 318] };
const LABEL = { x: 39, y: 160, w: 700, h: 56 };
const NOTE_Y = [372, 432, 492];
const NOTE = { x: 39, w: 1030, h: 56 };
const OPEN = { x: 39, y: 601, w: 1028, h: 123 };

const SOFT = "#bfae8c";

function fit(text: string, boxW: number, max: number, em: number): number {
  return Math.min(max, (boxW * 0.96) / (Math.max(1, text.length) * em));
}

interface Choice {
  key: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}

interface Props {
  qty: Choice[];
  termLabel: string;
  terms: Choice[];
  accent: string;
  payout: string;
  /** shown only while the town lacks the stock */
  warning?: string;
  maxNote: string;
  openLabel: string;
  openDisabled: boolean;
  onOpen: () => void;
}

/** "Toptan Sözleşmeler": reserve stock now for a guaranteed premium price. */
export function BulkContractPanel(p: Props) {
  const [w, setW] = useState(360);
  const s = w / ART_W;
  const box = (b: { x: number; y: number; w: number; h: number }) => ({
    position: "absolute" as const,
    left: b.x * s,
    top: b.y * s,
    width: b.w * s,
    height: b.h * s,
  });
  const slot = (c: Choice, x: number, y: number, bw: number, bh: number, size: number) => (
    <ScalePressable
      key={c.key}
      onPress={c.onPress}
      accessibilityLabel={c.label}
      style={[
        box({ x, y, w: bw, h: bh }),
        styles.center,
        c.selected && { borderWidth: Math.max(2, 8 * s), borderColor: p.accent, borderRadius: 40 * s },
      ]}
      scaleTo={0.96}
    >
      <Text style={[styles.slot, { fontSize: fit(c.label, bw - 24, size, 0.6) * s }]} numberOfLines={1}>
        {c.label}
      </Text>
    </ScalePressable>
  );
  const notes = [
    { text: p.payout, style: styles.note, max: 42 },
    ...(p.warning ? [{ text: p.warning, style: styles.warn, max: 36 }] : []),
    { text: p.maxNote, style: styles.note2, max: 36 },
  ];

  return (
    <View
      style={{ aspectRatio: ART_W / ART_H, alignSelf: "stretch", marginBottom: PANEL_GAP }}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
    >
      <Image source={panelArt} style={styles.fill} resizeMode="stretch" />
      {p.qty.map((c, i) => slot(c, QTY.xs[i], QTY.y, QTY.ws[i], QTY.h, 50))}
      <View style={[box(LABEL), { justifyContent: "center" }]} pointerEvents="none">
        <Text style={[styles.label, { fontSize: fit(p.termLabel, LABEL.w, 40, 0.56) * s }]} numberOfLines={1}>
          {p.termLabel}
        </Text>
      </View>
      {p.terms.map((c, i) => slot(c, TERM.xs[i], TERM.y, TERM.ws[i], TERM.h, 46))}
      {notes.map((n, i) => (
        <View
          key={i}
          style={[box({ x: NOTE.x, y: NOTE_Y[i], w: NOTE.w, h: NOTE.h }), { justifyContent: "center" }]}
          pointerEvents="none"
        >
          <Text style={[n.style, { fontSize: fit(n.text, NOTE.w, n.max, 0.54) * s }]} numberOfLines={1}>
            {n.text}
          </Text>
        </View>
      ))}
      <ScalePressable
        disabled={p.openDisabled}
        onPress={p.onOpen}
        accessibilityLabel={p.openLabel}
        style={[box(OPEN), { opacity: p.openDisabled ? 0.4 : 1 }]}
        scaleTo={0.97}
      >
        <View style={styles.center}>
          <Text style={[styles.open, { fontSize: fit(p.openLabel, OPEN.w, 60, 0.62) * s }]} numberOfLines={1}>
            {p.openLabel}
          </Text>
        </View>
      </ScalePressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  slot: { color: "#e8dcc0", fontFamily: FONT.bold },
  label: { color: SOFT, fontFamily: FONT.bold },
  note: { color: SOFT, fontFamily: FONT.medium },
  note2: { color: SOFT, fontFamily: FONT.medium },
  warn: { color: "#f08a7e", fontFamily: FONT.medium },
  open: { color: "#fff", fontFamily: FONT.black, textAlign: "center" },
});
