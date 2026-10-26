import * as THREE from 'three';
import { clamp, lerp } from '../core/math';
import { OutlinedMesh, toon } from '../world/materials';

export type V2 = [number, number];

/** Segment lengths in metres (a ~1.8 m stylised figure). */
export const BODY = {
  torso: 0.52,
  neck: 0.07,
  headR: 0.15,
  upperArm: 0.3,
  foreArm: 0.28,
  thigh: 0.42,
  shin: 0.42,
  footLen: 0.2,
} as const;

/**
 * Whole-body pose in the 2D side-view plane (x right, y up). Everything is
 * driven by IK targets so hands and feet stay exactly where the animation
 * module puts them (e.g. on the barbell grip).
 */
export interface Pose {
  pelvis: V2;
  /** Spine rotation (CCW radians). 0 = upright, +π/2 = lying with head to the left. */
  torso: number;
  /** Head tilt relative to spine. */
  head: number;
  /** Extra head offset along the facing direction (up when lying) so the head rests ON a pad. */
  headLift: number;
  /** Head turn about the vertical axis of the head (looking toward the camera when resting). */
  headYaw?: number;
  /** Hand targets as offsets from the shoulder, so hands can never detach from the body. */
  handNear: V2;
  handFar: V2;
  footNear: V2;
  footFar: V2;
  /** +1 / -1: which side the elbow / knee bends toward. */
  elbowBend: 1 | -1;
  kneeBend: 1 | -1;
}

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const l2 = (p: V2, q: V2): V2 => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
  return {
    pelvis: l2(a.pelvis, b.pelvis),
    torso: lerp(a.torso, b.torso, t),
    head: lerp(a.head, b.head, t),
    headLift: lerp(a.headLift, b.headLift, t),
    headYaw: lerp(a.headYaw ?? 0, b.headYaw ?? 0, t),
    handNear: l2(a.handNear, b.handNear),
    handFar: l2(a.handFar, b.handFar),
    footNear: l2(a.footNear, b.footNear),
    footFar: l2(a.footFar, b.footFar),
    elbowBend: t < 0.5 ? a.elbowBend : b.elbowBend,
    kneeBend: t < 0.5 ? a.kneeBend : b.kneeBend,
  };
}

export const SHOULDER_ALONG = BODY.torso - 0.02;

/** Shoulder joint position for a pose (spine rotated CCW by `torso` from straight up). */
export function shoulderOf(p: Pose): V2 {
  return [p.pelvis[0] - Math.sin(p.torso) * SHOULDER_ALONG, p.pelvis[1] + Math.cos(p.torso) * SHOULDER_ALONG];
}

interface Limb {
  pivot: THREE.Group;
  upper: OutlinedMesh;
  elbow: THREE.Group;
  lower: OutlinedMesh;
  end: OutlinedMesh;
  /** Rounded joints so limbs read as smooth continuous forms. */
  jointTop: OutlinedMesh;
  jointMid: OutlinedMesh;
  /** Elbow/knee position (rig coordinates) after the last IK solve. */
  mid: V2;
  l1: number;
  l2: number;
}

const SKIN = 0xf4f4f2;
const SHOE = 0x2a2d35;

/** Two-bone IK in 2D. Returns pivot rotation and relative joint rotation (limb hangs down at 0). */
export function solveTwoBone(origin: V2, target: V2, l1: number, l2: number, bend: 1 | -1): { a1: number; a2: number; reach: V2 } {
  let dx = target[0] - origin[0];
  let dy = target[1] - origin[1];
  let d = Math.hypot(dx, dy);
  const maxD = (l1 + l2) * 0.999;
  const minD = Math.abs(l1 - l2) * 1.01 + 1e-4;
  if (d > maxD) {
    dx *= maxD / d;
    dy *= maxD / d;
    d = maxD;
  } else if (d < minD) {
    d = minD;
  }
  const base = Math.atan2(dy, dx);
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const alpha = Math.acos(cosA);
  const dirAngle = base + bend * alpha; // direction of upper segment
  const ex = origin[0] + Math.cos(dirAngle) * l1;
  const ey = origin[1] + Math.sin(dirAngle) * l1;
  const fx = origin[0] + dx;
  const fy = origin[1] + dy;
  const lowerDir = Math.atan2(fy - ey, fx - ex);
  // Limb geometry hangs along -y; rotation θ maps it to dir (sinθ, -cosθ) ⇒ dirAngle = θ - π/2.
  const a1 = dirAngle + Math.PI / 2;
  const a2 = lowerDir + Math.PI / 2 - a1;
  return { a1, a2: Math.atan2(Math.sin(a2), Math.cos(a2)), reach: [fx, fy] };
}

export class StickmanRig {
  readonly root = new THREE.Group();
  private pelvisMesh: OutlinedMesh;
  private spine = new THREE.Group();
  private torsoMesh: OutlinedMesh;
  private shoulderMesh: OutlinedMesh;
  private neckMesh: OutlinedMesh;
  private headPivot = new THREE.Group();
  private head: OutlinedMesh;
  private face = new THREE.Group();
  private arms: { near: Limb; far: Limb };
  private legs: { near: Limb; far: Limb };
  private muscle = -1;
  private pose: Pose = {
    pelvis: [0, 0.84],
    torso: 0,
    head: 0,
    headLift: 0,
    handNear: [0.05, -0.5],
    handFar: [0.05, -0.5],
    footNear: [0, 0.04],
    footFar: [0, 0.04],
    elbowBend: -1,
    kneeBend: 1,
  };

  constructor() {
    const mat = toon(SKIN, 0x1f1f1f);
    this.pelvisMesh = new OutlinedMesh(new THREE.SphereGeometry(0.11, 20, 14), mat, 0.026);
    this.root.add(this.pelvisMesh, this.spine);

    this.torsoMesh = new OutlinedMesh(new THREE.BufferGeometry(), mat, 0.026);
    this.shoulderMesh = new OutlinedMesh(new THREE.BufferGeometry(), mat, 0.026);
    this.neckMesh = new OutlinedMesh(new THREE.BufferGeometry(), mat, 0.026);
    this.head = new OutlinedMesh(new THREE.SphereGeometry(BODY.headR, 28, 20), mat, 0.028);
    this.spine.add(this.torsoMesh, this.shoulderMesh, this.neckMesh, this.headPivot);
    this.headPivot.position.set(0, BODY.torso + BODY.neck + BODY.headR * 0.9, 0);
    this.headPivot.add(this.head, this.face);
    this.buildFace();

    const mk = (z: number, l1: number, l2: number, endShape: 'hand' | 'foot'): Limb => {
      const pivot = new THREE.Group();
      pivot.position.z = z;
      const upper = new OutlinedMesh(new THREE.BufferGeometry(), mat, 0.026);
      const elbow = new THREE.Group();
      elbow.position.y = -l1;
      const lower = new OutlinedMesh(new THREE.BufferGeometry(), mat, 0.026);
      const endMat = endShape === 'foot' ? toon(SHOE) : mat;
      const end = new OutlinedMesh(
        endShape === 'hand' ? new THREE.SphereGeometry(0.056, 14, 10) : new THREE.CapsuleGeometry(0.062, BODY.footLen - 0.05, 6, 12),
        endMat,
        0.02,
      );
      if (endShape === 'foot') {
        end.rotation.z = -Math.PI / 2; // lies along +x
        end.position.set(0.06, -l2 - 0.02, 0);
      } else {
        end.position.set(0, -l2, 0);
      }
      const jointTop = new OutlinedMesh(new THREE.BufferGeometry(), mat, 0.026);
      const jointMid = new OutlinedMesh(new THREE.BufferGeometry(), mat, 0.026);
      pivot.add(upper, elbow, jointTop);
      elbow.add(lower, end, jointMid);
      this.root.add(pivot);
      return { pivot, upper, elbow, lower, end, jointTop, jointMid, l1, l2, mid: [0, 0] };
    };
    this.arms = { near: mk(0.22, BODY.upperArm, BODY.foreArm, 'hand'), far: mk(-0.22, BODY.upperArm, BODY.foreArm, 'hand') };
    this.legs = { near: mk(0.1, BODY.thigh, BODY.shin, 'foot'), far: mk(-0.1, BODY.thigh, BODY.shin, 'foot') };
    this.setMuscle(0);
    this.applyPose(this.pose);
  }

  private buildFace(): void {
    const eyeGeo = new THREE.SphereGeometry(0.03, 10, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x14161b });
    for (const z of [0.05, -0.05]) {
      const e = new THREE.Mesh(eyeGeo, eyeMat);
      e.position.set(0.125, 0.025, z * 1.3);
      e.scale.set(0.7, 1.3, 1);
      this.face.add(e);
    }
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.05), eyeMat);
    brow.position.set(0.133, 0.075, 0.065);
    this.face.add(brow);
    const brow2 = brow.clone();
    brow2.position.z = -0.065;
    this.face.add(brow2);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.045), eyeMat);
    mouth.position.set(0.14, -0.06, 0);
    this.face.add(mouth);
  }

  /** Scale body thickness by muscle amount 0–1. Same figure, more mass. */
  setMuscle(m: number): void {
    if (Math.abs(m - this.muscle) < 0.004) return;
    this.muscle = m;
    const seg = (r: number, len: number) => new THREE.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 6, 14);
    const tR = 0.1 + 0.05 * m;
    this.torsoMesh.setGeometry(seg(tR, BODY.torso + 0.04));
    this.torsoMesh.position.y = BODY.torso / 2;
    // Shoulder girdle: broader with training.
    this.shoulderMesh.setGeometry(new THREE.SphereGeometry(0.09 + 0.045 * m, 16, 12));
    this.shoulderMesh.position.y = BODY.torso - 0.02;
    this.shoulderMesh.scale.set(0.9, 0.8, 1.0 + 0.85 * m + 0.35);
    this.neckMesh.setGeometry(seg(0.035 + 0.012 * m, BODY.neck + 0.12));
    this.neckMesh.position.y = BODY.torso + BODY.neck / 2 + 0.02;
    this.pelvisMesh.scale.setScalar(1 + 0.25 * m);
    const limb = (l: Limb, r1: number, r2: number) => {
      l.upper.setGeometry(seg(r1, l.l1 + 0.02));
      l.upper.position.y = -l.l1 / 2;
      l.lower.setGeometry(seg(r2, l.l2 + 0.02));
      l.lower.position.y = -l.l2 / 2;
      l.jointTop.setGeometry(new THREE.SphereGeometry(r1 * 1.02, 16, 12));
      l.jointMid.setGeometry(new THREE.SphereGeometry(Math.max(r1, r2) * 0.98, 16, 12));
    };
    for (const a of [this.arms.near, this.arms.far]) limb(a, 0.05 + 0.03 * m, 0.042 + 0.022 * m);
    for (const l of [this.legs.near, this.legs.far]) limb(l, 0.07 + 0.04 * m, 0.055 + 0.025 * m);
  }

  get currentPose(): Pose {
    return this.pose;
  }

  /** World-space (rig-local) shoulder point for the current pose. */
  shoulder(): V2 {
    return shoulderOf(this.pose);
  }

  /** Radius of the torso at the current muscle level (for resting it on surfaces). */
  get torsoRadius(): number {
    return 0.1 + 0.05 * Math.max(0, this.muscle);
  }

  /** Where the hands were asked to be, and the worst miss between target and what IK reached. */
  hands(): { near: V2; far: V2; reachError: number } {
    const sh = this.shoulder();
    const p = this.pose;
    return { near: [sh[0] + p.handNear[0], sh[1] + p.handNear[1]], far: [sh[0] + p.handFar[0], sh[1] + p.handFar[1]], reachError: this.reachError };
  }
  private reachError = 0;

  /** Key joint positions in rig (station-local) coordinates, for tests and occlusion checks. */
  joints(): { pelvis: V2; shoulder: V2; head: V2; elbowNear: V2; elbowFar: V2; kneeNear: V2; footNear: V2; handNear: V2; handFar: V2 } {
    const p = this.pose;
    const len = BODY.torso + BODY.neck + BODY.headR * 0.9;
    const c = Math.cos(p.torso);
    const sn = Math.sin(p.torso);
    const head: V2 = [p.pelvis[0] + p.headLift * c - len * sn, p.pelvis[1] + p.headLift * sn + len * c];
    const h = this.hands();
    return { pelvis: p.pelvis, shoulder: this.shoulder(), head, elbowNear: this.arms.near.mid, elbowFar: this.arms.far.mid, kneeNear: this.legs.near.mid, footNear: p.footNear, handNear: h.near, handFar: h.far };
  }

  applyPose(p: Pose): void {
    this.pose = p;
    this.pelvisMesh.position.set(p.pelvis[0], p.pelvis[1], 0);
    this.spine.position.set(p.pelvis[0], p.pelvis[1], 0);
    this.spine.rotation.z = p.torso;
    this.headPivot.rotation.z = p.head;
    this.headPivot.position.x = p.headLift;
    this.headPivot.rotation.y = p.headYaw ?? 0;
    const sh = this.shoulder();
    this.reachError = 0;
    const solveInto = (l: Limb, origin: V2, target: V2, bend: 1 | -1) => {
      const r = solveTwoBone(origin, target, l.l1, l.l2, bend);
      this.reachError = Math.max(this.reachError, Math.hypot(r.reach[0] - target[0], r.reach[1] - target[1]));
      l.pivot.position.x = origin[0];
      l.pivot.position.y = origin[1];
      l.pivot.rotation.z = r.a1;
      l.elbow.rotation.z = r.a2;
      l.mid = [origin[0] + Math.sin(r.a1) * l.l1, origin[1] - Math.cos(r.a1) * l.l1];
    };
    solveInto(this.arms.near, sh, [sh[0] + p.handNear[0], sh[1] + p.handNear[1]], p.elbowBend);
    solveInto(this.arms.far, sh, [sh[0] + p.handFar[0], sh[1] + p.handFar[1]], p.elbowBend);
    solveInto(this.legs.near, p.pelvis, p.footNear, p.kneeBend);
    solveInto(this.legs.far, p.pelvis, p.footFar, p.kneeBend);
    // Feet stay flat: orient the shoe in world space regardless of shin angle.
    for (const l of [this.legs.near, this.legs.far]) {
      const theta = l.pivot.rotation.z + l.elbow.rotation.z; // shin orientation in rig space
      l.end.rotation.z = -Math.PI / 2 - theta;
      // Keep the shoe centre at a fixed WORLD offset from the ankle (forward 6 cm, down 2 cm), not rotating with the shin.
      const wx = 0.06;
      const wy = -0.02;
      l.end.position.set(wx * Math.cos(theta) + wy * Math.sin(theta), -l.l2 - wx * Math.sin(theta) + wy * Math.cos(theta), 0);
    }
  }
}

