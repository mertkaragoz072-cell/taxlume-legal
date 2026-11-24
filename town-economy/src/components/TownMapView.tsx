import React from "react";
import { Image, StyleSheet, useWindowDimensions, View } from "react-native";
import mapArt from "../../assets/ui/tradesheet/map.webp";
import { Text } from "./AppText";
import { TOWN_EMBLEMS_BY_ID } from "../economy/emblems";
import { ForeignTown, TownId } from "../economy/towns";
import { Caravan } from "../economy/types";
import { FONT, PANEL_GAP, SCREEN_PADDING } from "../theme";
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
  /** Caps the map's rendered height as well as its width, so the caravan
   * tutorial's docked card below it never crops it: the whole map shrinks
   * to fit instead. */
  maxHeight?: number;
}

// The sent map art is 775 x 562; every position below is in its own pixels
// and scaled by (rendered width / 775), so pins, plaques and caravans stay on
// the painted towns at any width.
const ART_W = 775;
const ART_H = 562;
const HOME = { x: 387, y: 438 };
const PIN_D = 60;
const HOME_D = 74;

interface Spot {
  /** centre of the town's painted badge */
  pin: { x: number; y: number };
  /** centre and size of its blank name plaque */
  label: { x: number; y: number; w: number; h: number };
}

const SPOTS: Record<TownId, Spot> = {
  legendharbor: { pin: { x: 300, y: 88 }, label: { x: 252, y: 126, w: 182, h: 35 } },
  mythicspire: { pin: { x: 573, y: 88 }, label: { x: 529, y: 126, w: 178, h: 35 } },
  grandbazaar: { pin: { x: 276, y: 214 }, label: { x: 205, y: 250, w: 187, h: 35 } },
  diamondharbor: { pin: { x: 626, y: 214 }, label: { x: 572, y: 250, w: 192, h: 35 } },
  ironforge: { pin: { x: 383, y: 268 }, label: { x: 382, y: 331, w: 154, h: 37 } },
  windyhill: { pin: { x: 258, y: 365 }, label: { x: 216, y: 407, w: 163, h: 35 } },
  portcity: { pin: { x: 608, y: 368 }, label: { x: 557, y: 407, w: 162, h: 35 } },
};
const HOME_LABEL = { x: 387, y: 493, w: 242, h: 40 };

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

/** Name lettering sized to its plaque: as large as the plaque's height allows,
 * stepped down when the word is longer than the plaque is wide. */
function labelFont(text: string, w: number, h: number): number {
  return Math.max(7, Math.min(h * 0.52, (w * 0.9) / (text.length * 0.66)));
}

/** The painted region map. The baked art already carries every town's
 * building, its road and a badge for the three starter towns and the lock
 * badges on the others, with blank name plaques; this lays live content on
 * it: the town names, a gold ring on the selected town, a real icon where a
 * locked tier has opened, the home emblem, and caravans riding the road. Tapping
 * an unlocked town selects it, same as the pill rows below. */
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
  maxHeight,
}: Props) {
  const homeIcon = TOWN_EMBLEMS_BY_ID[selectedEmblem]?.icon ?? "🏘️";
  const { width: windowWidth } = useWindowDimensions();
  const widthCap = Math.min(windowWidth, 680) - SCREEN_PADDING * 2;
  const heightCap = maxHeight != null ? (maxHeight * ART_W) / ART_H : widthCap;
  const mapW = Math.min(widthCap, heightCap);
  const s = mapW / ART_W;
  const mapH = ART_H * s;

  return (
    <View style={styles.card}>
      <View style={{ width: mapW, height: mapH }}>
        <Image source={mapArt} style={styles.art} resizeMode="stretch" />

        {towns.map((tn) => {
          const spot = SPOTS[tn.id];
          if (!spot) return null;
          const unlocked = isTownUnlocked(tn.tier, metropolUnlocked, legendaryUnlocked, mythicUnlocked);
          const selected = unlocked && tn.id === selectedTownId;
          const starter = tn.tier === "town";
          const name = t(tn.nameKey);
          return (
            <React.Fragment key={tn.id}>
              {/* A tier that has opened covers its baked lock badge with the
                  town's own icon; a locked one keeps the painted lock. */}
              {unlocked && !starter && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.openPin,
                    {
                      width: 56 * s,
                      height: 56 * s,
                      borderRadius: 28 * s,
                      left: (spot.pin.x - 28) * s,
                      top: (spot.pin.y - 28) * s,
                    },
                  ]}
                >
                  <Text aria-hidden style={{ fontSize: 26 * s }}>
                    {tn.icon}
                  </Text>
                </View>
              )}
              {selected && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.ring,
                    {
                      width: (PIN_D + 14) * s,
                      height: (PIN_D + 14) * s,
                      borderRadius: ((PIN_D + 14) / 2) * s,
                      left: (spot.pin.x - (PIN_D + 14) / 2) * s,
                      top: (spot.pin.y - (PIN_D + 14) / 2) * s,
                      borderWidth: Math.max(2, 4 * s),
                    },
                  ]}
                />
              )}
              <ScalePressable
                disabled={!unlocked}
                onPress={() => onSelectTown(tn.id)}
                accessibilityLabel={unlocked ? name : t("a11y.townLocked", { name })}
                aria-selected={selected}
                aria-disabled={!unlocked}
                style={{
                  position: "absolute",
                  width: (PIN_D + 20) * s,
                  height: (PIN_D + 20) * s,
                  left: (spot.pin.x - (PIN_D + 20) / 2) * s,
                  top: (spot.pin.y - (PIN_D + 20) / 2) * s,
                }}
                scaleTo={0.92}
              >
                <View />
              </ScalePressable>
              <View
                pointerEvents="none"
                style={[
                  styles.plaqueText,
                  {
                    width: spot.label.w * s,
                    height: spot.label.h * s,
                    left: (spot.label.x - spot.label.w / 2) * s,
                    top: (spot.label.y - spot.label.h / 2) * s,
                  },
                  selected && styles.plaqueOn,
                  !unlocked && styles.plaqueOff,
                ]}
              >
                <Text
                  style={[styles.label, { fontSize: labelFont(name, spot.label.w * s, spot.label.h * s) }]}
                  numberOfLines={1}
                >
                  {name}
                </Text>
              </View>
            </React.Fragment>
          );
        })}

        {caravans.map((c) => {
          const spot = SPOTS[c.townId];
          if (!spot) return null;
          const total = c.arrivesAtTick - c.departedTick;
          const progress = total > 0 ? clamp01((tick - c.departedTick) / total) : 1;
          const x = HOME.x + (spot.pin.x - HOME.x) * progress;
          const y = HOME.y + (spot.pin.y - HOME.y) * progress;
          return (
            <Text
              key={c.id}
              aria-hidden
              style={[styles.caravan, { fontSize: 30 * s, left: (x - 15) * s, top: (y - 18) * s }]}
            >
              🐫
            </Text>
          );
        })}

        <View
          accessible
          accessibilityLabel={t("a11y.homeTown", { name: townName })}
          style={[
            styles.homePin,
            {
              width: HOME_D * s,
              height: HOME_D * s,
              borderRadius: (HOME_D / 2) * s,
              left: (HOME.x - HOME_D / 2) * s,
              top: (HOME.y - HOME_D / 2) * s,
            },
          ]}
        >
          <Text aria-hidden style={{ fontSize: 34 * s }}>
            {homeIcon}
          </Text>
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.plaqueText,
            {
              width: HOME_LABEL.w * s,
              height: HOME_LABEL.h * s,
              left: (HOME_LABEL.x - HOME_LABEL.w / 2) * s,
              top: (HOME_LABEL.y - HOME_LABEL.h / 2) * s,
            },
          ]}
        >
          <Text
            style={[
              styles.label,
              { fontSize: labelFont(townName, (HOME_LABEL.w - 40) * s, HOME_LABEL.h * s) },
            ]}
            numberOfLines={1}
          >
            {townName}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", marginBottom: PANEL_GAP },
  art: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  openPin: {
    position: "absolute",
    backgroundColor: "#33261a",
    borderWidth: 3,
    borderColor: "#e8c777",
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderColor: "#ffd75e",
    shadowColor: "#ffd75e",
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  homePin: {
    position: "absolute",
    backgroundColor: "#fff1c9",
    borderWidth: 3,
    borderColor: "#7a4a1e",
    alignItems: "center",
    justifyContent: "center",
  },
  plaqueText: { position: "absolute", alignItems: "center", justifyContent: "center", borderRadius: 4 },
  plaqueOn: { backgroundColor: "rgba(255,226,140,0.55)" },
  plaqueOff: { opacity: 0.7 },
  label: { color: "#3a2913", fontFamily: FONT.display, textAlign: "center", letterSpacing: 0.3 },
  caravan: { position: "absolute", transform: [{ scaleX: -1 }] },
});
