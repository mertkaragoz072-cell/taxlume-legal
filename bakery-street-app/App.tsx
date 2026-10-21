// Fırın & Kafe: the web game (../bakery-street) running inside a full-screen WebView.
//
// First launch of a build: the game's files (page, styles, script, pictures) are copied from the app bundle to the documents folder, because a
// file:// page needs real files next to it. After that the page loads from disk with no network at all.
// Saves: the game keeps its progress in localStorage; every write is mirrored to AsyncStorage and restored before the game starts, so
// iOS/Android clearing the WebView's own storage never loses progress.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as ScreenOrientation from "expo-screen-orientation";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, StyleSheet, Text, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { GAME_VERSION, PICTURES, TEXT_FILES } from "./src/generated/game";

SplashScreen.preventAutoHideAsync().catch(() => {});

const STORE_KEY = "firin-kafe:localStorage";
const BG = "#463020";
const root = `${FileSystem.documentDirectory}game-${GAME_VERSION}/`;

/** Copies the bundled game to disk once per build; older builds' copies are removed. */
async function installGame(): Promise<void> {
  const done = `${root}.ready`;
  if ((await FileSystem.getInfoAsync(done)).exists) return;
  const base = FileSystem.documentDirectory!;
  for (const name of await FileSystem.readDirectoryAsync(base)) {
    if (name.startsWith("game-")) await FileSystem.deleteAsync(base + name, { idempotent: true });
  }
  await FileSystem.makeDirectoryAsync(root, { intermediates: true });
  for (const [name, text] of Object.entries(TEXT_FILES)) await FileSystem.writeAsStringAsync(root + name, text);
  for (const [path, module] of Object.entries(PICTURES)) {
    const asset = Asset.fromModule(module);
    await asset.downloadAsync();
    const to = root + path;
    await FileSystem.makeDirectoryAsync(to.slice(0, to.lastIndexOf("/")), { intermediates: true });
    await FileSystem.copyAsync({ from: asset.localUri ?? asset.uri, to });
  }
  await FileSystem.writeAsStringAsync(done, "ok");
}

/** Runs inside the page before the game: restores the saved keys and reports every later change. */
function bridgeScript(snapshot: Record<string, string>): string {
  return `(function () {
  try {
    var snap = ${JSON.stringify(snapshot)};
    for (var k in snap) { try { window.localStorage.setItem(k, snap[k]); } catch (e) {} }
    var post = function (m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); };
    var ls = window.Storage.prototype, set = ls.setItem, rm = ls.removeItem, clr = ls.clear;
    ls.setItem = function (k, v) { set.call(this, k, v); if (this === window.localStorage) post({ t: "set", k: String(k), v: String(v) }); };
    ls.removeItem = function (k) { rm.call(this, k); if (this === window.localStorage) post({ t: "rm", k: String(k) }); };
    ls.clear = function () { clr.call(this); if (this === window.localStorage) post({ t: "clear" }); };
  } catch (e) {}
})(); true;`;
}

export default function App() {
  const [ready, setReady] = useState<{ snapshot: Record<string, string> } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const store = useRef<Record<string, string>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    AsyncStorage.setItem(STORE_KEY, JSON.stringify(store.current)).catch(() => {});
  }, []);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORE_KEY);
        store.current = saved ? JSON.parse(saved) : {};
        await installGame();
        setReady({ snapshot: { ...store.current } });
      } catch (e) {
        setFailed(String(e));
      } finally {
        SplashScreen.hideAsync().catch(() => {});
      }
    })();
    const sub = AppState.addEventListener("change", (s) => { if (s !== "active") flush(); });
    return () => sub.remove();
  }, [flush]);

  const onMessage = useCallback((e: WebViewMessageEvent) => {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m.t === "set") { if (!String(m.k).endsWith(":owner") && !String(m.k).startsWith("__")) store.current[m.k] = m.v; }   // the single-tab guard and the storage probe are per page load, never restored
      else if (m.t === "rm") delete store.current[m.k];
      else if (m.t === "clear") store.current = {};
      else return;
      if (!timer.current) timer.current = setTimeout(flush, 600);
    } catch { /* not ours */ }
  }, [flush]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  if (failed) {
    return (
      <View style={styles.center}>
        <StatusBar hidden />
        <Text style={styles.text}>Oyun yüklenemedi.</Text>
        <Text style={styles.small}>{failed}</Text>
      </View>
    );
  }
  if (!ready) return <View style={styles.center}><StatusBar hidden /></View>;

  return (
    <View style={styles.fill}>
      <StatusBar hidden />
      <WebView
        key={reloadKey}
        style={styles.fill}
        source={{ uri: `${root}index.html` }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        allowingReadAccessToURL={root}
        injectedJavaScriptBeforeContentLoaded={bridgeScript(ready.snapshot)}
        onMessage={onMessage}
        onContentProcessDidTerminate={reload}
        onRenderProcessGone={reload}
        bounces={false}
        scrollEnabled={false}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        setSupportMultipleWindows={false}
        hideKeyboardAccessoryView
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        {...(Platform.OS === "android" ? { androidLayerType: "hardware" as const } : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: BG },
  center: { flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center", padding: 24 },
  text: { color: "#F5E6C8", fontSize: 18, fontWeight: "700" },
  small: { color: "#E8D2A8", fontSize: 12, marginTop: 8, textAlign: "center" },
});
