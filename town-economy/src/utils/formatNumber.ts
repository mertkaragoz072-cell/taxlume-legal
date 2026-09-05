import { Language } from "../i18n/t";

// Hand-rolled rather than Intl.NumberFormat so the exact separator choice
// (TR: "." thousands / "," decimal, EN: the reverse) is guaranteed
// regardless of the runtime's ICU locale data.
export function formatNumber(value: number, lang: Language, decimals = 1): string {
  const decimalSep = lang === "tr" ? "," : ".";
  const thousandsSep = lang === "tr" ? "." : ",";
  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(decimals);
  const [intPart, fracPart] = fixed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);
  const sign = negative ? "-" : "";
  return fracPart ? `${sign}${grouped}${decimalSep}${fracPart}` : `${sign}${grouped}`;
}

const COMPACT_SUFFIXES = ["", "K", "M", "B", "T"];

// Below 1000 this is identical to formatNumber. At 1000 and up it switches
// to a "1.5M" style suffix so a growing net worth never turns into an
// illegible wall of digits like "1.500.000" — the suffix letters (K/M/B/T)
// are the same in both languages, only the decimal separator follows lang.
export function formatCompactNumber(value: number, lang: Language, decimalsBelowThousand = 1): string {
  const abs = Math.abs(value);
  if (abs < 1000) return formatNumber(value, lang, decimalsBelowThousand);

  const negative = value < 0;
  let scaled = abs;
  let tier = 0;
  while (scaled >= 1000 && tier < COMPACT_SUFFIXES.length - 1) {
    scaled /= 1000;
    tier++;
  }
  let rounded = Math.round(scaled * 10) / 10;
  // Rounding can push e.g. 999.96K up to "1000.0K" — bump to the next
  // suffix instead of showing four digits before the letter.
  if (rounded >= 1000 && tier < COMPACT_SUFFIXES.length - 1) {
    rounded = Math.round((rounded / 1000) * 10) / 10;
    tier++;
  }
  const decimalSep = lang === "tr" ? "," : ".";
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", decimalSep);
  return `${negative ? "-" : ""}${text}${COMPACT_SUFFIXES[tier]}`;
}

export function formatCoins(value: number, lang: Language, decimals = 1): string {
  return `${formatCompactNumber(value, lang, decimals)} 🪙`;
}
