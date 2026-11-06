import React from "react";
import { Image, ImageSourcePropType, StyleSheet, View } from "react-native";
import bld00 from "../../assets/ui/town/bld00.webp";
import bld01 from "../../assets/ui/town/bld01.webp";
import bld02 from "../../assets/ui/town/bld02.webp";
import bld03 from "../../assets/ui/town/bld03.webp";
import bld04 from "../../assets/ui/town/bld04.webp";
import bld05 from "../../assets/ui/town/bld05.webp";
import bld06 from "../../assets/ui/town/bld06.webp";
import bld08 from "../../assets/ui/town/bld08.webp";
import bld09 from "../../assets/ui/town/bld09.webp";
import bld10 from "../../assets/ui/town/bld10.webp";
import bld11 from "../../assets/ui/town/bld11.webp";
import bld12 from "../../assets/ui/town/bld12.webp";
import bld13 from "../../assets/ui/town/bld13.webp";
import { FONT } from "../theme";
import { Text } from "./AppText";
import { GoldButton } from "./PanelKit";

/** The sent building paintings, one per upgrade / property (cut from the Town
 * sheet's cards). */
export const BUILDING_ART: Record<string, ImageSourcePropType> = {
  market: bld00,
  caravanserai: bld01,
  townhall: bld02,
  bank: bld03,
  guardTower: bld04,
  earthquakeFund: bld05,
  storageYard: bld06,
  landPlot: bld08,
  house: bld09,
  warehouse: bld10,
  farm: bld11,
  inn: bld12,
  mansion: bld13,
};

export const INK = "#3d2415";
export const INK_SOFT = "#5a3d22";
export const INK_GREEN = "#1f6b32";
export const INK_RED = "#a33f3a";

interface ItemCardProps {
  art?: ImageSourcePropType;
  fallbackIcon: string;
  name: string;
  /** small tag next to the name (level / owned) */
  tag?: string;
  description: string;
  effect?: string;
  /** level pips: [filled, total] */
  pips?: [number, number];
  buttonLabel: string;
  buttonDisabled: boolean;
  onPress: () => void;
}

/** One buildable thing on the parchment: its painting, what it does and the
 * gold price button. */
export function TownItemCard({
  art,
  fallbackIcon,
  name,
  tag,
  description,
  effect,
  pips,
  buttonLabel,
  buttonDisabled,
  onPress,
}: ItemCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.art}>
        {art ? (
          <Image source={art} style={styles.artImg} resizeMode="contain" accessibilityElementsHidden />
        ) : (
          <Text aria-hidden style={{ fontSize: 30 }}>
            {fallbackIcon}
          </Text>
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{name}</Text>
          {tag ? (
            <Text style={styles.tag} numberOfLines={1}>
              {tag}
            </Text>
          ) : null}
        </View>
        <Text style={styles.desc}>{description}</Text>
        {effect ? <Text style={styles.effect}>{effect}</Text> : null}
        {pips ? (
          <View style={styles.pipRow}>
            {Array.from({ length: pips[1] }).map((_, i) => (
              <View key={i} style={[styles.pip, i < pips[0] && styles.pipOn]} />
            ))}
          </View>
        ) : null}
      </View>
      <GoldButton label={buttonLabel} onPress={onPress} disabled={buttonDisabled} height={34} />
    </View>
  );
}

interface FactorRowProps {
  label: string;
  value: string;
  /** rises = pushes inflation / happiness up (red triangle); falls = relief */
  up: boolean;
  good: boolean;
}

/** A line of the inflation-factors list: a direction triangle, the cause and
 * its size. */
export function FactorRow({ label, value, up, good }: FactorRowProps) {
  const tone = good ? INK_GREEN : INK_RED;
  return (
    <View style={styles.factorRow}>
      <Text style={[styles.triangle, { color: tone }]}>{up ? "▲" : "▼"}</Text>
      <Text style={styles.factorLabel} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[styles.factorValue, { color: tone }]}>{value}</Text>
    </View>
  );
}

interface EventRowProps {
  tone: "good" | "bad" | "neutral";
  text: string;
  last: boolean;
}

const TONE_MARK = { good: "✅", bad: "⚠️", neutral: "ℹ️" } as const;

/** One line of the town's news, with a hairline rule under it like a ledger. */
export function EventRow({ tone, text, last }: EventRowProps) {
  return (
    <View style={[styles.eventRow, !last && styles.eventRule]}>
      <Text aria-hidden style={styles.eventMark}>
        {TONE_MARK[tone]}
      </Text>
      <Text style={styles.eventText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4dcab",
    borderWidth: 1,
    borderColor: "rgba(150,100,40,0.38)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingLeft: 6,
    paddingRight: 8,
    marginBottom: 6,
  },
  art: { width: 58, height: 52, alignItems: "center", justifyContent: "center", marginRight: 6 },
  artImg: { width: 58, height: 52 },
  body: { flex: 1, marginRight: 8 },
  titleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", columnGap: 8 },
  name: { color: INK, fontFamily: FONT.serif, fontSize: 14 },
  tag: { color: "#8a5a2b", fontFamily: FONT.bold, fontSize: 10 },
  desc: { color: INK_SOFT, fontFamily: FONT.medium, fontSize: 10.5, lineHeight: 14, marginTop: 1 },
  effect: { color: INK_GREEN, fontFamily: FONT.bold, fontSize: 10.5, lineHeight: 14, marginTop: 2 },
  pipRow: { flexDirection: "row", gap: 4, marginTop: 5 },
  pip: { width: 18, height: 6, borderRadius: 3, backgroundColor: "#3b2616" },
  pipOn: { backgroundColor: "#f2b630" },
  factorRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5 },
  triangle: { fontSize: 13, width: 22, textAlign: "center" },
  factorLabel: { flex: 1, color: INK, fontFamily: FONT.medium, fontSize: 12, marginRight: 8 },
  factorValue: { fontFamily: FONT.black, fontSize: 12.5 },
  eventRow: { flexDirection: "row", alignItems: "center", paddingVertical: 7 },
  eventRule: { borderBottomWidth: 1, borderBottomColor: "rgba(120,80,30,0.35)" },
  eventMark: { fontSize: 16, width: 26, textAlign: "center" },
  eventText: { flex: 1, color: INK, fontFamily: FONT.medium, fontSize: 12, lineHeight: 16 },
});
