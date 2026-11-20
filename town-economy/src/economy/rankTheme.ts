/** Which of the four painted market scenes a rank shows: the original village
 * square, then ever grander streets. Matches the bands in townRanks.ts
 * (0-1 village/town, 2-4 city..trade hub, 5-7 capital..empire, 8+ golden age).
 * Ranks inside one band share the painting but not the light, the weather or
 * the colour language — see ATMOSPHERES below. */
export type SceneBand = 1 | 2 | 3 | 4;

export function sceneBandForRank(townRankIndex: number): SceneBand {
  if (townRankIndex >= 8) return 4;
  if (townRankIndex >= 5) return 3;
  if (townRankIndex >= 2) return 2;
  return 1;
}

export type ParticleKind = "motes" | "petals" | "leaves" | "fireflies" | "embers" | "sparks" | "stars";

/** The light and weather laid over the painted scene for one rank, so every
 * rank reads as its own place and hour: a hazy village morning, a golden
 * city noon, a violet capital dusk, a golden-age night of stars. */
export interface Atmosphere {
  /** colour wash over the whole scene (rgba, low alpha) */
  tint: string;
  particles: ParticleKind;
  particleColor: string;
  count: number;
}

export interface RankTheme {
  band: SceneBand;
  /** accent for the header rule, rank chip, Goals card and rank-up flourish */
  accent: string;
  /** soft glow behind the rank-up reveal */
  glow: string;
  atmosphere: Atmosphere;
}

interface RankLook {
  accent: string;
  atmosphere: Atmosphere;
}

// One look per named rank (Village .. Empire, then the first Golden Age).
const LOOKS: RankLook[] = [
  // 0 Village: hazy peach dawn, pollen drifting up
  {
    accent: "#c8843c",
    atmosphere: { tint: "rgba(255,214,170,0.30)", particles: "motes", particleColor: "#fff3cf", count: 8 },
  },
  // 1 Town: fresh green spring morning, blossom petals
  {
    accent: "#e0a35a",
    atmosphere: { tint: "rgba(130,215,150,0.14)", particles: "petals", particleColor: "#ffc2d1", count: 8 },
  },
  // 2 City: bright gold noon, glinting dust
  {
    accent: "#f6d36a",
    atmosphere: { tint: "rgba(255,214,110,0.10)", particles: "motes", particleColor: "#ffe9a3", count: 9 },
  },
  // 3 Metropolis: amber afternoon, autumn leaves
  {
    accent: "#ff9e4a",
    atmosphere: { tint: "rgba(255,140,50,0.18)", particles: "leaves", particleColor: "#e07a2c", count: 8 },
  },
  // 4 Trade Hub: blue evening, lanterns and fireflies
  {
    accent: "#4fd1c5",
    atmosphere: { tint: "rgba(30,90,130,0.24)", particles: "fireflies", particleColor: "#d7ff7a", count: 10 },
  },
  // 5 Capital: violet dusk
  {
    accent: "#c58ee0",
    atmosphere: {
      tint: "rgba(110,60,150,0.28)",
      particles: "fireflies",
      particleColor: "#e6b8ff",
      count: 11,
    },
  },
  // 6 Kingdom: crimson royal sunset, rising embers
  {
    accent: "#ff6b5e",
    atmosphere: { tint: "rgba(170,40,40,0.26)", particles: "embers", particleColor: "#ffb347", count: 12 },
  },
  // 7 Empire: imperial gold hour, gold sparks
  {
    accent: "#ffcf3f",
    atmosphere: { tint: "rgba(255,180,40,0.22)", particles: "sparks", particleColor: "#fff0a0", count: 14 },
  },
  // 8 Golden Age: starry night
  {
    accent: "#7fe3ff",
    atmosphere: { tint: "rgba(10,20,70,0.40)", particles: "stars", particleColor: "#ffffff", count: 16 },
  },
];

// Past the named list the Golden Age keeps its night sky but changes its
// aurora tint, so even rank 12 doesn't look like rank 9.
const BEYOND: { accent: string; tint: string }[] = [
  { accent: "#9dffb0", tint: "rgba(10,70,60,0.40)" },
  { accent: "#ff9ad5", tint: "rgba(80,15,70,0.40)" },
  { accent: "#ffd36a", tint: "rgba(60,40,10,0.40)" },
  { accent: "#ffa07a", tint: "rgba(80,25,25,0.40)" },
  { accent: "#b69cff", tint: "rgba(35,15,85,0.40)" },
];

export function rankLook(townRankIndex: number): RankLook {
  const i = Math.max(0, Math.floor(townRankIndex));
  if (i < LOOKS.length) return LOOKS[i];
  const b = BEYOND[(i - LOOKS.length) % BEYOND.length];
  const base = LOOKS[LOOKS.length - 1].atmosphere;
  return { accent: b.accent, atmosphere: { ...base, tint: b.tint, particleColor: b.accent } };
}

export function rankTheme(townRankIndex: number): RankTheme {
  const look = rankLook(townRankIndex);
  return {
    band: sceneBandForRank(townRankIndex),
    accent: look.accent,
    glow: look.accent + "59",
    atmosphere: look.atmosphere,
  };
}
