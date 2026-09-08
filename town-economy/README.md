# Golden Town

A single-player town-economy simulation for iOS and Android, built with Expo and
React Native. You run a small town: set prices, manage production and stock,
hire staff, take loans, send caravans to neighbouring towns, and try to grow a
fortune faster than inflation eats it.

The game ships in Turkish by default with an in-app English toggle.

---

## Getting started

Requires Node 22 and npm.

```bash
npm install
npm start          # Expo dev server; press i / a / w for iOS, Android, web
```

`npm run web` opens the browser build directly, which is the fastest way to
look at a UI change.

## Everyday commands

| Command              | What it does                                       |
| -------------------- | -------------------------------------------------- |
| `npm run verify`     | Everything CI runs. Use this before pushing.       |
| `npm run typecheck`  | `tsc --noEmit` against the whole project           |
| `npm run lint`       | ESLint; `npm run lint:fix` applies the safe fixes  |
| `npm run format`     | Prettier write; `format:check` verifies only       |
| `npm run check:i18n` | Fails if Turkish and English key sets have drifted |
| `npm test`           | Jest unit tests                                    |

## Layout

```
App.tsx              root: fonts, save load, modals, screen switching
index.ts             Expo entry point
src/
  economy/           the entire game simulation, UI-free
  screens/           one file per tab
  components/        shared widgets and every modal
  i18n/              string tables and the t() resolver
  audio/             sound effect hook
  notifications/     local notification scheduling
  utils/             formatting and store-review helpers
  theme.ts           the single source of colour, type and spacing tokens
scripts/             translation parity check, sound generation
```

## How it works

**The simulation is a reducer.** `src/economy/useEconomy.ts` holds one
`useReducer` state machine, and a timer dispatches a `TICK` action on a fixed
interval. Every rule of the game — prices, wages, taxes, inflation, caravans,
loans, research, prestige — is a pure transition, so it can be unit tested
without rendering anything. The state shape lives in `src/economy/types.ts`,
and content tables (goods, towns, upgrades, quests, achievements) live in their
own files beside it.

The simulation is split across five modules that depend on each other in one
direction only, so there are no import cycles:

```
constants.ts    every tuning number, no behaviour
      ↓
formulas.ts     pure reads of state: pricing maths, totals, quoted rates
      ↓
progression.ts  what a new state has just earned: achievements, tier
                unlocks, town ranks, quest completion
tick.ts         one step of the whole economy — the largest transition
      ↓
useEconomy.ts   the action set, the reducer that chains the above, and the hook
```

`useEconomy.ts` re-exports the public constants and formulas, so the rest of
the app keeps importing from `economy/useEconomy` and never has to know which
module a given value moved to.

**Screens never compute game rules.** They read state and call actions through
`EconomyContext`, so the same numbers appear everywhere without a screen
inventing its own copy of a formula.

**Every visible string goes through `t()`.** `src/i18n/strings.ts` holds
parallel `tr` and `en` trees, resolved by dot path. `npm run check:i18n` walks
both trees and fails on any key present in one and missing from the other,
which is what stops a raw key path from reaching a player.

**Saves are version-gated, not migrated.** `SAVE_VERSION` in
`src/economy/persist.ts` is bumped whenever the persisted state shape changes;
a save written by an older version is discarded rather than half-loaded. Bump
it in the same commit that changes the shape.

**Design tokens are centralised.** Colours, type scale, spacing, radii,
gradients and shadows all come from `src/theme.ts`. New UI should compose those
rather than introduce fresh hex values.

## Conventions

- TypeScript runs in `strict` mode and `any` is a lint error.
- Prettier owns formatting; ESLint is configured for correctness only, so the
  two never argue. Rules we deliberately turn off carry their reasoning inline
  in `eslint.config.mjs`.
- Animations use the native driver for transform and opacity, and must fall
  back to `useNativeDriver: false` for layout properties such as `left` or a
  percentage width.
- Anything that overlays the screen is a real React Native `<Modal>`, never an
  absolutely-positioned view, so stacking and dismissal behave correctly.
- Interactive elements carry an `accessibilityRole` and a translated
  `accessibilityLabel`; decorative emoji are hidden from screen readers.

## Tests

Jest with the `jest-expo` preset. Coverage is deliberately concentrated on the
simulation rather than on rendering: the reducer, save codes, town ranks, NG+
modifiers, weekly challenges and number formatting. A gameplay rule change
should come with a test in `src/economy/__tests__/`.

## Continuous integration

`.github/workflows/ci.yml` runs typecheck, lint, format check, translation
parity and the test suite on every push and pull request. `npm run verify`
runs the same sequence locally.

## Release

Builds are produced with EAS (`eas.json`). App identity, icons and the splash
screen are configured in `app.json`; store copy lives in `STORE_LISTING.md` and
the privacy policy in `PRIVACY.md`.

## Licence

See `LICENSE`.
