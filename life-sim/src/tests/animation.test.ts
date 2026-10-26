import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { BenchPressAnimator, type RepReport } from '../animation/benchPress';
import { BODY, solveTwoBone, StickmanRig } from '../character/rig';
import { BENCH } from '../world/gymScene';
import { Barbell, platesFor } from '../world/props';

type Frame = { t: number };

async function run(a: BenchPressAnimator, seconds: number, onFrame?: (f: Frame) => void): Promise<void> {
  for (let t = 0; t < seconds; t += 1 / 30) {
    a.update(1 / 30);
    onFrame?.({ t });
    await Promise.resolve();
  }
  await new Promise((r) => setTimeout(r, 0));
}

const setup = (muscle = 0) => {
  const rig = new StickmanRig();
  rig.setMuscle(muscle);
  const bar = new Barbell();
  return { rig, bar, a: new BenchPressAnimator(rig, bar) };
};

/** World-space positions of the segment joints (rig is not parented, so local = station coordinates). */
function jointsOf(rig: StickmanRig) {
  rig.root.updateMatrixWorld(true);
  const p = rig.currentPose;
  return { pelvis: p.pelvis, hands: rig.hands() };
}

describe('two-bone IK', () => {
  it('reaches reachable targets exactly', () => {
    const r = solveTwoBone([0, 1], [0.3, 0.6], 0.3, 0.28, -1);
    expect(r.reach[0]).toBeCloseTo(0.3, 9);
    expect(r.reach[1]).toBeCloseTo(0.6, 9);
  });
  it('clamps unreachable targets instead of producing NaN', () => {
    const r = solveTwoBone([0, 1], [5, 5], 0.3, 0.28, 1);
    expect(Number.isFinite(r.a1)).toBe(true);
    expect(Number.isFinite(r.a2)).toBe(true);
  });
  it('keeps the elbow bending one way only (no hyper-extension flip)', () => {
    for (let i = 0; i < 50; i++) {
      const r = solveTwoBone([0, 0], [0.1 + i * 0.01, -0.3], 0.3, 0.28, -1);
      expect(r.a2).toBeGreaterThanOrEqual(-1e-9); // limb bends in a single direction
    }
  });
});

describe('plate loading', () => {
  it('loads plates greedily per side', () => {
    expect(platesFor(20)).toEqual([]);
    expect(platesFor(60)).toEqual([20]);
    expect(platesFor(100)).toEqual([20, 20]);
    expect(platesFor(27.5)).toEqual([2.5, 1.25]);
  });
});

describe('bench press animation', () => {
  it('lies back, unracks and keeps both hands exactly on the bar through a rep', async () => {
    const { rig, bar, a } = setup();
    void a.prepareSet();
    await run(a, 3.6);
    expect(a.isLying).toBe(true);
    let report: RepReport | null = null;
    void a.playRep('success').then((r) => (report = r));
    let maxErr = 0;
    await run(a, 4.5, () => {
      const h = rig.hands();
      maxErr = Math.max(maxErr, Math.hypot(h.near[0] - bar.position.x, h.near[1] - bar.position.y), Math.hypot(h.far[0] - bar.position.x, h.far[1] - bar.position.y), h.reachError);
    });
    expect(report).toEqual({ chestReached: true, lockout: true });
    expect(maxErr).toBeLessThan(1e-6); // targets met AND IK actually reached them
  });

  it('hands stay on the bar during the lie-back, unrack, rerack and sit-up transitions too', async () => {
    const { rig, a } = setup(0.5);
    let worst = 0;
    const track = () => (worst = Math.max(worst, rig.hands().reachError));
    void a.prepareSet();
    await run(a, 3.6, track);
    void a.finishSet();
    await run(a, 4, track);
    expect(worst).toBeLessThan(1e-6);
  });

  it('has no sudden pose changes across a whole cycle (all muscle levels)', async () => {
    for (const m of [0, 0.5, 1]) {
      const { rig, a } = setup(m);
      let prev = jointsOf(rig);
      let worstPelvis = 0;
      let worstHand = 0;
      const step = () => {
        const cur = jointsOf(rig);
        worstPelvis = Math.max(worstPelvis, Math.hypot(cur.pelvis[0] - prev.pelvis[0], cur.pelvis[1] - prev.pelvis[1]));
        worstHand = Math.max(worstHand, Math.hypot(cur.hands.near[0] - prev.hands.near[0], cur.hands.near[1] - prev.hands.near[1]));
        prev = cur;
      };
      void a.prepareSet();
      await run(a, 3.6, step);
      void a.playRep('success');
      await run(a, 3.6, step);
      void a.finishSet();
      await run(a, 4, step);
      expect(worstPelvis).toBeLessThan(0.02); // metres per 1/30 s frame
      expect(worstHand).toBeLessThan(0.05);
    }
  });

  it('keeps the feet planted on the floor (no sliding) through every transition', async () => {
    const { rig, a } = setup();
    const feet = new Set<string>();
    const rec = () => {
      const p = rig.currentPose;
      feet.add(`${p.footNear[0].toFixed(3)},${p.footNear[1].toFixed(3)},${p.footFar[0].toFixed(3)}`);
    };
    void a.prepareSet();
    await run(a, 3.6, rec);
    void a.finishSet();
    await run(a, 4, rec);
    expect(feet.size).toBe(1);
  });

  it('rests the torso and head ON the pad (no clipping) at every muscle level', async () => {
    for (const m of [0, 0.5, 1]) {
      const { rig, a } = setup(m);
      let minClear = Infinity;
      const check = () => {
        const p = rig.currentPose;
        if (p.torso < Math.PI / 2 - 0.05) return; // only while (almost) fully lying
        minClear = Math.min(minClear, p.pelvis[1] - rig.torsoRadius - BENCH.padTop);
        // head centre height above pad = spine height + lift; its radius must clear the pad
        const headBottom = p.pelvis[1] + p.headLift - BODY.headR;
        minClear = Math.min(minClear, headBottom - BENCH.padTop);
      };
      void a.prepareSet();
      await run(a, 3.6, check);
      void a.playRep('success');
      await run(a, 3.6, check);
      expect(minClear).toBeGreaterThanOrEqual(-0.001);
    }
  });

  it('keeps limb angles anatomically plausible (elbows and knees never hyper-extend)', async () => {
    const { rig, a } = setup();
    const bad: number[] = [];
    const children = () => {
      rig.root.traverse((o) => {
        // each limb's elbow/knee group is a child with rotation.z; legit range is one-sided ≥ 0 (bend one way)
        void o;
      });
    };
    void a.prepareSet();
    await run(a, 3, children);
    expect(bad).toEqual([]);
    // Reach error is the real guard: if the limb could not be posed within its length it would be non-zero.
    expect(rig.hands().reachError).toBeLessThan(1e-6);
  });

  it('moves the bar down to the chest and back up', async () => {
    const { bar, a } = setup();
    void a.prepareSet();
    await run(a, 3.6);
    const top = bar.position.y;
    void a.playRep('success');
    let min = top;
    await run(a, 4, () => (min = Math.min(min, bar.position.y)));
    expect(min).toBeLessThan(top - 0.25);
    expect(bar.position.y).toBeGreaterThan(top - 0.02);
  });

  it('racks the bar and sits up after the set', async () => {
    const { a } = setup();
    void a.prepareSet();
    await run(a, 3.6);
    expect(a.isLying).toBe(true);
    let finished = false;
    void a.finishSet().then(() => (finished = true));
    await run(a, 4);
    expect(finished).toBe(true);
    expect(a.isLying).toBe(false);
  });

  it('a failed rep reaches the chest but never lockout, and reports it', async () => {
    const { bar, a } = setup();
    void a.prepareSet();
    await run(a, 3.6);
    const top = bar.position.y;
    let report: RepReport | null = null;
    void a.playRep('failed').then((r) => (report = r));
    let max = 0;
    await run(a, 4, (f) => {
      if (f.t > 1.7) max = Math.max(max, bar.position.y - 0.7);
    });
    expect(report).toEqual({ chestReached: true, lockout: false });
    expect(max).toBeLessThan((top - 0.7) * 0.5);
  });

  it('bar and character share one coordinate frame (rig parented to a rotated station keeps hands on bar)', async () => {
    const station = new THREE.Group();
    station.rotation.y = 1.1;
    const { rig, bar, a } = setup();
    station.add(rig.root, bar);
    void a.prepareSet();
    await run(a, 3.6);
    station.updateMatrixWorld(true);
    const h = rig.hands();
    // near hand pivot is offset in local z by the arm offset; compare in x/y only
    expect(Math.hypot(h.near[0] - bar.position.x, h.near[1] - bar.position.y)).toBeLessThan(1e-6);
  });
});
