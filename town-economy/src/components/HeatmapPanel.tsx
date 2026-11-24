import React, { useState } from "react";
import { Image, LayoutChangeEvent, StyleSheet, View } from "react-native";
import botArt from "../../assets/ui/heatmap/bot.webp";
import lockArt from "../../assets/ui/heatmap/lock.webp";
import midArt from "../../assets/ui/heatmap/mid.webp";
import topArt from "../../assets/ui/heatmap/top.webp";
import { FONT, PANEL_GAP } from "../theme";
import { Text } from "./AppText";
import { GoodIcon } from "./GoodIcon";
import { ScalePressable } from "./ScalePressable";
import type { GoodId } from "../economy/types";

// The sent opportunity-map panel is 907 px wide: a dark rounded board with a
// header row of town columns and one row per good. Its painted cells were cut
// away; they are redrawn here in the same tile colours so each can carry its
// own live percentage. Positions are in the art's own pixels.
const ART_W = 907;
const TOP = 88;
const BOT = 34;
const ROW0 = 134;
const PITCH = 95.85;
const CELL_W = 98;
const CELL_H = 84;
const COL_X = [173, 284, 392, 502, 611, 719, 827];
const GOOD_X = 71;
const HEADER_Y = 54;

function lerp(a: number[], b: number[], t: number): string {
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
}
const GREEN = [
  [56, 98, 55],
  [66, 148, 74],
];
const RED = [
  [108, 56, 42],
  [160, 80, 64],
];

function tileColor(pct: number): string {
  const t = Math.min(1, Math.abs(pct) / 40);
  const [lo, hi] = pct >= 0 ? GREEN : RED;
  return lerp(lo, hi, t);
}

export interface HeatRow {
  goodId: GoodId;
  fallbackIcon: string;
  color: string;
  selected: boolean;
  /** one entry per town column: the net gain %, or null while that town is locked */
  cells: (number | null)[];
}

interface Props {
  towns: { id: string; icon: string }[];
  rows: HeatRow[];
  selectedTownId: string;
  best: { goodId: GoodId; townId: string } | null;
  onPickGood: (goodId: GoodId) => void;
  onPickCell: (goodId: GoodId, townId: string) => void;
}

/** The opportunity map: where each good earns the most. Tapping a good picks
 * it; tapping a cell picks that good and town for the caravan below. */
export function HeatmapPanel({ towns, rows, selectedTownId, best, onPickGood, onPickCell }: Props) {
  const [w, setW] = useState(360);
  const s = w / ART_W;
  const n = rows.length;
  const H = ROW0 - CELL_H / 2 + PITCH * n + 27;
  const place = (cx: number, cy: number, bw: number, bh: number) => ({
    position: "absolute" as const,
    left: (cx - bw / 2) * s,
    top: (cy - bh / 2) * s,
    width: bw * s,
    height: bh * s,
  });

  return (
    <View
      style={{ alignSelf: "stretch", height: H * s, marginBottom: PANEL_GAP }}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
    >
      <Image
        source={midArt}
        style={{
          position: "absolute",
          left: 0,
          width: "100%",
          top: (TOP - 2) * s,
          height: (H - TOP - BOT + 4) * s,
        }}
        resizeMode="stretch"
      />
      <Image
        source={topArt}
        style={{ position: "absolute", left: 0, top: 0, width: "100%", height: TOP * s }}
        resizeMode="stretch"
      />
      <Image
        source={botArt}
        style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: BOT * s }}
        resizeMode="stretch"
      />

      {towns.map((tn, i) => (
        <View key={tn.id} style={[place(COL_X[i], HEADER_Y, 80, 70), styles.center]} pointerEvents="none">
          <Text aria-hidden style={{ fontSize: 46 * s }}>
            {tn.icon}
          </Text>
        </View>
      ))}

      {rows.map((row, r) => {
        const cy = ROW0 + PITCH * r;
        return (
          <React.Fragment key={row.goodId}>
            <ScalePressable
              onPress={() => onPickGood(row.goodId)}
              accessibilityLabel={row.goodId}
              style={[
                place(GOOD_X, cy, 86, 86),
                styles.center,
                row.selected && {
                  borderWidth: Math.max(2, 4 * s),
                  borderColor: "#4fe36b",
                  borderRadius: 18 * s,
                },
              ]}
              scaleTo={0.95}
            >
              <GoodIcon id={row.goodId} fallback={row.fallbackIcon} size={Math.max(18, 58 * s)} />
            </ScalePressable>
            {row.cells.map((pct, c) => {
              const town = towns[c];
              if (!town) return null;
              if (pct === null) {
                return (
                  <View
                    key={town.id}
                    pointerEvents="none"
                    style={[place(COL_X[c], cy, CELL_W, CELL_H), styles.locked, { borderRadius: 16 * s }]}
                  >
                    <Image source={lockArt} style={{ width: 28 * s, height: 34 * s }} resizeMode="contain" />
                  </View>
                );
              }
              const isBest = best?.goodId === row.goodId && best.townId === town.id;
              const isSel = row.selected && town.id === selectedTownId;
              return (
                <ScalePressable
                  key={town.id}
                  onPress={() => onPickCell(row.goodId, town.id)}
                  accessibilityLabel={`${row.goodId} ${town.id} ${Math.round(pct)}%`}
                  style={[
                    place(COL_X[c], cy, CELL_W, CELL_H),
                    styles.cell,
                    { backgroundColor: tileColor(pct), borderRadius: 16 * s },
                    isSel && { borderWidth: Math.max(2, 4 * s), borderColor: "#d3e08c" },
                  ]}
                  scaleTo={0.95}
                >
                  {isBest && (
                    <Text
                      aria-hidden
                      style={[styles.star, { fontSize: 26 * s, right: -6 * s, top: -12 * s }]}
                    >
                      ⭐
                    </Text>
                  )}
                  <Text style={[styles.pct, { fontSize: 27 * s }]} numberOfLines={1}>
                    {pct >= 0 ? "+" : ""}
                    {pct.toFixed(0)}%
                  </Text>
                </ScalePressable>
              );
            })}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  cell: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.25)",
  },
  locked: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  star: { position: "absolute" },
  pct: {
    color: "#f6f0dc",
    fontFamily: FONT.black,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
});
