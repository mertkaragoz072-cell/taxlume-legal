/**
 * Layout of a painted portrait backdrop on screen (pure functions, unit-tested).
 *
 * Rule: **never crop the art sideways**. On screens narrower than the art's aspect (all tall phones) the art is
 * fitted to the full width and anchored to the top; the slack below is hidden behind the action sheet and filled with
 * the scene's dark base colour if it ever shows. On screens wider than the art (desktop, tablets in landscape) the
 * art is fitted to the full height and centred with dark side bars.
 */
export interface NdcRect {
  /** Normalised device coordinates: x −1…1 (left→right), y −1…1 (bottom→top). */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export function layoutBackdrop(screenAspect: number, imageAspect: number): NdcRect {
  if (screenAspect <= imageAspect) {
    const h = (2 * screenAspect) / imageAspect; // image height in NDC when it spans the full width
    return { x0: -1, x1: 1, y1: 1, y0: 1 - h };
  }
  const w = imageAspect / screenAspect; // image half-width in NDC when it spans the full height
  return { x0: -w, x1: w, y0: -1, y1: 1 };
}

/** NDC position of a point given in image fractions (u: 0 left → 1 right, v: 0 top → 1 bottom). */
export function imagePointToNdc(rect: NdcRect, u: number, v: number): [number, number] {
  return [rect.x0 + u * (rect.x1 - rect.x0), rect.y1 - v * (rect.y1 - rect.y0)];
}
