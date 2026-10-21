import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import React, { useEffect, useRef, useState } from "react";
import { PixelRatio, Platform, StyleSheet, Text, View } from "react-native";
import { loadAssets } from "./src/assets.js";
import { loadFonts } from "./src/engine/fonts";
import { GameView } from "./src/runtime/GameView";
import { NativeStorage } from "./src/runtime/storage";
import { createWorld, type World } from "./src/runtime/world";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [world, setWorld] = useState<World | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const storage = useRef(new NativeStorage());

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    (async () => {
      try {
        await storage.current.hydrate();
        await loadFonts();
        await loadAssets({ onProgress: (d: number, t: number) => setProgress(d / t) });
        const w = createWorld(storage.current, (m) => console.warn("[problem]", m));
        if (Platform.OS === "web") (window as any).__world = w;   // development screenshots only
        setWorld(w);
      } catch (e) { setError(String(e)); }
      finally { SplashScreen.hideAsync().catch(() => {}); }
    })();
  }, []);

  if (error) return <View style={styles.center}><Text style={styles.text}>{error}</Text></View>;
  if (!world) return <View style={styles.center}><Text style={styles.text}>Yükleniyor… {Math.round(progress * 100)}%</Text></View>;
  return (
    <View style={styles.fill}>
      <StatusBar hidden />
      <GameView world={world} sceneId="street" active pixelRatio={PixelRatio.get()} onPress={(scene, p, down) => { if (!down) console.log("tap", scene.hitTest(p.x, p.y)); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#463020" },
  center: { flex: 1, backgroundColor: "#463020", alignItems: "center", justifyContent: "center" },
  text: { color: "#F5E6C8", fontSize: 18 },
});
