// Points the Android release build at a real upload keystore.
//
// `expo prebuild` writes a build.gradle whose *release* buildType is signed
// with the debug key, with a comment telling you to fix it in production:
//
//     release {
//       // Caution! In production, you need to generate your own keystore
//       signingConfig signingConfigs.debug
//
// A debug-signed bundle is rejected by Play, and nothing about the file says
// why — so this runs in CI after prebuild and before gradle, and refuses to
// continue if anything it depends on is missing. Shipping a debug-signed
// artifact should not be a thing that can happen quietly.
//
//   node scripts/ci/patch-android-signing.js
//
// Reads the keystore Codemagic injects when a workflow references one under
// environment.android_signing.

const fs = require("fs");
const path = require("path");

const GRADLE = path.join(__dirname, "..", "..", "android", "app", "build.gradle");

const ENV = {
  storeFile: "CM_KEYSTORE_PATH",
  storePassword: "CM_KEYSTORE_PASSWORD",
  keyAlias: "CM_KEY_ALIAS",
  keyPassword: "CM_KEY_PASSWORD",
};

function main() {
  const missing = Object.values(ENV).filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(
      `No signing credentials in the environment: ${missing.join(", ")}.\n` +
        "The workflow must reference a keystore under environment.android_signing, " +
        "and the reference name must match the one uploaded in Codemagic.\n" +
        "Refusing to build: without these the release bundle would be signed with " +
        "the debug key, which Play rejects."
    );
  }
  if (!fs.existsSync(GRADLE)) {
    throw new Error(`${GRADLE} not found — run \`expo prebuild --platform android\` first.`);
  }

  let gradle = fs.readFileSync(GRADLE, "utf8");

  // 1. A release signing config that reads the injected values at build time.
  //    Values come through the environment rather than being written into a
  //    file, so nothing secret lands on disk in the workspace.
  const release = `
        release {
            storeFile file(System.getenv("${ENV.storeFile}"))
            storePassword System.getenv("${ENV.storePassword}")
            keyAlias System.getenv("${ENV.keyAlias}")
            keyPassword System.getenv("${ENV.keyPassword}")
        }`;

  if (gradle.includes("release {\n            storeFile file(System.getenv(")) {
    console.log("· signing config already present, leaving it alone");
  } else {
    const anchor = /(signingConfigs \{\n)/;
    if (!anchor.test(gradle)) {
      throw new Error("no signingConfigs block in build.gradle — the prebuild template changed");
    }
    gradle = gradle.replace(anchor, `$1${release}\n`);
  }

  // 2. Point the release buildType at it. Matching inside the release block
  //    specifically: the debug buildType has the same line and must keep it.
  const before = gradle;
  gradle = gradle.replace(
    /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
    "$1signingConfig signingConfigs.release"
  );
  if (gradle === before && !before.includes("signingConfig signingConfigs.release")) {
    throw new Error("could not repoint the release buildType — the prebuild template changed");
  }

  fs.writeFileSync(GRADLE, gradle);

  // 3. Prove it, rather than trusting the regex.
  const out = fs.readFileSync(GRADLE, "utf8");
  const releaseBlock = /release \{[\s\S]*?signingConfig signingConfigs\.(\w+)/.exec(
    out.slice(out.indexOf("buildTypes {"))
  );
  if (!releaseBlock || releaseBlock[1] !== "release") {
    throw new Error(`release buildType still signs with "${releaseBlock?.[1]}"`);
  }
  console.log("✅ release buildType now signs with the upload keystore");
}

main();
