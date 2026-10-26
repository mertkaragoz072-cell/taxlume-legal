// Pictures for products, ingredients and status symbols. Game data keeps emoji as the plain-text form; wherever text is shown the emoji
// is replaced by the supplied picture (the same mapping the web version used).
import React from "react";
import { Image, StyleProp, Text, TextStyle } from "react-native";
import { PRODUCTS, INGREDIENTS, RECIPES } from "../data/economy.js";
import { ICON_IDS } from "../assets.js";
import { ASSET_MODULES } from "../generated/assetModules";
import { FONT } from "./theme";

const bare = (e: string) => e.replace(/️/g, "");
const EMOJI: Record<string, string> = {
  "💰": "coin", "✨": "xp", "💎": "gem", "🎁": "gift", "🔒": "lock", "⏱": "timer", "✅": "check", "⬆": "arrow", "🛒": "basket", "🧾": "o-order",
  "👥": "o-guests", "⏳": "o-waiting", "📚": "b-bookshop", "🏗": "b-plot", "🌿": "r-meadow", "🌲": "r-forest", "🏛": "r-ruins",
  "🔥": "u-oven", "⚡": "u-speed", "🗄": "u-showcase", "🪑": "u-tables", "📖": "r-knowledge", "🧺": "r-efficient", "🏷": "r-seller", "🎭": "r-culture",
  "🛠": "r-equipment", "🎯": "q-target", "🏭": "q-line", "🧭": "q-explorer",
};
for (const [id, d] of Object.entries({ ...PRODUCTS, ...RECIPES, ...INGREDIENTS } as Record<string, { icon?: string }>)) if ((ICON_IDS as string[]).includes(id) && d.icon) EMOJI[bare(d.icon)] = id;
const RE = new RegExp(`((?:${Object.keys(EMOJI).join("|")})\\uFE0F?)`, "u");
/** Pictures that are wide scenes rather than square symbols: shown larger. */
const WIDE = new Set(["b-bakery", "b-market", "b-bookshop", "b-plot", "r-meadow", "r-forest", "r-ruins"]);

export const iconSource = (id: string) => ASSET_MODULES[`assets/icons/${id}.webp`];
export const iconIdFor = (emoji: string): string | undefined => EMOJI[bare(emoji)];

/** One picture by id ('bread', 'coin', 'hud-quests', ...). */
export function GameIcon({ id, size, style }: { id: string; size: number; style?: any }) {
  const src = iconSource(id);
  if (src === undefined) return null;
  return <Image source={src} style={[{ width: size * (WIDE.has(id) ? 1.45 : 1), height: size * (WIDE.has(id) ? 1.2 : 1), resizeMode: "contain" }, style]} />;
}

/** One emoji from the game data shown as its picture (or the emoji itself when it has none). */
export function EmojiIcon({ emoji, size, style }: { emoji: string; size: number; style?: any }) {
  const id = iconIdFor(emoji);
  return id ? <GameIcon id={id} size={size} style={style} /> : <Text allowFontScaling={false} style={{ fontSize: size * 0.85 }}>{emoji}</Text>;
}

/** Text whose emoji are shown as pictures, inline. */
export function Rich({ text, size, style }: { text: string; size: number; style?: StyleProp<TextStyle> }) {
  const parts = text.split(new RegExp(RE.source, "gu"));
  return (
    <Text allowFontScaling={false} style={[{ fontFamily: FONT.regular, fontSize: size }, style]}>
      {parts.map((p, i) => {
        const id = EMOJI[bare(p)];
        if (id) return <Image key={i} source={iconSource(id)} style={{ width: size * 1.25, height: size * 1.25, resizeMode: "contain" }} />;
        return p ? <Text allowFontScaling={false} key={i}>{p}</Text> : null;
      })}
    </Text>
  );
}
