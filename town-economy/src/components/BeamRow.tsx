import React from "react";
import { Image, StyleSheet, View } from "react-native";
import capLeft from "../../assets/ui/beams/cap_l.png";
import capRight from "../../assets/ui/beams/cap_r.png";
import mid from "../../assets/ui/beams/mid.png";

const BEAM_H = 40;
const CAP_W = Math.round((235 / 135) * BEAM_H);

/** A carved wooden beam running out of both sides of whatever is centred on
 * it (a section ribbon): vine-and-lantern ends, plain stretchy wood between,
 * cut from the Inventory title beam so every heading reads as hanging from
 * the same timber. The ribbon sits above the beam and tucks over its inner
 * ends. */
export function BeamRow({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Image source={capLeft} style={{ width: CAP_W, height: BEAM_H }} resizeMode="stretch" />
      <Image source={mid} style={[styles.mid, { height: BEAM_H, marginRight: -10 }]} resizeMode="stretch" />
      <View style={styles.center}>{children}</View>
      <Image source={mid} style={[styles.mid, { height: BEAM_H, marginLeft: -10 }]} resizeMode="stretch" />
      <Image source={capRight} style={{ width: CAP_W, height: BEAM_H }} resizeMode="stretch" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", width: "100%", height: BEAM_H },
  mid: { flex: 1, minWidth: 0 },
  center: { zIndex: 2, alignItems: "center", justifyContent: "center" },
});
