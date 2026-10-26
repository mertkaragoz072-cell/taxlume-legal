# Life Simulator

A mobile-first life simulator: a white stickman, a fixed side-view 2.5D camera, and a deterministic
simulation of needs, money, training and (in later milestones) work, food, leisure and customization.

> Status: gym + five home rooms are playable. See `IMPLEMENTATION_STATUS.md` for the per-location status (NOT STARTED / IN PROGRESS / VERIFIED)
> and `VISUAL_STYLE_GUIDE.md` for the visual spec derived from `../references/life-simulator-reference.jpg`.

## Run it

```bash
cd life-sim
npm install
npm run dev        # http://localhost:5173 (also on your LAN for phone testing)
```

```bash
npm test           # Vitest: simulation, economy, workout, persistence, animation
npm run typecheck  # strict TypeScript
npm run build      # typecheck + production bundle in dist/
npm run preview    # serve the production build
```

Open the dev URL in a portrait phone-sized window (or browser device emulation) for the intended layout.

## How to play

**Home** (you start here): pick a room chip, tap furniture (or its chip), then choose an action: sleep, cook, eat, drink, shower, watch TV, study.
The **Map** tab walks you to the gym (12 min). Everything costs game time and affects your needs.

### Gym

1. **Gym tab → buy a Day pass ($8) or Monthly ($45)** — every purchase goes through the economy service and appears in **Bank**.
2. **Start workout** → pick weight and reps → **Start set**. The stickman lies back, unracks, and performs real reps.
3. A rep counts only if the full movement (chest touch → lockout) is completed and if your *current* capacity allows it (strength, energy, recovery debt, hunger, thirst, sleepiness).
   Too heavy → the rep fails and the set ends. Pick a weight shown as "Good working weight".
4. **Rest** between sets (game time passes, energy returns). **End workout** at any time — completed reps and partial sets are banked.
5. Progress autosaves (IndexedDB) after every set/purchase and when the app is backgrounded. Reload to verify.

## Layout

```
src/
  app/          bootstrap + Game controller (wires sim ↔ renderer ↔ animation)
  core/         math helpers, event bus, shared types
  simulation/   GameState, clock/time, needs rules, tunable SimConfig
  economy/      central transaction service (earn/spend)
  fitness/      workout rules, progression, gym membership
  persistence/  versioned save, migrations, sanitizer, IndexedDB + memory storage
  character/    stickman rig, IK, muscle scaling
  animation/    bench-press animation
  world/        Three.js renderer, materials/outlines, props, gym scene
  data/         exercises, locations
  ui/           mobile HTML/CSS UI
  tests/        Vitest suites
```

Platform packaging: `capacitor.config.json` is in place; Capacitor dependencies and native projects are added in Milestone 7.
