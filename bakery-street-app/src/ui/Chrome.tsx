// The always-visible UI: the top bar (level, gold, quick buttons), the bottom menu on the street, the back button and the toast.
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, Text, View } from "react-native";
import { ASSET_MODULES } from "../generated/assetModules";
import { useRefresh, useWorld } from "../runtime/context";
import { GameIcon } from "./icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Present, useAppear } from "./kit";
import { C, FONT, fmt, fs, useU } from "./theme";

const Pill = ({ children, style, u }: { children: React.ReactNode; style?: any; u: number }) => (
  <View style={[{ height: u * 7.2, borderRadius: u * 3.6, borderWidth: u * 0.45, borderColor: C.brown, backgroundColor: C.cream, flexDirection: "row", alignItems: "center", shadowColor: C.brownDark, shadowOffset: { width: 0, height: u * 0.5 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 }, style]}>{children}</View>
);

const img = (id: string) => ASSET_MODULES[`assets/icons/${id}.webp`];

/** The number shown follows the real value over ~0.45 s (time based, so it does not depend on the frame rate; only this text re-renders). */
function Rolling({ value, style }: { value: number; style: any }) {
  const [shown, setShown] = useState(value);
  const cur = useRef(value);
  useEffect(() => {
    if (cur.current === value) return;
    const from = cur.current, t0 = Date.now();
    let raf = 0;
    const step = () => {
      const k = Math.min(1, (Date.now() - t0) / 450);
      cur.current = k >= 1 ? value : Math.round(from + (value - from) * (1 - Math.pow(1 - k, 3)));
      setShown(cur.current);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <Text allowFontScaling={false} style={style} numberOfLines={1}>{fmt(shown)}</Text>;
}

/** "+N" / "−N" that floats under a counter for a moment when its value changes (changes in quick succession add up). */
function GainPop({ value, u }: { value: number; u: number }) {
  const prev = useRef(value);
  const [pop, setPop] = useState<{ n: number } | null>(null);
  const p = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const diff = value - prev.current; prev.current = value;
    if (!diff) return;
    setPop((cur) => ({ n: (cur?.n ?? 0) + diff }));
    p.setValue(0);
    Animated.timing(p, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPop(null), 1150);
  }, [value, p]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  if (!pop) return null;
  const up = pop.n > 0;
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", top: "100%", left: 0, right: 0, alignItems: "center", opacity: p.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [-u * 0.6, u * 2.2] }) }] }}>
      <View style={{ paddingHorizontal: u * 1.6, paddingVertical: u * 0.3, borderRadius: 99, borderWidth: u * 0.3, borderColor: up ? C.green : C.terracotta, backgroundColor: C.paper }}>
        <Text allowFontScaling={false} style={{ color: up ? C.greenDark : C.terracottaDark, fontFamily: FONT.bold, fontSize: fs(u, 2.8) }}>{up ? "+" : "−"}{fmt(Math.abs(pop.n))}</Text>
      </View>
    </Animated.View>
  );
}

/** The menu popover: fades and drops in, and out again when closed (see Present). */
function MenuPop({ u, top, children }: { u: number; top: number; children: React.ReactNode }) {
  const a = useAppear(170, 110);
  return (
    <Animated.View style={{ position: "absolute", right: u * 1.6, top, width: u * 44, padding: u * 0.8, borderRadius: u * 2.6, borderWidth: u * 0.5, borderColor: C.brown, backgroundColor: C.paper, gap: u * 0.4, zIndex: 20, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: u * 1.4, shadowOffset: { width: 0, height: u * 0.6 }, elevation: 8, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-u * 1.6, 0] }) }, { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }}>{children}</Animated.View>
  );
}

/** Portrait top bar: cat-ear level badge, gold and XP counters, and a menu button (Görevler / Günlük Ödül / Ayarlar open from it). */
export function Hud({ onOpen, badges }: { onOpen: (id: "quests" | "daily" | "settings") => void; badges: { quests: boolean; daily: boolean } }) {
  const { world, act } = useWorld();
  const { game, progression } = world, u = useU();
  useRefresh();
  const [menu, setMenu] = useState(false);
  const need = progression.xpToNext(progression.level);
  let totalXp = progression.xp;                                  // XP over all levels: the "+N" under the bar follows it, so a level-up does not look like a loss
  for (let l = 1; l < progression.level; l++) totalXp += progression.xpToNext(l) ?? 0;
  const xpAnim = useRef(new Animated.Value(progression.isMax ? 1 : progression.fraction())).current;
  const lastLevel = useRef(progression.level);
  const badgePop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const f = progression.isMax ? 1 : progression.fraction();
    if (progression.level > lastLevel.current) {                 // level-up: the bar fills up, starts over, and the badge pops
      Animated.sequence([
        Animated.timing(xpAnim, { toValue: 1, duration: 220, useNativeDriver: false }),
        Animated.timing(xpAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
        Animated.timing(xpAnim, { toValue: f, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      ]).start();
      Animated.sequence([
        Animated.timing(badgePop, { toValue: 1.4, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(badgePop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      ]).start();
    } else Animated.timing(xpAnim, { toValue: f, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    lastLevel.current = progression.level;
  }, [progression.level, progression.xp, progression.isMax, xpAnim, badgePop]);   // eslint-disable-line react-hooks/exhaustive-deps
  const bh = u * 11, bw = bh * (192 / 170), mh = Math.max(44, u * 11.4);
  const entry = (id: "quests" | "daily" | "settings", icon: string, label: string, badge: boolean) => (
    <Pressable key={id} onPress={() => { act.sfx("tap"); setMenu(false); onOpen(id); }} accessibilityLabel={label} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: u * 1.6, height: Math.max(46, u * 11), paddingHorizontal: u * 1.8, borderRadius: u * 2, backgroundColor: pressed ? C.vanilla : C.paper })}>
      <GameIcon id={icon} size={u * 6.4} />
      <Text allowFontScaling={false} style={{ flex: 1, color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 3.2) }} numberOfLines={1}>{label}</Text>
      {badge ? <View style={{ width: u * 2.6, height: u * 2.6, borderRadius: 99, backgroundColor: C.terracotta }} /> : null}
    </Pressable>
  );
  return (
    <>
      {menu ? <Pressable onPress={() => setMenu(false)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 18 }} /> : null}
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: 0, flexDirection: "row", alignItems: "center", paddingTop: u * 1, paddingHorizontal: u * 1.6, gap: u * 1.2, zIndex: 19 }}>
        <Animated.View style={{ width: bw, height: bh, alignItems: "center", justifyContent: "center", transform: [{ scale: badgePop }] }}>
          <Image source={img("ui-badge")} style={{ position: "absolute", width: bw, height: bh, resizeMode: "contain" }} />
          <Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 2.2), marginTop: u * 0.9, lineHeight: fs(u, 2.4) }}>Lv</Text>
          <Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 4.4), lineHeight: fs(u, 4.6), marginTop: -u * 0.2 }}>{progression.level}</Text>
        </Animated.View>
        <Pill u={u} style={{ height: u * 8.4, borderRadius: u * 4.2, flex: 1, maxWidth: u * 36, paddingLeft: u * 7, paddingRight: u * 2, justifyContent: "center" }}>
          <GameIcon id="coin" size={u * 9.4} style={{ position: "absolute", left: -u * 1.4 }} />
          <Rolling value={game.gold} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 3.2), textAlign: "center", flex: 1 }} />
          <GainPop value={game.gold} u={u} />
        </Pill>
        <Pill u={u} style={{ height: u * 8.4, borderRadius: u * 4.2, flex: 1, maxWidth: u * 36, paddingLeft: u * 7, paddingRight: u * 2, justifyContent: "center" }}>
          <GameIcon id="xp" size={u * 9.4} style={{ position: "absolute", left: -u * 1.4 }} />
          <View style={{ flex: 1, justifyContent: "center", gap: u * 0.3 }}>
            <Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 2.5), textAlign: "center" }} numberOfLines={1}>{progression.isMax ? "MAX" : `${fmt(progression.xp)}/${fmt(need)}`}</Text>
            <View style={{ height: u * 1.1, borderRadius: 99, backgroundColor: C.vanillaDark, overflow: "hidden" }}>
              <Animated.View style={{ width: xpAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }), height: "100%", backgroundColor: C.green }} />
            </View>
          </View>
          <GainPop value={totalXp} u={u} />
        </Pill>
        <View style={{ marginLeft: "auto" }}>
          <Pressable onPress={() => { act.sfx("tap"); setMenu((m) => !m); }} accessibilityLabel="Menü" style={({ pressed }) => ({ width: mh, height: mh, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
            <Image source={img("ui-menu")} style={{ width: mh, height: mh, resizeMode: "contain" }} />
            {badges.quests || badges.daily ? <View style={{ position: "absolute", right: -u * 0.4, top: -u * 0.6, width: u * 3.1, height: u * 3.1, borderRadius: 99, backgroundColor: C.terracotta, borderWidth: u * 0.3, borderColor: C.paper }} /> : null}
          </Pressable>
        </View>
      </View>
      <Present show={menu} ms={120}>
        <MenuPop u={u} top={u * 1 + mh + u * 1}>
          {entry("quests", "hud-quests", "Görevler", badges.quests)}
          {entry("daily", "hud-events", "Günlük Ödül", badges.daily)}
          {entry("settings", "hud-settings", "Ayarlar", false)}
        </MenuPop>
      </Present>
    </>
  );
}

export type NavId = "cafe" | "town" | "explore" | "market";

/** Fixed bottom navigation: Fırın & Kafe, Kasaba, Keşif, Mağaza (picture buttons, the active one gets the cat-ear frame). Reaches the screen's bottom edge, home indicator included. */
export function Nav({ active, onSelect, exploreBadge }: { active: NavId | null; onSelect: (id: NavId) => void; exploreBadge: boolean }) {
  const u = useU();
  const insets = useSafeAreaInsets();
  const H = Math.max(52, u * 14), s = H / 195;                         // the active picture is 195 units tall; the plain one 152, so both buttons have the same body size
  const btn = (id: NavId, label: string) => {
    const on = active === id, w = on ? (id === "cafe" ? 229 : 223) : 214, h = on ? 195 : 152;
    return (
      <Pressable key={id} onPress={() => onSelect(id)} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => ({ flex: 1, alignItems: "center", justifyContent: "flex-end", transform: [{ translateY: pressed ? u * 0.3 : 0 }, { scale: pressed ? 0.94 : 1 }] })}>
        <View style={{ height: H, justifyContent: "flex-end" }}>
          <Image source={img(on ? `ui-nav-${id}-on` : `ui-nav-${id}`)} style={{ width: w * s, height: h * s, resizeMode: "contain" }} />
          {id === "explore" && exploreBadge ? <View style={{ position: "absolute", right: -u * 0.4, top: on ? u * 1.4 : u * 3.6, width: u * 3.1, height: u * 3.1, borderRadius: 99, backgroundColor: C.terracotta, borderWidth: u * 0.3, borderColor: C.paper }} /> : null}
        </View>
        <Text allowFontScaling={false} numberOfLines={1} style={{ color: on ? C.brownDark : C.brown, fontFamily: FONT.bold, fontSize: fs(u, 2.7), marginTop: u * 0.3 }}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: -insets.left, right: -insets.right, bottom: -insets.bottom, paddingBottom: insets.bottom + u * 0.8, paddingTop: u * 0.8, paddingHorizontal: u * 1 + Math.max(insets.left, insets.right), flexDirection: "row", gap: u * 0.4, backgroundColor: C.cream, borderTopWidth: u * 0.5, borderTopColor: C.brown, alignItems: "flex-end" }}>
      {btn("cafe", "Fırın & Kafe")}
      {btn("town", "Kasaba")}
      {btn("explore", "Keşif")}
      {btn("market", "Mağaza")}
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
