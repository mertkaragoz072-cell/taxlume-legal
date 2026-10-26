export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const clamp100 = (v: number): number => clamp(v, 0, 100);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const round1 = (v: number): number => Math.round(v * 10) / 10;
export const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
