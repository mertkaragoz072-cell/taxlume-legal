// Compares the key structure of STRINGS.tr and STRINGS.en so a new string
// added to only one language doesn't silently fall back to the default
// language forever. Run with: node scripts/check-i18n.js
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const Module = require("module");

const STRINGS_PATH = path.join(__dirname, "..", "src", "i18n", "strings.ts");

function loadStrings() {
  const source = fs.readFileSync(STRINGS_PATH, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
  });

  const fakeModule = new Module(STRINGS_PATH, module);
  fakeModule.filename = STRINGS_PATH;
  fakeModule.paths = Module._nodeModulePaths(path.dirname(STRINGS_PATH));
  fakeModule._compile(outputText, STRINGS_PATH);
  return fakeModule.exports.STRINGS;
}

// Collects every leaf (string-valued) key path, e.g. "tutorial.slide6Title".
function collectKeys(obj, prefix = "", out = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      collectKeys(value, fullKey, out);
    } else {
      out.add(fullKey);
    }
  }
  return out;
}

function diff(a, b) {
  return [...a].filter((key) => !b.has(key)).sort();
}

const STRINGS = loadStrings();
const languages = Object.keys(STRINGS);
if (languages.length !== 2) {
  console.error(`Expected exactly 2 languages in STRINGS, found: ${languages.join(", ")}`);
  process.exit(1);
}
const [langA, langB] = languages;
const keysA = collectKeys(STRINGS[langA]);
const keysB = collectKeys(STRINGS[langB]);

const missingInB = diff(keysA, keysB);
const missingInA = diff(keysB, keysA);

if (missingInB.length === 0 && missingInA.length === 0) {
  console.log(`✅ i18n check passed — ${langA} and ${langB} have identical key structure (${keysA.size} keys).`);
  process.exit(0);
}

if (missingInB.length > 0) {
  console.error(`\n❌ Missing in "${langB}" (present in "${langA}"):`);
  missingInB.forEach((key) => console.error(`   - ${key}`));
}
if (missingInA.length > 0) {
  console.error(`\n❌ Missing in "${langA}" (present in "${langB}"):`);
  missingInA.forEach((key) => console.error(`   - ${key}`));
}
console.error("");
process.exit(1);
