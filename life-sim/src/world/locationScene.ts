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
  /**
   * Painted-backdrop mode: the camera is placed so that `world` lands exactly on `image` (u,v fractions of the painted art,
   * v measured from the top) wherever the art is laid out on screen. `fitWidth` then means the world width visible across the
   * full screen width at that depth, so the 3D objects keep a constant size relative to the painting on every phone.
   */
  anchor?: { world: [number, number, number]; image: [number, number] };
  /** If set, the camera target x follows `focusX()` clamped to this range. */
  followRange?: [number, number];
}

/** What every location scene provides to the renderer. */
export interface LocationScene {
  /** Optional tint for the character's body in this scene (lighting match with a painted backdrop). */
  skin?: { color: number; emissive: number };
  /** Optional painted full-screen backdrop (cover-fitted by the renderer). Set once loaded. */
  backdrop?: THREE.Texture | null;
  /** Called by the scene when `backdrop` becomes available; set by the renderer. */
  onBackdrop?: () => void;
  id: string;
  root: THREE.Group;
  camera: CameraSetup;
  /** Optional: called after the camera is (re)placed, e.g. to position camera-facing sprites. */
  updateForCamera?: (camera: THREE.Camera) => void;
  /** Optional: the camera tracks this x (room scenes follow the character). */
  focusX?: () => number;
  update(dt: number, elapsed: number): void;
  dispose(): void;
}
