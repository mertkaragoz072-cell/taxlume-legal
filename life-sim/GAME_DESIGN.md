# Game Design

## Pillars
- A whole virtual life: needs, money, work, food, fitness, leisure, appearance.
- Every action has a real, rule-based effect. No decorative meters, no fake currency.
- Deterministic simulation: the clock only moves when the simulation moves it (never from wall-clock timers),
  so identical state + identical actions give identical results, and app pause/resume cannot corrupt time.

## Visual direction
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

## Planned systems (not yet built)
Home & needs (M2), jobs/bills/rent (M3), city/food/travel (M4), well-being/social (M5),
customization/tattoos/clothing/more exercises (M6), mobile polish + Capacitor builds (M7).
Well-being is a simplified game mechanic, not a medical model.

## Save data
Versioned envelope `{version, savedAt, state}`; every load is migrated then sanitized (type-checked and clamped,
defaults filled). Rolling backup; unreadable saves are kept under a `.corrupt` key and the backup is restored.
