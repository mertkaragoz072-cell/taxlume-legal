# Implementation Status

## Audit and fix round (latest) — root causes found and fixed

### Audit findings (what was actually wrong)
| Symptom | Root cause (file → function) | Evidence |
|---|---|---|
| Character flips between lying and upright during an exercise | `animation/benchPress.ts → finishSet()` sat the character up after **every set**; `prepareSet()` laid him down again for the next set. `app/workoutController.ts → performSet()` called it each time. | In-browser per-frame torso sampling of the old build over two sets: `LYING → MID → UPRIGHT` after each set, then `MID → LYING` again. At the upright moments `workout.phase` still read `lifting` (UI state ≠ animation state). |
| Rack obstructs the lifter | Rack uprights stood at the head end of a head-on view (`world/gymScene.ts` `STATION_YAW`, `world/props.ts → createRack`), i.e. between camera and lifter; its 2 m-wide beam, long base rails and racked plates behind added more occlusion. Uprights at z=±0.5 also overlapped heavily loaded plates. | Screenshots; geometry numbers. |
| Active workout UI with expired membership | The session was a runtime-only object in `WorkoutController` (not in `GameState`, not saved). Membership expiry was only checked when *starting* a workout/set, so a session could stay on screen after the pass expired (rest, time passing) or after a reload decision. | Code path analysis + new tests that reproduced it. |
| Possible double charge / double reward | `buyMembership` had no idempotency; two concurrent `endWorkout()` calls could both bank/finish. | Code review; new tests. |
| Shoes 1.5 cm below the floor | `character/rig.ts → applyPose`: shoe offset was defined in the *shin* frame and rotated with the leg; ankle height ignored shoe radius. | Browser bounding-box scan found 2 meshes at y = −0.015; unit test reproduced. |

### Fixes (files changed)
- `simulation/state.ts`, `persistence/save.ts`, `fitness/workout.ts`: the active workout is now part of the authoritative saved `GameState.workout`. **Save version 2** with a safe v1→v2 migration and sanitising of malformed workout data.
- `app/workoutController.ts` (rewritten): reads/writes `state.workout` only; one rule `canTrain` (location = gym ∧ valid membership by in-game time) enforced after every time advance, at set start, after each rep, after rest and on load; the session is ended and banked automatically when training becomes prohibited. `restore()` after load banks partial sets, ends expired sessions, otherwise resumes lying with the bar racked. Idempotent `endWorkout`; concurrent `performSet` calls run one set. Saves after every rep.
- `app/game.ts`, `ui/ui.ts`: restore on init; `enforceAccess` after idle time; purchase tokens (repeated taps charge once); workout panel only renders when `canTrain`.
- `animation/benchPress.ts` (rewritten as an explicit state machine): `seated → seatedToLying → lying → lyingToSeated → seated`. Between sets the character **stays lying** with the bar racked (`rackBar()`); only `sitUp()` at the end of the workout (or on forced end) lifts the torso. Torso is exactly π/2 whenever `lying`. Bar path is near-vertical (≤ 8 cm drift per rep, tested). `restoreLying()` for state restore.
- `character/rig.ts`: rounded elbow/knee/shoulder joint spheres, white material, shoe offset fixed in world frame, `joints()` for tests.
- `world/props.ts`, `world/gymScene.ts`: new rack (slim uprights at z=±0.42, outside hands, inside plates; no overhead beam; stabiliser behind), bar half-length 0.82, plates can never touch uprights (tested at 200 kg); station moved to the mat surface; camera now views from the foot end diagonally so the rack stands *behind* the lifter and the face, torso, arms and bar are all visible; background decluttered (stray plate stacks and floor items removed, back rack moved aside).

### Verification performed
- `npm test`: **82 tests pass** (was 57). New: state authority, expiry between sets / mid-set / on reload, restore, repeated taps, v1→v2 migration, animation state machine (never upright mid-workout), torso only changes in transitions, bar vs torso clearance and near-vertical path, rack vs hands/plates, stable pose after stop, no clipping below the mat at any physique, joints ordered consistently.
- `npm run build`: OK.
- Headless Chromium end-to-end (`verify` script) at **360×640, 390×844, 430×932** on the production build:
  - insufficient funds: money unchanged, no pass, Start disabled;
  - three rapid taps on Confirm: charged once (500 → 492, one transaction);
  - full workout (2 sets of 3 reps) → reload mid-workout → session restored lying, panel shown, valid;
  - End workout → no session, seated pose (torso 0.06), summary banked (2 sets, 6 reps);
  - expiry with no session and with an active session → workout panel disappears, Start disabled;
  - per-frame pose sequence over the whole run: `SEATED → TRANSITION → LYING → TRANSITION → SEATED` (exactly one lie-down and one sit-up);
  - camera→joint ray tests (head, shoulder, pelvis, both hands, both elbows, foot): rack blocked **0 of ~390 frames** at every size;
  - no mesh below the floor; character fits inside the free area between HUD and dock at all three sizes.

## Systems that work today (all covered by tests unless noted)
Game clock and needs decay, central economy service with transaction history, gym day pass / monthly membership,
bench-press workout (reps, sets, energy, XP, levels, strength/endurance/fitness, recovery debt, overtraining, partial-set
banking), versioned saves (v2) with migration, backup and corruption recovery, IndexedDB autosave (after every rep), stickman
rig with physique stages, gym scene with post-processing and Graphics setting, compact mobile UI. The end-to-end script is
`scripts/verify-e2e.cjs` (manual run; not part of CI).

## Unresolved / not yet confirmed
- Real-device performance and battery are untested; only software WebGL was used (~10 fps).
- The look is clean and readable but still procedural, not painted like the reference boards (see `docs/ART_SPEC.md`).
- Seated idle pose is a stand-in for a proper standing/idle animation; elbow flare and facial expressions are not modelled.
- The e2e script is not in CI; the unit tests are.

## Known limitations / honest notes
- Only the gym is playable. The Map tab lists other locations as "Milestone N" (not clickable).
- No food, sleep or income yet, so money and hunger move one way until the home/jobs/food milestones are built.
- Only bench press has data and animation.
- Visuals were checked with software WebGL (~10 fps). Real-device performance is untested (Milestone 7). Bundle is ~550 KB
  (three.js); not yet code-split.
- Elbow flare of a real bench press (lateral motion) is not modelled; the rig animates in the sagittal plane.
- Capacitor native projects are not generated; only `capacitor.config.json` exists.
- No automated UI/E2E tests in the repo (headless checks were run manually).
- The repository's unrelated Expo game (`town-economy/`) is untouched.

## Not implemented (do not treat as done)
Home rooms, sleep/eating/hydration actions, jobs/shifts/wages/promotions, rent and bills, grocery/cooking/cafés/restaurants,
city navigation and travel, social/leisure, clothing/barber/tattoos/customization, other exercises. See `GAME_DESIGN.md` plan.
