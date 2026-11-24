import React, { useState } from "react";
import { Image, LayoutChangeEvent, StyleSheet, View } from "react-native";
import cardArt from "../../assets/ui/cards/card.webp";
import { FONT } from "../theme";
import { Text } from "./AppText";

// The sent progress card (caravans, futures, wholesale contracts) is 1679 x 255:
// a dark rounded card with a progress groove along its foot. Its painted icons,
// colour edge and fill were cleared. Fields are in those pixels.
const ART_W = 1679;
const ART_H = 255;
const TITLE = { x: 74, y: 16, w: 1000, h: 80 };
const RIGHT = { x: 1080, y: 22, w: 520, h: 84 };
const SUB = { x: 74, y: 98, w: 1530, h: 72 };
const GROOVE = { x: 64, y: 184, w: 1544, h: 24 };
const EDGE = { x: 8, y: 36, w: 20, h: 180 };

interface Props {
  /** the good's colour, drawn as the thin edge on the left */
  color: string;
  title: string;
  right: string;
  sub: string;
  /** 0..1 */
  progress: number;
  marginBottom?: number;
}

/** One running caravan / contract: what it is, when it lands, and how far along. */
export function ProgressCard({ color, title, right, sub, progress, marginBottom = 8 }: Props) {
  const [w, setW] = useState(360);
  const s = w / ART_W;
  const box = (b: { x: number; y: number; w: number; h: number }) => ({
    position: "absolute" as const,
    left: b.x * s,
    top: b.y * s,
    width: b.w * s,
    height: b.h * s,
  });
  const fit = (text: string, boxW: number, max: number, em: number) =>
    Math.min(max, (boxW * 0.96) / (Math.max(1, text.length) * em)) * s;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View
      style={{ aspectRatio: ART_W / ART_H, alignSelf: "stretch", marginBottom }}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
    >
      <Image source={cardArt} style={styles.fill} resizeMode="stretch" />
      <View style={[box(EDGE), { backgroundColor: color, borderRadius: 8 * s }]} pointerEvents="none" />
      <View style={[box(TITLE), { justifyContent: "center" }]} pointerEvents="none">
        <Text style={[styles.title, { fontSize: fit(title, TITLE.w, 54, 0.62) }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={[box(RIGHT), { justifyContent: "center", alignItems: "flex-end" }]} pointerEvents="none">
        <Text style={[styles.right, { fontSize: fit(right, RIGHT.w, 44, 0.58) }]} numberOfLines={1}>
          {right}
        </Text>
      </View>
      <View style={[box(SUB), { justifyContent: "center" }]} pointerEvents="none">
        <Text style={[styles.sub, { fontSize: fit(sub, SUB.w * 1.5, 40, 0.5) }]} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <View style={[box(GROOVE), { borderRadius: GROOVE.h * s, overflow: "hidden" }]} pointerEvents="none">
        <View
          style={{
            width: `${p * 100}%`,
            height: "100%",
            backgroundColor: "#f6d9a0",
            borderRadius: GROOVE.h * s,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  title: { color: "#f6ecd0", fontFamily: FONT.bold },
  right: { color: "#e1c58c", fontFamily: FONT.bold },
  sub: { color: "#bfae8c", fontFamily: FONT.medium },
});
