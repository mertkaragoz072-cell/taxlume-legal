// Fırın & Kafe: the native app. Scenes are drawn with Skia (src/scene, src/engine); everything else is React Native (src/ui).
import { useFonts } from "expo-font";
import { Nunito_700Bold } from "@expo-google-fonts/nunito/700Bold";
import { Nunito_800ExtraBold } from "@expo-google-fonts/nunito/800ExtraBold";
import * as ScreenOrientation from "expo-screen-orientation";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Animated, BackHandler, PixelRatio, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { AREAS } from "./src/scene/interior-layout.js";
import { loadAssets } from "./src/assets.js";
import { loadFonts } from "./src/engine/fonts";
import { Feedback } from "./src/runtime/feedback";
import { WorldProvider, useRefresh, type Actions } from "./src/runtime/context";
import { GameView } from "./src/runtime/GameView";
import { NativeStorage } from "./src/runtime/storage";
import { createWorld, type SceneId, type World } from "./src/runtime/world";
import { Hud, Nav, Toast, type NavId } from "./src/ui/Chrome";
import { CafePanel } from "./src/ui/CafePanel";
import { MarketPanel } from "./src/ui/MarketPanel";
import { DailyPanel, ExplorePanel, QuestPanel, ResearchPanel, SettingsPanel, TownPanel, formatReward } from "./src/ui/Overlays";
import { C, FONT, fmt } from "./src/ui/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsReady] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold });
  const [world, setWorld] = useState<World | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const storage = useRef(new NativeStorage());
  const startupProblems = useRef<string[]>([]);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    (async () => {
      try {
        await storage.current.hydrate();
        await loadFonts();
        await loadAssets({ onProgress: (d: number, t: number) => setProgress(d / t) });
        const w = createWorld(storage.current, (m) => startupProblems.current.push(m));
        if (Platform.OS === "web") (window as any).__world = w;   // development screenshots only
        setWorld(w);
      } catch (e) { setError(String(e)); }
      finally { SplashScreen.hideAsync().catch(() => {}); }
    })();
  }, []);

  if (error) return <View style={styles.center}><Text allowFontScaling={false} style={styles.msg}>Oyun yüklenemedi.{"\n"}{error}</Text></View>;
  if (!world || !fontsReady) return <View style={styles.center}><Text allowFontScaling={false} style={styles.msg}>Yükleniyor… {Math.round(progress * 100)}%</Text></View>;
  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      <Shell world={world} storage={storage.current} problems={startupProblems.current} />
    </SafeAreaProvider>
  );
}

type Overlay = "quests" | "daily" | "settings" | "town";

function Shell({ world, storage, problems }: { world: World; storage: NativeStorage; problems: string[] }) {
  const insets = useSafeAreaInsets();
  const feedback = useMemo(() => new Feedback(world.settings), [world]);
  const [sceneId, setSceneId] = useState<SceneId>("interior");
  const [panel, setPanel] = useState<{ id: string; side: "left" | "right" } | null>(null);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [toast, setToast] = useState({ text: "", seq: 0 });
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
  const warn = useCallback((text: string, ms = 2400) => { showToast(text, ms); feedback.sfx("error"); feedback.buzz([40, 30, 40]); }, [showToast, feedback]);

  const go = useCallback((id: SceneId) => {
    if (switching.current || sceneRef.current === id) return;
    switching.current = true;
    Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }).start(() => {
      setPanel(null); setOverlay(null);
      world.cafe.setActive(id === "interior");               // customers only run while the cafe is open
      world.scenes.interior.select(null);
      setSceneId(id);
      Animated.timing(fade, { toValue: 0, duration: 240, useNativeDriver: true }).start(() => { switching.current = false; });
    });
  }, [fade, world]);

  const act: Actions = useMemo(() => ({
    toast: showToast, warn,
    sfx: (n) => feedback.sfx(n), buzz: (p) => feedback.buzz(p),
    go,
    openOverlay: (id) => setOverlay((cur) => (id === cur ? null : id)),
    closePanel: () => { setPanel(null); world.scenes.interior.select(null); },
  }), [showToast, warn, feedback, go, world]);

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
    offs.push(game.on("complete", ({ product }: any) => showToast(`${game.productsDef[product].icon} ${game.productsDef[product].name} hazır!`, 1600)));
    offs.push(game.on("questComplete", ({ quest }: any) => showToast(`🎯 Görev tamamlandı: ${quest.name} — Görevler'den ödülünü al`, 3000)));
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
        showToast(`⭐ ${title}! Ödül: ${parts.join("  ")}`, 3800);
        feedback.sfx("claim"); feedback.buzz([40, 40, 80]);
      });
      levelUps.push(e);
    }));
    return () => offs.forEach((o) => o?.());
  }, [game, feedback, showToast]);

  useEffect(() => {
    feedback.init();
    const sub = AppState.addEventListener("change", (s) => { if (s !== "active") void storage.flush(); });
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
        const r = world.cafe.deliverToCustomer(+hit.slice(9));
        if (r.ok) showToast(`${game.productsDef[r.product].icon} satıldı · +${fmt(r.income)} altın`, 1400); else showToast(r.message, 2400);
      } else {
        const area = AREAS.find((a: any) => a.id === hit);
        if (area?.panel) { scene.select(area.id); setOverlay(null); setPanel({ id: area.panel, side: "right" }); }
        else { act.closePanel(); showToast("Müşteri masaları yakında!"); }
      }
    }
  }, [act, feedback, game, go, showToast, world]);

  if (Platform.OS === "web") (window as any).__shell = { go, setOverlay, setPanel, showToast };   // development screenshots only
  const navSelect = (id: NavId) => {
    if (id === "town") { setOverlay((o) => (o === "town" ? null : "town")); return; }
    setOverlay(null);
    go(id === "cafe" ? "interior" : id);
  };

  return (
    <WorldProvider world={world} act={act}>
      <View style={styles.fill}>
        <GameView world={world} sceneId={sceneId} active pixelRatio={PixelRatio.get()} onPress={onPress} onLook={(n) => world.scenes[sceneRef.current]?.setLook?.(n)} />
        <View pointerEvents="box-none" style={{ position: "absolute", left: insets.left, right: insets.right, top: insets.top, bottom: insets.bottom }}>
          <Chrome sceneId={sceneId} overlay={overlay} setOverlay={setOverlay} navSelect={navSelect} />
          {sceneId === "interior" && panel ? <CafePanel id={panel.id} side={panel.side} /> : null}
          {sceneId === "market" ? <MarketPanel /> : null}
          {sceneId === "bookshop" ? <ResearchPanel /> : null}
          {sceneId === "explore" ? <ExplorePanel selected={exploreSel} onSelect={(id) => { world.scenes.explore.selected = id; setExploreSel(id); }} /> : null}
          {overlay === "quests" ? <QuestPanel /> : null}
          {overlay === "daily" ? <DailyPanel /> : null}
          {overlay === "settings" ? <SettingsPanel onReset={reset} /> : null}
          {overlay === "town" ? <TownPanel onVisit={(s) => { setOverlay(null); go(s === "cafe" ? "interior" : s); }} /> : null}
          <Toast text={toast.text} seq={toast.seq} />
          {saveWarn ? <Pressable onPress={() => setSaveWarn(null)} style={styles.warn}><Text allowFontScaling={false} style={styles.warnText}>⚠ {saveWarn}</Text></Pressable> : null}
        </View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: C.brownDark, opacity: fade }]} />
      </View>
    </WorldProvider>
  );
}

/** Top bar and the fixed bottom navigation, with the badge state. */
function Chrome({ sceneId, overlay, setOverlay, navSelect }: { sceneId: SceneId; overlay: Overlay | null; setOverlay: (o: Overlay | null) => void; navSelect: (id: NavId) => void }) {
  const { world } = useWorldOnly();
  useRefresh(5000);
  const badges = { quests: world.quests.claimable().length > 0, daily: world.daily.status().canClaim };
  const toggle = (o: Overlay) => setOverlay(overlay === o ? null : o);
  const active: NavId | null = overlay === "town" ? "town" : sceneId === "interior" ? "cafe" : sceneId === "explore" ? "explore" : sceneId === "market" ? "market" : null;
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
