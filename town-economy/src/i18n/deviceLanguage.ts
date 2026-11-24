import { getLocales } from "expo-localization";
import { Language } from "./t";

/** Which language a brand-new install should open in.
 *
 * The app ships Turkish and English and used to open in Turkish for
 * everybody, because that is what `DEFAULT_LANGUAGE` says. That is the right
 * fallback for a missing string and the wrong one for a first launch: most
 * players reach the store listing in English, and an English speaker who
 * lands in a Turkish menu has to find the small "EN" button on the title
 * screen before the game means anything.
 *
 * So: Turkish only when the device asks for Turkish. Every other locale, and
 * every case where the locale cannot be read at all, gets English — when we
 * do not know, the wider audience is the safer guess.
 *
 * Only ever consulted for a fresh install. A save carries its own language,
 * and a player who picked one keeps it whatever their phone is set to.
 */
export function deviceLanguage(): Language {
  try {
    return getLocales()[0]?.languageCode === "tr" ? "tr" : "en";
  } catch {
    return "en";
  }
}
