# TODO

## Next: Milestone 2 — Home and daily needs
- [ ] `HomeScene` (bedroom, kitchen, bathroom, living room, work area) using shared props/materials.
- [ ] Location loader + travel service (`navigation/`) with time cost; wire Map tab buttons; enter/leave gym.
- [ ] Sleep action (energy/sleepiness restore, time passes, `activity: 'sleeping'` rule in `needs.ts`).
- [ ] Eating/drinking from fridge inventory; hydration from sink; shower; relax on sofa (mood).
- [ ] Inventory module + save-schema v2 with migration test (v1 → v2).
- [ ] Night/day lighting by clock; schedule panel.
- [ ] Idle time-passing rules when player is at home (still explicit, no wall-clock).

## Later
- M3 jobs/bills/rent, M4 city/food/travel, M5 well-being/social, M6 customization + remaining exercises
  (squat, deadlift, pull-up, curl, cardio animations), M7 mobile polish + Capacitor android/ios.
- Add `references/` art and retune scene/rig to match.
- Tests: UI smoke tests (Playwright) in CI; add `.github` workflow for life-sim.
