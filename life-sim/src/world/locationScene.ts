import type * as THREE from 'three';

export interface CameraSetup {
  /** Point the camera looks at (metres). */
  target: [number, number, number];
  /** Camera offset from target direction: yaw degrees (about Y) and elevation degrees. */
  fov: number;
  yaw: number;
  elevation: number;
  /** Horizontal world width (m) that must stay visible on narrow screens. */
  fitWidth: number;
  /** Vertical world height (m) that must stay visible on wide screens. */
  fitHeight: number;
  /** Fraction (0–1) of screen height the bottom UI sheet covers; target is lifted into the free area. */
  uiBottomFraction: number;
  /** If set, the camera target x follows `focusX()` clamped to this range. */
  followRange?: [number, number];
}

/** What every location scene provides to the renderer. */
export interface LocationScene {
  id: string;
  root: THREE.Group;
  camera: CameraSetup;
  /** Optional: the camera tracks this x (room scenes follow the character). */
  focusX?: () => number;
  update(dt: number, elapsed: number): void;
  dispose(): void;
}
