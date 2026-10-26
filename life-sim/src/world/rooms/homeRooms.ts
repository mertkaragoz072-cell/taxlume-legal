import * as THREE from 'three';
import type { ActionKind } from '../../character/poses';
import type { HomeRoom } from '../../core/types';
import { ROOMS, type HomeObject } from '../../data/homeObjects';
import { Batch } from '../batch';
import type { LocationScene } from '../locationScene';
import { blobTexture, dropTexture, lightTiles, poolTexture, tvScreen, wallPaper, woodFloor, zTexture } from '../textures';
import { additive, createShell, glow, LANE_Z, ROOM_HALF, WALL_Z, type RoomShell, type RoomTheme } from './roomKit';

const WOOD = 0x8b5a34;
const DARK_WOOD = 0x5a3a22;
const BLACK = 0x15171b;
const CREAM = 0xe8e2d0;

export interface RoomScene extends LocationScene {
  roomId: HomeRoom;
  /** Group the character is parented to (lane z). */
  actorRoot: THREE.Group;
  /** Invisible tap volumes, one per interactable object. */
  hits: THREE.Mesh[];
  setHour(hour: number): void;
  /** Visual effects tied to what the character is doing. */
  setActivity(kind: ActionKind): void;
  bounds: [number, number];
}

interface Parts {
  furniture: THREE.Object3D[];
  lights: Array<{ light: THREE.PointLight; day: number; night: number }>;
  lampMats: THREE.MeshBasicMaterial[];
  tvMat?: THREE.MeshBasicMaterial;
  tvLight?: THREE.PointLight;
  showerOrigin?: THREE.Vector3;
  zzzOrigin?: THREE.Vector3;
}

const lampLight = (x: number, y: number, z: number, intensity: number, color = 0xffc27a): THREE.PointLight => {
  const l = new THREE.PointLight(color, intensity, 5, 1.6);
  l.position.set(x, y, z);
  return l;
};

const plantAt = (b: Batch, x: number, z: number, s = 1): void => {
  b.cyl(0.14 * s, 0.1 * s, 0.26 * s, 0x3a3f4a, { pos: [x, 0.13 * s, z] }, 12);
  const greens = [0x2f8f4e, 0x3aa35c, 0x246f3d];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.add(new THREE.ConeGeometry(0.07 * s, (0.55 + (i % 3) * 0.12) * s, 6), greens[i % 3]!, { pos: [x + Math.cos(a) * 0.1 * s, 0.55 * s, z + Math.sin(a) * 0.1 * s], rot: [Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45] });
  }
};

const frame = (b: Batch, x: number, y: number, w: number, h: number, art: number): void => {
  b.box(w + 0.06, h + 0.06, 0.04, BLACK, { pos: [x, y, WALL_Z + 0.04] }, 0.01);
  b.box(w, h, 0.02, art, { pos: [x, y, WALL_Z + 0.065] }, 0);
};

const books = (b: Batch, x0: number, y: number, z: number, n: number): void => {
  const cols = [0xc23b2b, 0x2459d6, 0xe3a91a, 0x37b26a, 0x8b5a34, 0x9b4fd1];
  for (let i = 0; i < n; i++) b.box(0.05, 0.2 + (i % 3) * 0.04, 0.16, cols[i % cols.length]!, { pos: [x0 + i * 0.065, y + 0.12 + (i % 3) * 0.02, z] }, 0.004);
};

// ---------------------------------------------------------------- Bedroom
function bedroom(): Parts {
  const b = new Batch();
  // bed (centre x -1.1, length 2.0, z centred on the walking lane)
  b.box(2.0, 0.28, 1.4, WOOD, { pos: [-1.1, 0.14, LANE_Z] }, 0.03);
  b.box(1.92, 0.2, 1.3, 0xdfdbd0, { pos: [-1.1, 0.38, LANE_Z] }, 0.05);
  b.box(1.35, 0.07, 1.34, 0x23305a, { pos: [-0.6, 0.5, LANE_Z] }, 0.04); // duvet
  b.box(0.16, 0.1, 1.38, 0x2d3d73, { pos: [-1.28, 0.52, LANE_Z] }, 0.04); // fold
  b.box(0.12, 1.0, 1.5, DARK_WOOD, { pos: [-2.14, 0.6, LANE_Z] }, 0.03); // headboard
  b.box(0.5, 0.13, 0.42, 0xefece2, { pos: [-1.9, 0.57, LANE_Z - 0.3] }, 0.05);
  b.box(0.5, 0.13, 0.42, 0xefece2, { pos: [-1.9, 0.57, LANE_Z + 0.3] }, 0.05);
  // nightstand + lamp
  b.box(0.5, 0.52, 0.45, WOOD, { pos: [-2.6, 0.26, -0.5] }, 0.02);
  b.box(0.44, 0.03, 0.4, DARK_WOOD, { pos: [-2.6, 0.2, -0.5] }, 0.005);
  b.cyl(0.05, 0.07, 0.28, 0x3a3f4a, { pos: [-2.6, 0.66, -0.5] });
  // wardrobe
  b.box(1.1, 2.2, 0.7, DARK_WOOD, { pos: [1.6, 1.1, -0.6] }, 0.03);
  b.box(0.02, 2.0, 0.02, BLACK, { pos: [1.6, 1.1, -0.24] }, 0);
  for (const x of [1.5, 1.7]) b.box(0.03, 0.2, 0.03, 0xcfd4dc, { pos: [x, 1.1, -0.22] }, 0.005);
  // rug
  b.box(2.6, 0.012, 1.3, 0x3f5a7a, { pos: [-0.3, 0.006, 1.1] }, 0.005);
  b.box(2.3, 0.014, 1.0, 0x56759b, { pos: [-0.3, 0.007, 1.1] }, 0.005);
  plantAt(b, 0.75, -0.55, 1.0);
  plantAt(b, 2.7, -0.4, 1.1);
  // door on the right wall, curtains
  b.box(0.95, 2.1, 0.05, DARK_WOOD, { pos: [2.78, 1.05, WALL_Z + 0.04] }, 0.01);
  b.box(0.1, 1.45, 0.14, 0x7a2f3a, { pos: [-0.35, 1.7, WALL_Z + 0.18] }, 0.04);
  b.box(0.1, 1.45, 0.14, 0x7a2f3a, { pos: [1.15, 1.7, WALL_Z + 0.18] }, 0.04);
  b.box(1.9, 0.04, 0.04, 0xcfd4dc, { pos: [0.4, 2.45, WALL_Z + 0.2] }, 0.005);
  frame(b, -1.1, 1.75, 0.8, 0.55, 0x3a6f8a);
  frame(b, -2.45, 1.5, 0.35, 0.45, 0xc4893a);
  const lampShade = glow(0xffd29a, 2.2);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.2, 14), lampShade);
  shade.position.set(-2.6, 0.9, -0.5);
  return {
    furniture: [b.build(), shade],
    lights: [{ light: lampLight(-2.4, 1.0, 0.2, 9), day: 0.35, night: 1 }],
    lampMats: [lampShade],
    zzzOrigin: new THREE.Vector3(-1.9, 1.1, LANE_Z),
  };
}

// ---------------------------------------------------------------- Study
function study(): Parts {
  const b = new Batch();
  // desk
  b.box(1.7, 0.06, 0.8, WOOD, { pos: [0.9, 0.75, -0.55] }, 0.015);
  for (const x of [0.1, 1.7]) b.box(0.06, 0.72, 0.76, DARK_WOOD, { pos: [x, 0.36, -0.55] }, 0.01);
  b.box(0.5, 0.6, 0.7, DARK_WOOD, { pos: [1.45, 0.4, -0.55] }, 0.015); // drawers
  for (const y of [0.25, 0.5]) b.box(0.3, 0.025, 0.02, 0xcfd4dc, { pos: [1.45, y, -0.18] }, 0.005);
  b.box(1.5, 0.5, 0.03, DARK_WOOD, { pos: [0.9, 0.5, -0.9] }, 0.005);
  // monitor + stand + laptop + keyboard + mug
  b.box(0.1, 0.3, 0.1, BLACK, { pos: [0.9, 0.93, -0.7] }, 0.01);
  b.box(0.34, 0.03, 0.2, BLACK, { pos: [0.9, 0.79, -0.7] }, 0.01);
  b.box(0.8, 0.5, 0.04, BLACK, { pos: [0.9, 1.3, -0.7] }, 0.015);
  b.box(0.44, 0.015, 0.16, 0x2a2d35, { pos: [0.55, 0.785, -0.3] }, 0.005);
  b.box(0.36, 0.02, 0.25, 0x8b919c, { pos: [1.45, 0.79, -0.4] }, 0.008);
  b.cyl(0.04, 0.04, 0.09, 0xf2f2f2, { pos: [0.2, 0.83, -0.4] });
  b.cyl(0.04, 0.06, 0.38, 0x3a3f4a, { pos: [0.3, 0.97, -0.8] });
  // chair (seat top 0.46)
  const cx = -0.35;
  b.box(0.52, 0.08, 0.5, 0x1d2026, { pos: [cx, 0.42, 0.1] }, 0.03);
  b.box(0.08, 0.58, 0.46, 0x1d2026, { pos: [cx - 0.26, 0.78, 0.1] }, 0.03);
  b.cyl(0.03, 0.03, 0.32, 0x3a3f4a, { pos: [cx, 0.22, 0.1] }, 8);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.box(0.3, 0.03, 0.04, 0x3a3f4a, { pos: [cx + Math.cos(a) * 0.15, 0.06, 0.1 + Math.sin(a) * 0.15], rot: [0, -a, 0] }, 0.008);
    b.add(new THREE.SphereGeometry(0.03, 8, 6), BLACK, { pos: [cx + Math.cos(a) * 0.29, 0.03, 0.1 + Math.sin(a) * 0.29] });
  }
  // shelves + books + plants + frames
  for (const y of [1.4, 1.95]) b.box(1.3, 0.04, 0.28, WOOD, { pos: [2.35, y, -0.85] }, 0.01);
  books(b, 1.8, 1.42, -0.85, 14);
  books(b, 1.85, 1.97, -0.85, 9);
  plantAt(b, 2.8, -0.5, 1.1);
  plantAt(b, -2.9, -0.5, 0.9);
  frame(b, -0.6, 2.1, 0.5, 0.65, 0x6a8fb0);
  b.box(0.9, 0.5, 0.03, 0x8a6a46, { pos: [1.0, 2.15, WALL_Z + 0.04] }, 0.005); // pinboard
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.44), glow(0x6fb3ff, 1.9));
  screen.position.set(0.9, 1.3, -0.675);
  const lampShade = glow(0xffd29a, 2.0);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.12, 0.12, 12), lampShade);
  shade.position.set(0.3, 1.2, -0.8);
  return { furniture: [b.build(), screen, shade], lights: [{ light: lampLight(0.5, 1.3, -0.3, 8), day: 0.5, night: 1 }], lampMats: [lampShade, screen.material as THREE.MeshBasicMaterial] };
}

// ---------------------------------------------------------------- Living room
function living(): Parts {
  const b = new Batch();
  const FAB = 0x6b7280;
  // sofa (seat top 0.42), faces +x
  b.box(2.0, 0.28, 0.85, FAB, { pos: [-0.4, 0.2, -0.35] }, 0.05);
  b.box(1.7, 0.12, 0.75, 0x7a8190, { pos: [-0.4, 0.4, -0.3] }, 0.05);
  b.box(2.0, 0.6, 0.22, FAB, { pos: [-0.4, 0.62, -0.72] }, 0.06);
  for (const x of [-1.4, 0.6]) b.box(0.2, 0.5, 0.85, FAB, { pos: [x, 0.4, -0.35] }, 0.06);
  for (const [x, c] of [[-1.05, 0xe3a91a], [-0.0, 0x2459d6]] as const) b.box(0.4, 0.4, 0.12, c, { pos: [x, 0.72, -0.55], rot: [0.25, 0, 0.1] }, 0.05);
  // coffee table + objects
  b.box(0.9, 0.05, 0.55, WOOD, { pos: [1.1, 0.4, 0.05] }, 0.012);
  for (const [x, z] of [[0.72, -0.15], [1.48, -0.15], [0.72, 0.25], [1.48, 0.25]] as const) b.box(0.05, 0.38, 0.05, DARK_WOOD, { pos: [x, 0.19, z] }, 0.005);
  b.box(0.3, 0.03, 0.2, 0xc23b2b, { pos: [1.0, 0.44, 0.05] }, 0.005);
  b.cyl(0.04, 0.04, 0.08, 0xf2f2f2, { pos: [1.3, 0.47, 0.1] });
  // TV stand + TV
  b.box(1.4, 0.5, 0.45, WOOD, { pos: [2.2, 0.25, -0.65] }, 0.02);
  b.box(1.3, 0.02, 0.4, DARK_WOOD, { pos: [2.2, 0.28, -0.65] }, 0.005);
  b.box(0.1, 0.08, 0.1, BLACK, { pos: [2.2, 0.54, -0.65] }, 0.01);
  b.box(1.28, 0.76, 0.06, BLACK, { pos: [2.2, 1.0, -0.65] }, 0.02);
  // bookshelf left
  b.box(0.9, 2.0, 0.3, WOOD, { pos: [-2.7, 1.0, -0.8] }, 0.02);
  for (const y of [0.4, 0.85, 1.3, 1.75]) b.box(0.84, 0.03, 0.3, DARK_WOOD, { pos: [-2.7, y, -0.8] }, 0.004);
  for (const y of [0.42, 0.87, 1.32]) books(b, -3.05, y, -0.8, 10);
  plantAt(b, 3.0, -0.3, 1.5);
  plantAt(b, -2.0, -0.7, 0.9);
  // floor lamp
  b.cyl(0.02, 0.02, 1.5, 0x3a3f4a, { pos: [-2.0, 0.75, -0.2] });
  b.cyl(0.18, 0.18, 0.03, 0x3a3f4a, { pos: [-2.0, 0.015, -0.2] }, 14);
  // rug
  b.box(2.8, 0.012, 1.4, 0x7a5a4a, { pos: [0.5, 0.006, 0.4] }, 0.005);
  frame(b, 1.5, 2.3, 0.7, 0.45, 0x3f6f8f);
  frame(b, 2.75, 2.25, 0.4, 0.55, 0xb07a3a);
  const tvMat = new THREE.MeshBasicMaterial({ map: tvScreen(), color: new THREE.Color(1.1, 1.1, 1.1) });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.68), tvMat);
  screen.position.set(2.2, 1.0, -0.615);
  const lampShade = glow(0xffd29a, 2.0);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.25, 14), lampShade);
  shade.position.set(-2.0, 1.55, -0.2);
  const tvLight = new THREE.PointLight(0x6fa8ff, 0, 4, 1.6);
  tvLight.position.set(1.6, 1.0, 0.2);
  return { furniture: [b.build(), screen, shade], lights: [{ light: lampLight(-2.0, 1.5, 0.2, 8), day: 0.4, night: 1 }], lampMats: [lampShade], tvMat, tvLight };
}

// ---------------------------------------------------------------- Kitchen
function kitchen(): Parts {
  const b = new Batch();
  const OLIVE = 0x56703f;
  // counter run (x −2.0 … 1.1)
  b.box(3.1, 0.88, 0.62, OLIVE, { pos: [-0.45, 0.44, -0.66] }, 0.015);
  b.box(3.15, 0.05, 0.68, WOOD, { pos: [-0.45, 0.9, -0.64] }, 0.01);
  for (let x = -1.9; x < 1.0; x += 0.62) b.box(0.02, 0.8, 0.02, 0x2d3d22, { pos: [x, 0.44, -0.34] }, 0);
  for (let x = -1.65; x < 1.0; x += 0.62) b.box(0.1, 0.03, 0.03, 0xcfd4dc, { pos: [x, 0.7, -0.33] }, 0.005);
  // stove (x −0.5)
  b.box(0.8, 0.84, 0.64, 0xb4bac4, { pos: [-0.5, 0.43, -0.65] }, 0.015);
  b.box(0.62, 0.34, 0.03, 0x15171b, { pos: [-0.5, 0.4, -0.33] }, 0.01);
  b.box(0.7, 0.02, 0.03, 0xcfd4dc, { pos: [-0.5, 0.62, -0.31] }, 0.005);
  for (const [x, z] of [[-0.7, -0.78], [-0.3, -0.78], [-0.7, -0.52], [-0.3, -0.52]] as const) b.cyl(0.1, 0.1, 0.02, 0x15171b, { pos: [x, 0.93, z] }, 14);
  b.box(0.9, 0.5, 0.45, 0x9aa0ab, { pos: [-0.5, 1.9, -0.72] }, 0.03); // hood
  b.box(0.2, 0.7, 0.2, 0x9aa0ab, { pos: [-0.5, 2.5, -0.8] }, 0.01);
  // sink (x 0.6)
  b.box(0.7, 0.06, 0.45, 0x8b919c, { pos: [0.6, 0.93, -0.64] }, 0.01);
  b.box(0.5, 0.05, 0.3, 0x15171b, { pos: [0.6, 0.955, -0.64] }, 0.005);
  b.cyl(0.02, 0.02, 0.3, 0xcfd4dc, { pos: [0.6, 1.07, -0.85] }, 8);
  b.box(0.04, 0.03, 0.2, 0xcfd4dc, { pos: [0.6, 1.22, -0.76] }, 0.005);
  // microwave + kettle + fruit
  b.box(0.5, 0.3, 0.38, 0x23262c, { pos: [-1.5, 1.08, -0.7] }, 0.02);
  b.box(0.3, 0.2, 0.01, 0x0e0f12, { pos: [-1.58, 1.08, -0.5] }, 0.003);
  b.cyl(0.07, 0.09, 0.2, 0xcfd4dc, { pos: [-1.0, 1.02, -0.78] });
  // upper cabinets
  b.box(1.5, 0.7, 0.34, OLIVE, { pos: [-1.25, 2.0, -0.83] }, 0.015);
  b.box(0.9, 0.7, 0.34, OLIVE, { pos: [1.45, 2.0, -0.83] }, 0.015);
  for (const x of [-1.5, -1.0, 1.25, 1.65]) b.box(0.03, 0.2, 0.03, 0xcfd4dc, { pos: [x, 1.75, -0.65] }, 0.004);
  // fridge
  b.box(0.85, 1.95, 0.72, CREAM, { pos: [-2.7, 0.98, -0.62] }, 0.04);
  b.box(0.8, 0.02, 0.02, 0x8b8472, { pos: [-2.7, 1.3, -0.25] }, 0);
  b.box(0.04, 0.5, 0.05, 0xcfd4dc, { pos: [-2.4, 1.6, -0.24] }, 0.01);
  b.box(0.04, 0.35, 0.05, 0xcfd4dc, { pos: [-2.4, 0.9, -0.24] }, 0.01);
  // table (x 1.85 … 2.85) + chairs
  b.box(1.0, 0.06, 0.8, WOOD, { pos: [2.35, 0.75, 0.0] }, 0.015);
  for (const [x, z] of [[1.95, -0.3], [2.75, -0.3], [1.95, 0.3], [2.75, 0.3]] as const) b.box(0.06, 0.72, 0.06, DARK_WOOD, { pos: [x, 0.36, z] }, 0.008);
  b.cyl(0.14, 0.1, 0.07, 0xc23b2b, { pos: [2.35, 0.82, 0.0] }, 14);
  for (const s of [0xe3a91a, 0x37b26a, 0xd8332f]) b.add(new THREE.SphereGeometry(0.05, 8, 6), s, { pos: [2.3 + (s % 3) * 0.04, 0.88, 0.02 + (s % 2) * 0.04] });
  b.box(0.5, 0.06, 0.5, DARK_WOOD, { pos: [1.5, 0.43, 0.1] }, 0.02); // chair 1 (seat top 0.46)
  b.box(0.06, 0.55, 0.5, DARK_WOOD, { pos: [1.26, 0.72, 0.1] }, 0.02);
  for (const [x, z] of [[1.3, -0.1], [1.7, -0.1], [1.3, 0.3], [1.7, 0.3]] as const) b.box(0.04, 0.4, 0.04, DARK_WOOD, { pos: [x, 0.2, z] }, 0.005);
  b.box(0.5, 0.06, 0.5, DARK_WOOD, { pos: [3.0, 0.43, 0.1] }, 0.02);
  b.box(0.06, 0.55, 0.5, DARK_WOOD, { pos: [3.24, 0.72, 0.1] }, 0.02);
  for (const [x, z] of [[2.8, -0.1], [3.2, -0.1], [2.8, 0.3], [3.2, 0.3]] as const) b.box(0.04, 0.4, 0.04, DARK_WOOD, { pos: [x, 0.2, z] }, 0.005);
  plantAt(b, 3.0, -0.75, 0.9);
  b.box(0.8, 0.04, 0.2, WOOD, { pos: [2.4, 1.7, -0.9] }, 0.01); // wall shelf with jars
  for (let i = 0; i < 4; i++) b.cyl(0.06, 0.06, 0.16, [0xe3a91a, 0xc23b2b, 0x37b26a, 0xefece2][i]!, { pos: [2.15 + i * 0.2, 1.8, -0.9] }, 10);
  const lamp = glow(0xffd29a, 1.8);
  const pend = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.2, 14, 1, true), lamp);
  pend.position.set(2.35, 1.9, 0.0);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.0, 4), new THREE.MeshBasicMaterial({ color: BLACK }));
  cord.position.set(2.35, 2.5, 0.0);
  return { furniture: [b.build(), pend, cord], lights: [{ light: lampLight(2.35, 1.7, 0.3, 8), day: 0.5, night: 1 }, { light: lampLight(-0.4, 1.7, 0.4, 6, 0xfff0d8), day: 0.6, night: 1 }], lampMats: [lamp] };
}

// ---------------------------------------------------------------- Bathroom
function bathroom(): Parts {
  const b = new Batch();
  const WHITE = 0xf1f2f4;
  // shower cabin (x −2.7 … −0.9)
  b.box(1.8, 0.08, 1.5, 0xd6dce0, { pos: [-1.8, 0.04, -0.2] }, 0.01); // tray
  b.box(0.04, 2.2, 0.04, 0xcfd4dc, { pos: [-0.9, 1.1, 0.55] }, 0.005);
  b.box(0.04, 2.2, 0.04, 0xcfd4dc, { pos: [-2.7, 1.1, 0.55] }, 0.005);
  b.box(1.8, 0.04, 0.04, 0xcfd4dc, { pos: [-1.8, 2.2, 0.55] }, 0.005);
  b.box(0.04, 0.4, 0.04, 0xcfd4dc, { pos: [-1.8, 1.05, 0.56] }, 0.005);
  b.cyl(0.015, 0.015, 0.5, 0xcfd4dc, { pos: [-2.15, 2.0, -0.85] }, 8);
  b.cyl(0.14, 0.14, 0.03, 0xcfd4dc, { pos: [-2.0, 2.2, -0.65], rot: [0.5, 0, 0] }, 16);
  b.box(0.3, 0.12, 0.05, 0xcfd4dc, { pos: [-2.15, 1.3, -0.95] }, 0.01);
  // toilet (x 0.1)
  b.box(0.4, 0.4, 0.55, WHITE, { pos: [0.3, 0.22, -0.55] }, 0.08);
  b.box(0.2, 0.75, 0.55, WHITE, { pos: [0.1, 0.55, -0.6] }, 0.04);
  b.box(0.4, 0.04, 0.55, 0xd9dde2, { pos: [0.3, 0.45, -0.55] }, 0.02);
  // vanity (x 1.5) + sink + tap
  b.box(1.2, 0.8, 0.5, WOOD, { pos: [1.55, 0.4, -0.7] }, 0.02);
  b.box(1.25, 0.05, 0.55, WHITE, { pos: [1.55, 0.83, -0.68] }, 0.02);
  b.box(0.5, 0.03, 0.3, 0xcdd3d8, { pos: [1.4, 0.86, -0.66] }, 0.01);
  b.cyl(0.015, 0.015, 0.22, 0xcfd4dc, { pos: [1.4, 0.98, -0.85] }, 8);
  b.box(0.04, 0.03, 0.14, 0xcfd4dc, { pos: [1.4, 1.08, -0.8] }, 0.005);
  b.box(0.04, 0.34, 0.03, 0xcfd4dc, { pos: [1.8, 0.4, -0.43] }, 0.005);
  b.cyl(0.03, 0.03, 0.18, 0x2459d6, { pos: [1.9, 0.95, -0.7] }, 10);
  // mirror with bulbs
  b.box(1.0, 0.85, 0.04, 0x15171b, { pos: [1.55, 1.7, WALL_Z + 0.04] }, 0.01);
  b.box(0.92, 0.77, 0.02, 0x9fb4c8, { pos: [1.55, 1.7, WALL_Z + 0.07] }, 0);
  // towel rail, mat, basket
  b.box(0.6, 0.03, 0.05, 0xcfd4dc, { pos: [2.65, 1.5, -0.9] }, 0.005);
  b.box(0.5, 0.55, 0.03, 0x2459d6, { pos: [2.65, 1.2, -0.9] }, 0.01);
  b.box(0.9, 0.015, 0.5, 0x3f7fb0, { pos: [0.6, 0.008, 0.45] }, 0.005);
  b.cyl(0.2, 0.17, 0.4, 0x8b5a34, { pos: [2.95, 0.2, -0.5] }, 12);
  const bulbs = glow(0xfff0c0, 2.6);
  const bulbGroup = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), bulbs);
    m.position.set(1.15 + i * 0.08, 2.17, WALL_Z + 0.09);
    bulbGroup.add(m);
  }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.15), new THREE.MeshBasicMaterial({ color: 0xbfe3f0, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide }));
  glass.position.set(-1.8, 1.12, 0.56);
  return { furniture: [b.build(), bulbGroup, glass], lights: [{ light: lampLight(1.5, 1.9, 0.5, 9, 0xfff0d8), day: 0.7, night: 1 }, { light: lampLight(-1.8, 2.0, 0.3, 6, 0xdfeeff), day: 0.7, night: 1 }], lampMats: [bulbs], showerOrigin: new THREE.Vector3(-2.0, 2.18, -0.55) };
}

const BUILDERS: Record<HomeRoom, { parts: () => Parts; theme: () => RoomTheme; window: { x: number; y: number; w: number; h: number } | null; fitWidth: number }> = {
  bedroom: { parts: bedroom, theme: () => ({ wallTop: '#6a5646', wallBottom: '#4b3d33', floor: woodFloor('#8a5a34'), wallTex: wallPaper('#6e5a49', '#4a3c32'), trim: 0x3a2a1e, ambient: 0.9 }), window: { x: 0.4, y: 1.65, w: 1.3, h: 1.1 }, fitWidth: 3.4 },
  study: { parts: study, theme: () => ({ wallTop: '#35505a', wallBottom: '#27383f', floor: woodFloor('#7a4e2c'), wallTex: wallPaper('#3a5864', '#28393f'), trim: 0x1d2a2f, ambient: 0.9 }), window: { x: -1.9, y: 1.7, w: 1.2, h: 1.1 }, fitWidth: 3.4 },
  living: { parts: living, theme: () => ({ wallTop: '#6a5d52', wallBottom: '#473e37', floor: woodFloor('#8a5a34'), wallTex: wallPaper('#716356', '#463d36'), trim: 0x2f2620, ambient: 0.9 }), window: { x: -0.7, y: 1.6, w: 1.5, h: 1.2 }, fitWidth: 3.4 },
  kitchen: { parts: kitchen, theme: () => ({ wallTop: '#7b8466', wallBottom: '#5b6350', floor: lightTiles('#c9bfa8', '#b8ad94'), wallTex: wallPaper('#868f6f', '#5d6652'), trim: 0x3a4030, ambient: 1.0 }), window: { x: 0.6, y: 1.55, w: 1.0, h: 0.8 }, fitWidth: 3.4 },
  bathroom: { parts: bathroom, theme: () => ({ wallTop: '#b8c4c8', wallBottom: '#9aa8ad', floor: lightTiles('#c9d3d6', '#b4c0c4'), wallTex: lightTiles('#c8d2d5', '#b9c5c9'), trim: 0x6a777c, ambient: 1.1 }), window: { x: 0.2, y: 2.0, w: 0.7, h: 0.5 }, fitWidth: 3.4 },
};

/** Builds one home room as a complete scene: shell, furniture, lights, tap volumes and activity effects. */
export function createHomeScene(room: HomeRoom): RoomScene {
  const def = BUILDERS[room];
  const root = new THREE.Group();
  const theme = def.theme();
  const shell: RoomShell = createShell(theme, def.window);
  root.add(shell.group);
  const parts = def.parts();
  parts.furniture.forEach((f) => root.add(f));
  for (const l of parts.lights) root.add(l.light);
  if (parts.tvLight) root.add(parts.tvLight);

  // contact shadow under the lane + soft light pool
  const blobTex = blobTexture();
  const poolTex = poolTexture();
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.set(0, 0.006, LANE_Z);
  root.add(blob);

  const hemi = new THREE.HemisphereLight(0xdbe4f6, 0x5a4a3c, theme.ambient * 1.5);
  root.add(hemi);
  const key = new THREE.DirectionalLight(0xffe4c0, 1.5);
  key.position.set(1.5, 4.5, 4);
  key.target.position.set(0, 0.8, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 3.5, bottom: -0.5, near: 1, far: 12 });
  key.shadow.radius = 5;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  root.add(key, key.target);

  // lamp pools on the floor (additive)
  for (const l of parts.lights) {
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.8), new THREE.MeshBasicMaterial({ map: poolTex, opacity: 0.7, ...additive }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(l.light.position.x, 0.008, 0.2);
    root.add(pool);
  }

  const actorRoot = new THREE.Group();
  actorRoot.position.z = LANE_Z;
  root.add(actorRoot);

  // tap volumes
  const hits: THREE.Mesh[] = [];
  for (const o of ROOMS[room].objects) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(o.width, o.height, 1.4), new THREE.MeshBasicMaterial({ visible: false }));
    m.position.set(o.hitX ?? o.x, o.height / 2, 0);
    m.userData.interactable = o.id;
    hits.push(m);
    root.add(m);
  }

  // effects: shower drops, Zzz sprites
  const dropTex = dropTexture();
  let drops: THREE.Points | null = null;
  const DROPS = 90;
  const dropPos = new Float32Array(DROPS * 3);
  const dropSeed = new Float32Array(DROPS);
  if (parts.showerOrigin) {
    const g = new THREE.BufferGeometry();
    for (let i = 0; i < DROPS; i++) dropSeed[i] = (i * 0.6180339) % 1;
    g.setAttribute('position', new THREE.BufferAttribute(dropPos, 3));
    drops = new THREE.Points(g, new THREE.PointsMaterial({ map: dropTex, size: 0.14, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    drops.frustumCulled = false;
    drops.visible = false;
    root.add(drops);
  }
  const zTex = zTexture();
  const zs: THREE.Sprite[] = [];
  if (parts.zzzOrigin) {
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: zTex, transparent: true, depthWrite: false }));
      s.visible = false;
      s.scale.setScalar(0.2 + i * 0.07);
      root.add(s);
      zs.push(s);
    }
  }

  let activity: ActionKind = 'idle';
  let hour = 12;
  const applyHour = () => {
    shell.setHour(hour);
    const night = hour < 6.5 || hour >= 19.5 ? 1 : hour < 8 || hour >= 17.5 ? 0.5 : 0;
    hemi.intensity = theme.ambient * 1.5 * (1 - 0.4 * night);
    key.intensity = 2.1 * (1 - 0.5 * night);
    for (const l of parts.lights) l.light.intensity = (l.light.userData.base ??= l.light.intensity) * (l.day + (l.night - l.day) * night);
    for (const m of parts.lampMats) m.color.setScalar(1).multiplyScalar(0.9 + 0.5 * night);
  };

  return {
    id: `home:${room}`,
    roomId: room,
    root,
    actorRoot,
    hits,
    bounds: [ROOMS[room].minX, ROOMS[room].maxX],
    camera: { target: [0, 1.25, 0], fov: 36, yaw: 0, elevation: 9, fitWidth: def.fitWidth, fitHeight: 3.0, uiBottomFraction: 0.34, followRange: [-ROOM_HALF + def.fitWidth / 2, ROOM_HALF - def.fitWidth / 2] },
    setHour(h: number) {
      hour = h;
      applyHour();
    },
    setActivity(kind: ActionKind) {
      activity = kind;
      if (parts.tvMat) parts.tvMat.color.setScalar(kind === 'tv' ? 1.2 : 0.35);
      if (parts.tvLight) parts.tvLight.intensity = kind === 'tv' ? 7 : 0;
    },
    update(_dt: number, t: number) {
      if (drops) {
        drops.visible = activity === 'shower';
        if (drops.visible && parts.showerOrigin) {
          for (let i = 0; i < DROPS; i++) {
            const k = (t * 1.6 + dropSeed[i]!) % 1;
            dropPos[i * 3] = parts.showerOrigin.x + (dropSeed[(i * 7) % DROPS]! - 0.5) * 0.5;
            dropPos[i * 3 + 1] = parts.showerOrigin.y - k * 2.05;
            dropPos[i * 3 + 2] = parts.showerOrigin.z + 0.2 + (dropSeed[(i * 13) % DROPS]! - 0.5) * 0.4;
          }
          (drops.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        }
      }
      zs.forEach((s, i) => {
        s.visible = activity === 'sleep';
        if (s.visible && parts.zzzOrigin) {
          const k = (t * 0.35 + i / 3) % 1;
          s.position.set(parts.zzzOrigin.x + k * 0.5, parts.zzzOrigin.y + k * 0.7, LANE_Z + 0.3);
          (s.material as THREE.SpriteMaterial).opacity = 1 - k;
        }
      });
    },
    focusX: () => actorRoot.children[0]?.position.x ?? 0,
    dispose() {
      shell.dispose();
      blobTex.dispose();
      poolTex.dispose();
      dropTex.dispose();
      zTex.dispose();
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    },
  };
}

export type { HomeObject };
