// The game canvas: records the active scene into a Skia picture every frame and forwards taps to the controller.
import { Skia, SkiaPictureView, type SkPicture } from "@shopify/react-native-skia";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, GestureResponderEvent, LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Ctx2D } from "../engine/ctx2d";
import type { SceneId, World } from "./world";
import { computeView, type View as GameViewport } from "./view";

export interface SceneTap { x: number; y: number }

interface Props {
  world: World;
  sceneId: SceneId;
  active: boolean;                       // false while a full-screen overlay hides the scene: no drawing, no game updates from here
  pixelRatio: number;
  onPress: (scene: any, tap: SceneTap, down: boolean) => void;
  onLook?: (n: number) => void;
}

export function GameView({ world, sceneId, active, pixelRatio, onPress, onLook }: Props) {
  const [picture, setPicture] = useState<SkPicture | null>(null);
  const size = useRef({ w: 0, h: 0 });
  const [ready, setReady] = useState(0);
  const [quality, setQuality] = useState(1);          // 1 = full resolution; lowered automatically on slow devices
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  useEffect(() => { const sub = AppState.addEventListener("change", (s) => setForeground(s === "active")); return () => sub.remove(); }, []);
  const viewport = useRef<GameViewport | null>(null);
  const scene = world.scenes[sceneId];

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    size.current = { w: width, h: height };
    setReady((n) => n + 1);
  }, []);

  // (re)size the scene whenever the screen or the scene changes
  useEffect(() => {
    const { w, h } = size.current;
    if (!w || !h) return;
    viewport.current = computeView(w, h, pixelRatio * quality);
    scene.resize(viewport.current);
    if (sceneId === "interior") scene.snap();
  }, [ready, sceneId, scene, pixelRatio, quality]);

  // the frame loop
  useEffect(() => {
    if (!active || !foreground) return;                            // nothing is drawn (or simulated) while the app is in the background
    let raf = 0, last = Date.now(), slow = 0, fast = 0, lastDraw = 0, minGap = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const now = Date.now();
      if (now - lastDraw < minGap) return;                         // frame cap (30 fps on slow devices)
      const dt = Math.min(0.05, (now - last) / 1000); last = now; lastDraw = now;
      const view = viewport.current;
      if (!view) return;
      const t0 = Date.now();
      try {
        world.game.tick();
        scene.update(dt);
        const rec = Skia.PictureRecorder();
        const canvas = rec.beginRecording(Skia.XYWHRect(0, 0, view.W, view.H));
        canvas.scale(1 / view.dpr, 1 / view.dpr);                 // the scenes draw in physical pixels
        const ctx = new Ctx2D(canvas, { width: Math.ceil(view.W * view.dpr), height: Math.ceil(view.H * view.dpr) });
        scene.render(ctx);
        setPicture(rec.finishRecordingAsPicture());
        // adaptive quality: if drawing alone takes too long for a long while, cap at 30 fps first, then render at lower resolution
        const cost = Date.now() - t0;
        if (Platform.OS === "web") { const w = window as any; (w.__cost ??= []).push(cost); if (w.__cost.length > 200) w.__cost.shift(); }   // development measurements only
        if (cost > 22) { slow += 1; fast = 0; } else { fast += 1; if (fast > 120) slow = 0; }
        if (slow === 90 && minGap === 0) { minGap = 30; slow = 0; }
        else if (slow === 90 && quality > 0.6) { setQuality((q) => Math.max(0.6, q - 0.2)); slow = 0; }
      } catch (e: any) { console.warn("[frame]", String(e), String(e?.stack ?? "").split("\n").slice(0, 4).join(" | ")); }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active, foreground, scene, world, quality]);

  const toDesign = (e: GestureResponderEvent): SceneTap | null => {
    const v = viewport.current; if (!v) return null;
    const { locationX, locationY } = e.nativeEvent;
    return { x: locationX / v.scale - v.ox, y: locationY / v.scale - v.oy };
  };
  const down = (e: GestureResponderEvent) => { const p = toDesign(e); if (p) onPress(scene, p, true); };
  const up = (e: GestureResponderEvent) => { const p = toDesign(e); if (p) onPress(scene, p, false); };
  const move = (e: GestureResponderEvent) => { const v = viewport.current; if (v && onLook) onLook((e.nativeEvent.locationX / v.W - 0.5) * 2); };

  return (
    <View style={styles.fill} onLayout={onLayout} onTouchStart={down} onTouchEnd={up} onTouchMove={move} onTouchCancel={() => { const p = { x: -1e6, y: -1e6 }; onPress(scene, p, false); }}>
      {picture ? <SkiaPictureView style={styles.fill} picture={picture} opaque androidWarmup /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
