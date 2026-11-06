import React from "react";
import { Image, Modal, StyleSheet, useWindowDimensions, View } from "react-native";
import sheetArt from "../../assets/ui/decision/sheet.webp";
import { Text } from "./AppText";
import { useEconomyContext } from "../economy/EconomyContext";
import { DECISION_TEMPLATES_BY_ID } from "../economy/decisions";
import { PendingDecision } from "../economy/types";
import { FONT } from "../theme";
import { ModalBackdrop } from "./ModalBackdrop";
import { ScalePressable } from "./ScalePressable";

// The sent decision card, trimmed to 976 x 1164: a gold-framed leather sheet
// with an empty round plaque on top (the event's icon goes in it) and two
// option slots below. Fields are in those pixels (origin = the trim).
const ART_W = 976;
const ART_H = 1164;
const PLAQUE = { cx: 487, cy: 250, d: 220 };
const TITLE = { x: 90, y: 400, w: 796, h: 80 };
const DESC = { x: 90, y: 490, w: 796, h: 150 };
const OPTION_TOPS = [640, 850];
const OPTION = { x: 70, w: 836, h: 176 };

const GOLD = "#f6e2a0";

function fit(text: string, boxW: number, max: number, em: number): number {
  return Math.min(max, (boxW * 0.96) / (Math.max(1, text.length) * em));
}

function blockSize(text: string, boxW: number, boxH: number, max: number, min: number, lh = 1.22): number {
  let size = max;
  while (size > min && Math.ceil((text.length * 0.52 * size) / boxW) * size * lh > boxH) size -= 0.5;
  return size;
}

interface Props {
  decision: PendingDecision | null;
  onResolve: (optionId: string) => void;
}

export function DecisionModal({ decision, onResolve }: Props) {
  const { t } = useEconomyContext();
  const { width: winW, height: winH } = useWindowDimensions();
  if (!decision) return null;
  const template = DECISION_TEMPLATES_BY_ID[decision.templateId];
  if (!template) return null;

  const w = Math.min(winW - 32, 360, ((winH - 40) * ART_W) / ART_H);
  const s = w / ART_W;
  const box = (x: number, y: number, bw: number, bh: number) => ({
    position: "absolute" as const,
    left: x * s,
    top: y * s,
    width: bw * s,
    height: bh * s,
  });
  const title = t(template.titleKey);
  const desc = t(template.descriptionKey);
  const descSize = blockSize(desc, DESC.w, DESC.h, 40, 26) * s;

  return (
    <Modal visible transparent animationType="fade">
      <ModalBackdrop>
        <View style={{ width: w, height: w * (ART_H / ART_W) }}>
          <Image source={sheetArt} style={styles.fill} resizeMode="stretch" />

          <View
            style={[
              box(PLAQUE.cx - PLAQUE.d / 2, PLAQUE.cy - PLAQUE.d / 2, PLAQUE.d, PLAQUE.d),
              styles.center,
            ]}
            pointerEvents="none"
          >
            <Text aria-hidden style={{ fontSize: PLAQUE.d * 0.5 * s }}>
              {template.icon}
            </Text>
          </View>

          <View style={[box(TITLE.x, TITLE.y, TITLE.w, TITLE.h), styles.center]} pointerEvents="none">
            <Text
              style={[
                styles.title,
                { fontSize: Math.min(TITLE.h * 0.62, fit(title, TITLE.w, 56, 0.78)) * s },
              ]}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {title}
            </Text>
          </View>
          <View style={[box(DESC.x, DESC.y, DESC.w, DESC.h), styles.center]} pointerEvents="none">
            <Text style={[styles.desc, { fontSize: descSize, lineHeight: descSize * 1.22 }]}>{desc}</Text>
          </View>

          {template.options.map((option, i) => {
            const label = t(option.labelKey);
            const hint = t(option.hintKey);
            const textW = OPTION.w - 80;
            return (
              <ScalePressable
                key={option.id}
                onPress={() => onResolve(option.id)}
                accessibilityLabel={label}
                style={box(OPTION.x, OPTION_TOPS[i], OPTION.w, OPTION.h)}
                scaleTo={0.97}
              >
                <View style={[styles.optionBody, { paddingHorizontal: 40 * s }]}>
                  <Text
                    style={[styles.label, { fontSize: fit(label, textW, 44, 0.66) * s }]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                  <Text
                    style={[
                      styles.hint,
                      {
                        fontSize: blockSize(hint, textW, 80, 32, 22) * s,
                        lineHeight: blockSize(hint, textW, 80, 32, 22) * s * 1.2,
                      },
                    ]}
                  >
                    {hint}
                  </Text>
                </View>
              </ScalePressable>
            );
          })}
        </View>
      </ModalBackdrop>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  center: { alignItems: "center", justifyContent: "center" },
  title: { color: GOLD, fontFamily: FONT.display, textAlign: "center", letterSpacing: 1 },
  desc: { color: "#d9c9a2", fontFamily: FONT.medium, textAlign: "center" },
  optionBody: { flex: 1, justifyContent: "center" },
  label: { color: "#f6ecd0", fontFamily: FONT.bold },
  hint: { color: "#cdbb94", fontFamily: FONT.medium, marginTop: 4 },
});
