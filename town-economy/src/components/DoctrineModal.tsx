import React, { useEffect, useState } from "react";
import { Image, Modal, StyleSheet, useWindowDimensions, View } from "react-native";
import sheetArt from "../../assets/ui/doctrinemodal/sheet.webp";
import { Text } from "./AppText";
import { DOCTRINES } from "../economy/doctrines";
import { useEconomyContext } from "../economy/EconomyContext";
import { FONT } from "../theme";
import { ModalBackdrop } from "./ModalBackdrop";
import { ScalePressable } from "./ScalePressable";

// The sent picker is a gold-framed leather sheet, trimmed to 801 x 1314: three
// option cards (each with its painted icon), a big gold confirm button and a
// smaller brown "later" button. Every field is in those pixels.
const ART_W = 801;
const ART_H = 1314;
const TITLE = { x: 95, y: 70, w: 610, h: 70 };
const SUBTITLE = { x: 90, y: 146, w: 620, h: 84 };
const CARD_X = 42;
const CARD_W = 716;
const CARD_H = 233;
const CARD_TOPS = [244, 499, 753];
const CONFIRM = { x: 48, y: 1032, w: 705, h: 97 };
const LATER = { x: 185, y: 1157, w: 430, h: 75 };

const GOLD = "#f6e2a0";
const CREAM = "#e9d9b0";

function fit(text: string, boxW: number, max: number, em: number): number {
  return Math.min(max, (boxW * 0.96) / (Math.max(1, text.length) * em));
}

function blockSize(text: string, boxW: number, boxH: number, max: number, min: number, lh = 1.2): number {
  let size = max;
  while (size > min && Math.ceil((text.length * 0.52 * size) / boxW) * size * lh > boxH) size -= 0.5;
  return size;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** The one-way choice of what kind of town this is.
 *
 * Two steps, like the difficulty picker: tapping a doctrine only selects it,
 * and a separate confirm commits. It holds for the rest of the run, so a
 * mis-tap must not be able to decide it. */
export function DoctrineModal({ visible, onClose }: Props) {
  const { t, chooseDoctrine } = useEconomyContext();
  const { width: winW, height: winH } = useWindowDimensions();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) setPending(null);
  }, [visible]);

  if (!visible) return null;

  const confirm = () => {
    if (!pending) return;
    chooseDoctrine(pending);
    onClose();
  };

  const w = Math.min(winW - 24, 390, ((winH - 40) * ART_W) / ART_H);
  const s = w / ART_W;
  const box = (x: number, y: number, bw: number, bh: number) => ({
    position: "absolute" as const,
    left: x * s,
    top: y * s,
    width: bw * s,
    height: bh * s,
  });
  const title = t("doctrine.title");
  const subtitle = t("doctrine.subtitle");
  const confirmLabel = pending ? t("doctrine.confirmBtn") : t("doctrine.pickPrompt");
  const laterLabel = t("doctrine.laterBtn");

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <ModalBackdrop>
        <View style={{ width: w, height: (w * ART_H) / ART_W }}>
          <Image source={sheetArt} style={styles.fill} resizeMode="stretch" />

          <View style={[box(TITLE.x, TITLE.y, TITLE.w, TITLE.h), styles.center]} pointerEvents="none">
            <Text
              style={[
                styles.title,
                { fontSize: Math.min(TITLE.h * 0.62, fit(title, TITLE.w, 60, 0.86)) * s },
              ]}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {title}
            </Text>
          </View>
          <View
            style={[box(SUBTITLE.x, SUBTITLE.y, SUBTITLE.w, SUBTITLE.h), styles.center]}
            pointerEvents="none"
          >
            <Text
              style={[
                styles.subtitle,
                {
                  fontSize: blockSize(subtitle, SUBTITLE.w, SUBTITLE.h, 30, 22) * s,
                  lineHeight: blockSize(subtitle, SUBTITLE.w, SUBTITLE.h, 30, 22) * s * 1.2,
                },
              ]}
            >
              {subtitle}
            </Text>
          </View>

          {DOCTRINES.slice(0, CARD_TOPS.length).map((d, i) => {
            const top = CARD_TOPS[i];
            const selected = pending === d.id;
            const name = t(d.nameKey);
            const desc = t(d.descriptionKey);
            const bonus = `+ ${t(d.bonusKey)}`;
            const penalty = `− ${t(d.penaltyKey)}`;
            const textX = CARD_X + 130;
            const textW = CARD_X + CARD_W - 24 - textX;
            return (
              <React.Fragment key={d.id}>
                <ScalePressable
                  onPress={() => setPending(d.id)}
                  accessibilityLabel={name}
                  aria-selected={selected}
                  style={box(CARD_X, top, CARD_W, CARD_H)}
                  scaleTo={0.98}
                >
                  {selected && (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.ring,
                        {
                          borderRadius: 40 * s,
                          borderWidth: Math.max(2, 7 * s),
                          backgroundColor: "rgba(246,210,122,0.08)",
                        },
                      ]}
                    />
                  )}
                </ScalePressable>
                <View pointerEvents="none" style={box(textX, top + 14, textW, 52)}>
                  <Text style={[styles.name, { fontSize: fit(name, textW, 40, 0.68) * s }]} numberOfLines={1}>
                    {name}
                  </Text>
                </View>
                <View pointerEvents="none" style={box(textX, top + 70, textW, 80)}>
                  <Text
                    style={[
                      styles.desc,
                      {
                        fontSize: blockSize(desc, textW, 80, 27, 20) * s,
                        lineHeight: blockSize(desc, textW, 80, 27, 20) * s * 1.2,
                      },
                    ]}
                  >
                    {desc}
                  </Text>
                </View>
                <View pointerEvents="none" style={box(textX, top + 152, textW, 36)}>
                  <Text
                    style={[styles.bonus, { fontSize: fit(bonus, textW, 27, 0.54) * s }]}
                    numberOfLines={1}
                  >
                    {bonus}
                  </Text>
                </View>
                <View pointerEvents="none" style={box(textX, top + 190, textW, 36)}>
                  <Text
                    style={[styles.penalty, { fontSize: fit(penalty, textW, 27, 0.54) * s }]}
                    numberOfLines={1}
                  >
                    {penalty}
                  </Text>
                </View>
              </React.Fragment>
            );
          })}

          <ScalePressable
            onPress={confirm}
            disabled={!pending}
            accessibilityLabel={confirmLabel}
            style={box(CONFIRM.x, CONFIRM.y, CONFIRM.w, CONFIRM.h)}
            scaleTo={0.97}
          >
            {/* Until a path is picked the gold button is dimmed, as it was before. */}
            {!pending && <View pointerEvents="none" style={[styles.dim, { borderRadius: 22 * s }]} />}
            <View style={styles.center}>
              <Text
                style={[
                  styles.confirmText,
                  { fontSize: Math.min(CONFIRM.h * 0.42, fit(confirmLabel, CONFIRM.w, 60, 0.66)) * s },
                  !pending && { color: "#d8c9a4" },
                ]}
                numberOfLines={1}
              >
                {confirmLabel}
              </Text>
            </View>
          </ScalePressable>

          <ScalePressable
            onPress={onClose}
            accessibilityLabel={laterLabel}
            style={box(LATER.x, LATER.y, LATER.w, LATER.h)}
            scaleTo={0.96}
          >
            <View style={styles.center}>
              <Text
                style={[
                  styles.later,
                  { fontSize: Math.min(LATER.h * 0.42, fit(laterLabel, LATER.w, 40, 0.6)) * s },
                ]}
                numberOfLines={1}
              >
                {laterLabel}
              </Text>
            </View>
          </ScalePressable>
        </View>
      </ModalBackdrop>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderColor: "#ffd75e" },
  dim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(38,26,14,0.62)" },
  title: { color: GOLD, fontFamily: FONT.display, textAlign: "center", letterSpacing: 1 },
  subtitle: { color: CREAM, fontFamily: FONT.medium, textAlign: "center" },
  name: { color: "#f6ecd0", fontFamily: FONT.bold },
  desc: { color: "#cdbb94", fontFamily: FONT.medium },
  bonus: { color: "#8fe0a2", fontFamily: FONT.bold },
  penalty: { color: "#f08a7e", fontFamily: FONT.bold },
  confirmText: { color: "#4a2a0e", fontFamily: FONT.black, textAlign: "center" },
  later: { color: "#d8c9a4", fontFamily: FONT.bold, textAlign: "center" },
});
