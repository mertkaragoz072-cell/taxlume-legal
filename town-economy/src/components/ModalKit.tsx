import React, { useState } from "react";
import { Image, ImageSourcePropType, LayoutChangeEvent, StyleSheet, View } from "react-native";
import arrowL from "../../assets/ui/modal/arrow_l.webp";
import btnGCap from "../../assets/ui/modal/btn_g_cap.webp";
import btnGMid from "../../assets/ui/modal/btn_g_mid.webp";
import difBCap from "../../assets/ui/modal/dif_b_cap.webp";
import difBMid from "../../assets/ui/modal/dif_b_mid.webp";
import difGCap from "../../assets/ui/modal/dif_g_cap.webp";
import difGMid from "../../assets/ui/modal/dif_g_mid.webp";
import optGCap from "../../assets/ui/modal/opt_g_cap.webp";
import optGMid from "../../assets/ui/modal/opt_g_mid.webp";
import optRCap from "../../assets/ui/modal/opt_r_cap.webp";
import optRMid from "../../assets/ui/modal/opt_r_mid.webp";
import plCap from "../../assets/ui/modal/pl_cap.webp";
import plMid from "../../assets/ui/modal/pl_mid.webp";
import rowCap from "../../assets/ui/modal/row_cap.webp";
import rowMid from "../../assets/ui/modal/row_mid.webp";
import xClose from "../../assets/ui/modal/x_close.webp";
import { FONT } from "../theme";
import { Text } from "./AppText";
import { GradientFill } from "./GradientFill";
import { ScalePressable } from "./ScalePressable";

export type BarKind = "plate" | "btn" | "optG" | "optR" | "difG" | "difB" | "difR" | "row";

const BARS: Record<BarKind, { cap: ImageSourcePropType; mid: ImageSourcePropType; capW: number }> = {
  plate: { cap: plCap, mid: plMid, capW: 52 },
  btn: { cap: btnGCap, mid: btnGMid, capW: 36 },
  optG: { cap: optGCap, mid: optGMid, capW: 36 },
  optR: { cap: optRCap, mid: optRMid, capW: 36 },
  difG: { cap: difGCap, mid: difGMid, capW: 32 },
  difB: { cap: difBCap, mid: difBMid, capW: 32 },
  difR: { cap: optRCap, mid: optRMid, capW: 36 },
  row: { cap: rowCap, mid: rowMid, capW: 21 },
};
// the art's own heights (cap images are 3x of the sent 1x crop)
const BAR_ART_H: Record<BarKind, number> = {
  plate: 47,
  btn: 53,
  optG: 83,
  optR: 83,
  difG: 55,
  difB: 55,
  difR: 83,
  row: 48,
};

/** A painted bar of any width: left end cap, stretchy middle, mirrored right
 * end cap, all cut from the sent art. */
export function Bar({ kind, height, dim }: { kind: BarKind; height: number; dim?: boolean }) {
  const b = BARS[kind];
  const capW = Math.round((b.capW * height) / BAR_ART_H[kind]);
  return (
    <View style={[styles.barRow, { height, opacity: dim ? 0.5 : 1 }]} pointerEvents="none">
      <Image source={b.cap} style={{ width: capW, height }} resizeMode="stretch" />
      <Image source={b.mid} style={{ flex: 1, height }} resizeMode="stretch" />
      <Image
        source={b.cap}
        style={{ width: capW, height, transform: [{ scaleX: -1 }] }}
        resizeMode="stretch"
      />
    </View>
  );
}

// ----------------------------------------------------------------- shell

interface ShellProps {
  title: string;
  children: React.ReactNode;
  /** painted icon laid on the left end of the title plate */
  plateIcon?: ImageSourcePropType;
  /** big round medallion that crowns the frame (over the plate) */
  medallion?: ImageSourcePropType;
  onClose?: () => void;
  maxWidth?: number;
}

/** The sent modal frame: copper rim around dark walnut, painted title plate,
 * optional crowning medallion, round close button. The rim itself is drawn in
 * code (nested rounded layers); the plate, medallions, icons and the close
 * button are the sent art. */
export function ModalShell({
  title: rawTitle,
  children,
  plateIcon,
  medallion,
  onClose,
  maxWidth = 360,
}: ShellProps) {
  const [w, setW] = useState(340);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  // The plate carries painted art, so a leading emoji in the label would double it.
  const title = rawTitle.replace(/^[^\p{L}\p{N}]+/u, "");
  const plateH = 40;
  const iconW = plateIcon ? 34 : 0;
  const textW = Math.max(60, w - 80 - iconW);
  const size = Math.max(10, Math.min(18, (textW * 0.92) / (title.length * 0.84 + 1)));
  const crown = !!medallion;
  return (
    <View style={[styles.outer, { maxWidth, marginTop: crown ? 34 : 0 }]} onLayout={onLayout}>
      <View style={styles.rim1}>
        <View style={styles.rim2}>
          <View style={styles.rim3}>
            <View style={styles.body}>
              <GradientFill colors={["#4a2e1a", "#2c1a0f"]} x1="0" y1="0" x2="0" y2="1" />
              <View style={{ height: crown ? 28 : 12 }} />
              <View style={[styles.plateWrap, { height: plateH }]}>
                <Bar kind="plate" height={plateH} />
                {plateIcon ? (
                  <Image source={plateIcon} style={styles.plateIcon} resizeMode="contain" />
                ) : null}
                <View
                  style={[styles.plateText, { paddingLeft: iconW + 8, paddingRight: 8 }]}
                  pointerEvents="none"
                >
                  <Text
                    style={[styles.plateTitle, { fontSize: size }]}
                    numberOfLines={1}
                    accessibilityRole="header"
                  >
                    {title}
                  </Text>
                </View>
              </View>
              <View style={styles.content}>{children}</View>
            </View>
          </View>
        </View>
      </View>
      {crown ? <Image source={medallion} style={styles.medallion} resizeMode="contain" /> : null}
      {onClose ? (
        <ScalePressable onPress={onClose} style={styles.close} scaleTo={0.9} accessibilityLabel="Close">
          <Image source={xClose} style={{ width: 34, height: 34 }} resizeMode="contain" />
        </ScalePressable>
      ) : null}
    </View>
  );
}

// -------------------------------------------------------------- controls

/** Big green call-to-action (sent button art; label drawn). */
export function BigButton({
  label,
  onPress,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: ImageSourcePropType;
}) {
  return (
    <ScalePressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      scaleTo={0.96}
      style={styles.bigBtn}
    >
      <Bar kind="btn" height={46} dim={disabled} />
      <View style={styles.bigBtnLabel} pointerEvents="none">
        {icon ? (
          <Image source={icon} style={{ width: 26, height: 26, marginRight: 8 }} resizeMode="contain" />
        ) : null}
        <Text style={styles.bigBtnText} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </ScalePressable>
  );
}

interface OptionProps {
  kind: "optG" | "optR" | "difG" | "difB" | "difR";
  title: string;
  hint?: string;
  icon?: ImageSourcePropType;
  emoji?: string;
  tag?: string;
  disabled?: boolean;
  onPress: () => void;
  height?: number;
}

/** A choice bar: painted frame, icon on the left, title + hint on the right. */
export function OptionBar({ kind, title, hint, icon, emoji, tag, disabled, onPress, height }: OptionProps) {
  const h = height ?? (kind.startsWith("opt") ? 64 : 60);
  return (
    <ScalePressable
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.97}
      accessibilityLabel={`${title}${hint ? `. ${hint}` : ""}`}
      style={{ alignSelf: "stretch", height: h, marginBottom: 8 }}
    >
      <Bar kind={kind} height={h} dim={disabled} />
      <View style={[styles.optRow, { opacity: disabled ? 0.6 : 1 }]} pointerEvents="none">
        <View style={styles.optIcon}>
          {icon ? (
            <Image source={icon} style={{ width: 34, height: 34 }} resizeMode="contain" />
          ) : emoji ? (
            <Text style={styles.optEmoji}>{emoji}</Text>
          ) : null}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.optTitleRow}>
            <Text style={styles.optTitle} numberOfLines={1}>
              {title}
            </Text>
            {tag ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ) : null}
          </View>
          {hint ? (
            <Text style={styles.optHint} numberOfLines={2}>
              {hint}
            </Text>
          ) : null}
        </View>
      </View>
    </ScalePressable>
  );
}

/** Settings-style row on the sent brown bar. */
export function RowBar({
  label,
  icon,
  emoji,
  right,
  onPress,
  chevron = true,
  children,
}: {
  label: string;
  icon?: ImageSourcePropType;
  emoji?: string;
  right?: string;
  onPress: () => void;
  chevron?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <ScalePressable onPress={onPress} scaleTo={0.98} accessibilityLabel={label} style={styles.rowBar}>
      <Bar kind="row" height={44} />
      <View style={styles.rowInner} pointerEvents="none">
        <View style={styles.rowIconBox}>
          {icon ? (
            <Image source={icon} style={{ width: 26, height: 26 }} resizeMode="contain" />
          ) : (
            <Text style={styles.optEmoji}>{emoji}</Text>
          )}
        </View>
        <Text style={styles.rowLabel} numberOfLines={1}>
          {label}
        </Text>
        {right ? <Text style={styles.rowRight}>{right}</Text> : null}
        {children}
        {chevron ? <Text style={styles.chev}>›</Text> : null}
      </View>
    </ScalePressable>
  );
}

/** Small gold-ringed arrow button for carousels. */
export function ArrowButton({
  dir,
  onPress,
  disabled,
}: {
  dir: "left" | "right";
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <ScalePressable
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.9}
      accessibilityLabel={dir === "left" ? "Previous" : "Next"}
      style={{ width: 30, height: 30, opacity: disabled ? 0.35 : 1 }}
    >
      <Image
        source={arrowL}
        style={{ width: 30, height: 30, transform: [{ scaleX: dir === "right" ? -1 : 1 }] }}
        resizeMode="contain"
      />
    </ScalePressable>
  );
}

/** Cream parchment note (code-drawn, as the art's own parchment carries text). */
export function ParchmentNote({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.parchOuter}>
      <GradientFill colors={["#f4e6c0", "#e6d1a0"]} x1="0" y1="0" x2="0" y2="1" />
      <View style={styles.parchInner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  barRow: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row" },
  outer: { width: "100%", alignSelf: "center" },
  rim1: { borderRadius: 24, backgroundColor: "#5e3512", padding: 3 },
  rim2: { borderRadius: 21, backgroundColor: "#e0a057", padding: 2 },
  rim3: { borderRadius: 19, backgroundColor: "#a45f1f", padding: 2.5 },
  body: { borderRadius: 16, overflow: "hidden", paddingBottom: 16, paddingHorizontal: 14 },
  plateWrap: { alignSelf: "stretch", marginHorizontal: -4, justifyContent: "center" },
  plateIcon: { position: "absolute", left: 6, top: -8, width: 40, height: 52 },
  plateText: {
    position: "absolute",
    top: 0,
    bottom: 2,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  plateTitle: {
    color: "#f6e2a0",
    fontFamily: FONT.display,
    textAlign: "center",
    letterSpacing: 0.4,
    textShadowColor: "rgba(0,20,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  content: { marginTop: 12 },
  medallion: { position: "absolute", top: -36, alignSelf: "center", width: 88, height: 88 },
  close: { position: "absolute", top: -12, right: -8, width: 34, height: 34, zIndex: 5 },
  bigBtn: { alignSelf: "stretch", height: 46, marginTop: 6 },
  bigBtnLabel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 3,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  bigBtnText: {
    color: "#fff8e6",
    fontFamily: FONT.black,
    fontSize: 17,
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  optRow: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  optIcon: { width: 46, alignItems: "center", justifyContent: "center", marginRight: 8 },
  optEmoji: { fontSize: 26 },
  optTitleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  optTitle: { color: "#fff6dc", fontFamily: FONT.black, fontSize: 15 },
  optHint: { color: "#f0e2c4", fontFamily: FONT.medium, fontSize: 11.5, marginTop: 1 },
  tag: { backgroundColor: "#f4c43c", borderRadius: 9, paddingHorizontal: 7, paddingVertical: 1 },
  tagText: { color: "#4a2a0e", fontFamily: FONT.black, fontSize: 9.5 },
  rowBar: { alignSelf: "stretch", height: 44, marginBottom: 6 },
  rowInner: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 10 },
  rowIconBox: { width: 36, alignItems: "center", marginRight: 6 },
  rowLabel: { flex: 1, color: "#f6ead0", fontFamily: FONT.bold, fontSize: 15 },
  rowRight: { color: "#f4c43c", fontFamily: FONT.black, fontSize: 14, marginRight: 10 },
  chev: { color: "#f4c43c", fontFamily: FONT.black, fontSize: 24, lineHeight: 26, marginRight: 4 },
  parchOuter: {
    alignSelf: "stretch",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#c79a55",
    overflow: "hidden",
  },
  parchInner: { padding: 12 },
});
