import { DESIGN } from "../config.js";
import { textFloor } from "../util.js";

export interface View { W: number; H: number; dpr: number; scale: number; vw: number; vh: number; ox: number; oy: number }

/** Maps the 1400×790 design space onto a W×H screen (same rules as the web version: fit, anchored to the bottom, extra width as margin). */
export function computeView(W: number, H: number, pixelRatio: number, fill = false): View {
  const dpr = Math.max(1, Math.min(pixelRatio || 1, 2, Math.sqrt(2.6e6 / (W * H)) || 1));      // cap the pixel budget so large phones stay smooth
  let scale = Math.min(W / DESIGN.w, H / DESIGN.h);
  // fill: on taller screens (tablets) fill the whole height instead of leaving a band; the design is anchored towards the left edge and the right side is cropped a little
  const crop = fill && W / H < 1.7;
  if (crop) scale = Math.sqrt(scale * (H / DESIGN.h));          // halfway (geometric mean) between fit and fill: the markers stay clear of the side panel, the top band is small
  const vw = W / scale, vh = H / scale;
  textFloor.px = 12 / scale;                                   // canvas labels never render below ~12 screen px
  return { W, H, dpr, scale, vw, vh, ox: crop ? Math.min(0, (vw - DESIGN.w) * 0.35) : (vw - DESIGN.w) / 2, oy: vh - DESIGN.h };
}
