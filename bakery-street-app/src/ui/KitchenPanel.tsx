// The kitchen counter (opened by tapping the prep counter): the player may prepare a guest's order by hand. Pick an order ticket, drop its
// ingredients into the bowl, stir it with a few taps, enjoy the little result moment and serve it. Optional: the waiter and the machines keep
// working as before. Rules: Game.handMake (the product, from the ingredients) and Cafe.deliver (the sale). The stars are only for fun.
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useRefresh, useWorld } from "../runtime/context";
import { Btn, Meta, Sheet } from "./kit";
import { EmojiIcon } from "./icons";
import { C, FONT, fmt, fs, TYPE, useU } from "./theme";

type Bowl = Record<string, number>;
type Phase = "gather" | "stir" | "made";
const STIRS: Record<string, number> = { oven: 6, coffee: 4 };
const STIR_TEXT: Record<string, [string, string]> = { oven: ["Kaseye dokun, hamuru yoğur!", "🥣 Yoğur"], coffee: ["Kaseye dokun, kahveyi karıştır!", "☕ Karıştır"] };
const RATING = [["Oldu!", 1], ["Çok güzel!", 2], ["Mükemmel!", 3]] as const;
const WOOD = { top: "#C8925C", edge: "#7A4E2C", plank: "rgba(110,70,40,.28)", shelf: "rgba(90,56,30,.35)", text: "#FFF4DE" };

/** One ingredient dropping into the bowl with a soft bounce (animates when it appears). */
function Drop({ emoji, size, delay = 0 }: { emoji: string; size: number; delay?: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(a, { toValue: 1, friction: 5, tension: 120, delay, useNativeDriver: true }).start(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View style={{ opacity: a.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }), transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-size * 1.8, 0] }) }, { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
      <EmojiIcon emoji={emoji} size={size} />
    </Animated.View>
  );
}

/** A puff over the bowl while stirring: flour for the oven, steam for coffee. */
function Puff({ steam, u, seed }: { steam: boolean; u: number; seed: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const dx = ((seed * 37) % 9 - 4) * u * 1.8, s = u * (4 + (seed % 3) * 1.2);
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: "50%", top: u * 1.5, width: s, height: s, marginLeft: -s / 2, borderRadius: 99, backgroundColor: steam ? "rgba(246,248,252,.95)" : "#FFFDF7", borderWidth: u * 0.35, borderColor: steam ? "rgba(150,160,175,.45)" : "rgba(169,119,74,.5)",
      opacity: a.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }), transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) }, { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -u * (steam ? 6 : 4)] }) }, { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.6] }) }] }} />
  );
}

/** The finished product popping out of the bowl, with sparkles flying outwards. */
function Pop({ emojis, u }: { emojis: string[]; u: number }) {
  const a = useRef(new Animated.Value(0)).current, sp = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(a, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }).start();
    Animated.timing(sp, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      {Array.from({ length: 8 }, (_, i) => {
        const ang = (i / 8) * Math.PI * 2, r = u * 13;
        return <Animated.Text key={i} allowFontScaling={false} style={{ position: "absolute", color: i % 2 ? "#FFE08A" : "#FFF4DE", fontSize: u * (i % 2 ? 3.4 : 2.6), opacity: sp.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }), transform: [{ translateX: sp.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(ang) * r] }) }, { translateY: sp.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(ang) * r * 0.6] }) }] }}>✦</Animated.Text>;
      })}
      <Animated.View style={{ flexDirection: "row", gap: u, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }, { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [u * 4, 0] }) }] }}>
        {emojis.map((e, i) => <EmojiIcon key={i} emoji={e} size={u * 10} />)}
      </Animated.View>
    </View>
  );
}

/** The result stars, one after another. */
function Stars({ n, label, u }: { n: number; label: string; u: number }) {
  const vals = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => { Animated.stagger(160, vals.map((v) => Animated.spring(v, { toValue: 1, friction: 4, useNativeDriver: true }))).start(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ alignItems: "center", gap: u * 0.2 }}>
      <View style={{ flexDirection: "row", gap: u * 0.6 }}>
        {vals.map((v, i) => <Animated.Text key={i} allowFontScaling={false} style={{ fontSize: u * 5.4, color: i < n ? "#FFD45C" : "rgba(255,244,222,.35)", textShadowColor: "#7A4E2C", textShadowRadius: u * 0.6, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ["-40deg", "0deg"] }) }] }}>★</Animated.Text>)}
      </View>
      <Text allowFontScaling={false} style={{ color: WOOD.text, fontFamily: FONT.bold, fontSize: fs(u, TYPE.heading), textShadowColor: "#7A4E2C", textShadowRadius: u * 0.6 }}>{label}</Text>
    </View>
  );
}

export function KitchenPanel({ onRecipes }: { onRecipes: () => void }) {
  const { world, act } = useWorld();
  const { game, cafe, album } = world, u = useU();
  const { width, height } = useWindowDimensions();
  useRefresh(250);
  const staff = (world.scenes.interior as any).staff;
  const [sel, setSel] = useState<number | null>(null);          // the order being prepared
  const [step, setStep] = useState(0);                          // which product of the order (a set has two)
  const [bowl, setBowl] = useState<Bowl>({});
  const [phase, setPhase] = useState<Phase>("gather");
  const [stirs, setStirs] = useState(0);
  const [made, setMade] = useState<string[]>([]);               // products of the order prepared by hand so far
  const [slips, setSlips] = useState(0);                        // wrong jars tapped for this order (only for the stars)
  const [wrong, setWrong] = useState<string | null>(null);
  const shake = useRef(new Animated.Value(0)).current, spin = useRef(new Animated.Value(0)).current, wob = useRef(new Animated.Value(0)).current;
  useEffect(() => () => { cafe.handOrder = null; }, []);       // eslint-disable-line react-hooks/exhaustive-deps -- closing the counter gives the order back to the waiter

  const seated = (cafe.customers as any[]).filter((c) => c.state === "seated" && c.orderId);
  const tickets = seated.map((c) => ({ c, o: cafe.orderOf(c) })).filter((t) => t.o && t.o.status === "open");
  const cur = tickets.find((t) => t.o.id === sel) ?? null;
  const items: string[] = cur ? cafe.orderItems(cur.o) : [];
  const pid = items[step], def = pid ? game.productsDef[pid] : null;
  const need: Record<string, number> = def?.ingredients ?? {};
  const complete = !!def && Object.entries(need).every(([k, n]) => (bowl[k] ?? 0) >= n);
  const stirNeed = def ? STIRS[def.station] ?? 5 : 5;

  const reset = () => { setStep(0); setBowl({}); setPhase("gather"); setMade([]); setStirs(0); setSlips(0); };
  useEffect(() => {                                              // the guest left or was served by the waiter: start over, kindly
    if (sel != null && !cur) { if (made.length) act.toast("Bu sipariş artık açık değil; hazırladığın ürünler vitrine kondu.", 2400); reset(); setSel(null); }
  }, [sel, cur]);                                                // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (sel == null && tickets.length === 1) setSel(tickets[0].o.id); }, [tickets.length]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { cafe.handOrder = sel; }, [sel]);          // eslint-disable-line react-hooks/exhaustive-deps -- the waiter leaves the order the player is preparing alone
  useEffect(() => { if (complete && phase === "gather") { setPhase("stir"); setStirs(0); act.sfx("done"); } }, [complete, phase]);   // eslint-disable-line react-hooks/exhaustive-deps -- a full bowl: time to stir

  const pick = (id: number) => {
    if (id === sel) return;
    if (staff?.claims(id)) { act.toast("Garson bu siparişi zaten götürüyor.", 1400); return; }
    act.sfx("tap"); setSel(id); reset();
  };
  const add = (ing: string) => {
    if (!def || phase !== "gather") return;
    const n = need[ing] ?? 0, have = bowl[ing] ?? 0;
    if (!n || have >= n) {                                       // not in this recipe (or enough of it): a small no, nothing is lost
      setWrong(ing); setSlips((x) => x + 1); shake.setValue(0);
      Animated.sequence([0, 1, -1, 1, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 60, useNativeDriver: true }))).start(() => setWrong(null));
      act.toast(n ? `${game.ingredientsDef[ing].name} yeterli` : `${game.ingredientsDef[ing].name} bu tarife girmiyor`, 1200);
      return;
    }
    if ((game.ingredients[ing] ?? 0) <= have) { act.warn(`${game.ingredientsDef[ing].name} bitti. Market'ten ya da depodan alabilirsin.`, 2400); return; }
    act.sfx("tap"); act.buzz(8);
    setBowl({ ...bowl, [ing]: have + 1 });
    wob.setValue(0); Animated.timing(wob, { toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };
  const stir = () => {
    if (!def || phase !== "stir") return;
    const n = stirs + 1;
    setStirs(n); act.sfx("tap"); act.buzz(10);
    spin.setValue(0); Animated.timing(spin, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    if (n < stirNeed) return;
    const r = game.handMake(pid);                                  // the last stir: the product is ready
    if (!r.ok) { act.warn(r.message, 2600); setPhase("gather"); setBowl({}); return; }
    act.sfx("done"); act.buzz([20, 40, 20]);
    setMade([...made, pid]);
    if (step + 1 < items.length) { setStep(step + 1); setBowl({}); setStirs(0); setPhase("gather"); act.toast(`${def.icon} ${def.name} hazır! Sıradaki: ${game.productsDef[items[step + 1]].name}`, 1600); }   // a set: on to the second product
    else setPhase("made");
  };
  const serve = () => {
    if (!cur) return;
    if (staff?.claims(cur.o.id)) { act.toast("Garson bu siparişi zaten götürüyor.", 1600); return; }
    const r = cafe.deliver(cur.o.id);
    if (!r.ok) { act.warn(r.message, 2400); return; }
    game.emit("fx", { type: "coins", at: { x: width / 2, y: height * 0.55 }, big: true });     // the coins fly to the gold counter
    act.sfx("coin");
    act.toast(`${album.nameOf(cur.c.look)} çok mutlu! +${fmt(r.income)} altın`, 1800);
    reset(); setSel(null); cafe.handOrder = null;
  };
  const fromStock = cur && phase === "gather" && step === 0 && !made.length && !Object.keys(bowl).length && cafe.orderReady(cur.o);
  const [rateText, rateStars] = RATING[slips === 0 ? 2 : slips <= 2 ? 1 : 0];
  const stage = phase === "made" ? 2 : phase === "stir" ? 1 : 0;

  const ticket = (c: any, o: any) => {
    const on = o.id === sel, f = cafe.patienceFraction(c), coming = staff?.claims(o.id);
    return (
      <Pressable key={o.id} onPress={() => pick(o.id)} accessibilityRole="button" accessibilityLabel={`Sipariş: ${album.nameOf(c.look)}`} accessibilityState={{ selected: on }}
        style={({ pressed }) => ({ width: u * 22, paddingTop: u * 1.6, paddingBottom: u * 1, paddingHorizontal: u * 1, gap: u * 0.5, borderRadius: u * 1.2, borderWidth: u * 0.3, borderColor: on ? C.green : "#E4CFA8", backgroundColor: on ? "#F4F8E8" : "#FFFDF6",
          shadowColor: "#5E3A20", shadowOpacity: on ? 0.3 : 0.15, shadowRadius: u * (on ? 1.4 : 0.6), shadowOffset: { width: 0, height: u * (on ? 0.8 : 0.3) }, elevation: on ? 4 : 1,
          transform: [{ scale: pressed ? 0.96 : on ? 1.04 : 1 }, { translateY: on ? -u * 0.4 : 0 }, { rotate: on ? "0deg" : `${(o.id % 3) - 1}deg` }] })}>
        <View style={{ position: "absolute", top: u * 0.5, alignSelf: "center", width: u * 1.6, height: u * 1.6, borderRadius: 99, backgroundColor: on ? C.green : C.terracotta, borderWidth: u * 0.25, borderColor: "#FFF" }} />
        <Text allowFontScaling={false} numberOfLines={1} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.tiny) }}>{album.nameOf(c.look)}</Text>
        <View style={{ flexDirection: "row", gap: u * 0.5, alignItems: "center" }}>{cafe.orderItems(o).map((id: string, i: number) => <EmojiIcon key={i} emoji={game.productsDef[id].icon} size={u * 6} />)}</View>
        <View style={{ height: u * 0.9, borderRadius: 99, backgroundColor: C.vanillaDark, overflow: "hidden" }}><View style={{ width: `${Math.round(f * 100)}%`, height: "100%", backgroundColor: f > 0.5 ? C.green : f > 0.25 ? C.honey : C.terracotta }} /></View>
        {coming ? <Text allowFontScaling={false} style={{ color: C.honeyDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.tiny) }}>Garson götürüyor</Text> : null}
      </Pressable>
    );
  };

  return (
    <Sheet title="Mutfak Tezgâhı" hint={tickets.length ? undefined : "Şu an bekleyen sipariş yok. Müşteriler oturunca fişleri burada görünür."} tall onClose={() => act.openOverlay(null)}>
      {/* order tickets */}
      {tickets.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: u * 1.2, paddingVertical: u * 0.8, paddingHorizontal: u * 0.4 }}>{tickets.map(({ c, o }) => ticket(c, o))}</ScrollView> : null}

      {cur && def ? (
        <View style={{ borderRadius: u * 2.2, borderWidth: u * 0.5, borderColor: WOOD.edge, backgroundColor: WOOD.top, padding: u * 1.2, gap: u * 1, overflow: "hidden" }}>
          {[0.22, 0.48, 0.74].map((k) => <View key={k} pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: `${k * 100}%`, height: u * 0.35, backgroundColor: WOOD.plank }} />)}

          {/* steps: ingredients → stir → serve */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: u * 0.8 }}>
            {["Malzeme", "Karıştır", "Servis"].map((t, i) => (
              <View key={t} style={{ flexDirection: "row", alignItems: "center", gap: u * 0.5, paddingHorizontal: u * 1.2, paddingVertical: u * 0.3, borderRadius: 99, backgroundColor: i === stage ? "#FFF4DE" : i < stage ? "rgba(125,152,85,.85)" : "rgba(90,56,30,.35)" }}>
                <Text allowFontScaling={false} style={{ color: i === stage ? C.brownDark : WOOD.text, fontFamily: FONT.bold, fontSize: fs(u, TYPE.tiny) }}>{i < stage ? "✓" : `${i + 1}`} {t}</Text>
              </View>
            ))}
          </View>

          {/* the recipe, on a little paper card */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: u * 1.2, backgroundColor: "#FFF8EA", borderRadius: u * 1.4, borderWidth: u * 0.3, borderColor: "#E2C69B", padding: u * 1, transform: [{ rotate: "-0.6deg" }] }}>
            <EmojiIcon emoji={def.icon} size={u * 8} />
            <View style={{ flex: 1 }}>
              <Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.heading) }}>{def.name}{items.length > 1 ? ` (${step + 1}/${items.length})` : ""}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: u * 0.6, marginTop: u * 0.3 }}>
                {Object.entries(need).map(([k, n]) => {
                  const have = bowl[k] ?? 0, ok = have >= n;
                  return <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: u * 0.3, paddingHorizontal: u * 0.8, paddingVertical: u * 0.2, borderRadius: 99, backgroundColor: ok ? C.greenPale : "#F3E6CF" }}><EmojiIcon emoji={game.ingredientsDef[k].icon} size={u * 3.6} /><Text allowFontScaling={false} style={{ color: ok ? C.greenDark : C.brown, fontFamily: FONT.bold, fontSize: fs(u, TYPE.small) }}>{have}/{n}{ok ? " ✓" : ""}</Text></View>;
                })}
              </View>
            </View>
          </View>

          {/* the bowl (tap it to stir) */}
          <View style={{ alignItems: "center", minHeight: u * 21, justifyContent: "center" }}>
            {phase === "made" ? (
              <View style={{ gap: u * 1, alignItems: "center" }}><Pop emojis={made.map((id) => game.productsDef[id].icon)} u={u} /><Stars n={rateStars} label={rateText} u={u} /></View>
            ) : (
              <Pressable onPress={stir} disabled={phase !== "stir"} accessibilityRole="button" accessibilityLabel={phase === "stir" ? `Karıştır, ${stirs}/${stirNeed}` : "Kase"}>
                <Animated.View style={{ width: u * 32, height: u * 15, borderBottomLeftRadius: u * 17, borderBottomRightRadius: u * 17, borderTopLeftRadius: u * 3, borderTopRightRadius: u * 3, backgroundColor: "#F3E2C3", borderWidth: u * 0.6, borderColor: phase === "stir" ? "#FFE08A" : "#A9774A", alignItems: "center", justifyContent: "center", padding: u * 1, overflow: "hidden",
                  shadowColor: "#3B2412", shadowOpacity: 0.3, shadowRadius: u, shadowOffset: { width: 0, height: u * 0.6 },
                  transform: [{ rotate: wob.interpolate({ inputRange: [0, 0.5, 1], outputRange: ["0deg", "-3deg", "0deg"] }) }, { scale: spin.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 1.05, 1] }) }] }}>
                  {made.length && phase === "gather" && !Object.keys(bowl).length
                    ? <View style={{ flexDirection: "row", gap: u }}>{made.map((id, i) => <EmojiIcon key={i} emoji={game.productsDef[id].icon} size={u * 8} />)}</View>
                    : <Animated.View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: u * 0.3, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }}>
                        {Object.entries(bowl).flatMap(([k, n]) => Array.from({ length: n }, (_, i) => <Drop key={`${k}${i}`} emoji={game.ingredientsDef[k].icon} size={u * 5} />))}
                      </Animated.View>}
                  {phase === "gather" && !Object.keys(bowl).length && !made.length ? <Text allowFontScaling={false} style={{ color: "#A9774A", fontFamily: FONT.bold, fontSize: fs(u, TYPE.small) }}>Kase boş: malzemelere dokun</Text> : null}
                </Animated.View>
                {phase === "stir" ? Array.from({ length: stirs }, (_, i) => <Puff key={i} steam={def.station === "coffee"} u={u} seed={i + step * 7} />) : null}
              </Pressable>
            )}
          </View>

          {phase === "stir" ? (
            <View style={{ gap: u * 0.7, alignItems: "center" }}>
              <Text allowFontScaling={false} style={{ color: WOOD.text, fontFamily: FONT.bold, fontSize: fs(u, TYPE.body), textShadowColor: "#7A4E2C", textShadowRadius: u * 0.5 }}>{STIR_TEXT[def.station]?.[0] ?? "Kaseye dokun, karıştır!"}</Text>
              <View style={{ flexDirection: "row", gap: u * 0.7 }}>
                {Array.from({ length: stirNeed }, (_, i) => <View key={i} style={{ width: u * 2.4, height: u * 2.4, borderRadius: 99, backgroundColor: i < stirs ? "#FFE08A" : "rgba(90,56,30,.35)", borderWidth: u * 0.3, borderColor: "#FFF4DE" }} />)}
              </View>
              <View style={{ alignSelf: "stretch" }}><Btn label={STIR_TEXT[def.station]?.[1] ?? "Karıştır"} onPress={stir} /></View>
            </View>
          ) : phase === "made" ? (
            <Btn label="🛎 Servis Et" sub={`${album.nameOf(cur.c.look)} bekliyor`} onPress={serve} />
          ) : (
            <>
              {/* the ingredient jars on a shelf: tap to drop one into the bowl */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: u * 0.8, paddingVertical: u * 0.8, borderRadius: u * 1.6, backgroundColor: WOOD.shelf }}>
                {(Object.keys(game.ingredientsDef) as string[]).map((k) => {
                  const d = game.ingredientsDef[k], stock = (game.ingredients[k] ?? 0) - (bowl[k] ?? 0), useful = (need[k] ?? 0) > (bowl[k] ?? 0);
                  return (
                    <Animated.View key={k} style={{ transform: [{ translateX: wrong === k ? shake.interpolate({ inputRange: [-1, 1], outputRange: [-u * 1.2, u * 1.2] }) : 0 }] }}>
                      <Pressable onPress={() => add(k)} accessibilityRole="button" accessibilityLabel={`${d.name} ekle, ${stock} var`}
                        style={({ pressed }) => ({ width: u * 10.8, height: u * 10.8, borderRadius: 99, alignItems: "center", justifyContent: "center", borderWidth: u * 0.45, borderColor: useful ? "#9CC46A" : "#D8BE92", backgroundColor: useful ? "#F4F8E8" : "#FFFDF6", opacity: stock > 0 ? 1 : 0.45,
                          shadowColor: "#3B2412", shadowOpacity: 0.25, shadowRadius: u * 0.4, shadowOffset: { width: 0, height: u * 0.3 }, transform: [{ scale: pressed ? 0.88 : 1 }, { translateY: pressed ? u * 0.3 : 0 }] })}>
                        <EmojiIcon emoji={d.icon} size={u * 5.4} />
                        <Text allowFontScaling={false} style={{ color: C.brown, fontFamily: FONT.bold, fontSize: fs(u, TYPE.tiny) }}>{stock}</Text>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
              {Object.keys(bowl).length ? <Btn small variant="plain" label="Kaseyi boşalt" onPress={() => { setBowl({}); act.sfx("tap"); }} /> : null}
              {fromStock ? <Btn small variant="alt" label="Vitrinde hazır var: hemen ver" onPress={serve} /> : null}
            </>
          )}
        </View>
      ) : tickets.length ? <Meta tone="muted" text="Bir sipariş fişi seç: malzemeleri kaseye at, karıştır ve servis et." /> : null}

      <Btn small variant="plain" label="Makinede üret (tarif listesi)" onPress={onRecipes} />
    </Sheet>
  );
}
