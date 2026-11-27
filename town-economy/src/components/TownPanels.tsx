import React, { useState } from "react";
import { Image, ImageSourcePropType, LayoutChangeEvent, StyleSheet, View } from "react-native";
import bankArt from "../../assets/ui/town/bank.webp";
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

/** Lettering size (in art pixels) that keeps `text` inside `boxW` however wide
 * the phone's font runs. */
function fit(text: string, boxW: number, maxSize: number, em = 0.62): number {
  return Math.max(10, Math.min(maxSize, (boxW * 0.94) / (Math.max(1, text.length) * em)));
}

/** Largest size (art px) at which `text` wraps to fit a `boxW` x `boxH` block;
 * phone letters average ~0.52em. */
function fitBlock(
  text: string,
  boxW: number,
  boxH: number,
  maxSize: number,
  minSize = 14,
  lh = 1.28
): number {
  let size = maxSize;
  while (size > minSize && Math.ceil((text.length * 0.52 * size) / boxW) * size * lh > boxH) size -= 0.5;
  return size;
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

/** A selectable (or plain) dark/gold slot, drawn like the sent art's wells. */
function Well({
  s,
  x,
  y,
  w,
  h,
  label,
  selected,
  onPress,
  ariaLabel,
}: {
  s: number;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  selected?: boolean;
  onPress?: () => void;
  ariaLabel?: string;
}) {
  const inner = (
    <View
      style={[
        styles.well,
        selected ? styles.wellOn : styles.wellOff,
        { borderRadius: 14 * s, borderWidth: Math.max(1.5, 2.5 * s) },
      ]}
    >
      <Text
        style={[
          selected ? styles.wellTextOn : styles.wellTextOff,
          { fontSize: fit(label, w - 16, h * 0.42, 0.6) * s },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
  if (!onPress) return <View style={box(s, x, y, w, h)}>{inner}</View>;
  return (
    <ScalePressable
      onPress={onPress}
      accessibilityLabel={ariaLabel ?? label}
      aria-selected={selected}
      style={box(s, x, y, w, h)}
      scaleTo={0.96}
    >
      {inner}
    </ScalePressable>
  );
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

const BANK_WELLS = [
  [65, 173],
  [248, 172],
  [435, 171],
  [619, 173],
];
const BANK_PILLS = [
  [58, 235],
  [311, 234],
  [562, 234],
];

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
    <Painted title={title} banner={100} source={bankArt} artW={852} artH={612}>
      {(s) => (
        <>
          <View style={[box(s, 388, 90, 410, cap ? 150 : 190), { justifyContent: "center" }]}>
            <Text
              style={[
                styles.body,
                {
                  color: INK_SOFT,
                  fontSize: fitBlock(description, 410, cap ? 150 : 190, 27) * s,
                  lineHeight: fitBlock(description, 410, cap ? 150 : 190, 27) * s * 1.28,
                },
              ]}
            >
              {description}
            </Text>
          </View>
          {cap ? (
            <View style={[box(s, 388, 244, 410, 44), { justifyContent: "center" }]}>
              <Text
                style={[
                  styles.body,
                  { color: "#1f6b32", fontFamily: FONT.bold, fontSize: fit(cap, 410, 28, 0.58) * s },
                ]}
                numberOfLines={1}
              >
                {cap}
              </Text>
            </View>
          ) : null}
          <View style={[box(s, 80, 312, 150, 36), styles.center]}>
            <Text style={[styles.chip, { fontSize: fit(chipLabel, 150, 22, 0.84) * s }]} numberOfLines={1}>
              {chipLabel}
            </Text>
          </View>
          {terms?.map((t, i) => (
            <Well
              key={i}
              s={s}
              x={BANK_WELLS[i][0]}
              y={358}
              w={BANK_WELLS[i][1]}
              h={67}
              label={t.label}
              selected={t.selected}
              onPress={t.onPress}
            />
          ))}
          {info ? (
            <>
              <Well s={s} x={65} y={358} w={356} h={67} label={info[0]} />
              <Well s={s} x={435} y={358} w={357} h={67} label={info[1]} />
            </>
          ) : null}
          {rateLine ? (
            <View style={[box(s, 70, 434, 712, 44), styles.center]}>
              <Text
                style={[styles.body, { color: INK_SOFT, fontSize: fitBlock(rateLine, 700, 44, 26) * s }]}
                numberOfLines={2}
              >
                {rateLine}
              </Text>
            </View>
          ) : null}
          {pills.map((p, i) => (
            <ScalePressable
              key={i}
              onPress={p.onPress}
              accessibilityLabel={p.label}
              style={box(s, BANK_PILLS[i][0], 487, BANK_PILLS[i][1], 95)}
              scaleTo={0.96}
            >
              <View style={[styles.pillText, { left: 112 * s, right: 8 * s }]}>
                <Text
                  style={[styles.black, { color: "#4a2a0e", fontSize: fit(p.label, 118, 30, 0.74) * s }]}
                  numberOfLines={1}
                >
                  {p.label}
                </Text>
              </View>
            </ScalePressable>
          ))}
        </>
      )}
    </Painted>
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
