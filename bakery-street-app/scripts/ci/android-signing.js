// Points the Android release build at the upload keystore Codemagic provides, after `expo prebuild` wrote android/.
//
// The generated android/app/build.gradle signs release builds with the debug key, which Google Play refuses. Codemagic puts the
// keystore named in codemagic.yaml (android_signing) on disk and exports CM_KEYSTORE_PATH, CM_KEYSTORE_PASSWORD, CM_KEY_ALIAS and
// CM_KEY_PASSWORD; this adds a `release` signing config that reads them and makes the release build use it.
//
//   node scripts/ci/android-signing.js        (fails loudly when the variables are missing, so a debug-signed bundle is never uploaded)

const fs = require("fs");
const path = require("path");

const GRADLE = path.join(__dirname, "..", "..", "android", "app", "build.gradle");
const NEEDED = ["CM_KEYSTORE_PATH", "CM_KEYSTORE_PASSWORD", "CM_KEY_ALIAS", "CM_KEY_PASSWORD"];

function main() {
  const missing = NEEDED.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Android signing variables missing: ${missing.join(", ")} (add the keystore under Codemagic > Code signing identities and name it in codemagic.yaml)`);
  let gradle = fs.readFileSync(GRADLE, "utf8");
  if (gradle.includes("CM_KEYSTORE_PATH")) { console.log("· release signing already set"); return; }
  const release = `        release {
            storeFile file(System.getenv("CM_KEYSTORE_PATH"))
            storePassword System.getenv("CM_KEYSTORE_PASSWORD")
            keyAlias System.getenv("CM_KEY_ALIAS")
            keyPassword System.getenv("CM_KEY_PASSWORD")
        }
`;
  const at = gradle.indexOf("signingConfigs {");
  if (at < 0) throw new Error("signingConfigs block not found in android/app/build.gradle");
  gradle = gradle.slice(0, at + "signingConfigs {\n".length) + release + gradle.slice(at + "signingConfigs {\n".length);
  const rel = gradle.indexOf("        release {", gradle.indexOf("buildTypes {"));
  const line = gradle.indexOf("signingConfig signingConfigs.debug", rel);
  if (rel < 0 || line < 0) throw new Error("release build type not found in android/app/build.gradle");
  gradle = gradle.slice(0, line) + "signingConfig signingConfigs.release" + gradle.slice(line + "signingConfig signingConfigs.debug".length);
  fs.writeFileSync(GRADLE, gradle);
  console.log("✅ release builds are signed with the upload keystore");
}

main();
