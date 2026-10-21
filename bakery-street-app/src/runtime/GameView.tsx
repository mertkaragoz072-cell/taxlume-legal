// The game canvas: records the active scene into a Skia picture every frame and forwards taps to the controller.
import { Skia, SkiaPictureView, type SkPicture } from "@shopify/react-native-skia";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, View } from "react-native";
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
    viewport.current = computeView(w, h, pixelRatio);
    scene.resize(viewport.current);
    if (sceneId === "interior") scene.snap();
  }, [ready, sceneId, scene, pixelRatio]);

  // the frame loop
  useEffect(() => {
    if (!active) return;
    let raf = 0, last = Date.now();
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const now = Date.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
      const view = viewport.current;
      if (!view) return;
      try {
        world.game.tick();
        scene.update(dt);
        const rec = Skia.PictureRecorder();
        const canvas = rec.beginRecording(Skia.XYWHRect(0, 0, view.W, view.H));
        canvas.scale(1 / view.dpr, 1 / view.dpr);                 // the scenes draw in physical pixels
        const ctx = new Ctx2D(canvas, { width: Math.ceil(view.W * view.dpr), height: Math.ceil(view.H * view.dpr) });
        scene.render(ctx);
        setPicture(rec.finishRecordingAsPicture());
      } catch (e) { console.warn("[frame]", String(e)); }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active, scene, world]);

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
      {picture ? <SkiaPictureView style={styles.fill} picture={picture} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
