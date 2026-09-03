import { STRINGS } from "./strings";

export type Language = "tr" | "en";
export const DEFAULT_LANGUAGE: Language = "tr";

type Params = Record<string, string | number>;

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in params ? String(params[key]) : match
  );
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
