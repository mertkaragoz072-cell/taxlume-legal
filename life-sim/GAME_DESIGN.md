# Game Design

## Pillars
- A whole virtual life: needs, money, work, food, fitness, leisure, appearance.
- Every action has a real, rule-based effect. No decorative meters, no fake currency.
- Deterministic simulation: the clock only moves when the simulation moves it (never from wall-clock timers),
  so identical state + identical actions give identical results, and app pause/resume cannot corrupt time.

## Visual direction (updated after the reference boards were supplied)
The two reference boards (gym sections, rooms, locations, bench close-up, HUD cards) are now the target. Implemented so far:
three-quarter bench view with the bar across the screen and a plate on each side, chunky white stickman with thick
outlines, dark industrial gym (steel racks, dumbbell racks, treadmills, punching bag, skyline window, motivational sign,
hanging lamps, tiled floor, lifting mat, contact shadows). The camera is fixed; the *station* is rotated relative to it
(`STATION_YAW`), which is how the references stage the lift. Not yet matched: other locations, clothing, richer facial
expressions, per-exercise close-ups.

## Visual direction (original notes)
Fixed side-view camera (slight yaw/elevation for depth), toon-shaded procedural models with thick dark
inverted-hull outlines, white stickman with separate animated limbs, warm key light + cool fill, dark gym with
colored plates, dark UI panels with restrained yellow accents. **No `references/` images exist in the repo yet**; the
look follows the written art direction. When reference boards are added under `references/`, tune
`world/gymScene.ts` (colors, props), `world/materials.ts` (ramp, outline) and `character/rig.ts` (proportions).

Asset integration points (for externally produced art): `world/props.ts` (props), `character/rig.ts` (body parts),
`world/textures.ts` (procedural textures → replace with image loaders).

## Simulation rules (all numbers in `simulation/config.ts`)
Scales: needs and moods 0–100. `hunger` 0 = full → 100 = starving. `hydration` 100 = hydrated. `sleepiness` 0 = rested.

| Rule | Effect |
|---|---|
| Time passes | hunger +4/h, hydration −5/h, sleepiness +4/h, energy −1.5/h (active) |
| Resting | energy +12/h; halved if hungry/thirsty, ×0.7 if very sleepy |
| Critical hunger (≥90) or thirst (≤10) | health −2/h each |
| Each unmet need (hungry, low energy, critical sleepiness, starving, dehydrated) | happiness −1.5/h |
| Recovery debt (workout fatigue) | burns 3/h, half speed when hungry/thirsty |

### Fitness (Milestone 1: bench press)
- One-rep max = `baseOneRM + strength × perStrength`, multiplied by **performance** (energy, recovery debt,
  hunger, thirst, sleepiness; ≈0.5–1.0).
- Rep capacity at a weight follows the Epley formula. A rep beyond capacity fails: half energy cost, no reward, set ends.
- Per rep: energy cost scales with intensity, XP scales with intensity, 5 game-seconds pass.
- Per set (scaled by reps/target, so partial/interrupted sets count proportionally): strength, endurance and
  fitness gains. Stimulus is 0 below 30% of max, peaks near 75%; gains shrink as strength rises; gains are cut to
  75% / 40% at recovery debt >40 / >70. Recovery debt rises per set.
- Gym access requires a paid membership (day pass 24 h, monthly 30 days); stacking extends it.
- Levels: `60 × level^1.5` XP per level. Physique stages (Slim → Powerhouse) at strength 0/15/35/60/85 scale limb
  and torso thickness of the *same* rig.

### Economy
One currency (whole units). All changes go through `economy/economy.ts` (`earn`/`spend`): validates amount and
balance, never goes negative, records a transaction with balance-after. History capped at 500.

## Animation rules (bench press)
- Everything is a pose in station-local 2D (x along the bench, y up); the station group is rotated in the scene.
- Hands are IK targets **relative to the shoulder** and, when lifting, are derived from the bar position, so they cannot
  detach (tested to 1e-6 including during lie-back/sit-up). Feet are planted at fixed points in every pose.
- The pelvis/torso rest on the pad using the live muscle-dependent torso radius; the head is lifted by `headLift` so it
  rests on the pad at every physique stage (tested for muscle 0, 0.5, 1).
- Transitions use eased body blending plus a Bézier arc for the hands; a test bounds per-frame pelvis/hand motion.
- A repetition only counts if the animation reports `chestReached && lockout`; failed reps and incomplete cycles never
  award reps, XP or strength (tested with a fake animator).

## Expansion plan (NOT implemented — each item is real gameplay when built)
Each system ships with data files, simulation rules, a scene, UI, save-schema changes (with migration tests) and unit tests.

| # | System | Real interactions it must have | Depends on |
|---|---|---|---|
| M2a | Location loader + travel | Scene registry, enter/leave via Map, travel time (+ optional fare), opening hours | `data/locations.ts`, `LocationScene` |
| M2b | Home: bedroom, kitchen, bathroom, living room, work desk | Sleep (energy/sleepiness over hours; sleeping rule in `needs.ts`), shower (hygiene/mood), fridge/cupboard inventory, cook/eat, drink from sink, sofa/TV relax (mood, diminishing returns), computer (study → qualification XP) | M2a, inventory |
| M2c | Day/night clock effects | Lighting by hour, schedule panel, morning/evening routine | M2a |
| M3a | Jobs | Job board with requirements (level, skills, education), apply (deterministic acceptance), shifts with fixed hours, fatigue, wages through `earn()`, performance depends on needs, promotions by experience | economy, M2 |
| M3b | Bills | Rent + utilities as recurring bills with due dates, warnings, late consequences (mood/health penalty, eviction state), gym fee auto-pay option | economy |
| M3c | Bank screen | Filters by category, monthly totals | economy |
| M4a | Grocery + cooking | Priced items → inventory; recipes consume ingredients, produce meals with nutrition quality; cheap vs balanced meal effects on hunger and recovery | inventory, M2b |
| M4b | Café / restaurant | Priced menu, eat-in effects, seat/time cost, social option | M2a |
| M4c | City map | Reusable street/city scene, travel graph with times, park, beach walk | M2a |
| M5 | Well-being & social | Activities (friends, park, cinema, nightclub) with cost, duration, mood/well-being changes, repetition decay, isolation/stress penalties; clinic recovery | M4c |
| M6a | Clothing / barber / tattoo | Catalogue + prices, owned vs equipped inventory, visible rig changes (mesh/decal), tattoo design × body placement preview, persistence | rig slots, inventory |
| M6b | More exercises | Squat, deadlift, pull-up, curl, cardio: data + animation each (same `WorkoutAnimator` port), per-exercise progression, equipment purchases | M1 workout system |
| M7 | Mobile polish | Real-device performance, Capacitor android/ios projects, lifecycle tests | all |

Well-being is a simplified game mechanic, not a medical model.

## Save data
Versioned envelope `{version, savedAt, state}`; every load is migrated then sanitized (type-checked and clamped,
defaults filled). Rolling backup; unreadable saves are kept under a `.corrupt` key and the backup is restored.
