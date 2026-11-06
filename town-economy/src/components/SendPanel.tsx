import React, { useState } from "react";
import { Image, LayoutChangeEvent, StyleSheet, View } from "react-native";
import btnBlue from "../../assets/ui/send/btn_blue.webp";
import panelArt from "../../assets/ui/send/panel.webp";
import { FONT, PANEL_GAP } from "../theme";
import { Text } from "./AppText";
import { ScalePressable } from "./ScalePressable";
import { SpotlightTarget } from "./Spotlight";

// The sent caravan-send panel, trimmed to 1456 x 1046: a toggle bar, three
// quantity slots, a summary and arrival line, an insurance box and the big
// send button. Its painted selections/icons were cleared so the live state can
// be drawn in the same colours. Fields are in those pixels.
const ART_W = 1456;
const ART_H = 1046;
const BAR = { x: 54, y: 55, w: 1349, h: 146 };
const PILL = { y: 65, h: 121, w: 663 };
const QTY_X = [54, 513, 975];
const QTY = { y: 236, w: 400, h: 143 };
const SUMMARY = { x: 66, y: 410, w: 880, h: 100 };
const TOTAL = { x: 940, y: 410, w: 440, h: 100 };
const ETA = { x: 66, y: 512, w: 1300, h: 70 };
const BOX = { x: 54, y: 597, w: 1349, h: 202 };
const SEND = { x: 54, y: 832, w: 1349, h: 161 };

const CREAM = "#e8dcc0";
const SOFT = "#bfae8c";

function fit(text: string, boxW: number, max: number, em: number): number {
  return Math.min(max, (boxW * 0.96) / (Math.max(1, text.length) * em));
}

interface Props {
  direction: "export" | "import";
  onDirection: (d: "export" | "import") => void;
  exportLabel: string;
  importLabel: string;
  qtyOptions: { key: string; label: string; selected: boolean; onPress: () => void }[];
  /** the selected quantity's outline colour (the good's colour) */
  accent: string;
  summary: string;
  total: string;
  eta: string;
  insuranceLabel: string;
  insuranceHint: string;
  insured: boolean;
  onToggleInsurance: () => void;
  sendLabel: string;
  sendDisabled: boolean;
  onSend: () => void;
}

export function SendPanel(p: Props) {
  const [w, setW] = useState(360);
  const s = w / ART_W;
  const box = (b: { x: number; y: number; w: number; h: number }) => ({
    position: "absolute" as const,
    left: b.x * s,
    top: b.y * s,
    width: b.w * s,
    height: b.h * s,
  });
  const exp = p.direction === "export";
  const pillX = exp ? BAR.x + 11 : BAR.x + BAR.w - 11 - PILL.w;
  const pillColor = exp ? "#43b878" : "#3f86d8";

  return (
    <View
      style={{ aspectRatio: ART_W / ART_H, alignSelf: "stretch", marginBottom: PANEL_GAP }}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
    >
      <Image source={panelArt} style={styles.fill} resizeMode="stretch" />

      <SpotlightTarget id="caravanDirection" style={box(BAR)}>
        <View style={{ flex: 1 }}>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: (pillX - BAR.x) * s,
              top: (PILL.y - BAR.y) * s,
              width: PILL.w * s,
              height: PILL.h * s,
              borderRadius: 38 * s,
              backgroundColor: pillColor,
            }}
          />
          <View style={{ flex: 1, flexDirection: "row" }}>
            {(
              [
                ["export", p.exportLabel],
                ["import", p.importLabel],
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
                    { fontSize: fit(label, 560, 54, 0.62) * s },
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
      </SpotlightTarget>

      {p.qtyOptions.map((q, i) => (
        <ScalePressable
          key={q.key}
          onPress={q.onPress}
          accessibilityLabel={q.label}
          style={[
            box({ x: QTY_X[i], y: QTY.y, w: QTY.w, h: QTY.h }),
            styles.center,
            q.selected && { borderWidth: Math.max(2, 8 * s), borderColor: p.accent, borderRadius: 42 * s },
          ]}
          scaleTo={0.96}
        >
          <Text style={[styles.qty, { fontSize: 50 * s }]}>{q.label}</Text>
        </ScalePressable>
      ))}

      <View style={[box(SUMMARY), { justifyContent: "center" }]} pointerEvents="none">
        <Text
          style={[
            styles.summary,
            {
              fontSize: fit(p.summary, SUMMARY.w * 1.6, 38, 0.52) * s,
              lineHeight: fit(p.summary, SUMMARY.w * 1.6, 38, 0.52) * s * 1.2,
            },
          ]}
          numberOfLines={2}
        >
          {p.summary}
        </Text>
      </View>
      <View style={[box(TOTAL), { justifyContent: "center", alignItems: "flex-end" }]} pointerEvents="none">
        <Text style={[styles.total, { fontSize: fit(p.total, TOTAL.w, 52, 0.62) * s }]} numberOfLines={1}>
          {p.total}
        </Text>
      </View>
      <View style={[box(ETA), { justifyContent: "center" }]} pointerEvents="none">
        <Text
          style={[
            styles.eta,
            {
              fontSize: fit(p.eta, ETA.w * 1.6, 34, 0.5) * s,
              lineHeight: fit(p.eta, ETA.w * 1.6, 34, 0.5) * s * 1.2,
            },
          ]}
          numberOfLines={2}
        >
          {p.eta}
        </Text>
      </View>

      <ScalePressable
        onPress={p.onToggleInsurance}
        accessibilityLabel={p.insuranceLabel}
        style={[
          box(BOX),
          { borderRadius: 60 * s, paddingHorizontal: 56 * s, justifyContent: "center" },
          p.insured && { borderWidth: Math.max(2, 6 * s), borderColor: "#e1c58c" },
        ]}
        scaleTo={0.98}
      >
        <Text
          style={[styles.insLabel, { fontSize: fit(p.insuranceLabel, BOX.w - 112, 44, 0.6) * s }]}
          numberOfLines={1}
        >
          {p.insuranceLabel}
        </Text>
        <Text
          style={[
            styles.insHint,
            {
              fontSize: fit(p.insuranceHint, (BOX.w - 112) * 1.7, 34, 0.5) * s,
              lineHeight: fit(p.insuranceHint, (BOX.w - 112) * 1.7, 34, 0.5) * s * 1.2,
            },
          ]}
          numberOfLines={2}
        >
          {p.insuranceHint}
        </Text>
      </ScalePressable>

      <SpotlightTarget id="caravanSend" style={box(SEND)}>
        <ScalePressable
          disabled={p.sendDisabled}
          onPress={p.onSend}
          accessibilityLabel={p.sendLabel}
          style={{ flex: 1, opacity: p.sendDisabled ? 0.4 : 1 }}
          scaleTo={0.97}
        >
          <View style={{ flex: 1, borderRadius: 80 * s, overflow: "hidden" }}>
            {!exp && (
              <Image
                source={btnBlue}
                style={{
                  position: "absolute",
                  left: -16 * s,
                  top: -6 * s,
                  width: (SEND.w + 32) * s,
                  height: (SEND.h + 12) * s,
                }}
                resizeMode="stretch"
              />
            )}
            <View style={styles.center}>
              <Text
                style={[styles.send, { fontSize: fit(p.sendLabel, SEND.w, 62, 0.62) * s }]}
                numberOfLines={1}
              >
                {p.sendLabel}
              </Text>
            </View>
          </View>
        </ScalePressable>
      </SpotlightTarget>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  toggle: { color: "#fff", fontFamily: FONT.bold },
  qty: { color: CREAM, fontFamily: FONT.bold },
  summary: { color: SOFT, fontFamily: FONT.medium },
  total: { color: "#6fe08f", fontFamily: FONT.black },
  eta: { color: SOFT, fontFamily: FONT.medium },
  insLabel: { color: CREAM, fontFamily: FONT.bold },
  insHint: { color: SOFT, fontFamily: FONT.medium, marginTop: 2 },
  send: { color: "#fff", fontFamily: FONT.black, textAlign: "center" },
});
