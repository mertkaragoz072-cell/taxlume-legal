# TODO

## Next: Milestone 2 — Home and daily needs (in order)
1. [ ] Location registry + scene loader + travel service (`navigation/`): enter/leave from Map, travel time (and fare), opening hours; make Map rows tappable only for built locations.
2. [ ] Inventory module and save schema v2 (+ v1→v2 migration test).
3. [ ] `HomeScene` (bedroom, kitchen, bathroom, living room, work desk) with the shared batch/props helpers; per-room camera setups.
4. [ ] Sleep (rule in `needs.ts`: energy/sleepiness restore over hours, interruptions), eat/drink from inventory, shower, sofa/TV (diminishing mood), desk/computer.
5. [ ] Day/night lighting from the clock; schedule panel.
6. [ ] Tests for each rule above (sleep, eating owned food only, hydration, mood diminishing returns, migration).

## Then
- M3 jobs, shifts, wages, promotions; rent and recurring bills with consequences; bank filters.
- M4 grocery, cooking, café, restaurant, city map and travel graph, park/beach.
- M5 happiness/well-being activities, cinema, nightlife, clinic.
- M6 clothing, barber, tattoos (visible on rig), more exercises (squat, deadlift, pull-up, curl, cardio) via `WorkoutAnimator`.
- M7 real-device performance pass, code splitting, Capacitor android/ios projects, lifecycle tests, Playwright smoke tests in CI.

## Polish backlog
- Seated rest pose that faces the camera; elbow flare for bench press; extra expressions (strain, smile).
- Equipment purchases in the gym; additional plate sets.
- Replace procedural textures with authored art where the references need more detail.
