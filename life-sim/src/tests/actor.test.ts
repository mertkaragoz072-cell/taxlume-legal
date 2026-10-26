import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Actor, type ActSpot } from '../character/actor';
import type { ActionKind } from '../character/poses';
import { StickmanRig } from '../character/rig';
import { ROOMS } from '../data/homeObjects';

async function run(a: Actor, seconds: number, onFrame?: (t: number) => void): Promise<void> {
  for (let t = 0; t < seconds; t += 1 / 30) {
    a.update(1 / 30);
    onFrame?.(t);
    await Promise.resolve();
  }
  await new Promise((r) => setTimeout(r, 0));
}

const setup = (muscle = 0) => {
  const rig = new StickmanRig();
  rig.setMuscle(muscle);
  const actor = new Actor(rig);
  const scene = new THREE.Group();
  scene.add(actor.group);
  return { rig, actor, scene };
};

const lowest = (rig: StickmanRig, scene: THREE.Group): number => {
  scene.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(rig.root).min.y;
};

const CASES: Array<{ kind: ActionKind; spot: ActSpot; restsOn: number }> = [
  { kind: 'sleep', spot: { x: -1.58, facing: 1, surfaceY: 0.5 }, restsOn: 0.5 },
  { kind: 'nap', spot: { x: -0.4, facing: 1, surfaceY: 0.42 }, restsOn: 0 },
  { kind: 'tv', spot: { x: -0.4, facing: 1, surfaceY: 0.42 }, restsOn: 0 },
  { kind: 'eat', spot: { x: 1.65, facing: 1, surfaceY: 0.46 }, restsOn: 0 },
  { kind: 'type', spot: { x: -0.3, facing: 1, surfaceY: 0.46 }, restsOn: 0 },
  { kind: 'cook', spot: { x: -0.5, facing: -1, surfaceY: 0 }, restsOn: 0 },
  { kind: 'shower', spot: { x: -1.6, facing: 1, surfaceY: 0 }, restsOn: 0 },
  { kind: 'drink', spot: { x: 0.6, facing: -1, surfaceY: 0 }, restsOn: 0 },
];

describe('actor: walking', () => {
  it('walks at a fixed speed, faces the direction of travel and stops exactly at the target', async () => {
    const { actor } = setup();
    actor.place(0, 1);
    let done = false;
    void actor.walkTo(-1.5).then(() => (done = true));
    let facingSeen: number | null = null;
    await run(actor, 0.5, () => (facingSeen = actor.facing));
    expect(facingSeen).toBe(-1);
    expect(actor.x).toBeLessThan(0);
    await run(actor, 2);
    expect(done).toBe(true);
    expect(actor.x).toBeCloseTo(-1.5, 6);
  });

  it('keeps feet on the floor while walking and never moves faster than walking speed', async () => {
    const { rig, actor, scene } = setup();
    actor.place(-1, 1);
    void actor.walkTo(1.5);
    let minY = Infinity;
    let prevX = actor.x;
    let maxStep = 0;
    await run(actor, 2, () => {
      minY = Math.min(minY, lowest(rig, scene));
      maxStep = Math.max(maxStep, Math.abs(actor.x - prevX));
      prevX = actor.x;
    });
    expect(minY).toBeGreaterThanOrEqual(-0.004);
    expect(maxStep).toBeLessThan(1.5 / 30 + 1e-9);
  });
});

describe('actor: every home action pose', () => {
  for (const c of CASES) {
    for (const muscle of [0, 1]) {
      it(`${c.kind} (muscle ${muscle}): limbs reach, body rests on its surface, no sudden jumps, returns to standing`, async () => {
        const { rig, actor, scene } = setup(muscle);
        actor.place(c.spot.x + 1.4, 1);
        let finished = false;
        void actor.perform(c.kind, c.spot, 2.5).then(() => (finished = true));
        let worstReach = 0;
        let worstStep = 0;
        let prev = rig.currentPose.pelvis;
        let minY = Infinity;
        await run(actor, 9, () => {
          worstReach = Math.max(worstReach, rig.hands().reachError);
          const p = rig.currentPose.pelvis;
          worstStep = Math.max(worstStep, Math.hypot(p[0] - prev[0], p[1] - prev[1]));
          prev = p;
          if (actor.activeKind === c.kind) minY = Math.min(minY, lowest(rig, scene));
        });
        expect(finished).toBe(true);
        expect(actor.activeKind).toBe('idle');
        expect(worstReach).toBeLessThan(1e-6); // hands (and legs) always reach their targets
        expect(worstStep).toBeLessThan(0.05); // no pops between frames
        expect(minY).toBeGreaterThanOrEqual(-0.004); // nothing below the floor
        if (c.kind === 'sleep') expect(minY).toBeGreaterThanOrEqual(c.restsOn - 0.03); // body lies ON the mattress
        expect(rig.currentPose.torso).toBeLessThan(0.15); // finished upright
        expect(actor.x).toBeCloseTo(c.spot.x, 6);
      });
    }
  }

  it('sleeping lies with the torso exactly horizontal for the whole hold, head left of the feet', async () => {
    const { rig, actor } = setup();
    const c = CASES[0]!;
    actor.place(c.spot.x, 1);
    void actor.perform('sleep', c.spot, 2);
    const torso: number[] = [];
    let ok = true;
    await run(actor, 5, () => {
      if (actor.activeKind === 'sleep') {
        torso.push(rig.currentPose.torso);
        const j = rig.joints();
        if (!(j.head[0] < j.pelvis[0] && j.pelvis[0] < j.footNear[0])) ok = false;
      }
    });
    expect(torso.length).toBeGreaterThan(10);
    for (const t of torso) expect(t).toBeCloseTo(Math.PI / 2, 9);
    expect(ok).toBe(true);
  });

  it('a mirrored (facing −1) action is the exact mirror image of the +1 one', async () => {
    const mk = async (facing: 1 | -1) => {
      const { rig, actor, scene } = setup();
      actor.place(0, facing);
      void actor.perform('cook', { x: 0, facing, surfaceY: 0 }, 2);
      await run(actor, 1.5);
      scene.updateMatrixWorld(true);
      const j = rig.joints();
      return actor.group.localToWorld(new THREE.Vector3(j.handNear[0], j.handNear[1], 0)).x;
    };
    const right = await mk(1);
    const left = await mk(-1);
    expect(left).toBeCloseTo(-right, 6);
  });

  it('flush() resolves pending jobs and leaves the actor standing at a valid spot', async () => {
    const { actor } = setup();
    let resolved = 0;
    void actor.perform('sleep', CASES[0]!.spot, 5).then(() => resolved++);
    void actor.walkTo(2).then(() => resolved++);
    await run(actor, 0.3);
    actor.flush();
    await new Promise((r) => setTimeout(r, 0));
    expect(resolved).toBe(2);
    expect(actor.busy).toBe(false);
  });
});

describe('home layout data', () => {
  it('every interactable stands inside the room, and has a tap area', () => {
    for (const room of Object.values(ROOMS)) {
      for (const o of room.objects) {
        expect(o.x).toBeGreaterThanOrEqual(room.minX);
        expect(o.x).toBeLessThanOrEqual(room.maxX);
        expect(o.width).toBeGreaterThan(0);
        expect(o.height).toBeGreaterThan(0);
      }
      expect(room.doorX).toBeGreaterThanOrEqual(room.minX);
      expect(room.doorX).toBeLessThanOrEqual(room.maxX);
    }
  });
});
