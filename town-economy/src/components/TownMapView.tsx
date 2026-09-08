import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { TOWN_EMBLEMS_BY_ID } from "../economy/emblems";
import { ForeignTown, TownId } from "../economy/towns";
import { Caravan } from "../economy/types";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";
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

const MAP_WIDTH = 300;
const MAP_HEIGHT = 230;
const HOME_X = MAP_WIDTH / 2;
// Leaves enough room below home for its pin plus the town-name label
// underneath it without either getting clipped by the card.
const HOME_Y = MAP_HEIGHT - 50;
const MAX_RADIUS = 170;
const PIN_SIZE = 34;
const HOME_PIN_SIZE = 42;

// A stylized fan-out layout rather than anything geographically literal —
// closer tiers sit nearer home, farther-out tiers (metropol, legendary,
// mythic) push further up the arc, spread left/right so pins don't overlap.
const TOWN_LAYOUT: Record<TownId, { angle: number; radius: number }> = {
  windyhill: { angle: -55, radius: 0.42 },
  ironforge: { angle: 0, radius: 0.38 },
  portcity: { angle: 55, radius: 0.42 },
  grandbazaar: { angle: -35, radius: 0.68 },
  diamondharbor: { angle: 35, radius: 0.68 },
  legendharbor: { angle: -16, radius: 0.94 },
  mythicspire: { angle: 16, radius: 0.94 },
};

function townPosition(angleDeg: number, radiusFraction: number) {
  const angleRad = (angleDeg * Math.PI) / 180;
  const r = radiusFraction * MAX_RADIUS;
  return { x: HOME_X + r * Math.sin(angleRad), y: HOME_Y - r * Math.cos(angleRad) };
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

/** A small stylized world map: our own town at the bottom, the foreign
 * towns fanned out above it by tier/distance, dashed roads back to home,
 * and any en-route caravan shown as a moving dot along its road. Tapping
 * an unlocked town selects it, same as the pill rows below. Locked tiers
 * show as grayed-out pins with a lock icon instead of the town's own. */
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
        <Svg width={MAP_WIDTH} height={MAP_HEIGHT} style={StyleSheet.absoluteFill}>
          {towns.map((tn) => {
            const layout = TOWN_LAYOUT[tn.id];
            const pos = townPosition(layout.angle, layout.radius);
            const unlocked = isTownUnlocked(tn.tier, metropolUnlocked, legendaryUnlocked, mythicUnlocked);
            return (
              <Line
                key={tn.id}
                x1={HOME_X}
                y1={HOME_Y}
                x2={pos.x}
                y2={pos.y}
                stroke={unlocked ? withAlpha(COLORS.accent, 0.35) : withAlpha(COLORS.textMuted, 0.18)}
                strokeWidth={1.5}
                strokeDasharray="4,4"
              />
            );
          })}
        </Svg>

        {towns.map((tn) => {
          const layout = TOWN_LAYOUT[tn.id];
          const pos = townPosition(layout.angle, layout.radius);
          const unlocked = isTownUnlocked(tn.tier, metropolUnlocked, legendaryUnlocked, mythicUnlocked);
          const selected = unlocked && tn.id === selectedTownId;
          return (
            <ScalePressable
              key={tn.id}
              disabled={!unlocked}
              onPress={() => onSelectTown(tn.id)}
              accessibilityLabel={t(tn.nameKey)}
              style={[
                styles.pin,
                { left: pos.x - PIN_SIZE / 2, top: pos.y - PIN_SIZE / 2 },
                selected && styles.pinSelected,
                !unlocked && styles.pinLocked,
              ]}
              scaleTo={0.9}
            >
              <Text style={styles.pinIcon}>{unlocked ? tn.icon : "🔒"}</Text>
            </ScalePressable>
          );
        })}

        {caravans.map((c) => {
          const layout = TOWN_LAYOUT[c.townId];
          if (!layout) return null;
          const pos = townPosition(layout.angle, layout.radius);
          const total = c.arrivesAtTick - c.departedTick;
          const progress = total > 0 ? clamp01((tick - c.departedTick) / total) : 1;
          const x = HOME_X + (pos.x - HOME_X) * progress;
          const y = HOME_Y + (pos.y - HOME_Y) * progress;
          return (
            <Text key={c.id} style={[styles.caravanIcon, { left: x - 9, top: y - 9 }]}>
              🐫
            </Text>
          );
        })}

        <View style={[styles.pin, styles.homePin, { left: HOME_X - HOME_PIN_SIZE / 2, top: HOME_Y - HOME_PIN_SIZE / 2 }]}>
          <Text style={styles.homeIcon}>{homeIcon}</Text>
        </View>
        <Text style={styles.homeLabel} numberOfLines={1}>
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
    backgroundColor: "#2a2016",
    borderWidth: 2,
    borderColor: withAlpha(COLORS.accent, 0.4),
    alignItems: "center",
    justifyContent: "center",
  },
  pinSelected: { borderColor: COLORS.accent, backgroundColor: withAlpha(COLORS.accent, 0.22) },
  pinLocked: { opacity: 0.5, borderColor: withAlpha(COLORS.textMuted, 0.3) },
  pinIcon: { fontSize: 16 },
  homePin: {
    backgroundColor: withAlpha(COLORS.accent, 0.22),
    borderColor: COLORS.accent,
    borderWidth: 2,
  },
  homeIcon: { fontSize: 20 },
  homeLabel: {
    position: "absolute",
    left: HOME_X - 60,
    top: HOME_Y + HOME_PIN_SIZE / 2 + 2,
    width: 120,
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: TYPE.micro,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
  caravanIcon: { position: "absolute", fontSize: 15, transform: [{ scaleX: -1 }] },
});
