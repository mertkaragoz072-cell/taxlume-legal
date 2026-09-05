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

export function formatCoins(value: number, lang: Language, decimals = 1): string {
  return `${formatNumber(value, lang, decimals)} 🪙`;
}
