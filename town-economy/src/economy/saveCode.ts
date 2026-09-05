import { SAVE_VERSION } from "./persist";
import { EconomyState } from "./types";

interface SaveFile {
  version: number;
  state: EconomyState;
}

// A short "magic" prefix so a garbage paste is rejected immediately
// instead of throwing deep inside JSON.parse.
const CODE_PREFIX = "GTOWN1:";

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Hand-rolled UTF-8-safe base64 — RN/Hermes doesn't reliably provide a
// global atob/btoa, and both the town name and event log can contain
// non-ASCII text (Turkish letters, emoji), which a naive Latin1 codec
// would mangle.
function utf8Encode(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.codePointAt(i)!;
    if (code > 0xffff) i++; // consumed a surrogate pair
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }
  return bytes;
}

function utf8Decode(bytes: number[]): string {
  let result = "";
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i];
    if (b0 < 0x80) {
      result += String.fromCharCode(b0);
      i += 1;
    } else if ((b0 & 0xe0) === 0xc0) {
      const b1 = bytes[i + 1];
      result += String.fromCharCode(((b0 & 0x1f) << 6) | (b1 & 0x3f));
      i += 2;
    } else if ((b0 & 0xf0) === 0xe0) {
      const b1 = bytes[i + 1];
      const b2 = bytes[i + 2];
      result += String.fromCharCode(((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f));
      i += 3;
    } else {
      const b1 = bytes[i + 1];
      const b2 = bytes[i + 2];
      const b3 = bytes[i + 3];
      const code = ((b0 & 0x07) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
      result += String.fromCodePoint(code);
      i += 4;
    }
  }
  return result;
}

function base64Encode(str: string): string {
  const bytes = utf8Encode(str);
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    const triplet = (b0 << 16) | ((b1 ?? 0) << 8) | (b2 ?? 0);
    result += BASE64_CHARS[(triplet >> 18) & 0x3f];
    result += BASE64_CHARS[(triplet >> 12) & 0x3f];
    result += b1 !== undefined ? BASE64_CHARS[(triplet >> 6) & 0x3f] : "=";
    result += b2 !== undefined ? BASE64_CHARS[triplet & 0x3f] : "=";
  }
  return result;
}

function base64Decode(b64: string): string {
  const clean = b64.replace(/\s+/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = BASE64_CHARS.indexOf(clean[i]);
    const c1 = BASE64_CHARS.indexOf(clean[i + 1]);
    const c2Char = clean[i + 2];
    const c3Char = clean[i + 3];
    const c2 = c2Char === "=" || c2Char === undefined ? -1 : BASE64_CHARS.indexOf(c2Char);
    const c3 = c3Char === "=" || c3Char === undefined ? -1 : BASE64_CHARS.indexOf(c3Char);
    if (c0 < 0 || c1 < 0) break;
    bytes.push((c0 << 2) | (c1 >> 4));
    if (c2 >= 0) bytes.push(((c1 & 0xf) << 4) | (c2 >> 2));
    if (c3 >= 0) bytes.push(((c2 & 0x3) << 6) | c3);
  }
  return utf8Decode(bytes);
}

export function encodeSaveCode(state: EconomyState): string {
  const file: SaveFile = { version: SAVE_VERSION, state };
  return CODE_PREFIX + base64Encode(JSON.stringify(file));
}

export type DecodeSaveCodeResult =
  | { ok: true; state: EconomyState }
  | { ok: false; reason: "format" | "version" | "corrupt" };

export function decodeSaveCode(code: string): DecodeSaveCodeResult {
  const trimmed = code.trim();
  if (!trimmed.startsWith(CODE_PREFIX)) return { ok: false, reason: "format" };
  try {
    const json = base64Decode(trimmed.slice(CODE_PREFIX.length));
    const parsed = JSON.parse(json) as SaveFile;
    if (!parsed || typeof parsed !== "object" || !parsed.state) {
      return { ok: false, reason: "corrupt" };
    }
    if (parsed.version !== SAVE_VERSION) return { ok: false, reason: "version" };
    return { ok: true, state: parsed.state };
  } catch {
    return { ok: false, reason: "corrupt" };
  }
}
