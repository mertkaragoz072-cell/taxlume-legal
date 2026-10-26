import * as THREE from 'three';
import type { LocationScene } from './locationScene';
import { HOOK, RACK_X } from './benchGeometry';
import { outlined, surface } from './materials';
import {
  Barbell,
  blackDumbbellRack,
  colorDumbbellRack,
  createBench,
  createRack,
  plant,
  plateTree,
  powerRackBack,
  punchingBag,
  steelColumn,
  treadmill,
  waterBottle,
} from './props';
import { blobTexture, gymSign, poolTexture, posterTexture, shaftTexture, skylineTexture, tileFloor, wallPanels } from './textures';
import { Batch } from './batch';

/**
 * The incline bench is turned so the lifter sits facing the camera (feet toward the viewer, leaning back
 * against the pad) and the bar runs horizontally across the screen — the staging of the reference art.
 * A small extra yaw gives a gentle 3/4 depth cue. The rack stands BEHIND the lifter.
 */
export const STATION_YAW = -1.45;
export const STATION_POS: [number, number, number] = [0, 0.02, 0.2];

export interface GymScene extends LocationScene {
  /** Parent of bench, rack, barbell and the character rig (station-local coordinates). */
  station: THREE.Group;
  barbell: Barbell;
}

export function createGymScene(): GymScene {
  const root = new THREE.Group();
  const disposables: THREE.Texture[] = [];
  const tex = <T extends THREE.Texture>(t: T): T => (disposables.push(t), t);
  const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;

  // --- Layer 0: far wall, window with skyline, sign ---
  const wall = surface(new THREE.PlaneGeometry(40, 8), new THREE.MeshStandardMaterial({ map: tex(wallPanels()), roughness: 0.92, color: 0xcfd3dc }));
  wall.position.set(0, 4, -3.6);
  root.add(wall);

  const winFrame = outlined(new THREE.BoxGeometry(2.3, 2.1, 0.1), 0x0e0f12, 0.01);
  winFrame.position.set(2.7, 2.15, -3.55);
  root.add(winFrame);
  const skyline = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.9), new THREE.MeshBasicMaterial({ map: tex(skylineTexture()) }));
  skyline.position.set(2.7, 2.15, -3.49);
  root.add(skyline);
  for (const [x, y, w, h] of [[2.7, 2.15, 0.06, 1.9], [2.7, 2.15, 2.1, 0.06]] as const) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), new THREE.MeshBasicMaterial({ color: 0x0e0f12 }));
    bar.position.set(x, y, -3.45);
    root.add(bar);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.86), new THREE.MeshBasicMaterial({ map: tex(gymSign()) }));
  sign.position.set(-1.1, 2.4, -3.52);
  root.add(sign);
  const signFrame = outlined(new THREE.BoxGeometry(1.25, 0.96, 0.06), 0x0e0f12, 0.008);
  signFrame.position.set(-1.1, 2.4, -3.56);
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
  rackBack.position.set(0.3, 0, -3.1);
  root.add(rackBack);
  const bag = punchingBag();
  bag.position.set(2.0, 0, -2.9);
  root.add(bag);
  const colorRack = colorDumbbellRack();
  colorRack.position.set(1.15, 0, -3.0);
  root.add(colorRack);
  const darkRack = blackDumbbellRack();
  darkRack.position.set(-1.7, 0, -3.0);
  root.add(darkRack);
  for (const [x, z] of [[3.2, -1.7], [3.6, -0.9]] as const) {
    const t = treadmill();
    t.position.set(x, 0, z);
    t.rotation.y = -0.5;
    t.scale.setScalar(0.9);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.13, 0.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x4de1ff).multiplyScalar(2.2) }));
    screen.position.set(-0.7, 1.35, 0);
    screen.rotation.z = 0.35;
    t.add(screen);
    root.add(t);
  }
  const tree = plateTree();
  tree.position.set(-2.9, 0, -2.9);
  root.add(tree);
  const pl = plant();
  pl.position.set(-2.55, 0, -2.6);
  root.add(pl);

  // --- Layer 2: bench-press station (hero) ---
  const station = new THREE.Group();
  station.position.set(...STATION_POS);
  station.rotation.y = STATION_YAW;
  root.add(station);
  // Lifting mat: dark rubber with yellow edge lines grounds the station.
  const rubber = outlined(new THREE.BoxGeometry(2.5, 0.02, 1.9), 0x2a2d35, 0.006);
  rubber.position.set(0.1, -0.01, 0);
  station.add(rubber);
  for (const z of [0.9, -0.9]) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.004, 0.025), new THREE.MeshBasicMaterial({ color: 0xe3a91a }));
    line.position.set(0.1, 0.003, z);
    station.add(line);
  }
  station.add(createBench());
  station.add(createRack(HOOK[1], RACK_X));
  const barbell = new Barbell();
  barbell.position.set(HOOK[0], HOOK[1], 0);
  barbell.userData.bar = true;
  station.add(barbell);

  // Foreground clutter near the station for grounding.
  const bottle = waterBottle();
  bottle.position.set(-1.15, 0, 0.5);
  root.add(bottle);

  // Soft contact shadows
  const blob = new THREE.MeshBasicMaterial({ map: tex(blobTexture()), transparent: true, depthWrite: false });
  const addBlob = (x: number, z: number, w: number, d: number, rot = 0): void => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), blob);
    m.rotation.set(-Math.PI / 2, 0, rot);
    m.position.set(x, 0.004, z);
    root.add(m);
  };
  addBlob(STATION_POS[0], STATION_POS[2], 2.6, 2.2, 0.12);
  addBlob(0.3, -3.1, 2.4, 1.2);
  addBlob(-1.7, -3.0, 2.6, 1.0);
  addBlob(1.15, -3.0, 1.8, 1.0);

  // --- Atmosphere & detail ---
  // Ceiling pipes, duct and a yellow LED strip along the wall.
  const ceil = new Batch();
  for (const [y, z, r] of [[3.9, -3.0, 0.07], [3.75, -2.7, 0.05]] as const) ceil.cyl(r, r, 30, 0x2f333c, { pos: [0, y, z], rot: [0, 0, Math.PI / 2] }, 10);
  ceil.box(30, 0.3, 0.45, 0x23262c, { pos: [0, 4.0, -2.2] }, 0.02);
  for (let x = -6; x <= 6; x += 1.5) ceil.box(0.06, 0.4, 0.5, 0x15171b, { pos: [x, 3.98, -2.2] }, 0.01);
  root.add(ceil.build(false));
  const led = new THREE.Mesh(new THREE.BoxGeometry(30, 0.04, 0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc23a).multiplyScalar(2.4) }));
  led.position.set(0, 3.7, -3.5);
  root.add(led);
  // Wall shelf with medicine balls / kettlebells, posters.
  const shelf = new Batch();
  shelf.box(2.2, 0.05, 0.3, 0x3a3f4a, { pos: [0, 0, 0] }, 0.012);
  [0xd8332f, 0x2459d6, 0xf2c230, 0x37b26a, 0xd8332f, 0x2459d6].forEach((c, i) => shelf.add(new THREE.SphereGeometry(0.1, 14, 10), c, { pos: [-0.9 + i * 0.36, 0.15, 0] }));
  const shelfMesh = shelf.build();
  shelfMesh.position.set(-1.7, 1.2, -3.38);
  root.add(shelfMesh);
  const poster = (kind: 'anatomy' | 'abstract', x: number): void => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.66), new THREE.MeshBasicMaterial({ map: tex(posterTexture(kind)) }));
    m.position.set(x, 1.85, -3.5);
    root.add(m);
  };
  poster('anatomy', 0.35);
  poster('abstract', -0.3);
  // Floor clutter: gym bag, towel on the bench, boxing gloves by the bag.
  const clutter = new Batch();
  clutter.box(0.55, 0.22, 0.26, 0x2459d6, { pos: [0, 0.11, 0], rot: [0, 0.4, 0] }, 0.06);
  clutter.box(0.4, 0.02, 0.08, 0xe3a91a, { pos: [0, 0.23, 0], rot: [0, 0.4, 0] }, 0.01);
  clutter.add(new THREE.SphereGeometry(0.1, 12, 10), 0xd8332f, { pos: [0.9, 0.1, -0.5], scale: [1.1, 0.8, 0.9] });
  clutter.add(new THREE.SphereGeometry(0.1, 12, 10), 0xd8332f, { pos: [1.12, 0.1, -0.45], scale: [1.1, 0.8, 0.9] });
  const clutterMesh = clutter.build();
  clutterMesh.position.set(-2.4, 0, -1.2);
  root.add(clutterMesh);
  // Window glow spilling into the room.
  const winGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.4), new THREE.MeshBasicMaterial({ map: tex(poolTexture()), opacity: 0.55, ...additive }));
  winGlow.position.set(2.0, 2.15, -3.4);
  root.add(winGlow);

  // --- Lighting: soft sky fill, warm key with soft shadows, hanging lamp pools, window rim ---
  root.add(new THREE.HemisphereLight(0xc4d2ec, 0x4a4a52, 2.2));
  const key = new THREE.DirectionalLight(0xffe6c2, 2.0);
  key.position.set(2.0, 6.5, 5);
  key.target.position.set(0.3, 0.5, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -1.5, near: 1, far: 16 });
  key.shadow.radius = 5;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  root.add(key, key.target);
  const shaftMat = new THREE.MeshBasicMaterial({ map: tex(shaftTexture()), opacity: 0.22, ...additive });
  const poolMat = new THREE.MeshBasicMaterial({ map: tex(poolTexture()), opacity: 0.9, ...additive });
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0cf).multiplyScalar(3.2) });
  for (const x of [-2.0, -0.55, 0.9, 2.35]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.22), lampMat);
    lamp.position.set(x, 3.95, -1.2);
    root.add(lamp);
    const chain = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.02), new THREE.MeshBasicMaterial({ color: 0x15171b }));
    chain.position.set(x, 4.17, -1.2);
    root.add(chain);
    // light shaft + warm pool on the floor under each lamp
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.8), shaftMat);
    shaft.position.set(x, 2.05, -1.25);
    root.add(shaft);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, 0.006, -1.0);
    root.add(pool);
  }
  const warm = new THREE.PointLight(0xffc98a, 7, 8, 1.4);
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
    camera: { target: [0, 1.12, 0.2], fov: 34, yaw: 0, elevation: 9, fitWidth: 2.6, fitHeight: 2.4, uiBottomFraction: 0.32 },
    update: () => {},
    dispose() {
      disposables.forEach((t) => t.dispose());
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    },
  };
}
