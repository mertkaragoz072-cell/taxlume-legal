// The kitchen counter (opened by tapping the prep counter): the player may prepare a guest's order by hand. Pick an order ticket, put its ingredients
// in the bowl, prepare it (a short calm moment) and serve it. Optional: the waiter and the machines keep working as before.
// Rules: Game.handMake (the product, from the ingredients) and Cafe.deliver (the sale). This screen only keeps what is in the bowl.
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import { useRefresh, useWorld } from "../runtime/context";
import { Btn, Meta, Sheet } from "./kit";
import { EmojiIcon } from "./icons";
import { C, FONT, fmt, fs, TYPE, useU } from "./theme";

type Bowl = Record<string, number>;
const PREP_MS: Record<string, number> = { oven: 2200, coffee: 1600 };
const VERB: Record<string, [string, string]> = { oven: ["🥣 Yoğur ve pişir", "Hamur yoğruluyor…"], coffee: ["☕ Demle", "Kahve demleniyor…"] };

export function KitchenPanel({ onRecipes }: { onRecipes: () => void }) {
  const { world, act } = useWorld();
  const { game, cafe, album } = world, u = useU();
  useRefresh(250);
  const staff = (world.scenes.interior as any).staff;
  const [sel, setSel] = useState<number | null>(null);          // the order being prepared
  const [step, setStep] = useState(0);                          // which product of the order (a set has two)
  const [bowl, setBowl] = useState<Bowl>({});
  const [phase, setPhase] = useState<"gather" | "prep" | "made">("gather");
  const [made, setMade] = useState<string[]>([]);               // products of the order prepared by hand so far
  const [wrong, setWrong] = useState<string | null>(null);
  const prog = useRef(new Animated.Value(0)).current, wob = useRef(new Animated.Value(0)).current, shake = useRef(new Animated.Value(0)).current;
  const timer = useRef<any>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); cafe.handOrder = null; }, []);   // closing the counter gives the order back to the waiter

  const seated = (cafe.customers as any[]).filter((c) => c.state === "seated" && c.orderId);
  const tickets = seated.map((c) => ({ c, o: cafe.orderOf(c) })).filter((t) => t.o && t.o.status === "open");
  const cur = tickets.find((t) => t.o.id === sel) ?? null;
  const items: string[] = cur ? cafe.orderItems(cur.o) : [];
  const pid = items[step], def = pid ? game.productsDef[pid] : null;
  const need: Record<string, number> = def?.ingredients ?? {};
  const complete = !!def && Object.entries(need).every(([k, n]) => (bowl[k] ?? 0) >= n);

  const reset = () => { setStep(0); setBowl({}); setPhase("gather"); setMade([]); prog.setValue(0); };
  useEffect(() => {                                              // the guest left or was served by the waiter: start over, kindly
    if (sel != null && !cur) { if (made.length) act.toast("Bu sipariş artık açık değil; hazırladığın ürünler vitrine kondu.", 2400); reset(); setSel(null); }
  }, [sel, cur]);                                                // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (sel == null && tickets.length === 1) setSel(tickets[0].o.id); }, [tickets.length]);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cafe.handOrder = sel; }, [sel]);          // the waiter leaves the order the player is preparing alone
  const pick = (id: number) => {
    if (id === sel) return;
    if (staff?.claims(id)) { act.toast("Garson bu siparişi zaten götürüyor.", 1400); return; }
    act.sfx("tap"); if (timer.current) clearTimeout(timer.current); setSel(id); reset();
  };
  const add = (ing: string) => {
    if (!def || phase !== "gather") return;
    const n = need[ing] ?? 0, have = bowl[ing] ?? 0;
    if (!n || have >= n) {                                       // not in this recipe (or enough of it): a small no, nothing is lost
      setWrong(ing); shake.setValue(0);
      Animated.sequence([0, 1, -1, 1, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 60, useNativeDriver: true }))).start(() => setWrong(null));
      act.toast(n ? `${game.ingredientsDef[ing].name} yeterli` : `${game.ingredientsDef[ing].name} bu tarife girmiyor`, 1200);
      return;
    }
    if ((game.ingredients[ing] ?? 0) <= have) { act.warn(`${game.ingredientsDef[ing].name} bitti. Market'ten ya da depodan alabilirsin.`, 2400); return; }
    act.sfx("tap");
    setBowl({ ...bowl, [ing]: have + 1 });
    wob.setValue(0); Animated.timing(wob, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };
  const prepare = () => {
    if (!def || !complete || phase !== "gather") return;
    const ms = PREP_MS[def.station] ?? 1800, id = pid, at = step, count = items.length, before = made;
    setPhase("prep"); prog.setValue(0);
    Animated.timing(prog, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start();   // (the look only; the timer below finishes the step)
    timer.current = setTimeout(() => {
      timer.current = null;
      const r = game.handMake(id);
      if (!r.ok) { act.warn(r.message, 2600); setPhase("gather"); setBowl({}); return; }
      act.sfx("done");
      setMade([...before, id]);
      if (at + 1 < count) { setStep(at + 1); setBowl({}); setPhase("gather"); }   // a set: on to the second product
      else setPhase("made");
    }, ms);
  };
  const serve = () => {
    if (!cur) return;
    if (staff?.claims(cur.o.id)) { act.toast("Garson bu siparişi zaten götürüyor.", 1600); return; }
    const r = cafe.deliver(cur.o.id);
    if (!r.ok) { act.warn(r.message, 2400); return; }
    act.toast(`${album.nameOf(cur.c.look)} siparişini aldı · +${fmt(r.income)} altın`, 1800);
    reset(); setSel(null); cafe.handOrder = null;
  };
  const fromStock = cur && phase === "gather" && step === 0 && !made.length && cafe.orderReady(cur.o);

  return (
    <Sheet title="Mutfak Tezgâhı" hint={tickets.length ? "Bir sipariş fişi seç, malzemeleri kaseye koy ve hazırla." : "Şu an bekleyen sipariş yok. Müşteriler oturunca fişleri burada görünür."} tall onClose={() => act.openOverlay(null)}>
      {/* order tickets */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: u * 1, paddingVertical: u * 0.4 }}>
        {tickets.map(({ c, o }) => {
          const on = o.id === sel, f = cafe.patienceFraction(c), coming = staff?.claims(o.id);
          return (
            <Pressable key={o.id} onPress={() => pick(o.id)} accessibilityRole="button" accessibilityLabel={`Sipariş: ${album.nameOf(c.look)}`} accessibilityState={{ selected: on }}
              style={({ pressed }) => ({ width: u * 22, padding: u * 1, gap: u * 0.5, borderRadius: u * 1.6, borderWidth: u * 0.4, borderColor: on ? C.green : "#D8BE92", backgroundColor: on ? "#F1F5E4" : "#FFFDF6", transform: [{ scale: pressed ? 0.96 : 1 }, { rotate: on ? "0deg" : `${(o.id % 3) - 1}deg` }] })}>
              <Text allowFontScaling={false} numberOfLines={1} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.tiny) }}>{album.nameOf(c.look)}</Text>
              <View style={{ flexDirection: "row", gap: u * 0.5, alignItems: "center" }}>{cafe.orderItems(o).map((id: string, i: number) => <EmojiIcon key={i} emoji={game.productsDef[id].icon} size={u * 6} />)}</View>
              <View style={{ height: u * 0.9, borderRadius: 99, backgroundColor: C.vanillaDark, overflow: "hidden" }}><View style={{ width: `${Math.round(f * 100)}%`, height: "100%", backgroundColor: f > 0.5 ? C.green : f > 0.25 ? C.honey : C.terracotta }} /></View>
              {coming ? <Text allowFontScaling={false} style={{ color: C.honeyDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.tiny) }}>Garson götürüyor</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {cur && def ? (
        <View style={{ borderRadius: u * 2.2, borderWidth: u * 0.5, borderColor: "#7A4E2C", backgroundColor: "#C8925C", padding: u * 1.2, gap: u * 1.1, overflow: "hidden" }}>
          {/* the wooden counter top: a few plank lines */}
          {[0.22, 0.48, 0.74].map((k) => <View key={k} pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: `${k * 100}%`, height: u * 0.35, backgroundColor: "rgba(110,70,40,.28)" }} />)}
          {/* the recipe of the product being made, on a little paper card */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: u * 1.2, backgroundColor: "#FFF8EA", borderRadius: u * 1.4, borderWidth: u * 0.3, borderColor: "#E2C69B", padding: u * 1, transform: [{ rotate: "-0.6deg" }] }}>
            <EmojiIcon emoji={def.icon} size={u * 8} />
            <View style={{ flex: 1 }}>
              <Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.heading) }}>{def.name}{items.length > 1 ? ` (${step + 1}/${items.length})` : ""}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: u * 0.8, marginTop: u * 0.3 }}>
                {Object.entries(need).map(([k, n]) => {
                  const have = bowl[k] ?? 0, ok = have >= n;
                  return <Text key={k} allowFontScaling={false} style={{ color: ok ? C.greenDark : C.brown, fontFamily: FONT.bold, fontSize: fs(u, TYPE.small) }}>{game.ingredientsDef[k].icon} {have}/{n}{ok ? " ✓" : ""}</Text>;
                })}
              </View>
            </View>
          </View>

          {/* the bowl */}
          <View style={{ alignItems: "center" }}>
            <Animated.View style={{ width: u * 32, height: u * 15, borderBottomLeftRadius: u * 17, borderBottomRightRadius: u * 17, borderTopLeftRadius: u * 3, borderTopRightRadius: u * 3, backgroundColor: "#F3E2C3", borderWidth: u * 0.6, borderColor: "#A9774A", alignItems: "center", justifyContent: "center", flexDirection: "row", flexWrap: "wrap", gap: u * 0.4, padding: u * 1.2,
              transform: [{ rotate: (phase === "prep" ? prog : wob).interpolate({ inputRange: phase === "prep" ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.5, 1], outputRange: phase === "prep" ? ["0deg", "-4deg", "4deg", "-4deg", "0deg"] : ["0deg", "-3deg", "0deg"] }) }] }}>
              {phase === "made" || (made.length && phase === "gather" && !Object.keys(bowl).length)
                ? <View style={{ flexDirection: "row", gap: u }}>{made.map((id, i) => <EmojiIcon key={i} emoji={game.productsDef[id].icon} size={u * 10} />)}</View>
                : Object.entries(bowl).flatMap(([k, n]) => Array.from({ length: n }, (_, i) => <EmojiIcon key={`${k}${i}`} emoji={game.ingredientsDef[k].icon} size={u * 5.4} />))}
              {phase === "gather" && !Object.keys(bowl).length && !made.length ? <Text allowFontScaling={false} style={{ color: "#A9774A", fontFamily: FONT.bold, fontSize: fs(u, TYPE.small) }}>Kase boş: malzemelere dokun</Text> : null}
            </Animated.View>
          </View>

          {phase === "prep" ? (
            <View style={{ gap: u * 0.5 }}>
              <Text allowFontScaling={false} style={{ textAlign: "center", color: "#FFF4DE", fontFamily: FONT.bold, fontSize: fs(u, TYPE.body) }}>{VERB[def.station]?.[1] ?? "Hazırlanıyor…"}</Text>
              <View style={{ height: u * 2, borderRadius: 99, backgroundColor: C.vanillaDark, overflow: "hidden" }}><Animated.View style={{ height: "100%", backgroundColor: C.green, width: prog.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }} /></View>
            </View>
          ) : phase === "made" ? (
            <Btn label={`🛎 Servis Et`} sub={`${album.nameOf(cur.c.look)} bekliyor`} onPress={serve} />
          ) : (
            <>
              {/* the ingredient jars on a shelf: tap to put one in the bowl */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: u * 0.8, paddingVertical: u * 0.8, borderRadius: u * 1.6, backgroundColor: "rgba(90,56,30,.35)" }}>
                {(Object.keys(game.ingredientsDef) as string[]).map((k) => {
                  const d = game.ingredientsDef[k], stock = (game.ingredients[k] ?? 0) - (bowl[k] ?? 0), useful = (need[k] ?? 0) > (bowl[k] ?? 0);
                  return (
                    <Animated.View key={k} style={{ transform: [{ translateX: wrong === k ? shake.interpolate({ inputRange: [-1, 1], outputRange: [-u * 1.2, u * 1.2] }) : 0 }] }}>
                      <Pressable onPress={() => add(k)} accessibilityRole="button" accessibilityLabel={`${d.name} ekle, ${stock} var`}
                        style={({ pressed }) => ({ width: u * 10.8, height: u * 10.8, borderRadius: 99, alignItems: "center", justifyContent: "center", borderWidth: u * 0.45, borderColor: useful ? C.green : "#D8BE92", backgroundColor: useful ? "#F1F5E4" : "#FFFDF6", opacity: stock > 0 ? 1 : 0.45, transform: [{ scale: pressed ? 0.92 : 1 }] })}>
                        <EmojiIcon emoji={d.icon} size={u * 5.4} />
                        <Text allowFontScaling={false} style={{ color: C.brown, fontFamily: FONT.bold, fontSize: fs(u, TYPE.tiny) }}>{stock}</Text>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
              <View style={{ flexDirection: "row", gap: u }}>
                {Object.keys(bowl).length ? <Btn small variant="plain" label="Boşalt" onPress={() => { setBowl({}); act.sfx("tap"); }} /> : null}
                <View style={{ flex: 1 }}><Btn label={VERB[def.station]?.[0] ?? "Hazırla"} variant={complete ? "go" : "busy"} onPress={complete ? prepare : () => act.toast("Önce tarifteki malzemeleri kaseye koy.", 1500)} /></View>
              </View>
              {fromStock ? <Btn small variant="alt" label="Vitrinde hazır var: hemen ver" onPress={serve} /> : null}
            </>
          )}
        </View>
      ) : tickets.length ? <Meta tone="muted" text="Yukarıdan bir fiş seç." /> : null}

      <Btn small variant="plain" label="Makinede üret (tarif listesi)" onPress={onRecipes} />
    </Sheet>
  );
}
