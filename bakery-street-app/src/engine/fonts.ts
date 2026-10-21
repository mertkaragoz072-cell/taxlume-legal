// The game's text font: Nunito (rounded, close to the Trebuchet the web version used), regular and bold. Loaded once at start-up.
import { Asset } from "expo-asset";
import { Skia, type SkFont, type SkTypeface } from "@shopify/react-native-skia";

const faces: { regular?: SkTypeface; bold?: SkTypeface } = {};
const cache = new Map<string, SkFont>();

async function load(module: number): Promise<SkTypeface> {
  const asset = Asset.fromModule(module);
  await asset.downloadAsync();
  const data = await Skia.Data.fromURI(asset.localUri ?? asset.uri);
  const face = Skia.Typeface.MakeFreeTypeFaceFromData(data);
  if (!face) throw new Error("font could not be read");
  return face;
}

export async function loadFonts(): Promise<void> {
  faces.regular = await load(require("@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf"));
  faces.bold = await load(require("@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf"));
}

/** CSS font shorthand ("700 22px 'Trebuchet MS'...") -> a Skia font of that size (weight 700 and up uses the heavy face). */
export function fontFor(css: string): SkFont {
  let f = cache.get(css);
  if (!f) {
    const m = css.match(/(\d+(?:\.\d+)?)px/), size = m ? parseFloat(m[1]) : 10;
    const w = css.match(/\b([1-9]00)\b/), weight = w ? parseInt(w[1], 10) : 400;
    const face = weight >= 800 ? faces.bold : faces.regular;
    f = Skia.Font(face, size);
    if (cache.size > 400) cache.clear();
    cache.set(css, f);
  }
  return f;
}
