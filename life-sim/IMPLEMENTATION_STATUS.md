# Implementation Status

## Milestone 1 — Playable foundation: COMPLETE, then polished (this update)

Verified by: `npm test` (57 tests pass), `npm run build` (typecheck + bundle OK), and headless-Chromium
end-to-end runs at 390×844, 360×640 and 430×932 (buy pass → start workout → full set → rest → tabs → reload keeps
progress; no horizontal overflow or clipped elements detected).

### Changed in this update
**Animation (Priority 1)**
- Bench station is rotated three-quarter to the fixed camera (as in the reference): bar across the screen, plate each side.
- New pose model: hands are shoulder-relative IK targets (always attached), feet planted at fixed points, head rests on
  the pad (`headLift`), pelvis/torso height follows the live muscle-dependent torso radius → no clipping at any physique.
- Smooth, slower lie-back / sit-up with eased body and arced hands; per-frame motion is bounded by a test.
- Removed a real bug found by the new tests: idle breathing moved the shoulders but not the bar (2 mm hand detachment).
- Rep validity: `playRep` returns `{chestReached, lockout}`; only a complete cycle is committed.
- Chunkier character proportions and thicker outlines, readable face with the head tilted toward the viewer.

**Environment (Priority 2)**
- New dark industrial gym: layered back wall, steel columns/beam, skyline window, sign, power rack, punching bag,
  black and colour dumbbell racks, treadmills, plate tree, kettlebells, lifting mat, hanging lamps, tiled floor,
  contact-shadow blobs, soft shadow radius, wider-FOV camera for parallax.
- Background props are batched into single meshes (one draw call each); only hero objects carry outline hulls.

**UI (Priority 3)**
- HUD reduced from ~20% to ~8% of the screen: level/XP, clock, money, and a thin 6-meter strip (low values turn red and pulse).
  Exact values moved to the Status tab.
- Workout dock is three compact rows (steppers / info / Start·Rest·End); live set view is one row plus Stop.
- Camera reserves space for the dock so the character and bar stay visible; bottom nav unchanged.

**Visual quality pass (reference-board target)**
- Post-processing: bloom limited to emissive things (lamps, treadmill screens, LED strip), warm/teal grade, vignette.
  Graphics setting in Menu (Auto / High / Low); Auto turns effects off if the device can't hold ~25 fps.
- Light shafts and warm floor pools under lamps, window glow, ceiling pipes/duct, LED strip, wall shelf, posters,
  gym bag, gloves; lifted steel palette.
- Honest gap: the references are painted illustrations. Hand-painted surface detail needs authored art; see
  `docs/ART_SPEC.md` for the exact plates and the integration point.

**Logic and tests (Priority 4)**
- Workout flow extracted to `WorkoutController` with an animation port, so it is tested without a renderer.
- An expired pass now blocks starting the next set even mid-workout.
- New tests: membership price/deduction/expiry boundary/stacking/insufficient funds, access gating, full-set progression,
  invalid-cycle reps not counted, too-heavy failure, multi-set accumulation + rest, interruption (partial set banked
  proportionally and persisted to the save), exhaustion, level-up events, hands/feet/clipping/continuity of the animation.

### Still working from Milestone 1
Clock, needs decay, economy service, gym membership, progression, versioned saves with backup/recovery, IndexedDB autosave.

## Known limitations / honest notes
- Only the gym is playable. The Map tab lists other locations as "Milestone N" (not clickable).
- No food, sleep or income yet, so money and hunger move one way until the home/jobs/food milestones are built.
- Only bench press has data and animation.
- The seated rest pose faces along the bench (away from the camera); only the head turns toward the viewer.
- Visuals were checked with software WebGL (~10 fps). Real-device performance is untested (Milestone 7). Bundle is ~550 KB
  (three.js); not yet code-split.
- The elbow flare of a real bench press (lateral motion) is not modelled; the rig animates in the sagittal plane.
- Capacitor native projects are not generated; only `capacitor.config.json` exists.
- No automated UI/E2E tests in the repo (headless checks were run manually).
- The repository's unrelated Expo game (`town-economy/`) is untouched.

## Not implemented (do not treat as done)
Home rooms, sleep/eating/hydration actions, jobs/shifts/wages/promotions, rent and bills, grocery/cooking/cafés/restaurants,
city navigation and travel, social/leisure, clothing/barber/tattoos/customization, other exercises. See `GAME_DESIGN.md` plan.
