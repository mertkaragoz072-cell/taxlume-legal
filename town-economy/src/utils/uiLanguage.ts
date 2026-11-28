import type { Language } from "../i18n/t";

// The language the UI is currently drawn in, readable from places that have no
// access to the economy context (the app's Text, mostly). EconomyProvider keeps
// it in step with the game's language.
let current: Language = "tr";

const LOCALES: Record<Language, string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
};

export function getUiLanguage(): Language {
  return current;
}

export function setUiLanguage(lang: Language): void {
  current = lang;
}

/** Upper-case `s` the way the current language does it: in Turkish "i" becomes
 * "İ" and "ı" becomes "I", which plain toUpperCase() gets wrong. */
export function upperForUi(s: string): string {
  return s.toLocaleUpperCase(LOCALES[current]);
}
