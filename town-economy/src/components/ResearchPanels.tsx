import React, { useState } from "react";
import { Image, LayoutChangeEvent, StyleSheet, View } from "react-native";
import wood1 from "../../assets/ui/research/wood1.webp";
import wood2 from "../../assets/ui/research/wood2.webp";
import wood3 from "../../assets/ui/research/wood3.webp";
import iron1 from "../../assets/ui/research/iron1.webp";
import iron2 from "../../assets/ui/research/iron2.webp";
import iron3 from "../../assets/ui/research/iron3.webp";
import cloth1 from "../../assets/ui/research/cloth1.webp";
import cloth2 from "../../assets/ui/research/cloth2.webp";
import cloth3 from "../../assets/ui/research/cloth3.webp";
import fish1 from "../../assets/ui/research/fish1.webp";
import fish2 from "../../assets/ui/research/fish2.webp";
import fish3 from "../../assets/ui/research/fish3.webp";
import wine1 from "../../assets/ui/research/wine1.webp";
import wine2 from "../../assets/ui/research/wine2.webp";
import wine3 from "../../assets/ui/research/wine3.webp";
import leather1 from "../../assets/ui/research/leather1.webp";
import leather2 from "../../assets/ui/research/leather2.webp";
import leather3 from "../../assets/ui/research/leather3.webp";
import banner from "../../assets/ui/research/banner.webp";
import bread1 from "../../assets/ui/research/bread1.webp";
import bread2 from "../../assets/ui/research/bread2.webp";
import bread3 from "../../assets/ui/research/bread3.webp";
import cardBot from "../../assets/ui/research/card_bot.webp";
import cardMid from "../../assets/ui/research/card_mid.webp";
import cardTop from "../../assets/ui/research/card_top.webp";
import lockArt from "../../assets/ui/research/lock.webp";
import milk1 from "../../assets/ui/research/milk1.webp";
import milk2 from "../../assets/ui/research/milk2.webp";
import milk3 from "../../assets/ui/research/milk3.webp";
import tabOff from "../../assets/ui/research/tab_off.webp";
import tabOn from "../../assets/ui/research/tab_on.webp";
import btnL from "../../assets/ui/town/btn_l.webp";
import btnM from "../../assets/ui/town/btn_m.webp";
import btnOffL from "../../assets/ui/town/btn_off_l.webp";
import btnOffM from "../../assets/ui/town/btn_off_m.webp";
import { FONT, PANEL_GAP } from "../theme";
import { Text } from "./AppText";
import { GOOD_IMAGES } from "../economy/goodImages";
import { GoodIcon } from "./GoodIcon";
import { ScalePressable } from "./ScalePressable";

const INK = "#3b2412";
const INK_SOFT = "#6a4a2c";
const GREEN = "#2c7a3a";
const RED = "#9a3a2a";

/** Hand-painted illustrations exist for these tech nodes only; every other
 * node falls back to its emoji. */
const NODE_ART: Record<string, number> = {
  bread_t1: bread1,
  bread_t2: bread2,
  bread_t3: bread3,
  milk_t1: milk1,
  milk_t2: milk2,
  milk_t3: milk3,
  wood_t1: wood1,
  wood_t2: wood2,
  wood_t3: wood3,
  iron_t1: iron1,
  iron_t2: iron2,
  iron_t3: iron3,
  cloth_t1: cloth1,
  cloth_t2: cloth2,
  cloth_t3: cloth3,
  fish_t1: fish1,
  fish_t2: fish2,
  fish_t3: fish3,
  wine_t1: wine1,
  wine_t2: wine2,
  wine_t3: wine3,
  leather_t1: leather1,
  leather_t2: leather2,
  leather_t3: leather3,
};

function useWidth(initial = 360): [number, (e: LayoutChangeEvent) => void] {
  const [w, setW] = useState(initial);
  return [w, (e) => setW(e.nativeEvent.layout.width)];
}

// -------------------------------------------------------------- banner

const BANNER_W = 1264;
const BANNER_H = 256;

/** The "Araştırma" banner: green plaque, open book and inkwell are painted;
 * the title and the one-line description are drawn. */
export function ResearchBanner({ title, note }: { title: string; note: string }) {
  const [w, onLayout] = useWidth();
  const s = w / BANNER_W;
  const box = (x: number, y: number, bw: number, bh: number) => ({
    position: "absolute" as const,
    left: x * s,
    top: y * s,
    width: bw * s,
    height: bh * s,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  });
  const titleSize = Math.min(78 * s, (420 * s * 0.94) / (title.length * 0.85 + 1));
  const noteSize = Math.max(9, Math.min(36 * s, (800 * s * 0.98 * 2) / (note.length * 0.52)));
  return (
    <View
      style={{ aspectRatio: BANNER_W / BANNER_H, alignSelf: "stretch", marginBottom: PANEL_GAP }}
      onLayout={onLayout}
    >
      <Image source={banner} style={styles.fill} resizeMode="stretch" />
      <View pointerEvents="none" style={box(215, 24, 430, 82)}>
        <Text
          style={[styles.bannerTitle, { fontSize: titleSize }]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>
      </View>
      <View pointerEvents="none" style={box(215, 138, 800, 92)}>
        <Text
          style={[styles.bannerNote, { fontSize: noteSize, lineHeight: noteSize * 1.25 }]}
          numberOfLines={3}
        >
          {note}
        </Text>
      </View>
    </View>
  );
}

// ------------------------------------------------------------- sidebar

interface GoodTabProps {
  goodId: string;
  icon: string;
  name: string;
  selected: boolean;
  width: number;
  /** "3/3" style progress shown under the name */
  progress: string;
  onPress: () => void;
}

/** One goods tab of the left column: dark wood when idle, lit green plaque
 * when selected. The art is the sent plaques with the old icon and word
 * erased; the real goods art and name are drawn. */
export function GoodTab({ goodId, icon, name, selected, width, progress, onPress }: GoodTabProps) {
  const height = Math.max(44, Math.round(width * 0.5));
  const iconSize = Math.round(height * 0.52);
  const textW = width - iconSize - 22;
  const size = Math.max(8, Math.min(height * 0.3, (textW * 0.96) / (name.length * 0.64)));
  return (
    <ScalePressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={name}
      scaleTo={0.96}
      style={{ width, height, marginBottom: 4 }}
    >
      <Image source={selected ? tabOn : tabOff} style={styles.fill} resizeMode="stretch" />
      <View style={[styles.tabRow, { paddingLeft: 9, paddingRight: 8 }]} pointerEvents="none">
        <GoodIcon id={goodId} fallback={icon} size={iconSize} style={{ marginRight: 5 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.tabName, { fontSize: size }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.tabProgress, { fontSize: Math.max(8, size * 0.78) }]} numberOfLines={1}>
            {progress}
          </Text>
        </View>
      </View>
    </ScalePressable>
  );
}

// ---------------------------------------------------------------- card

const CARD_ART_W = 466; // card art, in 1x mockup pixels
const CARD_CAP = 24;

interface ResearchCardProps {
  nodeId: string;
  goodId: string;
  /** 1-3, shown as pips when the card uses its good's picture */
  tier: number;
  icon: string;
  name: string;
  description: string;
  effects: string[];
  /** reason it can't be researched yet, if any */
  lockedText?: string;
  locked: boolean;
  researched: boolean;
  affordable: boolean;
  /** "Araştır (58 🪙)" */
  buttonLabel: string;
  researchedLabel: string;
  onResearch: () => void;
}

/** Parchment node card: stretchable painted frame, the node's art, its text
 * and effect lines, and the research button (gold / grey while blocked). */
export function ResearchCard(p: ResearchCardProps) {
  const [w, onLayout] = useWidth(270);
  const k = w / CARD_ART_W;
  const cap = CARD_CAP * k;
  const painted = NODE_ART[p.nodeId];
  // No hand-painted illustration for this node yet: use the good's own picture.
  const art = painted ?? (GOOD_IMAGES as Record<string, number | undefined>)[p.goodId];
  const disabled = p.researched || p.locked || !p.affordable;
  const narrow = w < 250;
  const artSize = painted ? (narrow ? 52 : 64) : narrow ? 42 : 52;

  const button = p.researched ? (
    <View style={styles.doneBadge}>
      <Text style={styles.doneText} numberOfLines={2}>
        {p.researchedLabel}
      </Text>
    </View>
  ) : (
    <ResearchButton label={p.buttonLabel} disabled={disabled} locked={p.locked} onPress={p.onResearch} />
  );

  return (
    <View style={{ alignSelf: "stretch", marginBottom: PANEL_GAP - 2 }} onLayout={onLayout}>
      <View style={{ width: "100%", height: cap }}>
        <Image source={cardTop} style={styles.fill} resizeMode="stretch" />
      </View>
      <View>
        <View style={styles.midFill} pointerEvents="none">
          <Image source={cardMid} style={styles.fill} resizeMode="stretch" />
        </View>
        <View
          style={[
            styles.cardBody,
            { paddingHorizontal: Math.max(8, cap * 0.5), opacity: p.locked ? 0.92 : 1 },
          ]}
        >
          <View style={[styles.artBox, { width: artSize, height: artSize }]}>
            {art ? (
              <Image source={art} style={{ width: artSize, height: artSize }} resizeMode="contain" />
            ) : (
              <Text style={{ fontSize: artSize * 0.7 }}>{p.icon}</Text>
            )}
            {!painted && art ? (
              <View style={styles.pips}>
                {[1, 2, 3].map((n) => (
                  <View key={n} style={[styles.pip, n <= p.tier && styles.pipOn]} />
                ))}
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName} numberOfLines={2}>
              {p.name}
            </Text>
            <Text style={styles.cardDesc}>{p.description}</Text>
            {p.effects.map((e) => (
              <Text key={e} style={styles.cardEffect}>
                {e}
              </Text>
            ))}
            {p.lockedText ? <Text style={styles.cardLocked}>{p.lockedText}</Text> : null}
            {narrow && <View style={{ alignSelf: "flex-end", marginTop: 6 }}>{button}</View>}
          </View>
          {!narrow && <View style={styles.btnCol}>{button}</View>}
        </View>
        {p.locked && !p.researched && (
          <Image
            source={lockArt}
            style={[styles.lock, { top: Math.max(4, cap * 0.35), right: Math.max(8, cap * 0.55) }]}
          />
        )}
      </View>
      <View style={{ width: "100%", height: cap }}>
        <Image source={cardBot} style={styles.fill} resizeMode="stretch" />
      </View>
    </View>
  );
}

const BTN_W = 70;
const BTN_H = 44;

/** Splits "Araştır (58 🪙)" into its word and its price so the button can
 * stack them like the mockup; any other shape stays on one line. */
function splitLabel(label: string): [string, string | null] {
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(label);
  return m ? [m[1], m[2]] : [label, null];
}

function ResearchButton({
  label,
  disabled,
  locked,
  onPress,
}: {
  label: string;
  disabled: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  const [word, price] = splitLabel(label);
  const size = Math.max(9, Math.min(13, (BTN_W - 14) / (Math.max(word.length, 6) * 0.64)));
  const content = (
    <>
      <Text
        style={[styles.btnWord, { fontSize: size, color: disabled ? "#5a5246" : "#4a2a0e" }]}
        numberOfLines={1}
      >
        {word}
      </Text>
      {price !== null && (
        <Text
          style={[styles.btnPrice, { fontSize: size, color: disabled ? "#5a5246" : "#4a2a0e" }]}
          numberOfLines={1}
        >
          {price}
        </Text>
      )}
    </>
  );
  const L = disabled ? btnOffL : btnL;
  const M = disabled ? btnOffM : btnM;
  return (
    <ScalePressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      scaleTo={0.94}
      style={{ width: BTN_W, height: BTN_H, opacity: locked ? 0.9 : 1 }}
    >
      <View style={{ flexDirection: "row", width: BTN_W, height: BTN_H }}>
        <Image source={L} style={{ width: 20, height: BTN_H }} resizeMode="stretch" />
        <Image source={M} style={{ flex: 1, height: BTN_H }} resizeMode="stretch" />
        <Image
          source={L}
          style={{ width: 20, height: BTN_H, transform: [{ scaleX: -1 }] }}
          resizeMode="stretch"
        />
      </View>
      <View pointerEvents="none" style={styles.btnLabel}>
        {content}
      </View>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  // Overlaps both caps by a pixel so no seam of wood shows between the slices.
  midFill: { position: "absolute", top: -1, bottom: -1, left: 0, right: 0 },
  bannerTitle: {
    color: "#f6e2a0",
    fontFamily: FONT.display,
    textAlign: "center",
    letterSpacing: 0.4,
    textShadowColor: "rgba(10,25,15,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bannerNote: { color: "#4a3320", fontFamily: FONT.medium, textAlign: "center" },
  tabRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  tabName: { color: "#f4ead2", fontFamily: FONT.bold },
  tabProgress: { color: "#d8c394", fontFamily: FONT.medium, opacity: 0.85 },
  cardBody: { flexDirection: "row", alignItems: "center", paddingVertical: 2, minHeight: 64 },
  artBox: { alignItems: "center", justifyContent: "center", marginRight: 8 },
  cardName: { color: INK, fontFamily: FONT.black, fontSize: 14, lineHeight: 17 },
  cardDesc: { color: INK_SOFT, fontFamily: FONT.medium, fontSize: 10.5, lineHeight: 13, marginTop: 2 },
  cardEffect: { color: GREEN, fontFamily: FONT.bold, fontSize: 10.5, marginTop: 3 },
  cardLocked: { color: RED, fontFamily: FONT.medium, fontSize: 10, lineHeight: 12, marginTop: 3 },
  pips: { position: "absolute", bottom: -5, flexDirection: "row", gap: 3 },
  pip: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(60,36,16,0.25)" },
  pipOn: { backgroundColor: "#c8842c" },
  btnCol: { marginLeft: 8, alignItems: "center", justifyContent: "center" },
  lock: { position: "absolute", width: 14, height: 16, resizeMode: "contain", opacity: 0.85 },
  btnLabel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  btnWord: { fontFamily: FONT.black, textAlign: "center" },
  btnPrice: { fontFamily: FONT.black, textAlign: "center", marginTop: 1 },
  doneBadge: {
    width: BTN_W,
    minHeight: 34,
    borderRadius: 9,
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: "rgba(63,150,80,0.22)",
    borderWidth: 1,
    borderColor: "rgba(44,122,58,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: { color: GREEN, fontFamily: FONT.bold, fontSize: 10, textAlign: "center" },
});
