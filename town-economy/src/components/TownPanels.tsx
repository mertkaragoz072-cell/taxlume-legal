import React, { useState } from "react";
import { Image, ImageSourcePropType, LayoutChangeEvent, StyleSheet, View } from "react-native";
import bankArt from "../../assets/ui/town/bank.webp";
import chartArt from "../../assets/ui/town/chart.webp";
import happyArt from "../../assets/ui/town/happy.webp";
import moodArt from "../../assets/ui/town/mood.webp";
import rankArt from "../../assets/ui/town/rank.webp";
import taxArt from "../../assets/ui/town/tax.webp";
import { FONT, PANEL_GAP } from "../theme";
import { Text } from "./AppText";
import { ScalePressable } from "./ScalePressable";
import { SheetHeader } from "./SheetHeader";

const INK = "#3d2415";
const INK_SOFT = "#5a3d22";
const GOLD = "#f6e2a0";
const CREAM = "#f3e3b5";

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
  icon: string;
  /** "Next: Metropolis" */
  nextText: string;
  /** "198K / 300K" */
  progressText: string;
  /** 0..1 progress inside the current tier */
  pct: number;
  /** the rank's own colour for the bar and the title */
  accent: string;
}

/** The town's rank on the Town screen: the rank in a round gold-ringed medallion
 * with its name big beside it, then a thick bar with the figures on it and the
 * next rank's name under it. */
export function RankPanel({ label, title, icon, nextText, progressText, pct, accent }: RankProps) {
  const fill = Math.max(0, Math.min(1, pct));
  return (
    <Painted title={label} banner={84} source={rankArt} artW={853} artH={247}>
      {(s) => (
        <>
          <View
            style={[
              box(s, 322, 66, 92, 92),
              styles.center,
              {
                borderRadius: 46 * s,
                backgroundColor: "#3a2616",
                borderWidth: Math.max(2, 4 * s),
                borderColor: "#d9a548",
              },
            ]}
          >
            <Text aria-hidden style={{ fontSize: 50 * s }}>
              {icon}
            </Text>
          </View>
          <View style={[box(s, 432, 62, 380, 100), { justifyContent: "center" }]}>
            <Text
              style={[styles.display, { color: INK, fontSize: fit(title, 380, 54, 0.86) * s }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text style={[styles.rankNext, { fontSize: 24 * s }]} numberOfLines={1}>
              {nextText}
            </Text>
          </View>
          <View
            style={[
              box(s, 322, 176, 490, 30),
              {
                borderRadius: 15 * s,
                overflow: "hidden",
                backgroundColor: "#4a3320",
                borderWidth: Math.max(1, 2 * s),
                borderColor: "#2a190c",
                justifyContent: "center",
              },
            ]}
          >
            <View
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${fill * 100}%`,
                minWidth: fill > 0 ? 14 * s : 0,
                backgroundColor: accent,
                borderRadius: 15 * s,
              }}
            />
            <Text style={[styles.rankBar, { fontSize: 19 * s }]} numberOfLines={1}>
              {progressText}
            </Text>
          </View>
        </>
      )}
    </Painted>
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
  return (
    <Painted title={label} banner={80} source={moodArt} artW={853} artH={200}>
      {(s) => (
        <>
          {/* The art's own face is painted out; the live mood sits on a round
              wood-and-gold badge in its place. */}
          <View
            style={[
              box(s, 112 - 50, 122 - 50, 100, 100),
              styles.center,
              {
                borderRadius: 50 * s,
                backgroundColor: "#3a2616",
                borderWidth: Math.max(2, 4 * s),
                borderColor: "#c99a3a",
              },
            ]}
          >
            <Text aria-hidden style={{ fontSize: 58 * s }}>
              {emoji}
            </Text>
          </View>
          <View style={[box(s, 205, 72, 285, 86), { justifyContent: "center" }]}>
            <Text
              style={[styles.display, { color: CREAM, fontSize: fit(mood, 280, 46, 0.86) * s }]}
              numberOfLines={1}
            >
              {mood}
            </Text>
          </View>
          <View style={[box(s, 490, 62, 175, 60), { alignItems: "flex-end", justifyContent: "center" }]}>
            <Text
              style={[styles.black, { color: GOLD, fontSize: fit(index, 175, 50, 0.6) * s }]}
              numberOfLines={1}
            >
              {index}
            </Text>
          </View>
          <View style={[box(s, 440, 120, 225, 40), { alignItems: "flex-end", justifyContent: "center" }]}>
            <Text
              style={[styles.small, { color: "#d8c690", fontSize: fit(indexLabel, 225, 24) * s }]}
              numberOfLines={1}
            >
              {indexLabel}
            </Text>
          </View>
        </>
      )}
    </Painted>
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
  return (
    <Painted title={label} banner={84} source={happyArt} artW={853} artH={267}>
      {(s) => (
        <>
          <View style={[box(s, 292, 70, 340, 80), { flexDirection: "row", alignItems: "center" }]}>
            <Text aria-hidden style={{ fontSize: 44 * s, marginRight: 10 * s }}>
              {emoji}
            </Text>
            <Text
              style={[
                styles.display,
                { color: INK, fontSize: fit(status, 265, 44, 0.86) * s, flexShrink: 1 },
              ]}
              numberOfLines={1}
            >
              {status}
            </Text>
          </View>
          <View style={[box(s, 636, 66, 140, 84), { alignItems: "flex-end", justifyContent: "center" }]}>
            <Text style={[styles.black, { color: INK, fontSize: 50 * s }]} numberOfLines={1}>
              {Math.round(value)}
            </Text>
            <Text style={[styles.small, { fontSize: 22 * s }]} numberOfLines={1}>
              {outOf}
            </Text>
          </View>
          <View style={[box(s, 288, 168, 477, 19), { borderRadius: 10 * s, overflow: "hidden" }]}>
            <View
              style={{
                width: `${Math.max(0, Math.min(100, value))}%`,
                height: "100%",
                backgroundColor: color,
                borderRadius: 10 * s,
              }}
            />
          </View>
        </>
      )}
    </Painted>
  );
}

// ---------------------------------------------------------------- Tax

const TAX_WELLS = [
  [68, 112],
  [190, 110],
  [311, 110],
  [433, 110],
  [554, 110],
  [675, 111],
];

interface TaxProps {
  title: string;
  rateLabel: string;
  description: string;
  income: string;
  rates: { label: string; selected: boolean; onPress: () => void }[];
}

export function TaxPanel({ title, rateLabel, description, income, rates }: TaxProps) {
  return (
    <Painted title={title} banner={96} source={taxArt} artW={852} artH={535}>
      {(s) => (
        <>
          <View style={[box(s, 360, 92, 425, 182), { justifyContent: "center" }]}>
            <Text
              style={[
                styles.body,
                {
                  color: INK_SOFT,
                  fontSize: fitBlock(description, 425, 182, 28) * s,
                  lineHeight: fitBlock(description, 425, 182, 28) * s * 1.28,
                },
              ]}
            >
              {description}
            </Text>
          </View>
          <View style={[box(s, 80, 294, 160, 36), styles.center]}>
            <Text style={[styles.chip, { fontSize: fit(rateLabel, 150, 22, 0.84) * s }]} numberOfLines={1}>
              {rateLabel}
            </Text>
          </View>
          {rates.map((r, i) => (
            <Well
              key={i}
              s={s}
              x={TAX_WELLS[i][0]}
              y={341}
              w={TAX_WELLS[i][1]}
              h={65}
              label={r.label}
              selected={r.selected}
              onPress={r.onPress}
            />
          ))}
          <View style={[box(s, 150, 428, 628, 70), { justifyContent: "center" }]}>
            <Text
              style={[
                styles.body,
                { color: INK, fontFamily: FONT.bold, fontSize: fit(income, 620, 30, 0.58) * s },
              ]}
              numberOfLines={1}
            >
              {income}
            </Text>
          </View>
        </>
      )}
    </Painted>
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
  rankNext: { color: INK_SOFT, fontFamily: FONT.bold },
  rankBar: {
    color: "#fff6d8",
    fontFamily: FONT.black,
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
