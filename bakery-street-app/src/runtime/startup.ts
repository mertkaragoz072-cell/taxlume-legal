// How long each start-up step took on this device (milliseconds), shown under Ayarlar so a slow start can be seen instead of guessed.
export const timings: Record<string, number> = {};
const start = Date.now();
let last = start;

/** Records the time since the previous mark under `name` (and the total so far under "toplam"). */
export function mark(name: string): void {
  const now = Date.now();
  timings[name] = now - last;
  timings.toplam = now - start;
  last = now;
}
