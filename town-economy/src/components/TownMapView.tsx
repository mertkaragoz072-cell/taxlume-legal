import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { TOWN_EMBLEMS_BY_ID } from "../economy/emblems";
import { ForeignTown, TownId } from "../economy/towns";
import { Caravan } from "../economy/types";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT } from "../theme";
import { GradientFill } from "./GradientFill";
import { ScalePressable } from "./ScalePressable";

interface Props {
  townName: string;
  selectedEmblem: string;
  towns: ForeignTown[];
  selectedTownId: TownId;
  onSelectTown: (id: TownId) => void;
  metropolUnlocked: boolean;
  legendaryUnlocked: boolean;
  mythicUnlocked: boolean;
  caravans: Caravan[];
  tick: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// Everything is laid out in this fixed drawing space and then scaled to the
// available width, so the terrain, roads and pins can never drift apart on
// a narrower phone — the SVG scales via viewBox, the pins via SCALE.
const BASE_W = 340;
const BASE_H = 280;
const HOME_X = 170;
const HOME_Y = 230;
const MAX_RADIUS = 200;

const MAP_WIDTH = Math.min(Dimensions.get("window").width - 56, BASE_W);
const SCALE = MAP_WIDTH / BASE_W;
const MAP_HEIGHT = BASE_H * SCALE;

const PIN_SIZE = 32;
const HOME_PIN_SIZE = 40;
const LABEL_WIDTH = 76;

// Parchment cartography palette — an aged map object sitting inside the
// app's dark wood UI, rather than another dark panel.
const SEA_TOP = "#5c7d8c";
const SEA_BOTTOM = "#7b9caa";
const LAND_LIGHT = "#cdb384";
const LAND_DARK = "#a98d5e";
const INK = "#4a3520";
const ROAD = "#6d5231";
const FOREST = "#75874f";
const FOREST_DARK = "#5d6d3e";
const ROCK = "#9c8459";

// A stylized fan-out: nearer tiers hug home, metropolises sit up on the
// coast, and the legendary/mythic pair are out on islands across the sea.
const TOWN_LAYOUT: Record<TownId, { angle: number; radius: number; bend: number }> = {
  windyhill: { angle: -55, radius: 0.42, bend: 14 },
  ironforge: { angle: 0, radius: 0.38, bend: -10 },
  portcity: { angle: 55, radius: 0.42, bend: -14 },
  grandbazaar: { angle: -35, radius: 0.68, bend: 16 },
  diamondharbor: { angle: 35, radius: 0.68, bend: -16 },
  legendharbor: { angle: -16, radius: 0.94, bend: 18 },
  mythicspire: { angle: 16, radius: 0.94, bend: -18 },
};

function townPosition(angleDeg: number, radiusFraction: number) {
  const angleRad = (angleDeg * Math.PI) / 180;
  const r = radiusFraction * MAX_RADIUS;
  return { x: HOME_X + r * Math.sin(angleRad), y: HOME_Y - r * Math.cos(angleRad) };
}

/** Control point for a road's gentle curve — the straight line's midpoint
 * pushed sideways, so roads bow like drawn tracks instead of ruler lines. */
function roadControl(to: { x: number; y: number }, bend: number) {
  const dx = to.x - HOME_X;
  const dy = to.y - HOME_Y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: HOME_X + dx / 2 + (-dy / len) * bend,
    y: HOME_Y + dy / 2 + (dx / len) * bend,
  };
}

function pointOnRoad(to: { x: number; y: number }, bend: number, tt: number) {
  const c = roadControl(to, bend);
  const inv = 1 - tt;
  return {
    x: inv * inv * HOME_X + 2 * inv * tt * c.x + tt * tt * to.x,
    y: inv * inv * HOME_Y + 2 * inv * tt * c.y + tt * tt * to.y,
  };
}

function isTownUnlocked(
  tier: ForeignTown["tier"],
  metropolUnlocked: boolean,
  legendaryUnlocked: boolean,
  mythicUnlocked: boolean
): boolean {
  if (tier === "town") return true;
  if (tier === "metropol") return metropolUnlocked;
  if (tier === "legendary") return legendaryUnlocked;
  return mythicUnlocked;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// The mainland: left edge down to the bottom, a wavy northern coast, and a
// bay cut into the east so the port towns actually sit on water.
const COAST_PATH =
  "M 0,280 L 0,98 " +
  "C 30,84 62,104 96,92 " +
  "C 128,80 152,98 182,88 " +
  "C 214,78 244,106 262,140 " +
  "C 272,160 252,170 250,190 " +
  "C 248,208 288,210 302,230 " +
  "C 314,248 326,266 324,280 Z";

const ISLAND_A =
  "M 82,56 C 84,42 100,32 118,32 C 138,32 154,42 154,56 C 154,68 136,76 118,76 C 98,76 80,68 82,56 Z";
const ISLAND_B =
  "M 190,56 C 192,44 206,34 222,34 C 240,34 254,44 254,56 C 254,68 238,74 222,74 C 204,74 188,68 190,56 Z";

const MOUNTAINS: { x: number; y: number; w: number; h: number }[] = [
  { x: 38, y: 168, w: 30, h: 22 },
  { x: 62, y: 158, w: 36, h: 28 },
  { x: 92, y: 170, w: 26, h: 18 },
  { x: 196, y: 168, w: 28, h: 20 },
  { x: 218, y: 160, w: 32, h: 26 },
];

const TREES: { x: number; y: number; s: number }[] = [
  { x: 34, y: 214, s: 1 },
  { x: 52, y: 230, s: 0.85 },
  { x: 30, y: 246, s: 0.9 },
  { x: 66, y: 244, s: 1 },
  { x: 246, y: 246, s: 0.95 },
  { x: 268, y: 258, s: 0.85 },
  { x: 224, y: 262, s: 0.9 },
  { x: 118, y: 258, s: 0.8 },
];

const HILLS: { x: number; y: number; w: number; h: number }[] = [
  { x: 128, y: 200, w: 34, h: 11 },
  { x: 196, y: 214, w: 30, h: 10 },
  { x: 86, y: 128, w: 28, h: 9 },
];

const WAVES: { x: number; y: number }[] = [
  { x: 236, y: 18 },
  { x: 276, y: 52 },
  { x: 150, y: 12 },
  { x: 300, y: 118 },
  { x: 306, y: 186 },
  { x: 60, y: 30 },
];

/** A small parchment map of the region: our own town inland at the south,
 * the neighbouring towns fanned out along the roads north, the metropolises
 * up on the coast and the legendary/mythic pair out on islands. Locked tiers
 * stay as unmarked lock pins, and any caravan on the road rides its own
 * curve between home and its destination. Tapping an unlocked town selects
 * it, same as the pill rows below. */
export function TownMapView({
  townName,
  selectedEmblem,
  towns,
  selectedTownId,
  onSelectTown,
  metropolUnlocked,
  legendaryUnlocked,
  mythicUnlocked,
  caravans,
  tick,
  t,
}: Props) {
  const homeIcon = TOWN_EMBLEMS_BY_ID[selectedEmblem]?.icon ?? "🏘️";

  return (
    <View style={styles.card}>
      <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
      <View style={styles.mapWrap}>
        <Svg width={MAP_WIDTH} height={MAP_HEIGHT} viewBox={`0 0 ${BASE_W} ${BASE_H}`}>
          <Defs>
            <LinearGradient id="mapSea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={SEA_TOP} />
              <Stop offset="1" stopColor={SEA_BOTTOM} />
            </LinearGradient>
            <RadialGradient id="mapLand" cx="45%" cy="62%" r="78%">
              <Stop offset="0" stopColor={LAND_LIGHT} />
              <Stop offset="1" stopColor={LAND_DARK} />
            </RadialGradient>
            <RadialGradient id="mapVignette" cx="50%" cy="50%" r="72%">
              <Stop offset="0.5" stopColor="#3a2a18" stopOpacity={0} />
              <Stop offset="1" stopColor="#3a2a18" stopOpacity={0.38} />
            </RadialGradient>
          </Defs>

          <Rect x={0} y={0} width={BASE_W} height={BASE_H} fill="url(#mapSea)" />

          {WAVES.map((w, i) => (
            <Path
              key={`wave-${i}`}
              d={`M ${w.x},${w.y} q 5,-4 10,0 q 5,4 10,0`}
              stroke="#ffffff"
              strokeOpacity={0.22}
              strokeWidth={1.2}
              fill="none"
            />
          ))}

          <Path d={COAST_PATH} fill="url(#mapLand)" stroke={INK} strokeOpacity={0.45} strokeWidth={1.4} />
          <Path d={ISLAND_A} fill="url(#mapLand)" stroke={INK} strokeOpacity={0.45} strokeWidth={1.4} />
          <Path d={ISLAND_B} fill="url(#mapLand)" stroke={INK} strokeOpacity={0.45} strokeWidth={1.4} />

          {/* faint cartographic grid, clipped to nothing in particular — it
              reads as the surveyor's ruling under the drawing */}
          <G opacity={0.1}>
            {[68, 136, 204, 272].map((x) => (
              <Path key={`gx-${x}`} d={`M ${x},0 L ${x},${BASE_H}`} stroke={INK} strokeWidth={1} />
            ))}
            {[56, 112, 168, 224].map((y) => (
              <Path key={`gy-${y}`} d={`M 0,${y} L ${BASE_W},${y}`} stroke={INK} strokeWidth={1} />
            ))}
          </G>

          {HILLS.map((h, i) => (
            <Path
              key={`hill-${i}`}
              d={`M ${h.x},${h.y} q ${h.w / 2},${-h.h} ${h.w},0`}
              stroke={ROCK}
              strokeOpacity={0.8}
              strokeWidth={1.6}
              fill="none"
            />
          ))}

          {MOUNTAINS.map((m, i) => (
            <G key={`mtn-${i}`}>
              <Polygon
                points={`${m.x},${m.y} ${m.x + m.w / 2},${m.y - m.h} ${m.x + m.w},${m.y}`}
                fill={ROCK}
                stroke={INK}
                strokeOpacity={0.55}
                strokeWidth={1.2}
              />
              <Polygon
                points={`${m.x + m.w / 2},${m.y - m.h} ${m.x + m.w * 0.34},${m.y - m.h * 0.36} ${
                  m.x + m.w * 0.66
                },${m.y - m.h * 0.36}`}
                fill="#e6dcc4"
                fillOpacity={0.75}
              />
            </G>
          ))}

          {TREES.map((tr, i) => (
            <G key={`tree-${i}`}>
              <Path
                d={`M ${tr.x},${tr.y} l ${2 * tr.s},0 l 0,${4 * tr.s} l ${-2 * tr.s},0 Z`}
                fill={FOREST_DARK}
              />
              <Polygon
                points={`${tr.x + tr.s},${tr.y - 12 * tr.s} ${tr.x - 5 * tr.s},${tr.y} ${
                  tr.x + 7 * tr.s
                },${tr.y}`}
                fill={FOREST}
                stroke={FOREST_DARK}
                strokeWidth={0.8}
              />
            </G>
          ))}

          {/* roads */}
          {towns.map((tn) => {
            const layout = TOWN_LAYOUT[tn.id];
            const pos = townPosition(layout.angle, layout.radius);
            const c = roadControl(pos, layout.bend);
            const unlocked = isTownUnlocked(tn.tier, metropolUnlocked, legendaryUnlocked, mythicUnlocked);
            return (
              <Path
                key={`road-${tn.id}`}
                d={`M ${HOME_X},${HOME_Y} Q ${c.x},${c.y} ${pos.x},${pos.y}`}
                stroke={ROAD}
                strokeOpacity={unlocked ? 0.75 : 0.3}
                strokeWidth={1.8}
                strokeDasharray="5,4"
                strokeLinecap="round"
                fill="none"
              />
            );
          })}

          {/* compass rose, out on the open water like a proper chart */}
          <G>
            <Circle cx={42} cy={46} r={17} fill="#e8dcbe" fillOpacity={0.28} stroke={INK} strokeOpacity={0.5} strokeWidth={1.2} />
            <Polygon points="42,29 45.5,46 42,63 38.5,46" fill="#f0e6cc" fillOpacity={0.85} />
            <Polygon points="25,46 42,42.5 59,46 42,49.5" fill={INK} fillOpacity={0.55} />
            <SvgText x={42} y={24} fontSize={9} fontWeight="bold" fill="#f0e6cc" fillOpacity={0.9} textAnchor="middle">
              N
            </SvgText>
          </G>

          <Rect x={0} y={0} width={BASE_W} height={BASE_H} fill="url(#mapVignette)" />

          {/* frame */}
          <Rect x={1.5} y={1.5} width={BASE_W - 3} height={BASE_H - 3} fill="none" stroke={INK} strokeWidth={3} />
          <Rect
            x={6}
            y={6}
            width={BASE_W - 12}
            height={BASE_H - 12}
            fill="none"
            stroke="#8a6a42"
            strokeOpacity={0.75}
            strokeWidth={1}
          />
        </Svg>

        {towns.map((tn) => {
          const layout = TOWN_LAYOUT[tn.id];
          const pos = townPosition(layout.angle, layout.radius);
          const unlocked = isTownUnlocked(tn.tier, metropolUnlocked, legendaryUnlocked, mythicUnlocked);
          const selected = unlocked && tn.id === selectedTownId;
          return (
            <React.Fragment key={tn.id}>
              <ScalePressable
                disabled={!unlocked}
                onPress={() => onSelectTown(tn.id)}
                accessibilityLabel={t(tn.nameKey)}
                style={[
                  styles.pin,
                  { left: pos.x * SCALE - PIN_SIZE / 2, top: pos.y * SCALE - PIN_SIZE / 2 },
                  selected && styles.pinSelected,
                  !unlocked && styles.pinLocked,
                ]}
                scaleTo={0.9}
              >
                <Text style={styles.pinIcon}>{unlocked ? tn.icon : "🔒"}</Text>
              </ScalePressable>
              <Text
                style={[
                  styles.townLabel,
                  {
                    left: pos.x * SCALE - LABEL_WIDTH / 2,
                    top: pos.y * SCALE + PIN_SIZE / 2 + 1,
                  },
                  selected && styles.townLabelSelected,
                  !unlocked && styles.townLabelLocked,
                ]}
                numberOfLines={1}
              >
                {t(tn.nameKey)}
              </Text>
            </React.Fragment>
          );
        })}

        {caravans.map((c) => {
          const layout = TOWN_LAYOUT[c.townId];
          if (!layout) return null;
          const pos = townPosition(layout.angle, layout.radius);
          const total = c.arrivesAtTick - c.departedTick;
          const progress = total > 0 ? clamp01((tick - c.departedTick) / total) : 1;
          const pt = pointOnRoad(pos, layout.bend, progress);
          return (
            <Text key={c.id} style={[styles.caravanIcon, { left: pt.x * SCALE - 9, top: pt.y * SCALE - 9 }]}>
              🐫
            </Text>
          );
        })}

        <View
          style={[
            styles.pin,
            styles.homePin,
            { left: HOME_X * SCALE - HOME_PIN_SIZE / 2, top: HOME_Y * SCALE - HOME_PIN_SIZE / 2 },
          ]}
        >
          <Text style={styles.homeIcon}>{homeIcon}</Text>
        </View>
        <Text
          style={[
            styles.homeLabel,
            { left: HOME_X * SCALE - 70, top: HOME_Y * SCALE + HOME_PIN_SIZE / 2 + 1 },
          ]}
          numberOfLines={1}
        >
          {townName}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.feature,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    overflow: "hidden",
    alignItems: "center",
    ...cardShadow,
  },
  mapWrap: { width: MAP_WIDTH, height: MAP_HEIGHT },
  pin: {
    position: "absolute",
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    backgroundColor: "#33261a",
    borderWidth: 2,
    borderColor: "#e2d3ae",
    alignItems: "center",
    justifyContent: "center",
  },
  pinSelected: { borderColor: COLORS.accent, backgroundColor: "#5a4326", borderWidth: 3 },
  pinLocked: { backgroundColor: "#6f6250", borderColor: "#cbbc9c", opacity: 0.75 },
  pinIcon: { fontSize: 15 },
  homePin: {
    width: HOME_PIN_SIZE,
    height: HOME_PIN_SIZE,
    borderRadius: HOME_PIN_SIZE / 2,
    backgroundColor: COLORS.accent,
    borderColor: "#4a3520",
    borderWidth: 3,
  },
  homeIcon: { fontSize: 19 },
  townLabel: {
    position: "absolute",
    width: LABEL_WIDTH,
    textAlign: "center",
    color: "#3f2d18",
    fontSize: 9,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    textShadowColor: "rgba(236, 223, 190, 0.95)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  townLabelSelected: { color: "#2a1c0c" },
  townLabelLocked: { color: "#5b5142", opacity: 0.9 },
  homeLabel: {
    position: "absolute",
    width: 140,
    textAlign: "center",
    color: "#33230f",
    fontSize: TYPE.micro,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    letterSpacing: 0.3,
    textShadowColor: "rgba(240, 228, 198, 0.95)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  caravanIcon: { position: "absolute", fontSize: 15, transform: [{ scaleX: -1 }] },
});
