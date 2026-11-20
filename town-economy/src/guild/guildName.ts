import { GUILD_CODE_LENGTH, GUILD_NAME_MAX, GUILD_NAME_MIN } from "./types";

// A small blocklist is a seatbelt, not a moderation system: it catches the
// obvious ones in Turkish and English. The server repeats the length and
// character checks; names are the only free text in the whole feature.
// Short words only count as a whole word ("Sik" is rude, "Musiki" is music);
// long ones also count inside a word ("fuckers").
const BLOCKED_WORDS = ["amk", "aq", "sik", "got", "göt", "pic", "piç", "ibne", "dick", "rape", "nazi"];
const BLOCKED_STEMS = [
  "orospu",
  "yarrak",
  "pezevenk",
  "gavat",
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "hitler",
  "porn",
];

export function normalizeGuildName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export function validateGuildName(raw: string): boolean {
  const name = normalizeGuildName(raw);
  if (name.length < GUILD_NAME_MIN || name.length > GUILD_NAME_MAX) return false;
  if (!/^[\p{L}\p{N} ]+$/u.test(name)) return false;
  const words = name.toLocaleLowerCase("tr").split(" ");
  if (words.some((w) => BLOCKED_WORDS.includes(w))) return false;
  const joined = words.join("");
  return !BLOCKED_STEMS.some((w) => joined.includes(w));
}

export function normalizeGuildCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, GUILD_CODE_LENGTH);
}

export function isGuildCode(raw: string): boolean {
  return normalizeGuildCode(raw).length === GUILD_CODE_LENGTH;
}
