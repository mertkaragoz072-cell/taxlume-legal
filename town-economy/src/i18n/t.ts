import { STRINGS } from "./strings";

export type Language = "tr" | "en";
export const DEFAULT_LANGUAGE: Language = "tr";

export type Params = Record<string, string | number>;

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match));
}

/** A pure, hook-free translator so it can be called both from React
 * components (via the bound `t` on EconomyContext) and from plain reducer
 * functions that build event messages outside React (tick(), decisions.ts,
 * etc.) — those already carry `state.language`, so no context is needed. */
export function t(lang: Language, key: string, params?: Params): string {
  const value = getByPath(STRINGS[lang], key);
  if (typeof value === "string") return interpolate(value, params);
  const fallback = getByPath(STRINGS[DEFAULT_LANGUAGE], key);
  if (typeof fallback === "string") return interpolate(fallback, params);
  return key;
}

/** Picks between a count-bearing string and its `<key>One` sibling.
 *
 * English inflects the noun after a numeral, Turkish does not — "1 gün" and
 * "5 gün" are both correct, while "1 days left" is not. So every string that
 * renders next to a count carries a singular sibling in both trees: real
 * singular in English, the same text again in Turkish.
 *
 * Only exactly 1 takes the singular. English says "0 days left", not
 * "0 day left", so a `< 2` test would be wrong. */
export function tPlural(lang: Language, key: string, count: number, params?: Params): string {
  return t(lang, count === 1 ? `${key}One` : key, params);
}

/** Builds the shared fields of an EconomyEvent: a `message` resolved in
 * whatever language is active right now (what a local push notification
 * needs — it's scheduled immediately and may fire later with the app
 * backgrounded, so it has to carry a fixed string, not a lazy lookup) plus
 * the raw `key`/`params` that made it, so a still-open screen can re-resolve
 * the same event in whatever language is active *then* instead of a stale
 * banner sitting in the language it first fired in after a language switch. */
export function eventFields(
  lang: Language,
  key: string,
  params?: Params
): { key: string; params?: Params; message: string } {
  return { key, params, message: t(lang, key, params) };
}

/** The other half of eventFields: re-resolves an already-built event in
 * whatever language is active *now*. Falls back to the event's own baked
 * `message` when there's no `key` to resolve from — an event loaded from a
 * save written before this existed. Takes a duck-typed shape rather than
 * the concrete EconomyEvent type to avoid economy/types.ts <-> this file
 * becoming a circular import. */
export function resolveEventMessage(
  lang: Language,
  event: { key?: string; params?: Params; message: string }
): string {
  return event.key ? t(lang, event.key, event.params) : event.message;
}
