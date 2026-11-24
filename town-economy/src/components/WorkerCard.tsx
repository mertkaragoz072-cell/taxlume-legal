import React, { useState } from "react";
import { Image, LayoutChangeEvent, StyleSheet, View } from "react-native";
import cardArt from "../../assets/ui/workers/card.webp";
import { FONT, PANEL_GAP } from "../theme";
import { Text } from "./AppText";
import { GoodIcon } from "./GoodIcon";
import { ScalePressable } from "./ScalePressable";
import type { GoodId } from "../economy/types";

// The sent worker card is 960 x 225: a dark rounded bar with the round + and −
// buttons painted at the right. Fields are in those pixels.
const ART_W = 960;
const ART_H = 225;
const PLUS = { x: 891, y: 66 };
const MINUS = { x: 891, y: 158 };
const BTN_R = 38;

interface Props {
  goodId: GoodId;
  fallbackIcon: string;
  color: string;
  name: string;
  /** wage + production bonus, only while someone is hired */
  info?: string;
  count: number;
  max: number;
  onHire: () => void;
  onFire: () => void;
}

/** One good's worker row on the sent card: its colour edge, icon, name, the
 * hire count as pips and the painted + / − buttons (dimmed at the limits). */
export function WorkerCard({ goodId, fallbackIcon, color, name, info, count, max, onHire, onFire }: Props) {
  const [w, setW] = useState(360);
  const s = w / ART_W;
  const canHire = count < max;
  const canFire = count > 0;
  const btn = (c: { x: number; y: number }, enabled: boolean, onPress: () => void, label: string) => (
    <>
      <ScalePressable
        disabled={!enabled}
        onPress={onPress}
        accessibilityLabel={label}
        style={{
          position: "absolute",
          left: (c.x - BTN_R - 6) * s,
          top: (c.y - BTN_R - 6) * s,
          width: (BTN_R + 6) * 2 * s,
          height: (BTN_R + 6) * 2 * s,
        }}
        scaleTo={0.9}
      >
        <View />
      </ScalePressable>
      {!enabled && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: (c.x - BTN_R) * s,
            top: (c.y - BTN_R) * s,
            width: BTN_R * 2 * s,
            height: BTN_R * 2 * s,
            borderRadius: BTN_R * s,
            backgroundColor: "rgba(28,18,10,0.6)",
          }}
        />
      )}
    </>
  );
  return (
    <View
      style={{ aspectRatio: ART_W / ART_H, alignSelf: "stretch", marginBottom: PANEL_GAP - 2 }}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
    >
      <View style={[styles.clip, { borderRadius: 50 * s }]}>
        <Image source={cardArt} style={styles.fill} resizeMode="stretch" />
        <View
          style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 14 * s, backgroundColor: color }}
        />
      </View>
      <View
        style={{
          position: "absolute",
          left: 40 * s,
          top: 0,
          bottom: 0,
          width: 100 * s,
          alignItems: "center",
          justifyContent: "center",
        }}
        pointerEvents="none"
      >
        <GoodIcon id={goodId} fallback={fallbackIcon} size={Math.max(24, 80 * s)} />
      </View>
      <View
        style={{
          position: "absolute",
          left: 160 * s,
          top: 0,
          bottom: 0,
          right: 160 * s,
          justifyContent: "center",
        }}
      >
        <Text style={[styles.name, { fontSize: Math.max(12, 44 * s) }]} numberOfLines={1}>
          {name}
        </Text>
        {info ? (
          <Text style={[styles.info, { fontSize: Math.max(9, 30 * s) }]} numberOfLines={2}>
            {info}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", gap: 8 * s, marginTop: 10 * s }}>
          {Array.from({ length: max }).map((_, i) => (
            <View
              key={i}
              style={{
                width: 52 * s,
                height: 14 * s,
                borderRadius: 8 * s,
                backgroundColor: i < count ? "#f2b630" : "#140d07",
              }}
            />
          ))}
        </View>
      </View>
      {btn(PLUS, canHire, onHire, "+")}
      {btn(MINUS, canFire, onFire, "−")}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" },
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  name: { color: "#f6ecd0", fontFamily: FONT.bold },
  info: { color: "#cdbb94", fontFamily: FONT.medium, marginTop: 2 },
});
