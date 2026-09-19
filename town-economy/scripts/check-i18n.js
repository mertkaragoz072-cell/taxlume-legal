// Two checks over the translation tables. First: STRINGS.tr and STRINGS.en
// must have the same key structure, so a string added to only one language
// doesn't silently fall back to the other forever. Second: every literal key
// passed to t() somewhere in src/ must actually exist, so a typo or a renamed
// key shows up here rather than as a raw "common.close" dot-path on screen.
// Run with: node scripts/check-i18n.js
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

// t() is also called with template literals built at runtime (t(`goods.${id}.name`)),
// which cannot be checked statically — only plain string literals are collected.
// The optional leading identifier covers the reducer-side form, t(state.language,
// "key", ...), alongside the component-side t("key", ...).
const T_CALL = /\bt\(\s*(?:[A-Za-z_$][\w.$]*,\s*)?"([A-Za-z0-9_.]+)"/g;
// tPlural picks between "key" and "keyOne" at runtime, so both have to exist.
const T_PLURAL_CALL = /\btPlural\(\s*(?:[A-Za-z_$][\w.$]*,\s*)?"([A-Za-z0-9_.]+)"/g;

function sourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    // Tests are skipped: they call the unbound t("en", "some.key", ...) with
    // the language as the first argument, which reads as a key to the regex
    // below. Nothing in a test renders to a player anyway, and a test that
    // names a missing key fails on its own.
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") sourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

function collectUsedKeys() {
  const used = new Map();
  for (const file of sourceFiles(path.join(__dirname, "..", "src"))) {
    const source = fs.readFileSync(file, "utf8");
    const relative = path.relative(path.join(__dirname, ".."), file);
    const note = (key) => {
      if (!used.has(key)) used.set(key, relative);
    };
    for (const match of source.matchAll(T_CALL)) note(match[1]);
    for (const match of source.matchAll(T_PLURAL_CALL)) {
      note(match[1]);
      note(`${match[1]}One`);
    }
  }
  return used;
}

const usedKeys = collectUsedKeys();
const unknownKeys = [...usedKeys].filter(([key]) => !keysA.has(key)).sort();

if (missingInB.length === 0 && missingInA.length === 0 && unknownKeys.length === 0) {
  console.log(
    `✅ i18n check passed — ${langA} and ${langB} have identical key structure (${keysA.size} keys), ` +
      `and all ${usedKeys.size} literal t() keys resolve.`
  );
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
if (unknownKeys.length > 0) {
  console.error(`\n❌ t() called with keys that are not in the translation tables:`);
  unknownKeys.forEach(([key, file]) => console.error(`   - ${key}  (${file})`));
}
console.error("");
process.exit(1);
