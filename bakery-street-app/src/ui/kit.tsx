// The small building blocks of every panel: sheet, card, button, bar, chip, pips. Sizes are multiples of the UI unit (see theme.ts).
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { ASSET_MODULES } from "../generated/assetModules";
import { C, FONT, fs, navHeight, useU } from "./theme";
import { Rich } from "./icons";

export type Variant = "go" | "alt" | "lack" | "busy" | "plain";

export function Btn({ label, sub, variant = "go", onPress, disabled, small, style }: {
  label: string; sub?: string; variant?: Variant; onPress?: () => void; disabled?: boolean; small?: boolean; style?: any;
}) {
  const u = useU();
  const off = disabled || variant === "busy";
  const pal = off ? { top: C.vanilla, bot: C.vanillaDark, edge: C.brownSoft, shadow: C.brownSoft, text: C.brownSoft }
    : variant === "alt" ? { top: C.honeyLight, bot: C.honey, edge: C.honeyDark, shadow: C.brown, text: C.brownDark }
    : variant === "lack" ? { top: C.terracottaLight, bot: C.terracotta, edge: C.terracottaDark, shadow: C.terracottaDark, text: C.paper }
    : variant === "plain" ? { top: C.creamLight, bot: C.cream, edge: C.brown, shadow: C.brownDark, text: C.brownDark }
    : { top: C.greenLight, bot: C.green, edge: C.greenDeep, shadow: C.greenDeep, text: C.paper };
  const h = Math.max(44, u * (small ? 6.2 : 7));
  return (
    <Pressable onPress={off ? undefined : onPress} disabled={off && variant !== "lack"} accessibilityRole="button"
      style={({ pressed }) => [{ minWidth: Math.max(44, u * (small ? 7.5 : 14)), height: h, borderRadius: u * 2, borderWidth: u * 0.4, borderColor: pal.edge, overflow: "hidden", transform: [{ translateY: pressed ? u * 0.3 : 0 }] }, style]}>
      <LinearGradient colors={[pal.top, pal.bot]} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: u * 1.6 }}>
        <Text allowFontScaling={false} style={{ color: pal.text, fontFamily: FONT.bold, fontSize: fs(u, small ? 2.9 : 3.2) }} numberOfLines={1}>{label}</Text>
        {sub ? <Rich text={sub} size={fs(u, 2.2)} style={{ color: pal.text, marginTop: -u * 0.2 }} /> : null}
      </LinearGradient>
    </Pressable>
  );
}

export function Card({ left, children, right, tone, style }: { left?: React.ReactNode; children: React.ReactNode; right?: React.ReactNode; tone?: "open" | "locked" | "ready" | "danger"; style?: any }) {
  const u = useU();
  const { width, height } = useWindowDimensions();
  const portrait = height >= width;
  const bg = tone === "open" ? C.greenPale : tone === "ready" ? C.creamLight : tone === "locked" ? C.cream : tone === "danger" ? C.terracottaPale : C.paper;
  const edge = tone === "open" ? C.green : tone === "ready" ? C.green : tone === "danger" ? C.terracottaLight : C.honeyLight;
  const frame = { padding: u * 1.3, borderRadius: u * 2, backgroundColor: bg, borderWidth: u * 0.3, borderColor: edge, opacity: tone === "locked" ? 0.8 : 1 };
  const main = (
    <>
      {left ? <View style={{ width: u * 10, alignItems: "center" }}>{left}</View> : null}
      <View style={{ flex: 1, gap: u * 0.7 }}>{children}</View>
    </>
  );
  // portrait: the card's action (button) goes under the text, full width, so the text keeps the whole row
  if (portrait && right) {
    return (
      <View style={[{ gap: u * 1.1 }, frame, style]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: u * 1.6 }}>{main}</View>
        <View style={{ alignItems: "stretch" }}>{right}</View>
      </View>
    );
  }
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: u * 1.6 }, frame, style]}>{main}{right}</View>;
}

/** The title line of a card: name on the left, a small muted note on the right. */
export function Title({ name, note }: { name: string; note?: string }) {
  const u = useU();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: u }}>
      <Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 3.3), flexShrink: 1 }}>{name}</Text>
      {note ? <Text allowFontScaling={false} style={{ color: C.honeyDark, fontFamily: FONT.regular, fontSize: fs(u, 2.5) }}>{note}</Text> : null}
    </View>
  );
}

export function Meta({ text, tone }: { text: string; tone?: "muted" | "reward" | "bad" | "ok" | "next" }) {
  const u = useU();
  const color = tone === "muted" ? C.honeyDark : tone === "bad" ? C.terracottaDark : tone === "ok" ? C.greenDark : tone === "next" ? C.honeyDark : C.brownDark;
  return <Rich text={text} size={fs(u, 2.4)} style={{ color }} />;
}

export function Chip({ text, ok }: { text: string; ok: boolean }) {
  const u = useU();
  return (
    <View style={{ paddingHorizontal: u, paddingVertical: u * 0.3, borderRadius: 99, borderWidth: u * 0.25, backgroundColor: ok ? C.greenPale : C.terracottaPale, borderColor: ok ? C.greenLight : C.terracottaLight }}>
      <Rich text={text} size={fs(u, 2.3)} style={{ color: ok ? C.brownDark : C.terracottaDark }} />
    </View>
  );
}

export function Bar({ value, text, color }: { value: number; text?: string; color?: string }) {
  const u = useU();
  return (
    <View style={{ height: u * 3.4, borderRadius: 99, backgroundColor: C.brown, borderWidth: u * 0.25, borderColor: C.brownDark, overflow: "hidden", justifyContent: "center" }}>
      <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: color ?? C.green }} />
      {text ? <Text allowFontScaling={false} style={{ textAlign: "center", color: C.paper, fontFamily: FONT.bold, fontSize: fs(u, 2.2) }}>{text}</Text> : null}
    </View>
  );
}

export function Pips({ level, max }: { level: number; max: number }) {
  const u = useU();
  return (
    <View style={{ flexDirection: "row", gap: u * 0.5 }}>
      {Array.from({ length: max }, (_, i) => <View key={i} style={{ flex: 1, height: u * 1.1, borderRadius: 99, backgroundColor: i < level ? C.green : C.vanillaDark, maxWidth: u * 6 }} />)}
    </View>
  );
}

/** A side panel: title row with an optional close button, a hint line and a scrolling body. `side` picks which edge it sticks to. */
export function Sheet({ title, hint, onClose, side = "right", lowered, children }: { title: string; hint?: string; onClose?: () => void; side?: "left" | "right"; lowered?: boolean; children: React.ReactNode }) {
  const u = useU();
  const { width, height } = useWindowDimensions();
  const portrait = height >= width;
  // portrait: a bottom sheet above the fixed navigation bar (about half of the screen, so the cafe stays visible above it) in the picture frame
  // (wood border, cream inside, paw crest); wide windows keep the old plain side panel
  const place = portrait
    ? { left: u * 1, right: u * 1, bottom: navHeight(u) + u * 1.6, height: Math.min(height * 0.54, u * 150) }
    : { top: u * 12.8, bottom: lowered ? u * 11 : u * 1.4, width: Math.min(u * 78, width * 0.48), ...(side === "left" ? { left: u * 1.4 } : { right: u * 1.4 }) };
  const inner = (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: u * 2.2, paddingTop: portrait ? 0 : u * 1.6, paddingBottom: u * 0.6 }}>
        <Rich text={title} size={fs(u, 4)} style={{ color: C.brownDark, fontFamily: FONT.bold }} />
        {onClose ? (
          <Pressable onPress={onClose} accessibilityLabel="Kapat" style={{ width: Math.max(44, u * 6), height: Math.max(44, u * 6), alignItems: "center", justifyContent: "center", marginRight: -u * 0.8 }}>
            <Image source={ASSET_MODULES["assets/icons/ui-close.webp"]} style={{ width: Math.max(40, u * 7.4), height: Math.max(40, u * 7.4) * (144 / 140), resizeMode: "contain" }} />
          </Pressable>
        ) : null}
      </View>
      {hint ? <Rich text={hint} size={fs(u, 2.5)} style={{ color: C.brown, paddingHorizontal: u * 2.2, paddingBottom: u }} /> : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: u * 1.6, paddingBottom: u * 1.6, gap: u * 1.2 }}>{children}</ScrollView>
    </>
  );
  const shadow = { shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: u * 2, shadowOffset: { width: 0, height: u }, elevation: 8 };
  if (portrait) {
    return (
      <View style={[{ position: "absolute", zIndex: 20 }, place, shadow]}>
        <Image source={ASSET_MODULES["assets/icons/ui-card.webp"]} resizeMode="stretch" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, width: "100%", height: "100%" }} />
        <View style={{ flex: 1, paddingTop: Math.round(u * 8.6), paddingBottom: Math.round(u * 3.6), paddingHorizontal: Math.round(u * 3.2) }}>{inner}</View>
      </View>
    );
  }
  return (
    <View style={[{ position: "absolute", borderRadius: u * 3, borderWidth: u * 0.5, borderColor: C.brown, backgroundColor: C.vanilla, overflow: "hidden", zIndex: 20 }, place, shadow]}>{inner}</View>
  );
}

export const row = StyleSheet.create({ wrap: { flexDirection: "row", flexWrap: "wrap", gap: 4 } });
