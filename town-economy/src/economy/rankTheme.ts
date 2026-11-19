/** Which of the four painted market scenes a rank shows: the original village
 * square, then ever grander streets. Matches the bands in townRanks.ts
 * (0-1 village/town, 2-4 city..trade hub, 5-7 capital..empire, 8+ golden age). */
export type SceneBand = 1 | 2 | 3 | 4;

export function sceneBandForRank(townRankIndex: number): SceneBand {
  if (townRankIndex >= 8) return 4;
  if (townRankIndex >= 5) return 3;
  if (townRankIndex >= 2) return 2;
  return 1;
}

export interface RankTheme {
  band: SceneBand;
  /** accent for the header rule, rank chip and rank-up flourish */
  accent: string;
  /** soft glow behind the rank-up reveal */
  glow: string;
}

const THEMES: Record<SceneBand, RankTheme> = {
  1: { band: 1, accent: "#c8843c", glow: "rgba(200,132,60,0.35)" }, // timber and copper
  2: { band: 2, accent: "#f6d36a", glow: "rgba(246,211,106,0.4)" }, // gold
  3: { band: 3, accent: "#c58ee0", glow: "rgba(197,142,224,0.4)" }, // royal purple
  4: { band: 4, accent: "#7fe3ff", glow: "rgba(127,227,255,0.4)" }, // golden-age sky
};

export function rankTheme(townRankIndex: number): RankTheme {
  return THEMES[sceneBandForRank(townRankIndex)];
}
