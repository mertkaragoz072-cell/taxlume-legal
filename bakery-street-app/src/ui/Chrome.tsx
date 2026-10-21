// The always-visible UI: the top bar (level, gold, quick buttons), the bottom menu on the street, the back button and the toast.
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useRefresh, useWorld } from "../runtime/context";
import { GameIcon } from "./icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, FONT, fmt, fs, useU } from "./theme";

const Pill = ({ children, style, u }: { children: React.ReactNode; style?: any; u: number }) => (
  <View style={[{ height: u * 7.2, borderRadius: u * 3.6, borderWidth: u * 0.45, borderColor: C.brown, backgroundColor: C.cream, flexDirection: "row", alignItems: "center", shadowColor: C.brownDark, shadowOffset: { width: 0, height: u * 0.5 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 }, style]}>{children}</View>
);

/** Portrait top bar: one compact row over the wall (avatar + level, gold, three icon buttons). Labels stay as accessibility labels. */
export function Hud({ onOpen, badges }: { onOpen: (id: "quests" | "daily" | "settings") => void; badges: { quests: boolean; daily: boolean } }) {
  const { world } = useWorld();
  const { game, progression } = world, u = useU();
  useRefresh();
  const { width } = useWindowDimensions();
  const need = progression.xpToNext(progression.level), roomy = width >= 400, tileSize = Math.max(44, u * 11);
  const tile = (id: "quests" | "daily" | "settings", icon: string, label: string, badge: boolean) => (
    <Pressable key={id} onPress={() => onOpen(id)} accessibilityLabel={label} style={({ pressed }) => ({ width: tileSize, height: tileSize, borderRadius: u * 2.4, borderWidth: u * 0.45, borderColor: C.brown, backgroundColor: C.cream, alignItems: "center", justifyContent: "center", transform: [{ translateY: pressed ? u * 0.3 : 0 }], shadowColor: C.brownDark, shadowOffset: { width: 0, height: u * 0.5 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 })}>
      <GameIcon id={icon} size={u * 6.6} />
      {badge ? <View style={{ position: "absolute", right: -u * 0.6, top: -u * 0.8, width: u * 3.1, height: u * 3.1, borderRadius: 99, backgroundColor: C.terracotta, borderWidth: u * 0.3, borderColor: C.paper }} /> : null}
    </Pressable>
  );
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: 0, flexDirection: "row", alignItems: "center", paddingTop: u * 1, paddingHorizontal: u * 1.6, gap: u * 1.4 }}>
      <Pill u={u} style={{ height: u * 9, borderRadius: u * 4.5, paddingLeft: u * 9.6, paddingRight: u * 2, flex: 1, minWidth: u * 20, maxWidth: u * 46, marginLeft: u * 3.2 }}>
        <View style={{ position: "absolute", left: -u * 3.2, top: -u * 1, width: u * 11.4, height: u * 11.4, borderRadius: 99, borderWidth: u * 0.6, borderColor: C.brown, backgroundColor: C.cream, overflow: "hidden" }}>
          <GameIcon id="hud-avatar" size={u * 12.4} style={{ marginLeft: -u * 0.5, marginTop: u * 0.5 }} />
        </View>
        <View style={{ flex: 1, gap: u * 0.5 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: u }}>
            <Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 3.3) }}>Lv. {progression.level}</Text>
            {roomy ? <Text allowFontScaling={false} style={{ color: C.brown, fontFamily: FONT.regular, fontSize: fs(u, 2.2) }} numberOfLines={1}>{progression.isMax ? "MAX" : `${fmt(progression.xp)}/${fmt(need)}`}</Text> : null}
          </View>
          <View style={{ height: u * 1.5, borderRadius: 99, backgroundColor: C.brown, borderWidth: u * 0.25, borderColor: C.brownDark, overflow: "hidden" }}>
            <View style={{ width: `${Math.round(progression.fraction() * 100)}%`, height: "100%", backgroundColor: C.green }} />
          </View>
        </View>
      </Pill>
      <Pill u={u} style={{ height: u * 9, borderRadius: u * 4.5, minWidth: u * 19, paddingLeft: u * 6, paddingRight: u * 2, justifyContent: "center" }}>
        <GameIcon id="coin" size={u * 8.2} style={{ position: "absolute", left: -u * 1.6 }} />
        <Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 3.1), textAlign: "center", flex: 1 }} numberOfLines={1}>{fmt(game.gold)}</Text>
      </Pill>
      <View style={{ flexDirection: "row", gap: u * 0.9 }}>
        {tile("quests", "hud-quests", "Görevler", badges.quests)}
        {tile("daily", "hud-events", "Günlük Ödül", badges.daily)}
        {tile("settings", "hud-settings", "Ayarlar", false)}
      </View>
    </View>
  );
}

export type NavId = "cafe" | "town" | "explore" | "market";

/** Fixed bottom navigation: Fırın & Kafe, Kasaba, Keşif, Mağaza. Sits on a bar that reaches the screen's bottom edge (home indicator included). */
export function Nav({ active, onSelect, exploreBadge }: { active: NavId | null; onSelect: (id: NavId) => void; exploreBadge: boolean }) {
  const u = useU();
  const insets = useSafeAreaInsets();
  const btn = (id: NavId, icon: string, label: string) => (
    <Pressable key={id} onPress={() => onSelect(id)} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => ({ flex: 1, height: Math.max(52, u * 13.6), borderRadius: u * 2.4, borderWidth: u * 0.5, borderColor: active === id ? C.green : C.honeyLight, backgroundColor: active === id ? C.greenPale : C.creamLight, alignItems: "center", justifyContent: "center", gap: u * 0.2, transform: [{ translateY: pressed ? u * 0.3 : 0 }] })}>
      <GameIcon id={icon} size={u * 6.4} />
      <Text allowFontScaling={false} numberOfLines={1} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 3) }}>{label}</Text>
      {id === "explore" && exploreBadge ? <View style={{ position: "absolute", right: -u * 0.4, top: -u * 0.8, width: u * 3.1, height: u * 3.1, borderRadius: 99, backgroundColor: C.terracotta, borderWidth: u * 0.3, borderColor: C.paper }} /> : null}
    </Pressable>
  );
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: -insets.left, right: -insets.right, bottom: -insets.bottom, paddingBottom: insets.bottom + u * 1, paddingTop: u * 1.2, paddingHorizontal: u * 1.4 + Math.max(insets.left, insets.right), flexDirection: "row", gap: u * 1, backgroundColor: C.cream, borderTopWidth: u * 0.5, borderTopColor: C.brown }}>
      {btn("cafe", "nav-cafe", "Fırın & Kafe")}
      {btn("town", "nav-town", "Kasaba")}
      {btn("explore", "nav-explore", "Keşif")}
      {btn("market", "basket", "Mağaza")}
    </View>
  );
}

export function Toast({ text, seq }: { text: string; seq: number }) {
  const u = useU();
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (text) { o.setValue(1); } else Animated.timing(o, { toValue: 0, duration: 200, useNativeDriver: true }).start(); }, [text, seq, o]);
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", top: u * 12.4, alignSelf: "center", opacity: o, maxWidth: "90%", paddingHorizontal: u * 3.6, paddingVertical: u * 1.6, borderRadius: u * 3, borderWidth: u * 0.5, borderColor: C.brown, backgroundColor: C.cream, zIndex: 30 }}>
      <Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 3.8), textAlign: "center" }}>{text}</Text>
    </Animated.View>
  );
}
