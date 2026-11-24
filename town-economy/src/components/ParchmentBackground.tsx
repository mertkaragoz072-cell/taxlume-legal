import React from "react";
import { Image, StyleSheet, View } from "react-native";
import bl from "../../assets/ui/parchment/bl.png";
import b from "../../assets/ui/parchment/b.png";
import br from "../../assets/ui/parchment/br.png";
import c from "../../assets/ui/parchment/c.png";
import l from "../../assets/ui/parchment/l.png";
import r from "../../assets/ui/parchment/r.png";
import t from "../../assets/ui/parchment/t.png";
import tl from "../../assets/ui/parchment/tl.png";
import tr from "../../assets/ui/parchment/tr.png";

/** Rendered size of each corner; the sheet's content should keep at least
 * this much padding so text never sits on the ornaments or the border. */
export const PARCHMENT_CORNER = 14;

/** The sent parchment sheet (textured paper, brown border, curled corner
 * ornaments) as a nine-slice that fills its parent: corners stay a fixed
 * size while the edges and the middle stretch, so the ornaments don't
 * distort whether the panel is short or tall. Sits behind the content. */
export function ParchmentBackground() {
  const corner = { width: PARCHMENT_CORNER, height: PARCHMENT_CORNER };
  return (
    <View style={[StyleSheet.absoluteFill, styles.col]} pointerEvents="none">
      <View style={[styles.row, { height: PARCHMENT_CORNER }]}>
        <Image source={tl} style={corner} resizeMode="stretch" />
        <Image source={t} style={styles.fill} resizeMode="stretch" />
        <Image source={tr} style={corner} resizeMode="stretch" />
      </View>
      <View style={[styles.row, styles.grow]}>
        <Image source={l} style={{ width: PARCHMENT_CORNER, height: "100%" }} resizeMode="stretch" />
        <Image source={c} style={styles.fill} resizeMode="stretch" />
        <Image source={r} style={{ width: PARCHMENT_CORNER, height: "100%" }} resizeMode="stretch" />
      </View>
      <View style={[styles.row, { height: PARCHMENT_CORNER }]}>
        <Image source={bl} style={corner} resizeMode="stretch" />
        <Image source={b} style={styles.fill} resizeMode="stretch" />
        <Image source={br} style={corner} resizeMode="stretch" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  col: { flexDirection: "column" },
  row: { flexDirection: "row" },
  grow: { flex: 1 },
  fill: { flex: 1, height: "100%" },
});
