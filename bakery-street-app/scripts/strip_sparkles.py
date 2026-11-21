"""Removes small free-floating bits (sparkles, stars) around a level picture, so a raised piece looks richer without filling the café with glitter.
A part is dropped when it does not touch the main object and is smaller than `--max` of the main object's area. The picture is then trimmed.
  python3 scripts/strip_sparkles.py assets/game/interior/levels/rugAisle-l5.webp [more files] [--max 0.03] [--dry]
"""
import argparse
import numpy as np
from PIL import Image
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument('files', nargs='+')
ap.add_argument('--max', type=float, default=0.03)
ap.add_argument('--dry', action='store_true')
ap.add_argument('--erode', type=int, default=0)
a = ap.parse_args()
for f in a.files:
    im = Image.open(f).convert('RGBA'); arr = np.array(im)
    solid = arr[:, :, 3] > 110                                  # the solid body of each part (soft glows around them do not join parts)
    if a.erode: solid = ndimage.binary_erosion(solid, iterations=a.erode)   # (for a star touching a solid edge; never on plants, it eats thin stems)
    lab, n = ndimage.label(solid)
    if n <= 1: print(f'{f}: nothing to strip'); continue
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    big = sizes.max()
    drop = [i + 1 for i, s in enumerate(sizes) if s < big * a.max]
    if not drop: print(f'{f}: nothing to strip ({n} parts)'); continue
    keep = ndimage.binary_dilation(np.isin(lab, [i + 1 for i in range(n) if i + 1 not in drop]), iterations=3)
    mask = ndimage.binary_dilation(np.isin(lab, drop), iterations=6) & ~keep & (arr[:, :, 3] > 0)   # the bit and its glow, never the object's own edge
    removed = int(mask.sum())
    print(f'{f}: {len(drop)} bits removed ({removed} px)')
    if a.dry: continue
    arr[mask] = 0
    out = Image.fromarray(arr)
    out = out.crop(out.getbbox())
    out.save(f, 'WEBP', quality=92, method=6)
