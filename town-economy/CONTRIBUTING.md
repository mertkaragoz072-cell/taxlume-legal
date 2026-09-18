# Contributing

## Setup

Requires Node 22 and npm.

```bash
npm ci        # installs exactly the locked tree
npm start     # Expo dev server; press i / a / w for iOS, Android, web
```

`npm ci` rather than `npm install` — it fails loudly if `package.json` and the
lockfile have drifted apart, which is what you want before you start changing
things.

## Before you push

```bash
npm run verify
```

That chains typecheck, lint, format check, translation parity and the tests —
the same sequence `.github/workflows/ci.yml` runs, so a green `verify` means a
green build.

## The rules that are easy to miss

**Bump `SAVE_VERSION` when the saved state shape changes.** It lives in
`src/economy/persist.ts`. Saves are version-gated rather than migrated: a save
written by an older version is discarded, not half-loaded. Add a field to
`EconomyState` and forget the bump, and existing players load into a state
missing that field. Bump it in the same commit that changes the shape.

**Every visible string goes through `t()`, in both languages.** Add a key to
the `tr` tree and you must add it to `en` as well; `npm run check:i18n` walks
both and fails on any key present in one and missing from the other. A missing
key means a player sees a raw dot-path.

**Gameplay changes come with a test.** The simulation is pure and UI-free, so
it tests cheaply — put it in `src/economy/__tests__/`. Rendering is deliberately
not the focus.

**Colours come from `src/theme.ts`.** Spacing, radii, type scale, gradients and
shadows too. New UI composes those rather than introducing fresh hex values.

**Overlays are real React Native `<Modal>`s.** An absolutely-positioned view
looks the same until stacking or dismissal breaks.

**Animations:** `useNativeDriver: true` for transform and opacity, `false` for
layout properties such as `left` or a percentage width. The native driver
cannot animate layout, and it fails at runtime rather than at compile time.

## Where things live

The simulation is in `src/economy/` and never imports from the UI. It is split
into five modules that depend on each other in one direction only — constants,
then formulas, then progression and tick, then `useEconomy` on top. `README.md`
has the diagram.

Screens read state and dispatch actions through `EconomyContext`. They never
compute a game rule themselves, so a number shown on one screen cannot disagree
with the same number on another.

## Commits

Write the message for someone reading it in a year with no memory of the
change: what it does, and why it was worth doing. If a decision looks arbitrary
in the diff, the reason belongs either in a code comment or in the message.
