// The language the UI is currently drawn in, readable from places that have no
// access to the economy context (the app's Text, mostly). EconomyProvider keeps
// it in step with the game's language.
let current: "tr" | "en" = "tr";

export function setUiLanguage(lang: "tr" | "en"): void {
  current = lang;
}

/** Upper-case `s` the way the current language does it: in Turkish "i" becomes
 * "İ" and "ı" becomes "I", which plain toUpperCase() gets wrong. */
export function upperForUi(s: string): string {
  return s.toLocaleUpperCase(current === "tr" ? "tr-TR" : "en-US");
}
