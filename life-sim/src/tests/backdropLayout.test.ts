import { describe, it, expect } from 'vitest';
import { layoutBackdrop, imagePointToNdc } from '../world/backdropLayout';

const ART = 941 / 1672;

describe('backdrop layout', () => {
  it('fills the width and anchors to the top on screens narrower than the art', () => {
    const r = layoutBackdrop(9 / 16 * 0.8, ART);
    expect(r.x0).toBe(-1);
    expect(r.x1).toBe(1);
    expect(r.y1).toBe(1);
    expect(r.y0).toBeGreaterThan(-1);
  });

  it('never crops sideways on a 9:16 phone (art is taller than the screen)', () => {
    const r = layoutBackdrop(9 / 16, ART);
    expect(r.x1 - r.x0).toBeCloseTo(2, 6);
    // image is drawn at its true aspect ratio
    const aspect = ((r.x1 - r.x0) / (r.y1 - r.y0)) * (9 / 16);
    expect(aspect).toBeCloseTo(ART, 5);
  });

  it('height-fits and centres on wider screens', () => {
    const r = layoutBackdrop(1.5, ART);
    expect(r.y0).toBe(-1);
    expect(r.y1).toBe(1);
    expect(r.x0).toBeCloseTo(-r.x1, 9);
    expect(r.x1).toBeLessThan(1);
  });

  it('maps image fractions to NDC corners', () => {
    const r = layoutBackdrop(1.5, ART);
    expect(imagePointToNdc(r, 0, 0)).toEqual([r.x0, r.y1]);
    expect(imagePointToNdc(r, 1, 1)).toEqual([r.x1, r.y0]);
    const [cx] = imagePointToNdc(r, 0.5, 0.5);
    expect(cx).toBeCloseTo(0, 9);
  });
});
