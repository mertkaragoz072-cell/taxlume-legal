import React, { useState } from "react";
import { Image, LayoutChangeEvent, StyleSheet, View } from "react-native";
import lockedArt from "../../assets/ui/workers/locked.webp";
import { FONT, PANEL_GAP } from "../theme";
import { Text } from "./AppText";

// The sent card is 1200 x 172: a dark rounded bar with a painted padlock at the
// left and a progress groove below it. Fields are in those pixels.
const ART_W = 1200;
const ART_H = 172;
const NOTE = { x: 90, y: 30, w: 1070, h: 56 };
const BAR = { x: 40, y: 83, w: 1118, h: 21 };

interface Props {
  note: string;
  /** 0..1 */
  pct: number;
}

/** The locked Workers row: the requirement beside the padlock and a gold fill
 * in the groove showing how far net worth has come. */
export function WorkersLockedPanel({ note, pct }: Props) {
  const [w, setW] = useState(360);
  const s = w / ART_W;
  const size = Math.min(NOTE.h * 0.62, (NOTE.w * 0.96) / (Math.max(1, note.length) * 0.54)) * s;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <View
      style={{ aspectRatio: ART_W / ART_H, alignSelf: "stretch", marginBottom: PANEL_GAP }}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
    >
      <Image source={lockedArt} style={styles.fill} resizeMode="stretch" />
      <View
        style={{
          position: "absolute",
          left: NOTE.x * s,
          top: NOTE.y * s,
          width: NOTE.w * s,
          height: NOTE.h * s,
          justifyContent: "center",
        }}
      >
        <Text style={[styles.note, { fontSize: size }]} numberOfLines={1}>
          {note}
        </Text>
      </View>
      <View
        style={{
          position: "absolute",
          left: BAR.x * s,
          top: BAR.y * s,
          width: BAR.w * s,
          height: BAR.h * s,
          borderRadius: BAR.h * s,
          overflow: "hidden",
        }}
      >
        <View style={{ width: `${Math.max(1.5, p * 100)}%`, height: "100%", backgroundColor: "#f0b72e" }} />
      </View>
      <View style={{ position: "absolute", left: 0, right: 0, top: 112 * s, alignItems: "center" }}>
        <Text style={[styles.pct, { fontSize: 34 * s }]}>{`${Math.floor(p * 100)}%`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  note: { color: "#d9c9a2", fontFamily: FONT.medium },
  pct: { color: "#f6d27a", fontFamily: FONT.black },
});
