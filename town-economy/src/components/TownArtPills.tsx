import React from "react";
import { StyleSheet, View } from "react-native";
import pill1 from "../../assets/ui/tradesheet/pill1.webp";
import pill1Plain from "../../assets/ui/tradesheet/pill1_plain.webp";
import pill2 from "../../assets/ui/tradesheet/pill2.webp";
import pill3 from "../../assets/ui/tradesheet/pill3.webp";
import { ForeignTown, TownId } from "../economy/towns";
import { FONT, PANEL_GAP } from "../theme";
import { Text } from "./AppText";
import { FixedPanel } from "./ImagePanels";
import { ScalePressable } from "./ScalePressable";

interface Art {
  plain: number;
  lit: number;
  aspect: number;
}

// One painted card per starter town, in the order the towns are defined
// (windmill village, mine castle, harbour). The first card's art carries a gold
// "selected" glow, so it has a plain twin for the unselected state; the other
// two get a drawn gold ring when selected.
const ART: Art[] = [
  { plain: pill1Plain, lit: pill1, aspect: 262 / 188 },
  { plain: pill2, lit: pill2, aspect: 248 / 179 },
  { plain: pill3, lit: pill3, aspect: 249 / 184 },
];

interface Props {
  towns: ForeignTown[];
  selectedTownId: TownId;
  onSelect: (id: TownId) => void;
  nameOf: (town: ForeignTown) => string;
  metaOf: (town: ForeignTown) => string;
}

/** Row of the three neighbour-town cards drawn on the sent card art. */
export function TownArtPills({ towns, selectedTownId, onSelect, nameOf, metaOf }: Props) {
  return (
    <View style={styles.row}>
      {towns.map((tn, i) => {
        const art = ART[i];
        if (!art) return null;
        const selected = tn.id === selectedTownId;
        const name = nameOf(tn);
        return (
          <ScalePressable
            key={tn.id}
            onPress={() => onSelect(tn.id)}
            accessibilityLabel={name}
            aria-selected={selected}
            style={{ flex: 1 }}
          >
            <FixedPanel source={selected ? art.lit : art.plain} aspect={art.aspect}>
              {(w) => (
                <>
                  {selected && i > 0 && (
                    <View
                      pointerEvents="none"
                      style={[styles.ring, { borderRadius: w * 0.085, borderWidth: Math.max(2, w * 0.025) }]}
                    />
                  )}
                  <View style={[styles.textBox, { top: "52%", paddingHorizontal: w * 0.07 }]}>
                    <Text
                      style={[
                        styles.name,
                        { fontSize: Math.max(10, Math.min(w * 0.115, (w * 0.86) / (name.length * 0.6))) },
                      ]}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                    <Text style={[styles.meta, { fontSize: Math.max(8, w * 0.082) }]} numberOfLines={2}>
                      {metaOf(tn)}
                    </Text>
                  </View>
                </>
              )}
            </FixedPanel>
          </ScalePressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, marginBottom: PANEL_GAP },
  ring: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderColor: "#ffd75e",
    shadowColor: "#ffd75e",
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  textBox: { position: "absolute", left: 0, right: 0, bottom: "8%", alignItems: "center" },
  name: { color: "#f6e2a0", fontFamily: FONT.display, textAlign: "center" },
  meta: { color: "#d9c39a", fontFamily: FONT.serif, textAlign: "center", marginTop: 2 },
});
