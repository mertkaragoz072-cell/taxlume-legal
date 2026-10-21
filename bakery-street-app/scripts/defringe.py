"""Removes the light fringe left around cut-out pictures: edge pixels take the colour of the nearest solid pixel, and the cut shrinks by a pixel.
Usage: python3 scripts/defringe.py file.webp ..."""
import sys
from PIL import Image
import numpy as np
from scipy import ndimage as ndi

def defringe(path):
    im = Image.open(path).convert('RGBA'); a = np.asarray(im).copy()
    al = a[..., 3]
    solid = ndi.binary_erosion(al >= 235, iterations=1)
    if solid.sum() < 100: return
    _, (iy, ix) = ndi.distance_transform_edt(~solid, return_indices=True)
    fixed = a[iy, ix, :3]
    edge = ~solid
    a[..., :3] = np.where(edge[..., None], fixed, a[..., :3])
    soft = ndi.gaussian_filter(solid.astype(float), 0.7)         # one pixel tighter, softly anti-aliased
    a[..., 3] = np.minimum(al, (soft * 255).astype(np.uint8))
    Image.fromarray(a, 'RGBA').save(path, quality=92)

for p in sys.argv[1:]: defringe(p)
