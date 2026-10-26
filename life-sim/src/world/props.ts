import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Batch } from './batch';
import { BENCH, SPINE_N, backPad } from './benchGeometry';
import { OutlinedMesh, outlined, toon } from './materials';

/** Reusable procedural props. Hero props (bench station) are outlined; background props are batched. */

export const PLATE_SPEC = [
  { kg: 20, r: 0.225, t: 0.062, color: 0x2459d6 },
  { kg: 10, r: 0.2, t: 0.054, color: 0xd8332f },
  { kg: 5, r: 0.165, t: 0.044, color: 0xf2c230 },
  { kg: 2.5, r: 0.13, t: 0.036, color: 0xefefe8 },
  { kg: 1.25, r: 0.105, t: 0.028, color: 0x8b919c },
] as const;

export const BAR_KG = 20;
/** Half length of the bar; plates stack inward from here and never come closer to centre than RACK_Z + upright half-width. */
export const BAR_HALF = 0.82;
/** Rack uprights stand this far from the bench centre line (inside the plates, outside the lifter's hands). */
export const RACK_Z = 0.44;
export const RACK_UPRIGHT = 0.06;

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

const STEEL = 0x353a45;
const STEEL_LIGHT = 0x555c6a;
const YELLOW = 0xe3a91a;

/** Olympic barbell lying along z. Origin = bar centre. */
export class Barbell extends THREE.Group {
  private plates = new THREE.Group();
  readonly halfLength = BAR_HALF;
  constructor() {
    super();
    const bar = outlined(new THREE.CylinderGeometry(0.016, 0.016, this.halfLength * 2, 14), 0xd5dae2, 0.008);
    bar.rotation.x = Math.PI / 2;
    this.add(bar);
    for (const s of [1, -1]) {
      const sleeve = outlined(new THREE.CylinderGeometry(0.028, 0.028, 0.34, 16), 0xb6bcc7, 0.008);
      sleeve.rotation.x = Math.PI / 2;
      sleeve.position.z = s * (this.halfLength - 0.17);
      this.add(sleeve);
    }
    this.add(this.plates);
  }

  setLoad(totalKg: number): void {
    for (const c of [...this.plates.children]) {
      this.plates.remove(c);
      (c as OutlinedMesh).fill?.geometry.dispose();
    }
    for (const s of [1, -1]) {
      let z = this.halfLength - 0.03;
      for (const kg of platesFor(totalKg)) {
        const spec = PLATE_SPEC.find((p) => p.kg === kg)!;
        const plate = new THREE.Group();
        const disc = outlined(new THREE.CylinderGeometry(spec.r, spec.r, spec.t, 32), spec.color, 0.012);
        const hub = outlined(new THREE.CylinderGeometry(spec.r * 0.42, spec.r * 0.42, spec.t + 0.008, 20), 0x1c1f25, 0.006);
        plate.add(disc, hub);
        plate.rotation.x = Math.PI / 2;
        z -= spec.t / 2 + 0.002;
        plate.position.z = s * z;
        z -= spec.t / 2;
        this.plates.add(plate);
      }
      const collar = outlined(new THREE.CylinderGeometry(0.04, 0.04, 0.035, 14), 0x15171b, 0.006);
      collar.rotation.x = Math.PI / 2;
      collar.position.z = s * (z - 0.022);
      this.plates.add(collar);
    }
  }
}

/** Flat bench (fallback when the supplied sprite is missing): one long pad on a steel frame. */
function createFlatBench(): THREE.Group {
  const g = new THREE.Group();
  const len = BENCH.padFootX - BENCH.padHeadX;
  const cx = (BENCH.padFootX + BENCH.padHeadX) / 2;
  const pad = new OutlinedMesh(new RoundedBoxGeometry(len, 0.1, 0.32, 4, 0.04), toon(0x1b1e24), 0.012);
  pad.position.set(cx, BENCH.seatTop - 0.05, 0);
  g.add(pad);
  for (const x of [BENCH.padFootX - 0.2, BENCH.padHeadX + 0.25]) {
    const leg = new OutlinedMesh(new RoundedBoxGeometry(0.07, BENCH.seatTop - 0.1, 0.06, 2, 0.015), toon(STEEL_LIGHT), 0.012);
    leg.position.set(x, (BENCH.seatTop - 0.1) / 2, 0);
    g.add(leg);
    const foot = new OutlinedMesh(new RoundedBoxGeometry(0.1, 0.03, 0.62, 2, 0.01), toon(STEEL), 0.01);
    foot.position.set(x, 0.015, 0);
    g.add(foot);
  }
  return g;
}

/** Incline bench: padded seat, inclined back pad on a steel frame. Geometry comes from `benchGeometry.ts`. */
export function createBench(): THREE.Group {
  if (Math.cos(BENCH.incline) < 1e-3) return createFlatBench();
  const g = new THREE.Group();
  const frame = toon(STEEL_LIGHT);
  const seat = new OutlinedMesh(new RoundedBoxGeometry(0.52, 0.1, 0.32, 4, 0.04), toon(0x1b1e24), 0.012);
  seat.position.set(0.16, BENCH.seatTop - 0.05, 0);
  g.add(seat);
  const bp = backPad();
  const back = new OutlinedMesh(new RoundedBoxGeometry(bp.thickness, bp.length, 0.34, 4, 0.04), toon(0x1b1e24), 0.012);
  back.position.set(bp.center[0], bp.center[1], 0);
  back.rotation.z = BENCH.incline;
  g.add(back);
  const stitch = outlined(new THREE.BoxGeometry(0.006, bp.length * 0.9, 0.02), YELLOW, 0.002);
  stitch.position.set(bp.center[0] + SPINE_N[0] * (bp.thickness / 2 + 0.002), bp.center[1] + SPINE_N[1] * (bp.thickness / 2 + 0.002), 0);
  stitch.rotation.z = BENCH.incline;
  g.add(stitch);
  // frame: front and rear legs, floor feet, and a diagonal brace under the back pad
  const leg = (x: number, h: number) => {
    const m = new OutlinedMesh(new RoundedBoxGeometry(0.07, h, 0.06, 2, 0.015), frame, 0.012);
    m.position.set(x, h / 2, 0);
    g.add(m);
  };
  leg(0.38, BENCH.seatTop - 0.1);
  leg(-0.04, BENCH.seatTop - 0.1);
  for (const x of [0.38, -0.05]) {
    const foot = new OutlinedMesh(new RoundedBoxGeometry(0.1, 0.03, 0.62, 2, 0.01), toon(STEEL), 0.01);
    foot.position.set(x, 0.015, 0);
    g.add(foot);
  }
  const brace = new OutlinedMesh(new RoundedBoxGeometry(0.05, 0.62, 0.06, 2, 0.01), frame, 0.01);
  brace.position.set(-0.16, 0.5, 0);
  brace.rotation.z = 0.35;
  g.add(brace);
  return g;
}

/**
 * Bench-press rack: two slim uprights flanking the lifter's shoulders with J-hooks, a floor
 * stabiliser behind them and no overhead beam, so nothing stands between the camera and the lifter.
 */
export function createRack(hookY: number, x: number): THREE.Group {
  const g = new THREE.Group();
  const frame = toon(STEEL);
  const h = hookY + 0.25;
  for (const z of [RACK_Z, -RACK_Z]) {
    const up = new OutlinedMesh(new RoundedBoxGeometry(RACK_UPRIGHT, h, RACK_UPRIGHT, 2, 0.015), frame, 0.012);
    up.position.set(x, h / 2, z);
    g.add(up);
    const base = new OutlinedMesh(new RoundedBoxGeometry(0.7, 0.04, RACK_UPRIGHT + 0.02, 2, 0.01), frame, 0.01);
    base.position.set(x - 0.3, 0.02, z); // extends away from the camera
    g.add(base);
    const hook = new OutlinedMesh(new RoundedBoxGeometry(0.12, 0.03, 0.06, 2, 0.008), toon(YELLOW), 0.008);
    hook.position.set(x + 0.06, hookY - 0.035, z * 0.97);
    g.add(hook);
    const lip = new OutlinedMesh(new RoundedBoxGeometry(0.025, 0.06, 0.06, 2, 0.008), toon(YELLOW), 0.008);
    lip.position.set(x + 0.115, hookY - 0.01, z * 0.97);
    g.add(lip);
    const cap = new OutlinedMesh(new RoundedBoxGeometry(RACK_UPRIGHT + 0.015, 0.03, RACK_UPRIGHT + 0.015, 2, 0.008), toon(YELLOW), 0.008);
    cap.position.set(x, h + 0.015, z);
    g.add(cap);
  }
  const stabiliser = new OutlinedMesh(new RoundedBoxGeometry(0.05, 0.04, RACK_Z * 2, 2, 0.01), frame, 0.01);
  stabiliser.position.set(x - 0.6, 0.02, 0);
  g.add(stabiliser);
  g.traverse((o) => (o.userData.rack = true)); // lets the occlusion checks tell the rack apart from the lifter
  return g;
}

// ---------- Batched background props (one draw call each) ----------

/** Large steel power rack standing behind the bench station. */
export function powerRackBack(): THREE.Mesh {
  const b = new Batch();
  for (const [x, z] of [[-0.75, 0.55], [-0.75, -0.55], [0.75, 0.55], [0.75, -0.55]] as const) b.box(0.1, 2.45, 0.1, STEEL, { pos: [x, 1.225, z] }, 0.02);
  for (const y of [2.4, 1.5]) for (const z of [0.55, -0.55]) b.box(1.6, 0.08, 0.1, STEEL_LIGHT, { pos: [0, y, z] }, 0.02);
  for (const x of [-0.75, 0.75]) b.box(0.1, 0.08, 1.2, STEEL_LIGHT, { pos: [x, 2.4, 0] }, 0.02);
  // hole strips
  for (const [x, z] of [[-0.75, 0.6], [0.75, 0.6]] as const) for (let i = 0; i < 14; i++) b.cyl(0.012, 0.012, 0.02, 0x0b0c0f, { pos: [x, 0.3 + i * 0.15, z], rot: [Math.PI / 2, 0, 0] }, 8);
  // pull-up bar + bar with plates racked at the left
  b.cyl(0.025, 0.025, 1.6, 0xd5dae2, { pos: [0, 2.2, 0.55], rot: [0, 0, Math.PI / 2] });
  b.cyl(0.016, 0.016, 1.7, 0xd5dae2, { pos: [0, 1.15, 0], rot: [Math.PI / 2, 0, 0] }, 8);
  return b.build();
}

/** Two-shelf rack of black rubber dumbbells (matches the reference's left wall). */
export function blackDumbbellRack(): THREE.Mesh {
  const b = new Batch();
  for (const y of [0.45, 0.95]) b.box(2.0, 0.05, 0.42, STEEL_LIGHT, { pos: [0, y, 0] }, 0.012);
  for (const x of [-0.95, 0.95]) b.box(0.07, 1.0, 0.42, STEEL, { pos: [x, 0.5, 0] }, 0.012);
  b.box(2.0, 0.05, 0.42, STEEL_LIGHT, { pos: [0, 0.09, 0] }, 0.012);
  for (const [row, y] of [[0, 0.475], [1, 0.975]] as const)
    for (let i = 0; i < 8; i++) {
      const x = -0.82 + i * 0.235;
      const r = 0.055 + ((i + row) % 4) * 0.007;
      b.cyl(0.012, 0.012, 0.2, 0xcfd4dc, { pos: [x, y + r, 0], rot: [0, 0, Math.PI / 2] }, 8);
      for (const s of [-1, 1]) b.cyl(r, r, 0.07, 0x15171b, { pos: [x + s * 0.1, y + r, 0], rot: [0, 0, Math.PI / 2] }, 6);
    }
  return b.build();
}

/** Tiered A-frame rack of colourful hex dumbbells. */
export function colorDumbbellRack(): THREE.Mesh {
  const b = new Batch();
  const colors = [0xd8332f, 0xf2c230, 0x37b26a, 0x2459d6, 0x9b4fd1, 0xf08a2e];
  for (const [i, y] of ([0.35, 0.8, 1.25] as const).entries()) {
    b.box(1.2 - i * 0.12, 0.05, 0.5, STEEL_LIGHT, { pos: [0, y, 0] }, 0.012);
    for (let k = 0; k < 5 - i; k++) {
      const x = -0.5 + i * 0.05 + k * (0.24 + i * 0.01);
      const r = 0.06 + ((k + i) % 3) * 0.008;
      const c = colors[(k + i * 2) % colors.length]!;
      b.cyl(0.012, 0.012, 0.19, 0xcfd4dc, { pos: [x, y + 0.03 + r, 0], rot: [0, 0, Math.PI / 2] }, 8);
      for (const s of [-1, 1]) b.cyl(r, r, 0.075, c, { pos: [x + s * 0.1, y + 0.03 + r, 0], rot: [0, 0, Math.PI / 2] }, 6);
    }
  }
  for (const x of [-0.55, 0.55]) b.box(0.06, 1.3, 0.5, STEEL, { pos: [x, 0.65, 0] }, 0.012);
  return b.build();
}

export function treadmill(): THREE.Mesh {
  const b = new Batch();
  b.box(1.7, 0.16, 0.68, STEEL, { pos: [0, 0.2, 0] }, 0.03);
  b.box(1.45, 0.025, 0.5, 0x0b0c0f, { pos: [0.03, 0.29, 0] }, 0.005);
  for (const z of [0.34, -0.34]) b.box(0.06, 1.1, 0.06, STEEL_LIGHT, { pos: [-0.72, 0.78, z], rot: [0, 0, -0.1] }, 0.012);
  b.box(0.22, 0.2, 0.78, STEEL, { pos: [-0.8, 1.3, 0], rot: [0, 0, 0.35] }, 0.03);
  b.box(0.02, 0.13, 0.4, 0x4de1ff, { pos: [-0.72, 1.34, 0], rot: [0, 0, 0.35] }, 0);
  for (const z of [0.4, -0.4]) b.box(1.3, 0.04, 0.05, YELLOW, { pos: [0.05, 0.34, z] }, 0.01);
  return b.build();
}

export function plateTree(): THREE.Mesh {
  const b = new Batch();
  b.cyl(0.03, 0.03, 1.3, STEEL_LIGHT, { pos: [0, 0.65, 0] });
  b.cyl(0.3, 0.32, 0.05, STEEL, { pos: [0, 0.025, 0] }, 20);
  PLATE_SPEC.forEach((p, i) => {
    for (let k = 0; k < 2; k++) b.cyl(p.r, p.r, p.t, p.color, { pos: [0, 0.32 + i * 0.2 + k * 0.05, 0.1 + k * 0.07], rot: [Math.PI / 2, 0, 0] }, 24);
  });
  return b.build();
}

export function kettlebells(): THREE.Mesh {
  const b = new Batch();
  [0xd8332f, 0x2459d6, 0xf2c230].forEach((c, i) => {
    b.add(new THREE.SphereGeometry(0.1 + i * 0.012, 16, 12), c, { pos: [i * 0.28, 0.1 + i * 0.012, 0] });
    b.add(new THREE.TorusGeometry(0.06, 0.017, 8, 16), c, { pos: [i * 0.28, 0.25 + i * 0.015, 0] });
  });
  return b.build();
}

export function punchingBag(): THREE.Mesh {
  const b = new Batch();
  b.cyl(0.02, 0.02, 1.0, 0x777d88, { pos: [0, 3.3, 0] }, 6);
  b.cyl(0.19, 0.17, 1.1, 0x15171b, { pos: [0, 2.2, 0] }, 20);
  b.cyl(0.192, 0.192, 0.05, 0xc23b2b, { pos: [0, 2.7, 0] }, 20);
  b.cyl(0.172, 0.172, 0.05, 0xc23b2b, { pos: [0, 1.7, 0] }, 20);
  return b.build();
}

export function plant(): THREE.Mesh {
  const b = new Batch();
  b.cyl(0.17, 0.12, 0.3, 0x3a3f4a, { pos: [0, 0.15, 0] }, 14);
  const greens = [0x2f8f4e, 0x3aa35c, 0x246f3d];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    b.add(new THREE.ConeGeometry(0.08, 0.7 + (i % 3) * 0.12, 6), greens[i % 3]!, { pos: [Math.cos(a) * 0.12, 0.62, Math.sin(a) * 0.12], rot: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4] });
  }
  return b.build();
}

export function waterBottle(): THREE.Mesh {
  const b = new Batch();
  b.cyl(0.04, 0.04, 0.24, 0x3ba0e6, { pos: [0, 0.12, 0] }, 12);
  b.cyl(0.025, 0.04, 0.05, 0x2a6ea0, { pos: [0, 0.265, 0] }, 12);
  b.cyl(0.026, 0.026, 0.03, 0x15171b, { pos: [0, 0.305, 0] }, 12);
  return b.build();
}

/** Floor-to-ceiling steel column. */
export function steelColumn(height = 6): THREE.Mesh {
  const b = new Batch();
  b.box(0.3, height, 0.3, STEEL, { pos: [0, height / 2, 0] }, 0.02);
  b.box(0.36, 0.1, 0.36, STEEL_LIGHT, { pos: [0, 0.05, 0] }, 0.02);
  return b.build();
}
