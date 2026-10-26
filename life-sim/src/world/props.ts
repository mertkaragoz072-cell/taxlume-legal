import * as THREE from 'three';
import { OutlinedMesh, outlined, toon } from './materials';

/** Reusable procedural props shared by every location. */

export const PLATE_SPEC = [
  { kg: 20, r: 0.225, t: 0.05, color: 0x2f6fe0 },
  { kg: 10, r: 0.2, t: 0.04, color: 0x2fb457 },
  { kg: 5, r: 0.165, t: 0.032, color: 0xf2f2f2 },
  { kg: 2.5, r: 0.13, t: 0.026, color: 0xe5483f },
  { kg: 1.25, r: 0.105, t: 0.02, color: 0xf0c541 },
] as const;

export const BAR_KG = 20;

/** Greedy plate loading per side for a total barbell weight. */
export function platesFor(totalKg: number): number[] {
  let side = Math.max(0, (totalKg - BAR_KG) / 2);
  const out: number[] = [];
  for (const p of PLATE_SPEC) {
    while (side + 1e-6 >= p.kg) {
      out.push(p.kg);
      side -= p.kg;
    }
  }
  return out;
}

const darkMetal = () => toon(0x3b3f48);

/** Olympic barbell lying along z (seen end-on from the side camera). Origin = bar centre. */
export class Barbell extends THREE.Group {
  private plates = new THREE.Group();
  readonly halfLength = 0.62;
  constructor() {
    super();
    const bar = outlined(new THREE.CylinderGeometry(0.014, 0.014, this.halfLength * 2, 12), 0xcfd4dc, 0.006);
    bar.rotation.x = Math.PI / 2;
    this.add(bar);
    for (const s of [1, -1]) {
      const sleeve = outlined(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 14), 0xaeb4bf, 0.006);
      sleeve.rotation.x = Math.PI / 2;
      sleeve.position.z = s * (this.halfLength - 0.21);
      this.add(sleeve);
    }
    this.add(this.plates);
  }

  setLoad(totalKg: number): void {
    while (this.plates.children.length) {
      const c = this.plates.children[0] as OutlinedMesh;
      this.plates.remove(c);
      c.fill?.geometry?.dispose?.();
    }
    for (const s of [1, -1]) {
      let z = this.halfLength - 0.04;
      for (const kg of platesFor(totalKg)) {
        const spec = PLATE_SPEC.find((p) => p.kg === kg)!;
        const plate = outlined(new THREE.CylinderGeometry(spec.r, spec.r, spec.t, 28), spec.color, 0.01);
        plate.rotation.x = Math.PI / 2;
        z -= spec.t / 2 + 0.003;
        plate.position.z = s * z;
        z -= spec.t / 2;
        this.plates.add(plate);
      }
      // Collar
      const collar = outlined(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12), 0x23262c, 0.006);
      collar.rotation.x = Math.PI / 2;
      collar.position.z = s * (z - 0.02);
      this.plates.add(collar);
    }
  }
}

/** Padded flat bench. Local origin on the floor under the bench centre, runs along x. */
export function createBench(): THREE.Group {
  const g = new THREE.Group();
  const pad = outlined(new THREE.BoxGeometry(1.25, 0.1, 0.3, 1, 1, 1), 0x1d2128, 0.012);
  pad.position.set(0.1, 0.46 - 0.05 + 0.0, 0);
  g.add(pad);
  const stitch = outlined(new THREE.BoxGeometry(1.2, 0.012, 0.26), 0xd8a31a, 0.004);
  stitch.position.set(0.1, 0.46 + 0.002, 0);
  g.add(stitch);
  const frame = darkMetal();
  for (const x of [-0.35, 0.55]) {
    const leg = new OutlinedMesh(new THREE.BoxGeometry(0.06, 0.36, 0.5), frame, 0.01);
    leg.position.set(x, 0.18, 0);
    g.add(leg);
  }
  const spine = new OutlinedMesh(new THREE.BoxGeometry(1.1, 0.05, 0.06), frame, 0.008);
  spine.position.set(0.1, 0.34, 0);
  g.add(spine);
  return g;
}

/** Bench-press rack uprights with J-hooks at the head end. */
export function createRack(hookY: number, x: number): THREE.Group {
  const g = new THREE.Group();
  const frame = new THREE.MeshToonMaterial({ color: 0xd9a21b });
  for (const z of [0.5, -0.5]) {
    const up = new OutlinedMesh(new THREE.BoxGeometry(0.07, 1.5, 0.07), frame, 0.01);
    up.position.set(x, 0.75, z);
    g.add(up);
    const base = new OutlinedMesh(new THREE.BoxGeometry(0.9, 0.05, 0.07), frame, 0.01);
    base.position.set(x - 0.2, 0.025, z);
    g.add(base);
    const hook = new OutlinedMesh(new THREE.BoxGeometry(0.1, 0.03, 0.06), darkMetal(), 0.008);
    hook.position.set(x + 0.05, hookY - 0.04, z);
    g.add(hook);
    const safety = new OutlinedMesh(new THREE.BoxGeometry(0.4, 0.03, 0.05), darkMetal(), 0.008);
    safety.position.set(x + 0.2, 0.52, z);
    g.add(safety);
  }
  const cross = new OutlinedMesh(new THREE.BoxGeometry(0.06, 0.06, 1.07), frame, 0.01);
  cross.position.set(x, 1.5, 0);
  g.add(cross);
  return g;
}

export function createSquatRack(): THREE.Group {
  const g = new THREE.Group();
  const frame = new THREE.MeshToonMaterial({ color: 0xc23b2b });
  for (const [x, z] of [[-0.6, 0.45], [-0.6, -0.45], [0.6, 0.45], [0.6, -0.45]] as const) {
    const up = new OutlinedMesh(new THREE.BoxGeometry(0.08, 2.3, 0.08), frame, 0.01);
    up.position.set(x, 1.15, z);
    g.add(up);
  }
  for (const y of [2.3, 0.1]) {
    for (const z of [0.45, -0.45]) {
      const b = new OutlinedMesh(new THREE.BoxGeometry(1.28, 0.07, 0.07), frame, 0.01);
      b.position.set(0, y, z);
      g.add(b);
    }
  }
  const pullbar = new OutlinedMesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 10), toon(0xcfd4dc), 0.006);
  pullbar.rotation.x = Math.PI / 2;
  pullbar.position.set(0.3, 2.15, 0);
  g.add(pullbar);
  const bar = new Barbell();
  bar.setLoad(60);
  bar.position.set(-0.6, 1.45, 0);
  g.add(bar);
  return g;
}

export function createDumbbellRack(): THREE.Group {
  const g = new THREE.Group();
  const frame = darkMetal();
  for (const y of [0.35, 0.75]) {
    const shelf = new OutlinedMesh(new THREE.BoxGeometry(1.7, 0.05, 0.4), frame, 0.008);
    shelf.position.set(0, y, 0);
    g.add(shelf);
  }
  for (const x of [-0.8, 0.8]) {
    const leg = new OutlinedMesh(new THREE.BoxGeometry(0.06, 0.8, 0.4), frame, 0.008);
    leg.position.set(x, 0.4, 0);
    g.add(leg);
  }
  const colors = [0xe5483f, 0xf0c541, 0x2fb457, 0x2f6fe0, 0xb04fd8, 0xf28a2e];
  for (const [row, y] of [[0, 0.375], [1, 0.775]] as const) {
    for (let i = 0; i < 6; i++) {
      const d = new THREE.Group();
      const handle = outlined(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), 0xcfd4dc, 0.005);
      handle.rotation.z = Math.PI / 2;
      d.add(handle);
      for (const s of [-1, 1]) {
        const head = outlined(new THREE.CylinderGeometry(0.05 + i * 0.006, 0.05 + i * 0.006, 0.08, 6), colors[(i + row * 2) % colors.length]!, 0.006);
        head.rotation.z = Math.PI / 2;
        head.position.x = s * 0.1;
        d.add(head);
      }
      d.position.set(-0.65 + i * 0.26, y + 0.07 + i * 0.006, 0);
      g.add(d);
    }
  }
  return g;
}

export function createTreadmill(): THREE.Group {
  const g = new THREE.Group();
  const base = outlined(new THREE.BoxGeometry(1.6, 0.14, 0.62), 0x23262c, 0.01);
  base.position.set(0, 0.17, 0);
  g.add(base);
  const belt = outlined(new THREE.BoxGeometry(1.42, 0.02, 0.5), 0x0e0f12, 0.004);
  belt.position.set(0.02, 0.255, 0);
  g.add(belt);
  for (const z of [0.3, -0.3]) {
    const post = outlined(new THREE.BoxGeometry(0.05, 1.05, 0.05), 0x3b3f48, 0.008);
    post.position.set(-0.7, 0.7, z);
    post.rotation.z = -0.12;
    g.add(post);
  }
  const console_ = outlined(new THREE.BoxGeometry(0.2, 0.18, 0.7), 0x23262c, 0.008);
  console_.position.set(-0.78, 1.2, 0);
  console_.rotation.z = 0.3;
  g.add(console_);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.12), new THREE.MeshBasicMaterial({ color: 0x4de1ff }));
  screen.position.set(-0.69, 1.23, 0.0);
  screen.rotation.y = Math.PI / 2;
  g.add(screen);
  return g;
}

export function createPlateTree(): THREE.Group {
  const g = new THREE.Group();
  const post = outlined(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 10), 0x3b3f48, 0.008);
  post.position.y = 0.65;
  g.add(post);
  const base = outlined(new THREE.CylinderGeometry(0.28, 0.3, 0.05, 16), 0x23262c, 0.008);
  base.position.y = 0.025;
  g.add(base);
  PLATE_SPEC.forEach((p, i) => {
    for (let k = 0; k < 2; k++) {
      const plate = outlined(new THREE.CylinderGeometry(p.r, p.r, p.t, 24), p.color, 0.008);
      plate.rotation.x = Math.PI / 2;
      plate.position.set(0, 0.25 + i * 0.2 + k * 0.045, 0.1 + k * 0.06);
      g.add(plate);
    }
  });
  return g;
}

export function createKettlebells(): THREE.Group {
  const g = new THREE.Group();
  [0xe5483f, 0x2f6fe0, 0xf0c541].forEach((c, i) => {
    const body = outlined(new THREE.SphereGeometry(0.1 + i * 0.012, 16, 12), c, 0.008);
    body.position.set(i * 0.28, 0.1 + i * 0.012, 0);
    const handle = outlined(new THREE.TorusGeometry(0.06, 0.016, 8, 16), c, 0.006);
    handle.position.set(i * 0.28, 0.24 + i * 0.015, 0);
    g.add(body, handle);
  });
  return g;
}
