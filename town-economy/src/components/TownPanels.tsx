import React, { useState } from "react";
import { Image, ImageSourcePropType, LayoutChangeEvent, StyleSheet, View } from "react-native";
import chartArt from "../../assets/ui/town/chart.webp";
import { FONT, PANEL_GAP } from "../theme";
import { Text } from "./AppText";
import { StretchPanel } from "./PanelKit";
import { ScalePressable } from "./ScalePressable";
import { SheetHeader } from "./SheetHeader";

const INK = "#3d2415";
const INK_SOFT = "#5a3d22";

/** "💰 Vergi Politikası" -> "Vergi Politikası": the painted banner has its own
 * medallion, so a leading emoji in the label would double up. */
export function plainTitle(s: string): string {
  return s.replace(/^[\p{Extended_Pictographic}️‍\s]+/u, "");
}

interface PaintedProps {
  source: ImageSourcePropType;
  artW: number;
  artH: number;
  /** the heading, drawn as the game's shared plaque over the painted banner */
  title: string;
  /** how much of the art's top (in art pixels) the painted banner takes up */
  banner: number;
  children: (s: number) => React.ReactNode;
}

/** Height of the heading plaque that covers the painted banner: the banners
 * are too small and sit crooked, so every panel wears the same plaque instead
 * and only the part of the art below it shows. */
const HEAD_H = 36;

/** A painted panel at its own aspect ratio; children are laid out in the art's
 * own pixels (they receive the px-per-art-px scale). */
function Painted({ source, artW, artH, title, banner, children }: PaintedProps) {
  const [w, setW] = useState(360);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const s = w / artW;
  const shift = HEAD_H - banner * s;
  return (
    <View
      style={{
        height: (artH - banner) * s + HEAD_H,
        alignSelf: "stretch",
        marginBottom: PANEL_GAP,
        overflow: "hidden",
      }}
      onLayout={onLayout}
    >
      <View style={{ position: "absolute", left: 0, right: 0, top: shift, height: artH * s }}>
        <Image source={source} style={styles.fill} resizeMode="stretch" />
        {children(s)}
      </View>
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, zIndex: 2 }}>
        <SheetHeader text={plainTitle(title)} height={HEAD_H} />
      </View>
    </View>
  );
}

function box(s: number, x: number, y: number, w: number, h: number) {
  return { position: "absolute" as const, left: x * s, top: y * s, width: w * s, height: h * s };
}

// ---------------------------------------------------------------- Rank

interface RankProps {
  label: string;
  title: string;
  /** "Next: Metropolis" */
  nextText: string;
  /** "198K / 300K" */
  progressText: string;
  /** 0..1 progress inside the current tier */
  pct: number;
  /** the rank's own colour for the bar */
  accent: string;
}

/** The town's rank on the Town screen, as lettering: the rank's name large between
 * two gold rules, the next rank spelled out under it, and a thick bar with the
 * figures on it. No picture: the name is the picture. */
export function RankPanel({ label, title, nextText, progressText, pct, accent }: RankProps) {
  const [w, setW] = useState(360);
  const fill = Math.max(0, Math.min(1, pct));
  const size = Math.max(18, Math.min(34, ((w - 70) * 0.94) / (Math.max(1, title.length) * 0.82)));
  return (
    <StretchPanel frame="upgrades" title={label}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={styles.rankBox}>
        <View style={styles.rankRuleRow}>
          <View style={styles.rankRule} />
          <Text aria-hidden style={styles.rankStar}>
            ✦
          </Text>
          <View style={styles.rankRule} />
        </View>
        <Text
          style={[styles.display, styles.rankTitle, { fontSize: size, lineHeight: size * 1.25 }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text style={styles.rankNext} numberOfLines={1}>
          {nextText}
        </Text>
        <View style={styles.rankTrack}>
          <View
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${fill * 100}%`,
              minWidth: fill > 0 ? 12 : 0,
              backgroundColor: accent,
              borderRadius: 10,
            }}
          />
          <Text style={styles.rankBar} numberOfLines={1}>
            {progressText}
          </Text>
        </View>
      </View>
    </StretchPanel>
  );
}

// ---------------------------------------------------------------- Mood

interface MoodProps {
  label: string;
  mood: string;
  emoji: string;
  index: string;
  indexLabel: string;
}

export function MoodPanel({ label, mood, emoji, index, indexLabel }: MoodProps) {
  const [w, setW] = useState(360);
  const size = Math.max(18, Math.min(30, ((w - 190) * 0.94) / (Math.max(1, mood.length) * 0.82)));
  return (
    <StretchPanel frame="upgrades" title={label}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={styles.moodLine}>
        <View style={styles.moodRow}>
          <Text aria-hidden style={styles.moodEmoji}>
            {emoji}
          </Text>
          <Text
            style={[styles.display, styles.moodTitle, { fontSize: size, lineHeight: size * 1.25 }]}
            numberOfLines={1}
          >
            {mood}
          </Text>
        </View>
        <View style={styles.indexCol}>
          <Text style={styles.indexValue} numberOfLines={1}>
            {index}
          </Text>
          <Text style={styles.indexLabel} numberOfLines={1}>
            {indexLabel}
          </Text>
        </View>
      </View>
    </StretchPanel>
  );
}

// ---------------------------------------------------------------- Happiness

interface HappyProps {
  label: string;
  status: string;
  emoji: string;
  /** 0..100 */
  value: number;
  outOf: string;
  color: string;
}

export function HappinessPanel({ label, status, emoji, value, outOf, color }: HappyProps) {
  const fill = Math.max(0, Math.min(100, value));
  return (
    <StretchPanel frame="upgrades" title={label}>
      <View style={styles.happyBox}>
        <View style={styles.happyHead}>
          <Text aria-hidden style={styles.moodEmoji}>
            {emoji}
          </Text>
          <Text style={[styles.display, styles.happyStatus]} numberOfLines={1}>
            {status}
          </Text>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.happyValue}>{Math.round(value)}</Text>
            <Text style={styles.indexLabel}>{outOf}</Text>
          </View>
        </View>
        <View style={styles.rankTrack}>
          <View
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${fill}%`,
              backgroundColor: color,
              borderRadius: 10,
            }}
          />
        </View>
      </View>
    </StretchPanel>
  );
}

// ---------------------------------------------------------------- Tax

interface TaxProps {
  title: string;
  rateLabel: string;
  description: string;
  income: string;
  rates: { label: string; selected: boolean; onPress: () => void }[];
}

export function TaxPanel({ title, rateLabel, description, income, rates }: TaxProps) {
  return (
    <StretchPanel frame="upgrades" title={title}>
      <View style={styles.taxBox}>
        <Text style={styles.taxDesc}>{description}</Text>
        <Text style={styles.taxRateLabel}>{rateLabel}</Text>
        <View style={styles.taxRates}>
          {rates.map((r, i) => (
            <ScalePressable
              key={i}
              onPress={r.onPress}
              accessibilityRole="button"
              accessibilityLabel={r.label}
              aria-selected={r.selected}
              style={[styles.taxChip, r.selected ? styles.taxChipOn : styles.taxChipOff]}
              scaleTo={0.94}
            >
              <Text style={r.selected ? styles.taxChipTextOn : styles.taxChipTextOff} numberOfLines={1}>
                {r.label}
              </Text>
            </ScalePressable>
          ))}
        </View>
        <Text style={styles.taxIncome}>{income}</Text>
      </View>
    </StretchPanel>
  );
}

// ---------------------------------------------------------------- Bank

interface BankProps {
  title: string;
  description: string;
  /** "Max credit: 185" under the description (no loan only) */
  cap?: string;
  chipLabel: string;
  /** term picker (no loan) */
  terms?: { label: string; selected: boolean; onPress: () => void }[];
  /** info slots (active loan) */
  info?: [string, string];
  rateLine?: string;
  pills: { label: string; onPress: () => void }[];
}

export function BankPanel({ title, description, cap, chipLabel, terms, info, rateLine, pills }: BankProps) {
  return (
    <StretchPanel frame="upgrades" title={title}>
      <View style={styles.taxBox}>
        <Text style={styles.taxDesc}>{description}</Text>
        {cap ? <Text style={styles.bankCap}>{cap}</Text> : null}
        <Text style={styles.taxRateLabel}>{chipLabel}</Text>
        {terms ? (
          <View style={styles.taxRates}>
            {terms.map((tm, i) => (
              <ScalePressable
                key={i}
                onPress={tm.onPress}
                accessibilityRole="button"
                accessibilityLabel={tm.label}
                aria-selected={tm.selected}
                style={[styles.taxChip, tm.selected ? styles.taxChipOn : styles.taxChipOff]}
                scaleTo={0.94}
              >
                <Text style={tm.selected ? styles.taxChipTextOn : styles.taxChipTextOff} numberOfLines={1}>
                  {tm.label}
                </Text>
              </ScalePressable>
            ))}
          </View>
        ) : null}
        {info ? (
          <View style={styles.taxRates}>
            {info.map((label, i) => (
              <View key={i} style={[styles.taxChip, styles.taxChipOff]}>
                <Text style={styles.taxChipTextOff} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {rateLine ? <Text style={styles.taxIncome}>{rateLine}</Text> : null}
        <View style={[styles.taxRates, { marginTop: 10 }]}>
          {pills.map((pl, i) => (
            <ScalePressable
              key={i}
              onPress={pl.onPress}
              accessibilityRole="button"
              accessibilityLabel={pl.label}
              style={[styles.taxChip, styles.taxChipOn]}
              scaleTo={0.94}
            >
              <Text style={styles.taxChipTextOn} numberOfLines={1}>
                {pl.label}
              </Text>
            </ScalePressable>
          ))}
        </View>
      </View>
    </StretchPanel>
  );
}

// ---------------------------------------------------------------- Chart

export function ChartPanel({
  title,
  children,
}: {
  title: string;
  children: (w: number, h: number) => React.ReactNode;
}) {
  return (
    <Painted title={title} banner={66} source={chartArt} artW={853} artH={214}>
      {(s) => (
        <>
          <View style={box(s, 62, 84, 750, 120)}>{children(750 * s, 120 * s)}</View>
        </>
      )}
    </Painted>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  center: { alignItems: "center", justifyContent: "center" },
  display: { fontFamily: FONT.display },
  happyBox: { paddingHorizontal: 6, paddingVertical: 2 },
  happyHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  happyStatus: { flex: 1, color: INK, fontSize: 24, letterSpacing: 1.5 },
  happyValue: { color: "#8a5a14", fontFamily: FONT.black, fontSize: 28, lineHeight: 32 },
  bankCap: { color: "#1f6b32", fontFamily: FONT.bold, fontSize: 14, marginTop: 6 },
  taxBox: { paddingHorizontal: 6, paddingVertical: 2 },
  taxDesc: { color: INK_SOFT, fontFamily: FONT.medium, fontSize: 14, lineHeight: 19 },
  taxRateLabel: { color: INK, fontFamily: FONT.bold, fontSize: 14, marginTop: 10, marginBottom: 6 },
  taxRates: { flexDirection: "row", gap: 6 },
  taxChip: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  taxChipOn: { backgroundColor: "#f5c85a", borderColor: "#3b2514" },
  taxChipOff: { backgroundColor: "#3b2514", borderColor: "#2a190c" },
  taxChipTextOn: { color: "#4a2a0e", fontFamily: FONT.black, fontSize: 14 },
  taxChipTextOff: { color: "#f1dcaa", fontFamily: FONT.bold, fontSize: 14 },
  taxIncome: { color: INK, fontFamily: FONT.bold, fontSize: 14, marginTop: 10 },
  moodLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  indexCol: { alignItems: "flex-end" },
  moodRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 },
  moodEmoji: { fontSize: 30 },
  moodTitle: { color: INK, letterSpacing: 2, flexShrink: 1 },
  indexRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 10,
    marginTop: 6,
    marginBottom: 2,
  },
  indexLabel: { color: INK_SOFT, fontFamily: FONT.bold, fontSize: 12 },
  indexValue: { color: "#8a5a14", fontFamily: FONT.black, fontSize: 26, lineHeight: 30 },
  rankBox: { alignItems: "center", paddingVertical: 4, paddingHorizontal: 6 },
  rankRuleRow: { flexDirection: "row", alignItems: "center", alignSelf: "stretch", gap: 8 },
  rankRule: { flex: 1, height: 2, borderRadius: 1, backgroundColor: "#c99a3a" },
  rankStar: { color: "#b8741a", fontSize: 14 },
  rankTitle: { color: INK, letterSpacing: 2, textAlign: "center", marginTop: 2 },
  rankNext: { color: INK_SOFT, fontFamily: FONT.bold, fontSize: 14, marginTop: 0, marginBottom: 8 },
  rankTrack: {
    alignSelf: "stretch",
    height: 22,
    borderRadius: 11,
    overflow: "hidden",
    backgroundColor: "#4a3320",
    borderWidth: 1.5,
    borderColor: "#2a190c",
    justifyContent: "center",
  },
  rankBar: {
    color: "#fff6d8",
    fontFamily: FONT.black,
    fontSize: 12,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  black: { fontFamily: FONT.black },
  small: { color: INK_SOFT, fontFamily: FONT.medium },
  body: { fontFamily: FONT.medium },
  chip: { color: "#f6e2a0", fontFamily: FONT.display, textAlign: "center" },
  well: { flex: 1, alignItems: "center", justifyContent: "center" },
  wellOn: { backgroundColor: "#f5c85a", borderColor: "#3b2514" },
  wellOff: { backgroundColor: "#3b2514", borderColor: "#2a190c" },
  wellTextOn: { color: "#4a2a0e", fontFamily: FONT.black },
  wellTextOff: { color: "#f1dcaa", fontFamily: FONT.bold },
  pillText: { position: "absolute", top: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
});
