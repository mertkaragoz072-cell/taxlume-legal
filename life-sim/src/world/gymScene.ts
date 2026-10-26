import * as THREE from 'three';
import type { LocationScene } from './locationScene';
import { outlined, surface } from './materials';
import {
  Barbell,
  blackDumbbellRack,
  colorDumbbellRack,
  createBench,
  createRack,
  kettlebells,
  plant,
  plateTree,
  powerRackBack,
  punchingBag,
  steelColumn,
  treadmill,
  waterBottle,
} from './props';
import { blobTexture, gymSign, skylineTexture, tileFloor, wallPanels } from './textures';

/** Bench-press station anchors, in the station's own (unrotated) coordinates, metres. */
export const BENCH = {
  padTop: 0.46,
  pelvisX: 0.38,
  rackX: -0.3,
  hookY: 1.1,
} as const;

/**
 * The station is rotated about Y so the camera sees it three-quarter on, like the
 * reference art: the bar runs across the screen with a plate on each side.
 */
export const STATION_YAW = 1.4;
export const STATION_POS: [number, number, number] = [0.45, 0, 0.15];

export interface GymScene extends LocationScene {
  /** Parent of bench, rack, barbell and the character rig (station-local coordinates). */
  station: THREE.Group;
  barbell: Barbell;
}

export function createGymScene(): GymScene {
  const root = new THREE.Group();
  const disposables: THREE.Texture[] = [];
  const tex = <T extends THREE.Texture>(t: T): T => (disposables.push(t), t);

  // --- Layer 0: far wall, window with skyline, sign ---
  const wall = surface(new THREE.PlaneGeometry(40, 8), new THREE.MeshStandardMaterial({ map: tex(wallPanels()), roughness: 0.92, color: 0xcfd3dc }));
  wall.position.set(0, 4, -3.6);
  root.add(wall);

  const winFrame = outlined(new THREE.BoxGeometry(2.3, 2.1, 0.1), 0x0e0f12, 0.01);
  winFrame.position.set(2.0, 2.15, -3.55);
  root.add(winFrame);
  const skyline = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.9), new THREE.MeshBasicMaterial({ map: tex(skylineTexture()) }));
  skyline.position.set(2.0, 2.15, -3.49);
  root.add(skyline);
  for (const [x, y, w, h] of [[2.0, 2.15, 0.06, 1.9], [2.0, 2.15, 2.1, 0.06]] as const) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), new THREE.MeshBasicMaterial({ color: 0x0e0f12 }));
    bar.position.set(x, y, -3.45);
    root.add(bar);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.86), new THREE.MeshBasicMaterial({ map: tex(gymSign()) }));
  sign.position.set(-1.35, 2.35, -3.52);
  root.add(sign);
  const signFrame = outlined(new THREE.BoxGeometry(1.25, 0.96, 0.06), 0x0e0f12, 0.008);
  signFrame.position.set(-1.35, 2.35, -3.56);
  root.add(signFrame);

  // Steel columns frame the scene and add depth cues.
  for (const x of [-3.0, 3.6]) {
    const c = steelColumn(6);
    c.position.set(x, 0, -3.3);
    root.add(c);
  }
  const beam = outlined(new THREE.BoxGeometry(40, 0.25, 0.3), 0x24272e, 0.008);
  beam.position.set(0, 4.3, -3.2);
  root.add(beam);

  // --- Floor (dark tiles with soft sheen) ---
  const floor = surface(new THREE.PlaneGeometry(40, 26), new THREE.MeshStandardMaterial({ map: tex(tileFloor()), roughness: 0.42, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 9.4);
  root.add(floor);
  const base = outlined(new THREE.BoxGeometry(40, 0.16, 0.06), 0x0e0f12, 0.004);
  base.position.set(0, 0.08, -3.55);
  root.add(base);

  // --- Layer 1: back-row equipment ---
  const rackBack = powerRackBack();
  rackBack.position.set(0.5, 0, -2.75);
  root.add(rackBack);
  const bag = punchingBag();
  bag.position.set(-2.05, 0, -2.9);
  root.add(bag);
  const colorRack = colorDumbbellRack();
  colorRack.position.set(2.55, 0, -2.55);
  colorRack.rotation.y = -0.15;
  root.add(colorRack);
  const darkRack = blackDumbbellRack();
  darkRack.position.set(-2.2, 0, -2.0);
  darkRack.rotation.y = 0.18;
  root.add(darkRack);
  for (const [x, z] of [[3.3, -1.5], [3.6, -0.6]] as const) {
    const t = treadmill();
    t.position.set(x, 0, z);
    t.rotation.y = -0.5;
    t.scale.setScalar(0.9);
    root.add(t);
  }
  const tree = plateTree();
  tree.position.set(-0.95, 0, -2.5);
  root.add(tree);
  const pl = plant();
  pl.position.set(-3.1, 0, -2.0);
  root.add(pl);

  // --- Layer 2: bench-press station (hero) ---
  const station = new THREE.Group();
  station.position.set(...STATION_POS);
  station.rotation.y = STATION_YAW;
  root.add(station);
  // Lifting mat: dark rubber with yellow edge lines grounds the station.
  const rubber = outlined(new THREE.BoxGeometry(2.5, 0.025, 1.9), 0x1a1c21, 0.006);
  rubber.position.set(0.1, 0.0125, 0);
  station.add(rubber);
  for (const z of [0.9, -0.9]) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.004, 0.025), new THREE.MeshBasicMaterial({ color: 0xe3a91a }));
    line.position.set(0.1, 0.027, z);
    station.add(line);
  }
  station.add(createBench());
  station.add(createRack(BENCH.hookY, BENCH.rackX));
  const barbell = new Barbell();
  barbell.position.set(BENCH.rackX + 0.04, BENCH.hookY, 0);
  station.add(barbell);

  // Foreground clutter near the station for grounding.
  const kb = kettlebells();
  kb.position.set(-1.1, 0, 0.9);
  kb.scale.setScalar(0.9);
  root.add(kb);
  const bottle = waterBottle();
  bottle.position.set(-0.55, 0, 0.75);
  root.add(bottle);

  // Soft contact shadows
  const blob = new THREE.MeshBasicMaterial({ map: tex(blobTexture()), transparent: true, depthWrite: false });
  const addBlob = (x: number, z: number, w: number, d: number, rot = 0): void => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), blob);
    m.rotation.set(-Math.PI / 2, 0, rot);
    m.position.set(x, 0.004, z);
    root.add(m);
  };
  addBlob(STATION_POS[0], STATION_POS[2], 2.2, 2.6, 0.17);
  addBlob(0.5, -2.75, 2.4, 1.8);
  addBlob(-2.2, -2.0, 2.6, 0.9);
  addBlob(2.55, -2.55, 1.8, 0.9);

  // --- Lighting: soft sky fill, warm key with soft shadows, hanging lamp pools, window rim ---
  root.add(new THREE.HemisphereLight(0xc4d2ec, 0x3a3a40, 1.35));
  const key = new THREE.DirectionalLight(0xffe6c2, 2.2);
  key.position.set(2.0, 6.5, 5);
  key.target.position.set(0.3, 0.5, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -1.5, near: 1, far: 16 });
  key.shadow.radius = 5;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  root.add(key, key.target);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff0cf });
  for (const x of [-1.6, 0.5, 2.5]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.22), lampMat);
    lamp.position.set(x, 3.95, -1.2);
    root.add(lamp);
    const chain = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.02), new THREE.MeshBasicMaterial({ color: 0x15171b }));
    chain.position.set(x, 4.17, -1.2);
    root.add(chain);
  }
  const warm = new THREE.PointLight(0xffc98a, 14, 8, 1.4);
  warm.position.set(0.3, 3.3, 1.0);
  root.add(warm);
  const win = new THREE.PointLight(0xff9a55, 9, 7, 1.6);
  win.position.set(2.4, 2.3, -2.2);
  root.add(win);

  return {
    id: 'gym',
    root,
    station,
    barbell,
    camera: { target: [0.5, 0.78, 0], fov: 38, yaw: 12, elevation: 17, fitWidth: 1.95, fitHeight: 1.8, uiBottomFraction: 0.3 },
    update: () => {},
    dispose() {
      disposables.forEach((t) => t.dispose());
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    },
  };
}
