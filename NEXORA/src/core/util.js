export const TAU = Math.PI * 2;
export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const wrapAngle = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

// Değişken süreli kare dizisi: durs = her karenin süresi (sn), son kare tutulur. t anında {i: kare, f: kare içi ilerleme 0..1}
// Animasyon süresi (sn): kare başına süre (durations) varsa toplamı, yoksa kare sayısı / fps
export const animDuration = (a) => (a.durations ? a.durations.reduce((s, d) => s + d, 0) : a.frames.length / a.fps);
export function frameAt(durs, t) {
  let a = 0;
  for (let i = 0; i < durs.length; i++) { if (t < a + durs[i]) return { i, f: (t - a) / durs[i] }; a += durs[i]; }
  return { i: durs.length - 1, f: 1 };
}

// Derin birleştirme (nesneler iç içe birleşir, diziler/değerler ezilir): boss/düşman bossCfg ezmeleri için
export function deepMerge(base, over) { const o = { ...base }; for (const k in over) o[k] = over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base?.[k] && typeof base[k] === 'object' ? deepMerge(base[k], over[k]) : over[k]; return o; }
