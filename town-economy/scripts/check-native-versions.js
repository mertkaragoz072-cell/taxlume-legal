// Compares the project's native modules against the versions Expo ships and
// tests for this SDK, read from `expo/bundledNativeModules.json`.
//
// This exists because react-native-svg sat four minor versions behind what SDK
// 57 expects and nothing said so. The typecheck passed, 190 tests passed, the
// web build passed, and the mismatch surfaced only when a Codemagic build
// spent six minutes compiling and then failed inside react-native-svg's
// generated C++ — because none of the other checks compile native code, and
// that is the only place the drift lives.
//
// `npx expo install --check` answers the same question, but it calls
// api.expo.dev. This reads the same table from the copy already in
// node_modules, so it works offline and belongs in `npm run verify`.
//
//   node scripts/check-native-versions.js

const semver = require("semver");
const bundled = require("expo/bundledNativeModules.json");
const pkg = require("../package.json");

// Deliberate mismatches. Each needs a reason, because "it seemed fine" is how
// the last one got here.
const ACCEPTED = {
  // Empty, and worth keeping that way. The one entry that lived here was
  // async-storage, running a major ahead of what Expo ships for this SDK,
  // excused on the grounds that it compiled and the three methods the app
  // calls had not changed. It compiled and the app then hung on the splash
  // screen on a real device. Compiling is not the bar.
};

function main() {
  const problems = [];
  const accepted = [];

  for (const name of Object.keys(pkg.dependencies)) {
    const want = bundled[name];
    if (!want) continue; // not a module Expo pins

    let have;
    try {
      have = require(`${name}/package.json`).version;
    } catch {
      problems.push(`${name}: listed in package.json but not installed`);
      continue;
    }

    if (semver.satisfies(have, want)) continue;
    if (ACCEPTED[name]) {
      accepted.push(`${name} ${have} (Expo: ${want}) — ${ACCEPTED[name]}`);
      continue;
    }
    problems.push(
      `${name}: installed ${have}, Expo SDK ${pkg.dependencies.expo} ships ${want}\n` +
        `    fix: npm install ${name}@${want.replace(/^[~^]/, "")}`
    );
  }

  for (const line of accepted) console.log(`· accepted drift: ${line}`);

  if (problems.length) {
    console.error(
      `\n${problems.length} native module(s) do not match the versions Expo tests ` +
        `for this SDK.\nThese break at native compile time, which no other check in ` +
        `\`verify\` reaches:\n\n  ${problems.join("\n  ")}\n`
    );
    process.exit(1);
  }
  console.log("✅ native module versions match Expo SDK 57");
}

main();
