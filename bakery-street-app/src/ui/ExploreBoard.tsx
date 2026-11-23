// Keşif (portrait, painted board): the card under the map for the selected region, as in the reference picture: a picture of the place, its name
// and story, the possible rewards, the duration, the gold it pays and one button that follows the expedition's state.
import React, { useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDuration } from "../game/exploration.js";
import { useRefresh, useWorld } from "../runtime/context";
import { Bar, Btn } from "./kit";
import { EmojiIcon, GameIcon } from "./icons";
import { C, FONT, fmt, fs, navHeight, TYPE, useU } from "./theme";

const BOARD_ASPECT = 853 / 1024;
const range = ([a, b]: number[]) => (a === b ? fmt(a) : `${fmt(a)}–${fmt(b)}`);

/** Where the board starts on screen (just under the top bar); the scene draws the board there and this card sits under it. */
export function useBoardTop() { const u = useU(), insets = useSafeAreaInsets(); return insets.top + u * 12.5; }

export function ExploreBoardPanel({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  const { world, act } = useWorld();
  const { game, exploration: ex } = world, u = useU();
  const { width } = useWindowDimensions();
  useRefresh(500);
  const insets = useSafeAreaInsets(), [stripH, setStripH] = useState(0);
  const scene = world.scenes.explore as any;
  const report = (y: number) => { const px = insets.top + y; if (Math.abs((scene.bottomPx ?? 0) - px) > 1) scene.bottomPx = px; };   // the map reaches down to the card
  const id = selected ?? (world.scenes.explore as any).defaultSelection();
  const d = ex.region(id), st = ex.status(id) as string, a = ex.active;
  if (!d) return null;
  const rw = d.rewards;
  const earned = (r: any) => [r.gold ? `💰 ${fmt(r.gold)}` : "", r.xp ? `✨ ${fmt(r.xp)} XP` : "", ...Object.entries(r.ingredients ?? {}).map(([k, n]) => `${game.ingredientsDef[k].icon} ×${n}`), r.gems ? `💎 ${r.gems}` : ""].filter(Boolean).join(" · ");
  const missing = st === "locked" ? (ex.missing(id) as string[]) : [];

  let button: React.ReactNode;
  if (st === "locked") button = <Btn label="🔒 Kilitli" disabled />;
  else if (st === "ready") button = <Btn label="Ödülü Al" onPress={() => { const r = ex.claim(a.id); if (r.ok) { act.toast(`${r.region.icon} ${r.region.name}: ${earned(r.reward)}${r.reduced ? `\nGünlük keşif altın sınırı aşıldı: ${fmt(r.rolled)} yerine ${fmt(r.reward.gold)} altın` : ""}`, r.reduced ? 5200 : 4200); act.sfx("claim"); act.buzz([30, 40, 60]); } else act.warn(r.message, 3000); }} />;
  else if (st === "active") button = <Btn label={`Keşifte · ${formatDuration(ex.remaining())}`} disabled />;
  else if (st === "busy") button = <Btn label="Başka keşif sürüyor" disabled />;
  else button = <Btn label="🐾 Keşfe Gönder" onPress={() => { const r = ex.start(id); if (r.ok) { act.toast(`${r.region.icon} ${r.region.name} keşfi başladı`, 2200); act.sfx("tap"); } else act.warn(r.message, 3000); }} />;

  const box = { flexDirection: "row" as const, alignItems: "center" as const, gap: u * 1, minHeight: Math.max(44, u * 8), paddingHorizontal: u * 1.4, borderRadius: u * 2.4, borderWidth: u * 0.3, borderColor: C.honeyLight, backgroundColor: C.paper };
  const small = { color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.small) };
  return (
    <View pointerEvents="box-none" onLayout={(e) => report(e.nativeEvent.layout.y + stripH)} style={{ position: "absolute", left: 0, right: 0, bottom: navHeight(u) + u * 1.2, zIndex: 16, gap: u * 0.8 }}>
    {/* the regions: one row along the map's lower edge (swipe for more) */}
    <View onLayout={(e) => setStripH(e.nativeEvent.layout.height)}>
      <RegionStrip selected={id} onSelect={onSelect} />
    </View>
    <View style={{ marginHorizontal: u * 1.6, padding: u * 1.6, gap: u * 1.2, borderRadius: u * 3, borderWidth: u * 0.6, borderColor: "#8A5A36", backgroundColor: C.cream, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: u * 1.5, shadowOffset: { width: 0, height: u * 0.6 }, elevation: 6 }}>
      <View style={{ flexDirection: "row", gap: u * 1.4 }}>
        <View style={{ borderRadius: u * 2, borderWidth: u * 0.4, borderColor: C.honeyDark, overflow: "hidden", opacity: st === "locked" ? 0.7 : 1 }}>
          <GameIcon id={`xr-${d.id}`} size={u * 19} style={{ width: u * 19, height: u * 13.3 }} />
        </View>
        <View style={{ flex: 1, gap: u * 0.4 }}>
          <Text allowFontScaling={false} numberOfLines={1} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.heading) }}>{d.name}</Text>
          <Text allowFontScaling={false} numberOfLines={3} style={{ color: st === "locked" ? C.terracottaDark : C.brown, fontFamily: FONT.regular, fontSize: fs(u, TYPE.small) }}>{st === "locked" ? missing.join("\n") : d.desc}</Text>
        </View>
      </View>
      <View style={{ ...box, justifyContent: "space-between" }}>
        <Text allowFontScaling={false} style={small}>Olası ödüller</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: u * 0.9 }}>
          <GameIcon id="coin" size={u * 4.6} />
          {(rw.ingredients ?? []).map((i: any) => <EmojiIcon key={i.id} emoji={game.ingredientsDef[i.id].icon} size={u * 4.6} />)}
          {rw.gems ? <GameIcon id="gem" size={u * 4.6} /> : null}
          <GameIcon id="xp" size={u * 4.4} />
        </View>
      </View>
      {st === "active" ? <Bar value={ex.progress()} text={`${formatDuration(ex.remaining())} kaldı`} /> : null}
      <View style={{ flexDirection: "row", gap: u * 1, alignItems: "center" }}>
        <View style={box}><GameIcon id="timer" size={u * 4.4} /><Text allowFontScaling={false} style={small}>{formatDuration(d.duration)}</Text></View>
        <View style={box}><GameIcon id="coin" size={u * 4.4} /><Text allowFontScaling={false} style={small}>{range(rw.gold)}</Text></View>
        <View style={{ flex: 1 }}>{button}</View>
      </View>
    </View>
    </View>
  );
}

/** All regions in a row (when the screen has room for it): picture, name and state; a tap selects one, like a tap on the map. */
function RegionStrip({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const { world, act } = useWorld(), u = useU();
  const { width } = useWindowDimensions();
  const ex = world.exploration;
  const tw = Math.max(u * 15, Math.min(u * 19, (width - u * 4) / 4.4)), pic = tw - u * 1.2, nf = fs(u, TYPE.tiny);   // about four tiles in view, the rest a swipe away
  const mark = (st: string, done: boolean) => (st === "locked" ? "lock" : st === "ready" ? "gift" : st === "active" ? "timer" : done ? "check" : null);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: u * 1, paddingHorizontal: u * 1.6, paddingVertical: u * 0.4 }}>
      {(ex.regions as any[]).map((r) => {
        const st = ex.status(r.id) as string, on = r.id === selected, icon = mark(st, ex.timesDone(r.id) > 0);
        return (
          <Pressable key={r.id} onPress={() => { act.sfx("tap"); onSelect(r.id); }} accessibilityRole="button" accessibilityLabel={r.name} accessibilityState={{ selected: on }}
            style={({ pressed }) => ({ width: tw, alignItems: "center", gap: u * 0.4, padding: u * 0.6, borderRadius: u * 2, borderWidth: u * 0.4, borderColor: on ? C.honey : "rgba(245,230,200,0.35)", backgroundColor: on ? "rgba(255,247,234,0.95)" : "rgba(255,247,234,0.8)", transform: [{ scale: pressed ? 0.96 : 1 }] })}>
            <View style={{ borderRadius: u * 1.4, overflow: "hidden", opacity: st === "locked" ? 0.55 : 1 }}>
              <GameIcon id={`xr-${r.id}`} size={pic} style={{ width: pic, height: pic * 0.7 }} />
            </View>
            {icon ? <View style={{ position: "absolute", right: u * 0.3, top: u * 0.3 }}><GameIcon id={icon} size={u * 4.2} /></View> : null}
            <Text allowFontScaling={false} numberOfLines={2} style={{ minHeight: nf * 2.5, textAlign: "center", textAlignVertical: "center", color: C.brownDark, fontFamily: FONT.bold, fontSize: nf, lineHeight: nf * 1.2 }}>{r.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
