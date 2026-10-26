import * as THREE from 'three';
import { Batch } from '../batch';
import { surface } from '../materials';
import { skylineTexture } from '../textures';

/** Theme of a room: wall paper colours, floor texture and light mood. */
export interface RoomTheme {
  wallTop: string;
  wallBottom: string;
  floor: THREE.Texture;
  wallTex: THREE.Texture;
  trim: number;
  ambient: number;
}

export const ROOM_HALF = 3.3; // room spans x ∈ [-3.3, 3.3]
export const WALL_Z = -1.0;
export const LANE_Z = 0.1;
export const ROOM_H = 3.0;

export interface RoomShell {
  group: THREE.Group;
  /** Called with the in-game hour (0–24) to tint the window. */
  setHour(hour: number): void;
  dispose(): void;
}

/** Window tint by hour: bright day, warm dusk, deep blue night. */
export function windowTint(hour: number): THREE.Color {
  const c = new THREE.Color();
  if (hour >= 7.5 && hour < 17) return c.setRGB(1.05, 1.1, 1.2); // day (the texture is a dusk skyline; brighten + cool it)
  if (hour >= 17 && hour < 20.5) return c.setRGB(1.0, 0.92, 0.85); // dusk as painted
  if (hour >= 5.5 && hour < 7.5) return c.setRGB(0.85, 0.8, 0.9); // dawn
  return c.setRGB(0.28, 0.34, 0.6); // night
}

/**
 * Back wall, floor, skirting, side cut-away walls and a window onto the dusk skyline.
 * The wall sits 1.1 m behind the walking lane, giving the diorama look of the reference.
 */
export function createShell(theme: RoomTheme, win: { x: number; y: number; w: number; h: number } | null): RoomShell {
  const group = new THREE.Group();
  const wall = surface(new THREE.PlaneGeometry(ROOM_HALF * 2, ROOM_H), new THREE.MeshStandardMaterial({ map: theme.wallTex, roughness: 0.95 }));
  wall.position.set(0, ROOM_H / 2, WALL_Z);
  group.add(wall);
  const floor = surface(new THREE.PlaneGeometry(ROOM_HALF * 2 + 2, 7), new THREE.MeshStandardMaterial({ map: theme.floor, roughness: 0.55 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 2.4);
  group.add(floor);
  const trim = new Batch();
  trim.box(ROOM_HALF * 2, 0.14, 0.05, theme.trim, { pos: [0, 0.07, WALL_Z + 0.025] }, 0.01);
  trim.box(ROOM_HALF * 2, 0.08, 0.06, theme.trim, { pos: [0, ROOM_H - 0.04, WALL_Z + 0.03] }, 0.01);
  for (const s of [-1, 1]) trim.box(0.14, ROOM_H, 0.1, theme.trim, { pos: [s * (ROOM_HALF - 0.07), ROOM_H / 2, WALL_Z + 0.05] }, 0.01);
  group.add(trim.build(false));
  // cut-away side walls
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 1 });
  for (const s of [-1, 1]) {
    const side = surface(new THREE.PlaneGeometry(4.2, ROOM_H), sideMat, false);
    side.rotation.y = -s * Math.PI / 2;
    side.position.set(s * ROOM_HALF, ROOM_H / 2, WALL_Z + 2.1);
    group.add(side);
  }

  const skyTex = skylineTexture();
  const winMat = new THREE.MeshBasicMaterial({ map: skyTex });
  if (win) {
    const frame = new Batch();
    frame.box(win.w + 0.16, win.h + 0.16, 0.06, 0x14161b, { pos: [win.x, win.y, WALL_Z + 0.03] }, 0.02);
    group.add(frame.build(false));
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(win.w, win.h), winMat);
    pane.position.set(win.x, win.y, WALL_Z + 0.07);
    group.add(pane);
    const bars = new Batch();
    bars.box(0.05, win.h, 0.03, 0x14161b, { pos: [win.x, win.y, WALL_Z + 0.09] }, 0);
    bars.box(win.w, 0.05, 0.03, 0x14161b, { pos: [win.x, win.y, WALL_Z + 0.09] }, 0);
    group.add(bars.build(false));
  }
  return {
    group,
    setHour(h: number) {
      winMat.color.copy(windowTint(h));
    },
    dispose() {
      skyTex.dispose();
      winMat.dispose();
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    },
  };
}

/** Emissive material for lamps/screens: colour is scaled above 1 so bloom picks it up. */
export const glow = (color: number, strength = 2.4): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength) });

export const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;
