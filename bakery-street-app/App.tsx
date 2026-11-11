// Fırın & Kafe: the native app. Scenes are drawn with Skia (src/scene, src/engine); everything else is React Native (src/ui).
import { useFonts } from "expo-font";
import { Nunito_700Bold } from "@expo-google-fonts/nunito/700Bold";
import { Nunito_800ExtraBold } from "@expo-google-fonts/nunito/800ExtraBold";
import * as ScreenOrientation from "expo-screen-orientation";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Animated, BackHandler, Image, PixelRatio, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { AREAS } from "./src/scene/interior-layout.js";
import { loadAssets } from "./src/assets.js";
import { loadFonts } from "./src/engine/fonts";
import { Feedback } from "./src/runtime/feedback";
import { WorldProvider, useRefresh, type Actions } from "./src/runtime/context";
import { GameView } from "./src/runtime/GameView";
import { NativeStorage } from "./src/runtime/storage";
import { mark } from "./src/runtime/startup";
import { createWorld, type SceneId, type World } from "./src/runtime/world";
import { CoinFlights, GoalPill, Hud, Nav, TillPill, TipBar, Toast, type NavId } from "./src/ui/Chrome";
import { CafePanel } from "./src/ui/CafePanel";
import { Present } from "./src/ui/kit";
import { MOTION } from "./src/ui/motion";
import { PanelBoundary, StageCard, saleNotes } from "./src/ui/Celebration";
import { MarketPanel } from "./src/ui/MarketPanel";
import { ShopPanel, type ShopTab } from "./src/ui/ShopPanel";
import { AlbumPanel, StatsPanel } from "./src/ui/Collection";
import { DailyPanel, ExplorePanel, QuestPanel, ResearchPanel, SettingsPanel, TownPanel, formatReward } from "./src/ui/Overlays";
import { C, FONT, fmt, fs, useU } from "./src/ui/theme";


/** Start-up diagnostics: any error (also in render or outside React) is shown on screen instead of leaving the splash screen forever. */
let reportCrash: (m: string) => void = () => {};
try {
  const EU = (globalThis as any).ErrorUtils;
  const prev = EU?.getGlobalHandler?.();
  EU?.setGlobalHandler?.((e: any, fatal?: boolean) => { reportCrash(`${fatal ? "Hata" : "Uyarı"}: ${String(e?.message ?? e)}\n${String(e?.stack ?? "").split("\n").slice(0, 6).join("\n")}`); prev?.(e, fatal); });
} catch { /* ignore */ }

class Boundary extends React.Component<{ children: React.ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  componentDidCatch() { SplashScreen.hideAsync().catch(() => {}); }
  static getDerivedStateFromError(e: any) { return { err: `${String(e?.message ?? e)}\n${String(e?.stack ?? "").split("\n").slice(0, 6).join("\n")}` }; }
  render() { return this.state.err ? <View style={styles.center}><Text allowFontScaling={false} style={styles.msg}>Oyun çöktü.{"\n"}{this.state.err}</Text></View> : this.props.children; }
}

const LOGO = require("./assets/splash-icon.png");

/** The loading screen: the same logo as the splash screen, a filling bar and the current step (so a slow start shows where it is). */
function Loading({ progress, stage }: { progress: number; stage: string }) {
  const bar = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(bar, { toValue: progress, duration: MOTION.count, easing: MOTION.settle, useNativeDriver: false }).start(); }, [progress, bar]);
  return (
    <View style={styles.center}>
      <Image source={LOGO} style={{ width: 200, height: 200, resizeMode: "contain" }} />
      <View style={{ width: 220, height: 14, borderRadius: 7, marginTop: 28, backgroundColor: "rgba(245,230,200,0.18)", overflow: "hidden" }}>
        <Animated.View style={{ height: "100%", borderRadius: 7, backgroundColor: "#C99A61", width: bar.interpolate({ inputRange: [0, 1], outputRange: ["4%", "100%"] }) }} />
      </View>
      <Text allowFontScaling={false} style={[styles.msg, { fontSize: 14, marginTop: 12, opacity: 0.75 }]}>{Math.round(progress * 100)}% · {stage}</Text>
    </View>
  );
}

export default function Root() { return <Boundary><App /></Boundary>; }

function App() {
  const [fontsReady] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold });
  const [world, setWorld] = useState<World | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const storage = useRef(new NativeStorage());
  const startupProblems = useRef<string[]>([]);

  const [stage, setStage] = useState("başlıyor");
  useEffect(() => {
    reportCrash = (m) => setError(m);
    SplashScreen.hideAsync().catch(() => {});                  // the loading text (with its stage) is shown at once, never a frozen splash
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    (async () => {
      try {
        setStage("kayıt okunuyor"); await storage.current.hydrate(); mark("kayıt");
        setStage("yazı tipi"); await loadFonts(); mark("yazı tipi");
        setStage("resimler"); await loadAssets({ onProgress: (d: number, t: number) => setProgress(d / t) }); mark("resimler");
        setStage("oyun kuruluyor");
        const w = createWorld(storage.current, (m) => startupProblems.current.push(m));
        if (Platform.OS === "web") (window as any).__world = w;   // development screenshots only
        mark("oyun kuruluyor");
        setWorld(w);
      } catch (e) { setError(String(e)); }
      finally { SplashScreen.hideAsync().catch(() => {}); }
    })();
  }, []);

  if (error) return <View style={styles.center}><Text allowFontScaling={false} style={styles.msg}>Oyun yüklenemedi.{"\n"}{error}</Text></View>;
  if (!world || !fontsReady) return <Loading progress={progress} stage={stage} />;
  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      <Shell world={world} storage={storage.current} problems={startupProblems.current} />
    </SafeAreaProvider>
  );
}

type Overlay = "quests" | "daily" | "album" | "stats" | "photo" | "settings" | "town" | "shop";

function Shell({ world, storage, problems }: { world: World; storage: NativeStorage; problems: string[] }) {
  const insets = useSafeAreaInsets();
  const feedback = useMemo(() => new Feedback(world.settings), [world]);
  useEffect(() => {                                       // graphics and hint settings reach the cafe scene (now and whenever they change)
    const apply = () => { const sc = world.scenes.interior as any; sc.lowFx = !!world.settings.values.lowfx; sc.tipsOn = !!world.settings.values.tips; };
    apply(); world.settings.on(apply);
  }, [world]);
  const [sceneId, setSceneId] = useState<SceneId>("interior");
  const [panel, setPanel] = useState<{ id: string; side: "left" | "right" } | null>(null);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [shopReq, setShopReq] = useState<{ tab: ShopTab; n: number }>({ tab: "goal", n: 0 });
  const [peeking, setPeeking] = useState(false);          // the shop sheet is tucked away for a moment so a new piece can be seen in the café
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState({ text: "", seq: 0 });
  const [celebrate, setCelebrate] = useState<{ icon: string; title: string; lines: string[] } | null>(null);   // stage reached: a short celebration card
  const [saveWarn, setSaveWarn] = useState<string | null>(problems[problems.length - 1] ?? null);
  const [exploreSel, setExploreSel] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const switching = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sceneRef = useRef<SceneId>("interior");
  sceneRef.current = sceneId;
  const game = world.game;
  useEffect(() => { world.cafe.setActive(true); world.scenes.interior.snap(); }, [world]);          // the game starts in the cafe

  const showToast = useCallback((text: string, ms = 1800) => {
    setToast((t) => ({ text, seq: t.seq + 1 }));
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ text: "", seq: t.seq + 1 })), ms);
  }, []);
  const failPanel = useCallback(() => { setOverlay(null); setPanel(null); showToast("Bu ekran açılamadı; oyun devam ediyor.", 3000); }, [showToast]);
  const warn = useCallback((text: string, ms = 2400) => { showToast(text, ms); feedback.sfx("error"); feedback.buzz([40, 30, 40]); }, [showToast, feedback]);

  const go = useCallback((id: SceneId) => {
    if (switching.current || sceneRef.current === id) return;
    switching.current = true;
    Animated.timing(fade, { toValue: 1, duration: MOTION.scene, easing: MOTION.settle, useNativeDriver: true }).start(() => {
      setPanel(null); setOverlay(null);
      world.cafe.setActive(id === "interior");               // customers only run while the cafe is open
      world.scenes.interior.select(null);
      setSceneId(id);
      Animated.timing(fade, { toValue: 0, duration: MOTION.scene, easing: MOTION.settle, useNativeDriver: true }).start(() => { switching.current = false; });
    });
  }, [fade, world]);

  const peek = useCallback((ms = 2600) => {
    setPeeking(true);
    if (peekTimer.current) clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => setPeeking(false), ms);
  }, []);
  useEffect(() => () => { if (peekTimer.current) clearTimeout(peekTimer.current); }, []);

  const act: Actions = useMemo(() => ({
    toast: showToast, warn,
    sfx: (n) => feedback.sfx(n), buzz: (p) => feedback.buzz(p),
    go,
    openOverlay: (id) => { setPeeking(false); setOverlay((cur) => (id === cur ? null : id)); },
    openShop: (tab = "goal") => {
      const open = () => { setPanel(null); world.scenes.interior.select(null); setPeeking(false); setShopReq((r) => ({ tab: tab as ShopTab, n: r.n + 1 })); setOverlay("shop"); };
      if (sceneRef.current === "interior") open(); else { go("interior"); setTimeout(open, 520); }       // the shop opens over the café
    },
    peek,
    closePanel: () => { setPanel(null); world.scenes.interior.select(null); },
  }), [showToast, warn, feedback, go, world, peek]);

  // ---- game events: toasts, sounds, vibration ---------------------------------------------------------------------------------------
  useEffect(() => {
    const offs: any[] = [];
    offs.push(game.on("change", (e: any) => {
      switch (e?.type) {
        case "sell": case "sale": feedback.sfx("coin"); feedback.buzz(25); break;
        case "buy": feedback.sfx("buy"); break;
        case "upgrade": feedback.sfx("claim"); feedback.buzz([30, 40, 30]); break;
        case "quest": case "daily": feedback.sfx("claim"); feedback.buzz(40); break;
        case "complete": feedback.sfx("done"); feedback.buzz(20); break;
        case "start": feedback.sfx("tap"); break;
        default: break;
      }
    }));
    offs.push(game.on("customer", (e: any) => { if (e?.type === "leave" && e.income) showToast(`${game.productsDef[e.product].icon} satıldı · +${fmt(e.income)} altın${saleNotes(e)}`, e.bonus?.pct ? 1900 : 1400); }));   // sold: by a tap or by the waiter
    offs.push(game.on("album", (e: any) => showToast(e.completed ? `📖 Müşteri albümü tamamlandı! +${fmt(e.gold)} altın` : `📖 Yeni müşteri: ${world.album.nameOf(e.look)} · +${fmt(e.gold)} altın`, 2600)));
    offs.push(game.on("goalComplete", ({ goal }: any) => showToast(`🎯 Günlük hedef tamamlandı: ${goal.name} — Görevler'den ödülünü al`, 3000)));
    offs.push(game.on("complete", ({ product }: any) => showToast(`${game.productsDef[product].icon} ${game.productsDef[product].name} hazır!`, 1600)));
    offs.push(game.on("questComplete", ({ quest }: any) => showToast(`🎯 Görev tamamlandı: ${quest.name} — Görevler'den ödülünü al`, 3000)));
    offs.push(game.on("stage", ({ stage }: any) => { const next = world.shop.nextStage(); setCelebrate({ icon: "🏆", title: `Aşama ${stage.id}: ${stage.name}`, lines: ["Kafen büyüdü, yeni bir görünüme kavuştu!", ...(stage.reward?.gold ? [`Ödül: 💰 ${fmt(stage.reward.gold)} altın`] : []), next ? `Sıradaki aşama: ${next.name}` : "En yüksek aşamaya ulaştın!"] }); feedback.sfx("claim"); feedback.buzz([40, 40, 80]); }));
    offs.push(game.on("shop", () => feedback.sfx("buy")));
    offs.push(game.on("exploreReady", ({ region }: any) => { showToast(`🎁 ${region.name} keşfi tamamlandı — ödülünü al!`, 4000); feedback.sfx("done"); feedback.buzz(40); }));
    let levelUps: any[] = [];                                // one action can pass several levels: show a single summary
    offs.push(game.on("levelUp", (e: any) => {
      if (!levelUps.length) queueMicrotask(() => {
        const list = levelUps; levelUps = [];
        const reward: any = { gold: 0, ingredients: {} };
        for (const l of list) { reward.gold += l.reward.gold ?? 0; for (const [k, v] of Object.entries(l.reward.ingredients ?? {})) reward.ingredients[k] = (reward.ingredients[k] ?? 0) + (v as number); }
        const parts: string[] = [];
        if (reward.gold) parts.push(`+${fmt(reward.gold)} altın`);
        for (const [k, v] of Object.entries(reward.ingredients)) parts.push(`${game.ingredientsDef[k]?.icon ?? ""} ×${v}`);
        const title = list.length > 1 ? `Seviye ${list[0].level}–${list[list.length - 1].level}` : `Seviye ${list[0].level}`;
        const levels = list.map((l: any) => l.level), fresh = (world.shop.items as any[]).filter((d) => d.category !== "ingredients" && levels.includes(world.shop.minLevelOf(d)));     // what these levels open in the shop
        if (fresh.length) setCelebrate((prev) => prev ?? { icon: "⭐", title: `${title}!`, lines: [`Ödül: ${parts.join("  ")}`, `Mağaza'da yeni: ${fresh.slice(0, 4).map((d) => d.name).join(", ")}${fresh.length > 4 ? ` ve ${fresh.length - 4} tane daha` : ""}`] });
        else showToast(`⭐ ${title}! Ödül: ${parts.join("  ")}`, 3800);
        feedback.sfx("claim"); feedback.buzz([40, 40, 80]);
      });
      levelUps.push(e);
    }));
    return () => offs.forEach((o) => o?.());
  }, [game, feedback, showToast, world]);

  useEffect(() => {
    feedback.init();
    let awayAt = 0;
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") { if (!awayAt) awayAt = Date.now(); world.saves.save(); void storage.flush(); return; }
      const away = awayAt ? Date.now() - awayAt : 0; awayAt = 0;
      if (away < 60_000) return;                               // back after a while: what happened meanwhile, in one line
      const done: Record<string, number> = {};
      const off = world.game.on("complete", ({ product }: any) => { done[product] = (done[product] ?? 0) + 1; });
      world.game.tick(); off();
      const till = world.till.settle();
      const parts = [...Object.entries(done).map(([id, n]) => `${world.game.productsDef[id].icon}×${n}`), ...(till > 0 ? [`kasada +${fmt(world.till.stored)} altın`] : [])];
      if (parts.length) showToast(`Sen yokken: ${parts.join(" · ")}`, 3600);
      if (world.daily.status().canClaim) setOverlay((o) => o ?? "daily");
    });
    if (world.loadResult.summary && world.loadResult.status === "loaded") showToast(`Sen yokken hazırlananlar: ${world.loadResult.summary}`, 4200);
    if (world.daily.status().canClaim) setOverlay("daily");  // first visit of the day: offer the daily reward
    return () => sub.remove();
  }, [feedback, storage, world, showToast]);

  // Android back button: close the open panel, then go back to the street, otherwise leave the app as usual
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (overlay) { setOverlay(null); return true; }
      if (panel) { act.closePanel(); return true; }
      if (sceneRef.current !== "interior") { go("interior"); return true; }
      return false;
    });
    return () => sub.remove();
  }, [overlay, panel, act, go]);

  const reset = useCallback(() => {
    const r = world.saves.reset({ confirmed: true });
    if (!r.ok) { warn(r.message, 4500); return; }
    world.scenes.interior.snap();
    setOverlay(null);
    showToast(r.warning ? `İlerleme sıfırlandı. ${r.warning}` : "İlerleme sıfırlandı. Eski kayıt yedeklendi.", 3800);
  }, [world, warn, showToast]);

  // ---- taps on the scene ------------------------------------------------------------------------------------------------------------
  const onPress = useCallback((scene: any, p: { x: number; y: number }, down: boolean) => {
    feedback.init();
    if (down) { scene.press(true, p.x, p.y); return; }
    scene.press(false, p.x, p.y);
    if (switching.current) return;
    const hit = scene.hitTest(p.x, p.y);
    const id = sceneRef.current;
    if (id === "street") {
      const target: Record<string, SceneId> = { bakery: "interior", market: "market", bookshop: "bookshop" };
      if (hit && target[hit]) { scene.tapBuilding(hit, p.x, p.y); setTimeout(() => go(target[hit]), 260); }
    } else if (id === "explore") {
      if (hit) { scene.selected = hit; setExploreSel(hit); }
    } else if (id === "interior") {
      if (!hit) { act.closePanel(); }
      else if (hit.startsWith("customer:")) {
        const cust = world.cafe.customers.find((x: any) => x.id === +hit.slice(9));
        if (cust?.orderId && scene.staff.claims(cust.orderId)) { showToast("Garson siparişi getiriyor…", 1100); return; }     // already on its way: do not serve it a second time
        const r = world.cafe.deliverToCustomer(+hit.slice(9));
        if (!r.ok) showToast(r.message, 2400);                                                                                   // (a sale is announced by the 'customer' event below)
      } else {
        const area = AREAS.find((a: any) => a.id === hit);
        if (area?.panel) { scene.select(area.id); setOverlay(null); setPanel({ id: area.panel, side: "right" }); }
        else { act.closePanel(); showToast("Müşteri masaları yakında!"); }
      }
    }
  }, [act, feedback, game, go, showToast, world]);

  if (Platform.OS === "web") (window as any).__shell = { go, setOverlay, setPanel, showToast, openShop: act.openShop, peek: act.peek };   // development screenshots only
  const navSelect = (id: NavId) => {
    feedback.sfx("tap");
    if (id === "town") { setOverlay((o) => (o === "town" ? null : "town")); return; }
    if (id === "market") { if (overlay === "shop") setOverlay(null); else act.openShop(shopReq.tab === "ingredients" ? "goal" : shopReq.tab); return; }     // the shop opens over the café
    setOverlay(null);
    go(id === "cafe" ? "interior" : id);
  };

  return (
    <WorldProvider world={world} act={act}>
      <View style={styles.fill}>
        <GameView world={world} sceneId={sceneId} active pixelRatio={PixelRatio.get()} onPress={onPress} onLook={(n) => world.scenes[sceneRef.current]?.setLook?.(n)} />
        <View pointerEvents="box-none" style={{ position: "absolute", left: insets.left, right: insets.right, top: insets.top, bottom: insets.bottom }}>
          {overlay === "photo" ? null : <Chrome sceneId={sceneId} overlay={overlay} setOverlay={setOverlay} navSelect={navSelect} />}
          {overlay === "photo" ? <Pressable onPress={() => setOverlay(null)} accessibilityLabel="Fotoğraf modundan çık" style={{ position: "absolute", left: -insets.left, right: -insets.right, top: -insets.top, bottom: -insets.bottom, zIndex: 30 }} /> : null}
          <Present show={sceneId === "interior" && !overlay && !panel}><GoalPill onPress={(tab) => act.openShop(tab)} /><TillPill /><TipBar /></Present>
          <Present show={sceneId === "interior" && !!panel}><PanelBoundary onFail={failPanel}>{panel ? <CafePanel id={panel.id} side={panel.side} /> : null}</PanelBoundary></Present>
          {sceneId === "market" ? <PanelBoundary onFail={failPanel}><MarketPanel /></PanelBoundary> : null}
          {sceneId === "bookshop" ? <PanelBoundary onFail={failPanel}><ResearchPanel /></PanelBoundary> : null}
          {sceneId === "explore" ? <PanelBoundary onFail={failPanel}><ExplorePanel selected={exploreSel} onSelect={(id) => { world.scenes.explore.selected = id; setExploreSel(id); }} /></PanelBoundary> : null}
          <Present show={overlay === "quests"}><PanelBoundary onFail={failPanel}><QuestPanel /></PanelBoundary></Present>
          <Present show={overlay === "daily"}><PanelBoundary onFail={failPanel}><DailyPanel /></PanelBoundary></Present>
          <Present show={overlay === "album"}><PanelBoundary onFail={failPanel}><AlbumPanel /></PanelBoundary></Present>
          <Present show={overlay === "stats"}><PanelBoundary onFail={failPanel}><StatsPanel /></PanelBoundary></Present>
          <Present show={overlay === "settings"}><PanelBoundary onFail={failPanel}><SettingsPanel onReset={reset} /></PanelBoundary></Present>
          <Present show={overlay === "shop" && !peeking}><PanelBoundary onFail={failPanel}><ShopPanel request={shopReq} onClose={() => setOverlay(null)} /></PanelBoundary></Present>
          <Present show={overlay === "town"}><PanelBoundary onFail={failPanel}><TownPanel onVisit={(s) => { setOverlay(null); go(s === "cafe" ? "interior" : s); }} /></PanelBoundary></Present>
          <Present show={!!celebrate}>{celebrate ? <StageCard c={celebrate} onClose={() => setCelebrate(null)} /> : null}</Present>
          <Toast text={toast.text} seq={toast.seq} />
          {saveWarn ? <Pressable onPress={() => setSaveWarn(null)} accessibilityRole="alert" accessibilityLabel={`Uyarı: ${saveWarn}. Kapatmak için dokun.`} style={styles.warn}><Text allowFontScaling={false} style={styles.warnText}>⚠ {saveWarn}</Text></Pressable> : null}
        </View>
        {sceneId === "interior" && overlay !== "photo" ? <CoinFlights /> : null}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: C.brownDark, opacity: fade, alignItems: "center", justifyContent: "center" }]}>
          <Animated.Image source={LOGO} style={{ width: 120, height: 120, resizeMode: "contain", transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }} />
        </Animated.View>
      </View>
    </WorldProvider>
  );
}

/** Top bar and the fixed bottom navigation, with the badge state. */
function Chrome({ sceneId, overlay, setOverlay, navSelect }: { sceneId: SceneId; overlay: Overlay | null; setOverlay: (o: Overlay | null) => void; navSelect: (id: NavId) => void }) {
  const { world, act } = useWorldOnly();
  useRefresh(5000);
  const badges = { quests: world.quests.claimable().length > 0 || world.goals.claimable().length > 0, daily: world.daily.status().canClaim };
  const toggle = (o: Overlay) => { if (o === "photo") act.toast("📷 Fotoğraf modu: ekran görüntüsü al, çıkmak için ekrana dokun", 3200); setOverlay(overlay === o ? null : o); };
  const active: NavId | null = overlay === "town" ? "town" : overlay === "shop" ? "market" : sceneId === "interior" ? "cafe" : sceneId === "explore" ? "explore" : sceneId === "market" ? "market" : null;
  return (
    <>
      <Hud badges={badges} onOpen={(id) => toggle(id === "daily" ? "daily" : id)} />
      <Nav active={active} onSelect={navSelect} exploreBadge={world.exploration.isReady()} />
    </>
  );
}
import { useWorld as useWorldOnly } from "./src/runtime/context";

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#463020" },
  center: { flex: 1, backgroundColor: "#463020", alignItems: "center", justifyContent: "center" },
  msg: { color: "#F5E6C8", fontSize: 18, textAlign: "center" },
  warn: { position: "absolute", left: 12, right: 12, bottom: 110, padding: 10, borderRadius: 12, backgroundColor: C.terracotta },
  warnText: { color: C.paper, fontFamily: FONT.bold, fontSize: 13 },
});
