// The kitchen counter (opened by tapping the prep counter): the player may prepare a guest's order by hand. Pick an order ticket, drop its
// ingredients into the bowl, stir it with a few taps, enjoy the little result moment and serve it. Optional: the waiter and the machines keep
// working as before. Rules: Game.handMake (the product, from the ingredients) and Cafe.deliver (the sale). The stars are only for fun.
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { ASSET_MODULES } from "../generated/assetModules";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRefresh, useWorld } from "../runtime/context";
import { Btn } from "./kit";
import { EmojiIcon, GameIcon } from "./icons";
import { C, FONT, fmt, fs, navHeight, TYPE, useU } from "./theme";

type Bowl = Record<string, number>;
type Phase = "gather" | "stir" | "made";
const STIRS: Record<string, number> = { oven: 6, coffee: 4 };
const TRIAL = -1;                                                  // the sel value of the trial ticket
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

/** The kitchen's own big main button (the general Btn keeps the panel size). */
function KBtn({ label, sub, onPress, u }: { label: string; sub?: string; onPress: () => void; u: number }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={sub ? `${label}, ${sub}` : label}
      style={({ pressed }) => ({ alignSelf: "stretch", minHeight: Math.max(56, u * 9), borderRadius: u * 3, borderWidth: u * 0.4, borderColor: "#4E7A2C", backgroundColor: pressed ? "#6E9E3B" : "#7DAF46", alignItems: "center", justifyContent: "center", paddingVertical: u * 0.8,
        shadowColor: "#2E4A18", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: pressed ? u * 0.2 : u * 0.7 }, transform: [{ translateY: pressed ? u * 0.5 : 0 }] })}>
      <Text allowFontScaling={false} style={{ color: "#FFFFFF", fontFamily: FONT.bold, fontSize: fs(u, TYPE.heading), textShadowColor: "#3E6420", textShadowRadius: u * 0.4 }}>{label}</Text>
      {sub ? <Text allowFontScaling={false} style={{ color: "#F1F8E4", fontFamily: FONT.bold, fontSize: fs(u, TYPE.small) }}>{sub}</Text> : null}
    </Pressable>
  );
}

export function KitchenPanel({ onRecipes }: { onRecipes: () => void }) {
  const { world, act } = useWorld();
  const { game, cafe, album } = world, u0 = useU();
  const { width, height } = useWindowDimensions();
  const u = u0 * Math.min(1.7, Math.max(1.25, height / 560));       // the kitchen is the screen's focus: everything grows with the screen's height
  const jar = Math.min(u0 * 12.8, (width - u0 * 18) / 6.6);         // six jars always fit one row
  useRefresh(250);
  const staff = (world.scenes.interior as any).staff;
  const insets = useSafeAreaInsets(), hud = insets.top + u0 * 10.6;   // the wall reaches the top of the screen, behind the top bar; the counter's own pieces start under the bar
  const openedAt = useRef(Date.now());                           // the tap that opened the counter must not close it again on the dimmed backdrop
  const [sel, setSel] = useState<number | null>(null);          // the order being prepared
  const [step, setStep] = useState(0);                          // which product of the order (a set has two)
  const [bowl, setBowl] = useState<Bowl>({});
  const [phase, setPhase] = useState<Phase>("gather");
  const [stirs, setStirs] = useState(0);
  const [made, setMade] = useState<string[]>([]);               // products of the order prepared by hand so far
  const [slips, setSlips] = useState(0);                        // wrong jars tapped for this order (only for the stars)
  const [wrong, setWrong] = useState<string | null>(null);
  const [book, setBook] = useState(false);                       // the recipe notebook is open
  const [trialPid, setTrialPid] = useState<string | null>(null);   // "Deneme": the recipe the player's own mix turned out to be
  const [noteChoice, setNoteChoice] = useState<string | null>(null);   // the touch the player gave a guest's wish ("az şekerli")
  const life = world.life;
  const shake = useRef(new Animated.Value(0)).current, spin = useRef(new Animated.Value(0)).current, wob = useRef(new Animated.Value(0)).current;
  useEffect(() => () => { cafe.handOrder = null; }, []);       // eslint-disable-line react-hooks/exhaustive-deps -- closing the counter gives the order back to the waiter

  const seated = (cafe.customers as any[]).filter((c) => c.state === "seated" && c.orderId);
  const tickets = seated.map((c) => ({ c, o: cafe.orderOf(c) })).filter((t) => t.o && t.o.status === "open");
  const cur = tickets.find((t) => t.o.id === sel) ?? null;
  const trial = sel === TRIAL;                                   // the trial ticket: mix freely, find secret recipes
  const items: string[] = cur ? cafe.orderItems(cur.o) : trial && trialPid ? [trialPid] : [];
  const pid = items[step], def = pid ? game.productsDef[pid] : null;
  const need: Record<string, number> = def?.ingredients ?? {};
  const complete = !!def && Object.entries(need).every(([k, n]) => (bowl[k] ?? 0) >= n);
  const stirNeed = def ? STIRS[def.station] ?? 5 : 5;

  const reset = () => { setStep(0); setBowl({}); setPhase("gather"); setMade([]); setStirs(0); setSlips(0); setTrialPid(null); setNoteChoice(null); };
  useEffect(() => {                                              // the guest left or was served by the waiter: start over, kindly
    if (sel != null && sel !== TRIAL && !cur) { if (made.length) act.toast("Bu sipariş artık açık değil; hazırladığın ürünler vitrine kondu.", 2400); reset(); setSel(null); }
  }, [sel, cur]);                                                // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (sel == null && tickets.length === 1) { setSel(tickets[0].o.id); setBook(true); } }, [tickets.length]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { cafe.handOrder = sel; }, [sel]);          // eslint-disable-line react-hooks/exhaustive-deps -- the waiter leaves the order the player is preparing alone
  useEffect(() => { if (complete && phase === "gather") { setPhase("stir"); setStirs(0); act.sfx("done"); } }, [complete, phase]);   // eslint-disable-line react-hooks/exhaustive-deps -- a full bowl: time to stir

  const pick = (id: number) => {
    if (id === sel) return;
    if (staff?.claims(id)) { act.toast("Garson bu siparişi zaten götürüyor.", 1400); return; }
    act.sfx("tap"); setSel(id); reset(); setBook(true);
  };
  const add = (ing: string) => {
    if (trial && !def && phase === "gather") {                     // trial: any mix, at most 3 of each
      const have = bowl[ing] ?? 0;
      if (have >= 3) { act.toast("Bu malzemeden bu kadar yeter", 1100); return; }
      if ((game.ingredients[ing] ?? 0) <= have) { act.warn(`${game.ingredientsDef[ing].name} bitti.`, 2000); return; }
      act.sfx("tap"); act.buzz(8); setBowl({ ...bowl, [ing]: have + 1 });
      wob.setValue(0); Animated.timing(wob, { toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      return;
    }
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
    if (step + 1 < items.length) { setStep(step + 1); setBowl({}); setStirs(0); setPhase("gather"); setBook(true); act.toast(`${def.icon} ${def.name} hazır! Sıradaki: ${game.productsDef[items[step + 1]].name}`, 1600); }   // a set: on to the second product
    else setPhase("made");
  };
  /** Trial: what does the mix in the bowl make? A secret is found, a known recipe is made, anything else just goes back on the shelf. */
  const tryMix = () => {
    const id = life?.matchRecipe(bowl) as string | null;
    if (!id) { act.toast("Hmm… bir şey çıkmadı. Malzemeler rafa geri kondu, başka bir karışım dene.", 2600); setBowl({}); act.sfx("tap"); return; }
    const d = game.productsDef[id];
    if (life.isSecret(id) && !life.discovered.has(id)) { life.discover(id); act.sfx("claim"); act.buzz([40, 40, 80]); }
    else if (!game.isUnlocked(id)) { act.toast(`${d.icon} Bu ${d.name} tarifi! Mağaza'dan açınca yapabilirsin.`, 2600); setBowl({}); return; }
    else act.toast(`${d.icon} Bu bir ${d.name}! Karıştır, vitrine koy.`, 1800);
    setTrialPid(id);                                               // the bowl already holds its recipe: stirring starts by itself
  };
  const serve = () => {
    if (!cur) return;
    if (staff?.claims(cur.o.id)) { act.toast("Garson bu siparişi zaten götürüyor.", 1600); return; }
    const r = cafe.deliver(cur.o.id, { noteOk: !!cur.o.note && noteChoice === cur.o.note });
    if (!r.ok) { act.warn(r.message, 2400); return; }
    game.emit("fx", { type: "coins", at: { x: width / 2, y: height * 0.55 }, big: true });     // the coins fly to the gold counter
    act.sfx("coin");
    act.toast(`${album.nameOf(cur.c.look)} çok mutlu!${r.bonus?.noteOk ? ` Tam istediği gibi (${cur.o.note})!` : ""} +${fmt(r.income)} altın`, 2000);
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
        <Text allowFontScaling={false} numberOfLines={1} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.small) }}>{album.nameOf(c.look)}</Text>
        <View style={{ flexDirection: "row", gap: u * 0.5, alignItems: "center" }}>{cafe.orderItems(o).map((id: string, i: number) => <EmojiIcon key={i} emoji={game.productsDef[id].icon} size={u * 6} />)}</View>
        <View style={{ height: u * 0.9, borderRadius: 99, backgroundColor: C.vanillaDark, overflow: "hidden" }}><View style={{ width: `${Math.round(f * 100)}%`, height: "100%", backgroundColor: f > 0.5 ? C.green : f > 0.25 ? C.honey : C.terracotta }} /></View>
        {o.note ? <Text allowFontScaling={false} numberOfLines={1} style={{ color: C.terracottaDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.tiny) }}>✎ {o.note}</Text> : null}
        {coming ? <Text allowFontScaling={false} style={{ color: C.honeyDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.tiny) }}>Garson götürüyor</Text> : null}
      </Pressable>
    );
  };

  const trialTicket = (
    <Pressable key="trial" onPress={() => { if (trial) return; act.sfx("tap"); setSel(TRIAL); reset(); setBook(true); }} accessibilityRole="button" accessibilityLabel="Deneme: gizli tarif ara" accessibilityState={{ selected: trial }}
      style={({ pressed }) => ({ width: u * 18, paddingTop: u * 1.6, paddingBottom: u * 1, paddingHorizontal: u * 1, gap: u * 0.4, borderRadius: u * 1.2, borderWidth: u * 0.3, borderStyle: "dashed", borderColor: trial ? C.green : "#C9A06A", backgroundColor: trial ? "#F4F8E8" : "rgba(255,248,234,.92)", transform: [{ scale: pressed ? 0.96 : trial ? 1.04 : 1 }, { rotate: trial ? "0deg" : "1.5deg" }] })}>
      <Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.small) }}>🧪 Deneme</Text>
      <Text allowFontScaling={false} style={{ color: C.brown, fontFamily: FONT.regular, fontSize: fs(u, TYPE.tiny) }}>Gizli tarif ara{life ? ` · ${life.discovered.size}/${Object.keys(life.secrets).length}` : ""}</Text>
    </Pressable>
  );

  // ---- the scene: the painted counter (assets/game/kitchen-counter.webp, 1024 x 1536) covers the screen between the top bar and the navigation;
  // everything stands where the picture has room for it: tickets on the wall, the recipe and the bowl on the counter top, the jars in the
  // six hollows of the shelf, the main button on the drawer
  const [box, setBox] = useState({ w: width, h: height * 0.75 });
  const sc = box.w / 1024, ox = 0, oy = box.h - 1536 * sc;        // as wide as the screen (all six hollows show), standing on the navigation; a tall phone sees more wall
  const X = (ix: number) => ox + ix * sc, Y = (iy: number) => oy + iy * sc;
  const SLOTS = [137, 287, 437, 588, 737, 887], jarS = Math.min(118 * sc, (box.w - u0 * 4) / 6.4);
  const [cardH, setCardH] = useState(u * 18);
  const counterTop = Y(560), drawerTop = Y(1338), bowlTop = counterTop + u0 * 1 + cardH + u0 * 0.6, jarTop = Y(1252) - jarS * 0.62, room = jarTop - u * 7.5 - bowlTop, bowlW = Math.max(u0 * 26, Math.min(box.w * 0.8, room / 0.84)), bowlCy = bowlTop + Math.max(0, (room - bowlW * 0.84) / 2) + bowlW * 0.42;   // as big as the counter allows, in its middle   // the bowl (and the stir hint under it) ends above the jars
  const paper = { backgroundColor: "rgba(255,248,234,.96)", borderRadius: u * 1.4, borderWidth: u * 0.3, borderColor: "#E2C69B" };
  const shadowText = { textShadowColor: "#5E3A20", textShadowRadius: u * 0.6, textShadowOffset: { width: 0, height: u * 0.15 } };

  return (
    <>
    <Pressable accessibilityLabel="Mutfağı kapat" onPress={() => { if (Date.now() - openedAt.current > 600) act.openOverlay(null); }} style={{ position: "absolute", left: -500, right: -500, top: -500, bottom: -500, backgroundColor: "rgba(40,24,12,.55)", zIndex: 19 }} />
    <View onLayout={(e) => { const { width: w, height: h } = e.nativeEvent.layout; if (Math.abs(w - box.w) > 1 || Math.abs(h - box.h) > 1) setBox({ w, h }); }}
      style={{ position: "absolute", left: 0, right: 0, top: -insets.top, bottom: navHeight(u0), zIndex: 20, overflow: "hidden", backgroundColor: "#7A4A26" }}>
      {/* above the picture (a tall phone): more of the tiled wall, its warm light fading upwards */}
      {oy > 0 ? <Image source={ASSET_MODULES["assets/kitchen-wall.webp"]} style={{ position: "absolute", left: 0, top: oy - box.w * 800 / 1024 + 2, width: box.w, height: box.w * 800 / 1024 }} /> : null}
      <Image source={ASSET_MODULES["assets/kitchen-counter.webp"]} style={{ position: "absolute", left: ox, top: oy, width: 1024 * sc, height: 1536 * sc }} />

      {/* title and close, on the wall */}
      <View style={{ position: "absolute", left: u0 * 2, right: u0 * 1, top: hud + u0 * 1.2, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ paddingHorizontal: u0 * 2.2, paddingVertical: u0 * 0.6, borderRadius: u0 * 2, backgroundColor: "#8A5A36", borderWidth: u0 * 0.45, borderColor: "#5E3A20" }}>
          <Text allowFontScaling={false} style={{ color: "#FFF4DE", fontFamily: FONT.bold, fontSize: fs(u0, TYPE.heading) }}>Mutfak Tezgâhı</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: u0 * 0.8, paddingLeft: u0 * 1, paddingRight: u0 * 2, height: u0 * 7, borderRadius: 99, backgroundColor: "rgba(255,248,234,.95)", borderWidth: u0 * 0.35, borderColor: "#C9A06A", marginLeft: "auto", marginRight: u0 * 1.2 }}>
          <GameIcon id="coin" size={u0 * 5.6} />
          <Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u0, TYPE.heading) }}>{fmt(game.gold)}</Text>
        </View>
        <Pressable onPress={() => act.openOverlay(null)} accessibilityLabel="Kapat" style={{ width: Math.max(44, u0 * 8), height: Math.max(44, u0 * 8), alignItems: "center", justifyContent: "center" }}>
          <Image source={ASSET_MODULES["assets/icons/ui-close.webp"]} style={{ width: Math.max(40, u0 * 7.6), height: Math.max(40, u0 * 7.6), resizeMode: "contain" }} />
        </Pressable>
      </View>

      {/* order tickets pinned on the wall */}
      <View style={{ position: "absolute", left: 0, right: 0, top: hud + u0 * 11, height: Math.max(u * 14, counterTop - hud - u0 * 12) }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: u * 1.2, paddingVertical: u * 0.8, paddingHorizontal: u0 * 2, alignItems: "flex-start" }}>
          {tickets.map(({ c, o }) => ticket(c, o))}
          {!tickets.length ? <View style={[paper, { width: u * 26, padding: u * 1 }]}><Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.small) }}>Bekleyen sipariş yok. Müşteriler oturunca fişleri buraya asılır.</Text></View> : null}
          {life ? trialTicket : null}
        </ScrollView>
      </View>

      {(cur && def) || trial ? (
        <>
          {/* steps (the recipe itself is in the notebook) */}
          <View onLayout={(e) => { const h = e.nativeEvent.layout.height; if (Math.abs(h - cardH) > 1) setCardH(h); }} style={{ position: "absolute", left: u0 * 3, right: u0 * 3, top: counterTop + u0 * 1, gap: u * 0.7 }}>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: u * 0.6 }}>
              {["Malzeme", "Karıştır", "Servis"].map((t, i) => (
                <View key={t} style={{ paddingHorizontal: u * 1.1, paddingVertical: u * 0.3, borderRadius: 99, backgroundColor: i === stage ? "#FFF4DE" : i < stage ? "rgba(125,152,85,.92)" : "rgba(94,58,32,.55)" }}>
                  <Text allowFontScaling={false} style={{ color: i === stage ? C.brownDark : WOOD.text, fontFamily: FONT.bold, fontSize: fs(u, TYPE.tiny) }}>{i < stage ? "✓" : `${i + 1}`} {t}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* the bowl on the counter (tap it to stir), or the finished product */}
          <View style={{ position: "absolute", left: 0, right: 0, top: bowlCy - bowlW * 0.42, alignItems: "center" }}>
            {phase === "made" ? (
              <View style={{ gap: u * 0.3, alignItems: "center", marginTop: u * 1 }}><Pop emojis={made.map((id) => game.productsDef[id].icon)} u={u} /><Stars n={rateStars} label={rateText} u={u} /></View>
            ) : (
              <Pressable onPress={stir} disabled={phase !== "stir"} accessibilityRole="button" accessibilityLabel={phase === "stir" ? `Karıştır, ${stirs}/${stirNeed}` : "Kase"}>
                <View style={{ position: "absolute", left: bowlW * 0.12, right: bowlW * 0.12, bottom: -bowlW * 0.02, height: bowlW * 0.09, borderRadius: 999, backgroundColor: "rgba(70,40,20,.2)" }} />
                {/* the painted bowl (assets/game/kitchen-bowl.webp, 700 x 587); what is in it shows inside its opening */}
                <Animated.View style={{ width: bowlW, height: bowlW * 587 / 700,
                  transform: [{ rotate: wob.interpolate({ inputRange: [0, 0.5, 1], outputRange: ["0deg", "-3deg", "0deg"] }) }, { scale: spin.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 1.05, 1] }) }] }}>
                  <Image source={ASSET_MODULES["assets/kitchen-bowl.webp"]} style={{ position: "absolute", left: 0, top: 0, width: bowlW, height: bowlW * 587 / 700 }} />
                  {phase === "stir" ? <View pointerEvents="none" style={{ position: "absolute", left: bowlW * 0.2, right: bowlW * 0.2, top: bowlW * 0.2, height: bowlW * 0.2, borderRadius: 999, backgroundColor: "rgba(255,224,138,.35)" }} /> : null}
                  <View style={{ position: "absolute", left: bowlW * 0.14, right: bowlW * 0.14, top: bowlW * 0.1, height: bowlW * 0.3, alignItems: "center", justifyContent: "center" }}>
                    {made.length && phase === "gather" && !Object.keys(bowl).length
                      ? <View style={{ flexDirection: "row", gap: u }}>{made.map((id, i) => <EmojiIcon key={i} emoji={game.productsDef[id].icon} size={u * 8} />)}</View>
                      : <Animated.View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: u * 0.3, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }}>
                          {Object.entries(bowl).flatMap(([k, n]) => Array.from({ length: n }, (_, i) => <Drop key={`${k}${i}`} emoji={game.ingredientsDef[k].icon} size={u * 5} />))}
                        </Animated.View>}
                    {phase === "gather" && !Object.keys(bowl).length && !made.length ? <Text allowFontScaling={false} style={{ color: "#A9774A", fontFamily: FONT.bold, fontSize: fs(u, TYPE.small), textAlign: "center" }}>Kase boş</Text> : null}
                  </View>
                </Animated.View>
                {phase === "stir" ? Array.from({ length: stirs }, (_, i) => <Puff key={i} steam={def?.station === "coffee"} u={u} seed={i + step * 7} />) : null}
              </Pressable>
            )}
            {phase === "stir" ? (
              <View style={{ alignItems: "center", gap: u * 0.5, marginTop: u * 1.2 }}>
                <Text allowFontScaling={false} style={[{ color: "#FFF8EA", fontFamily: FONT.bold, fontSize: fs(u, TYPE.body) }, shadowText]}>{STIR_TEXT[def?.station ?? "oven"]?.[0] ?? "Kaseye dokun, karıştır!"}</Text>
                <View style={{ flexDirection: "row", gap: u * 0.7 }}>
                  {Array.from({ length: stirNeed }, (_, i) => <View key={i} style={{ width: u * 2.4, height: u * 2.4, borderRadius: 99, backgroundColor: i < stirs ? "#FFE08A" : "rgba(94,58,32,.55)", borderWidth: u * 0.3, borderColor: "#FFF4DE" }} />)}
                </View>
                {cur?.o.note && step === items.length - 1 ? (
                  <View style={{ alignItems: "center", gap: u * 0.4 }}>
                    <Text allowFontScaling={false} style={[{ color: "#FFF8EA", fontFamily: FONT.bold, fontSize: fs(u, TYPE.small) }, shadowText]}>Müşterinin isteği: “{cur.o.note}”. Son dokunuşu seç:</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: u * 0.5 }}>
                      {(life.cfg.requests.notes as string[]).map((n) => (
                        <Pressable key={n} onPress={() => { setNoteChoice(n); act.sfx("tap"); }} accessibilityRole="button" accessibilityLabel={`Dokunuş: ${n}`} accessibilityState={{ selected: noteChoice === n }}
                          style={{ paddingHorizontal: u * 1, paddingVertical: u * 0.4, borderRadius: 99, borderWidth: u * 0.3, borderColor: noteChoice === n ? C.green : "#E4CFA8", backgroundColor: noteChoice === n ? "#F4F8E8" : "rgba(255,248,234,.95)" }}>
                          <Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.tiny) }}>{noteChoice === n ? "✓ " : ""}{n}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </>
      ) : tickets.length ? (
        <View style={[paper, { position: "absolute", left: u0 * 8, right: u0 * 8, bottom: box.h - jarTop + u0 * 3, alignItems: "center", gap: u * 0.6, padding: u * 1.6 }]}>
          <Text allowFontScaling={false} style={{ fontSize: u * 7 }}>👆</Text>
          <Text allowFontScaling={false} style={{ textAlign: "center", color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.heading) }}>Bir sipariş fişi seç</Text>
          <Text allowFontScaling={false} style={{ textAlign: "center", color: C.brown, fontFamily: FONT.regular, fontSize: fs(u, TYPE.body) }}>Malzemeleri kaseye at, karıştır ve servis et.</Text>
        </View>
      ) : null}

      {/* the ingredient jars, standing in the six hollows of the shelf */}
      {phase !== "gather" ? null : (Object.keys(game.ingredientsDef) as string[]).slice(0, 6).map((k, i) => {   // (stirring and the result moment have the counter to themselves)
        const d = game.ingredientsDef[k], stock = (game.ingredients[k] ?? 0) - (bowl[k] ?? 0), useful = (!!def && phase === "gather" && (need[k] ?? 0) > (bowl[k] ?? 0)) || (trial && !def && phase === "gather");
        return (
          <Animated.View key={k} style={{ position: "absolute", left: X(SLOTS[i]) - jarS / 2, top: Y(1252) - jarS * 0.62, width: jarS, alignItems: "center", transform: [{ translateX: wrong === k ? shake.interpolate({ inputRange: [-1, 1], outputRange: [-u * 1.2, u * 1.2] }) : 0 }] }}>
            <Pressable onPress={() => add(k)} disabled={(!def && !trial) || phase !== "gather"} accessibilityRole="button" accessibilityLabel={`${d.name} ekle, ${stock} var`}
              style={({ pressed }) => ({ width: jarS, height: jarS, borderRadius: jarS * 0.3, alignItems: "center", justifyContent: "center", borderWidth: u * 0.45, borderColor: useful ? "#9CC46A" : "#E4CFA8", backgroundColor: useful ? "#F4F8E8" : "#FFFAF0", opacity: stock > 0 ? 1 : 0.5,
                shadowColor: "#3B2412", shadowOpacity: 0.35, shadowRadius: u * 0.5, shadowOffset: { width: 0, height: u * 0.4 }, transform: [{ scale: pressed ? 0.88 : useful ? 1.04 : 1 }, { translateY: pressed ? u * 0.3 : 0 }] })}>
              <EmojiIcon emoji={d.icon} size={jarS * 0.56} />
            </Pressable>
            <View style={{ marginTop: -jarS * 0.16, minWidth: jarS * 0.5, paddingHorizontal: u * 0.6, borderRadius: 99, backgroundColor: "#8A5A36", borderWidth: u * 0.25, borderColor: "#FFF4DE", alignItems: "center" }}>
              <Text allowFontScaling={false} style={{ color: "#FFF4DE", fontFamily: FONT.bold, fontSize: fs(u0, TYPE.small) }}>{stock}</Text>
            </View>
          </Animated.View>
        );
      })}

      {/* the recipe notebook: a paper page over the counter, opened by itself when an order is picked */}
      {book && trial && !def && phase === "gather" ? (
        <Pressable onPress={() => { setBook(false); act.sfx("tap"); }} accessibilityLabel="Tarif defterini kapat" style={{ position: "absolute", left: 0, right: 0, top: counterTop - u0 * 2, bottom: 0, zIndex: 5, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(40,24,12,.35)" }}>
          <View style={{ width: Math.min(box.w - u0 * 8, u0 * 80), padding: u * 1.6, gap: u * 0.9, borderRadius: u * 1.2, backgroundColor: "#FFF8E8", borderWidth: u * 0.4, borderColor: "#C9A06A", transform: [{ rotate: "-1.2deg" }] }}>
            <Text allowFontScaling={false} style={{ color: C.terracottaDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.small) }}>📒 Tarif Defteri · Gizli tarifler</Text>
            {(Object.entries(life.secrets) as [string, any][]).map(([id, sd]) => {
              const got = life.discovered.has(id);
              return (
                <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: u * 1, paddingBottom: u * 0.5, borderBottomWidth: 1, borderColor: "rgba(150,120,80,.3)" }}>
                  {got ? <EmojiIcon emoji={sd.icon} size={u * 6} /> : <Text allowFontScaling={false} style={{ fontSize: u * 5 }}>❔</Text>}
                  <View style={{ flex: 1 }}>
                    <Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.heading) }}>{got ? sd.name : "???"}</Text>
                    <Text allowFontScaling={false} style={{ color: C.brown, fontFamily: FONT.regular, fontSize: fs(u, TYPE.small) }}>{got ? Object.entries(sd.ingredients).map(([k, n]) => `${n} ${game.ingredientsDef[k].name}`).join(", ") : `İpucu: ${sd.hint}`}</Text>
                  </View>
                </View>
              );
            })}
            <Text allowFontScaling={false} style={{ color: C.brown, fontFamily: FONT.regular, fontSize: fs(u, TYPE.small) }}>Kaseye istediğin malzemeleri at ve "Dene"ye bas. Tutmazsa malzemeler rafa geri döner. Kapatmak için dokun.</Text>
          </View>
        </Pressable>
      ) : null}
      {book && cur && def && phase === "gather" ? (
        <Pressable onPress={() => { setBook(false); act.sfx("tap"); }} accessibilityLabel="Tarif defterini kapat" style={{ position: "absolute", left: 0, right: 0, top: counterTop - u0 * 2, bottom: 0, zIndex: 5, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(40,24,12,.35)" }}>
          <View style={{ width: Math.min(box.w - u0 * 8, u0 * 80), padding: u * 1.6, gap: u * 1, borderRadius: u * 1.2, backgroundColor: "#FFF8E8", borderWidth: u * 0.4, borderColor: "#C9A06A", transform: [{ rotate: "-1.2deg" }],
            shadowColor: "#2A160A", shadowOpacity: 0.4, shadowRadius: u * 1.6, shadowOffset: { width: 0, height: u } }}>
            {/* the notebook's rings and red margin line */}
            <View pointerEvents="none" style={{ position: "absolute", left: u * 4.6, top: 0, bottom: 0, width: u * 0.3, backgroundColor: "rgba(184,95,59,.45)" }} />
            <View pointerEvents="none" style={{ position: "absolute", left: -u * 1.3, top: u * 2, bottom: u * 2, justifyContent: "space-between" }}>{[0, 1, 2, 3, 4].map((i) => <View key={i} style={{ width: u * 2.6, height: u * 1.3, borderRadius: 99, borderWidth: u * 0.35, borderColor: "#8A6A44", backgroundColor: "#EADCC0" }} />)}</View>
            <View style={{ paddingLeft: u * 5, gap: u * 0.9 }}>
              <Text allowFontScaling={false} style={{ color: C.terracottaDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.small) }}>📒 Tarif Defteri</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: u * 1 }}>
                <EmojiIcon emoji={def.icon} size={u * 9} />
                <Text allowFontScaling={false} style={{ flex: 1, color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.title) }}>{def.name}{items.length > 1 ? ` (${step + 1}/${items.length})` : ""}</Text>
              </View>
              {Object.entries(need).map(([k, n]) => {
                const have = bowl[k] ?? 0, ok = have >= n;
                return (
                  <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: u * 1, paddingBottom: u * 0.5, borderBottomWidth: 1, borderColor: "rgba(150,120,80,.3)" }}>
                    <EmojiIcon emoji={game.ingredientsDef[k].icon} size={u * 5.6} />
                    <Text allowFontScaling={false} style={{ flex: 1, color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.heading) }}>{n} {game.ingredientsDef[k].name}</Text>
                    <Text allowFontScaling={false} style={{ color: ok ? C.greenDark : C.brown, fontFamily: FONT.bold, fontSize: fs(u, TYPE.heading) }}>{ok ? "✓" : `${have}/${n}`}</Text>
                  </View>
                );
              })}
              {cur.o.note ? <Text allowFontScaling={false} style={{ color: C.terracottaDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.body) }}>✎ Müşterinin isteği: {cur.o.note} (karıştırırken seç)</Text> : null}
              <Text allowFontScaling={false} style={{ color: C.brown, fontFamily: FONT.regular, fontSize: fs(u, TYPE.small) }}>Malzemeleri raftan kaseye at, sonra karıştır. Kapatmak için dokun.</Text>
            </View>
          </View>
        </Pressable>
      ) : null}

      {/* the drawer: the main action */}
      <View style={{ position: "absolute", left: u0 * 4, right: u0 * 4, top: drawerTop, bottom: u0 * 1.4, justifyContent: "center", gap: u0 * 0.8 }}>
        {def && phase === "stir" ? <KBtn u={u} label={STIR_TEXT[def.station]?.[1] ?? "Karıştır"} onPress={stir} />
          : cur && def && phase === "made" ? <KBtn u={u} label="🛎 Servis Et" sub={`${album.nameOf(cur.c.look)} bekliyor`} onPress={serve} />
          : trial && phase === "made" ? <KBtn u={u} label="✓ Vitrine koy" sub={def ? `${def.icon} ${def.name}` : undefined} onPress={() => { act.toast(`${def?.icon ?? ""} ${def?.name ?? "Ürün"} vitrine kondu`, 1600); reset(); setSel(null); }} />
          : trial && !def && Object.keys(bowl).length ? <View style={{ flexDirection: "row", gap: u0 }}><Btn small variant="plain" label="Kaseyi boşalt" onPress={() => { setBowl({}); act.sfx("tap"); }} /><View style={{ flex: 1 }}><KBtn u={u} label="🧪 Dene" onPress={tryMix} /></View></View>
          : (
            <View style={{ flexDirection: "row", gap: u0 * 1, flexWrap: "wrap", justifyContent: "center" }}>
              {(cur && def) || trial ? <Btn small variant="alt" label="📒 Tarif Defteri" onPress={() => { setBook(true); act.sfx("tap"); }} /> : null}
              {cur && Object.keys(bowl).length ? <Btn small variant="plain" label="Kaseyi boşalt" onPress={() => { setBowl({}); act.sfx("tap"); }} /> : null}
              {fromStock ? <Btn small variant="alt" label="Vitrinde hazır: hemen ver" onPress={serve} /> : null}
              <Btn small variant="plain" label="Makinede üret" onPress={onRecipes} />
            </View>
          )}
      </View>
    </View>
    </>
  );
}
