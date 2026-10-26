# Implementation Status

## Milestone 1 — Playable foundation: COMPLETE (verified)

Verified: `npm test` (34 tests pass), `npm run build` (typecheck + bundle OK), and a headless-Chromium
end-to-end run at 390×844 (buy pass → start workout → full 8-rep set → rest screen → tabs → reload keeps progress).

Working:
- Project: Vite + strict TypeScript + Three.js + Vitest, IndexedDB saves, Capacitor config file.
- 2.5D gym scene: textured rubber floor, panelled wall, mirrors, neon sign, LED strips, shadows; bench station with
  rack, plate-loaded Olympic barbell (colored plates follow the selected weight); background squat rack,
  dumbbell rack, treadmill, plate tree, kettlebells, deadlift platform (visual only for now).
- Stickman rig: separate parts, thick outlines, IK limbs, face, muscle-scaled physique (5 stages, same model).
- Bench press: sit → lie back → unrack → lower/pause/press reps → rerack → sit. Failed-rep variant. Hands are IK-bound
  to the bar (tested to 1e-9).
- Simulation: clock, needs decay/recovery, health/mood penalties, deterministic.
- Workout: weight, reps, sets, energy, XP, levels, strength/endurance/fitness gains, recovery debt, overtraining,
  partial-set banking on interruption, lift records.
- Economy: central `earn`/`spend`, transaction history, gym day pass / monthly membership with expiry.
- Save: versioned, migrated, sanitized, backup + corruption recovery; autosave on set/purchase/background/interval.
- Mobile UI: HUD (clock, money, level/XP, 6 need meters, alerts), Gym, Status, Bank, Map, Menu tabs, confirm dialogs, toasts.

## Known limitations / honest notes
- Only the gym is playable; the Map lists other locations as "Milestone N" (not clickable). There is no food,
  sleep or income yet, so money and hunger are one-way in this milestone (by design; M2–M4 close the loop).
- Only bench press has data + animation; other exercises are listed as coming later.
- No `references/` directory exists in the repo, so visuals follow the written art direction only.
- Tested visually only with software WebGL (≈10 fps); real-device performance is a Milestone 7 task.
- Capacitor native platforms (android/ios) are not generated yet.
- Gym screen has no automated UI tests; covered by manual/headless E2E only.

## Existing project note
The repository already contains an unrelated Expo game (`town-economy/`, "Golden Town") with its own CI.
It was left untouched; Life Simulator lives in `life-sim/`.
