import React from "react";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

type Mood = "happy" | "neutral" | "sad";

interface Props {
  size?: number;
  mood?: Mood;
  /** which of the townsfolk this is — picks one of the wardrobes below so a
   * crowd reads as three people rather than one person copied three times */
  variant?: 0 | 1 | 2;
  /** raise the near arm, for the "a villager is asking you for something" modal */
  gesturing?: boolean;
}

/** One outfit. Three of them is enough variety for a crowd this small, and
 * keeping them all inside the same warm range means the group still reads as
 * one town rather than three unrelated sprites. */
interface Wardrobe {
  skin: string;
  skinShade: string;
  robe: string;
  robeShade: string;
  robeLight: string;
  cap: string;
  capShade: string;
  hair: string;
}

const WARDROBES: Wardrobe[] = [
  {
    skin: "#e0a878",
    skinShade: "#c98d5e",
    robe: "#c97b3d",
    robeShade: "#9c5a28",
    robeLight: "#dd9457",
    cap: "#8a5a34",
    capShade: "#6b4526",
    hair: "#3a2418",
  },
  {
    skin: "#d4976a",
    skinShade: "#b87c52",
    robe: "#a8623a",
    robeShade: "#7f4726",
    robeLight: "#c07a4c",
    cap: "#6f4a2c",
    capShade: "#553720",
    hair: "#2e1c12",
  },
  {
    skin: "#eab98d",
    skinShade: "#d09d70",
    robe: "#cf9042",
    robeShade: "#a36c2b",
    robeLight: "#e2a85a",
    cap: "#9a6a38",
    capShade: "#775028",
    hair: "#4a2f1c",
  },
];

const GOLD = "#e8c777";
const GOLD_SHADE = "#c2a055";
const BOOT = "#5c4530";
const BOOT_SHADE = "#42301f";
const INK = "#2a2016";

const MOUTHS: Record<Mood, string> = {
  happy: "M42 40 Q50 48 58 40",
  neutral: "M44 42 H56",
  sad: "M44 45.5 Q50 41 56 45.5",
};

/** Eyebrows carry most of an expression at this size — the mouth alone reads
 * as a smirk either way once the sprite is 46px tall. */
const BROWS: Record<Mood, { left: string; right: string }> = {
  happy: { left: "M39 26 Q43 23.5 47 25.5", right: "M53 25.5 Q57 23.5 61 26" },
  neutral: { left: "M39 26 Q43 25 47 26", right: "M53 26 Q57 25 61 26" },
  sad: { left: "M39 27.5 Q43 24.5 47 23.5", right: "M53 23.5 Q57 24.5 61 27.5" },
};

/** The town's mascot: a small flat-shaded villager, palette-matched to the
 * rest of the UI. Used to give the villager-request modal a face, and reused
 * across the Town Square crowd where the expression tracks happiness.
 *
 * Drawn as vector rather than a bitmap on purpose: it renders crisp from the
 * 46px crowd member up to the 76px modal portrait, costs nothing in bundle
 * size, and every colour comes from the same palette as the cards behind it. */
export function VillagerIllustration({ size = 84, mood = "neutral", variant = 0, gesturing = false }: Props) {
  const w = WARDROBES[variant] ?? WARDROBES[0];
  const id = `v${variant}${mood}${gesturing ? "g" : ""}`;

  return (
    <Svg width={size} height={size * 1.32} viewBox="0 0 100 132">
      <Defs>
        {/* A single warm key light from the upper left, the same direction the
            cards' own gradients are lit from. */}
        <LinearGradient id={`${id}robe`} x1="0" y1="0" x2="1" y2="0.4">
          <Stop offset="0" stopColor={w.robeLight} />
          <Stop offset="0.55" stopColor={w.robe} />
          <Stop offset="1" stopColor={w.robeShade} />
        </LinearGradient>
        <LinearGradient id={`${id}skin`} x1="0" y1="0" x2="1" y2="0.6">
          <Stop offset="0" stopColor={w.skin} />
          <Stop offset="1" stopColor={w.skinShade} />
        </LinearGradient>
        <LinearGradient id={`${id}cap`} x1="0" y1="0" x2="0.9" y2="1">
          <Stop offset="0" stopColor={w.cap} />
          <Stop offset="1" stopColor={w.capShade} />
        </LinearGradient>
      </Defs>

      <Ellipse cx={50} cy={125} rx={25} ry={4.5} fill="#000" opacity={0.3} />

      {/* legs, then boots sitting slightly proud of them */}
      <Rect x={38} y={97} width={9} height={21} rx={4.5} fill={BOOT_SHADE} />
      <Rect x={53} y={97} width={9} height={21} rx={4.5} fill={BOOT_SHADE} />
      <Path
        d="M36 113 h13 a3 3 0 0 1 3 3 v4 a2 2 0 0 1 -2 2 h-15 a2 2 0 0 1 -2 -2 v-4 a3 3 0 0 1 3 -3 z"
        fill={BOOT}
      />
      <Path
        d="M51 113 h13 a3 3 0 0 1 3 3 v4 a2 2 0 0 1 -2 2 h-15 a2 2 0 0 1 -2 -2 v-4 a3 3 0 0 1 3 -3 z"
        fill={BOOT}
      />

      {/* far arm always hangs; it reads as depth behind the robe */}
      <Path d="M34 60 Q25 73 29 88" stroke={w.robeShade} strokeWidth={9} strokeLinecap="round" fill="none" />
      <Circle cx={29} cy={89} r={6} fill={w.skinShade} />

      {/* robe: shoulders down to a softly curved hem */}
      <Path d="M50 44 Q62 45 65 54 L73 103 Q50 108 27 103 L35 54 Q38 45 50 44 Z" fill={`url(#${id}robe)`} />
      {/* two fold lines, the cheapest way to stop a flat shape reading as cardboard */}
      <Path d="M44 62 L41 100" stroke={w.robeShade} strokeWidth={1.6} opacity={0.5} fill="none" />
      <Path d="M57 64 L60 100" stroke={w.robeShade} strokeWidth={1.6} opacity={0.35} fill="none" />

      {/* belt */}
      <Rect x={28.5} y={78} width={43} height={7.5} rx={2} fill={w.capShade} />
      <Rect x={44} y={77.5} width={12} height={8.5} rx={2} fill={GOLD} />
      <Rect x={47.5} y={80.5} width={5} height={2.5} rx={1} fill={GOLD_SHADE} />

      {/* gold collar over the chest */}
      <Path d="M38 46 Q50 58 62 46 L64 52 Q50 65 36 52 Z" fill={GOLD} />
      <Path d="M38 46 Q50 58 62 46 L63 49 Q50 61 37 49 Z" fill={GOLD_SHADE} opacity={0.55} />

      {/* near arm: down at the side, or raised when asking for something */}
      {gesturing ? (
        <>
          <Path
            d="M66 56 Q83 47 80 26"
            stroke={w.robeShade}
            strokeWidth={9}
            strokeLinecap="round"
            fill="none"
          />
          <Circle cx={80} cy={24} r={6.5} fill={`url(#${id}skin)`} />
        </>
      ) : (
        <>
          <Path
            d="M66 58 Q75 72 71 88"
            stroke={w.robeShade}
            strokeWidth={9}
            strokeLinecap="round"
            fill="none"
          />
          <Circle cx={71} cy={89} r={6.5} fill={`url(#${id}skin)`} />
        </>
      )}

      {/* neck */}
      <Rect x={44} y={36} width={12} height={11} rx={3} fill={w.skinShade} />

      {/* head */}
      <Circle cx={50} cy={27} r={18} fill={`url(#${id}skin)`} />
      <Circle cx={32.5} cy={29} r={3.2} fill={w.skinShade} />
      <Circle cx={67.5} cy={29} r={3.2} fill={w.skinShade} />

      {/* hair showing beneath the cap */}
      <Path d="M32 24 Q32 9 50 9 Q68 9 68 24 Q60 17 50 17 Q40 17 32 24 Z" fill={w.hair} />

      {/* soft cap with a brim — the silhouette cue that says "townsfolk" */}
      <Path d="M31 18 Q34 2 50 2 Q66 2 69 18 Q50 12 31 18 Z" fill={`url(#${id}cap)`} />
      <Rect x={29} y={16} width={42} height={5.5} rx={2.75} fill={w.capShade} />

      <G>
        <Circle cx={43} cy={31} r={2.4} fill={INK} />
        <Circle cx={57} cy={31} r={2.4} fill={INK} />
        <Circle cx={43.9} cy={30.1} r={0.8} fill="#fff" opacity={0.85} />
        <Circle cx={57.9} cy={30.1} r={0.8} fill="#fff" opacity={0.85} />
      </G>

      <Path d={BROWS[mood].left} stroke={w.hair} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <Path d={BROWS[mood].right} stroke={w.hair} strokeWidth={1.8} strokeLinecap="round" fill="none" />

      {mood === "happy" && (
        <>
          <Ellipse cx={37} cy={36} rx={4} ry={2.4} fill="#e07a4a" opacity={0.35} />
          <Ellipse cx={63} cy={36} rx={4} ry={2.4} fill="#e07a4a" opacity={0.35} />
        </>
      )}

      <Path d={MOUTHS[mood]} stroke={INK} strokeWidth={1.9} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
