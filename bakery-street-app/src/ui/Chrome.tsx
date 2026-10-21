// The always-visible UI: the top bar (level, gold, quick buttons), the bottom menu on the street, the back button and the toast.
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useRefresh, useWorld } from "../runtime/context";
import { GameIcon } from "./icons";
import { C, FONT, fmt, fs, useU } from "./theme";

const Pill = ({ children, style, u }: { children: React.ReactNode; style?: any; u: number }) => (
  <View style={[{ height: u * 7.2, borderRadius: u * 3.6, borderWidth: u * 0.45, borderColor: C.brown, backgroundColor: C.cream, flexDirection: "row", alignItems: "center", shadowColor: C.brownDark, shadowOffset: { width: 0, height: u * 0.5 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 }, style]}>{children}</View>
);

export function Hud({ onOpen, badges }: { onOpen: (id: "quests" | "daily" | "settings") => void; badges: { quests: boolean; daily: boolean } }) {
  const { world } = useWorld();
  const { game, progression } = world, u = useU();
  useRefresh();
  const { width } = useWindowDimensions();
  const need = progression.xpToNext(progression.level);
  const tile = (id: "quests" | "daily" | "settings", icon: string, label: string, badge: boolean) => (
    <Pressable key={id} onPress={() => onOpen(id)} accessibilityLabel={label} style={({ pressed }) => ({ width: Math.max(64, u * 10.4), height: Math.max(44, u * 10.4), borderRadius: u * 2.2, borderWidth: u * 0.45, borderColor: C.brown, backgroundColor: C.cream, alignItems: "center", justifyContent: "center", gap: u * 0.2, transform: [{ translateY: pressed ? u * 0.3 : 0 }] })}>
      <GameIcon id={icon} size={u * 5.6} />
      <Text style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 2.3) }} numberOfLines={1}>{label}</Text>
      {badge ? <View style={{ position: "absolute", right: -u, top: -u * 1.2, width: u * 3.1, height: u * 3.1, borderRadius: 99, backgroundColor: C.terracotta, borderWidth: u * 0.3, borderColor: C.paper }} /> : null}
    </Pressable>
  );
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: 0, flexDirection: "row", alignItems: "flex-start", paddingTop: u * 1.2, paddingHorizontal: u * 1.6, gap: u * 1.3 }}>
      <Pill u={u} style={{ paddingLeft: u * 8, minWidth: u * 24, marginLeft: u * 3.6, paddingRight: u * 2.2 }}>
        <View style={{ position: "absolute", left: -u * 3.6, top: -u * 1.2, width: u * 10.6, height: u * 10.6, borderRadius: 99, borderWidth: u * 0.6, borderColor: C.brown, backgroundColor: C.cream, overflow: "hidden" }}>
          <GameIcon id="hud-avatar" size={u * 11.5} style={{ marginLeft: -u * 0.5, marginTop: u * 0.5 }} />
        </View>
        <View style={{ flex: 1, gap: u * 0.7 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: u }}>
            <Text style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 3.3) }}>Lv. {progression.level}</Text>
            <Text style={{ color: C.brown, fontFamily: FONT.regular, fontSize: fs(u, 2.2) }}>{progression.isMax ? "MAX" : `${fmt(progression.xp)} / ${fmt(need)} XP`}</Text>
          </View>
          <View style={{ height: u * 1.5, borderRadius: 99, backgroundColor: C.brown, borderWidth: u * 0.25, borderColor: C.brownDark, overflow: "hidden" }}>
            <View style={{ width: `${Math.round(progression.fraction() * 100)}%`, height: "100%", backgroundColor: C.green }} />
          </View>
        </View>
      </Pill>
      <Pill u={u} style={{ minWidth: u * 18.5, paddingLeft: u * 7, paddingRight: u * 3, justifyContent: "center" }}>
        <GameIcon id="coin" size={u * 8.2} style={{ position: "absolute", left: -u * 1.6 }} />
        <Text style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 3.1), textAlign: "center", flex: 1 }}>{fmt(game.gold)}</Text>
      </Pill>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: "row", gap: u * 1.2 }}>
        {tile("quests", "hud-quests", "Görevler", badges.quests)}
        {tile("daily", "hud-events", "Günlük Ödül", badges.daily)}
        {tile("settings", "hud-settings", "Ayarlar", false)}
      </View>
    </View>
  );
}

export function Nav({ active, onSelect, exploreBadge }: { active: "cafe" | "town" | "explore"; onSelect: (id: "cafe" | "town" | "explore") => void; exploreBadge: boolean }) {
  const u = useU();
  const btn = (id: "cafe" | "town" | "explore", icon: string, label: string) => (
    <Pressable key={id} onPress={() => onSelect(id)} style={({ pressed }) => ({ width: Math.max(84, u * 21.5), height: Math.max(44, u * 13.6), borderRadius: u * 2.6, borderWidth: u * 0.5, borderColor: active === id ? C.honeyDark : C.brown, backgroundColor: active === id ? C.honeyLight : C.cream, alignItems: "center", justifyContent: "center", gap: u * 0.4, transform: [{ translateY: pressed ? u * 0.4 : 0 }], shadowColor: active === id ? "#ffc846" : C.brownDark, shadowOpacity: active === id ? 0.8 : 1, shadowRadius: active === id ? u * 2 : 0, shadowOffset: { width: 0, height: u * 0.6 }, elevation: 3 })}>
      <GameIcon id={icon} size={u * 7.2} />
      <Text style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 3) }}>{label}</Text>
      {id === "explore" && exploreBadge ? <View style={{ position: "absolute", right: -u, top: -u * 1.2, width: u * 3.1, height: u * 3.1, borderRadius: 99, backgroundColor: C.terracotta, borderWidth: u * 0.3, borderColor: C.paper }} /> : null}
    </Pressable>
  );
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: u * 1.1, flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: u * 1.4 }}>
      {btn("cafe", "nav-cafe", "Fırın & Kafe")}
      {btn("town", "nav-town", "Kasaba")}
      {btn("explore", "nav-explore", "Keşif")}
    </View>
  );
}

export function BackButton({ label, onPress }: { label: string; onPress: () => void }) {
  const u = useU();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ position: "absolute", left: u * 1.6, bottom: u * 1.4, zIndex: 21, height: Math.max(44, u * 8), paddingLeft: u * 2, paddingRight: u * 3, borderRadius: u * 4, borderWidth: u * 0.45, borderColor: C.brown, backgroundColor: C.cream, flexDirection: "row", alignItems: "center", gap: u, transform: [{ translateY: pressed ? u * 0.3 : 0 }] })}>
      <GameIcon id="hud-back" size={u * 5} />
      <Text style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 3.3) }}>{label}</Text>
    </Pressable>
  );
}

export function Toast({ text, seq }: { text: string; seq: number }) {
  const u = useU();
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (text) { o.setValue(1); } else Animated.timing(o, { toValue: 0, duration: 200, useNativeDriver: true }).start(); }, [text, seq, o]);
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", top: u * 11.5, alignSelf: "center", opacity: o, maxWidth: "90%", paddingHorizontal: u * 3.6, paddingVertical: u * 1.6, borderRadius: u * 3, borderWidth: u * 0.5, borderColor: C.brown, backgroundColor: C.cream, zIndex: 30 }}>
      <Text style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 3.8), textAlign: "center" }}>{text}</Text>
    </Animated.View>
  );
}
