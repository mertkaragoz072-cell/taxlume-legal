import * as THREE from 'three';
import type { LocationScene } from './locationScene';
import { outlined, surface } from './materials';
import { Barbell, createBench, createDumbbellRack, createKettlebells, createPlateTree, createRack, createSquatRack, createTreadmill } from './props';
import { mirrorTexture, neonSign, rubberFloor, wallPanels } from './textures';

/** Where the bench-press station sits, exported so animation can attach to it. */
export const BENCH = {
  /** Pad top height and lifter anchors, in scene metres. */
  padTop: 0.46,
  pelvisX: 0.38,
  rackX: -0.3,
  hookY: 1.1,
} as const;

export interface GymScene extends LocationScene {
  barbell: Barbell;
}

export function createGymScene(): GymScene {
  const root = new THREE.Group();
  const disposables: THREE.Texture[] = [];

  // Background wall and floor
  const wallTex = wallPanels();
  const floorTex = rubberFloor();
  disposables.push(wallTex, floorTex);
  const wall = surface(new THREE.PlaneGeometry(40, 7), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 }));
  wall.position.set(0, 3.5, -2.6);
  root.add(wall);
  const floor = surface(new THREE.PlaneGeometry(40, 24), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.75 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 8.4);
  root.add(floor);
  const baseboard = outlined(new THREE.BoxGeometry(40, 0.14, 0.06), 0x14161b, 0.004);
  baseboard.position.set(0, 0.07, -2.57);
  root.add(baseboard);

  // Mirrors
  const mTex = mirrorTexture();
  disposables.push(mTex);
  [-2.9, 0.9, 4.7].forEach((x) => {
    const frame = outlined(new THREE.BoxGeometry(1.9, 2.1, 0.05), 0x14161b, 0.006);
    frame.position.set(x, 1.65, -2.55);
    root.add(frame);
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(1.76, 1.96), new THREE.MeshBasicMaterial({ map: mTex }));
    mirror.position.set(x, 1.65, -2.52);
    root.add(mirror);
  });

  // Neon sign
  const signTex = neonSign('IRON WORKS');
  disposables.push(signTex);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), new THREE.MeshBasicMaterial({ map: signTex, transparent: true }));
  sign.position.set(-0.6, 3.25, -2.5);
  root.add(sign);

  // LED ceiling strips
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xfff1c8 });
  for (const x of [-3, 0.2, 3.4]) {
    const led = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.12), ledMat);
    led.position.set(x, 4.1, -1.2);
    root.add(led);
  }

  // Bench-press station (the interactive one)
  const bench = createBench();
  root.add(bench);
  root.add(createRack(BENCH.hookY, BENCH.rackX));
  const barbell = new Barbell();
  barbell.position.set(BENCH.rackX + 0.04, BENCH.hookY, 0);
  root.add(barbell);

  // Decorative equipment in the layered background (other exercises arrive in later milestones)
  const squat = createSquatRack();
  squat.position.set(-2.6, 0, -1.5);
  root.add(squat);
  const dumbbells = createDumbbellRack();
  dumbbells.position.set(2.4, 0, -1.9);
  root.add(dumbbells);
  const treadmill = createTreadmill();
  treadmill.position.set(4.3, 0, -1.3);
  root.add(treadmill);
  const tree = createPlateTree();
  tree.position.set(1.15, 0, -2.0);
  root.add(tree);
  const kb = createKettlebells();
  kb.position.set(-1.35, 0, -1.2);
  root.add(kb);

  // Deadlift platform (visual)
  const platform = outlined(new THREE.BoxGeometry(2.2, 0.05, 1.1), 0x5a3a22, 0.008);
  platform.position.set(-4.7, 0.025, -1.0);
  root.add(platform);
  const dlBar = new Barbell();
  dlBar.setLoad(100);
  dlBar.position.set(-4.7, 0.2, -1.0);
  root.add(dlBar);

  // Lighting: cool ambient, warm key with shadows, warm spot pools over the bench.
  const hemi = new THREE.HemisphereLight(0xc4d2ec, 0x3a3a40, 1.6);
  root.add(hemi);
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
  key.position.set(2.5, 6, 5);
  key.target.position.set(0.2, 0.5, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -1;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 16;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  root.add(key, key.target);
  const warm = new THREE.PointLight(0xffc98a, 14, 8, 1.4);
  warm.position.set(0.1, 3.2, 1.2);
  root.add(warm);
  const rim = new THREE.PointLight(0x6fa8ff, 7, 9, 1.8);
  rim.position.set(-3.5, 2.6, 1.5);
  root.add(rim);

  return {
    id: 'gym',
    root,
    barbell,
    camera: { target: [0.1, 0.85, 0], yaw: 20, elevation: 8, fitWidth: 2.5, fitHeight: 2.5, uiBottomFraction: 0.4 },
    update: () => {},
    dispose() {
      disposables.forEach((t) => t.dispose());
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    },
  };
}

