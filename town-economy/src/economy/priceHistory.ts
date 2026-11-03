import { HISTORY_LEN } from "./constants";

// A small deterministic PRNG (mulberry32) seeded from the good's id, so a
// fresh game always draws the same "past" and nothing here touches
// Math.random — tests that stub it for the economy's own rolls are
// unaffected.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A believable recent past ending exactly at `basePrice`, so a market
 * card has a real-looking trend line from the first second instead of an
 * empty box. Walks backwards from today's price with a pull back toward
 * it, so it never drifts far from where the good actually trades. */
export function backfillHistory(id: string, basePrice: number): number[] {
  const rand = mulberry32(hash(id));
  const out = new Array<number>(HISTORY_LEN);
  out[HISTORY_LEN - 1] = basePrice;
  for (let i = HISTORY_LEN - 2; i >= 0; i--) {
    const pull = (basePrice - out[i + 1]) / basePrice;
    const step = (rand() - 0.5) * 0.07 + pull * 0.25;
    out[i] = Math.max(basePrice * 0.6, out[i + 1] * (1 + step));
  }
  return out.map((v) => Math.round(v * 100) / 100);
}
