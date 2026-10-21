import { DESIGN } from "../config.js";
import { textFloor } from "../util.js";

export interface View { W: number; H: number; dpr: number; scale: number; vw: number; vh: number; ox: number; oy: number }

/** Maps the 1400×790 design space onto a W×H screen (same rules as the web version: fit, anchored to the bottom, extra width as margin). */
export function computeView(W: number, H: number, pixelRatio: number): View {
  const dpr = Math.max(1, Math.min(pixelRatio || 1, 2, Math.sqrt(2.6e6 / (W * H)) || 1));      // cap the pixel budget so large phones stay smooth
  const scale = Math.min(W / DESIGN.w, H / DESIGN.h);
  const vw = W / scale, vh = H / scale;
  textFloor.px = 12 / scale;                                   // canvas labels never render below ~12 screen px
  return { W, H, dpr, scale, vw, vh, ox: (vw - DESIGN.w) / 2, oy: vh - DESIGN.h };
}
