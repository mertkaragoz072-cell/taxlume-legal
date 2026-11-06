import React, { useState } from "react";
import { Animated, Image, LayoutChangeEvent, StyleSheet, View } from "react-native";
import lockedArt from "../../assets/ui/prestige/locked.webp";
import readyArt from "../../assets/ui/prestige/ready.webp";
import { FONT, PANEL_GAP } from "../theme";
import { Text } from "./AppText";
import { ScalePressable } from "./ScalePressable";

// The sent cards are 1200 x 657 (after trimming): a dark leather panel with a
// gold frame and a star at the top left. The locked one has a progress groove
// along the bottom, the ready one a big gold button there. Every field below is
// in those pixels and scales with the rendered width.
const ART_W = 1200;
const ART_H = 657;
const TITLE = { x: 140, y: 88, w: 640, h: 80 };
const LEVEL = { x: 800, y: 88, w: 340, h: 80 };
const DESC = { x: 62, y: 178, w: 1076, h: 148 };
const BONUS = { x: 62, y: 330, w: 1076, h: 44 };
const NOTE = { x: 62, y: 380, w: 1076, h: 58 };
const BAR = { x: 70, y: 446, w: 1056, h: 26 };
const PROGRESS = { x: 62, y: 484, w: 1076, h: 70 };
const BUTTON = { x: 53, y: 430, w: 1094, h: 135 };

const GOLD = "#f6d27a";
const CREAM = "#e9d9b0";

function blockSize(text: string, boxW: number, boxH: number, max: number, min: number, lh = 1.22): number {
  let size = max;
  while (size > min && Math.ceil((text.length * 0.52 * size) / boxW) * size * lh > boxH) size -= 0.5;
  return size;
}

interface Props {
  title: string;
  /** e.g. "Level 2" — only once the town has prestiged */
  level?: string;
  description: string;
  /** the permanent-bonus line, only once the town has prestiged */
  bonus?: string;
  ready: boolean;
  /** locked: the "reach net worth N" sentence */
  note: string;
  /** locked: 0..1 */
  pct: number;
  /** locked: "307 / 15000" */
  progressText: string;
  /** ready: button label (changes once armed) */
  buttonLabel: string;
  armed: boolean;
  onPress: () => void;
  /** the breathing pulse the button gets while it waits to be pressed */
  pulseScale: Animated.AnimatedInterpolation<number>;
}

/** The Prestige card on the sent leather-and-gold art. Locked: a progress
 * groove under the requirement; ready: a gold button that arms on the first
 * press and fires on the second. */
export function PrestigePanel({
  title,
  level,
  description,
  bonus,
  ready,
  note,
  pct,
  progressText,
  buttonLabel,
  armed,
  onPress,
  pulseScale,
}: Props) {
  const [w, setW] = useState(360);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const s = w / ART_W;
  const box = (b: { x: number; y: number; w: number; h: number }) => ({
    position: "absolute" as const,
    left: b.x * s,
    top: b.y * s,
    width: b.w * s,
    height: b.h * s,
  });
  const titleSize = Math.min(TITLE.h * 0.62, (TITLE.w * 0.96) / (title.length * 0.84)) * s;
  const descSize = blockSize(description, DESC.w, DESC.h, 46, 28) * s;
  const noteSize = blockSize(note, NOTE.w, NOTE.h, 40, 28) * s;

  return (
    <View
      style={{ aspectRatio: ART_W / ART_H, alignSelf: "stretch", marginBottom: PANEL_GAP }}
      onLayout={onLayout}
    >
      <Image source={ready ? readyArt : lockedArt} style={styles.fill} resizeMode="stretch" />

      <View style={[box(TITLE), { justifyContent: "center" }]}>
        <Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {level ? (
        <View style={[box(LEVEL), { justifyContent: "center", alignItems: "flex-end" }]}>
          <Text style={[styles.level, { fontSize: LEVEL.h * 0.42 * s }]} numberOfLines={1}>
            {level}
          </Text>
        </View>
      ) : null}
      <View style={box(DESC)}>
        <Text style={[styles.desc, { fontSize: descSize, lineHeight: descSize * 1.22 }]}>{description}</Text>
      </View>
      {bonus ? (
        <View style={[box(BONUS), { justifyContent: "center" }]}>
          <Text
            style={[
              styles.bonus,
              { fontSize: Math.min(BONUS.h * 0.7, blockSize(bonus, BONUS.w, BONUS.h, 38, 26, 1.1)) * s },
            ]}
            numberOfLines={2}
          >
            {bonus}
          </Text>
        </View>
      ) : null}

      {ready ? (
        <Animated.View style={[box(BUTTON), { transform: [{ scale: armed ? 1 : pulseScale }] }]}>
          <ScalePressable
            onPress={onPress}
            accessibilityLabel={buttonLabel}
            style={{ flex: 1 }}
            scaleTo={0.97}
          >
            <View style={styles.btnInner}>
              <Text
                style={[
                  styles.btnText,
                  { fontSize: Math.min(BUTTON.h * 0.36, (BUTTON.w * 0.9) / (buttonLabel.length * 0.66)) * s },
                ]}
                numberOfLines={1}
              >
                {buttonLabel}
              </Text>
            </View>
          </ScalePressable>
        </Animated.View>
      ) : (
        <>
          <View style={[box(NOTE), { justifyContent: "center" }]}>
            <Text style={[styles.note, { fontSize: noteSize, lineHeight: noteSize * 1.22 }]}>{note}</Text>
          </View>
          <View style={[box(BAR), { borderRadius: BAR.h * s, overflow: "hidden" }]}>
            <View
              style={{
                width: `${Math.max(2, Math.min(1, pct) * 100)}%`,
                height: "100%",
                backgroundColor: "#f0b72e",
                borderRadius: BAR.h * s,
              }}
            />
          </View>
          <View style={[box(PROGRESS), { justifyContent: "center", alignItems: "center" }]}>
            <Text
              style={[
                styles.progress,
                {
                  fontSize: Math.min(PROGRESS.h * 0.6, (PROGRESS.w * 0.9) / (progressText.length * 0.62)) * s,
                },
              ]}
              numberOfLines={1}
            >
              {progressText}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  title: { color: GOLD, fontFamily: FONT.display, letterSpacing: 1 },
  level: { color: GOLD, fontFamily: FONT.black },
  desc: { color: CREAM, fontFamily: FONT.medium },
  bonus: { color: "#8fe0a2", fontFamily: FONT.bold },
  note: { color: CREAM, fontFamily: FONT.medium, textAlign: "center" },
  progress: { color: GOLD, fontFamily: FONT.black },
  btnInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#4a2a0e", fontFamily: FONT.black, textAlign: "center" },
});
