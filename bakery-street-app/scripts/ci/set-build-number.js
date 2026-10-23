// Stamps the CI build number into app.json before `expo prebuild` runs.
//
// `app.json` ships `buildNumber: "1"` / `versionCode: 1`, which is right for
// the first upload and wrong for every one after it: both stores refuse a
// build whose number they have already seen, and the error arrives at the end
// of a 20-minute build rather than the start.
//
// prebuild copies these values into Info.plist and build.gradle, so writing
// them here covers both platforms with one step — as long as it runs first.
//
//   BUILD_NUMBER=42 node scripts/ci/set-build-number.js
//
// With no BUILD_NUMBER it does nothing, so a local prebuild still behaves the
// way the checked-in file says it does.

const fs = require("fs");
const path = require("path");

const APP_JSON = path.join(__dirname, "..", "..", "app.json");

function main() {
  const raw = process.env.BUILD_NUMBER;
  if (!raw) {
    console.log("· BUILD_NUMBER unset — leaving app.json alone (local build)");
    return;
  }

  const build = Number(raw);
  if (!Number.isInteger(build) || build < 1) {
    throw new Error(`BUILD_NUMBER must be a positive integer, got "${raw}"`);
  }

  const config = JSON.parse(fs.readFileSync(APP_JSON, "utf8"));
  // iOS wants a string, Android an integer, and the stores disagree about
  // nothing else here. `version` is left alone on purpose: the marketing
  // version is a decision, not a counter.
  config.expo.ios.buildNumber = String(build);
  config.expo.android.versionCode = build;

  fs.writeFileSync(APP_JSON, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`✅ ${config.expo.version} (${build}) — ios.buildNumber and android.versionCode stamped`);
}

main();
