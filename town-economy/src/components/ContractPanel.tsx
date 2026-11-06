import React, { useState } from "react";
import { Image, LayoutChangeEvent, StyleSheet, View } from "react-native";
import btnBlue from "../../assets/ui/contract/btn_blue.webp";
import panelArt from "../../assets/ui/contract/panel.webp";
import { FONT, PANEL_GAP } from "../theme";
import { Text } from "./AppText";
import { ScalePressable } from "./ScalePressable";

// The sent futures panel, trimmed to 1186 x 836: a rise/fall toggle bar, a row of
// three quantity slots, a row of four term slots, two note lines and the open
// button. Its painted selections and icons were cleared; the live state is drawn
// over it. Fields are in those pixels.
const ART_W = 1186;
const ART_H = 836;
const BAR = { x: 42, y: 42, w: 1102, h: 123 };
const PILL = { y: 50, w: 541, h: 104 };
const QTY_ROW = { y: 192, h: 114, xs: [44, 414, 790], ws: [333, 333, 346] };
const TERM_LABEL = { x: 44, y: 322, w: 700, h: 56 };
const TERM_ROW = { y: 392, h: 115, xs: [59, 335, 615, 894], ws: [237, 237, 237, 242] };
const NOTE1 = { x: 44, y: 528, w: 1098, h: 62 };
const NOTE2 = { x: 44, y: 594, w: 1098, h: 56 };
const OPEN = { x: 42, y: 659, w: 1102, h: 129 };

const CREAM = "#e8dcc0";
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
  direction: "long" | "short";
  onDirection: (d: "long" | "short") => void;
  longLabel: string;
  shortLabel: string;
  qty: Choice[];
  termLabel: string;
  terms: Choice[];
  /** outline colour of the selected slots (the good's colour) */
  accent: string;
  note: string;
  maxNote: string;
  openLabel: string;
  openDisabled: boolean;
  onOpen: () => void;
}

/** "Vadeli İşlemler": bet on a good's price rising or falling over a term. */
export function ContractPanel(p: Props) {
  const [w, setW] = useState(360);
  const s = w / ART_W;
  const box = (b: { x: number; y: number; w: number; h: number }) => ({
    position: "absolute" as const,
    left: b.x * s,
    top: b.y * s,
    width: b.w * s,
    height: b.h * s,
  });
  const long = p.direction === "long";
  const pillX = long ? BAR.x + 10 : BAR.x + BAR.w - 10 - PILL.w;

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

  return (
    <View
      style={{ aspectRatio: ART_W / ART_H, alignSelf: "stretch", marginBottom: PANEL_GAP }}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
    >
      <Image source={panelArt} style={styles.fill} resizeMode="stretch" />

      <View style={box(BAR)}>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: (pillX - BAR.x) * s,
            top: (PILL.y - BAR.y) * s,
            width: PILL.w * s,
            height: PILL.h * s,
            borderRadius: 40 * s,
            backgroundColor: long ? "#4fbd70" : "#3f86d8",
          }}
        />
        <View style={{ flex: 1, flexDirection: "row" }}>
          {(
            [
              ["long", p.longLabel],
              ["short", p.shortLabel],
            ] as const
          ).map(([d, label]) => (
            <ScalePressable
              key={d}
              onPress={() => p.onDirection(d)}
              accessibilityLabel={label}
              style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
              scaleTo={0.98}
            >
              <Text
                style={[
                  styles.toggle,
                  { fontSize: fit(label, 500, 52, 0.62) * s },
                  p.direction !== d && { color: SOFT },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </ScalePressable>
          ))}
        </View>
      </View>

      {p.qty.map((c, i) => slot(c, QTY_ROW.xs[i], QTY_ROW.y, QTY_ROW.ws[i], QTY_ROW.h, 50))}

      <View style={[box(TERM_LABEL), { justifyContent: "center" }]} pointerEvents="none">
        <Text
          style={[styles.label, { fontSize: fit(p.termLabel, TERM_LABEL.w, 40, 0.56) * s }]}
          numberOfLines={1}
        >
          {p.termLabel}
        </Text>
      </View>
      {p.terms.map((c, i) => slot(c, TERM_ROW.xs[i], TERM_ROW.y, TERM_ROW.ws[i], TERM_ROW.h, 46))}

      <View style={[box(NOTE1), { justifyContent: "center" }]} pointerEvents="none">
        <Text style={[styles.note, { fontSize: fit(p.note, NOTE1.w, 42, 0.56) * s }]} numberOfLines={1}>
          {p.note}
        </Text>
      </View>
      <View style={[box(NOTE2), { justifyContent: "center" }]} pointerEvents="none">
        <Text style={[styles.note2, { fontSize: fit(p.maxNote, NOTE2.w, 36, 0.52) * s }]} numberOfLines={1}>
          {p.maxNote}
        </Text>
      </View>

      <ScalePressable
        disabled={p.openDisabled}
        onPress={p.onOpen}
        accessibilityLabel={p.openLabel}
        style={[box(OPEN), { opacity: p.openDisabled ? 0.4 : 1 }]}
        scaleTo={0.97}
      >
        <View style={{ flex: 1, borderRadius: 70 * s, overflow: "hidden" }}>
          {!long && (
            <Image
              source={btnBlue}
              style={{
                position: "absolute",
                left: -8 * s,
                top: -8 * s,
                width: (OPEN.w + 16) * s,
                height: (OPEN.h + 16) * s,
              }}
              resizeMode="stretch"
            />
          )}
          <View style={styles.center}>
            <Text
              style={[styles.open, { fontSize: fit(p.openLabel, OPEN.w, 60, 0.62) * s }]}
              numberOfLines={1}
            >
              {p.openLabel}
            </Text>
          </View>
        </View>
      </ScalePressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  toggle: { color: "#fff", fontFamily: FONT.bold },
  slot: { color: CREAM, fontFamily: FONT.bold },
  label: { color: SOFT, fontFamily: FONT.bold },
  note: { color: SOFT, fontFamily: FONT.medium },
  note2: { color: SOFT, fontFamily: FONT.medium },
  open: { color: "#fff", fontFamily: FONT.black, textAlign: "center" },
});
