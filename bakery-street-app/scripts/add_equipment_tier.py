#!/usr/bin/env python3
"""Turns a ChatGPT picture of an upgraded station (one object on a plain black background) into the game's tier picture:
transparent background, trimmed, scaled to the plain picture's height and saved as assets/game/interior/<line>-t<tier>.webp.

    python3 scripts/add_equipment_tier.py oven 2 ~/Downloads/oven_pro.png
    node scripts/gen-assets.mjs            # (once, after adding files) so the app bundles it

The scene draws the picture on the same ground line and centre as the plain station (see DecorLayer.drawTiered), so only the proportions
inside the picture matter. --fit width keeps the plain picture's width instead of its height.
"""
import argparse, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
INTERIOR = os.path.join(HERE, '..', 'assets', 'game', 'interior')
LINES = ('oven', 'coffee', 'showcase', 'storage', 'counter')

def cut(rgb, lo=14, hi=44):
    """Alpha from distance to black, but only for the background that touches the border (dark parts inside the object stay opaque)."""
    a = rgb.astype(np.float32)
    mx = a.max(axis=2)
    bg = mx < hi
    lab, n = ndi.label(bg)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    outside = np.isin(lab, list(edge))
    alpha = np.where(outside, np.clip((mx - lo) / (hi - lo), 0, 1), 1.0)
    alpha = ndi.binary_opening(alpha > 0.5, iterations=1) * alpha                      # specks of the background
    col = a / np.maximum(alpha[..., None], 0.2)                                         # un-premultiply the dark fringe
    col = np.where(outside[..., None], np.clip(col, 0, 255), a)
    return np.dstack([col, alpha * 255]).astype(np.uint8)

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('line', choices=LINES); ap.add_argument('tier', type=int, choices=(2, 3, 4)); ap.add_argument('source')
    ap.add_argument('--fit', choices=('height', 'width'), default='height'); ap.add_argument('--out', default=INTERIOR)
    ap.add_argument('--ground', type=int, default=0, help='extra transparent pixels kept under the object (shadow), default 0')
    a = ap.parse_args()
    base = Image.open(os.path.join(INTERIOR, f'{a.line}.webp')); bw, bh = base.size
    rgba = Image.fromarray(cut(np.array(Image.open(a.source).convert('RGB'))), 'RGBA')
    box = rgba.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    if not box: sys.exit('no object found: the picture must show the station on a plain black background')
    obj = rgba.crop(box)
    k = (bh / obj.height) if a.fit == 'height' else (bw / obj.width)
    obj = obj.resize((max(1, round(obj.width * k)), max(1, round(obj.height * k))), Image.LANCZOS)
    canvas = Image.new('RGBA', (obj.width, obj.height + a.ground), (0, 0, 0, 0)); canvas.paste(obj, (0, 0))
    out = os.path.join(a.out, f'{a.line}-t{a.tier}.webp')
    canvas.save(out, 'WEBP', quality=92, method=6)
    print(f'wrote {out} ({canvas.width}x{canvas.height}; plain picture {bw}x{bh})')

if __name__ == '__main__':
    main()
