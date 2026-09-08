// Flat ESLint config. The rule set is deliberately correctness-first: Prettier
// owns formatting, so nothing here argues about whitespace or quotes. What it
// does catch is the class of mistake that actually reaches players — a stale
// hook dependency, an unused branch left behind by a refactor, a floating
// promise, a stray console call shipped in a release build.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "web-build/**",
      "android/**",
      "ios/**",
      "assets/**",
      "store-assets/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat["recommended-latest"],

  // Application code: React Native, no DOM, no Node globals.
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.es2021,
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        __DEV__: "readonly",
      },
    },
    rules: {
      // An unused symbol is either dead code or a rename someone forgot to
      // finish. Leading underscore is the documented opt-out.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // `any` erases the type safety the rest of the codebase pays for.
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["error", { allow: ["error", "warn"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-var": "error",
      "prefer-const": "error",
      "no-throw-literal": "error",

      // --- Two React Compiler rules we deliberately do not run ---
      //
      // `refs` flags React Native's own documented animation idiom,
      // `useRef(new Animated.Value(0)).current`, on every animated component
      // in the app. The value is a mutable animation handle, not render data,
      // and there is no supported alternative, so the rule reports ~90 false
      // positives and would train us to ignore it.
      "react-hooks/refs": "off",
      // `set-state-in-effect` flags the reset-on-open pattern our modals use:
      // they stay mounted and clear their own local draft state when the
      // `visible` prop flips. The alternative is remounting each modal from
      // its parent, which restarts entry animations for no user benefit.
      "react-hooks/set-state-in-effect": "off",
    },
  },

  // React Native resolves static assets (sound files, images) through Metro,
  // which requires a literal `require()` — an ESM import does not produce an
  // asset reference. This is the framework's contract, not a style choice.
  {
    files: ["src/audio/**/*.ts"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },

  // Tests may reach for Jest globals and are allowed to be noisier.
  {
    files: ["**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
    languageOptions: { globals: { ...globals.jest } },
    rules: { "no-console": "off" },
  },

  // Build/tooling scripts are plain CommonJS running under Node.
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    rules: { "no-console": "off", "@typescript-eslint/no-require-imports": "off" },
  },

  // Must stay last: turns off every rule Prettier already decides.
  prettier
);
