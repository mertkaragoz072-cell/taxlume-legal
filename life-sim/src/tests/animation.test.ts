import { describe, expect, it } from 'vitest';
import { BenchPressAnimator } from '../animation/benchPress';
import { solveTwoBone, StickmanRig } from '../character/rig';
import { Barbell, platesFor } from '../world/props';

async function run(a: BenchPressAnimator, seconds: number, onFrame?: (t: number) => void): Promise<void> {
  for (let t = 0; t < seconds; t += 1 / 30) {
    a.update(1 / 30);
    onFrame?.(t);
    await Promise.resolve(); // let promise continuations (segment hand-offs) run between frames
  }
  await new Promise((r) => setTimeout(r, 0));
}

describe('two-bone IK', () => {
  it('reaches reachable targets exactly', () => {
    const r = solveTwoBone([0, 1], [0.3, 0.6], 0.3, 0.28, -1);
    expect(r.reach).toEqual([0.3, 0.6]);
  });
  it('clamps unreachable targets instead of producing NaN', () => {
    const r = solveTwoBone([0, 1], [5, 5], 0.3, 0.28, 1);
    expect(Number.isFinite(r.a1)).toBe(true);
    expect(Number.isFinite(r.a2)).toBe(true);
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
  const setup = () => {
    const rig = new StickmanRig();
    const bar = new Barbell();
    return { rig, bar, a: new BenchPressAnimator(rig, bar) };
  };

  it('keeps both hands on the bar through a whole rep', async () => {
    const { rig, bar, a } = setup();
    let prepared = false;
    void a.prepareSet().then(() => (prepared = true));
    await run(a, 3);
    expect(prepared).toBe(true);
    let done = false;
    void a.playRep('success').then(() => (done = true));
    let maxErr = 0;
    await run(a, 4, () => {
      const p = rig.currentPose;
      maxErr = Math.max(maxErr, Math.hypot(p.handNear[0] - bar.position.x, p.handNear[1] - bar.position.y), Math.hypot(p.handFar[0] - bar.position.x, p.handFar[1] - bar.position.y));
    });
    expect(done).toBe(true);
    expect(maxErr).toBeLessThan(1e-9);
  });

  it('moves the bar down to the chest and back up', async () => {
    const { bar, a } = setup();
    void a.prepareSet();
    await run(a, 3);
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
    await run(a, 3);
    expect(a.isLying).toBe(true);
    let finished = false;
    void a.finishSet().then(() => (finished = true));
    await run(a, 3);
    expect(finished).toBe(true);
    expect(a.isLying).toBe(false);
  });

  it('a failed rep never reaches lockout', async () => {
    const { bar, a } = setup();
    void a.prepareSet();
    await run(a, 3);
    const top = bar.position.y;
    void a.playRep('failed');
    let max = 0;
    await run(a, 4, (t) => {
      if (t > 1.7) max = Math.max(max, bar.position.y - 0.7); // after the descent
    });
    expect(max).toBeLessThan((top - 0.7) * 0.5);
  });
});
