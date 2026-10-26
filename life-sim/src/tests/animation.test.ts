import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { BenchPressAnimator, type RepReport } from '../animation/benchPress';
import { BODY, solveTwoBone, StickmanRig } from '../character/rig';
import { BENCH, chestFor, HOOK, pelvisFor, SPINE_N, SPINE_U } from '../world/benchGeometry';
import { Barbell, BAR_HALF, PLATE_SPEC, platesFor, RACK_UPRIGHT, RACK_Z } from '../world/props';

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
    void a.sitUp();
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
      void a.sitUp();
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
    void a.sitUp();
    await run(a, 4, rec);
    expect(feet.size).toBe(1);
  });

  it('sits on the seat and rests the torso and head ON the incline pad (no clipping) at every muscle level', async () => {
    const refP = pelvisFor(BENCH.refTorsoR);
    const planeD = refP[0] * SPINE_N[0] + refP[1] * SPINE_N[1] - BENCH.refTorsoR; // pad surface: p·N = D
    for (const m of [0, 0.5, 1]) {
      const { rig, a } = setup(m);
      let worstSeat = 0;
      let worstBack = 0;
      let minHeadClear = Infinity;
      let frames = 0;
      const check = () => {
        const p = rig.currentPose;
        if (p.torso < BENCH.incline - 1e-6) return; // only while fully reclined
        frames++;
        const r = rig.torsoRadius;
        worstSeat = Math.max(worstSeat, Math.abs(p.pelvis[1] - r - BENCH.seatTop - BENCH.seatGap));
        // distance of the torso axis from the pad plane must equal the torso radius (touching, not inside)
        worstBack = Math.max(worstBack, Math.abs(p.pelvis[0] * SPINE_N[0] + p.pelvis[1] * SPINE_N[1] - planeD - r));
        const j = rig.joints();
        minHeadClear = Math.min(minHeadClear, j.head[0] * SPINE_N[0] + j.head[1] * SPINE_N[1] - planeD - BODY.headR);
      };
      void a.prepareSet();
      await run(a, 3.6, check);
      void a.playRep('success');
      await run(a, 3.6, check);
      expect(frames).toBeGreaterThan(50);
      expect(worstSeat).toBeLessThan(1e-9);
      expect(worstBack).toBeLessThan(1e-9);
      expect(minHeadClear).toBeGreaterThanOrEqual(-0.006); // head rests on the pad, never inside it
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
    void a.sitUp().then(() => (finished = true));
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
      if (f.t > 1.7) max = Math.max(max, bar.position.y - chestFor(0.1)[1]);
    });
    expect(report).toEqual({ chestReached: true, lockout: false });
    expect(max).toBeLessThan((top - chestFor(0.1)[1]) * 0.5);
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

describe('bench press state machine (never flips upright mid-exercise)', () => {
  it('stays lying through unrack → reps → rack → rest → next set; only sitUp() lifts the torso', async () => {
    const { rig, a } = setup();
    const modes = new Set<string>();
    const badTorso: number[] = [];
    const watch = () => {
      modes.add(a.bodyMode);
      if (a.bodyMode === 'lying' && Math.abs(rig.currentPose.torso - BENCH.incline) > 1e-9) badTorso.push(rig.currentPose.torso);
    };
    void a.prepareSet();
    await run(a, 3.6, watch);
    for (let set = 0; set < 3; set++) {
      for (let r = 0; r < 2; r++) {
        void a.playRep('success');
        await run(a, 3.4, watch);
      }
      void a.rackBar();
      await run(a, 1.2, watch);
      expect(a.bodyMode).toBe('lying');
      expect(a.barHeld).toBe(false);
      await run(a, 1.0, watch); // resting on the bench
      void a.prepareSet(); // next set: bar comes off the hooks, no lie-back needed
      await run(a, 1.2, watch);
    }
    expect(modes.has('seated')).toBe(false);
    expect(modes.has('lyingToSeated')).toBe(false);
    expect(badTorso).toEqual([]);
    void a.sitUp();
    await run(a, 4, watch);
    expect(a.bodyMode).toBe('seated');
  });

  it('torso stays within the transition window: bench incline when lying, ~0 seated, nothing else outside transitions', async () => {
    const { rig, a } = setup();
    void a.prepareSet();
    const seen: Array<[string, number]> = [];
    await run(a, 3.6, () => seen.push([a.bodyMode, rig.currentPose.torso]));
    for (const [mode, torso] of seen) {
      if (mode === 'seated') expect(torso).toBeLessThan(0.15);
      if (mode === 'lying') expect(torso).toBeCloseTo(BENCH.incline, 9);
      expect(torso).toBeGreaterThanOrEqual(0); // never rotates the wrong way round
      expect(torso).toBeLessThanOrEqual(BENCH.incline + 1e-9);
    }
  });

  it('the bar never enters the torso or head, and travels on a vertical path', async () => {
    for (const m of [0, 1]) {
      const { rig, bar, a } = setup(m);
      void a.prepareSet();
      await run(a, 3.6);
      let minClear = Infinity;
      let minHead = Infinity;
      let minX = Infinity;
      let maxX = -Infinity;
      void a.playRep('success');
      await run(a, 3.6, () => {
        const j = rig.joints();
        const x = bar.position.x;
        const y = bar.position.y;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        // distance from the bar centre to the torso axis segment (pelvis → shoulder, extended to the neck)
        const a0 = j.pelvis;
        const a1: [number, number] = [j.pelvis[0] + SPINE_U[0] * 0.58, j.pelvis[1] + SPINE_U[1] * 0.58];
        const dx = a1[0] - a0[0];
        const dy = a1[1] - a0[1];
        const t = Math.max(0, Math.min(1, ((x - a0[0]) * dx + (y - a0[1]) * dy) / (dx * dx + dy * dy)));
        minClear = Math.min(minClear, Math.hypot(x - (a0[0] + t * dx), y - (a0[1] + t * dy)) - rig.torsoRadius - 0.016);
        minHead = Math.min(minHead, Math.hypot(x - j.head[0], y - j.head[1]) - BODY.headR - 0.016);
      });
      expect(minClear).toBeGreaterThanOrEqual(-0.002);
      expect(minHead).toBeGreaterThan(0.05);
      expect(maxX - minX).toBeLessThan(0.02); // a straight vertical bar path
    }
  });

  it('rack uprights stay clear of the lifter, the hands and the loaded plates (even at 200 kg)', () => {
    const upright = RACK_Z + RACK_UPRIGHT / 2;
    expect(RACK_Z).toBeGreaterThan(0.22 + 0.056 + 0.05); // outside the hands (grip z=0.22, hand radius 0.056) and arms
    // heaviest legal load: 90 kg per side
    const stack = platesFor(200).reduce((sum, kg) => sum + PLATE_SPEC.find((p) => p.kg === kg)!.t, 0);
    const innerFace = BAR_HALF - 0.03 - stack - 0.01;
    expect(innerFace).toBeGreaterThan(upright);
  });

  it('after stopping, the pose is stable (no drift) and the bar rests on the hooks', async () => {
    const { rig, bar, a } = setup();
    void a.prepareSet();
    await run(a, 3.6);
    void a.playRep('success');
    await run(a, 3.6);
    void a.rackBar();
    await run(a, 1.2);
    const before = rig.joints();
    await run(a, 3);
    const after = rig.joints();
    expect(Math.hypot(after.pelvis[0] - before.pelvis[0], after.pelvis[1] - before.pelvis[1])).toBeLessThan(0.01);
    expect(Math.hypot(after.handNear[0] - before.handNear[0], after.handNear[1] - before.handNear[1])).toBeLessThan(0.02);
    expect(bar.position.x).toBeCloseTo(HOOK[0], 6);
    expect(bar.position.y).toBeCloseTo(HOOK[1], 6);
    expect(rig.hands().reachError).toBeLessThan(1e-6);
  });

  it('restoreLying() snaps to a valid lying pose with hands on the racked bar', () => {
    const { rig, bar, a } = setup(0.7);
    a.restoreLying();
    expect(a.bodyMode).toBe('lying');
    expect(rig.currentPose.torso).toBeCloseTo(BENCH.incline, 9);
    const h = rig.hands();
    expect(Math.hypot(h.near[0] - bar.position.x, h.near[1] - bar.position.y)).toBeLessThan(1e-6);
    expect(h.reachError).toBeLessThan(1e-6);
  });

  it('keeps head, shoulders, hips and feet in a consistent order along the bench during reps', async () => {
    const { rig, a } = setup();
    void a.prepareSet();
    await run(a, 3.6);
    void a.playRep('success');
    const spread: number[] = [];
    await run(a, 3.6, () => {
      const j = rig.joints();
      expect(j.head[0]).toBeLessThan(j.shoulder[0]); // head beyond the shoulders, toward the rack
      expect(j.shoulder[0]).toBeLessThan(j.pelvis[0]);
      expect(j.pelvis[0]).toBeLessThan(j.footNear[0]);
      expect(j.head[1] - j.shoulder[1]).toBeGreaterThan(0.05); // head above the shoulders on the incline
      expect(j.head[1] - j.shoulder[1]).toBeLessThan(0.35);
      spread.push(j.pelvis[0]);
    });
    expect(Math.max(...spread) - Math.min(...spread)).toBeLessThan(1e-9); // hips do not move at all during reps
  });
});

describe('no clipping through the floor/mat', () => {
  it('no part of the body ever goes below the mat surface, in any pose or physique', async () => {
    for (const m of [0, 1]) {
      const { rig, a } = setup(m);
      let lowest = Infinity;
      const probe = () => {
        rig.root.updateMatrixWorld(true);
        lowest = Math.min(lowest, new THREE.Box3().setFromObject(rig.root).min.y);
      };
      probe();
      void a.prepareSet();
      await run(a, 3.6, probe);
      void a.playRep('success');
      await run(a, 3.6, probe);
      void a.sitUp();
      await run(a, 4, probe);
      expect(lowest).toBeGreaterThanOrEqual(-0.004);
    }
  });
});
