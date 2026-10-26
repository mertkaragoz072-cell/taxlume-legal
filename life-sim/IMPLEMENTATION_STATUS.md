# Implementation Status

Legend: **VERIFIED** = visuals + interactions + gameplay effects + save behaviour + relevant tests all work (checked, not assumed).
**IN PROGRESS** = partly built; **NOT STARTED** = nothing real exists yet. Reference board: `../references/life-simulator-reference.jpg`;
per-location specs: `VISUAL_STYLE_GUIDE.md`.

Last verified: `npm test` → **140 passing**, `npm run build` OK, headless-Chromium end-to-end runs (`scripts/home-e2e.cjs`,
`scripts/verify-e2e.cjs`) on the production build.

## Milestones (numbering from the master specification)

| # | Milestone | Status |
|---|---|---|
| 1 | Fix and polish the gym and bench press | **VERIFIED** (state machine, rack, membership, saves; see audit below) |
| 2 | Home rooms + sleep, food, hydration, household interactions | **VERIFIED for the implemented scope** (this round) — bills/expenses UI deferred to M3 |
| 3 | Jobs, wages, bills, banking, recurring expenses | NOT STARTED |
| 4 | City navigation + travel between all locations | IN PROGRESS (home ↔ gym walking route, opening hours; no city hub yet) |
| 5 | Grocery, cafés, restaurants, cooking | IN PROGRESS (home cooking from the starter pantry only; no shops) |
| 6 | Full workout selection, equipment, all exercise animations, physique | IN PROGRESS (bench press + 5 physique stages; 5 exercises NOT STARTED) |
| 7 | Happiness, social activities, entertainment, nightlife | IN PROGRESS (mood/well-being model + home leisure; no social venues) |
| 8 | Clothing, barber, tattoos, customization, inventory | IN PROGRESS (pantry inventory only; customization NOT STARTED) |
| 9 | Polish, mobile optimisation, Android/iOS builds | NOT STARTED (Capacitor config file only) |

## Locations

| Location (reference panel) | Status | Notes |
|---|---|---|
| Home – Bedroom "Yatak Odası" | **VERIFIED** | Sleep 2/6/8/10 h with quality rules (night, hunger, thirst), Zzz, bed pose on mattress. Wardrobe is set dressing until M8. |
| Home – Study "Çalışma Odası" | **VERIFIED** | Study at computer: energy cost, office skill + XP, diminishing returns. Job search hooks arrive in M3. |
| Home – Living room "Oturma Odası" | **VERIFIED** | TV (mood/well-being, diminishing returns, screen light), sofa naps. |
| Home – Kitchen "Mutfak" | **VERIFIED** | Eat from pantry at the table, cook 3 recipes at the stove (consumes ingredients), drink tap water. Fridge is set dressing; stock shown in Status → Pantry. |
| Home – Bathroom "Banyo" | **VERIFIED** | Shower with water effect; toilet/mirror are set dressing. |
| Gym "Spor Salonu" | IN PROGRESS | Bench press + membership **VERIFIED**; squat, deadlift, pull-up, dumbbell, cardio NOT STARTED (equipment is background decoration). |
| Workplace "İş Yeri" | NOT STARTED | |
| Café "Kafe" | NOT STARTED | |
| Grocery "Market" | NOT STARTED | |
| City centre "Şehir Merkezi" / outdoor life | NOT STARTED | |
| Character customization | NOT STARTED | |
| Sports-equipment shop | NOT STARTED | |
| Clothing shop | NOT STARTED | |
| Restaurant | NOT STARTED | |
| Park | NOT STARTED | |
| Beach / promenade | NOT STARTED | |
| Relaxation / cinema | NOT STARTED | (living-room TV exists as home leisure) |
| Health centre | NOT STARTED | (sleep + rest recovery exist at home) |
| Tattoo studio | NOT STARTED | |
| Barber | NOT STARTED | |
| Nightlife / club | NOT STARTED | |

## Systems

| System | Status | Notes |
|---|---|---|
| Game clock, calendar, opening hours | **VERIFIED** | Time moves only through simulation calls; gym open 05:00–23:00. |
| Needs (health, energy, hunger, hydration, sleepiness) | **VERIFIED** | Passive rules + sleeping rules (slower hunger/thirst, healing, faster recovery). |
| Happiness / well-being | IN PROGRESS | Well-being drifts toward a target from mood, energy, unmet needs; sleep and leisure move them. Social/nightlife not built. |
| Economy service + transaction history | IN PROGRESS | `earn`/`spend` verified; only gym passes use it so far. No income, rent, bills, shop prices in use. |
| Inventory | IN PROGRESS | Atomic add/remove, save-validated, pantry UI. No purchase flows yet (starter household only). |
| Navigation / travel | IN PROGRESS | Home rooms (1 min) and home ↔ gym (12 min, energy cost, closing time check, workout ended safely). |
| Persistence | **VERIFIED** | Save v3, migrations v1→v2→v3, sanitising, backup/corruption recovery, autosave. |
| Character rig and physique | **VERIFIED** | One rig for every scene; 5 physique stages; poses: stand, walk, sit, lie, eat, cook, shower, drink, type, TV, nap. |
| Clothing / tattoos / hair | NOT STARTED | |
| Graphics: bloom/grade + Graphics setting | IN PROGRESS | Works; real-device performance untested. |

## Gym staging matched to the reference panel (latest)
- Bench is now an **incline bench** (`world/benchGeometry.ts` is the single source of truth for seat, pad plane, spine angle, chest/lockout/hook points).
  The lifter sits facing the camera and leans back; the bar is horizontal, its path is exactly vertical (≤ 2 cm drift, tested); the torso axis is
  placed exactly one torso-radius in front of the pad plane for every physique, the pelvis on the seat, the head resting on the pad.
- Camera: frontal (yaw 0, elevation 9°, fov 34°), framed on the station; rack uprights stand behind the lifter and flank the bar (0 occluded frames).
- Room: sign "TRAIN HARDER GET STRONGER" at left, black dumbbell rack left, colour dumbbell rack right, power-rack frame behind, punching bag,
  skyline window right, treadmills, hanging lamps, plants, lifting mat, dark tile floor.
- Tests updated for the incline (pad contact, vertical path, bar vs torso/head clearance); 140 passing; e2e gym scenarios re-run at 390×844 and 360×640: all pass.
- Not matched: the reference is wide landscape; in portrait only the centre of the room is visible (sign, racks, window edge). The seated resting posture
  has straight lower legs; knees are not splayed like the painting.

## What was done in the previous round (files)
- **Reference**: copied to `references/life-simulator-reference.jpg`; analysed; `VISUAL_STYLE_GUIDE.md` written (all panels).
- **Simulation**: `simulation/activities.ts`, `simulation/actions.ts` (single `executeAction` + side-effect-free `dryRun`), `simulation/needs.ts`
  (sleeping mode, well-being drift), `simulation/config.ts`, `inventory/inventory.ts`, `navigation/travel.ts`, `fitness/access.ts`
  (one training rule: gym ∧ open ∧ pass), `data/{items,recipes,activities,homeObjects,locations}.ts`.
- **State/persistence**: `simulation/state.ts` (room, inventory, activityLog, skills, sleep; new game starts at home), `persistence/save.ts` (v3 + migrations).
- **Characters**: `character/poses.ts`, `character/actor.ts` (walk/sit/lie/blend state machine), `character/rig.ts` unchanged API.
- **Scenes**: `world/rooms/roomKit.ts`, `world/rooms/homeRooms.ts` (5 rooms), `world/renderer.ts` (camera follow, picking), textures.
- **App/UI**: `app/game.ts` (scene switching, travel, actions), `ui/ui.ts` (Home tab, Map travel, pantry, scene tap), `ui/styles.css`.
- **Tests**: `tests/home.test.ts` (sleep, food, cooking, activities, travel, save v3), `tests/actor.test.ts` (pose reach, floor/surface contact, no pops, mirroring), helpers; earlier suites updated.

## Verification performed this round
- Unit tests: 140 passing (was 82).
- Real-game run in headless Chromium at 390×844 (`scripts/home-e2e.cjs`): sleep 8 h (08:00→16:00, energy 100, sleepiness 0, slower hunger), tap water (+25),
  eat bread (stock 3→2), cook chicken & rice (each ingredient −1, +40 min, hunger →0), table options disabled with reasons when full,
  shower (second shower gives less mood), TV, study (energy −9, office +3), **tap on the 3D table selects it**, walk to gym (12 min),
  buy pass + 3-rep set, leave → workout ended and banked (3 reps), reload restores location/room/inventory/time. No console errors.
- Gym regression (`scripts/verify-e2e.cjs`, after the travel change): pass/expiry/refresh scenarios, single lie-down and sit-up, rack blocks 0/379 frames, no floor clipping, fits the screen — all unchanged and passing.
- All five rooms at 360×640 and 430×932: no horizontal overflow, character always above the action sheet.

## Audit notes for this round
- Found by tests: lying arms sank into the mattress (fixed: arms straight beside the body); standing pose bent the knees too much (pelvis raised);
  walk-cycle reach was 0.7 mm out of range (fixed); blends slowed to avoid >5 cm/frame pelvis motion.
- Honest scope: only the five home rooms and the gym exist as scenes. Everything else in the reference is still to build.

## Known limitations / unresolved
- No income yet: after the starter pantry runs out the character cannot eat. Jobs (M3) and grocery (M5) close this loop.
- Gym: only bench press is animated; other stations are scenery.
- Rooms were visually checked at 390×844 and layout-checked at 360×640 / 430×932 (software WebGL ~10 fps); real-device performance is untested.
- Room visuals are procedural and simpler than the painted reference (see `docs/ART_SPEC.md`).
- Capacitor Android/iOS projects not generated.
- End-to-end scripts are manual (not in CI); unit tests are.
- `town-economy/` (unrelated Expo game in this repository) is untouched.
